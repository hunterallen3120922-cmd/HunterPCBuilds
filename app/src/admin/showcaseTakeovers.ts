import { showcase as S } from "./showcaseData";

/**
 * Takeovers: rare, big events where one side floods across the whole screen and puts on a show,
 * then fades back to the normal wallpaper. Five for Hanover Lawn Co, five for HunterPCBuilds.
 * They draw on a canvas above everything (even the text), so they own the whole screen while they play.
 *
 * Each takeover: `dur` seconds, a `side` (which side floods over), and `draw(e)` where e = seconds since it started.
 * The flood-in and fade-out are handled for you; `scene` only has to draw the show itself.
 */

type Side = "lawn" | "pc";
export type Takeover = { name: string; label: string; side: Side; dur: number; start?: () => void; draw: (e: number, dt: number) => void };
export interface TakeoverApi {
  ctx: CanvasRenderingContext2D;   // the top canvas, already scaled to the 3840x2160 frame
  lawnLogo: () => HTMLImageElement | null;
  pcLogo: () => HTMLImageElement | null;
  mono: string;
}

// ---------- helpers ----------
const [FW, FH] = S.size;
const [SEAM_TOP, SEAM_BOT] = S.seam;
const seamX = (y: number) => SEAM_TOP + ((SEAM_BOT - SEAM_TOP) * y) / FH;
const CX = FW / 2, CY = FH / 2;
const HEAD = `"Inter Tight", Inter, system-ui, sans-serif`;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (p: number) => { p = clamp01(p); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
const easeOut = (p: number) => 1 - Math.pow(1 - clamp01(p), 3);
const backOut = (p: number) => { p = clamp01(p); const c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
const win = (e: number, a: number, b: number) => clamp01((e - a) / (b - a)); // 0..1 progress of e through [a, b]
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const TEAL = "61,208,155", CYAN = "56,189,248", GREEN = "143,209,138";
const LEAF_COLORS = ["#d67828", "#e8a032", "#be5028", "#c88c2d", "#aa4623"];

const glowCache = new Map<string, HTMLCanvasElement>();
function glowSprite(rgb: string) {
  let c = glowCache.get(rgb);
  if (!c) {
    c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d")!, gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.2, `rgba(${rgb},1)`); gr.addColorStop(0.5, `rgba(${rgb},.35)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); glowCache.set(rgb, c);
  }
  return c;
}

// ---------- art helpers for the detailed takeovers ----------
/** An offscreen canvas, drawn once and reused. */
function mk(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas"); c.width = Math.ceil(w); c.height = Math.ceil(h);
  draw(c.getContext("2d")!); return c;
}
/** A color as rgba(), lightened (k > 1) or darkened (k < 1). */
function rgbK(c: number[], k: number, a = 1) {
  return `rgba(${c.map((v) => Math.round(k >= 1 ? v + (255 - v) * Math.min(1, k - 1) : v * k)).join(",")},${a})`;
}
const shadeHex = (h: string, k: number, a = 1) => rgbK(hex(h), k, a);
const mixA = (a: string, b: string, t: number) => { const A = hex(a), B = hex(b); return A.map((v, i) => lerp(v, B[i], clamp01(t))); };
/** A shaded sphere-ish blob: lit from the top left. */
function ball(g: CanvasRenderingContext2D, x: number, y: number, r: number, light: string, base: string, dark: string) {
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r);
  gr.addColorStop(0, light); gr.addColorStop(0.55, base); gr.addColorStop(1, dark);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
}
let grainTile: HTMLCanvasElement | null = null;
const grainPats = new WeakMap<CanvasRenderingContext2D, CanvasPattern>();
/** Fine film grain, baked into pre-drawn art so flat fills don't look flat. */
function grainOver(g: CanvasRenderingContext2D, a: number) {
  grainTile ??= mk(256, 256, (q) => {
    const im = q.createImageData(256, 256);
    for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    q.putImageData(im, 0, 0);
  });
  let pat = grainPats.get(g);
  if (!pat) { pat = g.createPattern(grainTile, "repeat")!; grainPats.set(g, pat); }
  g.save(); g.globalAlpha = a; g.globalCompositeOperation = "overlay"; g.fillStyle = pat; g.fillRect(0, 0, FW, FH); g.restore();
}
let vigSpr: HTMLCanvasElement | null = null;
/** Darkened corners (drawn from a small cached picture: a live full-screen gradient is slow). */
function vignette(g: CanvasRenderingContext2D, a: number) {
  vigSpr ??= mk(480, 270, (q) => {
    q.scale(480 / FW, 270 / FH);
    const gr = q.createRadialGradient(CX, CY, FH * 0.42, CX, CY, FW * 0.66);
    gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,1)");
    q.fillStyle = gr; q.fillRect(0, 0, FW, FH);
  });
  g.save(); g.globalAlpha = a; g.drawImage(vigSpr, 0, 0, FW, FH); g.restore();
}
/** Draws rows y0..y1 (frame coordinates) of a half-resolution full-frame canvas. */
function band(g: CanvasRenderingContext2D, c: HTMLCanvasElement, y0: number, y1: number) {
  g.drawImage(c, 0, y0 / 2, FW / 2, (y1 - y0) / 2, 0, y0, FW, y1 - y0);
}
let skySpr: HTMLCanvasElement | null = null;
/** A vertical gradient stretched over the top of the frame (drawn small, then scaled up). */
function skyFill(g: CanvasRenderingContext2D, stops: [number, string][], h: number) {
  skySpr ??= mk(4, 256, () => {});
  const q = skySpr.getContext("2d")!, gr = q.createLinearGradient(0, 0, 0, 256);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  q.clearRect(0, 0, 4, 256); q.fillStyle = gr; q.fillRect(0, 0, 4, 256);
  g.drawImage(skySpr, 0, 0, 4, 256, 0, 0, FW, h);
}

/** Points that fill in some text (or any drawing), for particles to fly into. Returns frame coordinates. */
function samplePoints(draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, count: number) {
  const k = 4, w = FW / k, h = FH / k;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  draw(g, w, h);
  const data = g.getImageData(0, 0, w, h).data, pts: [number, number][] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 128) pts.push([x * k, y * k]);
  const out: [number, number][] = [];
  for (let i = 0; i < count; i++) { const p = pts[Math.floor(Math.random() * pts.length)] ?? [CX, CY]; out.push([p[0] + rand(-2, 2), p[1] + rand(-2, 2)]); }
  return out;
}

export function buildTakeovers(api: TakeoverApi): Takeover[] {
  const { ctx } = api;
  const dot = (x: number, y: number, r: number, rgb: string, a = 1) => {
    if (a <= 0.01) return;
    ctx.globalAlpha = Math.min(1, a); ctx.drawImage(glowSprite(rgb), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1;
  };
  const leaf = (x: number, y: number, size: number, rot: number, flip: number, col: string) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(flip)));
    const L = size, wd = size * 0.5;
    ctx.beginPath(); ctx.moveTo(-L, 0);
    ctx.bezierCurveTo(-L * 0.4, -wd * 1.2, L * 0.5, -wd * 0.9, L, 0);
    ctx.bezierCurveTo(L * 0.5, wd * 0.9, -L * 0.4, wd * 1.2, -L, 0);
    ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.28)"; ctx.lineWidth = Math.max(2, L / 9);
    ctx.beginPath(); ctx.moveTo(-L * 1.25, 0); ctx.lineTo(L * 0.95, 0); ctx.stroke();
    ctx.restore();
  };
  const logo = (which: Side, x: number, y: number, size: number, rot = 0, alpha = 1, glow = "rgba(0,0,0,.5)") => {
    const img = which === "lawn" ? api.lawnLogo() : api.pcLogo();
    if (!img || alpha <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = clamp01(alpha);
    ctx.shadowColor = glow; ctx.shadowBlur = size * 0.08;
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  };
  const title = (text: string, x: number, y: number, size: number, color: string, alpha = 1, font = HEAD, weight = 800) => {
    if (alpha <= 0) return;
    ctx.save(); ctx.globalAlpha = clamp01(alpha);
    ctx.font = `${weight} ${size}px ${font}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = size * 0.15; ctx.shadowOffsetY = size * 0.04;
    ctx.fillStyle = color; ctx.fillText(text, x, y);
    ctx.restore();
  };
  const fillAll = (style: string | CanvasGradient) => { ctx.fillStyle = style; ctx.fillRect(0, 0, FW, FH); };
  const vgrad = (stops: [number, string][], y0 = 0, y1: number = FH) => { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };

  const list: Takeover[] = [];
  const add = (t: Takeover) => list.push(t);

  // =====================================================================
  // HANOVER LAWN CO
  // =====================================================================

  // ---- 1. Four Seasons: one farm through the whole year ----
  {
    const D = 24;
    const SE = [
      { name: "SPRING", sub: "Spring cleanups · first mows", accent: "#f7b6d2", sky: ["#4f9fe6", "#9fd0f5", "#eef7e2"], far: "#8eb6a6", hill: ["#8fd070", "#5fa64e"], near: ["#86cf66", "#4f9a40"], canopy: ["#a8dd84", "#82c766", "#5aa84b"], trees: ["#9fd47c", "#7cc461", "#f2b7d0", "#68b257"], sun: [650, 560], sunCol: "#fff3b0" },
      { name: "SUMMER", sub: "Mowing · trimming · pressure washing", accent: "#ffe08a", sky: ["#1c74de", "#68b2f5", "#dff1ff"], far: "#6f9b8a", hill: ["#5fb04e", "#3b873a"], near: ["#5cae49", "#357c33"], canopy: ["#6cbd54", "#3f8f3c", "#2c7030"], trees: ["#3f8f3c", "#4d9e46", "#2f7a33", "#5aad4c"], sun: [1900, 270], sunCol: "#fffbe0" },
      { name: "FALL", sub: "Leaf cleanup · end-of-season mows", accent: "#ffb055", sky: ["#3b5b9a", "#e39867", "#ffd69c"], far: "#a5806e", hill: ["#bf9c4c", "#8c6c32"], near: ["#ad9442", "#76612c"], canopy: ["#f3b745", "#e2822c", "#bb482a"], trees: ["#e0802b", "#f2b544", "#c9562a", "#a8452c"], sun: [3250, 1080], sunCol: "#ffb35c" },
      { name: "WINTER", sub: "Snow blowing · driveways & walks", accent: "#a9d6ff", sky: ["#07112a", "#1b2d55", "#4b5f8c"], far: "#3d4c6d", hill: ["#d8e3f1", "#a9bad3"], near: ["#e8eff8", "#b6c6dd"], canopy: ["#ffffff", "#ffffff", "#ffffff"], trees: ["#e9f0f8", "#cdd9e8", "#dfe7f2", "#ffffff"], sun: [3450, 1350], sunCol: "#ff9a4a" },
    ];
    const farY = (x: number) => 1170 + 70 * Math.sin(x * 0.0013 + 0.6) + 35 * Math.sin(x * 0.0041 + 2);
    const midY = (x: number) => 1400 + 55 * Math.sin(x * 0.0017 + 2.2) + 20 * Math.sin(x * 0.006);
    const nearY = (x: number) => 1660 + 35 * Math.sin(x * 0.0012 + 4);
    const BX = 2950, TX = 1150, TY = 1860;
    type Br = { x0: number; y0: number; x1: number; y1: number; w: number; depth: number };
    type Blob = { x: number; y: number; r: number; ci: number; d: number; drop: number; dropped: boolean; bl: [number, number][] };
    type SP = { x: number; y: number; vx: number; vy: number; r: number; rot: number; spin: number; kind: number };
    const branches: Br[] = [], blobs: Blob[] = [];
    let parts: SP[] = [], scenes: HTMLCanvasElement[] = [];
    let trunk: HTMLCanvasElement | null = null, trunkSnow: HTMLCanvasElement | null = null, cloudW: HTMLCanvasElement | null = null, cloudWarm: HTMLCanvasElement | null = null;
    const clouds = Array.from({ length: 5 }, (_c, i) => ({ x: (i / 5) * FW + rand(-200, 200), y: rand(120, 640), s: rand(0.6, 1.1), v: rand(25, 60) }));
    const stars = Array.from({ length: 150 }, () => [rand(0, FW), rand(0, 1050), rand(4, 9), rand(0, 6)]);
    const grow = (x: number, y: number, ang: number, len: number, w: number, depth: number) => {
      const x1 = x + Math.cos(ang) * len, y1 = y + Math.sin(ang) * len;
      branches.push({ x0: x, y0: y, x1, y1, w, depth });
      if (depth > 0) for (const dd of [-0.4, 0.4]) grow(x1, y1, ang + dd + rand(-0.12, 0.12), len * rand(0.68, 0.8), w * 0.66, depth - 1);
    };

    const sceneFor = (si: number) => mk(FW / 2, FH / 2, (g) => {
      g.scale(0.5, 0.5);
      const P = SE[si], winter = si === 3;
      const ridge = (f: (x: number) => number, top: string, bot: string) => {
        const gr = g.createLinearGradient(0, f(0) - 140, 0, FH); gr.addColorStop(0, top); gr.addColorStop(1, bot);
        g.fillStyle = gr; g.beginPath(); g.moveTo(0, FH);
        for (let x = 0; x <= FW; x += 16) g.lineTo(x, f(x));
        g.lineTo(FW, FH); g.closePath(); g.fill();
      };
      // far hills fading into the sky, with a soft forest edge
      ridge(farY, P.far, rgbK(mixA(P.far, P.sky[2], 0.6), 1));
      g.fillStyle = shadeHex(P.far, 0.9);
      for (let x = 0; x < FW; x += 24) { g.beginPath(); g.arc(x, farY(x) + 10, 14 + hash(x * 0.37) * 16, Math.PI, 0); g.fill(); }
      // a line of trees along the middle ridge
      g.lineCap = "round";
      for (let x = -30; x < FW + 30; x += 50 + Math.floor(hash(x * 1.3) * 34)) {
        if (x > BX - 330 && x < BX + 520) continue;
        const y = midY(x) + 16, h = 80 + hash(x + 1) * 90, col = P.trees[Math.floor(hash(x + 3) * 4)];
        g.strokeStyle = winter ? "#5b6278" : "#5a4632"; g.lineWidth = 10;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - h * 0.62); g.stroke();
        if (winter) {
          g.lineWidth = 4;
          for (let k = 0; k < 3; k++) {
            const yy = y - h * (0.3 + k * 0.14);
            for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + sd * h * (0.28 - k * 0.06), yy - h * 0.2); g.stroke(); }
          }
          g.fillStyle = "rgba(255,255,255,.9)"; g.beginPath(); g.ellipse(x, y - h * 0.62, 12, 6, 0, 0, Math.PI * 2); g.fill();
        } else ball(g, x, y - h * 0.78, h * 0.44, shadeHex(col, 1.3), col, shadeHex(col, 0.62));
      }
      ridge(midY, P.hill[0], P.hill[1]);
      // the barn and silo
      const by = midY(BX) + 40, bw = 460, bh = 290, bx0 = BX - bw / 2, ry = by - bh;
      const sx = BX + 330, sw = 130, sh = 430;
      const sg = g.createLinearGradient(sx, 0, sx + sw, 0);
      sg.addColorStop(0, "#7f8896"); sg.addColorStop(0.35, "#e3e8ee"); sg.addColorStop(1, "#5d6674");
      g.fillStyle = sg; g.fillRect(sx, by - sh, sw, sh);
      g.strokeStyle = "rgba(50,56,66,.45)"; g.lineWidth = 3;
      for (let k = 1; k < 7; k++) { g.beginPath(); g.moveTo(sx, by - sh + k * 60); g.lineTo(sx + sw, by - sh + k * 60); g.stroke(); }
      g.fillStyle = winter ? "#f4f8fc" : "#737c8a"; g.beginPath(); g.ellipse(sx + sw / 2, by - sh, sw / 2 + 6, 70, 0, Math.PI, 0); g.fill();
      const wg = g.createLinearGradient(bx0, 0, bx0 + bw, 0); wg.addColorStop(0, "#b8392f"); wg.addColorStop(1, "#86251f");
      g.fillStyle = wg; g.fillRect(bx0, ry, bw, bh);
      g.strokeStyle = "rgba(50,8,6,.35)"; g.lineWidth = 3;
      for (let x = bx0 + 24; x < bx0 + bw; x += 24) { g.beginPath(); g.moveTo(x, ry); g.lineTo(x, by); g.stroke(); }
      g.fillStyle = winter ? "#f3f7fc" : "#3a3f48";
      g.beginPath(); g.moveTo(bx0 - 30, ry + 10); g.lineTo(bx0 + 40, ry - 130); g.lineTo(BX, ry - 210); g.lineTo(bx0 + bw - 40, ry - 130); g.lineTo(bx0 + bw + 30, ry + 10); g.closePath(); g.fill();
      g.fillStyle = winter ? "rgba(140,165,205,.55)" : "rgba(0,0,0,.25)";
      g.beginPath(); g.moveTo(BX, ry - 210); g.lineTo(bx0 + bw - 40, ry - 130); g.lineTo(bx0 + bw + 30, ry + 10); g.lineTo(BX, ry + 10); g.closePath(); g.fill();
      g.strokeStyle = "#f4efe6"; g.lineWidth = 10; g.strokeRect(bx0, ry, bw, bh);
      const dw = 170, dh = 190, dx = BX - dw / 2, dy = by - dh;
      g.fillStyle = "#7d211b"; g.fillRect(dx, dy, dw, dh); g.strokeRect(dx, dy, dw, dh);
      g.beginPath(); g.moveTo(dx, dy); g.lineTo(dx + dw, by); g.moveTo(dx + dw, dy); g.lineTo(dx, by); g.moveTo(BX, dy); g.lineTo(BX, by); g.stroke();
      const lit = winter ? "#ffd27a" : "#2a1a14";
      g.fillStyle = lit; g.fillRect(BX - 45, ry - 95, 90, 70); g.strokeRect(BX - 45, ry - 95, 90, 70);
      for (const wx of [bx0 + 45, bx0 + bw - 105]) { g.fillStyle = lit; g.fillRect(wx, ry + 60, 60, 60); g.strokeRect(wx, ry + 60, 60, 60); }
      // the near field, with this season's details
      ridge(nearY, P.near[0], P.near[1]);
      g.save(); g.beginPath(); g.moveTo(0, FH); for (let x = 0; x <= FW; x += 16) g.lineTo(x, nearY(x)); g.lineTo(FW, FH); g.closePath(); g.clip();
      if (si === 1) { g.fillStyle = "rgba(255,255,255,.08)"; for (let x = -1400; x < FW; x += 440) { g.beginPath(); g.moveTo(x, 1600); g.lineTo(x + 220, 1600); g.lineTo(x + 640, FH); g.lineTo(x + 420, FH); g.fill(); } }
      if (si === 0) for (let k = 0; k < 420; k++) { g.fillStyle = pick(["#ffffff", "#ffe066", "#f7a8c9", "#ffffff"]); g.beginPath(); g.arc(rand(0, FW), rand(1650, FH), rand(3, 7), 0, Math.PI * 2); g.fill(); }
      if (si === 2) for (let k = 0; k < 700; k++) { g.fillStyle = pick(LEAF_COLORS); g.beginPath(); g.ellipse(rand(0, FW), rand(1650, FH), rand(6, 12), rand(3, 6), rand(0, 3), 0, Math.PI * 2); g.fill(); }
      if (si === 3) {
        for (let k = 0; k < 40; k++) { g.fillStyle = "rgba(120,145,190,.12)"; g.beginPath(); g.ellipse(rand(0, FW), rand(1700, FH), rand(150, 400), rand(14, 30), 0, 0, Math.PI * 2); g.fill(); }
        for (let k = 0; k < 500; k++) { g.fillStyle = `rgba(255,255,255,${rand(0.4, 1)})`; g.fillRect(rand(0, FW), rand(1660, FH), 3, 3); }
      }
      g.restore();
      // a dirt (or snowy) path from the barn door down to us
      const pts: [number, number, number][] = [];
      for (let k = 0; k <= 40; k++) {
        const t = k / 40, u = 1 - t;
        pts.push([u * u * u * BX + 3 * u * u * t * (BX - 150) + 3 * u * t * t * 3650 + t * t * t * 3150,
          u * u * u * by + 3 * u * u * t * 1700 + 3 * u * t * t * 1850 + t * t * t * (FH + 30), lerp(30, 420, t * t)]);
      }
      g.beginPath(); pts.forEach(([x, y, w], i) => (i ? g.lineTo(x - w / 2, y) : g.moveTo(x - w / 2, y)));
      for (let i = pts.length - 1; i >= 0; i--) g.lineTo(pts[i][0] + pts[i][2] / 2, pts[i][1]);
      g.closePath();
      g.fillStyle = winter ? "#dfe7f2" : si === 2 ? "#b49866" : "#c9b083"; g.fill();
      g.strokeStyle = winter ? "rgba(150,170,205,.6)" : "rgba(90,70,40,.35)"; g.lineWidth = 6; g.stroke();
      // fence along the field
      const fy = (x: number) => nearY(x) + 90;
      for (const rr of [118, 60]) {
        g.strokeStyle = "#8b6b4b"; g.lineWidth = 16; g.beginPath();
        for (let x = 1800; x <= FW; x += 20) (x === 1800 ? g.moveTo(x, fy(x) - rr) : g.lineTo(x, fy(x) - rr));
        g.stroke();
        g.strokeStyle = "rgba(255,255,255,.18)"; g.lineWidth = 4; g.beginPath();
        for (let x = 1800; x <= FW; x += 20) (x === 1800 ? g.moveTo(x, fy(x) - rr - 5) : g.lineTo(x, fy(x) - rr - 5));
        g.stroke();
      }
      for (let x = 1800; x <= FW; x += 175) {
        g.fillStyle = "#6d5238"; g.fillRect(x - 13, fy(x) - 165, 26, 170);
        g.fillStyle = "rgba(255,255,255,.14)"; g.fillRect(x - 13, fy(x) - 165, 7, 170);
        if (winter) { g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(x, fy(x) - 168, 24, 13, 0, 0, Math.PI * 2); g.fill(); }
      }
      // the foreground: grass, flowers, pumpkins or snow
      if (!winter) {
        g.lineCap = "round";
        for (let x = -10; x < FW + 10; x += 6) {
          const h = 50 + hash(x * 0.7) * (si === 1 ? 160 : 100), lean = (hash(x + 9) - 0.5) * 50;
          g.strokeStyle = shadeHex(P.near[1], 0.65 + hash(x + 2) * 0.7); g.lineWidth = 5;
          g.beginPath(); g.moveTo(x, FH + 5); g.quadraticCurveTo(x + lean * 0.3, FH - h * 0.6, x + lean, FH - h); g.stroke();
        }
      }
      if (si === 0) for (let k = 0; k < 26; k++) {
        const x = rand(40, FW - 40), h = rand(110, 190), c = pick(["#e8463c", "#f7c843", "#f28cb8", "#ffffff"]);
        g.strokeStyle = "#3f8f3c"; g.lineWidth = 6; g.beginPath(); g.moveTo(x, FH); g.lineTo(x, FH - h); g.stroke();
        g.fillStyle = "#4f9a40"; g.beginPath(); g.ellipse(x - 16, FH - h * 0.4, 9, 30, -0.4, 0, Math.PI * 2); g.fill();
        g.fillStyle = c; g.beginPath(); g.moveTo(x - 24, FH - h); g.lineTo(x - 24, FH - h - 34); g.lineTo(x - 12, FH - h - 20); g.lineTo(x, FH - h - 40); g.lineTo(x + 12, FH - h - 20); g.lineTo(x + 24, FH - h - 34); g.lineTo(x + 24, FH - h); g.quadraticCurveTo(x, FH - h + 22, x - 24, FH - h); g.fill();
      }
      if (si === 1) for (let k = 0; k < 30; k++) {
        const x = rand(40, FW - 40), y = FH - rand(90, 200);
        g.strokeStyle = "#2f7a33"; g.lineWidth = 5; g.beginPath(); g.moveTo(x, FH); g.lineTo(x, y); g.stroke();
        g.fillStyle = "#ffffff"; for (let q = 0; q < 10; q++) { const a = (q / 10) * Math.PI * 2; g.beginPath(); g.ellipse(x + Math.cos(a) * 18, y + Math.sin(a) * 18, 14, 6, a, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = "#f2c230"; g.beginPath(); g.arc(x, y, 10, 0, Math.PI * 2); g.fill();
      }
      if (si === 2) {
        for (const [px, py, pr] of [[3420, 2030, 105], [3640, 2070, 78], [260, 2060, 88]]) {
          for (let q = -2; q <= 2; q++) {
            const gr = g.createRadialGradient(px + q * pr * 0.32 - 10, py - 20, 4, px + q * pr * 0.32, py, pr * 0.62);
            gr.addColorStop(0, "#ffb347"); gr.addColorStop(1, "#c4621c");
            g.fillStyle = gr; g.beginPath(); g.ellipse(px + q * pr * 0.32, py, pr * 0.42, pr * 0.62, 0, 0, Math.PI * 2); g.fill();
          }
          g.strokeStyle = "#4e3a1e"; g.lineWidth = 12; g.beginPath(); g.moveTo(px, py - pr * 0.6); g.quadraticCurveTo(px + 10, py - pr * 0.85, px + 26, py - pr * 0.9); g.stroke();
        }
        for (let k = 0; k < 160; k++) { g.fillStyle = pick(LEAF_COLORS); g.beginPath(); g.ellipse(1450 + rand(-200, 200), 1975 + rand(-30, 40) - Math.abs(rand(-60, 60)), 14, 7, rand(0, 3), 0, Math.PI * 2); g.fill(); }
      }
      if (winter) {
        const sg2 = g.createLinearGradient(0, FH - 200, 0, FH); sg2.addColorStop(0, "#f7fafd"); sg2.addColorStop(1, "#c6d4e8");
        g.fillStyle = sg2; g.beginPath(); g.moveTo(0, FH);
        for (let x = 0; x <= FW; x += 20) g.lineTo(x, FH - 130 - Math.sin(x * 0.004) * 40 - Math.sin(x * 0.013) * 14);
        g.lineTo(FW, FH); g.fill();
        // a snowman
        const smx = 3380;
        g.strokeStyle = "#5a3d24"; g.lineWidth = 9;
        g.beginPath(); g.moveTo(smx - 70, 1810); g.lineTo(smx - 200, 1730); g.moveTo(smx + 70, 1810); g.lineTo(smx + 200, 1740); g.stroke();
        for (const [yy, r] of [[1960, 125], [1800, 95], [1670, 68]]) ball(g, smx, yy, r, "#ffffff", "#eef3fa", "#a9bbd6");
        g.fillStyle = "#c0392b"; g.fillRect(smx - 70, 1720, 140, 28); g.fillRect(smx + 30, 1730, 30, 90);
        g.fillStyle = "#1f2430"; for (const [ex, ey] of [[-24, 1655], [24, 1655], [0, 1780], [0, 1830], [0, 1880]]) { g.beginPath(); g.arc(smx + ex, ey, 9, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = "#f08a24"; g.beginPath(); g.moveTo(smx, 1672); g.lineTo(smx + 70, 1684); g.lineTo(smx, 1690); g.fill();
        g.fillStyle = "#1f2430"; g.fillRect(smx - 60, 1600, 120, 18); g.fillRect(smx - 40, 1520, 80, 85);
        for (let k = 0; k < 220; k++) { g.fillStyle = `rgba(255,255,255,${rand(0.5, 1)})`; g.fillRect(rand(0, FW), rand(FH - 160, FH), 3, 3); }
      }
      grainOver(g, 0.1);
    });
    let TB = [0, 0, FW, FH];
    const treeSprite = (snow: boolean) => mk((TB[2] - TB[0]) / 2, (TB[3] - TB[1]) / 2, (g) => {
      g.scale(0.5, 0.5); g.translate(-TB[0], -TB[1]); g.lineCap = "round";
      g.fillStyle = "#4a3322";
      g.beginPath(); g.moveTo(TX - 130, TY + 8); g.quadraticCurveTo(TX - 46, TY - 60, TX - 44, TY - 230); g.lineTo(TX + 40, TY - 230); g.quadraticCurveTo(TX + 46, TY - 60, TX + 140, TY + 8); g.fill();
      for (const b of branches) { g.strokeStyle = "#4a3322"; g.lineWidth = b.w; g.beginPath(); g.moveTo(b.x0, b.y0); g.lineTo(b.x1, b.y1); g.stroke(); }
      for (const b of branches) { g.strokeStyle = "rgba(150,112,78,.55)"; g.lineWidth = b.w * 0.36; g.beginPath(); g.moveTo(b.x0 - b.w * 0.2, b.y0); g.lineTo(b.x1 - b.w * 0.2, b.y1); g.stroke(); }
      g.strokeStyle = "rgba(25,16,10,.5)"; g.lineWidth = 3;
      for (let k = 0; k < 60; k++) { const y = TY - rand(0, 520), x = TX + rand(-34, 34); g.beginPath(); g.moveTo(x, y); g.lineTo(x + rand(-4, 4), y - rand(20, 60)); g.stroke(); }
      if (snow) for (const b of branches) if (b.w < 50) {
        g.strokeStyle = "rgba(250,252,255,.96)"; g.lineWidth = Math.max(5, b.w * 0.42);
        g.beginPath(); g.moveTo(b.x0, b.y0 - b.w * 0.4); g.lineTo(b.x1, b.y1 - b.w * 0.4); g.stroke();
      }
    });
    const cloudSprite = (warm: boolean) => mk(900, 400, (g) => {
      for (const [x, y, r] of [[230, 260, 130], [360, 210, 170], [540, 220, 150], [680, 260, 120], [450, 280, 140], [300, 290, 110], [600, 300, 110]]) {
        const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.5, r * 0.15, x, y, r);
        gr.addColorStop(0, warm ? "#fff2e2" : "#ffffff"); gr.addColorStop(0.65, warm ? "#ffd2b4" : "#eef4fb"); gr.addColorStop(1, warm ? "rgba(240,160,130,0)" : "rgba(190,208,232,0)");
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      }
    });
    const build = () => {
      grow(TX, TY - 220, -Math.PI / 2, 360, 76, 6);
      for (const b of branches) if (b.depth <= 1) for (let k = 0; k < (b.depth === 0 ? 3 : 2); k++) {
        const d = Math.random();
        blobs.push({ x: b.x1 + rand(-70, 70), y: b.y1 + rand(-60, 50), r: rand(58, 100), ci: Math.floor(rand(0, 3)), d, drop: 2.1 + d * 0.6, dropped: false,
          bl: Array.from({ length: 5 }, () => [rand(-0.7, 0.7), rand(-0.7, 0.7)] as [number, number]) });
      }
      // fill the inside of the crown too, so it's a full round canopy, not an arch
      const tips = branches.filter((b) => b.depth === 0);
      const x0 = Math.min(...tips.map((b) => b.x1)), x1 = Math.max(...tips.map((b) => b.x1)), y0 = Math.min(...tips.map((b) => b.y1)), y1 = Math.max(...tips.map((b) => b.y1));
      const ccx = (x0 + x1) / 2, ccy = (y0 + y1) / 2 + 40, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2 + 40;
      for (let k = 0; k < 70; k++) {
        const a = rand(0, Math.PI * 2), r = Math.sqrt(Math.random()) * 0.85, d = Math.random();
        blobs.unshift({ x: ccx + Math.cos(a) * rx * r, y: ccy + Math.sin(a) * ry * r, r: rand(70, 110), ci: Math.floor(rand(0, 3)), d, drop: 2.1 + d * 0.6, dropped: false,
          bl: Array.from({ length: 5 }, () => [rand(-0.7, 0.7), rand(-0.7, 0.7)] as [number, number]) });
      }
      scenes = [0, 1, 2, 3].map(sceneFor);
      TB = [Math.min(...branches.map((b) => Math.min(b.x0, b.x1))) - 120, Math.min(...branches.map((b) => Math.min(b.y0, b.y1))) - 120,
        Math.max(...branches.map((b) => Math.max(b.x0, b.x1))) + 160, TY + 40];
      trunk = treeSprite(false); trunkSnow = treeSprite(true);
      cloudW = cloudSprite(false); cloudWarm = cloudSprite(true);
    };
    const spawn = (kind: number, y?: number): SP => ({
      x: rand(-200, FW), y: kind === 1 ? rand(900, 1900) : y ?? rand(-200, -20), vx: kind === 3 ? rand(-60, 20) : rand(20, 140), vy: kind === 3 ? rand(90, 260) : kind === 1 ? rand(-20, 30) : rand(70, 170),
      r: kind === 3 ? rand(3, 13) : rand(10, 22), rot: rand(0, 6), spin: rand(-3, 3), kind,
    });
    add({ name: "seasons", label: "TAKEOVER · Four Seasons", side: "lawn", dur: D,
      start: () => { if (!scenes.length) build(); blobs.forEach((b) => (b.dropped = false)); parts = []; },
      draw: (e, dt) => {
        if (!trunk || !trunkSnow || !cloudW || !cloudWarm) return;
        const s = clamp01((e - 1.2) / (D - 6.5)) * 3.999, si = Math.floor(s), f = ease(clamp01((s - si - 0.72) / 0.28));
        const A = SE[si], B = SE[Math.min(3, si + 1)];
        const night = si === 3 ? 1 : si === 2 ? f : 0;
        // sky
        skyFill(ctx, [[0, rgbK(mixA(A.sky[0], B.sky[0], f), 1)], [0.55, rgbK(mixA(A.sky[1], B.sky[1], f), 1)], [1, rgbK(mixA(A.sky[2], B.sky[2], f), 1)]], 1460);
        if (night > 0) {
          for (const [x, y, r, ph] of stars) dot(x, y, r, "255,255,240", night * (0.45 + 0.45 * Math.sin(e * 1.7 + ph)));
          ctx.save(); ctx.globalAlpha = night; ctx.shadowColor = "rgba(255,250,220,.9)"; ctx.shadowBlur = 90;
          ctx.fillStyle = "#fffbe8"; ctx.beginPath(); ctx.arc(3150, 330, 115, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(200,195,170,.35)"; for (const [mx, my, mr] of [[3120, 300, 26], [3190, 360, 18], [3110, 380, 12]]) { ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill(); }
          ctx.restore();
        }
        // the sun, with soft rays
        const sx = lerp(A.sun[0], B.sun[0], f), sy = lerp(A.sun[1], B.sun[1], f), sc = mixA(A.sunCol, B.sunCol, f), day = 1 - night;
        if (day > 0) {
          ctx.save(); ctx.globalCompositeOperation = "lighter";
          const sq = sc.map((v) => Math.round(v / 24) * 24).join(",");
          ctx.globalAlpha = 0.5 * day; ctx.drawImage(glowSprite(sq), sx - 760, sy - 760, 1520, 1520); ctx.globalAlpha = 1;
          const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 1600);
          rg.addColorStop(0, rgbK(sc, 1, 0.12 * day)); rg.addColorStop(1, rgbK(sc, 1, 0));
          ctx.fillStyle = rg; ctx.beginPath();
          for (let k = 0; k < 12; k++) { const a = e * 0.03 + (k * Math.PI) / 6; ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a - 0.04) * 1600, sy + Math.sin(a - 0.04) * 1600); ctx.lineTo(sx + Math.cos(a + 0.04) * 1600, sy + Math.sin(a + 0.04) * 1600); ctx.closePath(); }
          ctx.fill();
          ctx.restore();
          ctx.save(); ctx.globalAlpha = day; ctx.shadowColor = rgbK(sc, 1); ctx.shadowBlur = 80; ctx.fillStyle = rgbK(sc, 1.25);
          ctx.beginPath(); ctx.arc(sx, sy, 115, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
        // clouds drifting by
        const warm = si === 2 ? 1 - f : si === 1 ? f : 0;
        for (const c of clouds) {
          c.x += c.v * dt; if (c.x > FW + 200) c.x = -900 * c.s;
          const w = 900 * c.s, h = 400 * c.s;
          const wa = (1 - warm) * (1 - night * 0.82);
          if (wa > 0.02) { ctx.globalAlpha = wa; ctx.drawImage(cloudW, c.x, c.y, w, h); }
          if (warm > 0.02) { ctx.globalAlpha = warm; ctx.drawImage(cloudWarm, c.x, c.y, w, h); }
        }
        ctx.globalAlpha = 1;
        // birds cross the summer sky
        if (s > 1.05 && s < 1.95) {
          const q = (s - 1.05) / 0.9, hx = lerp(-400, FW + 400, q), hy = 640 - q * 260;
          ctx.strokeStyle = "rgba(30,40,55,.75)"; ctx.lineWidth = 6; ctx.lineCap = "round";
          for (let i = 0; i < 9; i++) {
            const k = Math.ceil(i / 2), sd = i % 2 ? -1 : 1, x = hx - k * 80, y = hy + sd * k * 46, fl = Math.sin(e * 9 + i);
            ctx.beginPath(); ctx.moveTo(x - 24, y - fl * 7); ctx.quadraticCurveTo(x - 11, y - 12 * fl - 5, x, y); ctx.quadraticCurveTo(x + 11, y - 12 * fl - 5, x + 24, y - fl * 7); ctx.stroke();
          }
        }
        // the landscape for this season, blending into the next
        band(ctx, scenes[si], 960, FH);
        if (f > 0 && si < 3) { ctx.globalAlpha = f; band(ctx, scenes[si + 1], 960, FH); ctx.globalAlpha = 1; }
        // the big tree
        ctx.fillStyle = `rgba(0,0,0,${0.2 * (1 - night * 0.5)})`; ctx.beginPath(); ctx.ellipse(TX + 220, TY + 10, 560, 70, 0, 0, Math.PI * 2); ctx.fill();
        const tw = TB[2] - TB[0], th = TB[3] - TB[1];
        ctx.drawImage(trunk, TB[0], TB[1], tw, th);
        const snowy = si === 3 ? 1 : si === 2 ? clamp01((s - 2.8) / 0.2) : 0;
        if (snowy > 0) { ctx.globalAlpha = snowy; ctx.drawImage(trunkSnow, TB[0], TB[1], tw, th); ctx.globalAlpha = 1; }
        const groups = new Map<string, { col: number[]; list: { b: Blob; r: number }[] }>();
        const live: { b: Blob; r: number }[] = [];
        for (const b of blobs) {
          if (si === 2 && s > b.drop && !b.dropped) {
            b.dropped = true;
            if (Math.random() < 0.6) parts.push({ ...spawn(2), x: b.x + rand(-40, 40), y: b.y + rand(-30, 30), vy: rand(80, 160) });
          }
          if (b.dropped || si === 3) continue;
          const gr = si === 0 ? easeOut(clamp01((s - b.d * 0.3) / 0.3)) : 1;
          if (gr <= 0) continue;
          const lc = Math.round(ease(clamp01((s - si - 0.72 + (b.d - 0.5) * 0.3) / 0.28)) * 6) / 6;
          const key = `${b.ci}:${lc}`;
          let grp = groups.get(key);
          if (!grp) { grp = { col: mixA(A.canopy[b.ci], B.canopy[b.ci], lc), list: [] }; groups.set(key, grp); }
          grp.list.push({ b, r: b.r * gr }); live.push({ b, r: b.r * gr });
        }
        const sway = (b: Blob) => Math.sin(e * 1.2 + b.x * 0.01) * 5;
        const pass = (k: number, a: number, ox: (b: Blob, r: number) => number, oy: (r: number) => number, rs: number) => {
          for (const grp of groups.values()) {
            ctx.fillStyle = rgbK(grp.col, k, a); ctx.beginPath();
            for (const { b, r } of grp.list) { const x = b.x + ox(b, r) + sway(b), y = b.y + oy(r); ctx.moveTo(x + r * rs, y); ctx.arc(x, y, r * rs, 0, Math.PI * 2); }
            ctx.fill();
          }
        };
        pass(0.58, 1, () => 14, () => 22, 1.02);
        pass(1, 1, () => 0, () => 0, 1);
        pass(1.32, 0.8, (_b, r) => -r * 0.28, (r) => -r * 0.32, 0.55);
        const blossom = si === 0 ? clamp01((s - 0.25) / 0.2) : si === 1 ? 1 - clamp01(s - 1) * 3 : 0;
        if (blossom > 0) for (const [col, rr, d] of [[`rgba(250,190,215,${blossom})`, 11, 0], [`rgba(255,240,246,${blossom})`, 4, -3]] as const) {
          ctx.fillStyle = col; ctx.beginPath();
          for (const { b, r } of live) for (const [ox, oy] of b.bl) { const x = b.x + ox * r + sway(b) + d, y = b.y + oy * r + d; ctx.moveTo(x + rr, y); ctx.arc(x, y, rr, 0, Math.PI * 2); }
          ctx.fill();
        }
        // butterflies in summer
        const bfly = si === 1 ? clamp01((s - 1) / 0.15) * (1 - f) : 0;
        if (bfly > 0) for (let i = 0; i < 3; i++) {
          const x = 500 + i * 1000 + Math.sin(e * 0.7 + i) * 320, y = 1520 + Math.sin(e * 1.3 + i * 2) * 140, fl = 0.25 + 0.75 * Math.abs(Math.sin(e * 14 + i));
          ctx.save(); ctx.translate(x, y); ctx.globalAlpha = bfly; ctx.scale(1.3, 1.3);
          for (const sd of [-1, 1]) { ctx.save(); ctx.scale(sd * fl, 1); ctx.fillStyle = ["#f0a030", "#5aa9ea", "#f6c650"][i]; ctx.beginPath(); ctx.ellipse(26, -16, 28, 22, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(20, 16, 18, 14, 0.5, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
          ctx.fillStyle = "#2a1a10"; ctx.beginPath(); ctx.ellipse(0, 0, 5, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
        // what's in the air this season
        const targets = [55, 26, 60, 260];
        let n = 0; for (const q of parts) if (q.kind === si) n++;
        for (; n < targets[si]; n++) parts.push(spawn(si, e < 1.5 ? rand(-200, FH) : undefined));
        ctx.lineCap = "round";
        const snowPath: SP[] = [];
        for (let i = parts.length - 1; i >= 0; i--) {
          const q = parts[i], old = q.kind !== si;
          q.x += (q.vx + Math.sin(e + q.rot) * 50) * dt; q.y += q.vy * dt * (old ? (si === 3 ? 5 : 2.5) : 1); q.rot += q.spin * dt;
          if (q.y > FH + 40 || q.x > FW + 260 || q.y < -300 || (old && q.kind === 1)) {
            if (old) { parts.splice(i, 1); continue; }
            Object.assign(q, spawn(si));
          }
          ctx.globalAlpha = old ? 0.5 : 1;
          if (q.kind === 0) {
            ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.scale(1, 0.5 + 0.5 * Math.abs(Math.sin(q.rot * 2)));
            ctx.fillStyle = "#f7bcd5"; ctx.beginPath(); ctx.ellipse(0, 0, q.r, q.r * 0.62, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#fff0f6"; ctx.beginPath(); ctx.ellipse(-q.r * 0.25, -q.r * 0.15, q.r * 0.35, q.r * 0.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
          } else if (q.kind === 1) dot(q.x, q.y, q.r * 1.4, "255,250,190", 0.5 + 0.4 * Math.sin(e * 3 + q.rot));
          else if (q.kind === 2) leaf(q.x, q.y, q.r * 1.7, q.rot, q.rot * 2, LEAF_COLORS[Math.floor(hash(q.r) * 5)]);
          else snowPath.push(q);
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath();
        for (const q of snowPath) { ctx.moveTo(q.x + q.r * 0.6, q.y); ctx.arc(q.x, q.y, q.r * 0.6, 0, Math.PI * 2); }
        ctx.fill();
        // the season's name and what we do in it
        const local = s - si, nameA = e < D - 4.6 ? clamp01((local - 0.03) / 0.12) * clamp01((0.8 - local) / 0.12) : 0;
        if (nameA > 0) {
          title(A.name, 2750, 440, 250, "#ffffff", nameA, HEAD, 900);
          ctx.save(); ctx.globalAlpha = nameA; ctx.fillStyle = A.accent; ctx.beginPath(); ctx.roundRect(2750 - 170, 560, 340, 10, 5); ctx.fill(); ctx.restore();
          title(A.sub, 2750, 650, 64, "#ffffff", nameA * 0.95, HEAD, 600);
        }
        const end = win(e, D - 4.4, D - 3.4);
        if (end > 0) {
          const g2 = ctx.createRadialGradient(2750, 900, 100, 2750, 900, 900); g2.addColorStop(0, `rgba(5,10,25,${0.45 * end})`); g2.addColorStop(1, "rgba(5,10,25,0)");
          ctx.fillStyle = g2; ctx.fillRect(1850, 0, 1990, 1800);
          logo("lawn", 2750, 800, lerp(200, 760, backOut(end)), 0, end, "rgba(0,0,0,.6)");
          title("All Year Long.", 2750, 1330, 170, "#ffffff", win(e, D - 3.8, D - 3));
        }
        vignette(ctx, 0.3);
      } });
  }

  // ---- 2. The Big Mow: a whole yard from above, mowed into stripes by a riding mower ----
  {
    const D = 20, LX0 = 470, LX1 = 3460, LY0 = 560, LY1 = 1860, ROWS = 5;
    const LW = LX1 - LX0, LH = LY1 - LY0, RH = LH / ROWS, R = RH / 2;
    const TRX = 2650, TRY = 1180;
    const M0 = 1.8, M1 = D - 5.6;
    const xa = LX0 + R, xb = LX1 - R, LS = xb - xa, LT = Math.PI * R, TOTAL = ROWS * LS + (ROWS - 1) * LT;
    let rough: HTMLCanvasElement | null = null, cut: HTMLCanvasElement | null = null, over: HTMLCanvasElement | null = null, canopy: HTMLCanvasElement | null = null;
    let clips: { x: number; y: number; vx: number; vy: number; life: number; c: string }[] = [];
    const build = () => {
      rough = mk(LW / 2, LH / 2, (g) => {
        g.scale(0.5, 0.5);
        g.fillStyle = "#3d6b33"; g.fillRect(0, 0, LW, LH);
        for (let k = 0; k < 70; k++) {
          const x = rand(0, LW), y = rand(0, LH), r = rand(120, 380), c = pick(["34,72,30", "70,110,50", "104,124,56", "28,60,28"]);
          const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${c},.55)`); gr.addColorStop(1, `rgba(${c},0)`);
          g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
        }
        g.lineCap = "round";
        for (let k = 0; k < 34000; k++) {
          const x = rand(0, LW), y = rand(0, LH), l = rand(12, 30), a = rand(-0.7, 0.7);
          g.strokeStyle = pick(["#2b5428", "#3f7537", "#335f2d", "#4f8a43", "#25481f", "#5b9a4c"]); g.lineWidth = rand(2.2, 4);
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(a) * l, y - Math.cos(a) * l); g.stroke();
        }
        for (let k = 0; k < 60; k++) {
          const x = rand(0, LW), y = rand(0, LH);
          for (let j = 0; j < 14; j++) {
            const px = x + rand(-50, 50), py = y + rand(-36, 36);
            g.fillStyle = pick(["#5f9e4a", "#6aab52"]);
            for (let q = 0; q < 3; q++) { const a = (q * Math.PI * 2) / 3; g.beginPath(); g.arc(px + Math.cos(a) * 7, py + Math.sin(a) * 7, 7, 0, Math.PI * 2); g.fill(); }
          }
        }
        for (let k = 0; k < 190; k++) {
          const x = rand(0, LW), y = rand(0, LH);
          g.fillStyle = "#2f5f2a";
          for (let q = 0; q < 6; q++) { const a = (q / 6) * Math.PI * 2; g.beginPath(); g.ellipse(x + Math.cos(a) * 18, y + Math.sin(a) * 18, 18, 6, a, 0, Math.PI * 2); g.fill(); }
          const puff = Math.random() < 0.25;
          g.fillStyle = puff ? "#f2f4f0" : "#f5d13a"; g.beginPath(); g.arc(x, y, puff ? 14 : 12, 0, Math.PI * 2); g.fill();
          if (!puff) { g.fillStyle = "#df9f17"; g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill(); }
        }
      });
      cut = mk(LW / 2, LH / 2, (g) => {
        g.scale(0.5, 0.5); g.lineCap = "round";
        for (let r = 0; r < ROWS; r++) {
          const y = r * RH, light = r % 2 === 0;
          const gr = g.createLinearGradient(0, y, 0, y + RH);
          gr.addColorStop(0, light ? "#80c567" : "#4f9343"); gr.addColorStop(0.5, light ? "#74b95e" : "#4a8c3f"); gr.addColorStop(1, light ? "#69ad54" : "#44853a");
          g.fillStyle = gr; g.fillRect(0, y, LW, RH);
          for (let k = 0; k < 6500; k++) {
            const x = rand(0, LW), yy = y + rand(4, RH - 4), l = rand(10, 24);
            g.strokeStyle = light ? pick(["rgba(175,230,145,.35)", "rgba(90,150,70,.3)"]) : pick(["rgba(36,84,36,.4)", "rgba(110,170,90,.22)"]);
            g.lineWidth = 2; g.beginPath(); g.moveTo(x, yy); g.lineTo(x + (light ? l : -l), yy + rand(-2, 2)); g.stroke();
          }
        }
        for (let k = 0; k < 40; k++) {
          const x = rand(0, LW), y = rand(0, LH), r = rand(150, 400);
          const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(30,70,30,.12)"); gr.addColorStop(1, "rgba(30,70,30,0)");
          g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
        }
        grainOver(g, 0.08);
      });
      over = mk(FW / 2, FH / 2, (g) => {
        g.scale(0.5, 0.5);
        // mulch everywhere that isn't lawn
        g.save(); g.beginPath(); g.rect(0, 0, FW, FH); g.rect(LX0, LY0, LW, LH); g.clip("evenodd");
        g.fillStyle = "#5a3b28"; g.fillRect(0, 0, FW, FH);
        for (let k = 0; k < 14000; k++) { g.fillStyle = pick(["#6b4630", "#4a2f1f", "#7a5236", "#3f281a"]); g.fillRect(rand(0, FW), rand(0, FH), rand(4, 12), rand(2, 5)); }
        g.restore();
        // the house roof along the top
        g.fillStyle = "#454a53"; g.fillRect(0, 0, FW, 300);
        for (let y = 0, row = 0; y < 296; y += 34, row++) for (let x = row % 2 ? -45 : 0; x < FW; x += 90) {
          g.fillStyle = pick(["#4b5059", "#42464f", "#525862", "#3d4149", "#484d56"]); g.fillRect(x + 2, y + 2, 86, 30);
        }
        const rs = g.createLinearGradient(0, 0, 0, 300); rs.addColorStop(0, "rgba(255,255,255,.08)"); rs.addColorStop(1, "rgba(0,0,0,.25)");
        g.fillStyle = rs; g.fillRect(0, 0, FW, 300);
        g.fillStyle = "#d7dbe0"; g.fillRect(0, 292, FW, 18);
        g.fillStyle = "#b9bec5"; g.fillRect(2290, 300, 30, 250);
        const es = g.createLinearGradient(0, 310, 0, 390); es.addColorStop(0, "rgba(0,0,0,.35)"); es.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = es; g.fillRect(440, 310, FW, 80);
        // patio with a table and umbrella
        for (let y = 330, row = 0; y < 540; y += 92, row++) for (let x = 2330 + (row % 2 ? 55 : 0); x < 3290; x += 112) {
          g.fillStyle = pick(["#c1baae", "#b3ac9f", "#cbc4b8", "#aaa396"]); g.fillRect(x, y, 106, 86);
        }
        g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.arc(2830, 470, 150, 0, Math.PI * 2); g.fill();
        for (let k = 0; k < 8; k++) {
          g.fillStyle = k % 2 ? "#f4efe6" : "#2f7e37"; g.beginPath(); g.moveTo(2800, 440);
          g.arc(2800, 440, 150, (k / 8) * Math.PI * 2, ((k + 1) / 8) * Math.PI * 2); g.closePath(); g.fill();
        }
        g.fillStyle = "#e8e2d6"; g.beginPath(); g.arc(2800, 440, 14, 0, Math.PI * 2); g.fill();
        for (const [cx2, cy2] of [[2560, 450], [3050, 430]]) { g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.roundRect(cx2 - 46, cy2 - 40, 100, 92, 16); g.fill(); g.fillStyle = "#3b3f46"; g.beginPath(); g.roundRect(cx2 - 50, cy2 - 46, 100, 92, 16); g.fill(); }
        // shrubs along the house
        for (let x = 560; x < 2240; x += 210) ball(g, x, 440 + rand(-12, 12), rand(72, 96), "#6fbf5a", "#3d8a45", "#1f5a26");
        for (let k = 0; k < 60; k++) { g.fillStyle = pick(["#f7a8c9", "#ffffff", "#ffd166"]); g.beginPath(); g.arc(rand(520, 2240), rand(380, 510), 7, 0, Math.PI * 2); g.fill(); }
        // the driveway and a car
        const dg = g.createLinearGradient(0, 0, 440, 0); dg.addColorStop(0, "#bdb9b2"); dg.addColorStop(1, "#a9a59e");
        g.fillStyle = dg; g.fillRect(0, 310, 440, FH);
        g.strokeStyle = "rgba(80,76,70,.35)"; g.lineWidth = 4; for (let y = 700; y < 1880; y += 380) { g.beginPath(); g.moveTo(0, y); g.lineTo(440, y); g.stroke(); }
        for (let k = 0; k < 1500; k++) { g.fillStyle = `rgba(80,76,70,${rand(0.05, 0.2)})`; g.fillRect(rand(0, 440), rand(310, 1890), 3, 3); }
        g.save(); g.translate(220, 1060);
        g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.roundRect(-128, -296, 286, 630, 90); g.fill();
        const cg = g.createLinearGradient(-140, 0, 140, 0); cg.addColorStop(0, "#7f1d1d"); cg.addColorStop(0.45, "#d0453a"); cg.addColorStop(1, "#7f1d1d");
        g.fillStyle = cg; g.beginPath(); g.roundRect(-140, -310, 280, 620, 90); g.fill();
        g.fillStyle = "#1e293b"; g.beginPath(); g.roundRect(-118, -175, 236, 125, 30); g.fill(); g.beginPath(); g.roundRect(-110, 125, 220, 95, 24); g.fill();
        g.fillStyle = "rgba(255,255,255,.25)"; g.beginPath(); g.moveTo(-90, -165); g.lineTo(-30, -165); g.lineTo(-70, -60); g.lineTo(-110, -60); g.fill();
        g.fillStyle = "#b8372e"; g.beginPath(); g.roundRect(-120, -48, 240, 172, 20); g.fill();
        g.fillStyle = "#fff6c8"; for (const sx2 of [-90, 90]) { g.beginPath(); g.ellipse(sx2, -300, 30, 12, 0, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = "#7f1d1d"; for (const sx2 of [-160, 160]) { g.beginPath(); g.ellipse(sx2, -120, 22, 12, 0, 0, Math.PI * 2); g.fill(); }
        g.restore();
        // stone edging around the lawn
        g.strokeStyle = "#a39e94"; g.lineWidth = 26; g.strokeRect(LX0 - 13, LY0 - 13, LW + 26, LH + 26);
        g.strokeStyle = "rgba(255,255,255,.25)"; g.lineWidth = 4; g.strokeRect(LX0 - 22, LY0 - 22, LW + 44, LH + 44);
        // side bed, shrubs, hydrangeas and a fence
        for (let y = 700; y < 1800; y += 250) {
          ball(g, 3640, y, rand(80, 100), "#6fbf5a", "#3d8a45", "#1f5a26");
          const hc = pick([["#a9c8ff", "#5b86d6"], ["#f7b6d2", "#d06c98"], ["#ffffff", "#c9d4e2"]]);
          for (let q = 0; q < 9; q++) ball(g, 3640 + rand(-45, 45), y + rand(-45, 45), 22, hc[0], hc[0], hc[1]);
        }
        g.fillStyle = "#7a5b3c"; g.fillRect(3790, 300, 26, 1600);
        g.fillStyle = "#5d4530"; for (let y = 320; y < 1900; y += 240) g.fillRect(3784, y, 38, 38);
        // sidewalk, curb and street
        g.fillStyle = "#c9c5bd"; g.fillRect(0, 1895, FW, 150);
        g.strokeStyle = "rgba(90,86,80,.35)"; g.lineWidth = 4; for (let x = 0; x < FW; x += 230) { g.beginPath(); g.moveTo(x, 1895); g.lineTo(x, 2045); g.stroke(); }
        g.fillStyle = "#dedad2"; g.fillRect(0, 2045, FW, 26);
        g.fillStyle = "#383b40"; g.fillRect(0, 2071, FW, 100);
        for (let k = 0; k < 2000; k++) { g.fillStyle = `rgba(255,255,255,${rand(0.03, 0.12)})`; g.fillRect(rand(0, FW), rand(2071, FH), 3, 3); }
        // the tree's mulch ring and its shadow on the lawn
        g.fillStyle = "rgba(10,30,10,.32)"; g.beginPath(); g.ellipse(TRX + 130, TRY + 110, 470, 420, 0.3, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#4a2f1f"; g.beginPath(); g.arc(TRX, TRY, 170, 0, Math.PI * 2); g.fill();
        for (let k = 0; k < 400; k++) { const a = rand(0, 6.3), r = rand(0, 165); g.fillStyle = pick(["#6b4630", "#3f281a"]); g.fillRect(TRX + Math.cos(a) * r, TRY + Math.sin(a) * r, 8, 4); }
        g.strokeStyle = "#9a958c"; g.lineWidth = 16; g.beginPath(); g.arc(TRX, TRY, 175, 0, Math.PI * 2); g.stroke();
        grainOver(g, 0.1);
      });
      canopy = mk(1000, 1000, (g) => {
        g.fillStyle = "rgba(20,60,24,.9)"; g.beginPath(); g.arc(500, 500, 400, 0, Math.PI * 2); g.fill();
        for (let k = 0; k < 90; k++) {
          const a = rand(0, Math.PI * 2), r = Math.sqrt(Math.random()) * 330;
          ball(g, 500 + Math.cos(a) * r, 500 + Math.sin(a) * r, rand(70, 130), "#86cc6c", "#3f8f3c", "#1f5224");
        }
        for (let k = 0; k < 40; k++) { const a = rand(0, Math.PI * 2), r = rand(0, 300); g.fillStyle = "rgba(170,230,140,.25)"; g.beginPath(); g.arc(500 + Math.cos(a) * r - 40, 500 + Math.sin(a) * r - 40, rand(20, 50), 0, Math.PI * 2); g.fill(); }
      });
    };
    const pose = (dist: number) => {
      let d = Math.max(0, dist);
      for (let r = 0; r < ROWS; r++) {
        const dir = r % 2 ? -1 : 1, y = LY0 + RH * (r + 0.5);
        if (d <= LS || r === ROWS - 1) return { x: dir > 0 ? xa + d : xb - d, y, ang: dir > 0 ? 0 : Math.PI, row: r, along: d, turning: false };
        d -= LS;
        if (d <= LT) {
          const a = d / R, cx2 = dir > 0 ? xb : xa;
          return { x: cx2 + dir * Math.sin(a) * R, y: y + R - Math.cos(a) * R, ang: dir > 0 ? a : Math.PI - a, row: r, along: LS, turning: true };
        }
        d -= LT;
      }
      return { x: xb, y: LY1, ang: 0, row: ROWS - 1, along: LS, turning: false };
    };
    const mower = (x: number, y: number, ang: number, e: number) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.roundRect(-200, -186, 470, 410, 70); ctx.fill();
      const dg = ctx.createLinearGradient(0, -215, 0, 215); dg.addColorStop(0, "#8a93a1"); dg.addColorStop(0.5, "#5b6370"); dg.addColorStop(1, "#3e4550");
      ctx.fillStyle = dg; ctx.beginPath(); ctx.roundRect(-10, -215, 230, 430, 60); ctx.fill();
      ctx.fillStyle = "#363c46"; ctx.beginPath(); ctx.moveTo(50, 210); ctx.lineTo(170, 210); ctx.lineTo(150, 275); ctx.lineTo(70, 275); ctx.closePath(); ctx.fill();
      for (const sy of [-1, 1]) {
        ctx.fillStyle = "#15171b"; ctx.beginPath(); ctx.roundRect(-215, sy * 152 - 42, 145, 84, 22); ctx.fill();
        ctx.strokeStyle = "#2e3239"; ctx.lineWidth = 7;
        for (let k = 0; k < 6; k++) { const tx = -205 + ((k * 24 + e * 500) % 125); ctx.beginPath(); ctx.moveTo(tx, sy * 152 - 40); ctx.lineTo(tx, sy * 152 + 40); ctx.stroke(); }
        ctx.fillStyle = "#15171b"; ctx.beginPath(); ctx.roundRect(150, sy * 116 - 24, 84, 48, 14); ctx.fill();
      }
      const bg = ctx.createLinearGradient(0, -120, 0, 120); bg.addColorStop(0, "#7cd067"); bg.addColorStop(0.45, "#3d8a45"); bg.addColorStop(1, "#215a28");
      ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(-225, -118, 480, 236, 62); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.14)"; ctx.beginPath(); ctx.roundRect(70, -92, 172, 184, 52); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 6; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(112 + k * 30, -52); ctx.lineTo(112 + k * 30, 52); ctx.stroke(); }
      ctx.fillStyle = "#fff6c8"; for (const sy of [-1, 1]) { ctx.beginPath(); ctx.ellipse(246, sy * 62, 10, 22, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#1b1d22"; ctx.beginPath(); ctx.roundRect(-182, -82, 125, 164, 34); ctx.fill();
      ctx.fillStyle = "#2b6cb0"; ctx.beginPath(); ctx.ellipse(-112, 0, 50, 100, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.15)"; ctx.beginPath(); ctx.ellipse(-122, -30, 26, 60, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#2b6cb0"; ctx.lineWidth = 28; ctx.lineCap = "round";
      for (const sy of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-100, sy * 72); ctx.lineTo(10, sy * 42); ctx.stroke(); }
      ctx.strokeStyle = "#111"; ctx.lineWidth = 10; ctx.beginPath(); ctx.ellipse(26, 0, 16, 54, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#e0b48c"; for (const sy of [-1, 1]) { ctx.beginPath(); ctx.arc(20, sy * 40, 14, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#1a3d1f"; ctx.beginPath(); ctx.arc(-102, 0, 45, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2f7e37"; ctx.beginPath(); ctx.ellipse(-58, 0, 32, 42, 0, -Math.PI / 2, Math.PI / 2); ctx.fill();
      ctx.fillStyle = "#8fd18a"; ctx.beginPath(); ctx.arc(-102, 0, 9, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };
    add({ name: "bigmow", label: "TAKEOVER · The Big Mow", side: "lawn", dur: D,
      start: () => { if (!rough) build(); clips = []; },
      draw: (e, dt) => {
        if (!rough || !cut || !over || !canopy) return;
        const dist = e < M1 ? clamp01((e - M0) / (M1 - M0)) * TOTAL : TOTAL + (e - M1) * 1500;
        const P = pose(dist), done = dist >= TOTAL;
        ctx.drawImage(rough, LX0, LY0, LW, LH);
        // reveal the stripes behind the mower
        ctx.save(); ctx.beginPath();
        if (done) ctx.rect(LX0, LY0, LW, LH);
        else {
          const full = P.turning ? P.row + 1 : P.row;
          if (full > 0) ctx.rect(LX0, LY0, LW, full * RH);
          if (!P.turning && e > M0) {
            const top = LY0 + P.row * RH;
            if (P.row % 2 === 0) ctx.rect(LX0, top, Math.max(0, P.x + 120 - LX0), RH); else ctx.rect(P.x - 120, top, LX1 - (P.x - 120), RH);
          }
        }
        ctx.clip(); ctx.drawImage(cut, LX0, LY0, LW, LH); ctx.restore();
        ctx.drawImage(over, 0, 0, FW, FH);
        // clippings fly out of the side chute
        if (e > M0 && !done) for (let k = 0; k < 6; k++) {
          const c = Math.cos(P.ang), s2 = Math.sin(P.ang), lx = 110 + rand(-30, 30), ly = 270;
          const sp = rand(380, 820), side = rand(-0.5, 0.5);
          clips.push({ x: P.x + lx * c - ly * s2, y: P.y + lx * s2 + ly * c, vx: (-s2 * sp) + c * side * 300 - c * 200, vy: (c * sp) + s2 * side * 300 - s2 * 200, life: 0, c: pick(["#7cc96c", "#5fae55", "#9bd67f", "#4f9a46"]) });
        }
        for (let i = clips.length - 1; i >= 0; i--) {
          const q = clips[i]; q.life += dt; q.vx *= 0.93; q.vy *= 0.93; q.x += q.vx * dt; q.y += q.vy * dt;
          if (q.life > 0.9) { clips.splice(i, 1); continue; }
          ctx.globalAlpha = 1 - q.life / 0.9; ctx.fillStyle = q.c; ctx.fillRect(q.x, q.y, 11, 5);
        }
        ctx.globalAlpha = 1;
        if (e > M0 - 0.6) mower(e < M0 ? lerp(-400, xa, easeOut((e - M0 + 0.6) / 0.6)) : P.x, P.y, P.ang, e);
        ctx.drawImage(canopy, TRX - 500 + Math.sin(e * 0.8) * 4, TRY - 500, 1000, 1000);
        // done: a shine runs across the fresh stripes, then the logo stamps down
        const sh = win(e, M1, M1 + 1.4);
        if (sh > 0 && sh < 1) {
          const x = lerp(-600, FW + 600, sh), g = ctx.createLinearGradient(x - 420, 0, x + 420, 0);
          g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,240,.32)"); g.addColorStop(1, "rgba(255,255,255,0)");
          ctx.save(); ctx.beginPath(); ctx.rect(LX0, LY0, LW, LH); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(x - 420, 0, 840, FH); ctx.restore();
        }
        const st = win(e, M1 + 0.9, M1 + 1.6);
        if (st > 0) {
          const g2 = ctx.createRadialGradient(CX, 1050, 200, CX, 1050, 1300); g2.addColorStop(0, `rgba(5,20,8,${0.55 * st})`); g2.addColorStop(1, "rgba(5,20,8,0)");
          ctx.fillStyle = g2; ctx.fillRect(0, 0, FW, FH);
          if (st < 1) { ctx.strokeStyle = `rgba(255,255,255,${1 - st})`; ctx.lineWidth = 22; ctx.beginPath(); ctx.arc(CX, 930, 420 + st * 420, 0, Math.PI * 2); ctx.stroke(); }
          logo("lawn", CX, 930, lerp(1700, 860, easeOut(st)), 0, st, "rgba(0,0,0,.6)");
          title("Your Yard, Handled.", CX, 1500, 170, "#ffffff", win(e, M1 + 1.5, M1 + 2.1));
        }
        vignette(ctx, 0.35);
      } });
  }

  // ---- 3. Leaf Storm: hundreds of leaves, a vortex, the logo bursts out ----
  {
    type L = { x: number; y: number; vx: number; vy: number; a: number; r: number; size: number; col: string; rot: number; spin: number; flip: number; burst: boolean };
    let leaves: L[] = [];
    const D = 16;
    add({ name: "leafstorm", label: "TAKEOVER · Leaf Storm", side: "lawn", dur: D,
      start: () => {
        leaves = Array.from({ length: 270 }, () => ({ x: rand(-2600, -50), y: rand(0, FH), vx: rand(1400, 2200), vy: rand(-150, 150), a: 0, r: 0, size: rand(26, 46), col: pick(LEAF_COLORS), rot: rand(0, 6), spin: rand(-6, 6), flip: rand(0, 6), burst: false }));
      },
      draw: (e, dt) => {
        fillAll(vgrad([[0, "#2a3b22"], [0.6, "#3c5a2c"], [1, "#2b4a24"]]));
        ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = 4;
        for (let k = 0; k < 26; k++) { const y = hash(k) * FH, x = ((e * 2600 + hash(k + 4) * 6000) % 6000) - 1000; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 500, y + 20); ctx.stroke(); }
        const vortex = win(e, 4.5, 6), collapse = win(e, 9.5, 10.6), burstT = e - 10.6;
        // vortex glow
        if (vortex > 0 && burstT < 0) { const g = ctx.createRadialGradient(CX, CY, 0, CX, CY, 900); g.addColorStop(0, `rgba(255,190,90,${0.35 * vortex})`); g.addColorStop(1, "rgba(255,190,90,0)"); ctx.fillStyle = g; ctx.fillRect(CX - 900, CY - 900, 1800, 1800); }
        for (const l of leaves) {
          if (burstT >= 0) {
            if (!l.burst) { l.burst = true; const a = rand(0, Math.PI * 2), s = rand(900, 2400); l.x = CX + rand(-40, 40); l.y = CY + rand(-40, 40); l.vx = Math.cos(a) * s; l.vy = Math.sin(a) * s; }
            l.vx *= 0.97; l.vy = l.vy * 0.97 + 260 * dt; l.x += l.vx * dt; l.y += l.vy * dt;
          } else if (vortex > 0) {
            if (l.r === 0) { l.r = Math.hypot(l.x - CX, l.y - CY); l.a = Math.atan2(l.y - CY, l.x - CX); }
            const target = lerp(lerp(350, 1300, hash(l.size)), 0, collapse);
            l.r = lerp(l.r, target, Math.min(1, dt * 2.2));
            l.a += dt * (1.6 + 4 * collapse + 300 / Math.max(120, l.r));
            l.x = CX + Math.cos(l.a) * l.r; l.y = CY + Math.sin(l.a) * l.r * 0.62;
          } else {
            l.x += l.vx * dt; l.y += (l.vy + Math.sin(e * 3 + l.rot) * 300) * dt;
            if (l.x > FW + 100) { l.x = rand(-600, -50); l.y = rand(0, FH); }
          }
          l.rot += l.spin * dt; l.flip += dt * 5;
          leaf(l.x, l.y, l.size, l.rot, l.flip, l.col);
        }
        if (burstT >= -0.15 && burstT < 0.6) { ctx.fillStyle = `rgba(255,240,200,${clamp01(1 - Math.abs(burstT) / 0.5)})`; ctx.fillRect(0, 0, FW, FH); }
        if (burstT >= 0) {
          logo("lawn", CX, CY - 60, lerp(100, 980, backOut(burstT / 0.9)), Math.sin(e * 1.2) * 0.04, 1, "rgba(0,0,0,.6)");
          title("Leaf Cleanup", CX, CY + 600, 150, "#ffffff", win(burstT, 0.8, 1.4));
        }
      } });
  }

  // ---- 4. Snow Day: a blizzard buries the street, then the sidewalk and driveway get cleared ----
  {
    const D = 21, B0 = 7.6, B1 = 11.6, B2 = 14.8;
    const GY = 1600, SW0 = 1830, SW1 = 1900, ST = 1975;
    const DT = [2140, 2620], DB = [1950, 2850];       // driveway: top edge (at the garage) and bottom edge (at the street)
    const dwX = (y: number, side: 0 | 1) => lerp(DT[side], DB[side], (y - GY) / (ST - GY));
    let far: HTMLCanvasElement | null = null, base: HTMLCanvasElement | null = null, cover: HTMLCanvasElement | null = null;
    type Fl = { x: number; y: number; r: number; v: number; ph: number };
    let layers: Fl[][] = [], spray: { x: number; y: number; vx: number; vy: number; r: number; land: number }[] = [], smoke: { x: number; y: number; r: number; life: number }[] = [];
    let smokeT = 0, puff: HTMLCanvasElement | null = null;
    const WINDOWS: [number, number, number, number][] = [[2775, 975, 150, 190], [3115, 975, 150, 190], [3455, 975, 150, 190], [2765, 1280, 170, 200], [3445, 1280, 170, 200]];
    const pine = (g: CanvasRenderingContext2D, x: number, base0: number, h: number, snow: boolean) => {
      g.fillStyle = "#3d2b1f"; g.fillRect(x - 18, base0 - 90, 36, 90);
      for (let k = 0; k < 6; k++) {
        const ty = base0 - 80 - k * h * 0.14, w = h * (0.42 - k * 0.06), th = h * 0.26;
        if (snow) {
          g.strokeStyle = "#f6f9fd"; g.lineCap = "round"; g.lineWidth = 16 + w * 0.05;
          g.beginPath(); g.moveTo(x - w * 0.92, ty - 4); g.lineTo(x, ty - th + 4); g.lineTo(x + w * 0.92, ty - 4); g.stroke();
          g.fillStyle = "#f6f9fd"; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(x + sd * w * 0.9, ty - 6, 22, 12, 0, 0, Math.PI * 2); g.fill(); }
          g.beginPath(); g.ellipse(x, ty - th * 0.2, w * 0.35, 10, 0, 0, Math.PI * 2); g.fill();
          continue;
        }
        const gr = g.createLinearGradient(x - w, 0, x + w, 0); gr.addColorStop(0, "#2c6b45"); gr.addColorStop(0.5, "#1f5236"); gr.addColorStop(1, "#143a27");
        g.fillStyle = gr; g.beginPath(); g.moveTo(x - w, ty); g.lineTo(x, ty - th); g.lineTo(x + w, ty); g.quadraticCurveTo(x, ty - th * 0.15, x - w, ty); g.fill();
      }
    };
    const build = () => {
      far = mk(FW / 2, FH / 2, (g) => {
        g.scale(0.5, 0.5);
        for (let x = -60; x < FW + 60; x += 70 + Math.floor(hash(x) * 60)) {
          const h = 260 + hash(x + 2) * 260; g.fillStyle = hash(x + 5) > 0.5 ? "#22324a" : "#1c2a3f";
          g.beginPath(); g.moveTo(x - h * 0.28, 1460); g.lineTo(x, 1460 - h); g.lineTo(x + h * 0.28, 1460); g.fill();
        }
        g.fillStyle = "#33445c"; g.fillRect(0, 1440, FW, 170);
        for (const [hx, s] of [[180, 0.5], [760, 0.56], [1360, 0.6]] as const) {
          g.save(); g.translate(hx, 1500); g.scale(s, s);
          g.fillStyle = "#2a3850"; g.fillRect(0, -520, 820, 520);
          g.fillStyle = "#1c2638"; g.beginPath(); g.moveTo(-60, -500); g.lineTo(410, -820); g.lineTo(880, -500); g.fill();
          g.fillStyle = "#ffcf73"; for (const [wx, wy] of [[90, -420], [340, -420], [590, -420], [90, -200], [590, -200]]) g.fillRect(wx, wy, 140, 130);
          g.fillStyle = "#121a28"; g.fillRect(350, -250, 120, 250);
          g.restore();
        }
      });
      base = mk(FW / 2, FH / 2, (g) => {
        g.scale(0.5, 0.5);
        // yard, sidewalk, curb, street
        const yg = g.createLinearGradient(0, 1440, 0, SW0); yg.addColorStop(0, "#4f6150"); yg.addColorStop(1, "#5e7458");
        g.fillStyle = yg; g.fillRect(0, 1440, FW, SW0 - 1440);
        for (let k = 0; k < 2500; k++) { g.fillStyle = `rgba(230,240,250,${rand(0.05, 0.25)})`; g.fillRect(rand(0, FW), rand(1440, SW0), 3, 2); }
        g.fillStyle = "#9da2a9"; g.fillRect(0, SW0, FW, SW1 - SW0);
        g.strokeStyle = "rgba(60,64,70,.4)"; g.lineWidth = 4; for (let x = 0; x < FW; x += 210) { g.beginPath(); g.moveTo(x, SW0); g.lineTo(x - 30, SW1); g.stroke(); }
        g.fillStyle = "#4a5b47"; g.fillRect(0, SW1, FW, 50);
        g.fillStyle = "#b9bdc3"; g.fillRect(0, SW1 + 50, FW, 25);
        g.fillStyle = "#2c3036"; g.fillRect(0, ST, FW, FH - ST);
        for (let k = 0; k < 1500; k++) { g.fillStyle = `rgba(255,255,255,${rand(0.03, 0.1)})`; g.fillRect(rand(0, FW), rand(ST, FH), 3, 3); }
        g.fillStyle = "#e3c04a"; for (let x = 40; x < FW; x += 300) g.fillRect(x, 2090, 160, 14);
        // driveway
        const dg = g.createLinearGradient(0, GY, 0, ST); dg.addColorStop(0, "#9ca1a8"); dg.addColorStop(1, "#b4b8be");
        g.fillStyle = dg; g.beginPath(); g.moveTo(DT[0], GY); g.lineTo(DT[1], GY); g.lineTo(DB[1], ST); g.lineTo(DB[0], ST); g.fill();
        g.strokeStyle = "rgba(60,64,70,.35)"; g.lineWidth = 4;
        for (const y of [1720, 1880]) { g.beginPath(); g.moveTo(dwX(y, 0), y); g.lineTo(dwX(y, 1), y); g.stroke(); }
        g.beginPath(); g.moveTo((DT[0] + DT[1]) / 2, GY); g.lineTo((DB[0] + DB[1]) / 2, ST); g.stroke();
        // left pine and the house
        pine(g, 1880, GY + 10, 1000, false);
        // garage
        g.fillStyle = "#7f93aa"; g.fillRect(2080, 1200, 610, 400);
        g.strokeStyle = "rgba(40,55,75,.25)"; g.lineWidth = 3; for (let y = 1214; y < GY; y += 26) { g.beginPath(); g.moveTo(2080, y); g.lineTo(2690, y); g.stroke(); }
        g.fillStyle = "#3d434d"; g.beginPath(); g.moveTo(2040, 1212); g.lineTo(2140, 1075); g.lineTo(2690, 1075); g.lineTo(2710, 1212); g.fill();
        g.fillStyle = "#eef1f4"; g.fillRect(DT[0], 1290, DT[1] - DT[0], GY - 1290);
        g.strokeStyle = "#c8cdd4"; g.lineWidth = 6;
        for (let k = 1; k < 4; k++) { const y = 1290 + k * 77.5; g.beginPath(); g.moveTo(DT[0], y); g.lineTo(DT[1], y); g.stroke(); }
        for (let k = 1; k < 4; k++) { const x = DT[0] + k * 120; g.beginPath(); g.moveTo(x, 1290); g.lineTo(x, GY); g.stroke(); }
        g.fillStyle = "#26303d"; for (let k = 0; k < 4; k++) g.fillRect(DT[0] + 22 + k * 120, 1306, 76, 44);
        g.fillStyle = "#f2f4f6"; g.fillRect(DT[0] - 20, 1270, DT[1] - DT[0] + 40, 20);
        // main house: siding, trim, roof and chimney
        g.fillStyle = "#8aa0b8"; g.fillRect(2680, 920, 1020, 680);
        g.strokeStyle = "rgba(40,55,75,.22)"; g.lineWidth = 3; for (let y = 934; y < GY; y += 26) { g.beginPath(); g.moveTo(2680, y); g.lineTo(3700, y); g.stroke(); }
        g.fillStyle = "#f2f4f6"; g.fillRect(2680, 920, 26, 680); g.fillRect(3674, 920, 26, 680); g.fillRect(2680, 1225, 1020, 18);
        g.fillStyle = "#8b4a3a"; g.fillRect(3440, 540, 100, 230);
        g.strokeStyle = "rgba(255,230,210,.35)"; g.lineWidth = 3;
        for (let y = 552, r2 = 0; y < 770; y += 24, r2++) { g.beginPath(); g.moveTo(3440, y); g.lineTo(3540, y); g.stroke(); for (let x = 3440 + (r2 % 2 ? 25 : 0); x < 3540; x += 50) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 24); g.stroke(); } }
        g.fillStyle = "#5e3226"; g.fillRect(3430, 530, 120, 20);
        const rg = g.createLinearGradient(0, 660, 0, 930); rg.addColorStop(0, "#4a505b"); rg.addColorStop(1, "#33383f");
        g.fillStyle = rg; g.beginPath(); g.moveTo(2620, 935); g.lineTo(2780, 660); g.lineTo(3600, 660); g.lineTo(3760, 935); g.fill();
        g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 3;
        for (let y = 690; y < 935; y += 28) { const t = (y - 660) / 275; g.beginPath(); g.moveTo(lerp(2780, 2620, t), y); g.lineTo(lerp(3600, 3760, t), y); g.stroke(); }
        g.fillStyle = "#d7dbe0"; g.fillRect(2610, 930, 1160, 16);
        // windows: warm light, curtains, mullions, shutters
        for (const [wx, wy, ww, wh] of WINDOWS) {
          g.fillStyle = "#1f2a3d"; g.fillRect(wx - 44, wy - 6, 34, wh + 12); g.fillRect(wx + ww + 10, wy - 6, 34, wh + 12);
          const wg = g.createRadialGradient(wx + ww / 2, wy + wh / 2, 10, wx + ww / 2, wy + wh / 2, ww);
          wg.addColorStop(0, "#ffe2a0"); wg.addColorStop(1, "#e79a42"); g.fillStyle = wg; g.fillRect(wx, wy, ww, wh);
          g.fillStyle = "rgba(170,60,50,.75)"; g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx + ww * 0.32, wy); g.quadraticCurveTo(wx + ww * 0.12, wy + wh * 0.5, wx + ww * 0.2, wy + wh); g.lineTo(wx, wy + wh); g.fill();
          g.beginPath(); g.moveTo(wx + ww, wy); g.lineTo(wx + ww * 0.68, wy); g.quadraticCurveTo(wx + ww * 0.88, wy + wh * 0.5, wx + ww * 0.8, wy + wh); g.lineTo(wx + ww, wy + wh); g.fill();
          g.strokeStyle = "#f4f6f8"; g.lineWidth = 12; g.strokeRect(wx, wy, ww, wh);
          g.lineWidth = 6; g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.moveTo(wx, wy + wh / 2); g.lineTo(wx + ww, wy + wh / 2); g.stroke();
          g.fillStyle = "#f4f6f8"; g.fillRect(wx - 14, wy + wh + 4, ww + 28, 14);
        }
        // front door with a wreath and porch light
        g.fillStyle = "#f4f6f8"; g.fillRect(3100, 1280, 200, 320);
        const dr = g.createLinearGradient(3115, 0, 3285, 0); dr.addColorStop(0, "#9b2b23"); dr.addColorStop(1, "#6e1a15");
        g.fillStyle = dr; g.fillRect(3118, 1300, 164, 300);
        g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 5; g.strokeRect(3138, 1330, 124, 100); g.strokeRect(3138, 1460, 124, 110);
        g.strokeStyle = "#2f6b3c"; g.lineWidth = 22; g.beginPath(); g.arc(3200, 1385, 42, 0, Math.PI * 2); g.stroke();
        g.fillStyle = "#d13b30"; g.beginPath(); g.moveTo(3200, 1350); g.lineTo(3176, 1330); g.lineTo(3176, 1362); g.lineTo(3224, 1338); g.lineTo(3224, 1370); g.fill();
        g.fillStyle = "#e3c04a"; g.beginPath(); g.arc(3258, 1460, 9, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#2b2f36"; g.fillRect(3060, 1330, 22, 40); g.fillStyle = "#ffe7a8"; g.fillRect(3064, 1340, 14, 24);
        g.fillStyle = "#c9cdd2"; g.fillRect(3080, 1590, 240, 22);
        // bushes, a lamp post and the mailbox
        for (const [bx, r] of [[2770, 85], [2960, 70], [3440, 72], [3620, 88]]) ball(g, bx, GY - r * 0.55, r, "#3f8a5a", "#245c3a", "#123321");
        g.fillStyle = "#1d232c"; g.fillRect(746, 1220, 28, 680); g.fillRect(722, 1880, 76, 26);
        g.fillStyle = "#2a313c"; g.beginPath(); g.moveTo(712, 1170); g.lineTo(808, 1170); g.lineTo(790, 1250); g.lineTo(730, 1250); g.fill();
        g.fillStyle = "#ffe7a8"; g.fillRect(734, 1182, 52, 58);
        g.fillStyle = "#1d232c"; g.beginPath(); g.moveTo(700, 1172); g.lineTo(760, 1130); g.lineTo(820, 1172); g.fill();
        g.fillStyle = "#4a3426"; g.fillRect(1772, 1760, 18, 90);
        g.fillStyle = "#2c3e5a"; g.beginPath(); g.roundRect(1720, 1700, 130, 70, [36, 36, 6, 6]); g.fill();
        g.fillStyle = "#d13b30"; g.fillRect(1838, 1700, 10, 40);
        grainOver(g, 0.08);
      });
      cover = mk(FW / 2, FH / 2, (g) => {
        g.scale(0.5, 0.5);
        const sg = g.createLinearGradient(0, GY, 0, FH); sg.addColorStop(0, "#e9f0f8"); sg.addColorStop(1, "#f7fafd");
        g.fillStyle = sg; g.fillRect(0, GY - 8, FW, ST - GY + 8);
        g.fillStyle = "#f3f7fc"; g.beginPath(); g.moveTo(0, GY + 4);
        for (let x = 0; x <= FW; x += 30) g.lineTo(x, GY - 14 - Math.sin(x * 0.01) * 8 - hash(x) * 10);
        g.lineTo(FW, GY + 4); g.fill();
        g.fillStyle = "#f7fafd"; g.beginPath(); g.moveTo(DT[0], GY); g.lineTo(DT[1], GY); g.lineTo(DB[1], ST); g.lineTo(DB[0], ST); g.fill();
        for (let k = 0; k < 50; k++) { g.fillStyle = "rgba(120,150,200,.13)"; g.beginPath(); g.ellipse(rand(0, FW), rand(1460, 1960), rand(120, 360), rand(10, 24), 0, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = "rgba(225,232,242,.8)"; for (const y of [2030, 2120]) { g.beginPath(); g.ellipse(CX, y, FW * 0.6, 22, 0, 0, Math.PI * 2); g.fill(); }
        for (let k = 0; k < 500; k++) { g.fillStyle = `rgba(255,255,255,${rand(0.5, 1)})`; g.fillRect(rand(0, FW), rand(1450, ST), 3, 3); }
        pine(g, 1880, GY + 10, 1000, true);
        for (const [bx, r] of [[2770, 85], [2960, 70], [3440, 72], [3620, 88]]) { g.fillStyle = "#f7fafd"; g.beginPath(); g.ellipse(bx, GY - r * 1.05, r * 0.9, r * 0.45, 0, Math.PI, 0); g.fill(); }
        g.fillStyle = "#f7fafd"; g.beginPath(); g.ellipse(1785, 1702, 74, 22, 0, Math.PI, 0); g.fill();
        g.beginPath(); g.ellipse(760, 1132, 66, 18, 0, Math.PI, 0); g.fill();
        for (const [wx, wy, ww, wh] of WINDOWS) { g.beginPath(); g.ellipse(wx + ww / 2, wy + wh + 6, ww / 2 + 12, 12, 0, Math.PI, 0); g.fill(); }
        g.fillRect(2040, 1066, 670, 14);
      });
      layers = [
        Array.from({ length: 320 }, () => ({ x: rand(0, FW), y: rand(0, FH), r: rand(2, 4), v: rand(120, 220), ph: rand(0, 6) })),
        Array.from({ length: 200 }, () => ({ x: rand(0, FW), y: rand(0, FH), r: rand(4, 8), v: rand(260, 420), ph: rand(0, 6) })),
        Array.from({ length: 70 }, () => ({ x: rand(0, FW), y: rand(0, FH), r: rand(9, 16), v: rand(520, 800), ph: rand(0, 6) })),
      ];
    };
    // the operator and snow blower, seen from the side
    const sideBlower = (x: number, y: number, sc: number, e: number) => {
      const step = Math.sin(e * 7);
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
      ctx.fillStyle = "rgba(20,30,50,.25)"; ctx.beginPath(); ctx.ellipse(130, 6, 260, 26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#1f2937"; ctx.lineWidth = 34; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, -150); ctx.lineTo(step * 32, -12); ctx.moveTo(0, -150); ctx.lineTo(-step * 32, -12); ctx.stroke();
      ctx.fillStyle = "#2b2f36"; for (const sd of [1, -1]) { ctx.beginPath(); ctx.ellipse(sd * step * 32 + 14, -6, 32, 16, 0, 0, Math.PI * 2); ctx.fill(); }
      const cg = ctx.createLinearGradient(-50, 0, 60, 0); cg.addColorStop(0, "#a52f22"); cg.addColorStop(0.5, "#d4483a"); cg.addColorStop(1, "#8f2a1f");
      ctx.fillStyle = cg; ctx.beginPath(); ctx.roundRect(-52, -300, 106, 170, 36); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 4; for (const yy of [-250, -205, -165]) { ctx.beginPath(); ctx.moveTo(-50, yy); ctx.lineTo(52, yy); ctx.stroke(); }
      ctx.strokeStyle = "#d4483a"; ctx.lineWidth = 28; ctx.beginPath(); ctx.moveTo(10, -270); ctx.lineTo(120, -200); ctx.stroke();
      ctx.fillStyle = "#1f2937"; ctx.beginPath(); ctx.arc(124, -198, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#3dd09b"; ctx.fillRect(-36, -312, 80, 22);
      ctx.fillStyle = "#e0b48c"; ctx.beginPath(); ctx.arc(8, -338, 36, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2f7e37"; ctx.beginPath(); ctx.arc(4, -348, 38, Math.PI, 0); ctx.fill(); ctx.fillRect(-36, -352, 80, 18);
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(4, -394, 14, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#5a636e"; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(118, -205); ctx.lineTo(220, -80); ctx.stroke();
      const bg = ctx.createLinearGradient(0, -140, 0, -10); bg.addColorStop(0, "#6fd081"); bg.addColorStop(1, "#2e7a3a");
      ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(190, -140, 170, 120, 22); ctx.fill();
      ctx.fillStyle = "#3a404b"; ctx.fillRect(230, -175, 70, 40);
      ctx.fillStyle = "#23272e"; ctx.beginPath(); ctx.moveTo(350, -130); ctx.lineTo(430, -130); ctx.lineTo(430, -10); ctx.lineTo(350, -10); ctx.fill();
      ctx.strokeStyle = "#8a93a1"; ctx.lineWidth = 7;
      for (let k = 0; k < 4; k++) { const ox = ((k * 30 + e * 600) % 120) - 10; ctx.beginPath(); ctx.moveTo(360 + ox * 0.5, -120); ctx.lineTo(420 - ox * 0.3, -20); ctx.stroke(); }
      ctx.strokeStyle = "#2e7a3a"; ctx.lineWidth = 34; ctx.lineCap = "butt"; ctx.beginPath(); ctx.moveTo(320, -140); ctx.quadraticCurveTo(330, -230, 270, -270); ctx.stroke();
      ctx.fillStyle = "#1f2937"; ctx.beginPath(); ctx.arc(250, -12, 34, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#596270"; ctx.beginPath(); ctx.arc(250, -12, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff6c8"; ctx.beginPath(); ctx.arc(352, -100, 12, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const hl = ctx.createLinearGradient(360, 0, 900, 0); hl.addColorStop(0, "rgba(255,240,190,.4)"); hl.addColorStop(1, "rgba(255,240,190,0)");
      ctx.fillStyle = hl; ctx.beginPath(); ctx.moveTo(360, -100); ctx.lineTo(900, -220); ctx.lineTo(900, 40); ctx.fill(); ctx.restore();
      ctx.restore();
      return { cx: x + 268 * sc, cy: y - 272 * sc };
    };
    // ...and from behind, walking up the driveway
    const rearBlower = (x: number, y: number, sc: number, e: number) => {
      const step = Math.sin(e * 7);
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
      ctx.fillStyle = "rgba(20,30,50,.25)"; ctx.beginPath(); ctx.ellipse(0, 6, 230, 30, 0, 0, Math.PI * 2); ctx.fill();
      const bg = ctx.createLinearGradient(0, -260, 0, -120); bg.addColorStop(0, "#6fd081"); bg.addColorStop(1, "#2e7a3a");
      ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(-190, -250, 380, 130, 24); ctx.fill();
      ctx.strokeStyle = "#2e7a3a"; ctx.lineWidth = 36; ctx.beginPath(); ctx.moveTo(60, -250); ctx.quadraticCurveTo(80, -330, 170, -350); ctx.stroke();
      ctx.strokeStyle = "#5a636e"; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(-120, -120); ctx.lineTo(-120, -200); ctx.lineTo(120, -200); ctx.lineTo(120, -120); ctx.stroke();
      ctx.strokeStyle = "#1f2937"; ctx.lineWidth = 36; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-34, -150); ctx.lineTo(-34, -14 + step * 10); ctx.moveTo(34, -150); ctx.lineTo(34, -14 - step * 10); ctx.stroke();
      const cg = ctx.createLinearGradient(-70, 0, 70, 0); cg.addColorStop(0, "#a52f22"); cg.addColorStop(0.5, "#d4483a"); cg.addColorStop(1, "#8f2a1f");
      ctx.fillStyle = cg; ctx.beginPath(); ctx.roundRect(-72, -320, 144, 185, 44); ctx.fill();
      ctx.strokeStyle = "#d4483a"; ctx.lineWidth = 28; ctx.beginPath(); ctx.moveTo(-60, -280); ctx.lineTo(-110, -205); ctx.moveTo(60, -280); ctx.lineTo(110, -205); ctx.stroke();
      ctx.fillStyle = "#3dd09b"; ctx.fillRect(-46, -334, 92, 24);
      ctx.fillStyle = "#2f7e37"; ctx.beginPath(); ctx.arc(0, -370, 44, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.fillRect(-44, -352, 88, 16);
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(0, -418, 15, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return { cx: x + 175 * sc, cy: y - 352 * sc };
    };
    add({ name: "snowday", label: "TAKEOVER · Snow Day", side: "lawn", dur: D,
      start: () => { if (!base) build(); spray = []; smoke = []; },
      draw: (e, dt) => {
        if (!far || !base || !cover) return;
        const storm = clamp01(e / 2) * (1 - win(e, B2 - 1, B2 + 1.2));
        const depth = ease(win(e, 0.6, B0 - 0.4)), clear = win(e, B2 - 0.8, B2 + 1.5);
        // sky: storm clouds, then blue sky and sun
        skyFill(ctx, [[0, rgbK(mixA("#3c74c8", "#1c2333", storm), 1)], [0.7, rgbK(mixA("#a9cdf2", "#4c5a74", storm), 1)], [1, rgbK(mixA("#e6f1fb", "#7e8ca6", storm), 1)]], 1500);
        if (storm > 0) {
          puff ??= mk(256, 256, (q) => { const gr = q.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, "rgba(30,36,50,1)"); gr.addColorStop(1, "rgba(30,36,50,0)"); q.fillStyle = gr; q.fillRect(0, 0, 256, 256); });
          ctx.globalAlpha = 0.5 * storm;
          for (let k = 0; k < 9; k++) { const x = ((k * 520 + e * 60) % (FW + 1000)) - 500, y = 120 + (k % 3) * 160, r = 420 + (k % 4) * 90; ctx.drawImage(puff, x - r, y - r, r * 2, r * 2); }
          ctx.globalAlpha = 1;
        }
        if (clear > 0) {
          ctx.save(); ctx.globalCompositeOperation = "lighter";
          const sg = ctx.createRadialGradient(3150, 300, 40, 3150, 300, 700); sg.addColorStop(0, `rgba(255,240,180,${0.6 * clear})`); sg.addColorStop(1, "rgba(255,240,180,0)");
          ctx.fillStyle = sg; ctx.fillRect(2450, -400, 1400, 1400); ctx.restore();
          ctx.save(); ctx.globalAlpha = clear; ctx.shadowColor = "#fff2b0"; ctx.shadowBlur = 90; ctx.fillStyle = "#fff6c8"; ctx.beginPath(); ctx.arc(3150, 300, 120, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
        band(ctx, far, 880, 1620);
        if (depth > 0) { ctx.fillStyle = `rgba(232,240,250,${0.9 * depth})`; ctx.fillRect(0, 1440, FW, 170); }
        ctx.fillStyle = `rgba(150,165,190,${0.55 * storm})`; ctx.fillRect(0, 860, FW, 760);
        band(ctx, base, 500, FH);
        // snow covers everything, a little more every second
        if (depth > 0) { ctx.globalAlpha = depth; band(ctx, cover, 540, FH); ctx.globalAlpha = 1; }
        // snow piles on the roofs, icicles grow
        if (depth > 0) {
          const th = depth * 58;
          ctx.fillStyle = `rgba(245,248,252,${Math.min(1, depth * 1.3)})`;
          ctx.beginPath(); ctx.moveTo(2612, 942); ctx.lineTo(2780, 660);
          for (let x = 2780; x <= 3600; x += 40) ctx.lineTo(x, 660 - th - Math.sin(x * 0.03) * 6 * depth);
          ctx.lineTo(3600, 660); ctx.lineTo(3768, 942); ctx.lineTo(3768, 942 + 14 * depth); ctx.lineTo(2612, 942 + 14 * depth); ctx.closePath(); ctx.fill();
          ctx.fillStyle = `rgba(245,248,252,${depth})`; ctx.beginPath(); ctx.moveTo(2040, 1212); ctx.lineTo(2140, 1075 - th * 0.8); ctx.lineTo(2690, 1075 - th * 0.8); ctx.lineTo(2710, 1212); ctx.closePath(); ctx.fill();
          ctx.fillRect(3430, 530 - th * 0.6, 120, th * 0.6 + 4);
          const ic = clamp01((depth - 0.5) * 2);
          if (ic > 0) for (let x = 2630; x < 3760; x += 46) {
            const L = (30 + hash(x) * 80) * ic, gr = ctx.createLinearGradient(0, 944, 0, 944 + L);
            gr.addColorStop(0, "rgba(235,248,255,.95)"); gr.addColorStop(1, "rgba(170,215,255,.4)");
            ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x - 9, 944); ctx.lineTo(x + 9, 944); ctx.lineTo(x, 944 + L); ctx.fill();
          }
        }
        // chimney smoke, pushed by the wind
        smokeT -= dt;
        if (smokeT <= 0) { smoke.push({ x: 3490, y: 520, r: 30, life: 0 }); smokeT = 0.12; }
        for (let i = smoke.length - 1; i >= 0; i--) {
          const p = smoke[i]; p.life += dt; p.r += 40 * dt; p.y -= (110 - storm * 50) * dt; p.x -= (30 + storm * 260) * dt;
          if (p.life > 3.5) { smoke.splice(i, 1); continue; }
          ctx.fillStyle = `rgba(220,226,235,${0.35 * (1 - p.life / 3.5)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        }
        // what's been cleared shows the pavement again
        const sideX = e < B0 ? -1 : e < B1 ? lerp(-500, 2160, (e - B0) / (B1 - B0)) : 2160;
        const dwY = e < B1 ? ST + 20 : lerp(1975, 1640, ease(win(e, B1, B2)));
        if (sideX > -500) {
          ctx.save(); ctx.beginPath();
          ctx.rect(0, SW0 - 4, Math.max(0, sideX + 260), SW1 - SW0 + 8);
          if (e > B1) { ctx.moveTo(dwX(dwY, 0), dwY); ctx.lineTo(dwX(dwY, 1), dwY); ctx.lineTo(DB[1], ST); ctx.lineTo(DB[0], ST); ctx.closePath(); }
          ctx.clip(); band(ctx, base, 1600, 2000); ctx.restore();
          ctx.lineCap = "round";
          const bank = (pts: [number, number][], w: number) => {
            ctx.strokeStyle = "rgba(140,165,205,.5)"; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + w * 0.3) : ctx.moveTo(x, y + w * 0.3))); ctx.stroke();
            ctx.strokeStyle = "#f7fafd"; ctx.lineWidth = w * 0.8; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
          };
          const sx2 = Math.max(0, sideX + 260), gap0 = dwX(SW0, 0) - 30, gap1 = dwX(SW1, 0) - 30;
          bank([[0, SW0 - 10], [Math.min(sx2, gap0), SW0 - 10]], 30); bank([[0, SW1 + 8], [Math.min(sx2, gap1), SW1 + 8]], 26);
          if (e > B1) { bank([[dwX(dwY, 0) - 18, dwY], [DB[0] - 26, ST]], 34); bank([[dwX(dwY, 1) + 18, dwY], [DB[1] + 26, ST]], 34); }
        }
        // the operator and blower
        let chute: { cx: number; cy: number } | null = null;
        if (e >= B0 && e < B1) chute = sideBlower(sideX, 1880, 0.78, e);
        else if (e >= B1 && e < B2 + 0.4) chute = rearBlower(lerp(2400, 2380, win(e, B1, B2)), Math.min(1990, dwY + 30), lerp(0.85, 0.48, ease(win(e, B1, B2))), e);
        else if (e >= B2 + 0.4) rearBlower(2380, 1670, 0.48, 0);
        if (chute && e < B2) for (let k = 0; k < 8; k++) {
          const side = e < B1;
          spray.push({ x: chute.cx, y: chute.cy, vx: side ? rand(-420, -60) : rand(380, 760), vy: rand(-1050, -700) * (side ? 1 : 0.8), r: rand(6, 16), land: side ? rand(1480, 1800) : rand(1500, 1950) });
        }
        ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.beginPath();
        for (let i = spray.length - 1; i >= 0; i--) {
          const p = spray[i]; p.vy += 1700 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.vy > 0 && p.y > p.land) { spray.splice(i, 1); continue; }
          ctx.moveTo(p.x + p.r, p.y); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        }
        ctx.fill();
        // warm windows and the lamp glow
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.22 + 0.15 * storm;
        for (const [wx, wy, ww, wh] of WINDOWS) ctx.drawImage(glowSprite("255,190,100"), wx + ww / 2 - 260, wy + wh / 2 - 260, 520, 520);
        ctx.globalAlpha = 1;
        const lamp = 0.35 + 0.45 * storm;
        const lg = ctx.createRadialGradient(760, 1210, 10, 760, 1210, 230); lg.addColorStop(0, `rgba(255,225,160,${lamp})`); lg.addColorStop(1, "rgba(255,225,160,0)");
        ctx.fillStyle = lg; ctx.fillRect(530, 980, 460, 460);
        const cone = ctx.createLinearGradient(0, 1240, 0, 1900); cone.addColorStop(0, `rgba(255,225,160,${0.22 * lamp})`); cone.addColorStop(1, "rgba(255,225,160,0)");
        ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(735, 1240); ctx.lineTo(785, 1240); ctx.lineTo(1080, 1900); ctx.lineTo(440, 1900); ctx.fill();
        ctx.restore();
        // three layers of falling snow
        const wind = -(60 + storm * 520);
        layers.forEach((L, li) => {
          const amt = li === 0 ? 0.35 + 0.65 * storm : 0.15 + 0.85 * storm, streak = li === 2 && storm > 0.3;
          ctx.fillStyle = `rgba(255,255,255,${0.55 + li * 0.15})`; ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 12; ctx.lineCap = "round";
          ctx.beginPath();
          for (const f of L) {
            f.x += (wind * (0.6 + li * 0.3) + Math.sin(e + f.ph) * 30) * dt; f.y += f.v * dt * (0.4 + storm * 0.9);
            if (f.y > FH + 20) { f.y = rand(-60, -10); f.x = rand(0, FW + 600); }
            if (f.x < -40) f.x += FW + 80;
            if (hash(f.ph * 100) > amt) continue;
            if (streak) { ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - wind * 0.03, f.y - f.v * 0.03); }
            else { ctx.moveTo(f.x + f.r, f.y); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); }
          }
          if (streak) ctx.stroke(); else ctx.fill();
        });
        if (storm > 0.2) fillAll(`rgba(220,230,244,${0.16 * storm})`);
        // the sun comes out: sparkles, then the logo
        if (clear > 0) for (let k = 0; k < 90; k++) {
          const x = hash(k) * FW, y = 1460 + hash(k + 40) * 480;
          dot(x, y, 14, "255,255,255", clear * Math.max(0, Math.sin(e * 4 + k * 1.7)));
        }
        const end = win(e, B2 + 0.6, B2 + 1.4);
        if (end > 0) {
          const g2 = ctx.createRadialGradient(1050, 800, 100, 1050, 800, 900); g2.addColorStop(0, `rgba(10,25,50,${0.28 * end})`); g2.addColorStop(1, "rgba(10,25,50,0)");
          ctx.fillStyle = g2; ctx.fillRect(0, 0, 2100, 1700);
          logo("lawn", 1050, 640, lerp(300, 760, backOut(end)), 0, end, "rgba(0,0,0,.5)");
          title("Snow Day? Handled.", 1050, 1140, 160, "#ffffff", win(e, B2 + 1.1, B2 + 1.8));
        }
        vignette(ctx, 0.32);
      } });
  }

  // ---- 5. Firefly Night: fireflies spell out the name, then a giant leaf ----
  {
    type F = { x: number; y: number; vx: number; vy: number; tx: number; ty: number; tx2: number; ty2: number; ph: number };
    let flies: F[] = [];
    const D = 19;
    add({ name: "fireflynight", label: "TAKEOVER · Firefly Night", side: "lawn", dur: D,
      start: () => {
        const N = 1500;
        const word = samplePoints((g, w, h) => {
          g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
          g.font = `900 ${h * 0.17}px ${HEAD}`; g.fillText("HANOVER", w / 2, h * 0.36);
          g.fillText("LAWN CO", w / 2, h * 0.56);
        }, N);
        const leafPts = samplePoints((g, w, h) => {
          g.translate(w / 2, h * 0.47); g.rotate(-0.6); g.scale(h * 0.0042, h * 0.0042);
          g.fillStyle = "#fff"; g.beginPath(); g.moveTo(-90, 0);
          g.bezierCurveTo(-36, -60, 45, -45, 90, 0); g.bezierCurveTo(45, 45, -36, 60, -90, 0); g.fill();
          g.fillRect(-120, -3, 40, 6);
        }, N);
        flies = word.map(([tx, ty], i) => ({ x: rand(0, FW), y: rand(FH * 0.4, FH), vx: rand(-60, 60), vy: rand(-60, 60), tx, ty, tx2: leafPts[i][0], ty2: leafPts[i][1], ph: rand(0, 6) }));
      },
      draw: (e, dt) => {
        fillAll(vgrad([[0, "#050a1c"], [0.6, "#0b1a2e"], [1, "#10261c"]]));
        for (let k = 0; k < 120; k++) dot(hash(k) * FW, hash(k + 7) * FH * 0.6, 7 + hash(k + 2) * 6, "255,255,240", 0.4 + 0.4 * Math.sin(e * 1.5 + k));
        const moonY = lerp(900, 330, easeOut(e / 6));
        ctx.save(); ctx.shadowColor = "rgba(255,250,220,.9)"; ctx.shadowBlur = 90; ctx.fillStyle = "#fffbe6"; ctx.beginPath(); ctx.arc(3250, moonY, 140, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.fillStyle = "#0a1a10"; ctx.beginPath(); ctx.moveTo(0, FH);
        for (let x = 0; x <= FW; x += 40) ctx.lineTo(x, 1880 + Math.sin(x * 0.0016) * 70 + Math.sin(x * 0.006) * 20);
        ctx.lineTo(FW, FH); ctx.fill();
        ctx.strokeStyle = "#0a1a10"; ctx.lineWidth = 6;
        for (let x = 0; x < FW; x += 18) { const h = 30 + hash(x) * 70; ctx.beginPath(); ctx.moveTo(x, 1890 + Math.sin(x * 0.0016) * 70); ctx.lineTo(x + hash(x + 1) * 20 - 10, 1890 + Math.sin(x * 0.0016) * 70 - h); ctx.stroke(); }
        const toWord = win(e, 4, 6.5), toLeaf = win(e, 10.5, 12.5), scatter = win(e, 15.5, 17.5);
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        flies.forEach((f) => {
          let tx: number, ty: number, pull: number;
          if (scatter > 0) { tx = f.tx2 + Math.cos(f.ph) * 3000; ty = -600; pull = scatter * 0.6; }
          else if (toLeaf > 0) { tx = f.tx2; ty = f.ty2; pull = toLeaf; }
          else { tx = f.tx; ty = f.ty; pull = toWord; }
          f.vx += rand(-80, 80) * dt; f.vy += rand(-80, 80) * dt; f.vx *= 0.98; f.vy *= 0.98;
          f.x += f.vx * dt * (1 - pull); f.y += f.vy * dt * (1 - pull);
          if (pull > 0) { const k = Math.min(1, dt * (1.5 + pull * 5)); f.x = lerp(f.x, tx + Math.sin(e * 2 + f.ph) * 3, k); f.y = lerp(f.y, ty + Math.cos(e * 2 + f.ph) * 3, k); }
          const blink = 0.55 + 0.45 * Math.sin(e * 3 + f.ph * 3);
          dot(f.x, f.y, 22, toLeaf > 0.5 && scatter === 0 ? "255,200,90" : "215,255,120", blink);
        });
        ctx.restore();
        const lg = win(e, 15.2, 16.4);
        logo("lawn", CX, 900, lerp(500, 900, easeOut(lg)), 0, lg, "rgba(215,255,120,.5)");
        title("hanoverlawnco.com", CX, 1600, 110, "#d9f5c8", Math.max(win(e, 12.5, 13.2) * (1 - scatter), lg), HEAD, 700);
      } });
  }

  // =====================================================================
  // HUNTERPCBUILDS
  // =====================================================================

  // ---- 6. System Boot: BIOS screen, loading, the logo boots up ----
  {
    const D = 18;
    const lines: [number, string, string][] = [
      [0.0, "HunterPCBuilds BIOS v2.026   (C) Hanover, PA", "#ffffff"],
      [0.5, "CPU: Hunter Custom @ 5.2 GHz ............... OK", "#cbd5e1"],
      [0.9, "Memory Test: ", "#cbd5e1"],
      [2.0, "NVMe SSD 2TB detected ...................... OK", "#cbd5e1"],
      [2.4, "GPU: RGB Edition ........................... OK", "#cbd5e1"],
      [2.8, "Fans: 6 detected ........................... spinning", "#cbd5e1"],
      [3.2, "Temps: 34°C ................................ cool", "#cbd5e1"],
      [3.7, "Checking for dust bunnies .................. none ✓", "#3dd09b"],
      [4.3, "Booting HunterPC OS from SSD...", "#38bdf8"],
    ];
    add({ name: "boot", label: "TAKEOVER · System Boot", side: "pc", dur: D, draw: (e) => {
      fillAll("#000");
      const be = e - 1.2;
      ctx.font = `700 64px ${api.mono}`; ctx.textBaseline = "top"; ctx.textAlign = "left";
      if (be < 5.8) {
        lines.forEach(([t0, txt, col], i) => {
          if (be < t0) return;
          let s = txt.slice(0, Math.floor((be - t0) * 90));
          if (txt.startsWith("Memory")) s = `Memory Test: ${Math.min(65536, Math.floor(((be - t0) / 0.9) * 65536))} MB${be - t0 > 0.9 ? " ......... OK" : ""}`;
          ctx.fillStyle = col; ctx.fillText(s, 160, 160 + i * 110);
        });
        if (be % 0.8 < 0.45) { ctx.fillStyle = "#fff"; ctx.fillRect(160, 160 + lines.length * 110, 36, 64); }
        ctx.fillStyle = "#64748b"; ctx.fillText("Press DEL to enter setup        F12 boot menu", 160, FH - 220);
      } else if (be < 8.6) {
        const q = win(be, 5.8, 8.4);
        ctx.save(); ctx.translate(CX, CY - 120); ctx.rotate(be * 6);
        ctx.strokeStyle = `rgb(${CYAN})`; ctx.lineWidth = 24; ctx.lineCap = "round";
        ctx.beginPath(); ctx.arc(0, 0, 150, 0, Math.PI * 1.4); ctx.stroke(); ctx.restore();
        ctx.fillStyle = "#1e293b"; ctx.beginPath(); ctx.roundRect(CX - 900, CY + 160, 1800, 60, 30); ctx.fill();
        ctx.fillStyle = `rgb(${CYAN})`; ctx.beginPath(); ctx.roundRect(CX - 900, CY + 160, 1800 * easeOut(q), 60, 30); ctx.fill();
        ctx.textAlign = "center"; ctx.fillStyle = "#e2e8f0"; ctx.fillText(`Loading HunterPC OS   ${Math.round(easeOut(q) * 100)}%`, CX, CY + 290);
      } else {
        const q = be - 8.6;
        // glitched arrival
        const img = api.pcLogo();
        if (img) {
          const size = 1000, x = CX - size / 2, y = CY - 220 - size / 2;
          const glitch = q < 1.2 ? 1 - q / 1.2 : 0;
          ctx.save(); ctx.globalAlpha = clamp01(q * 3);
          if (glitch > 0 && Math.random() < 0.8) {
            for (let k = 0; k < 12; k++) {
              const sy = (img.height / 12) * k, off = (Math.random() - 0.5) * 160 * glitch;
              ctx.drawImage(img, 0, sy, img.width, img.height / 12, x + off, y + (size / 12) * k, size, size / 12);
            }
            ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.5 * glitch;
            ctx.drawImage(img, x + 30, y, size, size); ctx.drawImage(img, x - 30, y, size, size);
          } else { ctx.shadowColor = `rgba(${TEAL},.7)`; ctx.shadowBlur = 90; ctx.drawImage(img, x, y, size, size); }
          ctx.restore();
        }
        for (let k = 0; k < 3; k++) { const r = ((q * 500 + k * 400) % 1200) + 520; ctx.strokeStyle = `rgba(${TEAL},${0.4 * (1 - (r - 520) / 1200)})`; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(CX, CY - 220, r, 0, Math.PI * 2); ctx.stroke(); }
        title("SYSTEM ONLINE ✓", CX, CY + 480, 150, `rgb(${CYAN})`, win(q, 1.2, 1.8), api.mono, 700);
      }
      ctx.fillStyle = "rgba(0,0,0,.18)"; for (let y = 0; y < FH; y += 8) ctx.fillRect(0, y, FW, 3);   // CRT scanlines
      const vg = ctx.createRadialGradient(CX, CY, FH * 0.5, CX, CY, FW * 0.62); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.6)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, FW, FH);
    } });
  }

  // ---- 7. Circuit Overload: traces grow over the whole screen, then it all powers up ----
  {
    type Seg = { x0: number; y0: number; x1: number; y1: number; d: number };
    let segs: Seg[] = [], nodes: { x: number; y: number; d: number }[] = [], maxD = 1;
    const G = 60;
    const build = () => {
      segs = []; nodes = [];
      const used = new Set<string>();
      const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
      type W = { x: number; y: number; dir: number; d: number; life: number };
      let walkers: W[] = [];
      for (let k = 0; k < 28; k++) {
        const a = (k / 28) * Math.PI * 2, x = Math.round((CX + Math.cos(a) * 380) / G) * G, y = Math.round((CY + Math.sin(a) * 380) / G) * G;
        walkers.push({ x, y, dir: Math.round((a / (Math.PI * 2)) * 8) % 8, d: 0, life: 200 });
      }
      let guard = 0;
      while (walkers.length && guard++ < 6000) {
        const next: W[] = [];
        for (const w of walkers) {
          if (Math.random() < 0.18) w.dir = (w.dir + (Math.random() < 0.5 ? 1 : 7)) % 8;
          const [dx, dy] = dirs[w.dir], nx = w.x + dx * G, ny = w.y + dy * G, key = `${nx},${ny}`;
          if (nx < -G || nx > FW + G || ny < -G || ny > FH + G || used.has(key) || w.life <= 0) { nodes.push({ x: w.x, y: w.y, d: w.d }); continue; }
          used.add(key);
          const len = Math.hypot(dx, dy) * G;
          segs.push({ x0: w.x, y0: w.y, x1: nx, y1: ny, d: w.d + len });
          next.push({ ...w, x: nx, y: ny, d: w.d + len, life: w.life - 1 });
          if (Math.random() < 0.07 && next.length < 260) next.push({ x: nx, y: ny, dir: (w.dir + (Math.random() < 0.5 ? 2 : 6)) % 8, d: w.d + len, life: w.life - 1 });
        }
        walkers = next;
      }
      maxD = Math.max(...segs.map((s) => s.d));
    };
    const D = 16;
    add({ name: "overload", label: "TAKEOVER · Circuit Overload", side: "pc", dur: D, start: build, draw: (e) => {
      fillAll("#070b11");
      ctx.strokeStyle = "rgba(30,45,62,.6)"; ctx.lineWidth = 2;
      for (let x = 0; x < FW; x += G) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FH); ctx.stroke(); }
      for (let y = 0; y < FH; y += G) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FW, y); ctx.stroke(); }
      const growD = ease(win(e, 1, 7)) * maxD, wave = win(e, 7.2, 11), waveR = wave * maxD * 1.15, flash = win(e, 10.8, 11.4);
      const buckets = [new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D()];
      for (const s of segs) {
        if (s.d > growD) continue;
        let b = 0.25;
        if (s.d > growD - 140) b = 1;                                                     // the growing tips glow
        if (wave > 0) b = Math.max(b, Math.exp(-Math.pow((s.d - waveR) / 220, 2)));
        if (flash > 0) b = Math.max(b, 1 - flash);
        const p = buckets[Math.min(4, Math.floor(b * 5))]; p.moveTo(s.x0, s.y0); p.lineTo(s.x1, s.y1);
      }
      ctx.lineCap = "round";
      buckets.forEach((p, i) => {
        const a = (i + 1) / 5;
        if (i >= 3) { ctx.strokeStyle = `rgba(${CYAN},${0.35 * a})`; ctx.lineWidth = 22; ctx.stroke(p); }
        ctx.strokeStyle = i >= 4 ? "rgba(220,250,255,1)" : `rgba(${TEAL},${0.35 + 0.65 * a})`; ctx.lineWidth = 7; ctx.stroke(p);
      });
      for (const n of nodes) {
        if (n.d > growD) continue;
        const b = wave > 0 ? Math.exp(-Math.pow((n.d - waveR) / 220, 2)) : 0;
        ctx.fillStyle = "#070b11"; ctx.strokeStyle = `rgba(${TEAL},${0.6 + 0.4 * b})`; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.arc(n.x, n.y, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        if (b > 0.2) dot(n.x, n.y, 70, CYAN, b);
      }
      // the core
      const core = clamp01(e / 1.2);
      ctx.fillStyle = "#0b1017"; ctx.beginPath(); ctx.arc(CX, CY, 380, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(${TEAL},${core})`; ctx.lineWidth = 14; ctx.stroke();
      const lit = win(e, 11, 12);
      logo("pc", CX, CY, lerp(560, 760, easeOut(lit)), 0, core, `rgba(${TEAL},${0.4 + 0.6 * lit})`);
      if (flash > 0 && flash < 1) fillAll(`rgba(220,250,255,${Math.sin(flash * Math.PI) * 0.85})`);
      title("POWERED UP", CX, CY + 560, 170, "#ffffff", win(e, 11.6, 12.3), HEAD, 900);
    } });
  }

  // ---- 8. PC Build: a gaming PC builds itself, part by part, then powers on ----
  {
    const D = 25, X0 = 1180, Y0 = 200, W = 1500, H = 1760, MX = 1350, MY = 330;
    const STEPS: [string, string][] = [
      ["Motherboard", "Board · Hunter Z-series ATX"], ["CPU", "CPU · 16 cores @ 5.2 GHz"], ["CPU cooler", "Cooler · 6-pipe tower"],
      ["RAM", "RAM · 64 GB DDR5"], ["Graphics card", "GPU · Hunter GFX 16 GB"], ["Power supply", "PSU · 1000 W Gold"],
      ["Fans", "Fans · 3 × 140 mm ARGB"], ["Cables", "Cables · custom sleeved"], ["Glass panel", "Panel · tempered glass"], ["Power on", "Status · ONLINE ✓"],
    ];
    const at = (i: number) => 1.7 + i * 1.5;
    const ANCH: [number, number][] = [[MX + 760, MY + 70], [1790, 610], [1930, 470], [MX + 770, MY + 160], [2150, 1060], [X0 + 560, 1700], [2440, 420], [2240, 760], [X0 + W - 40, Y0 + 160], [X0 + W - 200, Y0 + 26]];
    const FANS: [number, number][] = [[2420, 420], [2420, 735], [2420, 1050]];
    let spr: Record<string, HTMLCanvasElement> | null = null;
    let sparks: { x: number; y: number; vx: number; vy: number; life: number; c: string }[] = [];
    const seatT: number[] = [];
    const build = () => {
      const wall = mk(FW / 2, FH / 2, (g) => {
        g.scale(0.5, 0.5);
        const bgG = g.createLinearGradient(0, 0, 0, FH); bgG.addColorStop(0, "#0d1524"); bgG.addColorStop(1, "#05080d"); g.fillStyle = bgG;
        g.fillRect(0, 0, FW, FH);
        g.strokeStyle = "rgba(56,189,248,.05)"; g.lineWidth = 3;
        const hs = 70;
        for (let row = 0, y = 0; y < 2000; row++, y += hs * 1.5) for (let x = row % 2 ? hs * 0.87 : 0; x < FW + hs; x += hs * 1.74) {
          g.beginPath(); for (let k = 0; k <= 6; k++) { const a = (k / 6) * Math.PI * 2 + Math.PI / 6; g.lineTo(x + Math.cos(a) * hs, y + Math.sin(a) * hs); } g.stroke();
        }
        const sp = g.createRadialGradient(X0 + W / 2, -200, 100, X0 + W / 2, -200, 2200); sp.addColorStop(0, "rgba(200,230,255,.12)"); sp.addColorStop(1, "rgba(200,230,255,0)");
        g.fillStyle = sp; g.fillRect(0, 0, FW, FH);
        const dk = g.createLinearGradient(0, 1960, 0, FH); dk.addColorStop(0, "#1c222c"); dk.addColorStop(1, "#090c11");
        g.fillStyle = dk; g.fillRect(0, 1960, FW, FH - 1960);
        g.fillStyle = "#3a4352"; g.fillRect(0, 1960, FW, 5);
        for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(255,255,255,${rand(0.01, 0.03)})`; g.fillRect(0, rand(1970, FH), FW, rand(1, 3)); }
        g.fillStyle = "rgba(0,0,0,.55)"; g.beginPath(); g.ellipse(X0 + W / 2, 1968, W * 0.62, 34, 0, 0, Math.PI * 2); g.fill();
        for (const fx of [X0 + 120, X0 + W - 180]) { g.fillStyle = "#11161d"; g.beginPath(); g.roundRect(fx, Y0 + H - 6, 60, 22, 6); g.fill(); }
        grainOver(g, 0.12);
      });
      const shell = mk(W, H, (g) => {
        const og = g.createLinearGradient(0, 0, W, 0); og.addColorStop(0, "#1e2632"); og.addColorStop(0.5, "#161d27"); og.addColorStop(1, "#0f141b");
        g.fillStyle = og; g.beginPath(); g.roundRect(0, 0, W, H, 46); g.fill();
        g.strokeStyle = "#3b4656"; g.lineWidth = 10; g.stroke();
        const ig = g.createLinearGradient(0, 90, 0, H); ig.addColorStop(0, "#111821"); ig.addColorStop(1, "#0b1017");
        g.fillStyle = ig; g.beginPath(); g.roundRect(50, 90, W - 190, H - 140, 20); g.fill();
        g.fillStyle = "#0b0f15"; g.fillRect(70, 22, W - 220, 50);
        g.fillStyle = "#1c2430"; for (let x = 84; x < W - 160; x += 22) for (let y = 30; y < 66; y += 18) { g.beginPath(); g.arc(x + (y % 36 ? 11 : 0), y, 6, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = "#0b0f15"; g.fillRect(W - 128, 40, 92, H - 80);
        g.fillStyle = "#1c2430"; for (let y = 52; y < H - 50; y += 20) for (let x = W - 118; x < W - 40; x += 20) { g.beginPath(); g.arc(x + (y % 40 ? 10 : 0), y, 6, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = "#0a0e13"; g.strokeStyle = "#1f2937"; g.lineWidth = 4;
        g.beginPath(); g.roundRect(MX - X0 + 300, MY - Y0 + 150, 360, 340, 14); g.fill(); g.stroke();
        for (const gy of [480, 780]) { g.fillStyle = "#06080b"; g.beginPath(); g.roundRect(2240 - X0 - 28, gy - Y0, 56, 190, 26); g.fill(); g.strokeStyle = "#2a3240"; g.lineWidth = 3; g.beginPath(); g.moveTo(2240 - X0, gy - Y0 + 20); g.lineTo(2240 - X0, gy - Y0 + 170); g.stroke(); }
        for (let k = 0; k < 7; k++) {
          const y = 960 - Y0 + k * 62; const sg = g.createLinearGradient(56, 0, 112, 0); sg.addColorStop(0, "#5b6472"); sg.addColorStop(0.5, "#aab3bf"); sg.addColorStop(1, "#5b6472");
          g.fillStyle = sg; g.fillRect(56, y, 56, 52);
          g.fillStyle = "#1a2029"; for (let q = 0; q < 4; q++) g.fillRect(64 + q * 11, y + 10, 6, 32);
        }
        g.fillStyle = "#0e1319"; g.beginPath(); g.roundRect(W - 148, 4, 100, 14, 6); g.fill();
      });
      const mobo = mk(840, 1020, (g) => {
        g.fillStyle = "#141920"; g.beginPath(); g.roundRect(0, 0, 840, 1020, 10); g.fill();
        g.strokeStyle = "rgba(61,208,155,.07)"; g.lineWidth = 2;
        for (let k = 0; k < 160; k++) { const x = rand(0, 840), y = rand(0, 1020), l = rand(40, 160); g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y); g.lineTo(x + l + 20, y + 20); g.stroke(); }
        const io = g.createLinearGradient(0, 0, 200, 0); io.addColorStop(0, "#2c3442"); io.addColorStop(1, "#1a202a");
        g.fillStyle = io; g.beginPath(); g.moveTo(0, 0); g.lineTo(200, 0); g.lineTo(200, 330); g.lineTo(150, 390); g.lineTo(0, 390); g.closePath(); g.fill();
        g.strokeStyle = "#3dd09b"; g.lineWidth = 5; g.beginPath(); g.moveTo(180, 20); g.lineTo(180, 320); g.lineTo(140, 370); g.stroke();
        g.save(); g.translate(96, 200); g.rotate(-Math.PI / 2); g.fillStyle = "#9aa4b2"; g.font = `800 40px ${HEAD}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("HUNTER", 0, 0); g.restore();
        const hs = (x: number, y: number, w: number, h: number, vertical: boolean) => {
          const gr = g.createLinearGradient(x, y, vertical ? x + w : x, vertical ? y : y + h); gr.addColorStop(0, "#4b5463"); gr.addColorStop(1, "#262d38");
          g.fillStyle = gr; g.beginPath(); g.roundRect(x, y, w, h, 8); g.fill();
          g.strokeStyle = "rgba(0,0,0,.45)"; g.lineWidth = 4;
          if (vertical) for (let yy = y + 10; yy < y + h; yy += 14) { g.beginPath(); g.moveTo(x + 6, yy); g.lineTo(x + w - 6, yy); g.stroke(); }
          else for (let xx = x + 10; xx < x + w; xx += 14) { g.beginPath(); g.moveTo(xx, y + 6); g.lineTo(xx, y + h - 6); g.stroke(); }
        };
        hs(280, 22, 370, 92, false); hs(212, 130, 64, 330, true);
        g.fillStyle = "#3b4350"; for (let x = 300; x < 640; x += 40) { g.beginPath(); g.roundRect(x, 122, 28, 28, 4); g.fill(); }
        g.fillStyle = "#23272e"; g.fillRect(330, 170, 220, 220);
        g.strokeStyle = "#a9b2be"; g.lineWidth = 8; g.strokeRect(326, 166, 228, 228);
        g.fillStyle = "#b8923a"; for (let x = 350; x < 532; x += 9) for (let y = 190; y < 372; y += 9) g.fillRect(x, y, 3, 3);
        g.strokeStyle = "#a9b2be"; g.lineWidth = 6; g.beginPath(); g.moveTo(560, 180); g.lineTo(560, 400); g.lineTo(520, 400); g.stroke();
        for (let k = 0; k < 4; k++) {
          const x = 652 + k * 34; g.fillStyle = k % 2 ? "#2b3240" : "#1c222c"; g.fillRect(x, 120, 26, 450);
          g.fillStyle = "#596273"; g.fillRect(x, 110, 26, 14); g.fillRect(x, 566, 26, 14);
        }
        g.fillStyle = "#0e1116"; g.fillRect(795, 250, 36, 230);
        g.fillStyle = "#2a2f38"; for (let y = 260; y < 470; y += 18) { g.fillRect(800, y, 10, 10); g.fillRect(816, y, 10, 10); }
        const m2 = g.createLinearGradient(0, 600, 0, 660); m2.addColorStop(0, "#6b7482"); m2.addColorStop(1, "#353c48");
        g.fillStyle = m2; g.beginPath(); g.roundRect(230, 600, 420, 56, 8); g.fill();
        g.fillStyle = "#c9d1db"; g.font = `700 26px ${api.mono}`; g.textBaseline = "middle"; g.fillText("M.2", 250, 628);
        for (const py of [690, 890]) {
          g.fillStyle = "#1c222c"; g.fillRect(190, py, 570, 32);
          g.strokeStyle = "#a9b2be"; g.lineWidth = 5; g.strokeRect(188, py - 2, 574, 36);
          g.fillStyle = "#596273"; g.fillRect(750, py - 6, 18, 44);
        }
        g.fillStyle = "#1c222c"; g.fillRect(190, 800, 380, 20);
        const cs = g.createLinearGradient(520, 760, 790, 950); cs.addColorStop(0, "#4b5463"); cs.addColorStop(1, "#1f252f");
        g.fillStyle = cs; g.beginPath(); g.roundRect(530, 940, 250, 70, 10); g.fill();
        g.fillStyle = "#3dd09b"; g.fillRect(546, 994, 200, 5);
        g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 6; for (let x = 560; x < 780; x += 26) { g.beginPath(); g.moveTo(x, 946); g.lineTo(x - 20, 1004); g.stroke(); }
        g.fillStyle = "#24303f"; for (let y = 700; y < 920; y += 50) g.fillRect(800, y, 30, 36);
        g.fillStyle = "#c9a227"; for (let k = 0; k < 8; k++) { g.beginPath(); g.arc(60 + k * 20, 960, 8, 0, Math.PI * 2); g.fill(); }
        g.strokeStyle = "rgba(255,255,255,.2)"; g.setLineDash([10, 8]); g.lineWidth = 3; g.beginPath(); g.moveTo(20, 880); g.lineTo(180, 880); g.lineTo(180, 1000); g.stroke(); g.setLineDash([]);
        g.fillStyle = "#c4ccd6"; for (const [sx, sy] of [[20, 20], [820, 20], [20, 500], [820, 500], [20, 1000], [820, 1000], [600, 120], [440, 500]]) { g.beginPath(); g.arc(sx, sy, 10, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = "#2c3340"; for (let k = 0; k < 18; k++) { g.beginPath(); g.arc(rand(290, 620), rand(400, 590), 7, 0, Math.PI * 2); g.fill(); }
      });
      const cpu = mk(170, 170, (g) => {
        g.fillStyle = "#0f5d3a"; g.fillRect(0, 0, 170, 170);
        const ih = g.createLinearGradient(0, 0, 170, 170); ih.addColorStop(0, "#e8edf2"); ih.addColorStop(0.5, "#b9c2cc"); ih.addColorStop(1, "#8d96a2");
        g.fillStyle = ih; g.beginPath(); g.roundRect(14, 14, 142, 142, 10); g.fill();
        g.fillStyle = "#4b5563"; g.font = `800 20px ${HEAD}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("HUNTER", 85, 74); g.font = `700 16px ${api.mono}`; g.fillText("CORE 16", 85, 100);
        g.fillStyle = "#c9a227"; g.beginPath(); g.moveTo(4, 4); g.lineTo(26, 4); g.lineTo(4, 26); g.fill();
      });
      const cooler = mk(320, 400, (g) => {
        for (let k = 0; k < 4; k++) { const x = 70 + k * 56; const cu = g.createLinearGradient(x, 0, x + 26, 0); cu.addColorStop(0, "#9a5a2c"); cu.addColorStop(0.5, "#e8a066"); cu.addColorStop(1, "#8a4e24"); g.fillStyle = cu; g.beginPath(); g.roundRect(x, 0, 26, 70, 13); g.fill(); }
        const fn = g.createLinearGradient(0, 0, 320, 0); fn.addColorStop(0, "#8a94a3"); fn.addColorStop(0.4, "#d6dde6"); fn.addColorStop(1, "#7b8594");
        g.fillStyle = fn; g.fillRect(0, 40, 320, 360);
        g.strokeStyle = "rgba(40,48,60,.45)"; g.lineWidth = 3; for (let y = 48; y < 400; y += 9) { g.beginPath(); g.moveTo(0, y); g.lineTo(320, y); g.stroke(); }
        g.fillStyle = "#151b23"; g.fillRect(0, 36, 320, 30); g.fillStyle = "#3dd09b"; g.fillRect(20, 48, 280, 5);
      });
      const ram = mk(30, 460, (g) => {
        const r = g.createLinearGradient(0, 0, 30, 0); r.addColorStop(0, "#2d3441"); r.addColorStop(0.5, "#3c4555"); r.addColorStop(1, "#1a1f28");
        g.fillStyle = r; g.beginPath(); g.roundRect(0, 26, 30, 434, 4); g.fill();
        g.strokeStyle = "rgba(255,255,255,.18)"; g.lineWidth = 3; for (let y = 90; y < 440; y += 70) { g.beginPath(); g.moveTo(2, y); g.lineTo(28, y - 26); g.stroke(); }
        g.fillStyle = "#dfe6ee"; g.fillRect(0, 0, 30, 28);
      });
      const gpu = mk(1100, 270, (g) => {
        const bk = g.createLinearGradient(0, 0, 40, 0); bk.addColorStop(0, "#7c8593"); bk.addColorStop(0.5, "#cbd2db"); bk.addColorStop(1, "#7c8593");
        g.fillStyle = bk; g.fillRect(0, 10, 40, 250); g.fillStyle = "#1a2029"; for (let y = 40; y < 240; y += 26) g.fillRect(10, y, 20, 12);
        g.fillStyle = "#0e1218"; g.fillRect(40, 0, 1060, 18);
        const bd = g.createLinearGradient(0, 18, 0, 270); bd.addColorStop(0, "#2f3846"); bd.addColorStop(1, "#141a22");
        g.fillStyle = bd; g.beginPath(); g.roundRect(40, 18, 1060, 252, 26); g.fill();
        g.fillStyle = "rgba(255,255,255,.06)";
        g.beginPath(); g.moveTo(60, 30); g.lineTo(400, 30); g.lineTo(330, 140); g.lineTo(60, 140); g.fill();
        g.beginPath(); g.moveTo(720, 260); g.lineTo(1080, 260); g.lineTo(1080, 150); g.lineTo(800, 150); g.fill();
        g.strokeStyle = "rgba(255,255,255,.12)"; g.lineWidth = 4; g.beginPath(); g.moveTo(60, 250); g.lineTo(240, 250); g.lineTo(280, 210); g.stroke();
        for (const fx of [250, 570, 890]) { g.fillStyle = "#06080b"; g.beginPath(); g.arc(fx, 144, 116, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#3a4452"; g.lineWidth = 6; g.stroke(); }
        g.fillStyle = "#9aa4b2"; g.font = `800 26px ${HEAD}`; g.textAlign = "center"; g.fillText("HUNTER GFX", 730, 258);
        g.fillStyle = "#0b0e13"; g.fillRect(960, -2, 80, 22);
      });
      const psu = mk(560, 290, (g) => {
        const pg = g.createLinearGradient(0, 0, 0, 290); pg.addColorStop(0, "#252c37"); pg.addColorStop(1, "#11151b");
        g.fillStyle = pg; g.beginPath(); g.roundRect(0, 0, 560, 290, 14); g.fill();
        g.strokeStyle = "#3a4452"; g.lineWidth = 4; for (let r = 30; r < 130; r += 18) { g.beginPath(); g.arc(400, 145, r, 0, Math.PI * 2); g.stroke(); }
        g.fillStyle = "#1b2028"; g.fillRect(20, 20, 150, 250); g.fillStyle = "#06080b"; for (let k = 0; k < 6; k++) g.fillRect(40, 36 + k * 38, 110, 24);
        g.fillStyle = "#d6b25e"; g.font = `800 34px ${api.mono}`; g.textAlign = "center"; g.fillText("1000W", 400, 135); g.font = `700 20px ${api.mono}`; g.fillText("80+ GOLD", 400, 168);
      });
      const shroud = mk(W - 190, 330, (g) => {
        const sg = g.createLinearGradient(0, 0, 0, 330); sg.addColorStop(0, "#1d2532"); sg.addColorStop(1, "#0e131a");
        g.fillStyle = sg; g.beginPath(); g.roundRect(0, 0, W - 190, 330, 12); g.fill();
        g.fillStyle = "#3b4656"; g.fillRect(0, 0, W - 190, 6);
        g.fillStyle = "#0b0f15"; for (let y = 60; y < 300; y += 34) for (let x = 900; x < W - 230; x += 50) { g.beginPath(); g.roundRect(x, y, 36, 16, 8); g.fill(); }
        g.globalCompositeOperation = "destination-out";
        g.font = `900 92px ${HEAD}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("HUNTERPCBUILDS", 480, 190);
        g.globalCompositeOperation = "source-over";
      });
      const frame = mk(320, 320, (g) => {
        const fg = g.createLinearGradient(0, 0, 320, 320); fg.addColorStop(0, "#1f2631"); fg.addColorStop(1, "#0d1117");
        g.fillStyle = fg; g.beginPath(); g.roundRect(0, 0, 320, 320, 40); g.fill();
        g.globalCompositeOperation = "destination-out"; g.beginPath(); g.arc(160, 160, 142, 0, Math.PI * 2); g.fill(); g.globalCompositeOperation = "source-over";
        g.fillStyle = "#04060a"; g.beginPath(); g.arc(160, 160, 142, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#4b5563"; for (const [x, y] of [[26, 26], [294, 26], [26, 294], [294, 294]]) { g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fill(); }
      });
      const blades = mk(300, 300, (g) => {
        g.translate(150, 150);
        for (let k = 0; k < 7; k++) {
          g.save(); g.rotate((k / 7) * Math.PI * 2);
          const bg = g.createLinearGradient(0, 0, 130, 0); bg.addColorStop(0, "#56606e"); bg.addColorStop(1, "#2b323d");
          g.fillStyle = bg; g.beginPath(); g.moveTo(36, -12); g.bezierCurveTo(80, -50, 128, -30, 134, 10); g.bezierCurveTo(100, 18, 70, 24, 36, 16); g.closePath(); g.fill();
          g.restore();
        }
        g.fillStyle = "#1a2029"; g.beginPath(); g.arc(0, 0, 40, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "#3dd09b"; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 30, 0, Math.PI * 2); g.stroke();
        g.fillStyle = "#9aa4b2"; g.font = `900 30px ${HEAD}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("H", 0, 2);
      });
      spr = { wall, shell, mobo, cpu, cooler, ram, gpu, psu, shroud, frame, blades };
    };
    add({ name: "pcbuild", label: "TAKEOVER · PC Build", side: "pc", dur: D,
      start: () => { if (!spr) build(); sparks = []; seatT.length = 0; },
      draw: (e, dt) => {
        if (!spr) return;
        const S2 = spr;
        const rgbOn = win(e, at(9) + 0.45, at(9) + 1.4);
        const hue = (o: number, l = 60, a = 1) => `hsla(${(e * 110 + o) % 360},100%,${l}%,${a})`;
        const powered = e > at(9) + 0.35, fanSpeed = powered ? Math.min(16, (e - at(9) - 0.35) * 12) : 0;
        ctx.drawImage(S2.wall, 0, 0, FW, FH);
        if (rgbOn > 0) {
          ctx.save(); ctx.globalCompositeOperation = "lighter";
          const sp = ctx.createRadialGradient(X0 + W / 2, Y0 + H / 2, 200, X0 + W / 2, Y0 + H / 2, 1700);
          sp.addColorStop(0, hue(0, 55, 0.22 * rgbOn)); sp.addColorStop(1, hue(0, 55, 0));
          ctx.fillStyle = sp; ctx.fillRect(0, 0, FW, FH);
          ctx.save(); ctx.translate(X0 + W / 2, 2000); ctx.scale(1, 0.1);
          const pool = ctx.createRadialGradient(0, 0, 50, 0, 0, 1300);
          pool.addColorStop(0, hue(140, 55, 0.45 * rgbOn)); pool.addColorStop(1, hue(140, 55, 0));
          ctx.fillStyle = pool; ctx.fillRect(-1300, -1300, 2600, 2600); ctx.restore();
          ctx.restore();
        }
        const cin = easeOut(win(e, 0.2, 1.3));
        ctx.globalAlpha = cin; ctx.drawImage(S2.shell, X0, Y0 + (1 - cin) * 80); ctx.globalAlpha = 1;
        const prog = (i: number) => win(e, at(i), at(i) + 0.95);
        const seat = (i: number, x: number, y: number) => {
          if (seatT[i] !== undefined) return;
          seatT[i] = e;
          for (let k = 0; k < 30; k++) { const a = rand(0, Math.PI * 2), s = rand(200, 650); sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, c: pick([TEAL, CYAN, "255,255,255"]) }); }
        };
        /** Moves a part from (fx, fy) to (tx, ty) with a motion trail, then marks it seated. */
        const fly = (i: number, fx: number, fy: number, tx: number, ty: number, drawAt: (x: number, y: number) => void, delay = 0) => {
          const q = win(e, at(i) + delay, at(i) + delay + 0.95);
          if (q <= 0) return false;
          if (q < 1) for (const lag of [0.12, 0.06]) {
            const t2 = easeOut(Math.max(0, q - lag));
            ctx.globalAlpha = 0.18; drawAt(lerp(fx, tx, t2), lerp(fy, ty, t2)); ctx.globalAlpha = 1;
          }
          const t = easeOut(q);
          drawAt(lerp(fx, tx, t), lerp(fy, ty, t));
          if (q >= 1) seat(i, ANCH[i][0], ANCH[i][1]);
          return true;
        };
        const fan = (cx: number, cy: number, sc: number, ringHue: number) => {
          ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
          ctx.drawImage(S2.frame, -160, -160);
          const a = e * fanSpeed;
          if (fanSpeed > 6) for (const off of [0, 0.12, 0.24]) { ctx.save(); ctx.globalAlpha = off ? 0.35 : 1; ctx.rotate(a - off); ctx.drawImage(S2.blades, -150, -150); ctx.restore(); }
          else { ctx.save(); ctx.rotate(a); ctx.drawImage(S2.blades, -150, -150); ctx.restore(); }
          if (rgbOn > 0) {
            ctx.save(); ctx.globalCompositeOperation = "lighter";
            ctx.strokeStyle = hue(ringHue, 60, 0.25 * rgbOn); ctx.lineWidth = 46; ctx.beginPath(); ctx.arc(0, 0, 146, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = hue(ringHue, 62, rgbOn); ctx.lineWidth = 12; ctx.stroke(); ctx.restore();
          }
          ctx.restore();
        };
        // 1 motherboard
        fly(0, -1100, MY, MX, MY, (x, y) => ctx.drawImage(S2.mobo, x, y));
        // 2 CPU drops into the socket
        fly(1, 1705, -300, 1705, 525, (x, y) => ctx.drawImage(S2.cpu, x, y));
        if (seatT[1] !== undefined && e - seatT[1] < 0.8) { ctx.save(); ctx.globalCompositeOperation = "lighter"; dot(1790, 610, 320, CYAN, 1 - (e - seatT[1]) / 0.8); ctx.restore(); }
        // 3 cooler
        fly(2, 1630, -520, 1630, 400, (x, y) => { ctx.drawImage(S2.cooler, x, y); fan(x + 160, y + 225, 0.95, 60); });
        // 4 RAM, one stick at a time
        for (let k = 0; k < 4; k++) fly(3, MX + 650 + k * 34, -700 - k * 120, MX + 650 + k * 34, MY + 100, (x, y) => {
          ctx.drawImage(S2.ram, x, y);
          if (rgbOn > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = hue(k * 30 + 200, 60, 0.3 * rgbOn); ctx.fillRect(x - 14, y - 14, 58, 56); ctx.fillStyle = hue(k * 30 + 200, 60, rgbOn); ctx.fillRect(x, y, 30, 28); ctx.restore(); }
        }, k * 0.12);
        // 7 front fans slide in
        FANS.forEach(([fx, fy], k) => fly(6, FW + 400, fy, fx, fy, (x, y) => fan(x, y, 0.88, k * 50 + 180), k * 0.15));
        // 5 graphics card slides in, with a bump when it clicks in
        const gq = prog(4);
        const shake = seatT[4] !== undefined && e - seatT[4] < 0.3 ? Math.sin((e - seatT[4]) * 80) * 6 * (1 - (e - seatT[4]) / 0.3) : 0;
        fly(4, FW + 300, 1000, X0 + 40, 1000 + shake, (x, y) => {
          ctx.drawImage(S2.gpu, x, y);
          for (const fx of [250, 570, 890]) { ctx.save(); ctx.translate(x + fx, y + 144); ctx.scale(0.76, 0.76); ctx.rotate(e * fanSpeed * (gq >= 1 ? 1 : 0)); ctx.drawImage(S2.blades, -150, -150); ctx.restore(); }
          if (rgbOn > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; const lg = ctx.createLinearGradient(x + 40, 0, x + 1100, 0); for (let k = 0; k <= 4; k++) lg.addColorStop(k / 4, hue(k * 70 + 100, 60, rgbOn)); ctx.fillStyle = lg; ctx.globalAlpha = 0.3; ctx.fillRect(x + 40, y - 14, 1060, 44); ctx.globalAlpha = 1; ctx.fillRect(x + 40, y + 2, 1060, 12); ctx.restore(); }
        });
        // 6 power supply, then the shroud covers it (a window shows the name)
        fly(5, -700, 1600, X0 + 80, 1600, (x, y) => ctx.drawImage(S2.psu, x, y));
        const sq = easeOut(win(e, at(5) + 0.7, at(5) + 1.4));
        if (sq > 0) {
          const sy = lerp(FH + 100, Y0 + H - 380, sq);
          ctx.save(); ctx.globalCompositeOperation = "lighter";
          if (rgbOn > 0) { const lg = ctx.createLinearGradient(X0 + 100, 0, X0 + 1050, 0); for (let k = 0; k <= 4; k++) lg.addColorStop(k / 4, hue(k * 60 + 300, 55, rgbOn)); ctx.fillStyle = lg; ctx.fillRect(X0 + 80, sy + 120, 1000, 150); }
          else { ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "#0a0e14"; ctx.fillRect(X0 + 80, sy + 110, 1000, 170); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(61,208,155,.1)"; ctx.fillRect(X0 + 80, sy + 110, 1000, 170); }
          ctx.restore();
          ctx.drawImage(S2.shroud, X0 + 50, sy);
        }
        // 8 sleeved cables route themselves
        const cq = win(e, at(7), at(7) + 1.1);
        if (cq > 0) {
          const bundle = (p0: number[], p1: number[], p2: number[], p3: number[], n: number, cols: string[]) => {
            ctx.save(); ctx.lineCap = "round"; ctx.setLineDash([2600 * cq, 4000]);
            for (let k = 0; k < n; k++) {
              const o = (k - (n - 1) / 2) * 11;
              ctx.strokeStyle = cols[k % cols.length]; ctx.lineWidth = 10;
              ctx.beginPath(); ctx.moveTo(p0[0] + o, p0[1]); ctx.bezierCurveTo(p1[0] + o, p1[1], p2[0] + o, p2[1], p3[0] + o, p3[1]); ctx.stroke();
            }
            ctx.restore();
          };
          bundle([2240, 560], [2240, 470], [2200, 420], [2165, 420], 8, ["#e5e7eb", "#1f2937"]);
          bundle([2240, 860], [2240, 980], [2060, 940], [2180, 1000], 6, ["#3dd09b", "#0f172a"]);
          bundle([1420, 240], [1420, 290], [1440, 300], [1440, 345], 4, ["#e5e7eb", "#1f2937"]);
          if (cq >= 1) seat(7, ANCH[7][0], ANCH[7][1]);
        }
        // 9 tempered glass slides over
        const glq = easeOut(prog(8));
        if (glq > 0) {
          const gx = lerp(FW + 100, X0 + 40, glq);
          ctx.save(); ctx.beginPath(); ctx.roundRect(gx, Y0 + 80, W - 170, H - 120, 24); ctx.clip();
          ctx.fillStyle = "rgba(150,200,235,.07)"; ctx.fillRect(gx, Y0 + 80, W, H);
          const rf = ctx.createLinearGradient(gx, Y0, gx + 900, Y0 + 900);
          rf.addColorStop(0, "rgba(255,255,255,0)"); rf.addColorStop(0.45, "rgba(255,255,255,0)"); rf.addColorStop(0.5, "rgba(255,255,255,.12)"); rf.addColorStop(0.58, "rgba(255,255,255,0)"); rf.addColorStop(0.7, "rgba(255,255,255,.06)"); rf.addColorStop(0.74, "rgba(255,255,255,0)");
          ctx.fillStyle = rf; ctx.fillRect(gx, Y0, W, H); ctx.restore();
          ctx.strokeStyle = "rgba(200,230,255,.25)"; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(gx, Y0 + 80, W - 170, H - 120, 24); ctx.stroke();
          if (glq >= 1) seat(8, ANCH[8][0], ANCH[8][1]);
        }
        // 10 power on
        const pb = win(e, at(9), at(9) + 0.5);
        if (pb > 0) {
          ctx.save(); ctx.globalCompositeOperation = "lighter"; dot(X0 + W - 98, Y0 + 11, 60 + (pb < 1 ? Math.sin(pb * Math.PI * 4) * 20 : 0), powered ? TEAL : CYAN, 1); ctx.restore();
          if (pb >= 1) seat(9, ANCH[9][0], ANCH[9][1]);
        }
        if (powered && e < at(9) + 0.9) fillAll(`rgba(255,255,255,${0.35 * (1 - (e - at(9) - 0.35) / 0.55)})`);
        // sparks and click rings when a part seats
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        for (let i = sparks.length - 1; i >= 0; i--) {
          const p = sparks[i]; p.life += dt; p.vx *= 0.94; p.vy = p.vy * 0.94 + 400 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.life > 0.7) { sparks.splice(i, 1); continue; }
          dot(p.x, p.y, 16, p.c, 1 - p.life / 0.7);
        }
        seatT.forEach((t0, i) => {
          if (t0 === undefined || e - t0 > 0.5) return;
          const q = (e - t0) / 0.5; ctx.strokeStyle = `rgba(${CYAN},${1 - q})`; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.arc(ANCH[i][0], ANCH[i][1], 20 + q * 110, 0, Math.PI * 2); ctx.stroke();
        });
        ctx.restore();
        // build log on the left
        const hudA = cin * (1 - 0.55 * rgbOn);
        ctx.save(); ctx.globalAlpha = hudA;
        ctx.fillStyle = "rgba(8,13,20,.85)"; ctx.strokeStyle = "rgba(56,189,248,.35)"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.roundRect(110, 170, 920, 1260, 24); ctx.fill(); ctx.stroke();
        ctx.textBaseline = "middle"; ctx.textAlign = "left";
        ctx.fillStyle = `rgb(${CYAN})`; ctx.font = `800 64px ${HEAD}`; ctx.fillText("BUILD LOG", 170, 260);
        ctx.fillStyle = "#64748b"; ctx.font = `600 38px ${api.mono}`; ctx.fillText("job #2026 · HunterPCBuilds", 170, 330);
        const cur = Math.max(-1, Math.min(9, Math.floor((e - at(0)) / 1.5)));
        STEPS.forEach(([name], i) => {
          const y = 430 + i * 92, done = seatT[i] !== undefined, now = i === cur && !done;
          ctx.font = `700 46px ${api.mono}`;
          ctx.fillStyle = done ? `rgb(${TEAL})` : now ? `rgb(${CYAN})` : "#334155";
          ctx.fillText(done ? "✓" : now ? (e % 0.6 < 0.35 ? "▶" : " ") : "•", 170, y);
          ctx.fillStyle = done ? "#cbd5e1" : now ? "#ffffff" : "#475569"; ctx.fillText(name, 240, y);
          if (now) { const q = clamp01((e - at(i)) / 0.95); ctx.fillStyle = "#1e293b"; ctx.fillRect(240, y + 32, 700, 8); ctx.fillStyle = `rgb(${CYAN})`; ctx.fillRect(240, y + 32, 700 * q, 8); }
        });
        const doneN = seatT.filter((v) => v !== undefined).length;
        ctx.fillStyle = "#1e293b"; ctx.beginPath(); ctx.roundRect(170, 1360, 800, 22, 11); ctx.fill();
        ctx.fillStyle = `rgb(${TEAL})`; ctx.beginPath(); ctx.roundRect(170, 1360, 800 * (doneN / 10), 22, 11); ctx.fill();
        ctx.restore();
        // spec callouts on the right
        const calA = 1 - rgbOn;
        if (calA > 0) STEPS.forEach(([, spec], i) => {
          const t0 = seatT[i]; if (t0 === undefined || i === 9) return;
          const q = clamp01((e - t0) / 0.35), bx = 2800, by = 230 + i * 150;
          ctx.save(); ctx.globalAlpha = calA * q;
          ctx.strokeStyle = "rgba(56,189,248,.45)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ANCH[i][0], ANCH[i][1]); ctx.lineTo(bx - 60, by + 50); ctx.lineTo(bx, by + 50); ctx.stroke();
          ctx.fillStyle = `rgb(${CYAN})`; ctx.beginPath(); ctx.arc(ANCH[i][0], ANCH[i][1], 9, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "rgba(8,13,20,.88)"; ctx.strokeStyle = "rgba(61,208,155,.5)"; ctx.beginPath(); ctx.roundRect(bx + lerp(40, 0, q), by, 900, 100, 14); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#e2e8f0"; ctx.font = `700 44px ${api.mono}`; ctx.textBaseline = "middle"; ctx.fillText(spec, bx + 34 + lerp(40, 0, q), by + 50);
          ctx.fillStyle = `rgb(${TEAL})`; ctx.fillText("✓", bx + 840 + lerp(40, 0, q), by + 50);
          ctx.restore();
        });
        // finished: the logo
        if (rgbOn > 0) {
          logo("pc", 3290, 780, lerp(300, 760, backOut(rgbOn)), 0, rgbOn, `rgba(${TEAL},.6)`);
          title("BUILD COMPLETE", 3290, 1320, 120, "#ffffff", win(e, at(9) + 1.1, at(9) + 1.7), HEAD, 900);
          title("built by HunterPCBuilds", 3290, 1450, 66, `rgb(${CYAN})`, win(e, at(9) + 1.4, at(9) + 2), api.mono, 700);
        }
        vignette(ctx, 0.4);
      } });
  }

  // ---- 9. Hacker Mode: code rain, a terminal breaks in, the characters spell the name ----
  {
    const D = 17, COLS = 96;
    const chars = "0123456789ABCDEF<>/{}#$=+*;:";
    let targets: [number, number][] = [];
    let flyers: { x: number; y: number; ch: string }[] = [];
    const cmds = ["> ssh hunter@hunterpcbuilds", "> password: ********", "> ACCESS GRANTED", "> run showcase.exe", "> loading [██████████] done"];
    add({ name: "hacker", label: "TAKEOVER · Hacker Mode", side: "pc", dur: D,
      start: () => {
        targets = samplePoints((g, w, h) => { g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = `900 ${h * 0.2}px ${HEAD}`; g.fillText("HUNTER", w / 2, h * 0.36); g.font = `900 ${h * 0.15}px ${HEAD}`; g.fillText("PC BUILDS", w / 2, h * 0.6); }, 1800);
        flyers = targets.map(() => ({ x: rand(0, FW), y: rand(0, FH), ch: pick(chars.split("")) }));
      },
      draw: (e, dt) => {
        fillAll("#020604");
        const form = win(e, 10, 12), unform = win(e, 14.5, 15.8);
        ctx.font = `700 40px ${api.mono}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const rainA = 1 - form * 0.75 + unform * 0.75;
        for (let c = 0; c < COLS; c++) {
          const x = c * (FW / COLS) + 20, speed = 500 + hash(c) * 700, head = ((e * speed + hash(c + 9) * 3000) % (FH + 900)) - 300;
          for (let k = 0; k < 20; k++) {
            const y = head - k * 44; if (y < -40 || y > FH + 40) continue;
            const a = (1 - k / 20) * rainA;
            ctx.fillStyle = k === 0 ? `rgba(220,255,235,${a})` : `rgba(${TEAL},${a * 0.75})`;
            ctx.fillText(chars[Math.floor(hash(c * 13 + k * 7 + Math.floor(e * 9)) * chars.length)], x, y);
          }
        }
        // terminal window
        const tw = win(e, 2.5, 3.1) * (1 - win(e, 9.2, 9.8));
        if (tw > 0) {
          ctx.save(); ctx.globalAlpha = tw; const w = 1900, h = 820, x = CX - w / 2, y = CY - h / 2;
          ctx.fillStyle = "rgba(3,10,8,.94)"; ctx.strokeStyle = `rgb(${TEAL})`; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.roundRect(x, y, w, h, 28); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#13261f"; ctx.fillRect(x + 3, y + 3, w - 6, 90);
          ["#ef4444", "#f59e0b", "#22c55e"].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + 70 + i * 60, y + 48, 18, 0, Math.PI * 2); ctx.fill(); });
          ctx.font = `700 64px ${api.mono}`; ctx.textAlign = "left"; ctx.textBaseline = "top";
          let tt = e - 3.2;
          cmds.forEach((c, i) => {
            const n = Math.max(0, Math.min(c.length, Math.floor(tt * 34))); tt -= c.length / 34 + 0.3;
            if (n <= 0) return;
            ctx.fillStyle = c.includes("GRANTED") ? "#22c55e" : `rgb(${TEAL})`;
            ctx.fillText(c.slice(0, n), x + 80, y + 150 + i * 120);
          });
          ctx.restore();
        }
        // the characters fly into the name
        if (form > 0) {
          ctx.font = `700 26px ${api.mono}`;
          flyers.forEach((f, i) => {
            const [tx, ty] = targets[i];
            const k = unform > 0 ? 0 : Math.min(1, dt * (2 + form * 8));
            f.x = lerp(f.x, tx, k); f.y = lerp(f.y, ty, k);
            if (unform > 0) f.y += 1400 * unform * dt * (1 + hash(i) * 2);
            if (Math.random() < 0.04) f.ch = pick(chars.split(""));
            ctx.fillStyle = `rgba(${hash(i) > 0.7 ? CYAN : TEAL},${form * (1 - unform)})`;
            ctx.fillText(f.ch, f.x, f.y);
          });
        }
      } });
  }

  // ---- 10. Hyperdrive: warp through a tunnel of circuits, the logo arrives ----
  {
    let stars: { x: number; y: number; z: number }[] = [];
    const D = 15;
    add({ name: "hyperdrive", label: "TAKEOVER · Hyperdrive", side: "pc", dur: D,
      start: () => { stars = Array.from({ length: 700 }, () => ({ x: rand(-1, 1), y: rand(-1, 1), z: rand(0.05, 1) })); },
      draw: (e, dt) => {
        fillAll("#02040a");
        const speed = lerp(0.15, 2.4, ease(win(e, 1, 7.5))) * (1 - 0.92 * win(e, 9, 10));
        ctx.lineCap = "round";
        for (const s of stars) {
          const z0 = s.z; s.z -= speed * dt * 0.6;
          if (s.z <= 0.02) { s.z = 1; s.x = rand(-1, 1); s.y = rand(-1, 1); continue; }
          const px = CX + (s.x / s.z) * 900, py = CY + (s.y / s.z) * 900, ox = CX + (s.x / z0) * 900, oy = CY + (s.y / z0) * 900;
          const a = clamp01(1.2 - s.z);
          ctx.strokeStyle = `rgba(${s.x > 0 ? CYAN : "220,240,255"},${a})`; ctx.lineWidth = 2 + (1 - s.z) * 6;
          ctx.beginPath(); ctx.moveTo(ox - (px - ox) * speed * 3, oy - (py - oy) * speed * 3); ctx.lineTo(px, py); ctx.stroke();
        }
        // tunnel of circuit rings
        const tunnel = win(e, 2, 3) * (1 - win(e, 8.6, 9.3));
        if (tunnel > 0) {
          for (let k = 0; k < 10; k++) {
            const z = 1 - ((e * speed * 0.45 + k / 10) % 1), sc = 260 / Math.max(0.05, z);
            if (sc > 4200) continue;
            const a = tunnel * clamp01((1 - z) * 2) * clamp01((4200 - sc) / 1200);
            ctx.strokeStyle = `rgba(${k % 2 ? TEAL : CYAN},${a * 0.8})`; ctx.lineWidth = Math.max(2, sc / 120);
            ctx.beginPath();
            for (let s = 0; s <= 8; s++) { const an = (s / 8) * Math.PI * 2 + k * 0.2; ctx.lineTo(CX + Math.cos(an) * sc * 1.4, CY + Math.sin(an) * sc); }
            ctx.stroke();
            for (let s = 0; s < 8; s++) { const an = (s / 8) * Math.PI * 2 + k * 0.2; dot(CX + Math.cos(an) * sc * 1.4, CY + Math.sin(an) * sc, sc / 18, TEAL, a); }
          }
        }
        const fl = win(e, 9, 9.6);
        if (fl > 0 && fl < 1) fillAll(`rgba(220,250,255,${Math.sin(fl * Math.PI)})`);
        const arr = win(e, 9.3, 10.8);
        if (arr > 0) {
          ctx.save(); ctx.translate(CX, CY - 120); ctx.rotate(e * 0.15); ctx.globalCompositeOperation = "lighter";
          for (let k = 0; k < 16; k++) { ctx.rotate((Math.PI * 2) / 16); const g = ctx.createLinearGradient(0, 0, 1800, 0); g.addColorStop(0, `rgba(${TEAL},${0.18 * arr})`); g.addColorStop(1, `rgba(${TEAL},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1800, -90); ctx.lineTo(1800, 90); ctx.fill(); }
          ctx.restore();
          logo("pc", CX, CY - 120, lerp(60, 1000, easeOut(arr)), (1 - easeOut(arr)) * Math.PI * 4, 1, `rgba(${TEAL},.7)`);
          title("HUNTERPCBUILDS", CX, CY + 540, 150, "#ffffff", win(e, 10.6, 11.2), HEAD, 900);
          title("custom PCs · repairs · Hanover, PA", CX, CY + 680, 70, `rgb(${CYAN})`, win(e, 11, 11.6), api.mono, 700);
        }
      } });
  }

  return list;
}

// ---------- the flood across the screen, shared by every takeover ----------
/** Draws a takeover with its side flooding over the dividing line, and fades it out at the end. */
export function playTakeover(ctx: CanvasRenderingContext2D, t: Takeover, e: number, dt: number) {
  const grow = ease(clamp01((e - 0.15) / 1.5));
  const fadeIn = clamp01(e / 0.3), fadeOut = clamp01((t.dur - e) / 1.1);
  const edge: [number, number][] = [];
  for (let y = -40; y <= FH + 40; y += 40) {
    const base = seamX(y), wob = t.side === "lawn" ? Math.sin(y * 0.02 + e * 8) * 40 : (Math.floor(y / 120) % 2 ? 60 : -40) * (1 - grow);
    edge.push([t.side === "lawn" ? base + grow * 2300 + wob : base - grow * 2300 + wob, y]);
  }
  const mask = new Path2D();
  if (t.side === "lawn") { mask.moveTo(-10, -50); edge.forEach(([x, y]) => mask.lineTo(x, y)); mask.lineTo(-10, FH + 50); }
  else { mask.moveTo(FW + 10, -50); edge.forEach(([x, y]) => mask.lineTo(x, y)); mask.lineTo(FW + 10, FH + 50); }
  mask.closePath();
  ctx.save();
  ctx.clip(mask);
  ctx.save(); t.draw(e, dt); ctx.restore();
  const a = Math.min(fadeIn, fadeOut);
  if (a < 1) { ctx.globalCompositeOperation = "destination-in"; ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, FW, FH); }
  ctx.restore();
  // a glowing front on the flood while it's still moving
  if (grow > 0 && grow < 1) {
    const col = t.side === "lawn" ? GREEN : CYAN;
    ctx.save(); ctx.strokeStyle = `rgba(${col},${1 - grow})`; ctx.lineWidth = 16; ctx.shadowColor = `rgba(${col},1)`; ctx.shadowBlur = 40;
    ctx.beginPath(); edge.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore();
  }
}

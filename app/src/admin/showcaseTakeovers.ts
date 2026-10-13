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
const mix = (a: string, b: string, t: number) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], clamp01(t)))).join(",")})`; };
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
  const vgrad = (stops: [number, string][], y0 = 0, y1 = FH) => { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };

  const list: Takeover[] = [];
  const add = (t: Takeover) => list.push(t);

  // =====================================================================
  // HANOVER LAWN CO
  // =====================================================================

  // ---- 1. Four Seasons: spring → summer → fall → winter in one landscape ----
  {
    type Br = { x0: number; y0: number; x1: number; y1: number; w: number; tip: boolean };
    const branches: Br[] = [];
    const grow = (x: number, y: number, ang: number, len: number, w: number, depth: number) => {
      const x1 = x + Math.cos(ang) * len, y1 = y + Math.sin(ang) * len;
      branches.push({ x0: x, y0: y, x1, y1, w, tip: depth === 0 });
      if (depth > 0) for (const d of [-0.42, 0.38]) grow(x1, y1, ang + d + rand(-0.12, 0.12), len * rand(0.68, 0.8), w * 0.68, depth - 1);
    };
    const TX = 1250, TY = 1720;
    let parts: { x: number; y: number; vx: number; vy: number; r: number; rot: number; spin: number; kind: number }[] = [];
    const seasons = [
      { name: "SPRING", skyT: "#7cc8ff", skyB: "#e6f6ff", h1: "#7fcf6a", h2: "#5db35a", h3: "#3e8f45", canopy: ["#f6b3cf", "#f9d0e0", "#8fd18a"] },
      { name: "SUMMER", skyT: "#3d9bff", skyB: "#bfe4ff", h1: "#5fb84e", h2: "#45a043", h3: "#2f7e37", canopy: ["#3d8a45", "#4fa152", "#2f7e37"] },
      { name: "FALL", skyT: "#ff8f52", skyB: "#ffd7a1", h1: "#c99a3c", h2: "#a8762e", h3: "#7d5a2a", canopy: ["#d67828", "#e8a032", "#be5028"] },
      { name: "WINTER", skyT: "#22345a", skyB: "#7c93b8", h1: "#f2f6fb", h2: "#dfe8f3", h3: "#c9d6e6", canopy: ["#ffffff", "#e9f1fa", "#ffffff"] },
    ];
    const D = 21;
    add({ name: "seasons", label: "TAKEOVER · Four Seasons", side: "lawn", dur: D,
      start: () => { branches.length = 0; grow(TX, TY, -Math.PI / 2, 380, 70, 6); parts = []; },
      draw: (e, dt) => {
        const s = clamp01((e - 1.4) / (D - 6)) * 3.999, si = Math.floor(s), f = ease(clamp01((s - si - 0.7) / 0.3));
        const A = seasons[si], B = seasons[Math.min(3, si + 1)];
        const c = (k: "skyT" | "skyB" | "h1" | "h2" | "h3") => mix(A[k], B[k], f);
        fillAll(vgrad([[0, c("skyT")], [1, c("skyB")]]));
        // sun (spring to fall) arcs over, the moon in winter
        const arc = clamp01(s / 3), sx = lerp(400, 3500, arc), sy = 900 - Math.sin(arc * Math.PI) * 650;
        const sunA = clamp01(3.2 - s);
        ctx.save(); ctx.globalAlpha = sunA; ctx.shadowColor = "rgba(255,230,140,1)"; ctx.shadowBlur = 120;
        ctx.fillStyle = si === 2 ? "#ffcf6e" : "#fff2a8"; ctx.beginPath(); ctx.arc(sx, sy, 130, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        if (s > 3) {
          ctx.save(); ctx.globalAlpha = clamp01((s - 3) * 2); ctx.shadowColor = "rgba(255,250,220,.9)"; ctx.shadowBlur = 60;
          ctx.fillStyle = "#fffbe8"; ctx.beginPath(); ctx.arc(3100, 380, 110, 0, Math.PI * 2); ctx.fill(); ctx.restore();
          for (let k = 0; k < 60; k++) dot(hash(k) * FW, hash(k + 9) * 800, 8, "255,255,240", clamp01((s - 3) * 2) * (0.5 + 0.5 * Math.sin(e * 2 + k)));
        }
        // rolling hills
        const hill = (base: number, amp: number, freq: number, ph: number, col: string) => {
          ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, FH);
          for (let x = 0; x <= FW; x += 40) ctx.lineTo(x, base + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 2.3 + ph * 2) * amp * 0.35);
          ctx.lineTo(FW, FH); ctx.fill();
        };
        hill(1250, 110, 0.0011, 1, c("h3")); hill(1450, 90, 0.0016, 3, c("h2")); hill(1700, 60, 0.0021, 5, c("h1"));
        // the tree
        ctx.lineCap = "round"; ctx.strokeStyle = si === 3 ? "#5a4636" : "#6b4a2f";
        for (const b of branches) { ctx.lineWidth = b.w; ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y1); ctx.stroke(); }
        const fullness = si === 3 ? 0 : si === 2 ? 1 - clamp01((s - 2.3) / 0.6) : 1;
        if (si === 3 || s > 2.95) {
          ctx.strokeStyle = "rgba(255,255,255,.95)";
          for (const b of branches) if (b.w < 30) { ctx.lineWidth = b.w * 0.45; ctx.beginPath(); ctx.moveTo(b.x0, b.y0 - b.w * 0.3); ctx.lineTo(b.x1, b.y1 - b.w * 0.3); ctx.stroke(); }
        }
        branches.forEach((b, i) => {
          if (!b.tip || hash(i) > fullness) return;
          const cols = f > 0.5 ? B.canopy : A.canopy;
          ctx.fillStyle = cols[i % 3]; ctx.beginPath(); ctx.arc(b.x1 + Math.sin(e + i) * 4, b.y1, 46 + hash(i + 3) * 30, 0, Math.PI * 2); ctx.fill();
        });
        // what's in the air each season
        const want = 90;
        while (parts.length < want) parts.push({ x: rand(-100, FW), y: rand(-200, -20), vx: rand(-40, 120), vy: rand(60, 180), r: rand(10, 22), rot: rand(0, 6), spin: rand(-3, 3), kind: si });
        parts.forEach((q) => {
          const old = q.kind !== si;
          q.x += (q.vx + Math.sin(e + q.rot) * 60) * dt; q.y += q.vy * dt * (q.kind === 3 ? 0.9 : 1) * (old ? 3 : 1); q.rot += q.spin * dt;
          if (q.y > FH + 40) Object.assign(q, { x: rand(-100, FW), y: rand(-200, -20), kind: si });
          ctx.globalAlpha = old ? 0.5 : 1;
          if (q.kind === 0) { ctx.fillStyle = "rgba(249,200,222,.95)"; ctx.beginPath(); ctx.ellipse(q.x, q.y, q.r, q.r * 0.6, q.rot, 0, Math.PI * 2); ctx.fill(); }
          else if (q.kind === 1) dot(q.x, q.y, q.r * 1.6, "255,250,190", 0.6 + 0.4 * Math.sin(e * 3 + q.rot));
          else if (q.kind === 2) leaf(q.x, q.y, q.r * 1.6, q.rot, q.rot * 2, LEAF_COLORS[Math.floor(hash(q.r) * 5)]);
          else { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * 0.5, 0, Math.PI * 2); ctx.fill(); }
          ctx.globalAlpha = 1;
        });
        // season name, then the finish
        const local = s - si, nameA = clamp01(local / 0.15) * clamp01((0.85 - local) / 0.15);
        title(A.name, 2750, 560, 260, "#ffffff", e < D - 4.5 ? nameA : 0, HEAD, 900);
        const end = win(e, D - 4.4, D - 3.4);
        logo("lawn", 2750, 820, lerp(200, 760, backOut(end)), 0, end);
        title("All Year Long.", 2750, 1340, 170, "#ffffff", win(e, D - 3.8, D - 3));
      } });
  }

  // ---- 2. The Big Mow: top-down, a mower stripes the whole lawn ----
  {
    const ROWS = 6, RH = FH / ROWS;
    let rough: HTMLCanvasElement | null = null, cut: HTMLCanvasElement | null = null;
    let clips: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
    const makeLawns = () => {
      const w = FW / 2, h = FH / 2;
      rough = document.createElement("canvas"); rough.width = w; rough.height = h;
      const g = rough.getContext("2d")!;
      g.fillStyle = "#2f5f2c"; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 26000; k++) {
        const x = Math.random() * w, y = Math.random() * h, l = rand(8, 22);
        g.strokeStyle = pick(["#24502a", "#3c7436", "#2a5a2c", "#4a8440", "#1f4422"]); g.lineWidth = rand(1.5, 3);
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + rand(-6, 6), y - l); g.stroke();
      }
      for (let k = 0; k < 140; k++) { g.fillStyle = pick(["#f2e15a", "#fff", "#f2e15a"]); g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 4, 0, Math.PI * 2); g.fill(); }
      cut = document.createElement("canvas"); cut.width = w; cut.height = h;
      const c2 = cut.getContext("2d")!;
      for (let r = 0; r < ROWS; r++) { c2.fillStyle = r % 2 ? "#4f9a46" : "#66b35a"; c2.fillRect(0, (r * h) / ROWS, w, h / ROWS); }
      for (let k = 0; k < 9000; k++) {
        const x = Math.random() * w, y = Math.random() * h, r = Math.floor(y / (h / ROWS));
        c2.strokeStyle = r % 2 ? "rgba(40,90,40,.35)" : "rgba(140,210,120,.35)"; c2.lineWidth = 1.2;
        c2.beginPath(); c2.moveTo(x, y); c2.lineTo(x + (r % 2 ? -7 : 7), y); c2.stroke();
      }
    };
    const D = 18, M0 = 1.5, M1 = D - 5.2;
    add({ name: "bigmow", label: "TAKEOVER · The Big Mow", side: "lawn", dur: D,
      start: () => { if (!rough) makeLawns(); clips = []; },
      draw: (e, dt) => {
        if (!rough || !cut) return;
        ctx.drawImage(rough, 0, 0, FW, FH);
        const prog = clamp01((e - M0) / (M1 - M0)) * ROWS, row = Math.min(ROWS - 1, Math.floor(prog)), along = prog - row;
        const dir = row % 2 ? -1 : 1, mx = dir > 0 ? lerp(-200, FW + 200, along) : lerp(FW + 200, -200, along), my = row * RH + RH / 2;
        // reveal the cut stripes behind the mower
        ctx.save(); ctx.beginPath();
        ctx.rect(0, 0, FW, row * RH);
        if (prog < ROWS) { if (dir > 0) ctx.rect(0, row * RH, Math.max(0, mx), RH); else ctx.rect(mx, row * RH, FW - mx, RH); }
        else ctx.rect(0, 0, FW, FH);
        ctx.clip(); ctx.drawImage(cut, 0, 0, FW, FH); ctx.restore();
        if (prog < ROWS) {
          for (let k = 0; k < 4; k++) clips.push({ x: mx - dir * 120, y: my + rand(-90, 90), vx: -dir * rand(200, 600), vy: rand(-200, 200), life: 0 });
          ctx.save(); ctx.translate(mx, my); ctx.scale(dir, 1);
          ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.roundRect(-130, -125, 280, 270, 40); ctx.fill();
          ctx.fillStyle = "#8fd18a"; ctx.beginPath(); ctx.roundRect(-140, -130, 280, 260, 40); ctx.fill();
          ctx.fillStyle = "#1a3d1f"; ctx.beginPath(); ctx.arc(10, 0, 90, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "#8fd18a"; ctx.lineWidth = 12;
          for (let k = 0; k < 3; k++) { const a = e * 40 + (k * Math.PI * 2) / 3; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(10 + Math.cos(a) * 80, Math.sin(a) * 80); ctx.stroke(); }
          ctx.fillStyle = "#2b2b2b"; for (const [wx, wy] of [[-120, -140], [100, -140], [-120, 115], [100, 115]]) ctx.fillRect(wx, wy, 50, 25);
          ctx.strokeStyle = "#d0d6da"; ctx.lineWidth = 16; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(-140, -90); ctx.lineTo(-330, -110); ctx.moveTo(-140, 90); ctx.lineTo(-330, 110); ctx.moveTo(-330, -120); ctx.lineTo(-330, 120); ctx.stroke();
          ctx.restore();
        }
        ctx.fillStyle = "#7cc96c";
        for (let i = clips.length - 1; i >= 0; i--) { const q = clips[i]; q.life += dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.life > 0.7) { clips.splice(i, 1); continue; } ctx.globalAlpha = 1 - q.life / 0.7; ctx.fillRect(q.x, q.y, 10, 5); }
        ctx.globalAlpha = 1;
        // finished: a shine sweeps the stripes, then the logo stamps down
        const sh = win(e, M1, M1 + 1.2);
        if (sh > 0 && sh < 1) {
          const x = lerp(-600, FW + 600, sh), g = ctx.createLinearGradient(x - 400, 0, x + 400, 0);
          g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,.35)"); g.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = g; ctx.fillRect(x - 400, 0, 800, FH);
        }
        const st = win(e, M1 + 0.6, M1 + 1.3);
        if (st > 0) {
          const size = lerp(1700, 900, easeOut(st));
          if (st < 1) { ctx.strokeStyle = `rgba(255,255,255,${1 - st})`; ctx.lineWidth = 20; ctx.beginPath(); ctx.arc(CX, CY - 120, 450 + st * 400, 0, Math.PI * 2); ctx.stroke(); }
          logo("lawn", CX, CY - 120, size, 0, st, "rgba(0,0,0,.6)");
          title("Your Yard, Handled.", CX, CY + 520, 170, "#ffffff", win(e, M1 + 1.2, M1 + 1.8));
        }
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

  // ---- 4. Snow Day: a blizzard buries the screen, a snow blower clears it ----
  {
    let flakes: { x: number; y: number; r: number; v: number }[] = [];
    let plume: { x: number; y: number; vx: number; vy: number; r: number; life: number }[] = [];
    const D = 18, B0 = 7.5, B1 = 12.5;
    const snowTop = (x: number, depth: number) => FH - depth - Math.sin(x * 0.004) * 40 - Math.sin(x * 0.011 + 2) * 18;
    add({ name: "snowday", label: "TAKEOVER · Snow Day", side: "lawn", dur: D,
      start: () => { flakes = Array.from({ length: 700 }, () => ({ x: rand(0, FW + 800), y: rand(-FH, FH), r: rand(4, 13), v: rand(500, 1000) })); plume = []; },
      draw: (e, dt) => {
        const storm = clamp01(e / 2) * (1 - win(e, B1, B1 + 1.5));
        fillAll(vgrad([[0, mix("#5f7fae", "#20304e", storm)], [1, mix("#cfe0f2", "#8094b3", storm)]]));
        // after the storm, the sun comes out
        const sun = win(e, B1, B1 + 1.5);
        if (sun > 0) { ctx.save(); ctx.globalAlpha = sun; ctx.shadowColor = "rgba(255,240,170,1)"; ctx.shadowBlur = 140; ctx.fillStyle = "#fff4b8"; ctx.beginPath(); ctx.arc(3200, 420, 150, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
        // a house to shovel out
        ctx.fillStyle = "#3a2f2a"; ctx.fillRect(2600, 980, 900, 700);
        ctx.fillStyle = "#5a2e2a"; ctx.beginPath(); ctx.moveTo(2520, 1000); ctx.lineTo(3050, 640); ctx.lineTo(3580, 1000); ctx.fill();
        ctx.fillStyle = "#f6f9fd"; ctx.beginPath(); ctx.moveTo(2500, 1010); ctx.lineTo(3050, 620); ctx.lineTo(3600, 1010); ctx.lineTo(3600, 980); ctx.lineTo(3050, 660); ctx.lineTo(2500, 980); ctx.fill();
        ctx.fillStyle = `rgba(255,214,120,${0.6 + 0.4 * storm})`; ctx.fillRect(2720, 1120, 180, 160); ctx.fillRect(3200, 1120, 180, 160);
        ctx.fillStyle = "#2a201c"; ctx.fillRect(2980, 1330, 150, 350);
        // snow piles up, then the blower carves a driveway through it
        const depth = lerp(0, 560, ease(win(e, 0.8, B0)));
        const bx = lerp(-500, FW + 500, win(e, B0, B1));
        ctx.fillStyle = "#4a4f57"; ctx.fillRect(0, FH - 330, FW, 330);                       // the driveway under the snow
        ctx.fillStyle = "#f4f8fc";
        ctx.beginPath(); ctx.moveTo(bx, FH);
        for (let x = Math.max(0, bx); x <= FW; x += 30) ctx.lineTo(x, snowTop(x, depth));
        ctx.lineTo(FW, FH); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, FH - 330);                                             // banks left beside the cleared path
        for (let x = 0; x <= Math.max(0, bx); x += 30) ctx.lineTo(x, Math.min(FH - 330, snowTop(x, depth)) - 30);
        ctx.lineTo(Math.max(0, bx), FH - 330); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.5)"; for (let x = 60; x < bx; x += 260) ctx.fillRect(x, FH - 175, 130, 16); // driveway lines
        if (e > B0 && e < B1) {
          for (let k = 0; k < 9; k++) plume.push({ x: bx + 120, y: FH - 520, vx: rand(-900, -300), vy: rand(-1800, -1100), r: rand(8, 22), life: 0 });
          ctx.save(); ctx.translate(bx, FH - 330); ctx.scale(2.4, 2.4);
          ctx.fillStyle = "#8fd18a"; ctx.strokeStyle = "#8fd18a"; ctx.lineCap = "round";
          ctx.fillRect(-60, -70, 140, 70); ctx.fillStyle = "#3d8a45"; ctx.fillRect(40, -60, 50, 60);
          ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(30, -70); ctx.quadraticCurveTo(40, -130, 0, -150); ctx.stroke();
          ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(-50, -60); ctx.lineTo(-130, -130); ctx.lineTo(-150, -130); ctx.stroke();
          ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(-30, 2, 22, 0, Math.PI * 2); ctx.arc(50, 2, 22, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = "#fff";
        for (let i = plume.length - 1; i >= 0; i--) {
          const q = plume[i]; q.life += dt; q.vy += 2000 * dt; q.x += q.vx * dt; q.y += q.vy * dt;
          if (q.life > 2 || q.y > FH) { plume.splice(i, 1); continue; }
          ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // blizzard
        ctx.fillStyle = "#fff";
        for (const f of flakes) {
          f.x -= f.v * 0.55 * dt * (0.3 + storm); f.y += f.v * dt * (0.3 + storm);
          if (f.y > FH) { f.y = rand(-200, -20); f.x = rand(0, FW + 800); }
          ctx.globalAlpha = 0.25 + 0.65 * storm; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (storm > 0.3) fillAll(`rgba(230,238,248,${0.22 * storm})`);
        const end = win(e, B1 + 0.3, B1 + 1.1);
        logo("lawn", 1150, 820, lerp(300, 820, backOut(end)), 0, end, "rgba(0,0,0,.5)");
        title("Snow Day? Handled.", 1150, 1380, 180, "#ffffff", win(e, B1 + 0.8, B1 + 1.5));
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

  // ---- 8. PC Build: a gaming PC assembles itself part by part, then the RGB comes on ----
  {
    const D = 21;
    const X0 = 1150, Y0 = 220, W = 1540, H = 1720;   // the case
    const steps = ["Motherboard", "CPU", "CPU cooler", "RAM", "Graphics card", "Power supply", "Fans", "Cables", "Glass panel", "Power on"];
    const at = (i: number) => 1.6 + i * 1.35;
    add({ name: "pcbuild", label: "TAKEOVER · PC Build", side: "pc", dur: D, draw: (e) => {
      fillAll(vgrad([[0, "#0a0f17"], [1, "#05080d"]]));
      ctx.strokeStyle = "rgba(56,189,248,.08)"; ctx.lineWidth = 3;            // floor grid
      for (let k = -20; k <= 20; k++) { ctx.beginPath(); ctx.moveTo(CX + k * 60, FH * 0.86); ctx.lineTo(CX + k * 400, FH); ctx.stroke(); }
      for (let k = 0; k < 6; k++) { const y = FH * 0.86 + k * k * 9; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FW, y); ctx.stroke(); }
      const p = (i: number) => easeOut(win(e, at(i), at(i) + 0.9));
      const rgbOn = win(e, at(9) + 0.3, at(9) + 1.2);
      const hue = (o: number) => `hsl(${(e * 120 + o) % 360},100%,60%)`;
      // case
      ctx.fillStyle = "#0d141d"; ctx.strokeStyle = "#334155"; ctx.lineWidth = 14;
      ctx.beginPath(); ctx.roundRect(X0, Y0, W, H, 40); ctx.fill(); ctx.stroke();
      if (rgbOn > 0) { ctx.save(); ctx.globalAlpha = rgbOn; ctx.strokeStyle = hue(0); ctx.lineWidth = 10; ctx.shadowColor = hue(0); ctx.shadowBlur = 50; ctx.beginPath(); ctx.roundRect(X0 + 30, Y0 + 30, W - 60, H - 60, 26); ctx.stroke(); ctx.restore(); }
      const slide = (q: number, fx: number, fy: number) => [lerp(fx, 0, q), lerp(fy, 0, q)];
      // 1 motherboard
      if (p(0) > 0) { const [dx, dy] = slide(p(0), -1600, 0); ctx.save(); ctx.translate(dx, dy);
        ctx.fillStyle = "#123a2c"; ctx.fillRect(X0 + 120, Y0 + 120, 900, 1120);
        ctx.strokeStyle = "rgba(61,208,155,.35)"; ctx.lineWidth = 4;
        for (let k = 0; k < 14; k++) { ctx.beginPath(); ctx.moveTo(X0 + 140, Y0 + 180 + k * 75); ctx.lineTo(X0 + 600, Y0 + 180 + k * 75); ctx.lineTo(X0 + 640, Y0 + 220 + k * 75); ctx.stroke(); }
        ctx.fillStyle = "#1f2937"; ctx.fillRect(X0 + 380, Y0 + 260, 260, 260); ctx.restore(); }
      // 2 CPU
      if (p(1) > 0) { const y = lerp(-400, Y0 + 300, p(1));
        ctx.fillStyle = "#c0c7cf"; ctx.fillRect(X0 + 420, y, 180, 180); ctx.fillStyle = "#94a3b8"; ctx.fillRect(X0 + 450, y + 30, 120, 120);
        if (p(1) >= 1 && e < at(1) + 1.4) dot(X0 + 510, Y0 + 390, 300, CYAN, 1 - (e - at(1) - 0.9) / 0.5); }
      // 3 cooler
      if (p(2) > 0) { const y = lerp(-500, Y0 + 230, p(2));
        ctx.fillStyle = "#1e293b"; ctx.beginPath(); ctx.arc(X0 + 510, y + 160, 170, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(X0 + 510, y + 160); ctx.rotate(e * (p(2) >= 1 ? 9 : 0)); ctx.fillStyle = "#475569";
        for (let k = 0; k < 7; k++) { ctx.rotate((Math.PI * 2) / 7); ctx.beginPath(); ctx.ellipse(70, 0, 70, 26, 0.5, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
        if (rgbOn > 0) { ctx.save(); ctx.globalAlpha = rgbOn; ctx.strokeStyle = hue(90); ctx.lineWidth = 12; ctx.shadowColor = hue(90); ctx.shadowBlur = 40; ctx.beginPath(); ctx.arc(X0 + 510, y + 160, 172, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); } }
      // 4 RAM
      for (let k = 0; k < 4; k++) { const q = easeOut(win(e, at(3) + k * 0.15, at(3) + k * 0.15 + 0.7)); if (q <= 0) continue;
        const x = X0 + 720 + k * 55, y = lerp(-700, Y0 + 220, q);
        ctx.fillStyle = "#111827"; ctx.fillRect(x, y, 36, 420);
        ctx.fillStyle = rgbOn > 0 ? hue(k * 40) : "#334155"; ctx.fillRect(x, y, 36, 40); }
      // 5 GPU
      if (p(4) > 0) { const x = lerp(FW + 200, X0 + 120, p(4)), y = Y0 + 760;
        ctx.fillStyle = "#1f2937"; ctx.beginPath(); ctx.roundRect(x, y, 1150, 230, 24); ctx.fill();
        for (let k = 0; k < 3; k++) { const fx = x + 230 + k * 340, fy = y + 115;
          ctx.fillStyle = "#0b1017"; ctx.beginPath(); ctx.arc(fx, fy, 100, 0, Math.PI * 2); ctx.fill();
          ctx.save(); ctx.translate(fx, fy); ctx.rotate(e * (p(4) >= 1 ? 12 : 0)); ctx.fillStyle = "#64748b";
          for (let b = 0; b < 9; b++) { ctx.rotate((Math.PI * 2) / 9); ctx.beginPath(); ctx.ellipse(45, 0, 45, 15, 0.6, 0, Math.PI * 2); ctx.fill(); }
          ctx.restore(); }
        ctx.fillStyle = rgbOn > 0 ? hue(180) : "#38bdf8"; ctx.fillRect(x + 20, y + 200, 1110, 14); }
      // 6 PSU
      if (p(5) > 0) { const y = lerp(FH + 300, Y0 + H - 380, p(5)); ctx.fillStyle = "#1e293b"; ctx.fillRect(X0 + 80, y, 820, 300);
        ctx.fillStyle = "#94a3b8"; ctx.font = `700 60px ${api.mono}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("1000W", X0 + 140, y + 150); }
      // 7 front fans
      for (let k = 0; k < 3; k++) { const q = easeOut(win(e, at(6) + k * 0.15, at(6) + k * 0.15 + 0.6)); if (q <= 0) continue;
        const fx = lerp(FW + 400, X0 + W - 210, q), fy = Y0 + 300 + k * 420;
        ctx.fillStyle = "#111827"; ctx.beginPath(); ctx.arc(fx, fy, 170, 0, Math.PI * 2); ctx.fill();
        if (rgbOn > 0) { ctx.save(); ctx.globalAlpha = rgbOn; ctx.strokeStyle = hue(k * 60 + 200); ctx.lineWidth = 14; ctx.shadowColor = hue(k * 60 + 200); ctx.shadowBlur = 50; ctx.beginPath(); ctx.arc(fx, fy, 165, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
        ctx.save(); ctx.translate(fx, fy); ctx.rotate(e * 8 * q); ctx.fillStyle = "#475569";
        for (let b = 0; b < 7; b++) { ctx.rotate((Math.PI * 2) / 7); ctx.beginPath(); ctx.ellipse(72, 0, 72, 24, 0.5, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore(); }
      // 8 cables
      const cq = win(e, at(7), at(7) + 1);
      if (cq > 0) { ctx.save(); ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 26; ctx.lineCap = "round"; ctx.setLineDash([2400 * cq, 3000]);
        for (const [a, b, c, d] of [[X0 + 300, Y0 + H - 380, X0 + 200, Y0 + 500], [X0 + 600, Y0 + H - 380, X0 + 900, Y0 + 900], [X0 + 800, Y0 + H - 380, X0 + 1000, Y0 + 300]]) {
          ctx.beginPath(); ctx.moveTo(a, b); ctx.bezierCurveTo(a - 100, b - 300, c + 100, d + 300, c, d); ctx.stroke(); }
        ctx.restore(); }
      // 9 glass
      const gq = p(8);
      if (gq > 0) { const x = lerp(FW, X0, gq); ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = "#bfe8ff"; ctx.beginPath(); ctx.roundRect(x, Y0, W, H, 40); ctx.fill();
        ctx.globalAlpha = 0.35; ctx.strokeStyle = "#e0f2fe"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x + 200, Y0 + 60); ctx.lineTo(x + 60, Y0 + 400); ctx.stroke(); ctx.restore(); }
      // power button flash
      const pw = win(e, at(9), at(9) + 0.4);
      if (pw > 0 && pw < 1) fillAll(`rgba(255,255,255,${Math.sin(pw * Math.PI) * 0.5})`);
      // captions
      const si = Math.max(0, Math.min(steps.length - 1, Math.floor((e - 1.6) / 1.35)));
      if (e > 1.6 && e < at(9) + 1.2) {
        ctx.font = `700 70px ${api.mono}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = `rgb(${CYAN})`;
        ctx.fillText(`[${si + 1}/${steps.length}] ${steps[si]}`, 160, 200);
        ctx.fillStyle = "#1e293b"; ctx.fillRect(160, 280, 820, 22); ctx.fillStyle = `rgb(${TEAL})`; ctx.fillRect(160, 280, 820 * ((si + 1) / steps.length), 22);
      }
      if (rgbOn > 0) {
        logo("pc", 3270, 760, lerp(300, 720, backOut(rgbOn)), 0, rgbOn, `rgba(${TEAL},.6)`);
        title("BUILD COMPLETE", 3270, 1300, 120, "#ffffff", win(e, at(9) + 0.9, at(9) + 1.5), HEAD, 900);
        title("built by HunterPCBuilds", 3270, 1430, 70, `rgb(${CYAN})`, win(e, at(9) + 1.2, at(9) + 1.8), api.mono, 700);
      }
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
  ctx.globalAlpha = Math.min(fadeIn, fadeOut);
  ctx.clip(mask);
  ctx.save(); t.draw(e, dt); ctx.restore();
  ctx.restore();
  // a glowing front on the flood while it's still moving
  if (grow > 0 && grow < 1) {
    const col = t.side === "lawn" ? GREEN : CYAN;
    ctx.save(); ctx.strokeStyle = `rgba(${col},${1 - grow})`; ctx.lineWidth = 16; ctx.shadowColor = `rgba(${col},1)`; ctx.shadowBlur = 40;
    ctx.beginPath(); edge.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore();
  }
}

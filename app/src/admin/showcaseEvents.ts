import { showcase as S } from "./showcaseData";

/**
 * The library of extra Showcase events. Each one plays for `dur` seconds, then the scene goes calm again.
 * `back` draws behind the logos, `front` draws in front of them (all text always stays on top).
 * Coordinates are in the 3840x2160 wallpaper frame. Lawn Co is left of the dividing line, PC Builds right.
 *
 * To remove an event, delete its block. To make one longer or shorter, change its `dur`.
 */

export type LogoFx = { dx: number; dy: number; rot: number; scale: number; alpha: number; glitch: number };
export type Path = { pts: readonly (readonly [number, number])[]; cum: number[]; len: number };
type Which = "lawn" | "pc";
type Draw = (p: number, e: number, dt: number) => void;
export type Ev = { name: string; label: string; dur: number; start?: () => void; back?: Draw; front?: Draw };

export interface Api {
  ctx: CanvasRenderingContext2D;
  leftClip: Path2D;
  rightClip: Path2D;
  seamX: (y: number) => number;
  traces: Path[];
  radial: Path[];
  pointAt: (p: Path, d: number) => readonly [number, number];
  quietFade: (x: number, y: number) => number;
  drawLeaf: (x: number, y: number, size: number, rot: number, flip: number, col: string) => void;
  /** Where a logo is right now (it floats), and a way to draw in its own space (0,0 = center, radius ≈ 290). */
  logoPos: (which: Which) => { x: number; y: number };
  withLogo: (which: Which, fn: () => void) => void;
  fx: { lawn: LogoFx; pc: LogoFx };
  bump: (which: Which, amount: number) => void;
  /** Show a line under the terminal text for this frame. */
  term: (text: string, alpha?: number) => void;
  pcSprite: () => HTMLCanvasElement | null;
  mono: string;
}

// ---------- helpers ----------
const [FW, FH] = S.size;
const [LX, LY] = S.logoLawn, [PX, PY] = S.logoPc;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const easeOut = (p: number) => 1 - Math.pow(1 - clamp01(p), 3);
const bell = (p: number) => Math.sin(Math.PI * clamp01(p));
/** 0 → 1 quickly, hold, then 1 → 0 at the end (k = fraction used for each fade). */
const fade = (p: number, k = 0.12) => clamp01(p / k) * clamp01((1 - p) / k);
const hash = (n: number) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
const LEAF_COLORS = ["#d67828", "#e8a032", "#be5028", "#c88c2d", "#aa4623"];
const TEAL = "61,208,155", CYAN = "56,189,248", GREEN = "143,209,138";

const glowCache = new Map<string, HTMLCanvasElement>();
/** A soft glowing dot sprite (cached per color). */
function glowSprite(rgb: string) {
  let c = glowCache.get(rgb);
  if (!c) {
    c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d")!, gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.2, `rgba(${rgb},1)`); gr.addColorStop(0.5, `rgba(${rgb},.35)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    glowCache.set(rgb, c);
  }
  return c;
}

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; col: string; rot?: number; spin?: number };
function stepParticles(arr: Particle[], dt: number, gravity: number) {
  for (let i = arr.length - 1; i >= 0; i--) {
    const q = arr[i];
    q.life += dt; q.vy += gravity * dt; q.x += q.vx * dt; q.y += q.vy * dt;
    if (q.rot !== undefined) q.rot += (q.spin ?? 0) * dt;
    if (q.life > q.max) arr.splice(i, 1);
  }
}

export function buildEvents(api: Api): Ev[] {
  const { ctx } = api;
  const dot = (x: number, y: number, r: number, rgb: string, a = 1) => {
    if (a <= 0) return;
    ctx.globalAlpha = a; ctx.drawImage(glowSprite(rgb), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1;
  };
  const inLeft = (fn: () => void) => { ctx.save(); ctx.clip(api.leftClip); fn(); ctx.restore(); };
  const inRight = (fn: () => void) => { ctx.save(); ctx.clip(api.rightClip); fn(); ctx.restore(); };
  const lighter = (fn: () => void) => { ctx.save(); ctx.globalCompositeOperation = "lighter"; fn(); ctx.restore(); };
  const overlay = (rgba: string, clip?: Path2D) => { ctx.save(); if (clip) ctx.clip(clip); ctx.fillStyle = rgba; ctx.fillRect(0, 0, FW, FH); ctx.restore(); };
  /** Curved route between the two logos (arcs up over the dividing line). */
  const bridge = (t: number, fromPc = true) => {
    const a = fromPc ? [PX, PY] : [LX, LY], b = fromPc ? [LX, LY] : [PX, PY], c = [1880, 650];
    const u = 1 - t;
    return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]] as const;
  };
  const strokePath = (pts: readonly (readonly number[])[]) => {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  };

  const events: Ev[] = [];
  const add = (ev: Ev) => events.push(ev);

  // =====================================================================
  // LAWN CO SIDE
  // =====================================================================

  add({ name: "bunny", label: "Bunny hops across the grass", dur: 7, back: (p, e) => inLeft(() => {
    const x = -160 + p * 2150, hop = Math.abs(Math.sin(e * Math.PI * 1.35)), y = 2070 - hop * 150;
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = fade(p, 0.06);
    const stretch = 1 + hop * 0.12;
    ctx.scale(1.4 * stretch, 1.4 / stretch);
    ctx.fillStyle = "#e6ddcf";
    ctx.beginPath(); ctx.ellipse(-30, 34, 44, 15, 0, 0, Math.PI * 2); ctx.fill();         // back foot
    ctx.beginPath(); ctx.ellipse(0, 0, 72, 46, -0.1, 0, Math.PI * 2); ctx.fill();          // body
    ctx.beginPath(); ctx.arc(62, -36, 32, 0, Math.PI * 2); ctx.fill();                       // head
    for (const [ex, rot] of [[50, -0.35], [72, 0.05]]) { ctx.beginPath(); ctx.ellipse(ex, -88, 12, 40, rot, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#c9b8a6"; ctx.beginPath(); ctx.ellipse(52, -88, 5, 26, -0.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-70, -14, 19, 0, Math.PI * 2); ctx.fill(); // tail
    ctx.fillStyle = "#1a1a1a"; ctx.beginPath(); ctx.arc(76, -42, 5, 0, Math.PI * 2); ctx.fill(); // eye
    ctx.fillStyle = "#e89aa0"; ctx.beginPath(); ctx.arc(93, -32, 5, 0, Math.PI * 2); ctx.fill(); // nose
    ctx.restore();
  }) });

  add({ name: "birds", label: "Birds fly over in a V", dur: 9, back: (p, e) => inLeft(() => {
    const hx = -300 + p * 2500, hy = 1520 - p * 260;
    ctx.strokeStyle = "rgba(12,30,16,.85)"; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let i = 0; i < 7; i++) {
      const k = Math.ceil(i / 2), side = i % 2 ? -1 : 1;
      const x = hx - k * 105, y = hy + side * k * 62 + Math.sin(e * 1.5 + i) * 10;
      const f = Math.sin(e * 9 + i * 0.8);
      ctx.save(); ctx.translate(x, y); ctx.scale(1.5, 1.5);
      ctx.beginPath(); ctx.moveTo(-30, -f * 8); ctx.quadraticCurveTo(-14, -16 * f - 6, 0, 0); ctx.quadraticCurveTo(14, -16 * f - 6, 30, -f * 8); ctx.stroke();
      ctx.restore();
    }
  }) });

  add({ name: "butterfly", label: "Butterfly flutters around the logo", dur: 11, front: (p, e) => {
    const a = e * 0.75 - 1, { x: cx, y: cy } = api.logoPos("lawn");
    const x = cx + Math.cos(a) * 420 + Math.sin(2 * a) * 60, y = cy + Math.sin(a) * 330 - Math.cos(3 * a) * 40;
    const flap = 0.25 + 0.75 * Math.abs(Math.sin(e * 15));
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(e * 2) * 0.3); ctx.scale(1.6, 1.6); ctx.globalAlpha = fade(p, 0.1);
    for (const s of [-1, 1]) {
      ctx.save(); ctx.scale(s * flap, 1);
      ctx.fillStyle = "#f0a030"; ctx.strokeStyle = "#3a2210"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(28, -18, 30, 24, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#f6c650";
      ctx.beginPath(); ctx.ellipse(22, 18, 20, 16, 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = "#3a2210"; ctx.beginPath(); ctx.ellipse(0, 0, 6, 26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#3a2210"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-2, -24); ctx.lineTo(-12, -44); ctx.moveTo(2, -24); ctx.lineTo(12, -44); ctx.stroke();
    ctx.restore();
  } });

  {
    let drops: Particle[] = [];
    add({ name: "rain", label: "Rain shower", dur: 9, start: () => { drops = []; }, back: (p, _e, dt) => inLeft(() => {
      overlay(`rgba(10,22,40,${0.24 * bell(p)})`);
      if (p < 0.85) for (let k = Math.round(260 * dt + Math.random()); k > 0; k--) {
        drops.push({ x: rand(0, 2300), y: rand(-200, -20), vx: -260, vy: rand(1700, 2200), life: 0, max: 2, r: rand(40, 80), col: "" });
      }
      ctx.strokeStyle = "rgba(200,225,255,.45)"; ctx.lineWidth = 3;
      ctx.beginPath();
      for (const d of drops) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.vx * 0.03, d.y - d.r); }
      ctx.stroke();
      stepParticles(drops, dt, 0);
      drops = drops.filter((d) => d.y < 2140);
    }) });
  }

  add({ name: "rainbow", label: "A rainbow fades in", dur: 9, back: (p) => inLeft(() => {
    const cols = ["255,80,80", "255,160,60", "255,230,80", "110,220,110", "80,170,255", "110,110,230", "170,100,220"];
    const sweep = easeOut(p * 2.2) * Math.PI;
    ctx.lineWidth = 40;
    cols.forEach((c, i) => {
      ctx.strokeStyle = `rgba(${c},${0.22 * fade(p, 0.25)})`;
      ctx.beginPath(); ctx.arc(1000, 2300, 1500 - i * 40, Math.PI, Math.PI + sweep); ctx.stroke();
    });
  }) });

  {
    const flies = Array.from({ length: 30 }, () => ({ x: 0, y: 0, vx: 0, vy: 0, ph: 0 }));
    add({ name: "fireflies", label: "Fireflies at dusk", dur: 12,
      start: () => flies.forEach((f) => Object.assign(f, { x: rand(100, 1750), y: rand(900, 2050), vx: rand(-40, 40), vy: rand(-30, 30), ph: rand(0, 6) })),
      back: (p, e, dt) => inLeft(() => {
        overlay(`rgba(4,14,26,${0.42 * bell(p)})`);
        lighter(() => {
          for (const f of flies) {
            f.vx += rand(-60, 60) * dt; f.vy += rand(-60, 60) * dt;
            f.vx *= 0.99; f.vy *= 0.99; f.x += f.vx * dt; f.y += f.vy * dt;
            const blink = Math.pow(0.5 + 0.5 * Math.sin(e * 2.6 + f.ph), 3);
            dot(f.x, f.y, 52, "215,255,120", blink * bell(p));
          }
        });
      }) });
  }

  {
    let water: Particle[] = [];
    add({ name: "sprinkler", label: "Sprinkler waters the lawn", dur: 9, start: () => { water = []; }, back: (p, e, dt) => inLeft(() => {
      const sx = 560, sy = 2090, a = -Math.PI / 2 + Math.sin(e * 1.3) * 0.85;
      if (p < 0.85) for (let k = Math.round(320 * dt + Math.random()); k > 0; k--) {
        const aa = a + rand(-0.06, 0.06), sp = rand(1050, 1250);
        water.push({ x: sx, y: sy - 40, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, life: 0, max: 2, r: rand(4, 8), col: "" });
      }
      stepParticles(water, dt, 1500);
      water = water.filter((w) => w.y < 2130);
      ctx.fillStyle = "rgba(190,225,255,.75)";
      for (const w of water) { ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = fade(p, 0.08);
      ctx.fillStyle = "#9aa3a8"; ctx.fillRect(sx - 10, sy - 40, 20, 60);
      ctx.save(); ctx.translate(sx, sy - 40); ctx.rotate(a + Math.PI / 2); ctx.fillStyle = "#c4ccd0"; ctx.fillRect(-28, -8, 56, 16); ctx.restore();
      ctx.globalAlpha = 1;
    }) });
  }

  {
    const seeds = Array.from({ length: 18 }, () => ({ x: 0, y: 0, vx: 0, vy: 0, t0: 0, rot: 0 }));
    add({ name: "dandelion", label: "Dandelion seeds float up", dur: 12,
      start: () => seeds.forEach((s) => Object.assign(s, { x: rand(100, 1500), y: rand(1980, 2080), vx: rand(40, 110), vy: rand(-170, -100), t0: rand(0, 0.45), rot: rand(-0.4, 0.4) })),
      back: (p, e, dt) => inLeft(() => {
        ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 3;
        for (const s of seeds) {
          if (p < s.t0) continue;
          s.x += (s.vx + Math.sin(e * 1.4 + s.t0 * 9) * 60) * dt; s.y += s.vy * dt;
          ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot + Math.sin(e * 2 + s.t0 * 7) * 0.25);
          ctx.globalAlpha = clamp01((p - s.t0) * 8) * clamp01((1 - p) / 0.15);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 30);
          for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (k - 4) * 0.32; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 26, Math.sin(a) * 26); }
          ctx.stroke(); ctx.beginPath(); ctx.arc(0, 32, 4, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }) });
  }

  add({ name: "squirrel", label: "Squirrel dashes across", dur: 6, back: (p, e) => inLeft(() => {
    let x: number, flick = 0;
    if (p < 0.4) x = lerp(1950, 900, p / 0.4);
    else if (p < 0.6) { x = 900; flick = Math.sin((p - 0.4) / 0.2 * Math.PI * 3); }
    else x = lerp(900, -250, (p - 0.6) / 0.4);
    const running = p < 0.4 || p > 0.6, y = 2060 - (running ? Math.abs(Math.sin(e * 16)) * 26 : 0);
    ctx.save(); ctx.translate(x, y); ctx.scale(1.5, 1.5);
    ctx.fillStyle = "#8a5a33";
    ctx.save(); ctx.translate(48, -10); ctx.rotate(-0.2 + flick * 0.25);           // tail (behind, facing left)
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(70, -10, 90, -110, 30, -130); ctx.bezierCurveTo(70, -80, 40, -20, -10, 10); ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(0, 0, 58, 30, 0.1, 0, Math.PI * 2); ctx.fill();    // body
    ctx.beginPath(); ctx.arc(-52, -22, 24, 0, Math.PI * 2); ctx.fill();               // head
    ctx.beginPath(); ctx.ellipse(-46, -46, 7, 13, -0.3, 0, Math.PI * 2); ctx.fill();  // ear
    ctx.fillStyle = "#c79a6e"; ctx.beginPath(); ctx.ellipse(-12, 10, 30, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(-60, -26, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }) });

  {
    let snow: Particle[] = [];
    add({ name: "snowblower", label: "Snow blower blasts a plume", dur: 7, start: () => { snow = []; }, back: (p, e, dt) => inLeft(() => {
      const bx = lerp(-260, 900, easeOut(p * 1.3)) - (p > 0.8 ? (p - 0.8) * 6000 : 0), by = 2060;
      if (p < 0.78) for (let k = Math.round(260 * dt + Math.random()); k > 0; k--) {
        snow.push({ x: bx + 40, y: by - 140, vx: rand(500, 900), vy: rand(-1150, -800), life: 0, max: 2.4, r: rand(5, 12), col: "" });
      }
      stepParticles(snow, dt, 1300);
      snow = snow.filter((s) => s.y < 2140);
      ctx.fillStyle = "#fff";
      for (const s of snow) { ctx.globalAlpha = 0.85 * clamp01((s.max - s.life) * 2); ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(bx, by + Math.sin(e * 25) * 2); ctx.scale(1.4, 1.4);   // the snow blower
      ctx.fillStyle = "#8fd18a"; ctx.strokeStyle = "#8fd18a"; ctx.lineCap = "round";
      ctx.fillRect(-60, -50, 120, 54);
      ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(10, -50); ctx.quadraticCurveTo(20, -100, 60, -110); ctx.stroke();   // chute
      ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(-50, -40); ctx.lineTo(-120, -110); ctx.lineTo(-140, -110); ctx.stroke(); // handle
      ctx.fillStyle = "#1a3d1f"; ctx.fillRect(-60, -6, 120, 10);
      for (const wx of [-34, 34]) { ctx.fillStyle = "#8fd18a"; ctx.beginPath(); ctx.arc(wx, 14, 22, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#1a3d1f"; ctx.beginPath(); ctx.arc(wx, 14, 8, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }) });
  }

  {
    const tl = Array.from({ length: 34 }, () => ({ a: 0, r: 0, h: 0, size: 0, col: "", spin: 0 }));
    const leafAt = (l: (typeof tl)[number], p: number, e: number, front: boolean) => {
      const { x: cx, y: cy } = api.logoPos("lawn");
      const a = l.a + e * 2.6, r = l.r * (0.55 + 0.6 * bell(p));
      if ((Math.sin(a) > 0) !== front) return;
      const y = cy + 300 - ((l.h + e * 180) % 760), x = cx + Math.cos(a) * r * (0.8 + (cy + 300 - y) / 1500);
      ctx.globalAlpha = bell(p) * (front ? 1 : 0.8);
      api.drawLeaf(x, y, l.size, l.spin * e, e * 3 + l.a, l.col);
      ctx.globalAlpha = 1;
    };
    add({ name: "leaftornado", label: "Leaf tornado swirls around the logo", dur: 8,
      start: () => tl.forEach((l) => Object.assign(l, { a: rand(0, 6.3), r: rand(300, 420), h: rand(0, 760), size: rand(22, 36), col: pick(LEAF_COLORS), spin: rand(-4, 4) })),
      back: (p, e) => { api.fx.lawn.rot += Math.sin(e * 7) * 0.04 * bell(p); for (const l of tl) leafAt(l, p, e, false); },
      front: (p, e) => { for (const l of tl) leafAt(l, p, e, true); } });
  }

  add({ name: "grasswave", label: "A breeze ripples through the grass", dur: 4.5, back: (p) => inLeft(() => {
    const cx = lerp(-500, 2400, p);
    const g = ctx.createLinearGradient(cx - 320, 0, cx + 320, 0);
    g.addColorStop(0, "rgba(190,255,170,0)"); g.addColorStop(0.5, "rgba(190,255,170,.28)"); g.addColorStop(1, "rgba(190,255,170,0)");
    lighter(() => { ctx.fillStyle = g; ctx.fillRect(cx - 320, 1880, 640, 280); });
    api.fx.lawn.rot += Math.exp(-Math.pow((cx - LX) / 300, 2)) * 0.05;
  }) });

  add({ name: "cloudshadow", label: "A cloud's shadow drifts over the lawn", dur: 10, back: (p) => inLeft(() => {
    const cx = lerp(-1000, 2900, p);
    for (const [ox, oy, r] of [[0, 0, 700], [450, -150, 520], [-420, 120, 560], [200, 260, 480]]) {
      const g = ctx.createRadialGradient(cx + ox, 1150 + oy, 0, cx + ox, 1150 + oy, r);
      g.addColorStop(0, "rgba(0,10,0,.2)"); g.addColorStop(1, "rgba(0,10,0,0)");
      ctx.fillStyle = g; ctx.fillRect(cx + ox - r, 1150 + oy - r, r * 2, r * 2);
    }
  }) });

  add({ name: "shootingstar", label: "Shooting star in the winter corner", dur: 1.8, back: (p) => inLeft(() => {
    const t = easeOut(p * 1.4), x = lerp(1120, 1930, t), y = lerp(40, 470, t);
    const tx = x - 380 * 0.88, ty = y - 380 * 0.47;
    const g = ctx.createLinearGradient(tx, ty, x, y);
    g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(1, `rgba(255,255,255,${0.95 * fade(p, 0.15)})`);
    ctx.strokeStyle = g; ctx.lineWidth = 7; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
    lighter(() => dot(x, y, 46, "220,240,255", fade(p, 0.15)));
  }) });

  add({ name: "aurora", label: "Aurora shimmers in the winter corner", dur: 11, back: (p, e) => inLeft(() => {
    lighter(() => {
      [["90,255,170", 0], ["80,200,255", 2.1], ["180,120,255", 4.2]].forEach(([c, ph], k) => {
        const g = ctx.createLinearGradient(0, 0, 0, 720);
        g.addColorStop(0, `rgba(${c},0)`); g.addColorStop(0.35, `rgba(${c},${0.3 * bell(p)})`); g.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = g;
        for (let x = 950; x < 2060; x += 18) {
          const y0 = 30 + 70 * Math.sin(x * 0.004 + e * 0.7 + (ph as number)) + k * 40;
          const h = 300 + 120 * Math.sin(x * 0.007 - e * 0.9 + (ph as number));
          ctx.fillRect(x, y0, 19, h);
        }
      });
    });
  }) });

  {
    const ic = Array.from({ length: 30 }, (_, i) => ({ x: 50 + i * 68, len: 0 }));
    let drips: Particle[] = [];
    add({ name: "icicles", label: "Icicles grow along the top and drip", dur: 10,
      start: () => { ic.forEach((c) => (c.len = rand(50, 210))); drips = []; },
      back: (p, _e, dt) => inLeft(() => {
        const g = easeOut(p * 2.2), a = clamp01((1 - p) / 0.15);
        for (const c of ic) {
          const L = c.len * g;
          const gr = ctx.createLinearGradient(0, 0, 0, L);
          gr.addColorStop(0, `rgba(235,248,255,${0.95 * a})`); gr.addColorStop(1, `rgba(170,215,255,${0.5 * a})`);
          ctx.fillStyle = gr;
          ctx.beginPath(); ctx.moveTo(c.x - 15, 0); ctx.lineTo(c.x + 15, 0); ctx.lineTo(c.x, L); ctx.closePath(); ctx.fill();
          if (p > 0.45 && p < 0.88 && Math.random() < dt * 0.6) drips.push({ x: c.x, y: L, vx: 0, vy: 0, life: 0, max: 3, r: 6, col: "" });
        }
        stepParticles(drips, dt, 1800);
        drips = drips.filter((d) => d.y < 2100);
        ctx.fillStyle = "rgba(200,230,255,.8)";
        for (const d of drips) { ctx.beginPath(); ctx.ellipse(d.x, d.y, 5, 9, 0, 0, Math.PI * 2); ctx.fill(); }
      }) });
  }

  add({ name: "snowcap", label: "Snow piles up on the logo, then slides off", dur: 9, front: (p) => api.withLogo("lawn", () => {
    const g = easeOut(p / 0.55), slide = p > 0.68 ? ease((p - 0.68) / 0.32) : 0;
    ctx.translate(slide * 520, slide * 260); ctx.rotate(slide * 0.6); ctx.globalAlpha = 1 - slide;
    const R = 288, th = 8 + g * 60;
    ctx.beginPath();
    ctx.arc(0, 0, R, Math.PI * 1.13, Math.PI * 1.87);
    for (let k = 0; k <= 24; k++) {
      const a = Math.PI * 1.87 - (k / 24) * Math.PI * 0.74;
      const bumpy = th * (0.75 + 0.25 * Math.sin(k * 1.7)) * Math.sin((k / 24) * Math.PI) + 6;
      ctx.lineTo(Math.cos(a) * (R + bumpy), Math.sin(a) * (R + bumpy));
    }
    ctx.closePath();
    ctx.fillStyle = "#fbfdff"; ctx.shadowColor = "rgba(120,170,220,.7)"; ctx.shadowBlur = 18; ctx.fill();
    if (p > 0.6 && p < 0.7) api.fx.lawn.rot += Math.sin(p * 200) * 0.02;
  }) });

  add({ name: "balloon", label: "Hot air balloon drifts up", dur: 16, back: (p, e) => inLeft(() => {
    const x = 380 + p * 1150 + Math.sin(e * 0.5) * 60, y = 2400 - p * 2800;
    ctx.save(); ctx.translate(x, y); ctx.scale(1.25, 1.25);
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, 130, Math.PI * 0.8, Math.PI * 0.2); ctx.quadraticCurveTo(70, 140, 30, 175); ctx.lineTo(-30, 175); ctx.quadraticCurveTo(-70, 140, -105, 76); ctx.closePath();
    ctx.clip();
    ctx.fillStyle = "#f4f7f2"; ctx.fillRect(-140, -140, 280, 330);
    ctx.fillStyle = "#3d8a45"; for (let k = -3; k <= 3; k += 2) ctx.fillRect(k * 36 - 18, -140, 36, 330);
    ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.fillRect(40, -140, 120, 330);
    ctx.restore();
    ctx.strokeStyle = "#5a4630"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-28, 175); ctx.lineTo(-22, 225); ctx.moveTo(28, 175); ctx.lineTo(22, 225); ctx.stroke();
    ctx.fillStyle = "#8a6a44"; ctx.fillRect(-26, 222, 52, 40);
    ctx.restore();
  }) });

  add({ name: "sunbeams", label: "Sunbeams shine down", dur: 8, back: (p, e) => inLeft(() => lighter(() => {
    const ox = -250, oy = -250;
    for (let k = 0; k < 6; k++) {
      const a = 0.32 + k * 0.17 + Math.sin(e * 0.4 + k) * 0.03, w = 0.035 + (k % 2) * 0.02;
      const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, 2900);
      g.addColorStop(0, `rgba(255,240,190,${0.2 * bell(p)})`); g.addColorStop(1, "rgba(255,240,190,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(ox, oy);
      ctx.lineTo(ox + Math.cos(a - w) * 3200, oy + Math.sin(a - w) * 3200); ctx.lineTo(ox + Math.cos(a + w) * 3200, oy + Math.sin(a + w) * 3200);
      ctx.closePath(); ctx.fill();
    }
  })) });

  // =====================================================================
  // HUNTERPCBUILDS SIDE
  // =====================================================================

  add({ name: "rgb", label: "RGB lighting runs through every circuit", dur: 7, back: (p, e) => inRight(() => lighter(() => {
    ctx.lineCap = "round";
    const a = fade(p, 0.15);
    [...api.traces, ...api.radial].forEach((tr, i) => {
      for (let k = 1; k < tr.pts.length; k++) {
        const [x0, y0] = tr.pts[k - 1], [x1, y1] = tr.pts[k];
        const hue = (e * 140 + (x0 + y0) * 0.08 + i * 9) % 360;
        const q = i < api.traces.length ? api.quietFade((x0 + x1) / 2, (y0 + y1) / 2) : 1;
        ctx.strokeStyle = `hsla(${hue},100%,60%,${0.75 * a * q})`; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
    });
    const { x, y } = api.logoPos("pc");
    const hue = (e * 140) % 360;
    const g = ctx.createRadialGradient(x, y, 250, x, y, 520);
    g.addColorStop(0, `hsla(${hue},100%,60%,${0.25 * a})`); g.addColorStop(1, `hsla(${hue},100%,60%,0)`);
    ctx.fillStyle = g; ctx.fillRect(x - 520, y - 520, 1040, 1040);
  })) });

  add({ name: "matrix", label: "Code rain", dur: 9, back: (p, e) => inRight(() => {
    const chars = "0123456789ABCDEF<>/{}#$=+*";
    ctx.font = `700 46px ${api.mono}`; ctx.textAlign = "center";
    const a = fade(p, 0.15);
    for (let c = 0, x = 2010; x < FW; c++, x += 56) {
      const speed = 380 + hash(c) * 400, head = ((e * speed + hash(c + 50) * 2600) % 2700) - 300;
      for (let k = 0; k < 14; k++) {
        const y = head - k * 46;
        if (y < -40 || y > FH) continue;
        const q = api.quietFade(x, y) * a * (1 - k / 14);
        if (q < 0.03) continue;
        ctx.fillStyle = k === 0 ? `rgba(220,255,240,${q})` : `rgba(${TEAL},${q * 0.8})`;
        ctx.fillText(chars[Math.floor(hash(c * 31 + k * 7 + Math.floor(e * 7)) * chars.length)], x, y);
      }
    }
    ctx.textAlign = "start";
  }) });

  add({ name: "gear", label: "The gear on the logo's screen spins up", dur: 5, front: (p) => api.withLogo("pc", () => {
    ctx.translate(-62.3, -55.2);
    const a = fade(p, 0.08);
    ctx.globalAlpha = a;
    ctx.fillStyle = "#0c141f"; ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(ease(p) * Math.PI * 6);
    const s = 1 + 0.18 * bell(p); ctx.scale(s, s);
    ctx.fillStyle = "#3ecf9a"; ctx.shadowColor = "rgba(61,208,155,.9)"; ctx.shadowBlur = 16 * bell(p);
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const a0 = (k / 8) * Math.PI * 2;
      ctx.lineTo(Math.cos(a0 - 0.2) * 26, Math.sin(a0 - 0.2) * 26);
      ctx.lineTo(Math.cos(a0 - 0.13) * 34, Math.sin(a0 - 0.13) * 34);
      ctx.lineTo(Math.cos(a0 + 0.13) * 34, Math.sin(a0 + 0.13) * 34);
      ctx.lineTo(Math.cos(a0 + 0.2) * 26, Math.sin(a0 + 0.2) * 26);
    }
    ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath(); ctx.arc(0, 0, 10.6, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = "source-over"; ctx.shadowBlur = 0;
    ctx.fillStyle = "#0c141f"; ctx.beginPath(); ctx.arc(0, 0, 10.6, 0, Math.PI * 2); ctx.fill();
  }) });

  {
    let bumped = false;
    add({ name: "progress", label: "\"Building PC\" progress bar", dur: 7, start: () => { bumped = false; }, front: (p) => {
      const q = easeOut(clamp01(p / 0.75)), n = Math.round(q * 14);
      if (q < 1) api.term(`> building PC [${"█".repeat(n)}${"·".repeat(14 - n)}] ${Math.round(q * 100)}%`);
      else {
        api.term("> build complete ✓", clamp01((1 - p) / 0.1));
        if (!bumped) { bumped = true; api.bump("pc", 1); }
      }
    } });
  }

  {
    const st = { x: 0, y: 0, vx: 0, vy: 0, hue: 160 };
    add({ name: "dvd", label: "Screensaver bounce", dur: 14,
      start: () => Object.assign(st, { x: rand(2500, 3300), y: rand(300, 700), vx: 560 * (Math.random() < 0.5 ? -1 : 1), vy: 420, hue: 160 }),
      front: (p, _e, dt) => {
        const spr = api.pcSprite(); if (!spr) return;
        const size = 190, half = size / 2;
        st.x += st.vx * dt; st.y += st.vy * dt;
        const minX = api.seamX(st.y) + half + 30;
        if (st.x < minX) { st.x = minX; st.vx = Math.abs(st.vx); st.hue = (st.hue + 70) % 360; }
        if (st.x > FW - half - 20) { st.x = FW - half - 20; st.vx = -Math.abs(st.vx); st.hue = (st.hue + 70) % 360; }
        if (st.y < half + 20) { st.y = half + 20; st.vy = Math.abs(st.vy); st.hue = (st.hue + 70) % 360; }
        if (st.y > FH - half - 20) { st.y = FH - half - 20; st.vy = -Math.abs(st.vy); st.hue = (st.hue + 70) % 360; }
        const a = fade(p, 0.06);
        const g = ctx.createRadialGradient(st.x, st.y, half * 0.8, st.x, st.y, half * 1.7);
        g.addColorStop(0, `hsla(${st.hue},100%,60%,${0.5 * a})`); g.addColorStop(1, `hsla(${st.hue},100%,60%,0)`);
        ctx.fillStyle = g; ctx.fillRect(st.x - size, st.y - size, size * 2, size * 2);
        const k = size / 580, w = spr.width * k;
        ctx.globalAlpha = a; ctx.drawImage(spr, st.x - w / 2, st.y - w / 2, w, w); ctx.globalAlpha = 1;
      } });
  }

  add({ name: "glitch", label: "Glitch on the PC logo", dur: 2, back: (p) => {
    const on = Math.random() < 0.55 * bell(p);
    api.fx.pc.glitch = on ? 1 : 0;
    if (on) api.fx.pc.dx += rand(-14, 14);
    if (on && Math.random() < 0.5) api.term("> ERR?#!@ ░▒▓ reconnecting...", 0.8);
  } });

  add({ name: "hologram", label: "Hologram scan over the logo", dur: 3.2, front: (p) => api.withLogo("pc", () => {
    api.fx.pc.alpha = Math.min(api.fx.pc.alpha, 0.85 + 0.15 * Math.random());
    ctx.beginPath(); ctx.arc(0, 0, 296, 0, Math.PI * 2); ctx.clip();
    const y = lerp(-330, 330, ease(p)), a = fade(p, 0.1);
    const g = ctx.createLinearGradient(0, y - 120, 0, y + 8);
    g.addColorStop(0, `rgba(${TEAL},0)`); g.addColorStop(1, `rgba(${TEAL},${0.35 * a})`);
    ctx.fillStyle = g; ctx.fillRect(-300, y - 120, 600, 128);
    ctx.fillStyle = `rgba(220,255,240,${0.9 * a})`; ctx.fillRect(-300, y, 600, 5);
    ctx.fillStyle = `rgba(${TEAL},${0.08 * a})`;
    for (let k = -300; k < 300; k += 12) ctx.fillRect(-300, k, 600, 3);
  }) });

  add({ name: "radar", label: "Radar ping from the logo", dur: 3.6, back: (p) => inRight(() => {
    const { x, y } = api.logoPos("pc");
    ctx.lineWidth = 8;
    for (const off of [0, 0.2, 0.4]) {
      const q = (p - off) / 0.6; if (q <= 0 || q >= 1) continue;
      ctx.strokeStyle = `rgba(${CYAN},${0.6 * (1 - q)})`;
      ctx.beginPath(); ctx.arc(x, y, 300 + easeOut(q) * 1100, 0, Math.PI * 2); ctx.stroke();
    }
  }) });

  {
    const orbit = (p: number, e: number, front: boolean) => {
      const { x, y } = api.logoPos("pc"), a = fade(p, 0.12);
      for (let k = 0; k < 3; k++) {
        const tilt = (k * Math.PI) / 3 + 0.3;
        if (!front) {
          ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
          ctx.strokeStyle = `rgba(${TEAL},${0.28 * a})`; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(0, 0, 440, 130, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        }
        const an = e * 2.4 + k * 2.1;
        if ((Math.sin(an) > 0) !== front) continue;
        const ex = Math.cos(an) * 440, ey = Math.sin(an) * 130;
        lighter(() => dot(x + ex * Math.cos(tilt) - ey * Math.sin(tilt), y + ex * Math.sin(tilt) + ey * Math.cos(tilt), 30, k === 1 ? CYAN : TEAL, a));
      }
    };
    add({ name: "electrons", label: "Electrons orbit the logo", dur: 9, back: (p, e) => orbit(p, e, false), front: (p, e) => orbit(p, e, true) });
  }

  {
    let tr: Path | null = null;
    add({ name: "arc", label: "Electric arc crackles along a circuit", dur: 2.2, start: () => { tr = pick(api.traces.filter((t) => t.len > 600)) ?? pick(api.traces); },
      back: (p) => inRight(() => lighter(() => {
        if (!tr || Math.random() > 0.8) return;
        const pts: [number, number][] = [], reach = easeOut(p * 3) * tr.len;
        for (let d = 0; d <= reach; d += 36) {
          const [x, y] = api.pointAt(tr, d);
          pts.push([x + rand(-16, 16), y + rand(-16, 16)]);
        }
        if (pts.length < 2) return;
        const a = fade(p, 0.1);
        ctx.lineJoin = "round";
        ctx.strokeStyle = `rgba(${CYAN},${0.35 * a})`; ctx.lineWidth = 18; strokePath(pts);
        ctx.strokeStyle = `rgba(235,250,255,${0.95 * a})`; ctx.lineWidth = 4; strokePath(pts);
        const [ex, ey] = pts[pts.length - 1]; dot(ex, ey, 60, CYAN, a);
      })) });
  }

  add({ name: "readout", label: "System readout types out", dur: 8, front: (p, e) => {
    const x = 2810, y = 1300, w = 600, h = 270, a = fade(p, 0.08);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(8,14,22,.88)"; ctx.strokeStyle = `rgba(${CYAN},.55)`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 18); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = `rgb(${CYAN})`; ctx.lineWidth = 6;
    for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
      ctx.beginPath(); ctx.moveTo(cx, cy + sy * 34); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * 34, cy); ctx.stroke();
    }
    const lines = [
      `CPU    ${41 + Math.round(Math.sin(e * 3) * 2)}°C`,
      `GPU    ${38 + Math.round(Math.sin(e * 2.3 + 1) * 2)}°C`,
      `FANS   ${1180 + Math.round(Math.sin(e * 4) * 40)} rpm`,
      "STATUS ALL GOOD ✓",
    ];
    ctx.font = `700 40px ${api.mono}`; ctx.textBaseline = "top";
    const chars = Math.floor(clamp01((p - 0.06) / 0.4) * 64);
    let used = 0;
    lines.forEach((l, i) => {
      const n = Math.max(0, Math.min(l.length, chars - used)); used += l.length;
      ctx.fillStyle = i === 3 ? `rgb(${TEAL})` : "#d7e4f0";
      ctx.fillText(l.slice(0, n), x + 36, y + 30 + i * 56);
    });
    ctx.restore();
  } });

  {
    let splat: Particle[] = [], squashed = false;
    add({ name: "bug", label: "A bug gets squashed: \"bug fixed ✓\"", dur: 8, start: () => { splat = []; squashed = false; }, front: (p, e, dt) => {
      const bp = clamp01(p / 0.62);
      const bx = lerp(3720, 2930, easeOut(bp)) + Math.sin(e * 3) * 30 * (1 - bp), by = lerp(1680, 1560, bp) + Math.sin(e * 5) * 14 * (1 - bp);
      if (p < 0.7) {
        ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.PI + Math.sin(e * 6) * 0.15 - 0.2);
        ctx.strokeStyle = "#2a1a1a"; ctx.lineWidth = 4;
        for (const s of [-1, 1]) for (let k = -1; k <= 1; k++) {
          const w = Math.sin(e * 18 + k * 2 + (s > 0 ? 1 : 0)) * 6 * (bp < 1 ? 1 : 0);
          ctx.beginPath(); ctx.moveTo(k * 12, 0); ctx.lineTo(k * 14 + w, s * 30); ctx.stroke();
        }
        ctx.fillStyle = "#b8322f"; ctx.beginPath(); ctx.ellipse(0, 0, 28, 20, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#2a1a1a"; ctx.beginPath(); ctx.arc(30, 0, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(-1, -20, 2, 40);
        ctx.restore();
      } else if (!squashed) {
        squashed = true; api.bump("pc", 0.8);
        for (let k = 0; k < 24; k++) { const a = rand(0, 6.3), s = rand(150, 420); splat.push({ x: bx, y: by, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 0.6, r: rand(4, 9), col: "" }); }
      }
      if (p > 0.7) {
        stepParticles(splat, dt, 0);
        lighter(() => { for (const q of splat) dot(q.x, q.y, q.r * 3, CYAN, 1 - q.life / q.max); });
        const q = clamp01((p - 0.7) / 0.1);
        ctx.strokeStyle = `rgba(${CYAN},${1 - q})`; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(bx, by, 30 + q * 90, 0, Math.PI * 2); ctx.stroke();
        api.term("> bug fixed ✓", clamp01((1 - p) / 0.1));
      }
      // mouse pointer comes in to click it
      const cp = clamp01((p - 0.45) / 0.22);
      if (p > 0.45 && p < 0.95) {
        const cx = lerp(3500, bx + 10, easeOut(cp)), cy = lerp(950, by + 10, easeOut(cp)), click = p > 0.67 && p < 0.72 ? 0.85 : 1;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(2.4 * click, 2.4 * click); ctx.globalAlpha = clamp01((0.95 - p) / 0.08);
        ctx.fillStyle = "#fff"; ctx.strokeStyle = "#111"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 26); ctx.lineTo(7, 20); ctx.lineTo(12, 31); ctx.lineTo(16, 29); ctx.lineTo(11, 18); ctx.lineTo(20, 18); ctx.closePath();
        ctx.fill(); ctx.stroke(); ctx.restore();
      }
    } });
  }

  add({ name: "wifi", label: "Wi-Fi signal rings from the logo", dur: 4.5, front: (p) => {
    const { x, y } = api.logoPos("pc");
    ctx.lineCap = "round"; ctx.lineWidth = 16;
    for (let k = 0; k < 3; k++) {
      const q = clamp01((p - k * 0.12) / 0.2) * clamp01((1 - p) / 0.2);
      ctx.strokeStyle = `rgba(${TEAL},${q * 0.9})`; ctx.shadowColor = `rgba(${TEAL},.8)`; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(x, y, 340 + k * 60, Math.PI * 1.32, Math.PI * 1.68); ctx.stroke();
    }
    ctx.shadowBlur = 0;
  } });

  {
    let sp: Particle[] = [];
    add({ name: "sparks", label: "Spark burst from the logo", dur: 2.6,
      start: () => {
        sp = [];
        const { x, y } = api.logoPos("pc");
        for (let k = 0; k < 80; k++) {
          const a = rand(0, Math.PI * 2), s = rand(260, 700);
          sp.push({ x: x + Math.cos(a) * 295, y: y + Math.sin(a) * 295, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 200, life: 0, max: rand(0.8, 1.8), r: 0, col: pick([CYAN, TEAL, "255,255,255"]) });
        }
        api.bump("pc", 1);
      },
      front: (_p, _e, dt) => lighter(() => {
        stepParticles(sp, dt, 900);
        ctx.lineCap = "round"; ctx.lineWidth = 10;
        for (const q of sp) {
          const a = 1 - q.life / q.max;
          ctx.strokeStyle = `rgba(${q.col},${a})`;
          ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.06, q.y - q.vy * 0.06); ctx.stroke();
          dot(q.x, q.y, 22, q.col, a);
        }
      }) });
  }

  {
    const parts = [
      { from: [3980, 520], t0: 0, kind: "ram" }, { from: [3980, 2050], t0: 0.18, kind: "ssd" }, { from: [2700, 2350], t0: 0.36, kind: "fan" },
    ] as const;
    const arrived = [false, false, false];
    const drawPart = (kind: string, e: number) => {
      ctx.lineWidth = 4;
      if (kind === "ram") {
        ctx.fillStyle = "#1f6a3a"; ctx.fillRect(-150, -36, 300, 72);
        ctx.fillStyle = "#0b1017"; for (let k = 0; k < 6; k++) ctx.fillRect(-130 + k * 46, -22, 34, 36);
        ctx.fillStyle = "#e8c050"; for (let k = 0; k < 20; k++) ctx.fillRect(-140 + k * 14, 26, 8, 10);
      } else if (kind === "ssd") {
        ctx.fillStyle = "#1a2433"; ctx.strokeStyle = `rgb(${CYAN})`; ctx.beginPath(); ctx.roundRect(-110, -70, 220, 140, 14); ctx.fill(); ctx.stroke();
        ctx.fillStyle = `rgb(${CYAN})`; ctx.font = `700 34px ${api.mono}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("SSD", 0, 0); ctx.textAlign = "start";
      } else {
        ctx.fillStyle = "#1a2433"; ctx.strokeStyle = `rgb(${TEAL})`; ctx.beginPath(); ctx.roundRect(-90, -90, 180, 180, 18); ctx.fill(); ctx.stroke();
        ctx.save(); ctx.rotate(e * 12); ctx.fillStyle = `rgb(${TEAL})`;
        for (let k = 0; k < 7; k++) { ctx.rotate((Math.PI * 2) / 7); ctx.beginPath(); ctx.ellipse(36, 0, 36, 14, 0.5, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore(); ctx.fillStyle = "#0b1017"; ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
      }
    };
    add({ name: "parts", label: "PC parts fly in and plug into the logo", dur: 7, start: () => arrived.fill(false), front: (p, e) => {
      const { x: tx, y: ty } = api.logoPos("pc");
      parts.forEach((pt, i) => {
        const q = clamp01((p - pt.t0) / 0.45);
        if (q <= 0) return;
        if (q >= 1) { if (!arrived[i]) { arrived[i] = true; api.bump("pc", 0.9); } return; }
        const t = ease(q), x = lerp(pt.from[0], tx, t), y = lerp(pt.from[1], ty, t) - Math.sin(t * Math.PI) * 250;
        ctx.save(); ctx.translate(x, y); ctx.rotate((1 - t) * 1.2 * (i % 2 ? -1 : 1)); const s = lerp(1.7, 0.3, t * t); ctx.scale(s, s);
        ctx.shadowColor = `rgba(${TEAL},.6)`; ctx.shadowBlur = 24;
        drawPart(pt.kind, e);
        ctx.restore();
      });
    } });
  }

  add({ name: "neon", label: "Neon flicker behind \"PC\"", dur: 3, back: (p, e) => lighter(() => {
    const [x0, y0, x1, y1] = S.pcWord, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const flicker = p < 0.45 ? (hash(Math.floor(e * 16)) > 0.35 ? 1 : 0.15) : 1;
    const a = flicker * fade(p, 0.2);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1.4, 0.75);
    const g = ctx.createRadialGradient(0, 0, 40, 0, 0, 300);
    g.addColorStop(0, `rgba(${CYAN},${0.55 * a})`); g.addColorStop(1, `rgba(${CYAN},0)`);
    ctx.fillStyle = g; ctx.fillRect(-300, -300, 600, 600);
    ctx.restore();
  }) });

  add({ name: "gridripple", label: "Ripple through the circuit board", dur: 4, back: (p) => inRight(() => lighter(() => {
    const { x: cx, y: cy } = api.logoPos("pc"), R = 300 + easeOut(p) * 2600, a = fade(p, 0.1);
    const buckets: Path2D[] = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    const seg = (x0: number, y0: number, x1: number, y1: number) => {
      const d = Math.hypot((x0 + x1) / 2 - cx, (y0 + y1) / 2 - cy);
      const b = Math.exp(-Math.pow((d - R) / 140, 2));
      if (b < 0.08) return;
      const pth = buckets[Math.min(3, Math.floor(b * 4))]; pth.moveTo(x0, y0); pth.lineTo(x1, y1);
    };
    for (let x = 1760; x < FW; x += 80) for (let y = 0; y < FH; y += 80) { seg(x, y, x, y + 80); seg(x, y, x + 80, y); }
    ctx.lineWidth = 6;
    buckets.forEach((b, i) => { ctx.strokeStyle = `rgba(${CYAN},${((i + 1) / 4) * 0.95 * a})`; ctx.stroke(b); });
  })) });

  add({ name: "ecg", label: "Heartbeat line across the bottom", dur: 6, back: (p) => inRight(() => {
    const y0 = 2060, x0 = 1950, x1 = 3820, head = lerp(x0, x1 + 300, p);
    const wave = (x: number) => {
      const u = (((x - x0) % 470) + 470) % 470 / 470;
      return Math.exp(-Math.pow((u - 0.12) / 0.03, 2)) * -24 + Math.exp(-Math.pow((u - 0.3) / 0.012, 2)) * -150
        + Math.exp(-Math.pow((u - 0.34) / 0.014, 2)) * 60 + Math.exp(-Math.pow((u - 0.55) / 0.05, 2)) * -36;
    };
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    for (let x = Math.max(x0, head - 900); x < Math.min(head, x1); x += 6) {
      const a = clamp01(1 - (head - x) / 900) * fade(p, 0.08);
      ctx.strokeStyle = `rgba(${TEAL},${a})`; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(x, y0 + wave(x)); ctx.lineTo(x + 6, y0 + wave(x + 6)); ctx.stroke();
    }
    if (head < x1) lighter(() => dot(head, y0 + wave(head), 40, TEAL, fade(p, 0.08)));
    const u = (((head - x0) % 470) + 470) % 470 / 470;
    if (Math.abs(u - 0.3) < 0.01) api.bump("pc", 0.5);
  }) });

  // =====================================================================
  // BOTH SIDES / LINKING THE TWO
  // =====================================================================

  {
    const arrived = [false, false, false, false, false, false];
    const trailPts = (t: number) => Array.from({ length: 8 }, (_, k) => bridge(Math.max(0, t - k * 0.02)));
    add({ name: "packets", label: "Data packets fly between the logos", dur: 6, start: () => arrived.fill(false), front: (p, e) => lighter(() => {
      for (let i = 0; i < 6; i++) {
        const q = clamp01((p - i * 0.09) / 0.42);
        if (q <= 0) continue;
        if (q >= 1) { if (!arrived[i]) { arrived[i] = true; api.bump("lawn", 0.7); } continue; }
        const t = ease(q), [x, y] = bridge(t), onLawn = x < api.seamX(y), col = onLawn ? GREEN : TEAL;
        trailPts(t).forEach(([tx, ty], k) => dot(tx, ty, 22 - k * 2, col, 0.4 * (1 - k / 8)));
        ctx.save(); ctx.translate(x, y); ctx.rotate(e * 4 + i);
        ctx.fillStyle = `rgba(${col},1)`; ctx.shadowColor = `rgba(${col},1)`; ctx.shadowBlur = 24; ctx.fillRect(-15, -15, 30, 30);
        ctx.restore();
      }
    }) });
  }

  {
    let out = false, back = false;
    add({ name: "ping", label: "Ping: hanoverlawnco.com replies", dur: 7.5, start: () => { out = back = false; }, front: (p, e) => {
      const cmd = "> ping hanoverlawnco.com";
      if (p < 0.2) api.term(cmd.slice(0, Math.floor((p / 0.16) * cmd.length)));
      else if (p < 0.78) api.term(cmd);
      else api.term("> reply from hanoverlawnco.com: 12ms ✓", clamp01((1 - p) / 0.08));
      const go = (t: number, fromPc: boolean) => lighter(() => {
        const [x, y] = bridge(ease(t), fromPc), col = x < api.seamX(y) ? GREEN : TEAL;
        dot(x, y, 46, col, 1);
        ctx.save(); ctx.translate(x, y); ctx.rotate(e * 5); ctx.fillStyle = `rgb(${col})`; ctx.fillRect(-13, -13, 26, 26); ctx.restore();
      });
      if (p > 0.22 && p < 0.48) go((p - 0.22) / 0.26, true);
      if (p >= 0.48 && !out) { out = true; api.bump("lawn", 1); }
      if (p > 0.5 && p < 0.76) go((p - 0.5) / 0.26, false);
      if (p >= 0.76 && !back) { back = true; api.bump("pc", 1); }
    } });
  }

  {
    let splat: Particle[] = [], hit = false;
    add({ name: "snowball", label: "Snowball hits the PC logo", dur: 3.4, start: () => { splat = []; hit = false; }, front: (p, e, dt) => {
      const { x: tx, y: ty } = api.logoPos("pc");
      const q = clamp01(p / 0.42);
      if (q < 1) {
        const x = lerp(1700, tx - 60, q), y = lerp(330, ty - 80, q) - Math.sin(q * Math.PI) * 420;
        ctx.save(); ctx.translate(x, y); ctx.rotate(e * 6);
        ctx.fillStyle = "#f6fbff"; ctx.shadowColor = "rgba(150,190,230,.8)"; ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.arc(0, 0, 36, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(160,200,235,.6)"; ctx.beginPath(); ctx.arc(10, 10, 16, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {
        if (!hit) {
          hit = true;
          for (let k = 0; k < 50; k++) { const a = rand(Math.PI * 0.6, Math.PI * 1.9), s = rand(200, 700); splat.push({ x: tx - 60, y: ty - 80, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: rand(0.6, 1.3), r: rand(5, 14), col: "" }); }
        }
        const k = 1 - clamp01((p - 0.42) / 0.4);
        api.fx.pc.rot += Math.sin(e * 30) * 0.06 * k; api.fx.pc.dx += Math.sin(e * 37) * 14 * k;
        stepParticles(splat, dt, 1300);
        ctx.fillStyle = "#f6fbff";
        for (const s of splat) { ctx.globalAlpha = 1 - s.life / s.max; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
    } });
  }

  {
    let bits: Particle[] = [], burst = false;
    add({ name: "pixelleaf", label: "A leaf crosses the line and turns into pixels", dur: 9, start: () => { bits = []; burst = false; }, front: (p, e, dt) => {
      const q = clamp01(p / 0.8), x = lerp(900, 2800, q), y = lerp(800, 1250, q) + Math.sin(e * 2.2) * 70, rot = e * 1.3;
      if (q < 1) {
        if (x < api.seamX(y)) api.drawLeaf(x, y, 46, rot, e * 2.5, "#e8a032");
        else {
          ctx.save(); ctx.translate(x, y); ctx.rotate(Math.round(rot / (Math.PI / 4)) * (Math.PI / 4));
          const cells = [[-2, 0], [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 0], [0, 1], [1, -1], [1, 0], [1, 1], [2, 0], [-3, 0]];
          const dis = clamp01((q - 0.82) / 0.18);
          cells.forEach(([cx, cy], k) => {
            ctx.fillStyle = k % 3 ? `rgb(${TEAL})` : `rgb(${CYAN})`;
            ctx.globalAlpha = 1 - dis * hash(k + 3);
            ctx.fillRect(cx * 20 - 9, cy * 20 - 9, 18, 18);
          });
          ctx.restore(); ctx.globalAlpha = 1;
        }
      } else if (!burst) {
        burst = true;
        for (let k = 0; k < 26; k++) bits.push({ x: x + rand(-40, 40), y: y + rand(-30, 30), vx: rand(-80, 80), vy: rand(-260, -90), life: 0, max: rand(0.8, 1.6), r: 0, col: pick([TEAL, CYAN]) });
      }
      stepParticles(bits, dt, 0);
      ctx.font = `700 36px ${api.mono}`;
      for (const b of bits) { ctx.fillStyle = `rgba(${b.col},${1 - b.life / b.max})`; ctx.fillText(hash(b.vx) > 0.5 ? "1" : "0", b.x, b.y); }
    } });
  }

  {
    const stars = Array.from({ length: 80 }, () => ({ x: rand(0, FW), y: rand(0, 900), ph: rand(0, 6), r: rand(2, 5) }));
    let moon: HTMLCanvasElement | null = null;
    const makeMoon = () => {
      const c = document.createElement("canvas"); c.width = c.height = 260;
      const g = c.getContext("2d")!;
      g.shadowColor = "rgba(255,250,220,.9)"; g.shadowBlur = 30;
      g.fillStyle = "#fffbe8"; g.beginPath(); g.arc(130, 130, 90, 0, Math.PI * 2); g.fill();
      g.shadowBlur = 0; g.globalCompositeOperation = "destination-out";
      g.beginPath(); g.arc(170, 105, 82, 0, Math.PI * 2); g.fill();
      return c;
    };
    add({ name: "dusk", label: "Dusk: stars and a moon come out, then dawn", dur: 14, back: (p, e) => {
      const night = bell(p) ** 0.7;
      overlay(`rgba(6,10,32,${0.55 * night})`);
      lighter(() => { for (const s of stars) dot(s.x, s.y, s.r * 5, "255,255,240", night * (0.5 + 0.5 * Math.sin(e * 2 + s.ph))); });
      moon ??= makeMoon();
      ctx.globalAlpha = night; ctx.drawImage(moon, 1500 - 130, 230 - 130 - night * 40); ctx.globalAlpha = 1;
      api.bump("pc", 0.25 * night); api.bump("lawn", 0.25 * night);
    } });
  }

  {
    type Bit = Particle & { w: number; flip: number };
    let bits: Bit[] = [];
    const cols = ["#8fd18a", "#38bdf8", "#3dd09b", "#e8a032", "#ffffff", "#d67828", "#f472b6"];
    add({ name: "confetti", label: "Confetti", dur: 7, start: () => { bits = []; }, front: (p, _e, dt) => {
      if (p < 0.3) for (let k = Math.round(260 * dt + Math.random()); k > 0; k--) {
        bits.push({ x: rand(0, FW), y: rand(-120, -20), vx: rand(-80, 80), vy: rand(250, 520), life: 0, max: 6, r: 0, col: pick(cols), rot: rand(0, 6), spin: rand(-6, 6), w: rand(14, 24), flip: rand(0, 6) });
      }
      for (const b of bits) b.flip += dt * 8;
      stepParticles(bits, dt, 60);
      bits = bits.filter((b) => b.y < FH + 40);
      ctx.globalAlpha = clamp01((1 - p) / 0.15);
      for (const b of bits) {
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot ?? 0); ctx.scale(1, Math.cos(b.flip));
        ctx.fillStyle = b.col; ctx.fillRect(-b.w / 2, -6, b.w, 12); ctx.restore();
      }
      ctx.globalAlpha = 1;
    } });
  }

  {
    const rockets: { x: number; t0: number; peak: number; col: string; done: boolean }[] = [];
    let sparks: Particle[] = [];
    add({ name: "fireworks", label: "Fireworks", dur: 8,
      start: () => {
        sparks = []; rockets.length = 0;
        [[650, 0, GREEN], [3050, 0.13, CYAN], [1400, 0.27, "232,160,50"], [3500, 0.4, TEAL], [950, 0.52, "255,255,255"], [2600, 0.6, CYAN]]
          .forEach(([x, t0, col]) => rockets.push({ x: (x as number) + rand(-80, 80), t0: t0 as number, peak: rand(280, 650), col: col as string, done: false }));
      },
      back: (p, e, dt) => lighter(() => {
        for (const r of rockets) {
          const q = (p - r.t0) / 0.1;
          if (q < 0) continue;
          if (q < 1) {
            const y = lerp(2150, r.peak, easeOut(q));
            ctx.strokeStyle = `rgba(${r.col},.6)`; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(r.x, y); ctx.lineTo(r.x, y + 120); ctx.stroke();
            dot(r.x, y, 22, r.col, 1);
          } else if (!r.done) {
            r.done = true;
            for (let k = 0; k < 70; k++) { const a = (k / 70) * Math.PI * 2, s = rand(380, 560); sparks.push({ x: r.x, y: r.peak, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: rand(1.2, 1.8), r: 0, col: r.col }); }
          }
        }
        stepParticles(sparks, dt, 260);
        for (const s of sparks) { s.vx *= 0.985; s.vy *= 0.985; dot(s.x, s.y, 16 + Math.sin(e * 30 + s.vx) * 3, s.col, 1 - s.life / s.max); }
      }) });
  }

  {
    type Bub = { x: number; y: number; r: number; vy: number; ph: number; t0: number; pop: number };
    let bubs: Bub[] = [];
    add({ name: "bubbles", label: "Soap bubbles float up", dur: 11,
      start: () => { bubs = Array.from({ length: 26 }, () => ({ x: rand(100, FW - 100), y: rand(2180, 2400), r: rand(22, 58), vy: rand(-230, -130), ph: rand(0, 6), t0: rand(0, 0.4), pop: rand(200, 1400) })); },
      back: (p, e, dt) => {
        for (const b of bubs) {
          if (p < b.t0) continue;
          b.y += b.vy * dt;
          const x = b.x + Math.sin(e * 1.3 + b.ph) * 40;
          if (b.y < b.pop) { if (b.y > b.pop - 40) { ctx.strokeStyle = `rgba(255,255,255,${(b.y - b.pop + 40) / 40})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, b.y, b.r * 1.3, 0, Math.PI * 2); ctx.stroke(); } continue; }
          const g = ctx.createRadialGradient(x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.1, x, b.y, b.r);
          g.addColorStop(0, "rgba(255,255,255,.05)"); g.addColorStop(0.75, `hsla(${(e * 60 + b.ph * 50) % 360},90%,75%,.12)`); g.addColorStop(1, "rgba(255,255,255,.45)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.beginPath(); ctx.ellipse(x - b.r * 0.4, b.y - b.r * 0.45, b.r * 0.2, b.r * 0.1, -0.6, 0, Math.PI * 2); ctx.fill();
        }
      } });
  }

  add({ name: "pills", label: "The pill buttons light up one by one", dur: 4, back: (p) => {
    const lawn = S.pills.slice(0, 5), pc = S.pills.slice(5).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    [...lawn.map((r) => [r, GREEN] as const), ...pc.map((r) => [r, CYAN] as const)].forEach(([[x0, y0, x1, y1], col], i) => {
      const a = bell((p - (i % 5) * 0.09) / 0.42);
      if (a <= 0) return;
      ctx.save(); ctx.shadowColor = `rgba(${col},1)`; ctx.shadowBlur = 50 * a;
      ctx.fillStyle = `rgba(${col},${0.6 * a})`; ctx.beginPath(); ctx.roundRect(x0 - 6, y0 - 6, x1 - x0 + 12, y1 - y0 + 12, 47); ctx.fill();
      ctx.restore();
    });
  } });

  add({ name: "heartbeat", label: "Both logos beat like a heart", dur: 4.4, back: (p, e) => {
    const u = e % 1.1, beat = Math.exp(-Math.pow(u / 0.06, 2)) + 0.7 * Math.exp(-Math.pow((u - 0.25) / 0.06, 2));
    const a = fade(p, 0.1);
    api.fx.lawn.scale += 0.05 * beat * a; api.fx.pc.scale += 0.05 * beat * a;
    for (const [w, col] of [["lawn", GREEN], ["pc", TEAL]] as const) {
      const { x, y } = api.logoPos(w), r = 300 + (u / 1.1) * 320;
      ctx.strokeStyle = `rgba(${col},${0.5 * (1 - u / 1.1) * a})`; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    }
  } });

  {
    const trail: [number, number][] = [];
    const at = (s: number) => {
      const u = clamp01((s - 0.42) / 0.16), th = u * Math.PI * 2;
      return [-250 + 4400 * s + 230 * Math.sin(th), 780 + Math.sin(s * 5) * 90 - 230 * (1 - Math.cos(th))] as const;
    };
    add({ name: "plane", label: "Paper airplane loops across", dur: 9, start: () => { trail.length = 0; }, front: (p) => {
      const [x, y] = at(p), [nx, ny] = at(p + 0.002), ang = Math.atan2(ny - y, nx - x);
      trail.push([x, y]); if (trail.length > 70) trail.shift();
      ctx.setLineDash([14, 18]); ctx.strokeStyle = "rgba(255,255,255,.4)"; ctx.lineWidth = 4;
      if (trail.length > 1) strokePath(trail);
      ctx.setLineDash([]);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(3.2, 3.2);
      ctx.fillStyle = "#f8fafc"; ctx.beginPath(); ctx.moveTo(32, 0); ctx.lineTo(-26, -20); ctx.lineTo(-12, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#cbd5e1"; ctx.beginPath(); ctx.moveTo(32, 0); ctx.lineTo(-26, 16); ctx.lineTo(-12, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
    } });
  }

  add({ name: "ufo", label: "A UFO beams up a leaf", dur: 11, front: (p, e) => {
    let x: number, y: number;
    if (p < 0.25) { const q = ease(p / 0.25); x = lerp(2400, 520, q); y = lerp(-180, 1340, q); }
    else if (p < 0.72) { x = 520 + Math.sin(e * 1.5) * 20; y = 1340 + Math.sin(e * 2) * 12; }
    else { const q = ease((p - 0.72) / 0.28); x = lerp(520, -400, q); y = lerp(1340, 900, q); }
    if (p > 0.27 && p < 0.7) {
      const a = clamp01((p - 0.27) / 0.04) * clamp01((0.7 - p) / 0.04);
      const g = ctx.createLinearGradient(0, y, 0, 2080);
      g.addColorStop(0, `rgba(200,255,170,${0.45 * a})`); g.addColorStop(1, `rgba(200,255,170,${0.08 * a})`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 60, y + 30); ctx.lineTo(x + 60, y + 30); ctx.lineTo(x + 170, 2080); ctx.lineTo(x - 170, 2080); ctx.closePath(); ctx.fill();
      const lq = clamp01((p - 0.32) / 0.33);
      if (lq < 1) api.drawLeaf(x + Math.sin(e * 3) * 40, lerp(2020, y + 60, ease(lq)), 34, e * 3, e * 4, "#d67828");
    }
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(e * 2) * 0.06);
    ctx.fillStyle = "rgba(140,230,255,.75)"; ctx.beginPath(); ctx.ellipse(0, -28, 70, 56, 0, Math.PI, 0); ctx.fill();
    const g2 = ctx.createLinearGradient(0, -30, 0, 40);
    g2.addColorStop(0, "#e5ebf0"); g2.addColorStop(1, "#7d8a96");
    ctx.fillStyle = g2; ctx.beginPath(); ctx.ellipse(0, 0, 170, 42, 0, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 6; k++) {
      const on = (Math.floor(e * 6) + k) % 3 === 0;
      ctx.fillStyle = on ? "#fde68a" : "#64748b"; ctx.beginPath(); ctx.arc(-125 + k * 50, 8, 9, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  } });

  {
    const ms = Array.from({ length: 10 }, () => ({ x: 0, y: 0, t0: 0 }));
    add({ name: "meteors", label: "Meteor shower", dur: 5.5,
      start: () => ms.forEach((m) => Object.assign(m, { x: rand(500, FW + 300), y: rand(-100, 300), t0: rand(0, 0.7) })),
      back: (p, _e) => lighter(() => {
        ctx.lineCap = "round";
        for (const m of ms) {
          const q = (p - m.t0) / 0.18; if (q < 0 || q > 1) continue;
          const x = m.x - q * 1400, y = m.y + q * 950, tx = x + 330, ty = y - 225;
          const g = ctx.createLinearGradient(tx, ty, x, y);
          g.addColorStop(0, "rgba(255,240,220,0)"); g.addColorStop(1, `rgba(255,240,220,${0.9 * bell(q)})`);
          ctx.strokeStyle = g; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
          dot(x, y, 26, "255,230,200", bell(q));
        }
      }) });
  }

  return events;
}

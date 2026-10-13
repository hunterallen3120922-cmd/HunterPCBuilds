import { useEffect, useRef, useState } from "react";
import { showcase as S } from "./showcaseData";

/**
 * Animated full-screen showcase (Hanover Lawn Co | HunterPCBuilds) for a projector or video calls.
 * Opened from the "Showcase" button in the admin bar. Press Esc (or the × in the corner) to leave.
 *
 * Most of the time it's calm: the logos float and sway, a few leaves and snowflakes drift, and now and
 * then a pulse of light runs along a circuit. Every so often (EVENT_GAP seconds) one "event" plays:
 *   1 gust     - a gust of wind blows a swirl of leaves across the lawn side
 *   2 flurry   - a short snow flurry, and the big snowflakes spin
 *   3 surge    - a power surge: every circuit lights up from the PC logo outward
 *   4 spin     - one of the logos hops and spins
 *   5 glint    - a flash of light runs down the dividing line and both logos glow
 *   6 mower    - a little mower drives across the grass
 *   7 terminal - a new line types itself under "get a quote fast"
 * Press the number keys 1-7 while it's open to play one right away.
 *
 * Layers, back to front: plate.webp (background art) → <canvas> (everything that moves) → text.webp (words).
 * The art lives in app/public/showcase/; positions the canvas uses are in showcaseData.ts.
 */

const dir = `${import.meta.env.BASE_URL}showcase/`;
const [FW, FH] = S.size;
const [SEAM_TOP, SEAM_BOT] = S.seam;
const seamX = (y: number) => SEAM_TOP + ((SEAM_BOT - SEAM_TOP) * y) / FH;

// ---- tuning ----
const LEAVES = 9;             // leaves always drifting down
const SNOW = 24;              // snow specks always drifting in the winter corner
const PULSE_EVERY = 2.6;      // seconds between calm circuit pulses (on average)
const EVENT_GAP: [number, number] = [20, 40];   // seconds between events (random in this range)
const FIRST_EVENT = 8;        // seconds until the first event
const TERMINAL_LINES = ["> all systems online ✓", "> running diagnostics... ok", "> new build queued", "> fans spinning up...", "> drivers updated ✓"];
const LEAF_COLORS = ["#d67828", "#e8a032", "#be5028", "#c88c2d", "#aa4623"];

const EVENTS = { gust: 6, flurry: 9, surge: 2.8, spin: 1.8, glint: 2.4, mower: 10, terminal: 7 } as const; // name: seconds
type EventName = keyof typeof EVENTS;
const EVENT_KEYS = Object.keys(EVENTS) as EventName[];

type Pt = readonly [number, number];
type Path = { pts: Pt[]; cum: number[]; len: number };
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const bell = (p: number) => Math.sin(Math.PI * clamp01(p)); // 0 → 1 → 0

function makePath(pts: readonly (readonly number[])[]): Path {
  const p = pts.map((q) => [q[0], q[1]] as const);
  const cum = [0];
  for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  return { pts: p, cum, len: cum[cum.length - 1] };
}
function pointAt(path: Path, d: number): Pt {
  d = Math.max(0, Math.min(path.len, d));
  let i = 1;
  while (i < path.cum.length - 1 && path.cum[i] < d) i++;
  const seg = path.cum[i] - path.cum[i - 1] || 1;
  const t = (d - path.cum[i - 1]) / seg;
  const [ax, ay] = path.pts[i - 1], [bx, by] = path.pts[i];
  return [ax + (bx - ax) * t, ay + (by - ay) * t];
}
/** Pulses fade out as they pass under the text blocks. */
function quietFade(x: number, y: number) {
  let f = 1;
  for (const [x0, y0, x1, y1] of S.quiet) {
    const dx = Math.max(x0 - x, 0, x - x1), dy = Math.max(y0 - y, 0, y - y1);
    f = Math.min(f, clamp01(Math.hypot(dx, dy) / 160));
  }
  return f;
}

function sprite(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = Math.ceil(w); c.height = Math.ceil(h);
  draw(c.getContext("2d")!);
  return c;
}
function flakeSprite(r: number, alpha: number) {
  const pad = 30, s = r * 2 + pad * 2, w = Math.max(5, Math.floor(r / 12));
  return sprite(s, s, (c) => {
    c.translate(s / 2, s / 2);
    c.strokeStyle = `rgba(240,248,255,${alpha})`;
    c.lineWidth = w; c.lineCap = "round";
    c.shadowColor = "rgba(255,255,255,.8)"; c.shadowBlur = 14;
    for (let k = 0; k < 6; k++) {
      c.save(); c.rotate((k * Math.PI) / 3);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(r, 0);
      for (const [f, L] of [[0.45, 0.32], [0.7, 0.22]]) {
        for (const s_ of [-1, 1]) {
          c.moveTo(r * f, 0); c.lineTo(r * f + r * L * Math.cos(s_ * Math.PI / 4), r * L * Math.sin(s_ * Math.PI / 4));
        }
      }
      c.stroke(); c.restore();
    }
  });
}
function logoSprite(img: HTMLImageElement, size: number, glow: string, blur: number, dy: number) {
  const pad = 140;
  return sprite(size + pad * 2, size + pad * 2, (c) => {
    c.shadowColor = glow; c.shadowBlur = blur; c.shadowOffsetY = dy;
    c.drawImage(img, pad, pad, size, size);
  });
}
function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src;
  });
}

export default function Showcase({ onClose }: { onClose: () => void }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [idle, setIdle] = useState(false);

  // Leave when fullscreen ends (Esc), on Esc key, and keep the screen awake while showing
  useEffect(() => {
    let wasFull = !!document.fullscreenElement;
    const onFs = () => {
      if (document.fullscreenElement) wasFull = true;
      else if (wasFull) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("fullscreenchange", onFs);
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let lock: { release: () => Promise<void> } | undefined;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => {});
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      lock?.release().catch(() => {});
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [onClose]);

  // Hide the mouse pointer and the close button when the mouse sits still
  useEffect(() => {
    let timer = window.setTimeout(() => setIdle(true), 2500);
    const wake = () => { setIdle(false); clearTimeout(timer); timer = window.setTimeout(() => setIdle(true), 2500); };
    window.addEventListener("mousemove", wake);
    return () => { clearTimeout(timer); window.removeEventListener("mousemove", wake); };
  }, []);

  // The animation
  useEffect(() => {
    const canvas = canvasRef.current!, frame = frameRef.current!;
    const ctx = canvas.getContext("2d")!;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, stopped = false, scale = 1;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.min(FW, Math.round(frame.clientWidth * dpr));
      canvas.width = w; canvas.height = Math.round((w * FH) / FW);
      scale = w / FW;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(frame); resize();

    const leftClip = new Path2D();
    leftClip.moveTo(0, 0); leftClip.lineTo(SEAM_TOP - 4, 0); leftClip.lineTo(SEAM_BOT - 4, FH); leftClip.lineTo(0, FH); leftClip.closePath();

    // ---- events ----
    let t = 0;
    let ev: { name: EventName; t0: number; dur: number; data: { logo?: "lawn" | "pc"; line?: string } } | null = null;
    let nextEvent = FIRST_EVENT, lastEvent: EventName | null = null;
    const startEvent = (name: EventName) => {
      ev = { name, t0: t, dur: EVENTS[name], data: {} };
      lastEvent = name;
      if (name === "spin") ev.data.logo = Math.random() < 0.5 ? "lawn" : "pc";
      if (name === "terminal") ev.data.line = pick(TERMINAL_LINES);
      if (name === "gust") for (let i = 0; i < 26; i++) gustLeaves.push(newGustLeaf());
      if (name === "surge") {
        for (const tr of traces) {
          const [ax, ay] = tr.pts[0], [bx, by] = tr.pts[tr.pts.length - 1];
          const rev = Math.hypot(bx - px, by - py) < Math.hypot(ax - px, ay - py); // start at the end nearest the logo
          pulses.push({ path: tr, rev, d: -rand(0, 260), speed: rand(1000, 1300), teal: false });
        }
        for (const r of radial) pulses.push({ path: r, rev: true, d: 0, speed: 900, teal: true });
        pcBump = 1;
      }
    };
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= EVENT_KEYS.length) { startEvent(EVENT_KEYS[n - 1]); nextEvent = t + rand(...EVENT_GAP); }
    };
    window.addEventListener("keydown", onKey);
    const evP = (name: EventName) => (ev && ev.name === name ? clamp01((t - ev.t0) / ev.dur) : -1);

    // ---- leaves ----
    type Leaf = { x: number; y: number; vx: number; size: number; col: string; rot: number; spin: number; flip: number; flipSpd: number; fall: number; amp: number; freq: number; ph: number };
    const newLeaf = (y?: number): Leaf => ({
      x: rand(80, 1900), y: y ?? rand(-160, -60), vx: 0, size: rand(24, 40), col: pick(LEAF_COLORS),
      rot: rand(0, Math.PI * 2), spin: rand(-0.6, 0.6), flip: rand(0, 6), flipSpd: rand(0.7, 1.8),
      fall: rand(55, 110), amp: rand(40, 100), freq: rand(0.35, 0.8), ph: rand(0, 6),
    });
    const newGustLeaf = (): Leaf => ({ ...newLeaf(rand(150, 1850)), x: rand(-700, -60), vx: rand(650, 1000), fall: rand(-40, 60), spin: rand(-4, 4), flipSpd: rand(3, 6), amp: rand(60, 160), freq: rand(1.5, 3) });
    const leaves = Array.from({ length: LEAVES }, () => newLeaf(rand(-100, 2000)));
    const gustLeaves: Leaf[] = [];

    // ---- snow ----
    type Speck = { x: number; y: number; r: number; a: number; fall: number; ph: number; floor: number };
    const newSpeck = (y?: number): Speck => ({ x: rand(1150, 2010), y: y ?? rand(-40, -10), r: rand(4, 10), a: rand(0.35, 0.8), fall: rand(35, 75), ph: rand(0, 6), floor: 820 });
    const specks = Array.from({ length: SNOW }, () => newSpeck(rand(-40, 800)));
    const flurry: Speck[] = [];
    const flakes = S.flakes.map(([x, y, r, a]) => ({ x, y, r, spr: flakeSprite(r, a / 255), rot: rand(0, 1), spin: rand(-0.15, 0.15), ph: rand(0, 6) }));

    // ---- circuit pulses ----
    const traces = S.traces.map(makePath);
    const radial = S.radial.map(makePath);
    type Pulse = { path: Path; rev: boolean; d: number; speed: number; teal: boolean };
    const pulses: Pulse[] = [];
    const flashes: { x: number; y: number; t: number }[] = [];
    let nextPulse = 1.5, nextRadial = 3;
    let pcBump = 0, lawnBump = 0;
    const headSprite = (rgb: string) => sprite(80, 80, (c) => {
      const g = c.createRadialGradient(40, 40, 0, 40, 40, 40);
      g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.18, `rgba(${rgb},1)`); g.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = g; c.fillRect(0, 0, 80, 80);
    });
    const headCyan = headSprite("56,189,248"), headTeal = headSprite("61,208,155");

    // ---- mower clippings ----
    const clips: { x: number; y: number; vx: number; vy: number; life: number }[] = [];

    // ---- logos ----
    let lawnSpr: HTMLCanvasElement | null = null, pcSpr: HTMLCanvasElement | null = null;
    const [lx, ly] = S.logoLawn, [px, py] = S.logoPc;
    Promise.all([loadImg(`${dir}lawnco-logo.png`), loadImg(`${dir}pcbuilds-logo.png`)]).then(([a, b]) => {
      lawnSpr = logoSprite(a, S.logoLawn[2], "rgba(0,0,0,.6)", 40, 16);
      pcSpr = logoSprite(b, S.logoPc[2], "rgba(56,220,160,.5)", 40, 10);
      if (still) draw(0);
    }).catch(() => {});

    const drawLeaf = (l: Leaf, x: number) => {
      ctx.save();
      ctx.translate(x, l.y); ctx.rotate(l.rot); ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(l.flip)));
      const L = l.size, wd = l.size * 0.5;
      ctx.beginPath();
      ctx.moveTo(-L, 0);
      ctx.bezierCurveTo(-L * 0.4, -wd * 1.2, L * 0.5, -wd * 0.9, L, 0);
      ctx.bezierCurveTo(L * 0.5, wd * 0.9, -L * 0.4, wd * 1.2, -L, 0);
      ctx.fillStyle = l.col; ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.28)"; ctx.lineWidth = Math.max(2, L / 9);
      ctx.beginPath(); ctx.moveTo(-L * 1.25, 0); ctx.lineTo(L * 0.95, 0); ctx.stroke();
      ctx.restore();
    };
    const drawMower = (x: number, y: number, bounce: number) => {
      ctx.save(); ctx.translate(x, y + bounce); ctx.scale(1.6, 1.6);
      ctx.fillStyle = "#8fd18a"; ctx.strokeStyle = "#8fd18a"; ctx.lineCap = "round";
      ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(-40, -20); ctx.lineTo(-110, -95); ctx.stroke();   // handle (trailing)
      ctx.beginPath(); ctx.moveTo(-135, -95); ctx.lineTo(-90, -95); ctx.stroke();                       // grip
      ctx.beginPath(); ctx.ellipse(10, -10, 95, 62, 0, Math.PI, 0); ctx.fill();                          // deck dome
      ctx.fillRect(-90, -16, 200, 22);                                                                     // deck base
      ctx.fillStyle = "#1a3d1f";
      ctx.beginPath(); ctx.arc(-20, -45, 10, 0, Math.PI * 2); ctx.fill();                                   // engine cap
      for (const wx of [-55, 75]) {
        ctx.fillStyle = "#8fd18a"; ctx.beginPath(); ctx.arc(wx, 14, 26, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#1a3d1f"; ctx.beginPath(); ctx.arc(wx, 14, 10, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    };

    function draw(dt: number) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);

      // pick the next event
      if (ev && t - ev.t0 > ev.dur) ev = null;
      if (!ev && t >= nextEvent && !still) {
        startEvent(pick(EVENT_KEYS.filter((k) => k !== lastEvent)));
        nextEvent = t + rand(...EVENT_GAP);
      }
      const gust = evP("gust"), fl = evP("flurry"), glint = evP("glint"), mower = evP("mower"), term = evP("terminal"), spin = evP("spin"), surge = evP("surge");
      const wind = gust >= 0 ? bell(gust) : 0;
      if (glint >= 0 && glint > 0.35) { pcBump = Math.max(pcBump, bell((glint - 0.35) / 0.65)); lawnBump = Math.max(lawnBump, bell((glint - 0.35) / 0.65)); }
      pcBump = Math.max(0, pcBump - dt * 1.4); lawnBump = Math.max(0, lawnBump - dt * 1.4);

      // soft glow behind each logo
      const breathe = (x: number, y: number, r: number, rgb: string, a: number) => {
        const g = ctx.createRadialGradient(x, y, r * 0.3, x, y, r);
        g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      };
      ctx.save(); ctx.clip(leftClip);
      breathe(lx, ly, 520, "190,240,180", 0.09 + 0.05 * Math.sin(t * 0.5) + 0.18 * lawnBump);
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      breathe(px, py, 520, "61,208,155", 0.07 + 0.04 * Math.sin(t * 0.6 + 1) + 0.16 * pcBump);
      if (surge >= 0) {   // shockwave ring
        const r = 320 + ease(surge) * 900;
        ctx.strokeStyle = `rgba(61,208,155,${0.55 * (1 - surge)})`; ctx.lineWidth = 14;
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();

      // ---- left side (kept on the lawn side of the line) ----
      ctx.save(); ctx.clip(leftClip);
      for (const l of leaves) {
        l.y += l.fall * dt; l.rot += l.spin * dt * (1 + wind * 4); l.flip += l.flipSpd * dt * (1 + wind * 2);
        l.vx += (wind * 500 - l.vx) * Math.min(1, dt * 2);   // the gust pushes the drifting leaves too
        l.x += l.vx * dt;
        const x = l.x + Math.sin(t * l.freq + l.ph) * l.amp;
        if (l.y > 2100 || x > seamX(l.y) + 60) Object.assign(l, newLeaf());
        ctx.globalAlpha = clamp01((l.y + 60) / 120) * clamp01((2050 - l.y) / 180) * 0.92;
        drawLeaf(l, x);
      }
      for (let i = gustLeaves.length - 1; i >= 0; i--) {
        const l = gustLeaves[i];
        l.x += l.vx * dt * (0.35 + wind); l.y += l.fall * dt + Math.cos(t * l.freq + l.ph) * l.amp * dt;
        l.rot += l.spin * dt; l.flip += l.flipSpd * dt;
        if (l.x > seamX(l.y) + 80 || l.y > 2150 || (gust < 0 && l.x < -40)) { gustLeaves.splice(i, 1); continue; }
        ctx.globalAlpha = 0.95; drawLeaf(l, l.x);
      }
      ctx.globalAlpha = 1;

      if (fl >= 0 && fl < 0.75) for (let k = Math.round(70 * dt + Math.random() - 0.5); k > 0; k--) {
        flurry.push({ x: rand(-40, 2000), y: rand(-60, -10), r: rand(4, 12), a: rand(0.5, 0.95), fall: rand(140, 260), ph: rand(0, 6), floor: 2120 });
      }
      ctx.fillStyle = "#fff";
      for (const arr of [specks, flurry]) {
        for (let i = arr.length - 1; i >= 0; i--) {
          const s = arr[i];
          s.y += s.fall * dt;
          if (s.y > s.floor) { if (arr === specks) Object.assign(s, newSpeck()); else arr.splice(i, 1); continue; }
          const x = s.x + Math.sin(t * 0.8 + s.ph) * 22 + wind * (s.y * 0.15);
          ctx.globalAlpha = s.a * clamp01((s.floor - s.y) / 260);
          ctx.beginPath(); ctx.arc(x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      const flakeSpin = 1 + (fl >= 0 ? bell(fl) * 10 : 0);
      for (const f of flakes) {
        f.rot += f.spin * dt * flakeSpin;
        const s = f.spr.width;
        ctx.save();
        ctx.translate(f.x, f.y + Math.sin(t * 0.5 + f.ph) * 8);
        ctx.rotate(f.rot);
        ctx.drawImage(f.spr, -s / 2, -s / 2);
        ctx.restore();
      }

      if (mower >= 0) {
        const x = -320 + mower * 2320, y = 2068;
        if (Math.random() < 0.9) for (let k = 0; k < 2; k++) clips.push({ x: x - 130, y: y + 20, vx: rand(-260, -80), vy: rand(-320, -140), life: 0 });
        drawMower(x, y, Math.sin(t * 22) * 3);
      }
      ctx.fillStyle = "#6fbf6a";
      for (let i = clips.length - 1; i >= 0; i--) {
        const c = clips[i];
        c.life += dt; c.vy += 900 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
        if (c.life > 0.8) { clips.splice(i, 1); continue; }
        ctx.globalAlpha = 1 - c.life / 0.8;
        ctx.fillRect(c.x, c.y, 8, 4);
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // ---- right side: pulses of light along the circuits ----
      nextPulse -= dt; nextRadial -= dt;
      if (nextPulse <= 0 && traces.length) {
        pulses.push({ path: pick(traces), rev: Math.random() < 0.5, d: 0, speed: rand(420, 650), teal: false });
        nextPulse = rand(PULSE_EVERY * 0.5, PULSE_EVERY * 1.5);
      }
      if (nextRadial <= 0) {
        pulses.push({ path: pick(radial), rev: false, d: 0, speed: rand(380, 480), teal: true });
        nextRadial = rand(4, 8);
      }
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.d += p.speed * dt;
        const at = (d: number) => pointAt(p.path, p.rev ? p.path.len - d : d);
        const tail = 180, steps = 8;
        for (let k = 0; k < steps; k++) {
          const d0 = p.d - tail + (tail * k) / steps, d1 = d0 + tail / steps;
          if (d1 < 0 || d0 > p.path.len) continue;
          const [x0, y0] = at(Math.max(0, d0)), [x1, y1] = at(Math.min(p.path.len, d1));
          const q = p.teal ? 1 : quietFade(x1, y1);
          ctx.strokeStyle = p.teal ? `rgba(61,208,155,${(0.75 * (k + 1)) / steps * q})` : `rgba(56,189,248,${(0.7 * (k + 1)) / steps * q})`;
          ctx.lineWidth = 7;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        }
        if (p.d >= 0 && p.d <= p.path.len) {
          const [hx, hy] = at(p.d);
          ctx.globalAlpha = p.teal ? 1 : quietFade(hx, hy);
          ctx.drawImage(p.teal ? headTeal : headCyan, hx - 40, hy - 40);
          ctx.globalAlpha = 1;
        }
        if (p.d > p.path.len + tail) {
          const [ex, ey] = at(p.path.len);
          if (p.teal && !p.rev) pcBump = Math.max(pcBump, 0.6); else flashes.push({ x: ex, y: ey, t: 0 });
          pulses.splice(i, 1);
        }
      }
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i]; f.t += dt;
        const a = clamp01(1 - f.t / 0.6) * quietFade(f.x, f.y);
        ctx.strokeStyle = `rgba(56,189,248,${a})`; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(f.x, f.y, 12 + f.t * 40, 0, Math.PI * 2); ctx.stroke();
        if (f.t > 0.6) flashes.splice(i, 1);
      }

      // light running down the dividing line
      if (glint >= 0) {
        const y = -300 + ease(glint) * (FH + 600), x = seamX(y);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 260);
        g.addColorStop(0, "rgba(255,255,255,.9)"); g.addColorStop(0.2, "rgba(200,255,230,.45)"); g.addColorStop(1, "rgba(200,255,230,0)");
        ctx.fillStyle = g; ctx.fillRect(x - 260, y - 260, 520, 520);
      }
      ctx.restore();

      // ---- logos: always floating and swaying ----
      const logo = (spr: HTMLCanvasElement | null, x: number, y: number, ph: number, which: "lawn" | "pc", bump: number) => {
        if (!spr) return;
        let rot = Math.sin(t * 0.45 + ph) * 0.035, hop = 0, s = 1 + 0.015 * bump;
        if (spin >= 0 && ev?.data.logo === which) { rot += ease(spin) * Math.PI * 2; hop = -bell(spin) * 70; s += bell(spin) * 0.05; }
        if (which === "lawn" && wind) rot += Math.sin(t * 9) * 0.05 * wind;
        ctx.save();
        ctx.translate(x, y + Math.sin(t * 0.6 + ph) * 12 + hop);
        ctx.rotate(rot); ctx.scale(s, s);
        ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
        ctx.restore();
      };
      logo(lawnSpr, lx, ly, 0, "lawn", lawnBump);
      logo(pcSpr, px, py, 2, "pc", pcBump);

      // ---- terminal: blinking cursor, and now and then a new line types itself ----
      ctx.save();
      ctx.font = `700 42px "JetBrains Mono", "DejaVu Sans Mono", monospace`;
      ctx.textBaseline = "top"; ctx.fillStyle = "#38bdf8";
      ctx.shadowColor = "rgba(56,189,248,.6)"; ctx.shadowBlur = 10;
      let [cx, cy] = S.cursor;
      const [, , cw, ch] = S.cursor;
      if (term >= 0 && ev?.data.line) {
        const line = ev.data.line, [tx, ty] = S.term;
        const shown = line.slice(0, Math.floor(clamp01(term / 0.45) * line.length));
        ctx.globalAlpha = clamp01((1 - term) / 0.15);
        ctx.fillText(shown, tx, ty + 66);
        cx = tx + ctx.measureText(shown).width; cy += 66;
      }
      if (t % 1.06 < 0.6) ctx.fillRect(cx, cy, cw, Math.max(ch, 6));
      ctx.restore();
    }

    if (still) {
      draw(0);
    } else {
      let last = performance.now();
      const loop = (now: number) => {
        if (stopped) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now; t += dt;
        draw(dt);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    return () => { stopped = true; cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("keydown", onKey); };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-black" style={{ cursor: idle ? "none" : "default" }}
      role="dialog" aria-label="Showcase">
      {/* 16:9 frame, as big as fits the screen (black bars only on non-16:9 screens) */}
      <div ref={frameRef} className="absolute left-1/2 top-1/2"
        style={{ width: "min(100vw, 177.7778vh)", height: "min(56.25vw, 100vh)", transform: "translate(-50%, -50%)" }}>
        <img src={`${dir}plate.webp`} alt="" className="absolute inset-0 h-full w-full select-none" draggable={false} />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        <img src={`${dir}text.webp`} alt="Hanover Lawn Co and HunterPCBuilds" className="absolute inset-0 h-full w-full select-none" draggable={false} />
      </div>
      <button type="button" onClick={onClose} aria-label="Close showcase"
        className="absolute right-4 top-4 rounded-full bg-black/50 px-3.5 py-1.5 text-[.85rem] text-white/80 backdrop-blur transition-opacity duration-500 hover:text-white"
        style={{ opacity: idle ? 0 : 1 }}>
        Esc ✕
      </button>
    </div>
  );
}

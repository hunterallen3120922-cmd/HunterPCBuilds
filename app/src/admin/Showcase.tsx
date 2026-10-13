import { useEffect, useRef, useState } from "react";
import { showcase as S } from "./showcaseData";

/**
 * Animated full-screen showcase (Hanover Lawn Co | HunterPCBuilds) for a projector or video calls.
 * Opened from the "Showcase" button in the admin bar. Press Esc (or the × in the corner) to leave.
 *
 * Layers, back to front:
 *   plate.webp  - the background art (stripes, grass, circuit board)
 *   <canvas>    - everything that moves: falling leaves, snow, circuit pulses, logo glow, cursor
 *   text.webp   - all the words, pills and the dividing line
 * The art lives in app/public/showcase/; positions the canvas uses are in showcaseData.ts.
 */

const dir = `${import.meta.env.BASE_URL}showcase/`;
const [FW, FH] = S.size;
const [SEAM_TOP, SEAM_BOT] = S.seam;
const seamX = (y: number) => SEAM_TOP + ((SEAM_BOT - SEAM_TOP) * y) / FH;

// ---- tuning ----
const LEAVES = 26;          // how many leaves are falling at once
const SNOW = 60;            // snow specks in the winter corner
const PULSE_EVERY = 0.55;   // seconds between new circuit pulses (on average)
const LEAF_COLORS = ["#d67828", "#e8a032", "#be5028", "#c88c2d", "#aa4623"];

type Pt = readonly [number, number];
type Path = { pts: Pt[]; cum: number[]; len: number };
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

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

    // ---- leaves ----
    type Leaf = { x: number; y: number; size: number; col: string; rot: number; spin: number; flip: number; flipSpd: number; fall: number; amp: number; freq: number; ph: number };
    const newLeaf = (y?: number): Leaf => ({
      x: rand(80, 1900), y: y ?? rand(-160, -60), size: rand(22, 40), col: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
      rot: rand(0, Math.PI * 2), spin: rand(-0.7, 0.7), flip: rand(0, 6), flipSpd: rand(0.8, 2.4),
      fall: rand(70, 140), amp: rand(40, 110), freq: rand(0.4, 0.9), ph: rand(0, 6),
    });
    const leaves = Array.from({ length: LEAVES }, () => newLeaf(rand(-100, 2000)));

    // ---- snow ----
    type Speck = { x: number; y: number; r: number; a: number; fall: number; ph: number };
    const newSpeck = (y?: number): Speck => ({ x: rand(1150, 2010), y: y ?? rand(-40, -10), r: rand(4, 10), a: rand(0.35, 0.8), fall: rand(35, 85), ph: rand(0, 6) });
    const specks = Array.from({ length: SNOW }, () => newSpeck(rand(-40, 800)));
    const flakes = S.flakes.map(([x, y, r, a]) => ({ x, y, r, spr: flakeSprite(r, a / 255), rot: rand(0, 1), spin: rand(-0.18, 0.18), ph: rand(0, 6) }));

    // ---- circuit pulses ----
    const traces = S.traces.map(makePath);
    const radial = S.radial.map(makePath);
    type Pulse = { path: Path; rev: boolean; d: number; speed: number; teal: boolean };
    const pulses: Pulse[] = [];
    const flashes: { x: number; y: number; t: number; teal: boolean }[] = [];
    let nextPulse = 0;
    const radialNext = radial.map((_, i) => 0.4 + i * 0.45);
    let pcBump = 0;
    const headSprite = (rgb: string) => sprite(80, 80, (c) => {
      const g = c.createRadialGradient(40, 40, 0, 40, 40, 40);
      g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.18, `rgba(${rgb},1)`); g.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = g; c.fillRect(0, 0, 80, 80);
    });
    const headCyan = headSprite("56,189,248"), headTeal = headSprite("61,208,155");

    // ---- logos ----
    let lawnSpr: HTMLCanvasElement | null = null, pcSpr: HTMLCanvasElement | null = null;
    const [lx, ly, lsize] = S.logoLawn, [px, py, psize] = S.logoPc;
    Promise.all([loadImg(`${dir}lawnco-logo.png`), loadImg(`${dir}pcbuilds-logo.png`)]).then(([a, b]) => {
      lawnSpr = logoSprite(a, lsize, "rgba(0,0,0,.6)", 40, 16);
      pcSpr = logoSprite(b, psize, "rgba(56,220,160,.5)", 40, 10);
      if (still) draw(8, 0);
    }).catch(() => {});

    const drawLeaf = (l: Leaf) => {
      ctx.save();
      ctx.translate(l.x, l.y); ctx.rotate(l.rot); ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(l.flip)));
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

    function draw(t: number, dt: number) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);

      // breathing glow behind each logo
      const breathe = (x: number, y: number, r: number, rgb: string, a: number) => {
        const g = ctx.createRadialGradient(x, y, r * 0.3, x, y, r);
        g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      };
      ctx.save(); ctx.clip(leftClip);
      breathe(lx, ly, 520, "190,240,180", 0.1 + 0.07 * Math.sin(t * 0.7));
      ctx.restore();
      pcBump = Math.max(0, pcBump - dt * 1.6);
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      breathe(px, py, 520, "61,208,155", 0.08 + 0.05 * Math.sin(t * 0.9 + 1) + 0.1 * pcBump);
      ctx.restore();

      // left side: leaves and snow, kept on the lawn side of the line
      ctx.save(); ctx.clip(leftClip);
      for (const l of leaves) {
        l.y += l.fall * dt; l.rot += l.spin * dt; l.flip += l.flipSpd * dt;
        const x = l.x + Math.sin(t * l.freq + l.ph) * l.amp;
        const fade = clamp01((l.y + 60) / 120) * clamp01((2050 - l.y) / 180);
        if (l.y > 2100 || x > seamX(l.y) + 60) Object.assign(l, newLeaf());
        ctx.globalAlpha = fade * 0.92;
        drawLeaf({ ...l, x });
      }
      ctx.globalAlpha = 1;
      for (const s of specks) {
        s.y += s.fall * dt;
        if (s.y > 820) Object.assign(s, newSpeck());
        const x = s.x + Math.sin(t * 0.8 + s.ph) * 22;
        ctx.globalAlpha = s.a * clamp01((820 - s.y) / 260);
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const f of flakes) {
        const s = f.spr.width;
        ctx.save();
        ctx.translate(f.x, f.y + Math.sin(t * 0.6 + f.ph) * 8);
        ctx.rotate(f.rot + t * f.spin);
        ctx.drawImage(f.spr, -s / 2, -s / 2);
        ctx.restore();
      }
      ctx.restore();

      // right side: pulses of light running along the circuit traces
      nextPulse -= dt;
      if (nextPulse <= 0 && pulses.length < 12 && traces.length) {
        pulses.push({ path: traces[Math.floor(Math.random() * traces.length)], rev: Math.random() < 0.5, d: 0, speed: rand(420, 700), teal: false });
        nextPulse = rand(PULSE_EVERY * 0.5, PULSE_EVERY * 1.5);
      }
      radialNext.forEach((n, i) => {
        radialNext[i] = n - dt;
        if (radialNext[i] <= 0) { pulses.push({ path: radial[i], rev: false, d: 0, speed: rand(380, 520), teal: true }); radialNext[i] = rand(2.4, 4.6); }
      });
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
        if (p.d <= p.path.len) {
          const [hx, hy] = at(p.d);
          ctx.globalAlpha = p.teal ? 1 : quietFade(hx, hy);
          ctx.drawImage(p.teal ? headTeal : headCyan, hx - 40, hy - 40);
          ctx.globalAlpha = 1;
        }
        if (p.d > p.path.len + tail) {
          const [ex, ey] = at(p.path.len);
          if (p.teal) pcBump = 1; else flashes.push({ x: ex, y: ey, t: 0, teal: false });
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
      ctx.restore();

      // logos, floating gently
      if (lawnSpr) ctx.drawImage(lawnSpr, lx - lawnSpr.width / 2, ly - lawnSpr.height / 2 + Math.sin(t * 0.6) * 9);
      if (pcSpr) {
        const s = 1 + 0.012 * pcBump;
        const w = pcSpr.width * s;
        ctx.drawImage(pcSpr, px - w / 2, py - w / 2 + Math.sin(t * 0.6 + 2) * 9, w, w);
      }

      // blinking terminal cursor
      if (t % 1.06 < 0.6) {
        const [cx, cy, cw, ch] = S.cursor;
        ctx.save(); ctx.shadowColor = "rgba(56,189,248,.9)"; ctx.shadowBlur = 14;
        ctx.fillStyle = "#38bdf8"; ctx.fillRect(cx, cy, cw, Math.max(ch, 6));
        ctx.restore();
      }
    }

    if (still) {
      draw(8, 0);
    } else {
      let last = performance.now(), t = 0;
      const loop = (now: number) => {
        if (stopped) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now; t += dt;
        draw(t, dt);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    return () => { stopped = true; cancelAnimationFrame(raf); ro.disconnect(); };
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

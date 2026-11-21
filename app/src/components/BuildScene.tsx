import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * The PC Builds page opening: a glass-panel PC case in three-quarter view builds itself. The parts float around the
 * case, spiral in and land with a small bounce, then the glass goes on and it lights up and its fans start turning.
 *
 * Built for speed: the drawing is split into a few stacked layers (the case, the parts, the lit-up parts, each fan's
 * blades, each floating part, ...) and only those layers move or fade, using the browser's animation engine
 * (element.animate). Nothing is redrawn while it plays, so it stays smooth on slower computers.
 *
 * Geometry: three faces of the case share the near vertical edge B-C.
 *   side face  A B C D   (large glass panel, shows the parts)
 *   front face B E F C   (three fans)
 *   top face   A B E G   (radiator fans)
 * Each face has an affine matrix that maps flat local coordinates onto it, so parts are drawn flat and come out in
 * perspective-style skew automatically. All layers share one coordinate space (VIEW) and scale to fit their box.
 */

/** How long the build takes, in milliseconds (after a short START_DELAY). */
export const BUILD_MS = 2000;
export const START_DELAY = 150;
/** Fraction of the way through when the build counts as finished (the photo slideshow waits for that). */
export const DONE_AT = 0.9;

// Timeline, as fractions of BUILD_MS
const LAND = 0.55; // the parts hit the case
const CASE_END = 0.3; // the case has faded in
const POWER: [number, number] = [LAND + 0.03, LAND + 0.28]; // it lights up
const GLASS: [number, number] = [LAND + 0.03, LAND + 0.25]; // the glass panel goes on
const SPIN_AT = LAND + 0.03; // the fans start turning

export const GLOW = "var(--accent)";
export const VIEW = { x: 110, y: 56, w: 550, h: 548 };
export const VIEWBOX = `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const span = (p: number, [a, b]: [number, number]) => easeOut(clamp((p - a) / (b - a)));
/** The parts' flight: speeds up the whole way (0 to 1), so they land with a thud. */
const fly = (p: number) => Math.pow(clamp(p / LAND), 2);
const caseIn = (p: number) => easeOut(clamp(p / CASE_END));
const power = (p: number) => span(p, POWER);
/** The installed parts fade in only as their floating copies arrive. */
const partsIn = (p: number) => Math.pow(fly(p), 5);

/**
 * The PC's own motion: it grows very slightly as it builds, dips on the impact, springs up once and settles.
 * `bounce` is in drawing units (down is positive), `squash` 1 is normal height.
 */
function pcMotion(p: number) {
  const grow = 0.95 + 0.05 * (1 - Math.pow(1 - clamp(p / LAND), 2));
  const t = clamp((p - LAND) / (1 - LAND));
  let bounce = 0, squash = 1;
  if (t > 0 && t < 0.1) { const d = Math.sin((Math.PI * t) / 0.1); bounce = 7 * d; squash = 1 - 0.03 * d; }
  else if (t >= 0.1 && t < 1) { const u = (t - 0.1) / 0.9; bounce = -16 * Math.sin(2 * Math.PI * u) * Math.pow(1 - u, 2.2); squash = 1 - bounce * 0.0007; }
  return { grow, bounce, squash };
}
/** A quick glow inside the case as the parts land. */
const flash = (p: number) => { const f = (p - LAND) / 0.12; return f >= 0 && f <= 1 ? Math.pow(1 - f, 2) : 0; };

// ---------------------------------------------------------------------------------------------------------------
// Drawing

/** How a layer draws lit-up parts: "unlit" before power-on, "lit" after, "full" for the floating parts (always lit,
 *  with their fan blades drawn in; on the case the blades are separate layers so they can turn). */
export type Mode = "unlit" | "lit" | "full";
/** Opacity of something that lights up: `base` when unlit, `base + mult` when lit. */
export const pw = (mode: Mode, mult: number, base = 0) => (mode === "unlit" ? base : Math.min(1, base + mult));

const BLADE_ALPHA = 0.46; // blades when lit; unlit they're at 0.1
export function Blades({ cx, cy, r, n }: { cx: number; cy: number; r: number; n: number }) {
  return (
    <g opacity={BLADE_ALPHA}>
      {Array.from({ length: n }, (_, k) => (
        <path key={k} transform={`translate(${cx} ${cy}) rotate(${(k * 360) / n})`}
          d={`M0 0 C ${r * 0.12} ${-r * 0.1} ${r * 0.5} ${-r * 0.1} ${r * 0.66} ${-r * 0.42} C ${r * 0.4} ${-r * 0.5} ${r * 0.14} ${-r * 0.36} 0 0Z`}
          fill={GLOW} />
      ))}
    </g>
  );
}
export const Hub = ({ cx, cy, r, mode, fancy }: { cx: number; cy: number; r: number; mode: Mode; fancy?: boolean }) => (
  <>
    <circle cx={cx} cy={cy} r={r * 0.24} fill="#070b10" stroke={GLOW} strokeWidth={r * 0.05} strokeOpacity={pw(mode, 0.6, 0.4)} />
    {fancy && <circle cx={cx} cy={cy} r={r * 0.09} fill={GLOW} opacity={pw(mode, 0.7, 0.3)} />}
  </>
);
const RevRing = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => (
  <circle cx={cx} cy={cy} r={r * 1.14} fill="none" stroke={GLOW} strokeWidth={r * 0.07} strokeDasharray={`${r * 0.55} ${r * 0.3}`} />
);

/** An RGB case fan: glow halo, lit ring, blades, hub. `fancy` adds the extra rings of the CPU fan. */
export function Fan({ cx, cy, r, mode, blades = 9, fancy = false }: { cx: number; cy: number; r: number; mode: Mode; blades?: number; fancy?: boolean }) {
  return (
    <g>
      {mode !== "unlit" && <circle cx={cx} cy={cy} r={r * (fancy ? 2.3 : 1.95)} fill="url(#bs-glow)" />}
      <circle cx={cx} cy={cy} r={r} fill="#04070b" stroke="#1b2735" strokeWidth={r * 0.1} />
      <circle cx={cx} cy={cy} r={r * 0.92} fill="none" stroke={GLOW} strokeWidth={r * 0.15} opacity={pw(mode, 0.85, 0.15)} />
      <circle cx={cx} cy={cy} r={r * 0.74} fill="none" stroke={GLOW} strokeWidth={r * 0.03} opacity={pw(mode, 0.5, 0.15)} />
      {fancy && <circle cx={cx} cy={cy} r={r * 0.5} fill="none" stroke={GLOW} strokeWidth={r * 0.05} opacity={pw(mode, 0.9, 0.2)} />}
      {mode === "full" && <>{fancy && <RevRing cx={cx} cy={cy} r={r} />}<Blades cx={cx} cy={cy} r={r} n={fancy ? 11 : blades} /></>}
      <Hub cx={cx} cy={cy} r={r} mode={mode} fancy={fancy} />
    </g>
  );
}

/** Wraps flat parts so they sit on one face of the case. */
export function Face({ matrix, clip, children }: { matrix: string; clip: string; children: ReactNode }) {
  return (
    <g clipPath={`url(#${clip})`}>
      <g transform={matrix}>{children}</g>
    </g>
  );
}

export type Matrix = [number, number, number, number, number, number];
export const mul = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
export const svgMatrix = (m: Matrix) => `matrix(${m.join(" ")})`;

// Faces: A(150,110) B(470,140) C(470,570) D(150,540) E(620,120) F(620,550) G(300,90)
export const SIDE: Matrix = [1, 0.09375, 0, 1, 150, 110]; // local u 0..320, v 0..430
export const FRONT: Matrix = [0.6, -0.08, 0, 1, 470, 140]; // local u 0..250, v 0..430
export const TOP: Matrix = [1, 0.09375, 0.5769, -0.0769, 150, 110]; // local x 0..320, y 0..260
export const REAR_LOCAL: Matrix = [0.5769, -0.131, 0, 1, 38, 112]; // the rear exhaust fan, on the back wall inside the side face
export const REAR = mul(SIDE, REAR_LOCAL);

/** Every fan on the case, so the static drawing and the turning blade layers agree. */
export const FANS: { face: Matrix; cx: number; cy: number; r: number; fancy?: boolean }[] = [
  ...[55, 160, 265].map((cx) => ({ face: TOP, cx, cy: 130, r: 46 })),
  ...[72, 214, 356].map((cy) => ({ face: FRONT, cx: 125, cy, r: 56 })),
  { face: REAR, cx: 0, cy: 0, r: 48 },
  { face: SIDE, cx: 152, cy: 108, r: 44, fancy: true },
];

export function Defs() {
  return (
    <defs>
      <radialGradient id="bs-glow">
        <stop offset="0" style={{ stopColor: GLOW, stopOpacity: 0.8 }} />
        <stop offset="0.4" style={{ stopColor: GLOW, stopOpacity: 0.3 }} />
        <stop offset="1" style={{ stopColor: GLOW, stopOpacity: 0 }} />
      </radialGradient>
      <radialGradient id="bs-floor">
        <stop offset="0" style={{ stopColor: GLOW, stopOpacity: 0.28 }} />
        <stop offset="1" style={{ stopColor: GLOW, stopOpacity: 0 }} />
      </radialGradient>
      <linearGradient id="bs-inside" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#0b141e" />
        <stop offset="1" stopColor="#04070b" />
      </linearGradient>
      <linearGradient id="bs-glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.12" />
        <stop offset="0.5" stopColor="#fff" stopOpacity="0.02" />
        <stop offset="1" stopColor="#fff" stopOpacity="0.07" />
      </linearGradient>
      <linearGradient id="bs-shade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#000" stopOpacity="0.55" />
        <stop offset="0.6" stopColor="#000" stopOpacity="0" />
      </linearGradient>
      <clipPath id="bs-clip-side"><polygon points="150,110 470,140 470,570 150,540" /></clipPath>
      <clipPath id="bs-clip-front"><polygon points="470,140 620,120 620,550 470,570" /></clipPath>
      <clipPath id="bs-clip-top"><polygon points="150,110 470,140 620,120 300,90" /></clipPath>
    </defs>
  );
}

/** The empty case: feet, the top and front panels and the dark inside behind the glass. */
export function CaseBack() {
  return (
    <>
      <path d="M170 540 L222 545 L220 562 L172 556Z M430 568 L500 566 L498 586 L432 588Z M585 548 L620 546 L618 562 L585 564Z" fill="#05080c" />
      <Face matrix={svgMatrix(TOP)} clip="bs-clip-top">
        <rect x="-20" y="-20" width="380" height="300" fill="#080d13" />
        <rect x="8" y="14" width="304" height="232" rx="16" stroke="#1b2634" strokeWidth="3" />
      </Face>
      <Face matrix={svgMatrix(FRONT)} clip="bs-clip-front">
        <rect x="-10" y="-10" width="270" height="450" fill="#05080c" />
        <rect x="16" y="14" width="218" height="402" rx="10" stroke="#16212d" strokeWidth="3" />
      </Face>
      <Face matrix={svgMatrix(SIDE)} clip="bs-clip-side">
        <rect x="-10" y="-10" width="340" height="450" fill="url(#bs-inside)" />
      </Face>
    </>
  );
}

/** Everything installed in the case, unlit or lit (the lit copy fades in over the unlit one at power-on). */
function Parts({ mode }: { mode: Mode }) {
  return (
    <>
      {/* top: radiator fans */}
      <Face matrix={svgMatrix(TOP)} clip="bs-clip-top">
        {[55, 160, 265].map((x) => <Fan key={x} cx={x} cy={130} r={46} mode={mode} />)}
      </Face>

      {/* front: three fans behind glass */}
      <Face matrix={svgMatrix(FRONT)} clip="bs-clip-front">
        {[72, 214, 356].map((v) => <Fan key={v} cx={125} cy={v} r={56} mode={mode} />)}
      </Face>

      {/* side: everything seen through the glass panel */}
      <Face matrix={svgMatrix(SIDE)} clip="bs-clip-side">
        {/* power supply shroud: its top shelf (seen from above, giving the case a floor) and a perforated front */}
        <polygon points="0,336 320,336 378,323 58,323" fill="#0b121a" />
        <path d="M58 323 H320" stroke="#141e29" strokeWidth="2" />
        <rect x="0" y="336" width="320" height="100" fill="#05080c" />
        <path d="M0 336 H320" stroke={GLOW} strokeWidth="2" opacity={pw(mode, 0.5, 0.12)} />
        <path d={Array.from({ length: 6 }, (_, r) => Array.from({ length: 16 }, (_, c) => `M${18 + c * 7.5} ${356 + r * 9}h0`).join("")).join("")}
          stroke="#131c27" strokeWidth="3.4" />
        <path d="M232 354 V404 M244 354 V404 M256 354 V404 M268 354 V404 M280 354 V404 M292 354 V404" stroke="#111924" strokeWidth="4" />

        {/* rear exhaust fan on the back wall, seen at an angle through the glass */}
        <g transform={svgMatrix(REAR_LOCAL)}>
          <rect x="-54" y="-54" width="108" height="108" rx="12" fill="#070b10" stroke="#16212d" strokeWidth="3" />
          <Fan cx={0} cy={0} r={48} mode={mode} />
        </g>

        {/* motherboard with rear I/O cover and a finned chipset heatsink */}
        <rect x="68" y="26" width="220" height="276" rx="7" fill="#0a121b" stroke="#1a2735" strokeWidth="2.5" />
        <path d="M80 160 H130 L150 140 H230 M120 60 V110 M240 60 V120" stroke={GLOW} strokeWidth="1.5" opacity={pw(mode, 0.2, 0.1)} />
        <path d="M68 34 H96 V118 L84 128 H68Z" fill="#101a24" stroke="#1d2a38" strokeWidth="2.5" />
        <path d="M88 44 V110" stroke={GLOW} strokeWidth="2" opacity={pw(mode, 0.6, 0.12)} />
        <rect x="204" y="278" width="64" height="20" rx="3" fill="#0f1822" stroke="#1d2a38" strokeWidth="2" />
        <path d={[212, 220, 228, 236, 244, 252, 260].map((x) => `M${x} 282 L${x - 5} 294`).join("")} stroke="#1a2633" strokeWidth="2" />

        {/* CPU tower cooler: fin stack and a big RGB fan */}
        <rect x="98" y="40" width="108" height="14" rx="4" fill="#141d28" stroke="#1d2a38" strokeWidth="2.5" />
        <rect x="98" y="52" width="108" height="112" rx="10" fill="#0a1017" stroke="#1d2a38" strokeWidth="3" />
        <path d={Array.from({ length: 12 }, (_, k) => `M${106 + k * 8.2} 58V158`).join("")} stroke="#16212d" strokeWidth="2.5" />
        <Fan cx={152} cy={108} r={44} fancy mode={mode} />

        {/* RAM with light strips */}
        {[218, 240].map((x) => (
          <g key={x}>
            <rect x={x} y="44" width="15" height="96" rx="2.5" fill="#0c131b" stroke="#1c2937" strokeWidth="2" />
            <rect x={x + 2} y="46" width="3.5" height="92" rx="1.5" fill={GLOW} opacity={pw(mode, 0.75, 0.25)} />
          </g>
        ))}

        {/* graphics card, mounted flat in its slot and reaching out toward the glass: we see its long shroud edge and
            the backplate on top (its fans face down, lighting the shelf below) */}
        {mode !== "unlit" && <ellipse cx="140" cy="286" rx="150" ry="20" fill="url(#bs-glow)" opacity={0.5} />}
        <rect x="6" y="198" width="9" height="74" rx="2" fill="#1b2633" />
        <polygon points="14,214 254,214 312,201 72,201" fill="#0e1620" stroke="#1f2c3a" strokeWidth="2" />
        <path d="M40 210 H262 M64 205 H286" stroke="#18222e" strokeWidth="1.5" />
        <rect x="14" y="214" width="240" height="54" rx="5" fill="#07090d" stroke="#1f2c3a" strokeWidth="2.5" />
        <polygon points="254,214 312,201 312,255 254,268" fill="#0b121a" stroke="#1f2c3a" strokeWidth="2" strokeLinejoin="round" />
        <path d="M262 226 L304 216 M262 238 L304 228 M262 250 L304 240" stroke="#151f2a" strokeWidth="2" />
        <path d="M256 220 L310 208" stroke={GLOW} strokeWidth="1.5" opacity={pw(mode, 0.6, 0.1)} />
        <path d="M28 224 H190 L204 236 H240" stroke={GLOW} strokeWidth="2.5" opacity={pw(mode, 0.85, 0.15)} />
        <path d="M28 256 H120 L132 246 H240" stroke="#151f2a" strokeWidth="2.5" />
        <path d={Array.from({ length: 36 }, (_, k) => `M${24 + k * 6} 262V267`).join("")} stroke="#121a24" strokeWidth="2" />
      </Face>
    </>
  );
}

/** The glass panel's sheen and reflections. */
export function Glass() {
  return (
    <Face matrix={svgMatrix(SIDE)} clip="bs-clip-side">
      <rect x="-10" y="-10" width="340" height="450" fill="url(#bs-glass)" />
      <polygon points="40,0 120,0 -10,430 -90,430" fill="#fff" opacity=".055" />
      <polygon points="170,0 196,0 66,430 40,430" fill="#fff" opacity=".035" />
    </Face>
  );
}

/** Over the parts: the front glass reflection, the side panel's shading and frame, and the case edges and glints. */
export function CaseFront() {
  return (
    <>
      <Face matrix={svgMatrix(FRONT)} clip="bs-clip-front">
        <polygon points="30,0 90,0 -20,430 -80,430" fill="#fff" opacity=".05" />
      </Face>
      <Face matrix={svgMatrix(SIDE)} clip="bs-clip-side">
        <rect x="-10" y="-10" width="340" height="450" fill="url(#bs-shade)" />
        <rect x="7" y="7" width="306" height="416" rx="8" stroke="#0e1721" strokeWidth="3" />
      </Face>
      <polygon points="150,110 470,140 470,570 150,540" stroke="#0c131b" strokeWidth="5" />
      <polygon points="470,140 620,120 620,550 470,570" stroke="#0c131b" strokeWidth="5" />
      <polygon points="150,110 470,140 620,120 300,90" stroke="#0c131b" strokeWidth="5" />
      <path d="M470 140 V570" stroke="#9fb3c8" strokeWidth="3" opacity=".55" />
      <path d="M150 110 L470 140 L620 120" stroke="#7e93a8" strokeWidth="2" opacity=".4" />
      <path d="M150 540 L470 570 L620 550" stroke="#5f7388" strokeWidth="2" opacity=".35" />
      <path d="M150 110 V540" stroke="#4d6073" strokeWidth="2" opacity=".35" />
    </>
  );
}

/** Floating versions of the parts, drawn flat and centered on (0, 0). */
const FloatPsu = () => (
  <g><rect x="-58" y="-30" width="116" height="60" rx="8" fill="#0a1017" stroke={GLOW} strokeWidth="3" /><Fan cx={-28} cy={0} r={20} mode="full" /><path d="M6 -12 H44 M6 0 H44 M6 12 H32" stroke="#1d2a38" strokeWidth="3" /></g>
);
const FloatBoard = () => (
  <g>
    <rect x="-52" y="-66" width="104" height="132" rx="6" fill="#0a121b" stroke={GLOW} strokeWidth="2.5" />
    <rect x="-30" y="-46" width="36" height="36" rx="4" stroke="#1d2a38" strokeWidth="2.5" strokeDasharray="5 4" />
    <path d="M18 -50 V-10 M28 -50 V-10 M-40 18 H40 M-40 34 H24" stroke="#1d2a38" strokeWidth="3" />
    <path d="M-40 52 H0 L10 42 H40" stroke={GLOW} strokeWidth="1.5" opacity=".6" />
  </g>
);
const FloatRam = () => (
  <g transform="rotate(-18)">{[-12, 12].map((x) => <g key={x}><rect x={x - 8} y="-48" width="16" height="96" rx="2.5" fill="#0c131b" stroke="#2a3a4c" strokeWidth="2" /><rect x={x - 6} y="-46" width="3.5" height="92" rx="1.5" fill={GLOW} opacity=".8" /></g>)}</g>
);
const FloatCooler = () => (
  <g><rect x="-44" y="-44" width="88" height="88" rx="10" fill="#0a1017" stroke="#2a3a4c" strokeWidth="3" /><Fan cx={0} cy={0} r={34} fancy mode="full" /></g>
);
const FloatGpu = () => (
  <g><rect x="-86" y="-30" width="172" height="60" rx="9" fill="#07090d" stroke="#2a3a4c" strokeWidth="3" /><path d="M-76 -24 H76" stroke={GLOW} strokeWidth="2" opacity=".7" />{[-50, 0, 50].map((x) => <Fan key={x} cx={x} cy={4} r={20} mode="full" />)}</g>
);
const FloatFan = () => <Fan cx={0} cy={0} r={36} mode="full" />;

/**
 * Where each floating part starts and where it lands, and the size of its square layer (drawing units). They hover in
 * a tight ring around the case so they stay beside the page text (never over it).
 */
const FLOATS: { id: string; from: [number, number]; to: [number, number]; size: number; el: ReactNode }[] = [
  { id: "rear", from: [135, 95], to: [188, 226], size: 150, el: <FloatFan /> },
  { id: "board", from: [118, 330], to: [328, 281], size: 170, el: <FloatBoard /> },
  { id: "psu", from: [160, 590], to: [310, 511], size: 140, el: <FloatPsu /> },
  { id: "ram", from: [300, 45], to: [388, 224], size: 120, el: <FloatRam /> },
  { id: "cooler", from: [520, 50], to: [302, 232], size: 170, el: <FloatCooler /> },
  { id: "topfans", from: [655, 150], to: [385, 112], size: 150, el: <FloatFan /> },
  { id: "gpu", from: [660, 410], to: [306, 359], size: 190, el: <FloatGpu /> },
  { id: "front", from: [560, 600], to: [545, 344], size: 150, el: <FloatFan /> },
];
const SWIRL = 0.22; // bends every flight path the same way, so together they spiral in

// ---------------------------------------------------------------------------------------------------------------
// Layers and their animations

export const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(4)}%`;
/** A layer covering the whole drawing. */
const Layer = ({ l, children }: { l: string; children: ReactNode }) => (
  <div data-l={l} className="absolute inset-0">
    <svg viewBox={VIEWBOX} className="h-full w-full overflow-visible" fill="none" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
  </div>
);
/** A square layer of `size` drawing units centred on (cx, cy). */
export const boxAt = (cx: number, cy: number, size: number): CSSProperties => ({
  left: pct(cx - size / 2 - VIEW.x, VIEW.w), top: pct(cy - size / 2 - VIEW.y, VIEW.h), width: pct(size, VIEW.w), height: pct(size, VIEW.h),
});

/** Plays `frame(p)` for p from 0 to 1 over the build, sampled finely enough to look smooth. */
function play(el: Element | null | undefined, frame: (p: number) => Keyframe) {
  if (!el) return undefined;
  const N = 48;
  const frames = Array.from({ length: N + 1 }, (_, i) => ({ ...frame(i / N), offset: i / N }));
  return el.animate(frames, { duration: BUILD_MS, delay: START_DELAY, fill: "both", easing: "linear" });
}

export default function BuildScene() {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const r = root.current;
    if (!r) return;
    const q = (name: string) => r.querySelector(`[data-l="${name}"]`);
    const all = (name: string) => Array.from(r.querySelectorAll(`[data-l="${name}"]`));
    const anims = [
      play(q("floor"), (p) => ({ transform: `scale(${1 + pcMotion(p).bounce * 0.006})` })),
      play(q("floor-glow"), (p) => ({ transform: `scale(${1 + pcMotion(p).bounce * 0.006})`, opacity: power(p) })),
      play(q("pc"), (p) => {
        const { grow, bounce, squash } = pcMotion(p);
        return { transform: `translateY(${pct(bounce, VIEW.h)}) scale(${grow}) scaleY(${squash})` };
      }),
      play(q("case-back"), (p) => ({ opacity: 0.15 + 0.85 * caseIn(p) })),
      play(q("case-front"), (p) => ({ opacity: 0.15 + 0.85 * caseIn(p) })),
      play(q("parts"), (p) => ({ opacity: partsIn(p) })),
      play(q("parts-lit"), (p) => ({ opacity: power(p) })),
      ...all("blades").map((el) => play(el, (p) => ({ opacity: partsIn(p) * (0.1 / BLADE_ALPHA + (1 - 0.1 / BLADE_ALPHA) * power(p)) }))),
      play(q("rev-ring"), (p) => ({ opacity: partsIn(p) * (0.2 + 0.8 * power(p)) })),
      play(q("flash"), (p) => ({ opacity: flash(p) * 0.5 })),
      play(q("glass"), (p) => ({ opacity: span(p, GLASS) })),
      ...FLOATS.map((f) => play(q(`float-${f.id}`), (p) => {
        const t = fly(p);
        const [dx, dy] = [f.to[0] - f.from[0], f.to[1] - f.from[1]];
        const arc = 4 * t * (1 - t); // 0 at both ends, 1 halfway
        const x = dx * t - dy * SWIRL * arc, y = dy * t + dx * SWIRL * arc;
        return {
          transform: `translate(${pct(x, f.size)}, ${pct(y, f.size)}) rotate(${((1 - t) * SWIRL * 70).toFixed(3)}deg) scale(${1 - t * 0.5})`,
          opacity: caseIn(p) * (1 - t * t * t),
        };
      })),
    ];
    // Visitors who prefer reduced motion get the finished PC straight away.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) anims.forEach((a) => a?.finish());
    return () => anims.forEach((a) => a?.cancel());
  }, []);

  const spinDelay = { animationDelay: `${START_DELAY + SPIN_AT * BUILD_MS}ms` };
  return (
    // Scales the drawing to fit its box without cropping, centred
    <div className="flex h-full w-full items-center justify-center [container-type:size]" aria-hidden="true">
      <div ref={root} className="relative aspect-[550/548] w-[min(100cqw,calc(100cqh*550/548))]">
        <svg width="0" height="0" className="absolute"><Defs /></svg>

        {/* floor shadow and glow */}
        <div data-l="floor" className="absolute inset-0" style={{ transformOrigin: `${pct(395 - VIEW.x, VIEW.w)} ${pct(580 - VIEW.y, VIEW.h)}` }}>
          <svg viewBox={VIEWBOX} className="h-full w-full overflow-visible"><ellipse cx="395" cy="580" rx="290" ry="22" fill="#000" opacity=".55" /></svg>
        </div>
        <div data-l="floor-glow" className="absolute inset-0" style={{ transformOrigin: `${pct(395 - VIEW.x, VIEW.w)} ${pct(580 - VIEW.y, VIEW.h)}` }}>
          <svg viewBox={VIEWBOX} className="h-full w-full overflow-visible"><ellipse cx="395" cy="580" rx="260" ry="20" fill="url(#bs-floor)" /></svg>
        </div>

        {/* the PC itself; it grows slightly as it builds and bounces when the parts land */}
        <div data-l="pc" className="absolute inset-0" style={{ transformOrigin: `${pct(395 - VIEW.x, VIEW.w)} ${pct(575 - VIEW.y, VIEW.h)}` }}>
          <Layer l="case-back"><CaseBack /></Layer>
          <Layer l="parts"><Parts mode="unlit" /></Layer>
          <Layer l="parts-lit"><Parts mode="lit" /></Layer>
          {/* each fan's blades (and hub) on its own layer so it can turn without redrawing anything */}
          {FANS.map((f, i) => {
            const [a, b, c, d, e, g] = f.face;
            const sx = a * f.cx + c * f.cy + e, sy = b * f.cx + d * f.cy + g;
            const size = f.r * (f.fancy ? 2.4 : 2);
            const box = { ...boxAt(sx, sy, size), transform: `matrix(${a}, ${b}, ${c}, ${d}, 0, 0)` };
            const vb = `${-size / 2} ${-size / 2} ${size} ${size}`;
            return (
              <div key={i}>
                {f.fancy && (
                  <div data-l="rev-ring" className="absolute" style={box}>
                    <svg viewBox={vb} className="bfan-spin bfan-rev h-full w-full overflow-visible" style={spinDelay}><RevRing cx={0} cy={0} r={f.r} /></svg>
                  </div>
                )}
                <div data-l="blades" className="absolute" style={box}>
                  <svg viewBox={vb} className="bfan-spin h-full w-full overflow-visible" style={spinDelay}>
                    <Blades cx={0} cy={0} r={f.r} n={f.fancy ? 11 : 9} />
                    <Hub cx={0} cy={0} r={f.r} mode="lit" fancy={f.fancy} />
                  </svg>
                </div>
              </div>
            );
          })}
          <Layer l="flash">
            <Face matrix={svgMatrix(SIDE)} clip="bs-clip-side"><ellipse cx="170" cy="200" rx="230" ry="250" fill="url(#bs-glow)" /></Face>
          </Layer>
          <Layer l="glass"><Glass /></Layer>
          <Layer l="case-front"><CaseFront /></Layer>
        </div>

        {/* the parts floating around the case, spiralling in together */}
        {FLOATS.map((f) => (
          <div key={f.id} data-l={`float-${f.id}`} className="absolute" style={boxAt(f.from[0], f.from[1], f.size)}>
            <svg viewBox={`${-f.size / 2} ${-f.size / 2} ${f.size} ${f.size}`} className="h-full w-full overflow-visible" fill="none" strokeLinecap="round" strokeLinejoin="round">
              {f.el}
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

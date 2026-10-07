import type { CSSProperties, ReactNode } from "react";
import { Floater, usePortrait } from "./Floaters";

/**
 * A modern glass-panel PC case in three-quarter view that assembles as you scroll.
 * The parts first float around the case, then fly in (see Floaters.tsx). Every part reads its own progress from a CSS
 * variable (--q-<name>, 0 to 1) that AnimatedHero updates on a timer;
 * --p (0 to 1) is the overall progress. The drawing uses a fixed coordinate space and scales to fit
 * any box ("meet"), so it never crops.
 *
 * Geometry: three faces of the case share the near vertical edge B-C.
 *   side face  A B C D   (large glass panel, shows the parts)
 *   front face B E F C   (three fans)
 *   top face   A B E G   (radiator fans)
 * Each face has an affine "matrix" that maps flat local coordinates onto it, so parts are drawn flat and
 * come out in perspective-style skew automatically.
 */

const GLOW = "var(--accent)";

/**
 * A part settling into place: it fades in as its floating copy (see Floaters) arrives, with a small final nudge
 * from the direction it came from.
 */
const fly = (id: string, dx: number, dy: number, rot = 0): CSSProperties => ({
  transform: `translate(calc((1 - var(--q-${id}, 0)) * ${dx * 0.12}px), calc((1 - var(--q-${id}, 0)) * ${dy * 0.12}px)) rotate(calc((1 - var(--q-${id}, 0)) * ${rot * 0.4}deg))`,
  opacity: `calc(var(--q-${id}, 0) * var(--q-${id}, 0) * var(--q-${id}, 0) * var(--q-${id}, 0) * var(--q-${id}, 0))`,
  transformBox: "fill-box",
  transformOrigin: "center",
});

const power = (mult: number, base = 0): string => `calc(${base} + var(--q-power, 0) * ${mult})`;

/** An RGB case fan: glow halo, lit ring, blades that keep turning (see .fan-spin in index.css), hub. `fancy` adds the extra rings of the CPU fan. */
function Fan({ cx, cy, r, blades = 9, fancy = false }: { cx: number; cy: number; r: number; blades?: number; fancy?: boolean }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r * (fancy ? 2.3 : 1.95)} fill="url(#bs-glow)" style={{ opacity: power(1) }} />
      <circle cx={cx} cy={cy} r={r} fill="#04070b" stroke="#1b2735" strokeWidth={r * 0.1} />
      <circle cx={cx} cy={cy} r={r * 0.92} fill="none" stroke={GLOW} strokeWidth={r * 0.15} style={{ opacity: power(0.85, 0.15) }} />
      <circle cx={cx} cy={cy} r={r * 0.74} fill="none" stroke={GLOW} strokeWidth={r * 0.03} style={{ opacity: power(0.5, 0.15) }} />
      {fancy && (
        <>
          {/* segmented outer ring that counter-rotates, and a lit inner ring */}
          <g className="fan-spin-rev">
            <circle cx={cx} cy={cy} r={r * 1.14} fill="none" stroke={GLOW} strokeWidth={r * 0.07}
              strokeDasharray={`${r * 0.55} ${r * 0.3}`} style={{ opacity: power(0.9, 0.2) }} />
          </g>
          <circle cx={cx} cy={cy} r={r * 0.5} fill="none" stroke={GLOW} strokeWidth={r * 0.05} style={{ opacity: power(0.9, 0.2) }} />
        </>
      )}
      <g className="fan-spin">
        <circle cx={cx} cy={cy} r={r * 0.72} fill="none" stroke="none" />
        {Array.from({ length: fancy ? 11 : blades }, (_, k) => (
          <path key={k} transform={`translate(${cx} ${cy}) rotate(${(k * 360) / (fancy ? 11 : blades)})`}
            d={`M0 0 C ${r * 0.12} ${-r * 0.1} ${r * 0.5} ${-r * 0.1} ${r * 0.66} ${-r * 0.42} C ${r * 0.4} ${-r * 0.5} ${r * 0.14} ${-r * 0.36} 0 0Z`}
            fill={GLOW} style={{ opacity: power(0.36, 0.1) }} />
        ))}
      </g>
      <circle cx={cx} cy={cy} r={r * 0.24} fill="#070b10" stroke={GLOW} strokeWidth={r * 0.05} style={{ opacity: power(0.6, 0.4) }} />
      {fancy && <circle cx={cx} cy={cy} r={r * 0.09} fill={GLOW} style={{ opacity: power(0.7, 0.3) }} />}
    </g>
  );
}

/** Floating versions of the parts, drawn flat and centered on (0, 0). */
function FloatPsu() {
  return <g><rect x="-58" y="-30" width="116" height="60" rx="8" fill="#0a1017" stroke={GLOW} strokeWidth="3" /><Fan cx={-28} cy={0} r={20} /><path d="M6 -12 H44 M6 0 H44 M6 12 H32" stroke="#1d2a38" strokeWidth="3" /></g>;
}
function FloatBoard() {
  return (
    <g>
      <rect x="-52" y="-66" width="104" height="132" rx="6" fill="#0a121b" stroke={GLOW} strokeWidth="2.5" />
      <rect x="-30" y="-46" width="36" height="36" rx="4" stroke="#1d2a38" strokeWidth="2.5" strokeDasharray="5 4" />
      <path d="M18 -50 V-10 M28 -50 V-10 M-40 18 H40 M-40 34 H24" stroke="#1d2a38" strokeWidth="3" />
      <path d="M-40 52 H0 L10 42 H40" stroke={GLOW} strokeWidth="1.5" opacity=".6" />
    </g>
  );
}
function FloatRam() {
  return <g transform="rotate(-18)">{[-12, 12].map((x) => <g key={x}><rect x={x - 8} y="-48" width="16" height="96" rx="2.5" fill="#0c131b" stroke="#2a3a4c" strokeWidth="2" /><rect x={x - 6} y="-46" width="3.5" height="92" rx="1.5" fill={GLOW} opacity=".8" /></g>)}</g>;
}
function FloatCooler() {
  return <g><rect x="-44" y="-44" width="88" height="88" rx="10" fill="#0a1017" stroke="#2a3a4c" strokeWidth="3" /><Fan cx={0} cy={0} r={34} fancy /></g>;
}
function FloatGpu() {
  return <g><rect x="-86" y="-30" width="172" height="60" rx="9" fill="#07090d" stroke="#2a3a4c" strokeWidth="3" /><path d="M-76 -24 H76" stroke={GLOW} strokeWidth="2" opacity=".7" />{[-50, 0, 50].map((x) => <Fan key={x} cx={x} cy={4} r={20} />)}</g>;
}
function FloatFan() {
  return <Fan cx={0} cy={0} r={36} />;
}

/** Where each floating part starts (beside the case on wide screens, above/below it on tall ones) and where it lands. */
const FLOATS: { id: string; wide: [number, number]; tall: [number, number]; to: [number, number]; bob: number; el: ReactNode }[] = [
  { id: "rear", wide: [-120, 110], tall: [180, 790], to: [188, 226], bob: 0.9, el: <FloatFan /> },
  { id: "board", wide: [-40, 300], tall: [560, -20], to: [328, 281], bob: 0.2, el: <FloatBoard /> },
  { id: "psu", wide: [-20, 480], tall: [210, 660], to: [310, 511], bob: 1.1, el: <FloatPsu /> },
  { id: "ram", wide: [40, 110], tall: [170, -30], to: [388, 224], bob: 0.7, el: <FloatRam /> },
  { id: "cooler", wide: [740, 100], tall: [300, -70], to: [302, 232], bob: 1.6, el: <FloatCooler /> },
  { id: "topfans", wide: [800, 250], tall: [440, -60], to: [385, 112], bob: 0.4, el: <FloatFan /> },
  { id: "gpu", wide: [760, 410], tall: [400, 700], to: [306, 359], bob: 2.1, el: <FloatGpu /> },
  { id: "front", wide: [790, 545], tall: [600, 655], to: [545, 344], bob: 1.3, el: <FloatFan /> },
];

/** Wraps flat parts so they sit on one face of the case. */
function Face({ matrix, clip, children }: { matrix: string; clip: string; children: ReactNode }) {
  return (
    <g clipPath={`url(#${clip})`}>
      <g transform={matrix}>{children}</g>
    </g>
  );
}

// Faces: A(150,110) B(470,140) C(470,570) D(150,540) E(620,120) F(620,550) G(300,90)
const SIDE = "matrix(1 .09375 0 1 150 110)"; // local u 0..320, v 0..430
const FRONT = "matrix(.6 -.08 0 1 470 140)"; // local u 0..250, v 0..430
const TOP = "matrix(1 .09375 .5769 -.0769 150 110)"; // local x 0..320, y 0..260

export default function BuildScene() {
  const portrait = usePortrait();
  return (
    <svg viewBox="110 56 550 548" preserveAspectRatio="xMidYMid meet" className="h-full w-full overflow-visible" aria-hidden="true"
      fill="none" strokeLinecap="round" strokeLinejoin="round">
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

      {/* floor shadow and glow */}
      <g style={{ transform: "scale(calc(1 + var(--bounce, 0) * .006))", transformOrigin: "395px 580px" }}>
        <ellipse cx="395" cy="580" rx="290" ry="22" fill="#000" opacity=".55" />
        <ellipse cx="395" cy="580" rx="260" ry="20" fill="url(#bs-floor)" style={{ opacity: power(1) }} />
      </g>

      {/* the PC itself; it grows slightly as it builds and bounces when the parts land (--grow / --bounce / --squash, see PcBuildHero) */}
      <g style={{ transform: "translateY(calc(var(--bounce, 0) * 1px)) scale(var(--grow, 1)) scaleY(var(--squash, 1))", transformOrigin: "395px 575px" }}>
      {/* feet */}
      <path d="M170 540 L222 545 L220 562 L172 556Z M430 568 L500 566 L498 586 L432 588Z M585 548 L620 546 L618 562 L585 564Z" fill="#05080c" style={{ opacity: "var(--q-case, 0)" }} />

      {/* TOP FACE: radiator fans */}
      <g style={{ opacity: "calc(.15 + .85 * var(--q-case, 0))" }}>
        <Face matrix={TOP} clip="bs-clip-top">
          <rect x="-20" y="-20" width="380" height="300" fill="#080d13" />
          <rect x="8" y="14" width="304" height="232" rx="16" stroke="#1b2634" strokeWidth="3" />
          <g style={fly("topfans", 0, -300)}>
            {[55, 160, 265].map((x) => <Fan key={x} cx={x} cy={130} r={46} />)}
          </g>
        </Face>
      </g>

      {/* FRONT FACE: three fans behind glass */}
      <g style={{ opacity: "calc(.15 + .85 * var(--q-case, 0))" }}>
        <Face matrix={FRONT} clip="bs-clip-front">
          <rect x="-10" y="-10" width="270" height="450" fill="#05080c" />
          <rect x="16" y="14" width="218" height="402" rx="10" stroke="#16212d" strokeWidth="3" />
          <g style={fly("front", 260, 0)}>
            {[72, 214, 356].map((v) => <Fan key={v} cx={125} cy={v} r={56} />)}
          </g>
          <polygon points="30,0 90,0 -20,430 -80,430" fill="#fff" opacity=".05" />
        </Face>
      </g>

      {/* SIDE FACE: the glass panel and everything inside it */}
      <g style={{ opacity: "calc(.15 + .85 * var(--q-case, 0))" }}>
        <Face matrix={SIDE} clip="bs-clip-side">
          <rect x="-10" y="-10" width="340" height="450" fill="url(#bs-inside)" />

          {/* power supply shroud: its top shelf (seen from above, giving the case a floor) and a perforated front */}
          <g style={fly("psu", 0, 260)}>
            <polygon points="0,336 320,336 378,323 58,323" fill="#0b121a" />
            <path d="M58 323 H320" stroke="#141e29" strokeWidth="2" />
            <rect x="0" y="336" width="320" height="100" fill="#05080c" />
            <path d="M0 336 H320" stroke={GLOW} strokeWidth="2" style={{ opacity: power(0.5, 0.12) }} />
            {Array.from({ length: 6 }, (_, r) => Array.from({ length: 16 }, (_, c) => (
              <circle key={`${r}-${c}`} cx={18 + c * 7.5} cy={356 + r * 9} r="1.7" fill="#131c27" />
            )))}
            <path d="M232 354 V404 M244 354 V404 M256 354 V404 M268 354 V404 M280 354 V404 M292 354 V404" stroke="#111924" strokeWidth="4" />
          </g>

          {/* rear exhaust fan on the back wall, seen at an angle through the glass */}
          <g style={fly("rear", -200, 0)}>
            <g transform="matrix(.5769 -.131 0 1 38 112)">
              <rect x="-54" y="-54" width="108" height="108" rx="12" fill="#070b10" stroke="#16212d" strokeWidth="3" />
              <Fan cx={0} cy={0} r={48} />
            </g>
          </g>

          {/* motherboard with rear I/O cover and a finned chipset heatsink */}
          <g style={fly("board", -260, -20, -6)}>
            <rect x="68" y="26" width="220" height="276" rx="7" fill="#0a121b" stroke="#1a2735" strokeWidth="2.5" />
            <path d="M80 160 H130 L150 140 H230 M120 60 V110 M240 60 V120" stroke={GLOW} strokeWidth="1.5" style={{ opacity: power(0.2, 0.1) }} />
            <path d="M68 34 H96 V118 L84 128 H68Z" fill="#101a24" stroke="#1d2a38" strokeWidth="2.5" />
            <path d="M88 44 V110" stroke={GLOW} strokeWidth="2" style={{ opacity: power(0.6, 0.12) }} />
            <rect x="204" y="278" width="64" height="20" rx="3" fill="#0f1822" stroke="#1d2a38" strokeWidth="2" />
            {[212, 220, 228, 236, 244, 252, 260].map((x) => <path key={x} d={`M${x} 282 L${x - 5} 294`} stroke="#1a2633" strokeWidth="2" />)}
          </g>

          {/* CPU tower cooler: fin stack, copper heat pipes and a big RGB fan */}
          <g style={fly("cooler", 0, -300)}>
            <rect x="98" y="40" width="108" height="14" rx="4" fill="#141d28" stroke="#1d2a38" strokeWidth="2.5" />
            <rect x="98" y="52" width="108" height="112" rx="10" fill="#0a1017" stroke="#1d2a38" strokeWidth="3" />
            {Array.from({ length: 12 }, (_, k) => 106 + k * 8.2).map((x) => <path key={x} d={`M${x} 58 V158`} stroke="#16212d" strokeWidth="2.5" />)}
            <Fan cx={152} cy={108} r={44} fancy />
          </g>

          {/* RAM with light strips */}
          <g style={fly("ram", 0, -260)}>
            {[218, 240].map((x) => (
              <g key={x}>
                <rect x={x} y="44" width="15" height="96" rx="2.5" fill="#0c131b" stroke="#1c2937" strokeWidth="2" />
                <rect x={x + 2} y="46" width="3.5" height="92" rx="1.5" fill={GLOW} style={{ opacity: power(0.75, 0.25) }} />
              </g>
            ))}
          </g>

          {/* graphics card, mounted flat in its slot and reaching out toward the glass: we see its long shroud edge and
              the backplate on top (its fans face down, lighting the shelf below) */}
          <g style={fly("gpu", 300, 0)}>
            <ellipse cx="140" cy="286" rx="150" ry="20" fill="url(#bs-glow)" style={{ opacity: power(0.5) }} />
            <rect x="6" y="198" width="9" height="74" rx="2" fill="#1b2633" />
            <polygon points="14,214 254,214 312,201 72,201" fill="#0e1620" stroke="#1f2c3a" strokeWidth="2" />
            <path d="M40 210 H262 M64 205 H286" stroke="#18222e" strokeWidth="1.5" />
            <rect x="14" y="214" width="240" height="54" rx="5" fill="#07090d" stroke="#1f2c3a" strokeWidth="2.5" />
            <path d="M28 224 H190 L204 236 H240" stroke={GLOW} strokeWidth="2.5" style={{ opacity: power(0.85, 0.15) }} />
            <path d="M28 256 H120 L132 246 H240" stroke="#151f2a" strokeWidth="2.5" />
            {Array.from({ length: 36 }, (_, k) => 24 + k * 6).map((x) => <path key={x} d={`M${x} 262 V267`} stroke="#121a24" strokeWidth="2" />)}
          </g>

          {/* a flash of light inside the case as the parts land */}
          <ellipse cx="170" cy="200" rx="230" ry="250" fill="url(#bs-glow)" style={{ opacity: "calc(var(--flash, 0) * .5)" }} />

          {/* glass: sheen and reflections slide on last */}
          <g style={{ opacity: "var(--q-glass, 0)", transform: "translateX(calc((1 - var(--q-glass, 0)) * -24px))" }}>
            <rect x="-10" y="-10" width="340" height="450" fill="url(#bs-glass)" />
            <polygon points="40,0 120,0 -10,430 -90,430" fill="#fff" opacity=".055" />
            <polygon points="170,0 196,0 66,430 40,430" fill="#fff" opacity=".035" />
          </g>
          <rect x="-10" y="-10" width="340" height="450" fill="url(#bs-shade)" />
          <rect x="7" y="7" width="306" height="416" rx="8" stroke="#0e1721" strokeWidth="3" />
        </Face>
      </g>

      {/* case edges and glints */}
      <g style={{ opacity: "var(--q-case, 0)" }}>
        <polygon points="150,110 470,140 470,570 150,540" stroke="#0c131b" strokeWidth="5" />
        <polygon points="470,140 620,120 620,550 470,570" stroke="#0c131b" strokeWidth="5" />
        <polygon points="150,110 470,140 620,120 300,90" stroke="#0c131b" strokeWidth="5" />
        <path d="M470 140 V570" stroke="#9fb3c8" strokeWidth="3" opacity=".55" />
        <path d="M150 110 L470 140 L620 120" stroke="#7e93a8" strokeWidth="2" opacity=".4" />
        <path d="M150 540 L470 570 L620 550" stroke="#5f7388" strokeWidth="2" opacity=".35" />
        <path d="M150 110 V540" stroke="#4d6073" strokeWidth="2" opacity=".35" />
      </g>
      </g>

      {/* the parts floating around the case, spiralling in together */}
      {FLOATS.map((f) => (
        <Floater key={f.id} id={f.id} from={portrait ? f.tall : f.wide} to={f.to} appear="case" bob={f.bob} swirl={0.22}>{f.el}</Floater>
      ))}
    </svg>
  );
}

import type { CSSProperties, ReactNode } from "react";

/**
 * A modern glass-panel PC case in three-quarter view that assembles as you scroll.
 * Every part reads its own progress from a CSS variable (--q-<name>, 0 to 1) that HomeHero updates on a timer;
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

/** A part that slides in from an offset (dx, dy) in its face's local units, with a slight tilt, and fades up. */
const fly = (id: string, dx: number, dy: number, rot = 0): CSSProperties => ({
  transform: `translate(calc((1 - var(--q-${id}, 0)) * ${dx}px), calc((1 - var(--q-${id}, 0)) * ${dy}px)) rotate(calc((1 - var(--q-${id}, 0)) * ${rot}deg))`,
  opacity: `calc(.07 + .93 * var(--q-${id}, 0))`,
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
  return (
    <svg viewBox="110 56 550 548" preserveAspectRatio="xMidYMid meet" className="h-full w-full" aria-hidden="true"
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
      <ellipse cx="395" cy="580" rx="290" ry="22" fill="#000" opacity=".28" />
      <ellipse cx="395" cy="580" rx="260" ry="20" fill="url(#bs-floor)" style={{ opacity: power(1) }} />

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

          {/* power supply shroud with two intake fans */}
          <g style={fly("psu", 0, 260)}>
            <rect x="0" y="336" width="320" height="100" fill="#05080c" />
            <path d="M0 336 H320" stroke={GLOW} strokeWidth="2" style={{ opacity: power(0.5, 0.12) }} />
            <path d="M10 360 H60 M10 372 H60 M260 360 H312 M260 372 H312" stroke="#16212d" strokeWidth="3" />
          </g>

          {/* motherboard with VRM armor and chipset block */}
          <g style={fly("board", -260, -20, -6)}>
            <rect x="68" y="26" width="220" height="256" rx="7" fill="#0a121b" stroke="#1a2735" strokeWidth="2.5" />
            <path d="M80 160 H130 L150 140 H230 M170 258 H250 L270 238 M120 60 V110 M240 60 V120" stroke={GLOW} strokeWidth="1.5" style={{ opacity: power(0.2, 0.1) }} />
            <rect x="196" y="196" width="74" height="58" rx="5" fill="#101a24" stroke="#1d2a38" strokeWidth="2.5" />
            <path d="M206 214 H258 M206 228 H240" stroke={GLOW} strokeWidth="2" style={{ opacity: power(0.5, 0.15) }} />
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

          {/* graphics card */}
          <g style={fly("gpu", 420, 10, 3)}>
            <rect x="22" y="246" width="284" height="76" rx="9" fill="#07090d" stroke="#1f2c3a" strokeWidth="3" />
            <path d="M34 252 H294" stroke={GLOW} strokeWidth="2" style={{ opacity: power(0.6, 0.15) }} />
            <rect x="12" y="240" width="11" height="88" rx="2" fill="#1b2633" />
            <rect x="294" y="242" width="9" height="84" rx="2" fill="#121b25" />
            {[82, 164, 246].map((x) => <Fan key={x} cx={x} cy={286} r={27} />)}
          </g>

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
    </svg>
  );
}

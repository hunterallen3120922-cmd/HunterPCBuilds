import type { CSSProperties } from "react";

/**
 * Line-art PC that assembles as you scroll. Every part reads its own progress from a CSS variable
 * (--q-<name>, 0 to 1) that HomeHero updates while scrolling; --p (0 to 1) is the overall progress.
 * The drawing uses a fixed coordinate space and scales to fit any box ("meet"), so it never crops.
 */

/** A part that slides in from an offset (dx, dy) with a slight tilt (rot) and fades up. */
const fly = (id: string, dx: number, dy: number, rot = 0): CSSProperties => ({
  transform: `translate(calc((1 - var(--q-${id}, 0)) * ${dx}px), calc((1 - var(--q-${id}, 0)) * ${dy}px)) rotate(calc((1 - var(--q-${id}, 0)) * ${rot}deg))`,
  opacity: `calc(.1 + .9 * var(--q-${id}, 0))`,
  transformBox: "fill-box",
  transformOrigin: "center",
});

/** A stroke that draws itself in (needs pathLength={1} on the element). */
const draw = (id: string): CSSProperties => ({
  strokeDasharray: 1,
  strokeDashoffset: `calc((1 - var(--q-${id}, 0)) * 1px)`,
});

/** A case/cooler fan whose blades turn with the scroll. */
function Fan({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const blades = Array.from({ length: 7 }, (_, k) => (k * 360) / 7);
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} className="fill-bg stroke-accent" strokeWidth={3} />
      <g style={{ transform: "rotate(calc(var(--p, 0) * 1800deg))", transformBox: "fill-box", transformOrigin: "center" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="none" />
        {blades.map((a) => (
          <path key={a} transform={`translate(${cx} ${cy}) rotate(${a})`}
            d={`M0 0 C ${r * 0.2} ${-r * 0.05} ${r * 0.75} ${-r * 0.1} ${r * 0.82} ${-r * 0.5} C ${r * 0.5} ${-r * 0.5} ${r * 0.2} ${-r * 0.35} 0 0Z`}
            className="fill-accent/30 stroke-accent" strokeWidth={1.5} strokeLinejoin="round" />
        ))}
      </g>
      <circle cx={cx} cy={cy} r={r * 0.16} className="fill-accent" />
    </g>
  );
}

export default function BuildScene() {
  return (
    <svg viewBox="180 20 640 700" preserveAspectRatio="xMidYMid meet" className="h-full w-full" aria-hidden="true"
      fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* soft floor shadow */}
      <ellipse cx="500" cy="690" rx="215" ry="13" className="fill-accent" style={{ opacity: "calc(var(--q-power, 0) * .14)" }} />

      {/* case: outline draws itself, glows when powered on */}
      <g style={{ filter: "drop-shadow(0 0 calc(var(--q-power, 0) * 16px) rgba(62,207,154,.55))" }}>
        <rect x="300" y="60" width="400" height="600" rx="26" className="fill-card" style={{ opacity: "calc(.25 + .75 * var(--q-case, 0))" }} />
        <rect x="300" y="60" width="400" height="600" rx="26" pathLength={1} className="stroke-accent" strokeWidth={6} style={draw("case")} />
        <rect x="316" y="76" width="368" height="568" rx="16" className="fill-bg stroke-line" strokeWidth={2} style={{ opacity: "var(--q-case, 0)" }} />
        <rect x="316" y="76" width="368" height="568" rx="16" className="fill-accent" style={{ opacity: "calc(var(--q-power, 0) * .07)" }} />
      </g>

      {/* front fans */}
      {[170, 262, 354].map((y, i) => (
        <g key={y} style={fly("fans", -220 - i * 40, 0)}><Fan cx={344} cy={y} r={22} /></g>
      ))}

      {/* power supply */}
      <g style={fly("psu", 0, 380)}>
        <rect x="324" y="548" width="352" height="88" rx="10" className="fill-card stroke-accent" strokeWidth={4} />
        <Fan cx={392} cy={592} r={30} />
        <path d="M456 568 H650 M456 592 H650 M456 616 H610" className="stroke-line" strokeWidth={3} />
      </g>

      {/* motherboard */}
      <g style={fly("mb", -520, -40, -10)}>
        <rect x="392" y="96" width="268" height="380" rx="8" className="fill-bg2 stroke-accent/70" strokeWidth={3} />
        <path d="M392 300 H430 L450 280 H540 M660 200 H620 L600 180 M420 440 H520 L540 420 H640 M470 230 V300"
          className="stroke-line" strokeWidth={2.5} />
        <rect x="426" y="138" width="74" height="74" rx="6" className="stroke-line" strokeWidth={2} strokeDasharray="6 6" />
        <circle cx="620" cy="450" r="5" className="fill-accent2" />
      </g>

      {/* M.2 SSD */}
      <g style={fly("ssd", 300, 40, 8)}>
        <rect x="430" y="258" width="92" height="18" rx="4" className="fill-card stroke-accent2" strokeWidth={3} />
        <rect x="498" y="262" width="16" height="10" rx="2" className="fill-accent2/40" />
      </g>

      {/* CPU, then cooler on top of it */}
      <g style={fly("cpu", 0, -440)}>
        <rect x="438" y="150" width="50" height="50" rx="6" className="fill-accent/20 stroke-accent" strokeWidth={4} />
        <rect x="452" y="164" width="22" height="22" rx="3" className="stroke-accent" strokeWidth={2} />
      </g>
      <g style={fly("cooler", 0, -480)}>
        <rect x="418" y="130" width="90" height="90" rx="14" className="fill-card stroke-accent" strokeWidth={5} />
        <Fan cx={463} cy={175} r={32} />
      </g>

      {/* RAM sticks */}
      {[
        { id: "ram1", x: 548 },
        { id: "ram2", x: 578 },
      ].map(({ id, x }) => (
        <g key={id} style={fly(id, 0, -460)}>
          <rect x={x} y="112" width="20" height="152" rx="4" className="fill-card stroke-accent2" strokeWidth={4} />
          {[128, 158, 188, 218].map((y) => <rect key={y} x={x + 5} y={y} width="10" height="18" rx="2" className="fill-accent2/35" />)}
        </g>
      ))}

      {/* graphics card */}
      <g style={fly("gpu", 520, 40, 6)}>
        <rect x="380" y="330" width="290" height="78" rx="10" className="fill-card stroke-accent" strokeWidth={5} />
        <rect x="370" y="326" width="9" height="86" rx="2" className="fill-accent" />
        {[440, 515, 590].map((x) => <Fan key={x} cx={x} cy={369} r={26} />)}
        <path d="M650 344 V394" className="stroke-line" strokeWidth={3} />
      </g>

      {/* cables */}
      <g className="stroke-accent2" strokeWidth={5} fill="none">
        <path d="M440 548 V524 H372 V300 H392" pathLength={1} style={draw("cables")} />
        <path d="M630 548 V524 H672 V400 H660" pathLength={1} style={draw("cables")} />
      </g>
    </svg>
  );
}

/**
 * Behind the home page opening: a few faint green circuit-board traces running out to the edges. Every few
 * seconds a single bright pulse travels along one of them, then it goes quiet again.
 *
 * The traces and their pads are one still drawing (public/hero/circuit.svg). Only the pulses move: each is a short
 * dash slid along its trace (.circuit-pulse in index.css), so nothing else is redrawn. A page-coloured wash
 * (.circuit-wash) sits over the traces behind the headline so the text stays easy to read.
 * The pulses pause while the opening is scrolled out of view, and stay still for people who prefer reduced motion.
 */
const asset = (name: string) => `${import.meta.env.BASE_URL}hero/${name}`;

/** Seconds between one pulse and the next (the four take turns, so each runs once every 4 × this). */
const PULSE_GAP = 7;

// The traces that carry a pulse (same coordinates as circuit.svg, a 1440 × 900 drawing)
const pulses = [
  "M295 702L119 702L93 728L-80 728",
  "M1135 702L1276 702L1302 676L1520 676",
  "M1117 650L1302 650L1328 624L1520 624",
  "M281 390L111 390L85 364L-80 364",
];

export default function CircuitBackdrop() {
  return (
    <div className="hero-circuit pointer-events-none absolute inset-0 -z-30" aria-hidden>
      <img src={asset("circuit.svg")} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" fill="none" className="absolute inset-0 h-full w-full">
        {pulses.map((d, i) => (
          <g key={d} className="circuit-pulse" style={{ animationDelay: `${i * PULSE_GAP + 1.5}s` }}>
            <path d={d} pathLength={1000} stroke="#3ecf9a" strokeOpacity=".25" strokeWidth={5} strokeLinecap="round" />
            <path d={d} pathLength={1000} stroke="#a8f5d6" strokeOpacity=".85" strokeWidth={1.4} strokeLinecap="round" />
          </g>
        ))}
      </svg>
      <div className="circuit-wash absolute inset-0" />
    </div>
  );
}

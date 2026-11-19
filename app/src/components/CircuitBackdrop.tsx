/**
 * Behind the home page opening: green circuit-board traces running out to the edges, with a few bright
 * pulses travelling along them.
 *
 * The traces and their pads are one still drawing (public/hero/circuit.svg). Only the pulses move: each is a short
 * dash slid along its trace (.circuit-pulse in index.css), so nothing else is redrawn. A page-coloured wash
 * (.circuit-wash) sits over the traces behind the headline so the text stays easy to read.
 * The pulses pause while the opening is scrolled out of view, and stay still for people who prefer reduced motion.
 */
const asset = (name: string) => `${import.meta.env.BASE_URL}hero/${name}`;

// The traces that carry a pulse (same coordinates as circuit.svg, a 1440 × 900 drawing)
const pulses = [
  "M486 214L409 214L357 162L-80 162",
  "M521 240L428 240L376 292L242 292L190 344L82 344L56 318L-80 318",
  "M370 370L290 370L238 318L115 318L89 344L-80 344",
  "M334 500L156 500L104 552L-20 552L-46 578L-183 578L-209 604L-80 604",
  "M350 526L236 526L210 500L-80 500",
  "M494 760L305 760L279 786L-80 786",
  "M498 786L311 786L259 838L-80 838",
  "M895 136L1074 136L1100 110L1188 110L1214 84L1520 84",
  "M953 162L1111 162L1163 214L1520 214",
  "M1113 474L1226 474L1252 500L1330 500L1356 474L1520 474",
  "M1107 578L1180 578L1206 552L1309 552L1361 500L1520 500",
  "M1088 604L1247 604L1273 578L1483 578L1535 526L1520 526",
  "M957 760L1028 760L1080 812L1520 812",
];

export default function CircuitBackdrop() {
  return (
    <div className="hero-circuit pointer-events-none absolute inset-0 -z-30" aria-hidden>
      <img src={asset("circuit.svg")} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" fill="none" className="absolute inset-0 h-full w-full">
        {pulses.map((d, i) => (
          <g key={d} className="circuit-pulse" style={{ animationDuration: `${5 + (i % 4) * 1.3}s`, animationDelay: `${-i * 1.7}s` }}>
            <path d={d} pathLength={1000} stroke="#3ecf9a" strokeOpacity=".35" strokeWidth={6} strokeLinecap="round" />
            <path d={d} pathLength={1000} stroke="#a8f5d6" strokeWidth={1.6} strokeLinecap="round" />
          </g>
        ))}
      </svg>
      <div className="circuit-wash absolute inset-0" />
    </div>
  );
}

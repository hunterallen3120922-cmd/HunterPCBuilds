/**
 * Behind the home page opening: a few faint green circuit-board traces running out to the edges. Every few
 * seconds a single bright pulse travels along one of them, then it goes quiet again.
 *
 * The traces and their pads are one still drawing (public/hero/circuit.svg). Only the pulses move: each is a short
 * dash slid along its trace (.circuit-pulse in index.css), so nothing else is redrawn. A page-coloured wash
 * (.circuit-wash) sits over the traces behind the headline so the text stays easy to read.
 * The pulses pause while the opening is scrolled out of view, and stay still for people who prefer reduced motion.
 *
 * Speed: only the one pulse that's travelling is animated. (A looping CSS animation per trace kept all four
 * ticking every frame, even during the long quiet stretch between pulses.)
 */
import { useEffect, useRef } from "react";

const asset = (name: string) => `${import.meta.env.BASE_URL}hero/${name}`;

/** Seconds between one pulse and the next (the four take turns, so each runs once every 4 × this). */
const PULSE_GAP = 7;
/** Seconds one pulse takes to travel its trace, and before the first one starts. */
const PULSE_TIME = 4.2, FIRST = 1.5;

// The traces that carry a pulse (same coordinates as circuit.svg, a 1440 × 900 drawing)
const pulses = [
  "M295 702L119 702L93 728L-80 728",
  "M1135 702L1276 702L1302 676L1520 676",
  "M1117 650L1302 650L1328 624L1520 624",
  "M281 390L111 390L85 364L-80 364",
];

export default function CircuitBackdrop() {
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const el = svg.current;
    if (!el || !el.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const groups = Array.from(el.querySelectorAll<SVGGElement>(".circuit-pulse"));
    let n = 0, timer = 0, run: Animation | null = null;
    const fire = () => {
      timer = window.setTimeout(fire, PULSE_GAP * 1000);
      const g = groups[n++ % groups.length];
      // Skipped (but kept in turn) while the opening is off screen or the tab is hidden
      if (document.hidden || el.closest('[data-offscreen="true"]')) return;
      run = g.animate([{ strokeDashoffset: 45 }, { strokeDashoffset: -1000 }], { duration: PULSE_TIME * 1000, easing: "linear" });
    };
    timer = window.setTimeout(fire, FIRST * 1000);
    return () => { clearTimeout(timer); run?.cancel(); };
  }, []);
  return (
    <div className="hero-circuit pointer-events-none absolute inset-0 -z-30" aria-hidden>
      <img src={asset("circuit.svg")} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <svg ref={svg} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" fill="none" className="absolute inset-0 h-full w-full">
        {pulses.map((d) => (
          <g key={d} className="circuit-pulse">
            <path d={d} pathLength={1000} stroke="#3ecf9a" strokeOpacity=".25" strokeWidth={5} strokeLinecap="round" />
            <path d={d} pathLength={1000} stroke="#a8f5d6" strokeOpacity=".85" strokeWidth={1.4} strokeLinecap="round" />
          </g>
        ))}
      </svg>
      <div className="circuit-wash absolute inset-0" />
    </div>
  );
}

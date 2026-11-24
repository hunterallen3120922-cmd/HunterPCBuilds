import type { ReactNode } from "react";
import type { CatalogItem } from "../content/prints";

/**
 * Line drawings for the ready-made 3D prints, in the same style as the build walkthrough's part cards.
 * Strokes use the text color; the green bits are the "printed" part.
 */
const art: Record<CatalogItem["art"], ReactNode> = {
  bracket: (
    <>
      <rect x="14" y="20" width="92" height="22" rx="3" className="pa-dim" />
      <path d="M22 31h76" className="pa-dim" strokeDasharray="3 4" />
      <path d="M70 42v34M62 76h16" className="pa-print" />
      <path d="M66 50h8M66 58h8M66 66h8" className="pa-print" strokeWidth="1.5" />
    </>
  ),
  comb: (
    <>
      <path d="M20 40h80v14H20z" className="pa-print pa-fill" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => <circle key={i} cx={28 + i * 10.7} cy="47" r="3.2" className="pa-dim" />)}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => <path key={`c${i}`} d={`M${28 + i * 10.7} 14v26M${28 + i * 10.7} 54v24`} className="pa-dim" strokeWidth="1.5" />)}
    </>
  ),
  stand: (
    <>
      <path d="M38 82h44M60 82V24M60 24c-14 0-22 6-22 12M60 24c14 0 22 6 22 12" className="pa-print" />
      <path d="M36 40c-8 2-10 14-4 20M84 40c8 2 10 14 4 20" className="pa-dim" />
      <path d="M38 34c4-14 40-14 44 0" className="pa-dim" />
    </>
  ),
  controller: (
    <>
      <path d="M30 78h60l-6-30H36z" className="pa-print pa-fill" />
      <path d="M40 48c-2-12 8-20 20-20s22 8 20 20" className="pa-dim" />
      <path d="M50 36h4M52 34v4M66 36h.01M70 38h.01" className="pa-dim" />
    </>
  ),
  grill: (
    <>
      <rect x="28" y="12" width="64" height="64" rx="8" className="pa-dim" />
      <circle cx="60" cy="44" r="26" className="pa-print" />
      <circle cx="60" cy="44" r="16" className="pa-print" />
      <circle cx="60" cy="44" r="6" className="pa-print pa-fill" />
      <path d="M60 18v52M34 44h52" className="pa-print" strokeWidth="1.5" />
    </>
  ),
  keycap: (
    <>
      <path d="M24 70l8-34h24l8 34z" className="pa-dim" />
      <path d="M56 70l8-34h24l8 34z" className="pa-print pa-fill" />
      <path d="M68 46h16l3 14H65z" className="pa-print" />
      <path d="M40 46h8" className="pa-dim" />
    </>
  ),
  plate: (
    <>
      <rect x="14" y="26" width="92" height="38" rx="7" className="pa-print pa-fill" />
      <path d="M36 34l-8 12h7l-3 10 9-13h-7l3-9z" className="pa-print" strokeWidth="1.6" />
      <path d="M52 40h40M52 50h28" className="pa-print" strokeWidth="2.4" />
      <path d="M30 64l-6 14M90 64l6 14" className="pa-dim" />
    </>
  ),
};

export default function PrintArt({ kind, className = "" }: { kind: CatalogItem["art"]; className?: string }) {
  return (
    <svg viewBox="0 0 120 90" className={`print-art ${className}`} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {art[kind]}
    </svg>
  );
}

/** A shape that keeps changing form: square, circle, star, hexagon, gear… (the "Something custom" card). */
const N = 24;
function shape(fn: (a: number, i: number) => number) {
  const pts = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const r = fn(a, i);
    return `${(50 + Math.cos(a) * r).toFixed(2)} ${(50 + Math.sin(a) * r).toFixed(2)}`;
  });
  return `M${pts.join("L")}Z`;
}
const polygonR = (sides: number, R: number) => (a: number) => {
  const k = Math.PI / sides;
  const t = ((((a + Math.PI / 2) % (2 * k)) + 2 * k) % (2 * k)) - k;
  return (R * Math.cos(k)) / Math.cos(t);
};
const SHAPES = [
  shape(polygonR(4, 38)),                        // square
  shape(() => 32),                               // circle
  shape((_, i) => (i % 3 === 0 ? 40 : 22)),      // star
  shape(polygonR(6, 36)),                        // hexagon
  shape((_, i) => (i % 2 === 0 ? 36 : 28)),      // gear
  shape(polygonR(3, 42)),                        // triangle
];
const VALUES = [...SHAPES, SHAPES[0]].join(";");

export function MorphShape({ className = "" }: { className?: string }) {
  const still = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  return (
    <svg viewBox="0 0 100 100" className={`morph-shape ${className}`} aria-hidden>
      <g className="morph-spin">
        <path d={SHAPES[0]} className="morph-fill">
          {!still && <animate attributeName="d" dur="9s" repeatCount="indefinite" values={VALUES}
            keyTimes={Array.from({ length: SHAPES.length + 1 }, (_, i) => (i / SHAPES.length).toFixed(3)).join(";")}
            calcMode="spline" keySplines={Array.from({ length: SHAPES.length }, () => ".6 0 .3 1").join(";")} />}
        </path>
      </g>
      <path d="M8 92h84" className="morph-bed" />
    </svg>
  );
}

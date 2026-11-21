import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { Blades, Defs, Fan, GLOW, Hub, REAR_LOCAL, VIEW, VIEWBOX, boxAt, mul, pct, svgMatrix, type Matrix, type Mode } from "../BuildScene";
import { customParts } from "../../content/customParts";
import type { Category, Pick } from "../../lib/configurator";

/**
 * A PC that fills in as parts are chosen (the build request form's workbench, see Workbench.tsx). Every part option is its own pre-drawn layer, so choosing a part
 * only fades/slides layers (opacity + transform). Nothing is redrawn, so it stays as cheap as the PC Builds animation.
 *
 * The case has a real shape per size (ITX, Micro-ATX, ATX): its width, height and depth, its fans and the size of
 * the motherboard all change. Parts are drawn in "ATX space" (u 0..320, v 0..430) and scaled down to fit smaller cases.
 */

// ---- case geometry ----
interface Geo {
  key: string; W: number; H: number; D: number; s: number; board: [number, number];
  frontFans: number[]; frontR: number; topFans: number[];
  side: Matrix; front: Matrix; top: Matrix; inner: Matrix;
  pts: Record<"A" | "B" | "C" | "D" | "E" | "F" | "G", [number, number]>;
}
function makeGeo(key: string, W: number, H: number, D: number, board: [number, number], frontFans: number[], frontR: number, topFans: number[]): Geo {
  const s = H / 430;
  const Ax = 385 - (W + 0.6 * D) / 2, Ay = 540 - H;
  const side: Matrix = [1, 0.09375, 0, 1, Ax, Ay];
  const B: [number, number] = [Ax + W, Ay + W * 0.09375];
  const front: Matrix = [0.6, -0.08, 0, 1, B[0], B[1]];
  const top: Matrix = [1, 0.09375, 0.5769, -0.0769, Ax, Ay];
  const dx = 0.6 * D, dy = -0.08 * D;
  return {
    key, W, H, D, s, board, frontFans, frontR, topFans, side, front, top, inner: mul(side, [s, 0, 0, s, 0, 0]),
    pts: { A: [Ax, Ay], B, C: [B[0], B[1] + H], D: [Ax, Ay + H], E: [B[0] + dx, B[1] + dy], F: [B[0] + dx, B[1] + dy + H], G: [Ax + dx, Ay + dy] },
  };
}
/** By position in customParts.case: Medium (Micro-ATX), Large (ATX), Mini (ITX). */
export const GEOS: Geo[] = [
  makeGeo("matx", 290, 340, 230, [220, 230], [100, 240], 54, [70, 190]),
  makeGeo("atx", 320, 430, 250, [220, 276], [72, 214, 356], 56, [55, 160, 265]),
  makeGeo("itx", 250, 270, 190, [180, 180], [135], 60, []),
];
const GeoCtx = createContext<Geo>(GEOS[1]);
const useGeo = () => useContext(GeoCtx);
const poly = (...p: [number, number][]) => p.map((q) => q.join(",")).join(" ");

const Clip = ({ id, children, m }: { id: string; m: Matrix; children: ReactNode }) => {
  const g = useGeo();
  return <g clipPath={`url(#pv-${id}-${g.key})`}><g transform={svgMatrix(m)}>{children}</g></g>;
};
/** Something on the side glass, drawn in the case's own side-face space (u 0..W, v 0..H). */
const SideFace = ({ children }: { children: ReactNode }) => { const g = useGeo(); return <Clip id="side" m={g.side}>{children}</Clip>; };
/** An installed part, drawn in ATX space and scaled to fit the case. */
const Side = ({ children }: { children: ReactNode }) => { const g = useGeo(); return <Clip id="side" m={g.inner}>{children}</Clip>; };
const TopFace = ({ children }: { children: ReactNode }) => { const g = useGeo(); return <Clip id="top" m={g.top}>{children}</Clip>; };
const FrontFace = ({ children }: { children: ReactNode }) => { const g = useGeo(); return <Clip id="front" m={g.front}>{children}</Clip>; };

function GeoDefs() {
  return (
    <defs>
      {GEOS.map((g) => {
        const { A, B, C, D, E, F, G } = g.pts;
        return (
          <g key={g.key}>
            <clipPath id={`pv-side-${g.key}`}><polygon points={poly(A, B, C, D)} /></clipPath>
            <clipPath id={`pv-front-${g.key}`}><polygon points={poly(B, E, F, C)} /></clipPath>
            <clipPath id={`pv-top-${g.key}`}><polygon points={poly(A, B, E, G)} /></clipPath>
          </g>
        );
      })}
    </defs>
  );
}

const T = "opacity .3s ease, transform .65s cubic-bezier(.25,1.6,.45,1)";
const Layer = ({ on, z, children, style }: { on: boolean; z?: number; children: ReactNode; style?: CSSProperties }) => (
  <div className="absolute inset-0" style={{ transition: T, opacity: on ? 1 : 0, transform: on ? "none" : "translateY(-22%) scale(1.04)", zIndex: z, pointerEvents: "none", ...style }}>
    <svg viewBox={VIEWBOX} className="h-full w-full overflow-visible" fill="none" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
  </div>
);

// ---- the case itself ----
function CaseBack() {
  const g = useGeo();
  const { C, D, F } = g.pts;
  const foot = (x: number, y: number, w: number) => `M${x} ${y} l${w} 2 v16 l${-w} -2Z`;
  return (
    <>
      <path d={[foot(D[0] + 18, D[1], 48), foot(C[0] - 36, C[1] - 2, 66), foot(F[0] - 36, F[1] - 2, 34)].join("")} fill="#05080c" />
      <TopFace>
        <rect x="-20" y="-20" width={g.W + 60} height={g.D * 1.04 + 60} fill="#080d13" />
        <rect x="8" y="14" width={g.W - 16} height={g.D * 1.04 - 28} rx="16" stroke="#1b2634" strokeWidth="3" />
        {g.topFans.length === 0 && <path d={Array.from({ length: 7 }, (_, r) => `M24 ${30 + r * 22} H${g.W - 24}`).join("")} stroke="#121b25" strokeWidth="5" />}
      </TopFace>
      <FrontFace>
        <rect x="-10" y="-10" width={g.D + 20} height={g.H + 20} fill="#05080c" />
        <rect x="16" y="14" width={g.D - 32} height={g.H - 28} rx="10" stroke="#16212d" strokeWidth="3" />
      </FrontFace>
      <SideFace><rect x="-10" y="-10" width={g.W + 20} height={g.H + 20} fill="url(#bs-inside)" /></SideFace>
      {/* power supply shroud across the bottom */}
      <SideFace>
        <polygon points={poly([0, g.H - 94 * g.s], [g.W, g.H - 94 * g.s], [g.W + 58 * g.s, g.H - 107 * g.s], [58 * g.s, g.H - 107 * g.s])} fill="#0b121a" />
        <rect x="0" y={g.H - 94 * g.s} width={g.W} height={100} fill="#05080c" />
        <path d={`M0 ${g.H - 94 * g.s} H${g.W}`} stroke={GLOW} strokeWidth="2" opacity=".35" />
      </SideFace>
    </>
  );
}
function Glass() {
  const g = useGeo();
  return (
    <SideFace>
      <rect x="-10" y="-10" width={g.W + 20} height={g.H + 20} fill="url(#bs-glass)" />
      <polygon points={`40,0 120,0 ${120 - g.H * 0.3},${g.H} ${40 - g.H * 0.3},${g.H}`} fill="#fff" opacity=".055" />
      <polygon points={`170,0 196,0 ${196 - g.H * 0.3},${g.H} ${170 - g.H * 0.3},${g.H}`} fill="#fff" opacity=".035" />
    </SideFace>
  );
}
function CaseFront() {
  const g = useGeo();
  const { A, B, C, D, E, F, G } = g.pts;
  return (
    <>
      <FrontFace><polygon points={`30,0 90,0 ${90 - g.H * 0.25},${g.H} ${30 - g.H * 0.25},${g.H}`} fill="#fff" opacity=".05" /></FrontFace>
      <SideFace>
        <rect x="-10" y="-10" width={g.W + 20} height={g.H + 20} fill="url(#bs-shade)" />
        <rect x="7" y="7" width={g.W - 14} height={g.H - 14} rx="8" stroke="#0e1721" strokeWidth="3" />
      </SideFace>
      <polygon points={poly(A, B, C, D)} stroke="#0c131b" strokeWidth="5" />
      <polygon points={poly(B, E, F, C)} stroke="#0c131b" strokeWidth="5" />
      <polygon points={poly(A, B, E, G)} stroke="#0c131b" strokeWidth="5" />
      <path d={`M${B} V${C[1]}`} stroke="#9fb3c8" strokeWidth="3" opacity=".55" />
      <path d={`M${A} L${B} L${E}`} stroke="#7e93a8" strokeWidth="2" opacity=".4" />
      <path d={`M${D} L${C} L${F}`} stroke="#5f7388" strokeWidth="2" opacity=".35" />
      <path d={`M${A} V${D[1]}`} stroke="#4d6073" strokeWidth="2" opacity=".35" />
    </>
  );
}
/** Every case fan as (face matrix, centre, radius), so the drawing and the turning blade layers agree. */
const caseFans = (g: Geo) => [
  ...g.topFans.map((x) => ({ m: g.top, cx: x, cy: 130 * Math.min(1, g.D / 250), r: 46 })),
  ...g.frontFans.map((v) => ({ m: g.front, cx: g.D / 2, cy: v, r: g.frontR })),
  { m: mul(g.inner, REAR_LOCAL), cx: 0, cy: 0, r: 48 },
];
const CaseFans = ({ mode }: { mode: Mode }) => {
  const g = useGeo();
  return (
    <>
      <TopFace>{g.topFans.map((x) => <Fan key={x} cx={x} cy={130 * Math.min(1, g.D / 250)} r={46} mode={mode} />)}</TopFace>
      <FrontFace>{g.frontFans.map((v) => <Fan key={v} cx={g.D / 2} cy={v} r={g.frontR} mode={mode} />)}</FrontFace>
      <Side><g transform={svgMatrix(REAR_LOCAL)}><rect x="-54" y="-54" width="108" height="108" rx="12" fill="#070b10" stroke="#16212d" strokeWidth="3" /><Fan cx={0} cy={0} r={48} mode={mode} /></g></Side>
    </>
  );
};

// ---- part drawings (flat, in ATX space: u 0..320, v 0..430) ----
const Board = ({ ram }: { ram: number }) => {
  const [bw, bh] = useGeo().board;
  return (
    <Side>
      <rect x="68" y="26" width={bw} height={bh} rx="7" fill="#0a121b" stroke="#1a2735" strokeWidth="2.5" />
      <path d={`M80 ${26 + bh * 0.48} H130 L150 ${26 + bh * 0.41} H${68 + bw - 58} M120 60 V110`} stroke={GLOW} strokeWidth="1.5" opacity=".3" />
      <path d="M68 34 H96 V118 L84 128 H68Z" fill="#101a24" stroke="#1d2a38" strokeWidth="2.5" />
      <path d="M88 44 V110" stroke={GLOW} strokeWidth="2" opacity=".7" />
      {bh > 200 && <rect x={68 + bw - 84} y={26 + bh - 24} width="64" height="20" rx="3" fill="#0f1822" stroke="#1d2a38" strokeWidth="2" />}
      <rect x="124" y="80" width="56" height="56" rx="4" fill="#0f1822" stroke="#2a3a4c" strokeWidth="2" />
      {(bw < 200 ? [212, 228] : ram === 4 ? [214, 228, 242, 256] : [218, 240]).map((x) => (
        <g key={x}>
          <rect x={x} y="44" width={ram === 4 && bw >= 200 ? 11 : 13} height="96" rx="2.5" fill="#0c131b" stroke="#1c2937" strokeWidth="2" />
          <rect x={x + 2} y="46" width="3.5" height="92" rx="1.5" fill={GLOW} opacity=".85" />
        </g>
      ))}
    </Side>
  );
};
const AirCooler = () => (
  <Side>
    <rect x="98" y="40" width="108" height="14" rx="4" fill="#141d28" stroke="#1d2a38" strokeWidth="2.5" />
    <rect x="98" y="52" width="108" height="112" rx="10" fill="#0a1017" stroke="#1d2a38" strokeWidth="3" />
    <path d={Array.from({ length: 12 }, (_, k) => `M${106 + k * 8.2} 58V158`).join("")} stroke="#16212d" strokeWidth="2.5" />
    <Fan cx={152} cy={108} r={44} fancy mode="lit" />
  </Side>
);
const WaterCooler = ({ lcd }: { lcd: boolean }) => (
  <>
    <TopFace>
      <rect x="4" y="78" width="312" height="104" rx="8" fill="#0d151e" stroke="#22303f" strokeWidth="3" />
    </TopFace>
    <Side>
      <path d="M138 80 C 134 40 112 20 96 -8 M166 80 C 172 40 196 20 212 -8" stroke="#1a2531" strokeWidth="10" />
      <path d="M138 80 C 134 40 112 20 96 -8 M166 80 C 172 40 196 20 212 -8" stroke="#0b1118" strokeWidth="5" />
      <rect x="116" y="72" width="72" height="72" rx="14" fill="#0a1017" stroke="#2a3a4c" strokeWidth="3" />
      <circle cx="152" cy="108" r="28" fill={lcd ? "#06140f" : "#070b10"} stroke={GLOW} strokeWidth="3" opacity=".95" />
      {lcd ? (
        <>
          <path d="M136 116 A 18 18 0 1 1 168 116" stroke={GLOW} strokeWidth="3" opacity=".9" />
          <text x="152" y="113" textAnchor="middle" fontSize="13" fontFamily="Geist Mono, monospace" fill={GLOW}>42°</text>
        </>
      ) : <circle cx="152" cy="108" r="9" fill={GLOW} opacity=".7" />}
    </Side>
  </>
);
const GPU_LEN = [0.64, 0.74, 0.83, 0.93, 1];
const Gpu = ({ tier }: { tier: number }) => (
  <Side>
    <ellipse cx="140" cy="286" rx={150 * GPU_LEN[tier]} ry="20" fill="url(#bs-glow)" opacity={0.25 + tier * 0.08} />
    <rect x="6" y="198" width="9" height="74" rx="2" fill="#1b2633" />
    <g transform={`translate(14 0) scale(${GPU_LEN[tier]} 1) translate(-14 0)`}>
      <polygon points="14,214 254,214 312,201 72,201" fill="#0e1620" stroke="#1f2c3a" strokeWidth="2" />
      <rect x="14" y="214" width="240" height="54" rx="5" fill="#07090d" stroke="#1f2c3a" strokeWidth="2.5" />
      <polygon points="254,214 312,201 312,255 254,268" fill="#0b121a" stroke="#1f2c3a" strokeWidth="2" />
      <path d="M256 220 L310 208" stroke={GLOW} strokeWidth="1.5" opacity=".7" />
      <path d="M28 224 H190 L204 236 H240" stroke={GLOW} strokeWidth="2.5" opacity=".95" />
      {tier >= 3 && <path d="M28 256 H120 L132 246 H240" stroke={GLOW} strokeWidth="2" opacity=".55" />}
    </g>
  </Side>
);
const SATA = [1, 0, 1, 0, 4];
const Storage = ({ opt }: { opt: number }) => (
  <Side>
    <rect x="110" y="176" width="70" height="10" rx="2" fill="#0f1822" stroke={GLOW} strokeWidth="1.5" opacity=".9" />
    {opt === 3 && <rect x="190" y="176" width="10" height="10" rx="2" fill={GLOW} opacity=".5" />}
    {Array.from({ length: SATA[opt] }, (_, k) => (
      <g key={k}>
        <rect x="20" y={311 - k * 11} width="48" height="9" rx="2" fill="#0c131b" stroke="#2a3a4c" strokeWidth="1.5" />
        <path d={`M24 ${315.5 - k * 11} H34`} stroke={GLOW} strokeWidth="2" opacity=".8" />
      </g>
    ))}
  </Side>
);
const Psu = ({ watts }: { watts: number }) => (
  <Side>
    <rect x="20" y="350" width="104" height="58" rx="5" fill="#070b10" stroke={GLOW} strokeWidth="2" opacity=".9" />
    <text x="72" y="386" textAnchor="middle" fontSize="20" fontFamily="Geist Mono, monospace" fill={GLOW}>{watts}W</text>
  </Side>
);
/** Dashed outlines showing where a part goes before it's chosen. */
const GHOST: Record<Exclude<Category, "case">, ReactNode> = {
  cpu: <rect x="68" y="26" width="220" height="276" rx="7" />,
  cooling: <rect x="98" y="40" width="108" height="124" rx="10" />,
  gpu: <rect x="14" y="214" width="240" height="54" rx="5" />,
  storage: <rect x="110" y="176" width="70" height="10" rx="2" />,
  psu: <rect x="20" y="350" width="104" height="58" rx="5" />,
};
/** Where to pin a label or effect on each part, as a position over the drawing. */
export function pinStyle(c: Category, caseIdx = 1): CSSProperties {
  const g = GEOS[caseIdx];
  const at = (u: number, v: number): [number, number] => { const m = g.inner; return [m[0] * u + m[2] * v + m[4], m[1] * u + m[3] * v + m[5]]; };
  const p = { cpu: at(250, 150), cooling: at(196, 66), gpu: at(150, 241), storage: at(46, 300), psu: at(140, 379), case: [g.pts.E[0] - 0.3 * g.D, g.pts.E[1] + g.H / 2] as [number, number] }[c];
  return { left: pct(p[0] - VIEW.x, VIEW.w), top: pct(p[1] - VIEW.y, VIEW.h) };
}

export default function PcVisual({ pick, installed, powered, highlight, children, lights = 1 }: {
  pick: Pick; installed: Set<Category>; powered: boolean; highlight?: Category | null; children?: ReactNode;
  /** How bright the lighting is once powered: 0 off, 0.5 subtle, 1 full */
  lights?: number;
}) {
  const has = (c: Category) => installed.has(c);
  const hl = (c: Category) => (highlight === c ? 30 : undefined);
  const glowOf = highlight && highlight !== "case" ? GHOST[highlight] : null;
  const air = pick.cooling === 0;
  const g = GEOS[has("case") ? pick.case : 1];
  const spinning = [...caseFans(g), ...(air && has("cooling") ? [{ m: g.inner, cx: 152, cy: 108, r: 44, fancy: true }] : [])];
  return (
    <div className="flex h-full w-full items-center justify-center [container-type:size]">
      <div className="relative aspect-[550/548] w-[min(100cqw,calc(100cqh*550/548))]">
        <svg width="0" height="0" className="absolute"><Defs /><GeoDefs /></svg>
        <div className="absolute inset-0" style={{ opacity: powered ? 0.3 + 0.7 * lights : 0.4, transition: "opacity .6s" }}>
          <svg viewBox={VIEWBOX} className="h-full w-full overflow-visible"><ellipse cx="395" cy="575" rx={(g.W + 0.6 * g.D) * 0.55} ry="20" fill="url(#bs-floor)" /></svg>
        </div>
        <GeoCtx.Provider value={g}>
        <div key={g.key} className="absolute inset-0" style={{ transformOrigin: "52% 95%" }} data-pop={has("case") || undefined}>
          <Layer on style={{ opacity: has("case") ? 1 : 0.35, transform: "none" }}><CaseBack /></Layer>
          <Layer on={has("case")}><CaseFans mode="unlit" /></Layer>
          <Layer on={has("case") && powered} style={{ transform: "none", opacity: has("case") && powered ? 0.12 + 0.88 * lights : 0 }}><CaseFans mode="lit" /></Layer>
          {/* where parts go, until they're chosen */}
          {(Object.keys(GHOST) as (keyof typeof GHOST)[]).map((c) => (
            <Layer key={c} on={!has(c)} style={{ transform: "none" }}><Side><g stroke={GLOW} strokeWidth="2" strokeDasharray="6 7" opacity=".45" vectorEffect="non-scaling-stroke">{GHOST[c]}</g></Side></Layer>
          ))}
          {/* dims everything except the highlighted part */}
          <div className="absolute inset-[6%] rounded-[18%] bg-[rgb(5_8_12/.62)] blur-md" style={{ zIndex: 27, opacity: highlight ? 1 : 0, transition: "opacity .3s", pointerEvents: "none" }} />
          {customParts.cpu.map((_, i) => <Layer key={i} z={hl("cpu")} on={has("cpu") && pick.cpu === i}><Board ram={i >= 2 ? 4 : 2} /></Layer>)}
          <Layer z={hl("cooling")} on={has("cooling") && pick.cooling === 0}><AirCooler /></Layer>
          <Layer z={hl("cooling")} on={has("cooling") && pick.cooling === 1}><WaterCooler lcd={false} /></Layer>
          <Layer z={hl("cooling")} on={has("cooling") && pick.cooling === 2}><WaterCooler lcd /></Layer>
          {customParts.storage.map((_, i) => <Layer key={i} z={hl("storage")} on={has("storage") && pick.storage === i}><Storage opt={i} /></Layer>)}
          {customParts.gpu.map((_, i) => <Layer key={i} z={hl("gpu")} on={has("gpu") && pick.gpu === i}><Gpu tier={i} /></Layer>)}
          {customParts.psu.map((p, i) => <Layer key={i} z={hl("psu")} on={has("psu") && pick.psu === i}><Psu watts={p.watts ?? 0} /></Layer>)}
          {/* a glowing outline around the highlighted part */}
          <Layer on={!!glowOf} z={31} style={{ transform: "none" }}><Side><g stroke={GLOW} strokeWidth="3" opacity=".9" style={{ filter: "drop-shadow(0 0 6px var(--accent))" }}>{glowOf}</g></Side></Layer>
          {/* turning fan blades, only once it's powered on */}
          {powered && has("case") && spinning.map((f, i) => {
            const [a, b, c, d, e, h] = f.m;
            const sx = a * f.cx + c * f.cy + e, sy = b * f.cx + d * f.cy + h;
            const fancy = "fancy" in f;
            const size = f.r * (fancy ? 2.4 : 2);
            return (
              <div key={i} className="absolute" style={{ ...boxAt(sx, sy, size), transform: `matrix(${a}, ${b}, ${c}, ${d}, 0, 0)`, zIndex: fancy ? hl("cooling") : undefined }}>
                <svg viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} className="bfan-spin h-full w-full overflow-visible">
                  <Blades cx={0} cy={0} r={f.r} n={fancy ? 11 : 9} /><Hub cx={0} cy={0} r={f.r} mode="lit" fancy={fancy} />
                </svg>
              </div>
            );
          })}
          <Layer on={has("case")} style={{ transform: "none", zIndex: 25 }}><Glass /></Layer>
          <Layer on style={{ transform: "none", zIndex: 26, opacity: has("case") ? 1 : 0.35 }}><CaseFront /></Layer>
        </div>
        </GeoCtx.Provider>
        {children}
      </div>
    </div>
  );
}

import type { CSSProperties, ReactNode } from "react";
import { Blades, CaseBack, CaseFront, Defs, FANS, FRONT, Face, Fan, GLOW, Glass, Hub, REAR_LOCAL, SIDE, TOP, VIEW, VIEWBOX, boxAt, pct, svgMatrix, type Mode } from "../components/BuildScene";
import { customParts } from "../content/customParts";
import type { Category, Pick } from "../lib/configurator";

/**
 * DRAFT: a live PC that fills in as parts are chosen. Every part option is its own pre-drawn layer, so choosing a part
 * only fades/slides layers (opacity + transform). Nothing is redrawn, so it stays as cheap as the PC Builds animation.
 */

const T = "opacity .35s ease, transform .5s cubic-bezier(.2,1.5,.4,1)";
const Layer = ({ on, z, children, style }: { on: boolean; z?: number; children: ReactNode; style?: CSSProperties }) => (
  <div className="absolute inset-0" style={{ transition: T, opacity: on ? 1 : 0, transform: on ? "none" : "translateY(-5%)", zIndex: z, pointerEvents: "none", ...style }}>
    <svg viewBox={VIEWBOX} className="h-full w-full overflow-visible" fill="none" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
  </div>
);
const Side = ({ children }: { children: ReactNode }) => <Face matrix={svgMatrix(SIDE)} clip="bs-clip-side">{children}</Face>;

// ---- part drawings (flat, in the side panel's local space: u 0..320, v 0..430) ----
const Board = ({ ram }: { ram: number }) => (
  <Side>
    <rect x="68" y="26" width="220" height="276" rx="7" fill="#0a121b" stroke="#1a2735" strokeWidth="2.5" />
    <path d="M80 160 H130 L150 140 H230 M120 60 V110 M240 60 V120" stroke={GLOW} strokeWidth="1.5" opacity=".3" />
    <path d="M68 34 H96 V118 L84 128 H68Z" fill="#101a24" stroke="#1d2a38" strokeWidth="2.5" />
    <path d="M88 44 V110" stroke={GLOW} strokeWidth="2" opacity=".7" />
    <rect x="204" y="278" width="64" height="20" rx="3" fill="#0f1822" stroke="#1d2a38" strokeWidth="2" />
    <rect x="124" y="80" width="56" height="56" rx="4" fill="#0f1822" stroke="#2a3a4c" strokeWidth="2" />
    {(ram === 4 ? [214, 228, 242, 256] : [218, 240]).map((x) => (
      <g key={x}>
        <rect x={x} y="44" width={ram === 4 ? 11 : 15} height="96" rx="2.5" fill="#0c131b" stroke="#1c2937" strokeWidth="2" />
        <rect x={x + 2} y="46" width="3.5" height="92" rx="1.5" fill={GLOW} opacity=".85" />
      </g>
    ))}
  </Side>
);
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
    <Face matrix={svgMatrix(TOP)} clip="bs-clip-top">
      <rect x="4" y="78" width="312" height="104" rx="8" fill="#0d151e" stroke="#22303f" strokeWidth="3" />
    </Face>
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
const CaseFans = ({ mode }: { mode: Mode }) => (
  <>
    <Face matrix={svgMatrix(TOP)} clip="bs-clip-top">{[55, 160, 265].map((x) => <Fan key={x} cx={x} cy={130} r={46} mode={mode} />)}</Face>
    <Face matrix={svgMatrix(FRONT)} clip="bs-clip-front">{[72, 214, 356].map((v) => <Fan key={v} cx={125} cy={v} r={56} mode={mode} />)}</Face>
    <Side><g transform={svgMatrix(REAR_LOCAL)}><rect x="-54" y="-54" width="108" height="108" rx="12" fill="#070b10" stroke="#16212d" strokeWidth="3" /><Fan cx={0} cy={0} r={48} mode={mode} /></g></Side>
  </>
);
const SHROUD = (
  <Side>
    <polygon points="0,336 320,336 378,323 58,323" fill="#0b121a" />
    <rect x="0" y="336" width="320" height="100" fill="#05080c" />
    <path d="M0 336 H320" stroke={GLOW} strokeWidth="2" opacity=".35" />
  </Side>
);

/** Case size choice: Medium, Large, Mini. */
export const CASE_SCALE = [0.9, 1, 0.8];

/** Where to pin a label for each part (drawing units), for the "click the PC" concept. */
export const PIN: Record<Category, [number, number]> = (() => {
  const at = (u: number, v: number): [number, number] => [SIDE[0] * u + SIDE[2] * v + SIDE[4], SIDE[1] * u + SIDE[3] * v + SIDE[5]];
  return { cpu: at(250, 150), cooling: at(196, 66), gpu: at(150, 241), storage: at(46, 300), psu: at(140, 379), case: [560, 300] };
})();
export const pinStyle = (c: Category): CSSProperties => ({ left: pct(PIN[c][0] - VIEW.x, VIEW.w), top: pct(PIN[c][1] - VIEW.y, VIEW.h) });

export default function PcVisual({ pick, installed, powered, highlight, children }: {
  pick: Pick; installed: Set<Category>; powered: boolean; highlight?: Category | null; children?: ReactNode;
}) {
  const has = (c: Category) => installed.has(c);
  const hl = (c: Category) => (highlight === c ? 30 : undefined);
  const glowOf = highlight && highlight !== "case" ? GHOST[highlight] : null;
  const air = pick.cooling === 0;
  return (
    <div className="flex h-full w-full items-center justify-center [container-type:size]">
      <div className="relative aspect-[550/548] w-[min(100cqw,calc(100cqh*550/548))]">
        <svg width="0" height="0" className="absolute"><Defs /></svg>
        <div className="absolute inset-0" style={{ opacity: powered ? 1 : 0.4, transition: "opacity .6s" }}>
          <svg viewBox={VIEWBOX} className="h-full w-full overflow-visible"><ellipse cx="395" cy="580" rx="260" ry="20" fill="url(#bs-floor)" /></svg>
        </div>
        <div className="absolute inset-0" style={{ transformOrigin: "52% 95%", transform: `scale(${has("case") ? CASE_SCALE[pick.case] : 0.9})`, transition: "transform .5s cubic-bezier(.2,1.4,.4,1)" }}>
          <Layer on style={{ opacity: has("case") ? 1 : 0.35, transform: "none" }}><CaseBack />{SHROUD}</Layer>
          <Layer on={has("case")}><CaseFans mode="unlit" /></Layer>
          <Layer on={has("case") && powered}><CaseFans mode="lit" /></Layer>
          {/* where parts go, until they're chosen */}
          {(Object.keys(GHOST) as (keyof typeof GHOST)[]).map((c) => (
            <Layer key={c} on={!has(c)} style={{ transform: "none" }}><Side><g stroke={GLOW} strokeWidth="2" strokeDasharray="6 7" opacity=".45">{GHOST[c]}</g></Side></Layer>
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
          {powered && has("case") && FANS.filter((f) => !f.fancy || (air && has("cooling"))).map((f, i) => {
            const [a, b, c, d, e, g] = f.face;
            const sx = a * f.cx + c * f.cy + e, sy = b * f.cx + d * f.cy + g;
            const size = f.r * (f.fancy ? 2.4 : 2);
            return (
              <div key={i} className="absolute" style={{ ...boxAt(sx, sy, size), transform: `matrix(${a}, ${b}, ${c}, ${d}, 0, 0)`, zIndex: f.fancy ? hl("cooling") : undefined }}>
                <svg viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} className="bfan-spin h-full w-full overflow-visible">
                  <Blades cx={0} cy={0} r={f.r} n={f.fancy ? 11 : 9} /><Hub cx={0} cy={0} r={f.r} mode="lit" fancy={f.fancy} />
                </svg>
              </div>
            );
          })}
          <Layer on={has("case")} style={{ transform: "none", zIndex: 25 }}><Glass /></Layer>
          <Layer on style={{ transform: "none", zIndex: 26, opacity: has("case") ? 1 : 0.35 }}><CaseFront /></Layer>
        </div>
        {children}
      </div>
    </div>
  );
}

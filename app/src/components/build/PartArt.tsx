import type { ReactNode } from "react";

/**
 * Small line drawings for the build form's picture cards. In content/formOptions.ts, set `art: "case-atx"` etc.
 * Available names: the keys of ART below.
 */
const Svg = ({ children, vb = "0 0 64 48" }: { children: ReactNode; vb?: string }) => (
  <svg viewBox={vb} className="h-14 w-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const A = "var(--accent)";
const Case = ({ h, w }: { h: number; w: number }) => (
  <Svg><rect x={32 - w / 2} y={46 - h} width={w} height={h} rx="3" /><circle cx={32 + w / 2 - 6} cy={46 - h + 7} r="3" stroke={A} /><path d={`M${32 - w / 2 + 4} ${46 - h + 5} V44`} opacity=".4" /></Svg>
);
const Gpu = ({ len, fans }: { len: number; fans: number }) => (
  <Svg><rect x={32 - len / 2} y="16" width={len} height="16" rx="3" />{Array.from({ length: fans }, (_, i) => <circle key={i} cx={32 - len / 2 + (len / (fans + 1)) * (i + 1)} cy="24" r="5" stroke={A} />)}</Svg>
);
const Fans = ({ glow }: { glow: number }) => (
  <Svg>{[18, 46].map((x) => <g key={x}>{glow > 0 && <circle cx={x} cy="24" r="15" fill={A} opacity={glow * 0.25} stroke="none" />}<circle cx={x} cy="24" r="11" stroke={glow ? A : "currentColor"} /><circle cx={x} cy="24" r="3" /></g>)}</Svg>
);
const Drives = ({ n }: { n: number }) => (
  <Svg>{Array.from({ length: n }, (_, i) => <rect key={i} x="16" y={36 - i * 9} width="32" height="7" rx="2" stroke={i === n - 1 ? A : "currentColor"} />)}</Svg>
);
const Cooler = ({ kind }: { kind: number }) => (
  <Svg>
    {kind === 0 ? <><rect x="18" y="8" width="28" height="32" rx="3" /><path d="M23 12v24M28 12v24M33 12v24M38 12v24M43 12v24" opacity=".5" /></>
      : <><path d="M26 30 C24 18 20 12 16 6 M38 30 C40 18 44 12 48 6" /><rect x="22" y="28" width="20" height="16" rx="4" /><circle cx="32" cy="36" r="5" stroke={A} />{kind === 2 && <text x="32" y="38.5" fontSize="6" textAnchor="middle" fill={A} stroke="none">42°</text>}</>}
  </Svg>
);

const ART: Record<string, ReactNode> = {
  "case-itx": <Case h={26} w={24} />,
  "case-matx": <Case h={33} w={28} />,
  "case-atx": <Case h={42} w={31} />,
  "gpu-1": <Gpu len={26} fans={1} />,
  "gpu-2": <Gpu len={40} fans={2} />,
  "gpu-3": <Gpu len={54} fans={3} />,
  "gpu-unknown": <Gpu len={40} fans={0} />,
  "cool-air": <Cooler kind={0} />,
  "cool-water": <Cooler kind={1} />,
  "cool-lcd": <Cooler kind={2} />,
  "drive-1": <Drives n={1} />,
  "drive-2": <Drives n={2} />,
  "drive-4": <Drives n={4} />,
  "light-off": <Fans glow={0} />,
  "light-subtle": <Fans glow={0.5} />,
  "light-full": <Fans glow={1} />,
};

export default function PartArt({ name }: { name: string }) {
  return <>{ART[name] ?? null}</>;
}

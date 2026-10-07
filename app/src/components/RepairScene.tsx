import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Floater, usePortrait } from "./Floaters";

/**
 * A laptop in three-quarter view that gets diagnosed and repaired. Every piece reads its own progress from a CSS
 * variable (--q-<name>, 0 to 1) that AnimatedHero updates on a timer:
 *   laptop  - the laptop fades in        tag1..4 - diagnostic readouts appear     scan / scanend - scan line sweep
 *   screen  - new screen flies in, crack clears    old* - old part pops out    new* - new part flies in (fan, ssd, batt)
 *   clean   - security shield flies in, malware removed    boot / load / ready - reboot, loading bar, "All systems normal"
 * New parts float around the laptop first (see Floaters.tsx).
 * On narrow screens the readouts are left out so the laptop stays large.
 */

const OK = "var(--success)"; // "fixed" green (theme.ts)
const BAD = "var(--danger)";
const q = (id: string) => `var(--q-${id}, 0)`;
const inv = (id: string) => `calc(1 - var(--q-${id}, 0))`;

// Laptop geometry: base deck P4(300,360) P3(680,390) P2(550,460) P1(170,430); lid Q4(320,95) Q3(700,125) down to P4/P3.
const LID = "matrix(1 .0789 -.0755 1 320 95)"; // local 380 x 265
const BASE = "matrix(1 .0789 -.8667 .4667 300 360)"; // local 380 x 150
const CENTER = { x: 425, y: 410 }; // where parts come out of / go into the base

/** An old part that pops up out of the laptop and fades away. */
const swapOut = (id: string): CSSProperties => ({
  transform: `translate(calc(${q(id)} * -110px), calc(${q(id)} * -80px)) rotate(calc(${q(id)} * -30deg))`,
  opacity: `calc(4 * ${q(id)} * ${inv(id)})`,
  transformBox: "fill-box", transformOrigin: "center",
});

/** Small fan, SSD and battery drawings, centered on (0,0). */
function PartFan({ color, dusty }: { color: string; dusty?: boolean }) {
  return (
    <g>
      <circle r="30" fill="#05080c" stroke={color} strokeWidth="4" />
      {Array.from({ length: 7 }, (_, k) => (
        <path key={k} transform={`rotate(${(k * 360) / 7})`} d="M0 0 C4 -3 15 -3 20 -13 C12 -15 4 -11 0 0Z" fill={color} opacity=".45" />
      ))}
      <circle r="7" fill="#0a1017" stroke={color} strokeWidth="2" />
      {dusty && [[-14, -18], [12, -20], [18, 8], [-20, 10], [2, 22], [-6, -4]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.6" fill="#8e9bad" opacity=".75" />)}
    </g>
  );
}
function PartSsd({ color }: { color: string }) {
  return (
    <g>
      <rect x="-40" y="-11" width="80" height="22" rx="4" fill="#0a1017" stroke={color} strokeWidth="3.5" />
      <rect x="-30" y="-5" width="22" height="10" rx="2" fill={color} opacity=".45" />
      <rect x="-2" y="-5" width="22" height="10" rx="2" fill={color} opacity=".45" />
      <path d="M30 -6 V6" stroke={color} strokeWidth="3" />
    </g>
  );
}
function PartScreen() {
  return (
    <g>
      <rect x="-50" y="-34" width="100" height="68" rx="6" fill="#05080c" stroke={OK} strokeWidth="3.5" />
      <rect x="-42" y="-27" width="84" height="54" rx="3" fill={OK} opacity=".14" />
      <polygon points="8,-27 26,-27 0,27 -18,27" fill="#fff" opacity=".1" />
    </g>
  );
}
function PartShield() {
  return (
    <g>
      <path d="M0 -34 L28 -24 V0 C28 18 16 30 0 36 C-16 30 -28 18 -28 0 V-24Z" fill="#05080c" stroke={OK} strokeWidth="3.5" />
      <path d="M-11 1 L-3 9 L12 -8" stroke={OK} strokeWidth="4" />
    </g>
  );
}
function PartBattery({ color }: { color: string }) {
  return (
    <g>
      <rect x="-46" y="-17" width="88" height="34" rx="6" fill="#0a1017" stroke={color} strokeWidth="3.5" />
      <rect x="42" y="-7" width="6" height="14" rx="2" fill={color} />
      {[-34, -14, 6, 26].map((x) => <rect key={x} x={x} y="-10" width="14" height="20" rx="2" fill={color} opacity=".4" />)}
    </g>
  );
}

/** A diagnostic readout: label, a red value that flips to a green one, and a leader line to the laptop. */
function Tag({ x, y, label, bad, good, show, fix, to }: { x: number; y: number; label: string; bad: string; good: string; show: string; fix: string; to: [number, number] }) {
  const side = to[0] > x ? x + 160 : x;
  return (
    <g style={{ opacity: q(show), transform: `translateY(calc(${inv(show)} * 10px))` }}>
      <path d={`M${side} ${y + 25} L${to[0]} ${to[1]}`} stroke="var(--line)" strokeWidth="1.5" strokeDasharray="4 5" />
      <circle cx={to[0]} cy={to[1]} r="4" fill={BAD} style={{ opacity: inv(fix) }} />
      <circle cx={to[0]} cy={to[1]} r="4" fill={OK} style={{ opacity: q(fix) }} />
      <rect x={x} y={y} width="160" height="50" rx="10" fill="var(--card)" stroke="var(--line)" strokeWidth="1.5" />
      <rect x={x} y={y} width="160" height="50" rx="10" fill="none" stroke={BAD} strokeWidth="1.5" style={{ opacity: `calc(${inv(fix)} * .6)` }} />
      <rect x={x} y={y} width="160" height="50" rx="10" fill="none" stroke={OK} strokeWidth="1.5" style={{ opacity: `calc(${q(fix)} * .7)` }} />
      <text x={x + 16} y={y + 20} fontSize="11" letterSpacing="1.5" fill="var(--muted)" style={{ fontFamily: "var(--font-mono)" }}>{label}</text>
      <text x={x + 16} y={y + 39} fontSize="16" fill={BAD} style={{ fontFamily: "var(--font-mono)", opacity: inv(fix) }}>{bad}</text>
      <text x={x + 16} y={y + 39} fontSize="16" fill={OK} style={{ fontFamily: "var(--font-mono)", opacity: q(fix) }}>{good}</text>
      <circle cx={x + 142} cy={y + 25} r="5" fill={BAD} style={{ opacity: inv(fix) }} />
      <circle cx={x + 142} cy={y + 25} r="5" fill={OK} style={{ opacity: q(fix) }} />
    </g>
  );
}

function Layer({ style, children }: { style: CSSProperties; children: ReactNode }) {
  return <g style={style}>{children}</g>;
}

/** True on narrow screens, where the readouts are dropped so the laptop stays large. */
function useNarrow() {
  const query = "(max-width: 639px)";
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setNarrow(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return narrow;
}

/** New parts floating around the laptop (beside it on wide screens, above/below on tall ones), then flying in. */
const LID_CENTER: [number, number] = [500, 238];
const FLOATS: { id: string; wide: [number, number]; tall: [number, number]; to: [number, number]; bob: number; el: ReactNode }[] = [
  { id: "screen", wide: [95, 95], tall: [240, 10], to: LID_CENTER, bob: 0.3, el: <PartScreen /> },
  { id: "newfan", wide: [85, 440], tall: [210, 600], to: [CENTER.x, CENTER.y], bob: 1.2, el: <PartFan color={OK} /> },
  { id: "newssd", wide: [640, 505], tall: [630, 590], to: [CENTER.x, CENTER.y], bob: 0.8, el: <PartSsd color={OK} /> },
  { id: "newbatt", wide: [790, 450], tall: [430, 625], to: [CENTER.x, CENTER.y], bob: 1.8, el: <PartBattery color={OK} /> },
  { id: "clean", wide: [790, 105], tall: [560, 0], to: LID_CENTER, bob: 0.6, el: <PartShield /> },
];

export default function RepairScene() {
  const narrow = useNarrow();
  const portrait = usePortrait();
  const keys: [number, number][] = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 14; c++) keys.push([30 + c * 23.1, 14 + r * 15]);

  return (
    <svg viewBox={narrow ? "150 70 570 450" : "0 70 870 450"} preserveAspectRatio="xMidYMid meet" className="h-full w-full overflow-visible" aria-hidden="true"
      fill="none" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <radialGradient id="rs-glow">
          <stop offset="0" style={{ stopColor: OK, stopOpacity: 0.35 }} />
          <stop offset="1" style={{ stopColor: OK, stopOpacity: 0 }} />
        </radialGradient>
        <radialGradient id="rs-desk" cx=".5" cy=".4" r=".8">
          <stop offset="0" style={{ stopColor: OK, stopOpacity: 0.35 }} />
          <stop offset="1" stopColor="#05080c" stopOpacity="1" />
        </radialGradient>
        <linearGradient id="rs-scan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: OK, stopOpacity: 0 }} />
          <stop offset="1" style={{ stopColor: OK, stopOpacity: 0.45 }} />
        </linearGradient>
        <clipPath id="rs-screen"><rect x="14" y="12" width="352" height="232" rx="4" /></clipPath>
      </defs>

      {/* LAPTOP */}
      <Layer style={{ opacity: `calc(.08 + .92 * ${q("laptop")})`, transform: `translateY(calc(${inv("laptop")} * 24px))` }}>
        {/* shadow and glow on the desk */}
        <ellipse cx="430" cy="488" rx="300" ry="22" fill="#000" opacity=".55" />
        <ellipse cx="430" cy="488" rx="280" ry="20" fill="url(#rs-glow)" style={{ opacity: q("ready") }} />

        {/* base: right side, front edge, top deck */}
        <polygon points="550,460 680,390 680,406 550,476" fill="#0a0f15" stroke="#1a2431" strokeWidth="2" />
        <polygon points="170,430 550,460 550,476 170,446" fill="#0d131b" stroke="#1a2431" strokeWidth="2" />
        <path d="M170 430 L550 460" stroke="#7e93a8" strokeWidth="1.5" opacity=".35" />
        <g transform={BASE}>
          <rect x="0" y="0" width="380" height="150" rx="8" fill="#121a24" stroke="#1e2938" strokeWidth="2" />
          {keys.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="19.5" height="11" rx="2" fill="#0a0f15" />)}
          {keys.map(([x, y]) => <rect key={`g${x}-${y}`} x={x} y={y} width="19.5" height="11" rx="2" stroke={OK} strokeWidth=".8" style={{ opacity: `calc(${q("ready")} * .55)` }} />)}
          <rect x="140" y="98" width="100" height="40" rx="5" stroke="#1e2938" strokeWidth="2" />
          <circle cx="362" cy="10" r="2.5" fill={OK} style={{ opacity: q("ready") }} />
        </g>

        {/* lid */}
        <g transform={LID}>
          <rect x="0" y="0" width="380" height="265" rx="12" fill="#0b1017" stroke="#1e2938" strokeWidth="2.5" />
          <rect x="14" y="12" width="352" height="232" rx="4" fill="#05080c" />
          <g clipPath="url(#rs-screen)">
            {/* error state: red tint, glitch bars, warning, malware bugs */}
            <Layer style={{ opacity: inv("boot") }}>
              <rect x="14" y="12" width="352" height="232" fill={BAD} opacity=".12" />
              {[[30, 0.5, 170], [74, 0.25, 260], [150, 0.4, 120], [200, 0.3, 300]].map(([y, o, w], i) => (
                <rect key={i} x={14 + (i * 37) % 90} y={y} width={w} height={i % 2 ? 3 : 6} fill={i % 2 ? "#fff" : BAD} opacity={o} />
              ))}
              <path d="M190 72 L222 128 H158Z" stroke={BAD} strokeWidth="4" />
              <path d="M190 92 V110 M190 118 V119" stroke={BAD} strokeWidth="4" />
              <text x="190" y="156" textAnchor="middle" fontSize="15" letterSpacing="2" fill={BAD} style={{ fontFamily: "var(--font-mono)" }}>SYSTEM ERROR</text>
              <text x="190" y="176" textAnchor="middle" fontSize="11" fill="#9aa48a" style={{ fontFamily: "var(--font-mono)" }}>0x0000007B · disk not found</text>
              <Layer style={{ opacity: inv("clean") }}>
                {[[70, 205], [300, 55], [318, 200]].map(([x, y]) => (
                  <g key={`${x}`} transform={`translate(${x} ${y})`}>
                    <ellipse rx="7" ry="9" fill={BAD} />
                    <path d="M-7 -4 H-12 M-7 2 H-12 M7 -4 H12 M7 2 H12 M-3 -9 L-6 -14 M3 -9 L6 -14" stroke={BAD} strokeWidth="2" />
                  </g>
                ))}
              </Layer>
            </Layer>
            {/* screen crack, cleared during the fix */}
            <Layer style={{ opacity: `calc(${inv("screen")} * .75)` }}>
              <path d="M96 64 L60 30 M96 64 L40 80 M96 64 L120 20 M96 64 L150 96 L190 92 M96 64 L80 120 L60 170 M96 64 L130 140 M150 96 L170 140"
                stroke="#dfe7ef" strokeWidth="1.6" />
            </Layer>
            {/* scan line sweeping down */}
            <Layer style={{ opacity: `calc(${q("scan")} * ${inv("scanend")})`, transform: `translateY(calc(${q("scan")} * 226px))` }}>
              <rect x="14" y="-12" width="352" height="26" fill="url(#rs-scan)" />
              <rect x="14" y="12" width="352" height="2.5" fill={OK} />
            </Layer>
            {/* reboot: logo and loading bar */}
            <Layer style={{ opacity: `calc(${q("boot")} * ${inv("ready")})` }}>
              <rect x="14" y="12" width="352" height="232" fill="#05080c" />
              <circle cx="190" cy="108" r="26" stroke={OK} strokeWidth="3" />
              <path d="M180 108 h20 M190 98 v20" stroke={OK} strokeWidth="3" />
              <rect x="130" y="160" width="120" height="4" rx="2" fill="var(--line)" />
              <rect x="130" y="160" height="4" rx="2" fill={OK} style={{ width: `calc(${q("load")} * 120px)` }} />
            </Layer>
            {/* fixed: desktop with "All systems normal" */}
            <Layer style={{ opacity: q("ready") }}>
              <rect x="14" y="12" width="352" height="232" fill="url(#rs-desk)" />
              <circle cx="190" cy="100" r="30" fill="#05080c" stroke={OK} strokeWidth="3.5" />
              <path d="M176 101 L186 111 L205 90" stroke={OK} strokeWidth="4" />
              <text x="190" y="160" textAnchor="middle" fontSize="16" fill="#eef1e8" style={{ fontFamily: "var(--font-heading)" }}>All systems normal</text>
              <rect x="14" y="228" width="352" height="16" fill="#05080c" opacity=".8" />
              {[170, 184, 198, 212].map((x) => <rect key={x} x={x} y="232" width="9" height="8" rx="2" fill={OK} opacity=".6" />)}
            </Layer>
            {/* glass sheen */}
            <polygon points="230,12 300,12 180,244 110,244" fill="#fff" opacity=".04" />
          </g>
          <circle cx="190" cy="6" r="2" fill="#1e2938" />
        </g>
        <path d="M300 360 L680 390" stroke="#05080c" strokeWidth="5" />
      </Layer>

      {/* OLD PARTS (red) pop out and fade */}
      <g transform={`translate(${CENTER.x} ${CENTER.y})`}>
        <g style={swapOut("oldfan")}><PartFan color={BAD} dusty /></g>
        <g style={swapOut("oldssd")}><PartSsd color={BAD} /></g>
        <g style={swapOut("oldbatt")}><PartBattery color={BAD} /></g>
      </g>

      {/* DIAGNOSTIC READOUTS (wider screens) */}
      {!narrow && (
        <g>
          <Tag x={20} y={140} label="CPU TEMP" bad="96°C" good="41°C" show="tag1" fix="newfan" to={[300, 200]} />
          <Tag x={20} y={260} label="BATTERY" bad="38% health" good="100%" show="tag3" fix="newbatt" to={[268, 420]} />
          <Tag x={700} y={170} label="DISK" bad="Failing" good="New SSD" show="tag2" fix="newssd" to={[690, 230]} />
          <Tag x={700} y={290} label="MALWARE" bad="3 found" good="Removed" show="tag4" fix="clean" to={[684, 330]} />
        </g>
      )}

      {/* NEW PARTS (green) float around the laptop, then fly in */}
      {FLOATS.map((f) => (
        <Floater key={f.id} id={f.id} from={portrait ? f.tall : f.wide} to={f.to} appear="laptop" bob={f.bob}>{f.el}</Floater>
      ))}
    </svg>
  );
}

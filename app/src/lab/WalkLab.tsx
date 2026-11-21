import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import PcVisual, { pinStyle } from "./PcVisual";
import Icon from "../components/Icon";
import type { Category, Pick } from "../lib/configurator";

/**
 * DRAFT: the build request as a walkthrough where you "build" the PC. Each answer installs a part, which drops into
 * the case with a bounce; at the end you press the power button and it boots. Then the usual meeting/contact steps.
 */

// ---- little line drawings for the answer cards (no photos) ----
const Art = ({ children, vb = "0 0 64 48" }: { children: ReactNode; vb?: string }) => (
  <svg viewBox={vb} className="h-14 w-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const CaseArt = ({ h, w }: { h: number; w: number }) => (
  <Art><rect x={32 - w / 2} y={46 - h} width={w} height={h} rx="3" /><circle cx={32 + w / 2 - 6} cy={46 - h + 7} r="3" className="text-accent" stroke="var(--accent)" /><path d={`M${32 - w / 2 + 4} ${46 - h + 5} V44`} opacity=".4" /></Art>
);
const GpuArt = ({ len, fans }: { len: number; fans: number }) => (
  <Art><rect x={32 - len / 2} y="16" width={len} height="16" rx="3" />{Array.from({ length: fans }, (_, i) => <circle key={i} cx={32 - len / 2 + (len / (fans + 1)) * (i + 1)} cy="24" r="5" stroke="var(--accent)" />)}</Art>
);
const FanArt = ({ glow }: { glow: number }) => (
  <Art>{[18, 46].map((x) => <g key={x}>{glow > 0 && <circle cx={x} cy="24" r="15" fill="var(--accent)" opacity={glow * 0.25} stroke="none" />}<circle cx={x} cy="24" r="11" stroke={glow ? "var(--accent)" : "currentColor"} /><circle cx={x} cy="24" r="3" /></g>)}</Art>
);
const DriveArt = ({ n }: { n: number }) => (
  <Art>{Array.from({ length: n }, (_, i) => <rect key={i} x="16" y={36 - i * 9} width="32" height="7" rx="2" stroke={i === n - 1 ? "var(--accent)" : "currentColor"} />)}</Art>
);
const CoolArt = ({ kind }: { kind: number }) => (
  <Art>
    {kind === 0 ? <><rect x="18" y="8" width="28" height="32" rx="3" /><path d="M23 12v24M28 12v24M33 12v24M38 12v24M43 12v24" opacity=".5" /></>
      : <><path d="M26 30 C24 18 20 12 16 6 M38 30 C40 18 44 12 48 6" /><rect x="22" y="28" width="20" height="16" rx="4" /><circle cx="32" cy="36" r="5" stroke="var(--accent)" />{kind === 2 && <text x="32" y="38.5" fontSize="6" textAnchor="middle" fill="var(--accent)" stroke="none">42°</text>}</>}
  </Art>
);

type Opt = { v: string; sub: string; art: ReactNode };
type Step = { cat: Category | null; part: string; q: string; hint: string; multi?: boolean; opts: Opt[] };

const STEPS: Step[] = [
  { cat: "case", part: "Case", q: "First, pick a case", hint: "How big should it be?", opts: [
    { v: "Compact", sub: "Small desk or dorm", art: <CaseArt h={26} w={24} /> },
    { v: "Mid tower", sub: "Most popular, easy to upgrade", art: <CaseArt h={34} w={28} /> },
    { v: "Big showpiece", sub: "Room for big parts + fans", art: <CaseArt h={42} w={34} /> },
  ] },
  { cat: "cpu", part: "Motherboard & CPU", q: "What will it do?", hint: "This decides the brain of your PC. Tap all that apply.", multi: true, opts: [
    { v: "Gaming", sub: "Fortnite, Valorant, AAA", art: <Art vb="0 0 24 18"><g transform="translate(0 -3)"><path d="M7 8h10a4 4 0 0 1 4 4.2L20 16a2.5 2.5 0 0 1-4.3 1.2L14.5 16h-5l-1.2 1.2A2.5 2.5 0 0 1 4 16l-1-3.8A4 4 0 0 1 7 8z" strokeWidth="1" /></g></Art> },
    { v: "School & work", sub: "Docs, browsing, Zoom", art: <Art vb="0 0 24 18"><g transform="translate(0 -3)"><path d="m2 9 10-5 10 5-10 5z M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5" strokeWidth="1" /></g></Art> },
    { v: "Streaming", sub: "Play + stream at once", art: <Art vb="0 0 24 18"><g transform="translate(0 -3)"><rect x="3" y="6" width="12" height="12" rx="2" strokeWidth="1" /><path d="m15 10 6-3v10l-6-3z" strokeWidth="1" /></g></Art> },
    { v: "Editing & 3D", sub: "Premiere, Blender, CAD", art: <Art vb="0 0 24 18"><g transform="translate(0 -3)"><rect x="3" y="4" width="18" height="12" rx="2" strokeWidth="1" /><path d="M8 20h8M12 16v4" strokeWidth="1" /></g></Art> },
  ] },
  { cat: "gpu", part: "Graphics card", q: "Pick your budget", hint: "Your budget sets the graphics card. Watch it change size.", opts: [
    { v: "$300 – $600", sub: "1080p esports, school", art: <GpuArt len={26} fans={1} /> },
    { v: "$750 – $1,000", sub: "Smooth 1080p / 1440p", art: <GpuArt len={40} fans={2} /> },
    { v: "$1,000+", sub: "High-refresh 1440p / 4K", art: <GpuArt len={54} fans={3} /> },
    { v: "Not sure yet", sub: "We'll figure it out together", art: <GpuArt len={40} fans={0} /> },
  ] },
  { cat: "cooling", part: "Cooling", q: "How should it stay cool?", hint: "Not sure? Air is quiet and reliable.", opts: [
    { v: "Air cooler", sub: "Quiet and reliable", art: <CoolArt kind={0} /> },
    { v: "Water cooling", sub: "Cooler, cleaner look", art: <CoolArt kind={1} /> },
    { v: "Water + screen", sub: "Shows temps on the pump", art: <CoolArt kind={2} /> },
  ] },
  { cat: "storage", part: "Storage", q: "How much stuff will you keep?", hint: "Games, videos, school files…", opts: [
    { v: "A few games", sub: "1 TB", art: <DriveArt n={1} /> },
    { v: "Lots of games", sub: "2 TB", art: <DriveArt n={2} /> },
    { v: "Everything", sub: "4 TB+, videos too", art: <DriveArt n={4} /> },
  ] },
  { cat: "psu", part: "Power & lights", q: "Last part: lighting", hint: "Then we'll plug it in and power it on.", opts: [
    { v: "No lights", sub: "Clean and dark", art: <FanArt glow={0} /> },
    { v: "Subtle glow", sub: "A soft accent", art: <FanArt glow={0.5} /> },
    { v: "Full RGB", sub: "Light it up", art: <FanArt glow={1} /> },
  ] },
];
const CASE_IDX = [2, 0, 1], GPU_IDX = [0, 2, 4, 1], STORE_IDX = [1, 3, 4], LIGHTS = [0, 0.45, 1];

export default function WalkLab() {
  const [q] = useSearchParams();
  const [step, setStep] = useState(Number(q.get("s") ?? 0));
  const [ans, setAns] = useState<number[][]>([[1], [0, 2], [1], [0], [1], [2]]);
  const [powered, setPowered] = useState(q.get("on") === "1");
  const [flash, setFlash] = useState<{ cat: Category; k: number } | null>(null);
  const atPower = step === STEPS.length;

  // the PC reflects every answer so far, plus a live preview of the one being chosen
  const a = (i: number) => ans[i][0] ?? 0;
  const pick: Pick = { case: CASE_IDX[a(0)], cpu: ans[1].includes(3) ? 3 : ans[1].includes(0) ? 2 : 0, gpu: GPU_IDX[a(2)], cooling: a(3), storage: STORE_IDX[a(4)], psu: [0, 1, 3, 1][a(2)] };
  const installed = new Set<Category>(STEPS.slice(0, Math.min(step + 1, STEPS.length)).map((s) => s.cat!));
  const cur = STEPS[step];

  const choose = (i: number) => setAns((p) => p.map((x, k) => (k !== step ? x : cur.multi ? (x.includes(i) ? x.filter((y) => y !== i) : [...x, i]) : [i])));
  const next = () => { if (cur) setFlash({ cat: cur.cat!, k: Date.now() }); setStep(step + 1); };
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), 900); return () => clearTimeout(t); }, [flash]);

  return (
    <section className="section !pt-28">
      <style>{`
        @keyframes wl-ring { from { transform: translate(-50%,-50%) scale(.3); opacity: 1 } to { transform: translate(-50%,-50%) scale(2.6); opacity: 0 } }
        @keyframes wl-pop { 0% { transform: translateY(8px); opacity: 0 } 15%,80% { transform: none; opacity: 1 } 100% { opacity: 0 } }
        @keyframes wl-boot { 0% { opacity: 0 } 8% { opacity: .9 } 100% { opacity: 0 } }
        @keyframes wl-pulse { 0%,100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 50%, transparent) } 50% { box-shadow: 0 0 0 18px transparent } }
        @keyframes wl-step { from { transform: translateX(14px); opacity: 0 } to { transform: none; opacity: 1 } }
        .wl-in { animation: wl-step .4s ease both }
      `}</style>
      <div className="wrap max-w-[68rem]">
        <div className="card grid overflow-hidden lg:grid-cols-[1fr_1.05fr]">
          {/* questions */}
          <div className="flex flex-col p-7 max-sm:p-5">
            {/* parts checklist as the progress bar */}
            <ol className="mb-6 flex flex-wrap gap-1.5">
              {STEPS.map((s, i) => (
                <li key={s.part} className={`rounded-full border px-2.5 py-1 font-mono text-[.66rem] uppercase tracking-wider transition ${i < step ? "border-accent/50 bg-accent/10 text-accent" : i === step ? "border-ink/40 text-ink" : "border-line text-muted/60"}`}>
                  {i < step ? "✓ " : ""}{s.part}
                </li>
              ))}
            </ol>
            {!atPower ? (
              <div key={step} className="wl-in">
                <p className="eyebrow">Part {step + 1} of {STEPS.length}</p>
                <h3 className="mb-1 mt-1 text-[1.6rem]">{cur.q}</h3>
                <p className="mb-5 text-[.92rem] text-muted">{cur.hint}</p>
                <div className={`grid gap-3 ${cur.opts.length === 4 ? "grid-cols-2" : "grid-cols-3"}`}>
                  {cur.opts.map((o, i) => {
                    const on = ans[step].includes(i);
                    return (
                      <button key={o.v} type="button" onClick={() => choose(i)}
                        className={`group relative rounded-card border-2 bg-bg2 p-3.5 text-left transition hover:-translate-y-0.5 ${on ? "border-accent bg-accent/[.08] text-accent" : "border-line text-muted hover:border-accent/40"}`}>
                        {on && <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-accent text-bg"><Icon name="check" className="h-3 w-3" /></span>}
                        {o.art}
                        <b className="mt-2 block font-medium text-ink">{o.v}</b>
                        <span className="block text-[.76rem] text-muted">{o.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="wl-in">
                <p className="eyebrow">{powered ? "It's alive" : "Moment of truth"}</p>
                <h3 className="mb-1 mt-1 text-[1.6rem]">{powered ? "Your PC is built!" : "Press the power button"}</h3>
                <p className="mb-5 text-[.92rem] text-muted">{powered ? "Here's what you picked. Next, tell me when to meet and how to reach you, and I'll plan the exact parts." : "Every part is in. Let's see if it boots."}</p>
                {powered && (
                  <ul className="grid grid-cols-2 gap-2 text-[.82rem]">
                    {STEPS.map((s, i) => <li key={s.part} className="rounded-lg border border-line bg-bg2 px-3 py-2"><span className="block text-muted">{s.part}</span>{ans[i].map((k) => s.opts[k].v).join(", ")}</li>)}
                  </ul>
                )}
              </div>
            )}
            <div className="mt-auto flex items-center justify-between pt-7">
              <button type="button" className={`btn btn-ghost ${step ? "" : "invisible"}`} onClick={() => { setPowered(false); setStep(step - 1); }}>Back</button>
              {!atPower ? <button type="button" className="btn" onClick={next}>Install {cur.part.toLowerCase()} <Icon name="arrow" className="h-4 w-4" /></button>
                : powered ? <button type="button" className="btn">Next: when to meet <Icon name="arrow" className="h-4 w-4" /></button> : <span />}
            </div>
          </div>

          {/* the workbench */}
          <div className="relative min-h-[22rem] border-line bg-[radial-gradient(60%_50%_at_50%_55%,color-mix(in_srgb,var(--accent)_10%,transparent),transparent),repeating-linear-gradient(0deg,transparent_0_31px,rgb(255_255_255/.025)_31px_32px),repeating-linear-gradient(90deg,transparent_0_31px,rgb(255_255_255/.025)_31px_32px)] p-6 max-lg:order-first max-lg:border-b lg:border-l">
            <p className="absolute left-5 top-4 z-10 font-mono text-[.68rem] uppercase tracking-wider text-muted">
              {powered ? <span className="text-accent">● Powered on</span> : `Workbench · ${Math.min(step, STEPS.length)}/${STEPS.length} parts`}
            </p>
            <div className="h-[19rem] lg:h-[30rem]">
              <PcVisual pick={pick} installed={installed} powered={powered} lights={powered ? LIGHTS[a(5)] : 0}>
                {flash && <span key={flash.k} className="pointer-events-none absolute z-50 h-16 w-16 rounded-full border-2 border-accent" style={{ ...pinStyle(flash.cat), animation: "wl-ring .7s ease-out both" }} />}
                {powered && <span key="boot" className="pointer-events-none absolute inset-0 z-50 rounded-[30%] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--accent)_45%,transparent),transparent)]" style={{ animation: "wl-boot 1.2s ease-out both" }} />}
              </PcVisual>
            </div>
            {flash && <p key={flash.k} className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-full border border-accent/40 bg-card/90 px-3 py-1 font-mono text-[.72rem] text-accent" style={{ animation: "wl-pop .9s ease both" }}>+ {STEPS.find((s) => s.cat === flash.cat)!.part} installed</p>}
            {atPower && !powered && (
              <button type="button" onClick={() => setPowered(true)} aria-label="Power on"
                className="absolute bottom-6 left-1/2 z-10 grid h-16 w-16 -translate-x-1/2 place-items-center rounded-full border-2 border-accent bg-card text-accent" style={{ animation: "wl-pulse 1.6s ease-in-out infinite" }}>
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 3v8M6.3 7.2a8 8 0 1 0 11.4 0" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

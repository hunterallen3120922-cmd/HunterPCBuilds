import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import PcVisual, { pinStyle } from "./PcVisual";
import Icon from "../components/Icon";
import { BUILDER_MAX, BUILDER_MIN, BUILDER_STEP, customParts } from "../content/customParts";
import { CATEGORIES, dollars, minPsuFor, partOf, powerOk, recommend, totalOf, type Category, type Pick } from "../lib/configurator";

/** DRAFT concepts for a more visual "build a PC" flow. Not linked from the site. */

const ALL = new Set<Category>(CATEGORIES.map((c) => c.key));
const SHORT: Record<Category, string> = { gpu: "Graphics", cpu: "CPU & RAM", storage: "Storage", psu: "Power", case: "Case", cooling: "Cooling" };
const short = (c: Category, i: number) => {
  const n = customParts[c][i].name;
  return c === "cpu" ? n.split(" + ")[0] : c === "psu" ? n.replace(" power supply", "") : n.replace(/ \(.*\)/, "").replace(" with LCD screen on the pump", " + LCD");
};

/** Rough guide to what it can handle, 0..1 per resolution (draft numbers). */
function perf(p: Pick) {
  const g = [0.55, 0.65, 0.75, 0.88, 1][p.gpu], c = [0.82, 0.86, 0.96, 1][p.cpu], s = g * c;
  return [
    { label: "1080p", v: Math.min(1, 0.45 + 0.6 * s) },
    { label: "1440p", v: Math.min(1, 0.15 + 0.85 * s) },
    { label: "4K", v: Math.max(0.12, (s - 0.4) * 1.55) },
  ];
}
const word = (v: number) => (v > 0.85 ? "Max settings" : v > 0.62 ? "High settings" : v > 0.4 ? "Medium" : "Light games");

function PerfMeter({ pick }: { pick: Pick }) {
  return (
    <div className="space-y-2.5">
      {perf(pick).map((r) => (
        <div key={r.label} className="grid grid-cols-[3.2rem_1fr_6.5rem] items-center gap-3 text-[.8rem]">
          <span className="font-mono text-muted">{r.label}</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-line">
            <span className="block h-full origin-left rounded-full bg-accent" style={{ transform: `scaleX(${r.v})`, transition: "transform .5s cubic-bezier(.2,1.2,.4,1)" }} />
          </span>
          <span className="text-right text-ink">{word(r.v)}</span>
        </div>
      ))}
    </div>
  );
}

function BudgetBar({ pick, budget }: { pick: Pick; budget: number }) {
  const total = totalOf(pick), max = Math.max(total, budget) * 1.05;
  return (
    <div>
      <div className="relative flex h-3 overflow-hidden rounded-full bg-line">
        {CATEGORIES.map((c, i) => (
          <span key={c.key} title={c.label} className="h-full border-r border-card bg-accent" style={{ width: `${(partOf(pick, c.key).price / max) * 100}%`, opacity: 1 - i * 0.13, transition: "width .4s" }} />
        ))}
        {budget < BUILDER_MAX && <span className="absolute top-[-3px] h-[18px] w-0.5 bg-accent2" style={{ left: `${(budget / max) * 100}%` }} />}
      </div>
      <p className="mt-1.5 flex justify-between font-mono text-[.72rem] text-muted"><span>Parts {dollars(total)}</span><span className="text-accent2">Budget {budget >= BUILDER_MAX ? "$3,000+" : dollars(budget)}</span></p>
    </div>
  );
}

function useBuilder(start = 1500) {
  const [budget, setBudget] = useState(start);
  const [pick, setPick] = useState<Pick>(() => recommend(start));
  const slide = (b: number) => { setBudget(b); setPick(recommend(b)); };
  const choose = (key: Category, i: number) => setPick((cur) => {
    const next = { ...cur, [key]: i };
    if (key === "gpu" && !powerOk(next)) next.psu = minPsuFor(i);
    return next;
  });
  return { budget, pick, slide, choose };
}

const Slider = ({ budget, slide }: { budget: number; slide: (b: number) => void }) => (
  <label className="block">
    <span className="mb-1 flex items-baseline justify-between text-[.85rem]"><span className="font-medium">Your budget for parts</span><span className="font-mono text-accent">{budget >= BUILDER_MAX ? "$3,000+" : dollars(budget)}</span></span>
    <input type="range" min={BUILDER_MIN} max={BUILDER_MAX} step={BUILDER_STEP} value={budget} onChange={(e) => slide(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
  </label>
);

// ---------------------------------------------------------------------------------------------------------------
// A: Live build bench. The PC on the left updates as you tap parts on the right.

function ConceptA({ hover: initialHover = null }: { hover?: Category | null }) {
  const { budget, pick, slide, choose } = useBuilder(1500);
  const [hover, setHover] = useState<Category | null>(initialHover);
  return (
    <div className="card grid overflow-hidden lg:grid-cols-[1fr_1.1fr]">
      <div className="relative flex flex-col border-line bg-[radial-gradient(60%_50%_at_50%_45%,color-mix(in_srgb,var(--accent)_10%,transparent),transparent)] p-6 lg:border-r">
        <p className="eyebrow">Your build</p>
        <div className="h-[22rem] lg:h-[30rem]"><PcVisual pick={pick} installed={ALL} powered highlight={hover} /></div>
        <p className="mb-3 mt-2 text-[.8rem] text-muted">What it can handle <span className="text-[.72rem]">(rough guide)</span></p>
        <PerfMeter pick={pick} />
      </div>
      <div className="p-6">
        <p className="eyebrow">High performance</p>
        <p className="mb-5 mt-1 font-heading text-[1.7rem] leading-tight">Build your PC</p>
        <Slider budget={budget} slide={slide} />
        <div className="mt-5 space-y-4">
          {CATEGORIES.map((c) => (
            <div key={c.key} onMouseEnter={() => setHover(c.key)} onMouseLeave={() => setHover(null)}>
              <p className={`mb-1.5 text-[.78rem] ${hover === c.key ? "text-accent" : "text-muted"}`}>{c.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {customParts[c.key].map((p, i) => {
                  const on = pick[c.key] === i;
                  const bad = c.key === "psu" && (p.watts ?? 0) < (partOf(pick, "gpu").needsWatts ?? 0);
                  return (
                    <button key={p.name} type="button" disabled={bad} onClick={() => choose(c.key, i)}
                      className={`rounded-full border px-3 py-1 text-[.8rem] transition-colors ${on ? "border-accent bg-accent/15 text-ink" : "border-line text-muted hover:border-accent/50 hover:text-ink"} disabled:opacity-35`}>
                      {short(c.key, i)} <span className="font-mono text-[.72rem] opacity-70">{p.price ? dollars(p.price) : "incl."}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 border-t border-line pt-4"><BudgetBar pick={pick} budget={budget} /></div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-[.85rem] text-muted">Total <b className="ml-1 font-mono text-[1.15rem] font-normal text-ink">{dollars(totalOf(pick))}</b> <span className="text-[.75rem]">+ $75 labor</span></span>
          <button type="button" className="btn">Build now <Icon name="arrow" className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// B: Step by step. One question at a time; each answer drops that part into the PC. Powers on at the end.

const STEPS: (Category | "use" | "review")[] = ["use", "case", "cpu", "gpu", "cooling", "storage", "psu", "review"];
const STEP_LABEL: Record<string, string> = { use: "Use & budget", review: "Review", ...SHORT };
const HINT: Partial<Record<Category, string[]>> = {
  gpu: ["Smooth 1080p", "Great 1080p, good 1440p", "Great 1440p", "High-refresh 1440p, solid 4K", "Max settings 4K"],
  cpu: ["Fast all-rounder", "Great for streaming too", "Best for gaming", "Gaming + heavy editing"],
  cooling: ["Quiet and reliable", "Cooler, cleaner look", "Shows temps on a screen"],
  case: ["Fits most desks", "Room for big parts + airflow", "Small, for tight spaces"],
};
const USES = [{ icon: "gamepad", t: "Gaming" }, { icon: "video", t: "Streaming & video" }, { icon: "desktop", t: "Work & 3D" }];

function ConceptB({ step: startStep = 3 }: { step?: number }) {
  const { budget, pick, slide, choose } = useBuilder(1500);
  const [step, setStep] = useState(startStep);
  const cur = STEPS[step];
  const installed = new Set(STEPS.slice(1, step).filter((s): s is Category => s !== "use" && s !== "review"));
  const done = cur === "review";
  return (
    <div className="card overflow-hidden">
      <ol className="flex border-b border-line px-4 pt-4 text-[.72rem] max-sm:overflow-x-auto">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex-1 whitespace-nowrap border-b-2 px-2 pb-3 text-center ${i === step ? "border-accent text-ink" : i < step ? "border-accent/40 text-accent" : "border-transparent text-muted"}`}>
            {i < step ? "✓ " : `${i + 1}. `}{STEP_LABEL[s]}
          </li>
        ))}
      </ol>
      <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_1fr]">
        <div>
          {cur === "use" ? (
            <>
              <p className="font-heading text-[1.5rem]">What's it for?</p>
              <div className="my-4 grid grid-cols-3 gap-3">{USES.map((u, i) => <button key={u.t} type="button" className={`card p-4 text-left ${i === 0 ? "border-accent" : ""}`}><Icon name={u.icon} className="mb-2 h-5 w-5 text-accent" />{u.t}</button>)}</div>
              <Slider budget={budget} slide={slide} />
            </>
          ) : done ? (
            <>
              <p className="font-heading text-[1.5rem]">Your PC is ready to build</p>
              <ul className="my-4 divide-y divide-line rounded-card border border-line text-[.88rem]">
                {CATEGORIES.map((c) => <li key={c.key} className="flex justify-between gap-3 px-4 py-2"><span className="text-muted">{c.label}</span><span className="text-right">{partOf(pick, c.key).name}</span></li>)}
              </ul>
              <BudgetBar pick={pick} budget={budget} />
            </>
          ) : (
            <>
              <p className="eyebrow">Step {step + 1} of {STEPS.length}</p>
              <p className="mb-1 mt-1 font-heading text-[1.5rem]">Pick your {CATEGORIES.find((c) => c.key === cur)!.label.toLowerCase()}</p>
              <p className="mb-4 text-[.85rem] text-muted">Recommended for your {dollars(budget)} budget is highlighted. Tap another to swap it in.</p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {customParts[cur].map((p, i) => {
                  const on = pick[cur] === i, rec = recommend(budget)[cur] === i;
                  return (
                    <button key={p.name} type="button" onClick={() => choose(cur, i)}
                      className={`card relative p-4 text-left transition-colors ${on ? "!border-accent bg-accent/10" : ""}`}>
                      {rec && <span className="absolute right-3 top-3 rounded-full bg-accent/20 px-2 py-0.5 font-mono text-[.62rem] uppercase tracking-wider text-accent">Pick</span>}
                      <span className="block pr-12 font-medium">{short(cur, i)}</span>
                      <span className="block text-[.78rem] text-muted">{HINT[cur]?.[i] ?? p.name}</span>
                      <span className="mt-2 block font-mono text-[.8rem] text-accent2">{p.price ? `+${dollars(p.price)}` : "Included"}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <div className="mt-6 flex items-center justify-between">
            <button type="button" className="btn btn-ghost" onClick={() => setStep(Math.max(0, step - 1))}>Back</button>
            <span className="font-mono text-[.95rem]">{dollars(totalOf(pick))}</span>
            <button type="button" className="btn" onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))}>{done ? "Send build request" : "Next"} <Icon name="arrow" className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="relative rounded-card border border-line max-lg:order-first bg-[radial-gradient(60%_50%_at_50%_45%,color-mix(in_srgb,var(--accent)_9%,transparent),transparent)] p-4">
          <p className="absolute left-4 top-3 font-mono text-[.7rem] text-muted">{done ? "POWERED ON" : `${installed.size} of 6 parts in`}</p>
          <div className="h-[13rem] lg:h-[22rem]"><PcVisual pick={pick} installed={done ? ALL : installed} powered={done} /></div>
          {done && <div className="mt-2"><PerfMeter pick={pick} /></div>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// C: Click the PC. Tap a glowing pin on a part to swap it.

function ConceptC({ open: startOpen = "gpu" as Category | null }) {
  const { budget, pick, slide, choose } = useBuilder(2000);
  const [open, setOpen] = useState<Category | null>(startOpen);
  return (
    <div className="card grid overflow-hidden lg:grid-cols-[18rem_1fr]">
      <div className="border-line p-6 lg:border-r">
        <p className="eyebrow">Build your PC</p>
        <p className="mb-4 mt-1 text-[.85rem] text-muted">Set a budget, then tap any glowing part to change it.</p>
        <Slider budget={budget} slide={slide} />
        <ul className="mt-5 space-y-1 text-[.85rem]">
          {CATEGORIES.map((c) => (
            <li key={c.key}><button type="button" onClick={() => setOpen(c.key)} className={`flex w-full justify-between gap-2 rounded-lg px-2 py-1.5 text-left ${open === c.key ? "bg-accent/10 text-ink" : "text-muted hover:text-ink"}`}><span>{SHORT[c.key]}</span><span className="truncate text-right text-ink">{short(c.key, pick[c.key])}</span></button></li>
          ))}
        </ul>
        <div className="mt-5 border-t border-line pt-4"><BudgetBar pick={pick} budget={budget} /></div>
        <button type="button" className="btn mt-5 w-full justify-center">Build now <Icon name="arrow" className="h-4 w-4" /></button>
      </div>
      <div className="relative flex flex-col bg-[radial-gradient(55%_50%_at_50%_50%,color-mix(in_srgb,var(--accent)_10%,transparent),transparent)] p-6">
        <div className="relative h-[28rem]"><PcVisual pick={pick} installed={ALL} powered highlight={open}>
          {CATEGORIES.map((c) => (
            <button key={c.key} type="button" onClick={() => setOpen(open === c.key ? null : c.key)} style={{ ...pinStyle(c.key), zIndex: 40 }}
              className={`absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 text-[.7rem] font-bold ${open === c.key ? "border-accent bg-accent text-bg" : "border-accent bg-bg/80 text-accent shadow-[0_0_0_6px_color-mix(in_srgb,var(--accent)_18%,transparent)]"}`}>
              +
            </button>
          ))}
          {open && (
            <div className="absolute z-50 w-64 rounded-card border border-line bg-card/95 p-3 shadow-2xl backdrop-blur" style={{ ...pinStyle(open), transform: "translate(1.4rem, -50%)" }}>
              <p className="mb-2 flex justify-between text-[.8rem]"><b className="font-medium">{CATEGORIES.find((c) => c.key === open)!.label}</b><button type="button" className="text-muted" onClick={() => setOpen(null)}>✕</button></p>
              <div className="space-y-1">
                {customParts[open].map((p, i) => (
                  <button key={p.name} type="button" onClick={() => choose(open, i)} className={`flex w-full justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[.8rem] ${pick[open] === i ? "bg-accent/15 text-ink" : "text-muted hover:bg-line/50 hover:text-ink"}`}>
                    <span>{short(open, i)}</span><span className="font-mono text-accent2">{p.price ? dollars(p.price) : "incl."}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </PcVisual></div>
        <div className="mx-auto mt-4 w-full max-w-md rounded-card border border-line bg-card/80 p-3"><PerfMeter pick={pick} /></div>
      </div>
    </div>
  );
}

export default function BuilderLab() {
  const [q] = useSearchParams();
  const c = q.get("c") ?? "a";
  const arg = q.get("s");
  return (
    <section className="section !pt-28">
      <div className="wrap max-w-[78rem]">
        {c === "a" && <ConceptA hover={(arg as Category) ?? null} />}
        {c === "b" && <ConceptB step={arg ? Number(arg) : 3} />}
        {c === "c" && <ConceptC open={(arg as Category) ?? "gpu"} />}
      </div>
    </section>
  );
}

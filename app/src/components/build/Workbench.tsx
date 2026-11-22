import { useEffect, useRef, useState } from "react";
import PcVisual, { pinStyle } from "./PcVisual";
import type { FormValues, Option } from "../../types";
import type { Category, Pick } from "../../lib/configurator";
import { budgets, caseSizes, coolingOptions, lightingOptions, storageOptions, useCases } from "../../content/formOptions";
import { usePauseOffscreen } from "../../lib/usePauseOffscreen";

/**
 * The PC beside the build request form. Each of the first six questions installs a part: the answer being chosen
 * shows straight away, "Install" drops it in with a glow, and on the "Power it on" step the visitor presses the power
 * button: a quick boot screen runs, it lights up (matching their lighting choice) and their build gets a name.
 * Each pick also gets a short reaction ("quip" in content/formOptions.ts) in a chat bubble.
 */

/** How many questions install a part (the form's first steps, in the order below). */
export const PART_STEPS = 6;
const PARTS: { field: string; cat: Category; name: string; list: Option[] }[] = [
  { field: "caseSize", cat: "case", name: "Case", list: caseSizes },
  { field: "useCases", cat: "cpu", name: "CPU", list: useCases },
  { field: "budget", cat: "gpu", name: "Graphics card", list: budgets },
  { field: "cooling", cat: "cooling", name: "Cooling", list: coolingOptions },
  { field: "storage", cat: "storage", name: "Storage", list: storageOptions },
  { field: "lighting", cat: "psu", name: "Power supply", list: lightingOptions },
];

/** The build's name at the end, from its lighting and case size, e.g. "The Neon Titan". */
const NAME_LIGHT = ["Phantom", "Ember", "Neon"], NAME_CASE = ["Pocket Rocket", "Cube", "Titan"];
const BOOT_LINES = ["HunterPCBuilds BIOS", "CPU ........... OK", "Graphics ...... OK", "Memory ........ OK", "Storage ....... OK", "Booting..."];
const BOOT_MS = 1500;

const idx = (list: Option[], v: FormValues[string] | undefined) => list.findIndex((o) => o.value === v);
const filled = (v: FormValues[string] | undefined) => (Array.isArray(v) ? v.length > 0 : !!v);

/** Turns the answers into the drawing's parts (positions in content/customParts.ts). */
function toPick(values: FormValues): { pick: Pick; lights: number } {
  const at = (list: Option[], v: FormValues[string] | undefined, map: number[], fallback: number) => { const i = idx(list, v); return i < 0 ? fallback : map[Math.min(i, map.length - 1)]; };
  const uses = (Array.isArray(values.useCases) ? values.useCases : []) as string[];
  const heavy = uses.some((u) => /edit|3D|CAD/i.test(u)), games = uses.some((u) => /gam|stream/i.test(u));
  return {
    pick: {
      case: at(caseSizes, values.caseSize, [2, 0, 1], 1), // ITX, Micro-ATX, ATX
      cpu: heavy ? 3 : games ? 2 : 0,
      gpu: at(budgets, values.budget, [0, 2, 4, 1], 1),
      psu: at(budgets, values.budget, [0, 1, 3, 1], 1),
      cooling: at(coolingOptions, values.cooling, [0, 1, 2], 0),
      storage: at(storageOptions, values.storage, [1, 3, 4], 1),
    },
    lights: at(lightingOptions, values.lighting, [0, 0.45, 1], 1),
  };
}

export default function Workbench({ values, step }: { values: FormValues; step: number }) {
  const box = useRef<HTMLDivElement>(null);
  usePauseOffscreen(box);
  const pc = useRef<HTMLDivElement>(null);
  const [pressed, setPressed] = useState(false);
  const [booted, setBooted] = useState(false);
  const powerStep = step === PART_STEPS;
  const powered = booted && step >= PART_STEPS || step > PART_STEPS; // past the power step it's on regardless
  const booting = pressed && !booted && step === PART_STEPS;
  useEffect(() => { if (step < PART_STEPS) { setPressed(false); setBooted(false); } }, [step]);
  useEffect(() => {
    if (!pressed || booted) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setBooted(true), reduced ? 0 : BOOT_MS);
    return () => clearTimeout(t);
  }, [pressed, booted]);

  // "+ Part installed" when moving forward past a part's question
  const prev = useRef(step);
  const [flash, setFlash] = useState<{ part: (typeof PARTS)[number]; k: number } | null>(null);
  useEffect(() => {
    const was = prev.current;
    prev.current = step;
    if (step === was + 1 && was < PART_STEPS) {
      setFlash({ part: PARTS[was], k: Date.now() });
      // a little "thunk" as the part seats
      pc.current?.animate([{ transform: "none" }, { transform: "translateY(1.5%) scaleY(.985)" }, { transform: "translateY(-.6%)" }, { transform: "none" }],
        { duration: 420, easing: "ease-out" });
    }
  }, [step]);
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), 1000); return () => clearTimeout(t); }, [flash]);

  const { pick, lights } = toPick(values);
  // A part shows once its question is reached and answered (the one being answered previews live)
  const installed = new Set(PARTS.filter((p, i) => i <= step && filled(values[p.field])).map((p) => p.cat));
  const count = PARTS.filter((p, i) => i < step && filled(values[p.field])).length;
  // Reaction to the answer on this step (the last one tapped, for multi-pick questions)
  const here = PARTS[step];
  const answer = here ? values[here.field] : undefined;
  const last = Array.isArray(answer) ? (answer as string[]).at(-1) : answer;
  const quip = here && last ? here.list.find((o) => o.value === last)?.quip : undefined;
  const name = `The ${NAME_LIGHT[Math.round(lights * 2)] ?? "Neon"} ${NAME_CASE[[2, 0, 1].indexOf(pick.case)] ?? "Titan"}`;

  return (
    <div ref={box} className={`relative h-full min-h-[17rem] bg-[radial-gradient(60%_50%_at_50%_55%,color-mix(in_srgb,var(--accent)_10%,transparent),transparent),repeating-linear-gradient(0deg,transparent_0_31px,rgb(255_255_255/.025)_31px_32px),repeating-linear-gradient(90deg,transparent_0_31px,rgb(255_255_255/.025)_31px_32px)] p-5 ${step > PART_STEPS ? "max-lg:hidden" : ""} ${powered && powerStep ? "max-lg:pb-16" : ""}`}>
      <p className={`absolute left-5 top-4 z-10 font-mono text-[.68rem] uppercase tracking-wider text-muted ${quip ? "max-sm:hidden" : ""}`}>
        {powered ? <span className="text-accent">● Powered on</span> : `Workbench · ${count}/${PART_STEPS} parts`}
      </p>
      {quip && <p key={String(last)} className="wb-quip absolute right-4 top-3 z-20 flex max-w-[15rem] items-center gap-2 rounded-2xl rounded-tr-sm border border-line bg-card/95 py-1.5 pl-1.5 pr-3 text-[.8rem] text-ink shadow-lg">
        <img src={`${import.meta.env.BASE_URL}logo-mark.svg`} alt="" className="h-6 w-6 shrink-0 rounded-full" />{quip}
      </p>}
      {powered && step === PART_STEPS && <p className="wb-name absolute inset-x-0 bottom-4 z-20 text-center">
        <span className="block font-mono text-[.66rem] uppercase tracking-[.2em] text-accent2">Meet</span>
        <span className="block font-heading text-[clamp(1.4rem,3vw,2rem)] leading-tight text-ink">{name}</span>
      </p>}
      <div ref={pc} className="mx-auto h-[15rem] max-w-[30rem] sm:h-[19rem] lg:h-[30rem]">
        <PcVisual pick={pick} installed={installed} powered={powered} lights={powered ? lights : 0}>
          {flash && <span key={flash.k} className="wb-ring pointer-events-none absolute z-50 h-16 w-16 rounded-full border-2 border-accent" style={pinStyle(flash.part.cat, pick.case)} />}
          {powered && step === PART_STEPS && <span className="pointer-events-none absolute left-1/2 top-1/2 z-50" aria-hidden="true">
            {Array.from({ length: 14 }, (_, i) => <i key={i} className="wb-spark" style={{ ["--a" as string]: `${i * (360 / 14)}deg`, ["--d" as string]: `${4 + (i % 3) * 1.6}rem`, animationDelay: `${(i % 4) * 40}ms` }} />)}
          </span>}
          {booting && <span className="absolute inset-x-[18%] top-1/2 z-50 -translate-y-1/2 rounded-lg border border-accent/40 bg-[#05080c]/90 p-3 font-mono text-[.7rem] leading-relaxed text-accent shadow-2xl" role="status">
            {BOOT_LINES.map((l, i) => <span key={l} className="wb-line block" style={{ animationDelay: `${i * (BOOT_MS / (BOOT_LINES.length + 1))}ms` }}>{l}</span>)}
          </span>}
          {powered && <span className="wb-boot pointer-events-none absolute inset-0 z-50 rounded-[30%] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--accent)_45%,transparent),transparent)]" />}
        </PcVisual>
      </div>
      {flash && <p key={flash.k} className="wb-toast absolute bottom-5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-accent/40 bg-card/90 px-3 py-1 font-mono text-[.72rem] text-accent">+ {flash.part.name} installed</p>}
      {powerStep && !pressed && <p className="absolute bottom-[6.5rem] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap font-mono text-[.7rem] uppercase tracking-wider text-accent">Moment of truth ↓</p>}
      {powerStep && !pressed && (
        <button type="button" onClick={() => setPressed(true)} aria-label="Power on your PC"
          className="wb-pulse absolute bottom-6 left-1/2 z-10 grid h-16 w-16 -translate-x-1/2 place-items-center rounded-full border-2 border-accent bg-card text-accent">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 3v8M6.3 7.2a8 8 0 1 0 11.4 0" /></svg>
        </button>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import PcVisual, { pinStyle } from "./PcVisual";
import type { FormValues, Option } from "../../types";
import type { Category, Pick } from "../../lib/configurator";
import { budgets, caseSizes, coolingOptions, lightingOptions, storageOptions } from "../../content/formOptions";
import { usePauseOffscreen } from "../../lib/usePauseOffscreen";

/**
 * The PC beside the build request form. Each of the first six questions installs a part: the answer being chosen
 * shows straight away, "Install" drops it in with a glow, and on the "Power it on" step the visitor presses the power
 * button and it boots (fans spin, lights match their lighting choice).
 */

/** How many questions install a part (the form's first steps, in the order below). */
export const PART_STEPS = 6;
const PARTS: { field: string; cat: Category; name: string }[] = [
  { field: "caseSize", cat: "case", name: "Case" },
  { field: "useCases", cat: "cpu", name: "CPU" },
  { field: "budget", cat: "gpu", name: "Graphics card" },
  { field: "cooling", cat: "cooling", name: "Cooling" },
  { field: "storage", cat: "storage", name: "Storage" },
  { field: "lighting", cat: "psu", name: "Power supply" },
];

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
  const [pressed, setPressed] = useState(false);
  const powerStep = step === PART_STEPS;
  const powered = pressed && step >= PART_STEPS || step > PART_STEPS; // past the power step it's on regardless
  useEffect(() => { if (step < PART_STEPS) setPressed(false); }, [step]);

  // "+ Part installed" when moving forward past a part's question
  const prev = useRef(step);
  const [flash, setFlash] = useState<{ part: (typeof PARTS)[number]; k: number } | null>(null);
  useEffect(() => {
    const was = prev.current;
    prev.current = step;
    if (step === was + 1 && was < PART_STEPS) setFlash({ part: PARTS[was], k: Date.now() });
  }, [step]);
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), 1000); return () => clearTimeout(t); }, [flash]);

  const { pick, lights } = toPick(values);
  // A part shows once its question is reached and answered (the one being answered previews live)
  const installed = new Set(PARTS.filter((p, i) => i <= step && filled(values[p.field])).map((p) => p.cat));
  const count = PARTS.filter((p, i) => i < step && filled(values[p.field])).length;

  return (
    <div ref={box} className={`relative h-full min-h-[17rem] bg-[radial-gradient(60%_50%_at_50%_55%,color-mix(in_srgb,var(--accent)_10%,transparent),transparent),repeating-linear-gradient(0deg,transparent_0_31px,rgb(255_255_255/.025)_31px_32px),repeating-linear-gradient(90deg,transparent_0_31px,rgb(255_255_255/.025)_31px_32px)] p-5 ${step > PART_STEPS ? "max-lg:hidden" : ""}`}>
      <p className="absolute left-5 top-4 z-10 font-mono text-[.68rem] uppercase tracking-wider text-muted">
        {powered ? <span className="text-accent">● Powered on</span> : `Workbench · ${count}/${PART_STEPS} parts`}
      </p>
      <div className="mx-auto h-[15rem] max-w-[30rem] sm:h-[19rem] lg:h-[30rem]">
        <PcVisual pick={pick} installed={installed} powered={powered} lights={powered ? lights : 0}>
          {flash && <span key={flash.k} className="wb-ring pointer-events-none absolute z-50 h-16 w-16 rounded-full border-2 border-accent" style={pinStyle(flash.part.cat, pick.case)} />}
          {powered && <span className="wb-boot pointer-events-none absolute inset-0 z-50 rounded-[30%] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--accent)_45%,transparent),transparent)]" />}
        </PcVisual>
      </div>
      {flash && <p key={flash.k} className="wb-toast absolute bottom-5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-accent/40 bg-card/90 px-3 py-1 font-mono text-[.72rem] text-accent">+ {flash.part.name} installed</p>}
      {powerStep && !pressed && (
        <button type="button" onClick={() => setPressed(true)} aria-label="Power on your PC"
          className="wb-pulse absolute bottom-6 left-1/2 z-10 grid h-16 w-16 -translate-x-1/2 place-items-center rounded-full border-2 border-accent bg-card text-accent">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 3v8M6.3 7.2a8 8 0 1 0 11.4 0" /></svg>
        </button>
      )}
    </div>
  );
}

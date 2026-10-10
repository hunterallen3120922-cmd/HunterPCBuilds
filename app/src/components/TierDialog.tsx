import { useEffect, useRef, useState } from "react";
import type { BuildTier } from "../types";
import Icon from "./Icon";
import { BUILDER_MAX, BUILDER_MIN, BUILDER_STEP, customParts } from "../content/customParts";
import { CATEGORIES, dollars, minPsuFor, partOf, powerOk, recommend, totalOf, type Pick } from "../lib/configurator";

/** What "Build now" sends to the request form. */
export interface BuildChoice { specs: string[]; budget: string; note?: string }

/**
 * Details for one build package, with a "Build now" button that starts a request for it.
 * Packages marked `builder` show a budget slider and a part picker instead of fixed specs.
 */
export default function TierDialog({ tier, onClose, onBuild }: {
  tier: BuildTier | null; onClose: () => void; onBuild: (t: BuildTier, choice: BuildChoice) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (tier && !d.open) d.showModal();
    if (!tier && d.open) d.close();
  }, [tier]);

  // Builder state (only used by builder packages)
  const [budget, setBudget] = useState(1500);
  const [pick, setPick] = useState<Pick>(() => recommend(1500));
  const [custom, setCustom] = useState(false); // changed a part by hand
  const slide = (b: number) => { setBudget(b); setPick(recommend(b)); setCustom(false); };
  const choose = (key: keyof Pick, i: number) => {
    setCustom(true);
    setPick((cur) => {
      const next = { ...cur, [key]: i };
      if (key === "gpu" && !powerOk(next)) next.psu = minPsuFor(i); // keep the power supply big enough
      return next;
    });
  };
  const total = totalOf(pick);
  const unlimited = budget >= BUILDER_MAX;
  const budgetLabel = unlimited ? `${dollars(BUILDER_MAX)}+` : dollars(budget);

  const build = () => {
    if (!tier) return;
    if (!tier.builder) return onBuild(tier, { specs: tier.recommendedSpecs, budget: tier.budget });
    onBuild(tier, {
      specs: CATEGORIES.map((c) => partOf(pick, c.key).name),
      budget: tier.budget,
      note: `Target budget: ${budgetLabel}. Parts total: ${dollars(total)} (+ ${tier.laborPrice} labor).`,
    });
  };

  return (
    <dialog ref={dialog} onClose={onClose} onClick={(e) => { if (e.target === dialog.current) onClose(); }}
      aria-label={tier ? `${tier.name} package` : undefined}
      className={`m-auto max-h-[92vh] overflow-y-auto rounded-card border border-line bg-card p-0 text-ink ${tier?.builder ? "w-[min(94vw,44rem)]" : "w-[min(94vw,36rem)]"}`}>
      {tier && (
        <div className="p-7 max-sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">{tier.name}</p>
              <p className="mt-2 font-heading text-[2rem] leading-tight">{tier.builder ? budgetLabel : tier.budget}</p>
            </div>
            <button type="button" className="btn btn-ghost !px-3 !py-1" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <p className="mt-1 text-[.95rem] text-accent2">{tier.bestFor}</p>
          <p className="mt-4 text-muted">{tier.description}</p>

          {tier.builder ? (
            <>
              <label className="mt-6 block">
                <span className="mb-2 flex items-baseline justify-between text-[.9rem]">
                  <span className="font-medium">Your budget for parts</span>
                  <span className="font-mono text-accent">{budgetLabel}</span>
                </span>
                <input type="range" min={BUILDER_MIN} max={BUILDER_MAX} step={BUILDER_STEP} value={budget}
                  onChange={(e) => slide(Number(e.target.value))} className="w-full accent-[var(--accent)]" aria-valuetext={budgetLabel} />
                <span className="mt-1 flex justify-between font-mono text-[.72rem] text-muted"><span>{dollars(BUILDER_MIN)}</span><span>{dollars(BUILDER_MAX)}+</span></span>
              </label>

              <div className="mb-3 mt-6 flex items-baseline justify-between gap-3">
                <h3 className="text-[1.05rem]">{custom ? "Your parts" : "Recommended parts"}</h3>
                {custom && <button type="button" className="text-[.82rem] text-muted underline hover:text-ink" onClick={() => slide(budget)}>Back to recommended</button>}
              </div>
              <div className="divide-y divide-line rounded-card border border-line">
                {CATEGORIES.map((c) => (
                  <label key={c.key} className="grid items-center gap-1 px-4 py-3 sm:grid-cols-[11rem_1fr] sm:gap-3">
                    <span className="text-[.82rem] text-muted">{c.label}</span>
                    <select className="input !py-2 !text-[.9rem]" value={pick[c.key]} onChange={(e) => choose(c.key, Number(e.target.value))}>
                      {customParts[c.key].map((p, i) => {
                        const tooSmall = c.key === "psu" && (p.watts ?? 0) < (partOf(pick, "gpu").needsWatts ?? 0);
                        return <option key={p.name} value={i} disabled={tooSmall}>{p.name}{p.price ? ` (${dollars(p.price)})` : ""}{tooSmall ? " (too small for this GPU)" : ""}</option>;
                      })}
                    </select>
                  </label>
                ))}
              </div>
              <p className="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-t border-line pt-4">
                <span className="text-[.9rem] text-muted">Parts total <span className="text-[.8rem]">(+ {tier.laborPrice} labor)</span></span>
                <span className="font-mono text-[1.2rem]">{dollars(total)}</span>
              </p>
              {!unlimited && total > budget && (
                <p className="mt-1 text-right text-[.82rem] text-accent2">{dollars(total - budget)} over your budget</p>
              )}
              <p className="mt-2 text-[.8rem] text-muted">Prices are estimates; you approve the final parts list and price before I order anything.</p>
            </>
          ) : (
            <>
              <h3 className="mb-3 mt-6 text-[1.05rem]">Recommended specs</h3>
              <ul className="space-y-2 text-[.95rem]">
                {tier.recommendedSpecs.map((s) => (
                  <li key={s} className="flex gap-3"><Icon name="check" className="mt-[3px] h-4 w-4 shrink-0 text-accent" />{s}</li>
                ))}
              </ul>
              <p className="mt-5 border-t border-line pt-4 text-[.88rem] text-muted">
                Labor <span className="font-mono text-ink">{tier.laborPrice}</span> + parts at cost. You approve the final parts list before I order anything.
              </p>
            </>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn" onClick={build}>Build now <Icon name="arrow" className="h-4 w-4" /></button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
          </div>
        </div>
      )}
    </dialog>
  );
}

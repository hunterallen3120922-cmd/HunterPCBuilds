import { useEffect, useRef } from "react";
import type { BuildTier } from "../types";
import Icon from "./Icon";

/** Details for one build package, with a "Build now" button that starts a request for it. */
export default function TierDialog({ tier, onClose, onBuild }: { tier: BuildTier | null; onClose: () => void; onBuild: (t: BuildTier) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (tier && !d.open) d.showModal();
    if (!tier && d.open) d.close();
  }, [tier]);

  return (
    <dialog ref={dialog} onClose={onClose} onClick={(e) => { if (e.target === dialog.current) onClose(); }}
      aria-label={tier ? `${tier.name} package` : undefined}
      className="m-auto max-h-[92vh] w-[min(94vw,36rem)] overflow-y-auto rounded-card border border-line bg-card p-0 text-ink">
      {tier && (
        <div className="p-7 max-sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">{tier.name}</p>
              <p className="mt-2 font-heading text-[2rem] leading-tight">{tier.budget}</p>
            </div>
            <button type="button" className="btn btn-ghost !px-3 !py-1" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <p className="mt-1 text-[.95rem] text-accent2">{tier.bestFor}</p>
          <p className="mt-4 text-muted">{tier.description}</p>

          <h3 className="mb-3 mt-6 text-[1.05rem]">Recommended specs</h3>
          <ul className="space-y-2 text-[.95rem]">
            {tier.recommendedSpecs.map((s) => (
              <li key={s} className="flex gap-3"><Icon name="check" className="mt-[3px] h-4 w-4 shrink-0 text-accent" />{s}</li>
            ))}
          </ul>
          <p className="mt-5 border-t border-line pt-4 text-[.88rem] text-muted">
            Labor <span className="font-mono text-ink">{tier.laborPrice}</span> + parts at cost. You approve the final parts list before I order anything.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn" onClick={() => onBuild(tier)}>Build now <Icon name="arrow" className="h-4 w-4" /></button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
          </div>
        </div>
      )}
    </dialog>
  );
}

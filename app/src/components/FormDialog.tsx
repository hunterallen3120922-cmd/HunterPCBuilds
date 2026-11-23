import { useEffect, useRef } from "react";
import MultiStepForm from "./form/MultiStepForm";
import type { FormConfig, FormValues } from "./form/types";
import { submitRequest } from "../lib/submit";

/** Popup that runs any short request form (trade-in offers, shop holds and questions). */
export default function FormDialog({ config, onClose, onSubmit }: { config: FormConfig | null; onClose: () => void; onSubmit?: (v: FormValues) => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (config && !d.open) d.showModal();
    if (!config && d.open) d.close();
  }, [config]);

  return (
    <dialog ref={dialog} onClose={onClose}
      onClick={(e) => { if (e.target === dialog.current) onClose(); }}
      aria-label={config?.label}
      className="m-auto max-h-[92vh] w-[min(94vw,47.5rem)] overflow-y-auto rounded-card border border-line bg-card p-0 text-ink">
      {config && (
        <div className="p-6 max-sm:p-4">
          <div className="mb-4 flex justify-end">
            <button type="button" className="btn btn-ghost !px-3 !py-1" onClick={onClose} aria-label="Close dialog">✕</button>
          </div>
          {/* Requests table only allows build/repair, so these go in as "repair" with their own "Request type" label */}
          <MultiStepForm key={config.label} bare config={config} onClose={onClose}
            onSubmit={onSubmit ?? ((v) => submitRequest("repair", config, v))} />
        </div>
      )}
    </dialog>
  );
}

import { useEffect, useRef } from "react";
import CloseX, { okToDiscard } from "./CloseX";
import MultiStepForm from "./form/MultiStepForm";
import type { FormConfig, FormValues } from "./form/types";
import { submitRequest } from "../lib/submit";

/** Popup that runs any short request form (trade-in offers, shop holds and questions). */
export default function FormDialog({ config, onClose, onSubmit }: { config: FormConfig | null; onClose: () => void; onSubmit?: (v: FormValues) => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const dirty = useRef(false);
  // Clicking outside doesn't close it; the X or Esc does, and asks first if anything was filled in
  const close = () => { if (okToDiscard(dirty.current, "Close this form? What you filled in will be lost.")) { dirty.current = false; onClose(); } };

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (config && !d.open) d.showModal();
    if (!config && d.open) d.close();
  }, [config]);

  return (
    <dialog ref={dialog} onClose={onClose}
      onCancel={(e) => { e.preventDefault(); close(); }}
      aria-label={config?.label}
      className="m-auto max-h-[92vh] w-[min(94vw,47.5rem)] overflow-y-auto rounded-card border border-line bg-card p-0 text-ink">
      {config && (
        <div className="p-6 max-sm:p-4">
          <CloseX onClick={close} />
          {/* Requests table only allows build/repair, so these go in as "repair" with their own "Request type" label */}
          <MultiStepForm key={config.label} bare config={config} onClose={onClose} onDirtyChange={(v) => { dirty.current = v; }}
            onSubmit={onSubmit ?? ((v) => submitRequest("repair", config, v))} />
        </div>
      )}
    </dialog>
  );
}

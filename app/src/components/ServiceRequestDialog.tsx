import { useEffect, useMemo, useRef } from "react";
import type { RepairService } from "../types";
import CloseX, { okToDiscard } from "./CloseX";
import MultiStepForm from "./form/MultiStepForm";
import { serviceForm } from "../forms/serviceForm";
import { submitRequest } from "../lib/submit";

/** Popup with a short request form for one specific service. */
export default function ServiceRequestDialog({ service, onClose }: { service: RepairService | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const dirty = useRef(false);
  // Clicking outside doesn't close it; the X or Esc does, and asks first if anything was filled in
  const close = () => { if (okToDiscard(dirty.current, "Close this form? What you filled in will be lost.")) { dirty.current = false; onClose(); } };
  const config = useMemo(() => (service ? serviceForm(service) : null), [service]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (service && !d.open) d.showModal();
    if (!service && d.open) d.close();
  }, [service]);

  return (
    <dialog ref={dialog} onClose={onClose}
      onCancel={(e) => { e.preventDefault(); close(); }}
      aria-label={service ? `Request ${service.name}` : undefined}
      className="m-auto max-h-[92vh] w-[min(94vw,47.5rem)] overflow-y-auto rounded-card border border-line bg-card p-0 text-ink">
      {service && config && (
        <div className="p-6 max-sm:p-4">
          <CloseX onClick={close} />
          <MultiStepForm key={service.name} bare config={config} onClose={onClose} onDirtyChange={(v) => { dirty.current = v; }}
            onSubmit={(v) => submitRequest("repair", config, v)} />
        </div>
      )}
    </dialog>
  );
}

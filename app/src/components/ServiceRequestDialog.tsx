import { useEffect, useMemo, useRef } from "react";
import type { RepairService } from "../types";
import MultiStepForm from "./form/MultiStepForm";
import { serviceForm } from "../forms/serviceForm";
import { submitRequest } from "../lib/submit";

/** Popup with a short request form for one specific service. */
export default function ServiceRequestDialog({ service, onClose }: { service: RepairService | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const config = useMemo(() => (service ? serviceForm(service) : null), [service]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (service && !d.open) d.showModal();
    if (!service && d.open) d.close();
  }, [service]);

  return (
    <dialog ref={dialog} onClose={onClose}
      onClick={(e) => { if (e.target === dialog.current) onClose(); }}
      aria-label={service ? `Request ${service.name}` : undefined}
      className="m-auto max-h-[92vh] w-[min(94vw,760px)] overflow-y-auto rounded-2xl border border-line bg-card p-0 text-ink">
      {service && config && (
        <div className="p-6 max-sm:p-4">
          <div className="mb-4 flex justify-end">
            <button type="button" className="btn btn-ghost !px-3 !py-1" onClick={onClose} aria-label="Close dialog">✕</button>
          </div>
          <MultiStepForm key={service.name} bare config={config} onClose={onClose}
            onSubmit={(v) => submitRequest("repair", config, v)} />
        </div>
      )}
    </dialog>
  );
}

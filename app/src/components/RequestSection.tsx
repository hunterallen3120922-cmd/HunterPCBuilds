import type { FormConfig } from "./form/types";
import type { FormValues } from "../types";
import MultiStepForm from "./form/MultiStepForm";
import SectionHead from "./SectionHead";
import { submitRequest } from "../lib/submit";
import { site } from "../content/site";

export default function RequestSection({ type, config, title }: { type: "build" | "repair"; config: FormConfig; title: string }) {
  return (
    <section id="request" className="section scroll-mt-16">
      <div className="wrap">
        <SectionHead center title={title} sub={site.responseTime} />
        <MultiStepForm config={config} onSubmit={(v: FormValues) => submitRequest(type, config, v)} />
      </div>
    </section>
  );
}

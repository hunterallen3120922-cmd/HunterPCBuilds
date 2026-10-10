import type { FormConfig } from "./form/types";
import type { FormValues } from "../types";
import MultiStepForm from "./form/MultiStepForm";
import SectionHead from "./SectionHead";
import { submitRequest } from "../lib/submit";
import { site } from "../content/site";

/** The request form at the bottom of a page. `prefill` starts it with some answers filled in (the form restarts when it changes). */
export default function RequestSection({ type, config, title, prefill }: { type: "build" | "repair"; config: FormConfig; title: string; prefill?: FormValues }) {
  return (
    <section id="request" className="section scroll-mt-20">
      <div className="wrap">
        <SectionHead center eyebrow="Request" title={title} sub={site.responseTime} />
        <div data-reveal="up"><MultiStepForm key={JSON.stringify(prefill ?? {})} config={config} prefill={prefill} onSubmit={(v: FormValues) => submitRequest(type, config, v)} /></div>
      </div>
    </section>
  );
}

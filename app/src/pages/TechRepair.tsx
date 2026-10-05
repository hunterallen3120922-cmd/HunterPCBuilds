import { useState } from "react";
import PageHero from "../components/PageHero";
import SectionHead from "../components/SectionHead";
import Reveal from "../components/Reveal";
import ServiceRequestDialog from "../components/ServiceRequestDialog";
import RequestSection from "../components/RequestSection";
import { useSeo } from "../lib/seo";
import { repairForm } from "../forms/repairForm";
import { backupNotice, devicesServed, repairNote, repairServices } from "../content/repairServices";
import { site } from "../content/site";
import type { RepairService } from "../types";

export default function TechRepair() {
  const [selected, setSelected] = useState<RepairService | null>(null);
  useSeo(`Computer Repair | ${site.name}`, "Laptop and PC repair, upgrades, virus removal and cleanups in York, PA. Firm quotes, 30-day labor guarantee.");
  return (
    <>
      <PageHero tag="Tech repair"
        title={<>Slow, broken or overheating? <em className="grad-text not-italic">Let's fix it.</em></>}
        actions={<button type="button" className="btn" onClick={() => document.getElementById("request")?.scrollIntoView()}>Start a repair request</button>}>
        Repairs and upgrades with a firm quote before I start. Simple fixes often happen same-day.
      </PageHero>

      <section className="section alt">
        <div className="wrap">
          <SectionHead title="Services & prices" sub="Starting prices. Tap a service to request it. You always get a firm quote before I start." />
          <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-[14px] p-0">
            {repairServices.map((s, i) => (
              <li key={s.name}>
                <Reveal delay={(i % 3) * 60}>
                  <button type="button" onClick={() => setSelected(s)} aria-label={`Request ${s.name}`}
                    className="group flex w-full cursor-pointer items-baseline justify-between gap-3 rounded-xl border border-line bg-card px-5 py-4 text-left text-ink transition hover:-translate-y-0.5 hover:border-accent">
                    <span><b className="font-semibold"><span aria-hidden>{s.icon} </span>{s.name}</b><small className="block text-[.85rem] text-muted">{s.description}</small></span>
                    <span className="text-right"><span className="whitespace-nowrap font-heading font-bold text-accent">{s.price}{s.plusParts && " + parts"}</span>
                      <small className="block text-[.78rem] text-muted group-hover:text-accent">Request →</small></span>
                  </button>
                </Reveal>
              </li>
            ))}
          </ul>
          <p className="mt-[18px] text-[.9rem] text-muted">{repairNote} {site.paymentMethods.join(", ")} accepted.</p>
        </div>
      </section>

      <section className="section">
        <div className="wrap grid gap-[18px] md:grid-cols-2">
          <div className="card">
            <h2 className="text-xl font-bold">Devices I work on</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-[.95rem]">{devicesServed.map((d) => <li key={d}>{d}</li>)}</ul>
          </div>
          <div className="card border-accent2/40">
            <h2 className="text-xl font-bold">💾 Back up your data first</h2>
            <p className="mt-3 text-[.95rem] text-muted">{backupNotice}</p>
          </div>
        </div>
      </section>

      <ServiceRequestDialog service={selected} onClose={() => setSelected(null)} />
      <div className="alt"><RequestSection type="repair" config={repairForm} title="Start a repair request" /></div>
    </>
  );
}

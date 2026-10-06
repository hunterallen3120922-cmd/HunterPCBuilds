import { useState } from "react";
import PageHero from "../components/PageHero";
import SectionHead from "../components/SectionHead";
import Reveal from "../components/Reveal";
import Icon, { IconTile } from "../components/Icon";
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
        title={<>Slow, broken or overheating? <em className="grad-text">Let's fix it.</em></>}
        actions={<button type="button" className="btn" onClick={() => document.getElementById("request")?.scrollIntoView()}>Start a repair request <Icon name="arrow" className="h-4 w-4" /></button>}>
        Repairs and upgrades with a firm quote before I start. Simple fixes often happen same-day.
      </PageHero>

      <section className="section">
        <div className="wrap">
          <SectionHead eyebrow="Pricing" title="Services & prices" sub="Starting prices. Tap a service to request it. You always get a firm quote before I start." />
          <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] gap-4 p-0">
            {repairServices.map((s, i) => (
              <li key={s.name}>
                <Reveal delay={(i % 2) * 60} className="h-full">
                  <button type="button" onClick={() => setSelected(s)} aria-label={`Request ${s.name}`}
                    className="card lift group flex h-full w-full cursor-pointer items-center gap-4 p-5 text-left text-ink hover:border-accent/50">
                    <IconTile name={s.icon} />
                    <span className="min-w-0 flex-1"><b className="block font-medium">{s.name}</b><small className="block text-[.85rem] text-muted">{s.description}</small></span>
                    <span className="text-right">
                      <span className="block whitespace-nowrap font-mono text-[.95rem] text-accent">{s.price}{s.plusParts && <span className="text-muted"> + parts</span>}</span>
                      <small className="mt-1 inline-flex items-center gap-1 text-[.75rem] text-muted transition-colors group-hover:text-accent">Request <Icon name="arrow" className="h-3 w-3" /></small>
                    </span>
                  </button>
                </Reveal>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[.9rem] text-muted">{repairNote} {site.paymentMethods.join(", ")} accepted.</p>
        </div>
      </section>

      <section className="section alt">
        <div className="wrap grid gap-5 md:grid-cols-2">
          <div className="card p-7">
            <p className="eyebrow mb-3">Devices</p>
            <h2 className="text-2xl">Devices I work on</h2>
            <ul className="mt-5 space-y-3 text-[.95rem]">
              {devicesServed.map((d) => <li key={d} className="flex gap-3"><Icon name="check" className="mt-[3px] h-4 w-4 shrink-0 text-accent" />{d}</li>)}
            </ul>
          </div>
          <div className="card border-accent2/30 p-7">
            <IconTile name="save" />
            <h2 className="mb-3 mt-5 text-2xl">Back up your data first</h2>
            <p className="text-[.95rem] text-muted">{backupNotice}</p>
          </div>
        </div>
      </section>

      <ServiceRequestDialog service={selected} onClose={() => setSelected(null)} />
      <RequestSection type="repair" config={repairForm} title="Start a repair request" />
    </>
  );
}

import PageHero from "../components/PageHero";
import SectionHead from "../components/SectionHead";
import Reveal from "../components/Reveal";
import Gallery from "../components/Gallery";
import RequestSection from "../components/RequestSection";
import { useSeo } from "../lib/seo";
import { buildForm } from "../forms/buildForm";
import { buildIncludes, buildProcess, buildTiers } from "../content/buildTiers";
import { gallery } from "../content/gallery";
import { site } from "../content/site";

export default function PcBuilds() {
  useSeo(`Custom PC Builds | ${site.name}`, "Custom gaming, school and workstation PC builds in York, PA. Free consultation, parts at cost, 30-day labor guarantee.");
  return (
    <>
      <PageHero tag="Custom PC builds"
        title={<>A PC built <em className="grad-text not-italic">for your budget.</em></>}
        actions={<button type="button" className="btn" onClick={() => document.getElementById("request")?.scrollIntoView()}>Start a build request</button>}>
        Tell me your budget and what you'll use it for. I plan the parts, build it, test it and hand it over ready to go.
      </PageHero>

      <section className="section">
        <div className="wrap">
          <SectionHead title="Build packages" sub="Starting points. Every build is customized, and you approve the parts list before I order anything." />
          <div className="grid gap-[18px] md:grid-cols-3">
            {buildTiers.map((t, i) => (
              <Reveal key={t.name} delay={i * 80}>
                <div className="card lift flex h-full flex-col">
                  <h3 className="text-xl font-bold">{t.name}</h3>
                  <p className="font-heading text-2xl font-bold text-accent">{t.budget}</p>
                  <p className="mb-3 text-[.95rem] text-muted">{t.bestFor}</p>
                  <ul className="mb-4 list-disc pl-5 text-[.92rem]">
                    {t.exampleSpecs.map((s) => <li key={s}>{s}</li>)}
                  </ul>
                  <p className="mt-auto border-t border-line pt-3 text-[.9rem] text-muted">Labor: <b className="text-ink">{t.laborPrice}</b> + parts at cost</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="wrap">
          <SectionHead title="Past builds" sub="Tap one to see the specs." />
          <Gallery items={gallery} />
        </div>
      </section>

      <section className="section">
        <div className="wrap grid gap-10 md:grid-cols-2">
          <div>
            <SectionHead title="What's included" sub="Covered by the build fee." />
            <ul className="space-y-3">
              {buildIncludes.map((x) => (
                <li key={x} className="flex gap-3"><span className="text-accent" aria-hidden>✓</span><span>{x}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <SectionHead title="The process" />
            <ol className="space-y-4">
              {buildProcess.map((p, i) => (
                <li key={p.title} className="flex gap-4">
                  <span className="eyebrow pt-[2px]">{String(i + 1).padStart(2, "0")}</span>
                  <span><b>{p.title}</b><span className="block text-[.95rem] text-muted">{p.text}</span></span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <div className="alt"><RequestSection type="build" config={buildForm} title="Start a build request" /></div>
    </>
  );
}

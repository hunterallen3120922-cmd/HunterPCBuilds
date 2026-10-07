import PcBuildHero from "../components/PcBuildHero";
import SectionHead from "../components/SectionHead";
import Reveal from "../components/Reveal";
import Gallery from "../components/Gallery";
import Icon from "../components/Icon";
import RequestSection from "../components/RequestSection";
import { useSeo } from "../lib/seo";
import { buildForm } from "../forms/buildForm";
import { buildIncludes, buildProcess, buildTiers } from "../content/buildTiers";
import { gallery } from "../content/gallery";
import { site } from "../content/site";

export default function PcBuilds() {
  useSeo(`Custom PC Builds | ${site.name}`, "Custom gaming, school and workstation PC builds. Free consultation, parts at cost, 30-day labor guarantee.");
  return (
    <>
      <PcBuildHero />

      <section className="section">
        <div className="wrap">
          <SectionHead eyebrow="Packages" title="Build packages" sub="Starting points. Every build is customized, and you approve the parts list before I order anything." />
          <div className="grid gap-5 md:grid-cols-3">
            {buildTiers.map((t, i) => (
              <Reveal key={t.name} delay={i * 80}>
                <div className="card lift flex h-full flex-col p-7">
                  <p className="eyebrow">{t.name}</p>
                  <p className="mb-1 mt-3 font-heading text-[2rem] leading-tight">{t.budget}</p>
                  <p className="mb-6 text-[.95rem] text-muted">{t.bestFor}</p>
                  <ul className="mb-6 space-y-2 text-[.92rem]">
                    {t.exampleSpecs.map((s) => (
                      <li key={s} className="flex gap-3"><Icon name="check" className="mt-[3px] h-4 w-4 shrink-0 text-accent" />{s}</li>
                    ))}
                  </ul>
                  <p className="mt-auto border-t border-line pt-4 text-[.88rem] text-muted">Labor <span className="font-mono text-ink">{t.laborPrice}</span> + parts at cost</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="wrap">
          <SectionHead eyebrow="Portfolio" title="Past builds" sub="Tap one to see the specs." />
          <Gallery items={gallery} />
        </div>
      </section>

      <section className="section">
        <div className="wrap grid gap-14 md:grid-cols-2">
          <div>
            <SectionHead eyebrow="Included" title="What's included" sub="Covered by the build fee." />
            <ul data-reveal-group="left" className="space-y-4">
              {buildIncludes.map((x) => (
                <li key={x} className="flex gap-3"><span className="icon-tile mt-[2px] h-6 w-6 rounded-full"><Icon name="check" className="h-3.5 w-3.5" /></span><span>{x}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <SectionHead eyebrow="Process" title="How a build goes" />
            <ol data-reveal-group="up" className="relative space-y-6 before:absolute before:bottom-2 before:left-[0.9375rem] before:top-2 before:w-px before:bg-line">
              {buildProcess.map((p, i) => (
                <li key={p.title} className="relative flex gap-5">
                  <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-card font-mono text-[.72rem] text-accent2">{i + 1}</span>
                  <span><b className="font-medium">{p.title}</b><span className="block text-[.95rem] text-muted">{p.text}</span></span>
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

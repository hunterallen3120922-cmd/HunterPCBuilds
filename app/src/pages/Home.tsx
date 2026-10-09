import { Link } from "react-router-dom";
import HomeHero from "../components/HomeHero";
import Carousel from "../components/Carousel";
import { Photo } from "../components/Gallery";
import SectionHead from "../components/SectionHead";
import Reveal from "../components/Reveal";
import FaqList from "../components/FaqList";
import Icon, { IconTile } from "../components/Icon";
import { useSeo } from "../lib/seo";
import { glance, howItWorks, site, trustPoints } from "../content/site";
import { gallery } from "../content/gallery";
import { toGalleryItem, useBuilds } from "../lib/useBuilds";
import type { GalleryItem } from "../types";
import { repairServices } from "../content/repairServices";
import { faq } from "../content/faq";
import { meetingMethods } from "../content/formOptions";

function GlanceCard() {
  return (
    <div className="card flex w-full flex-col p-7">
      <p className="eyebrow mb-1">At a glance</p>
      <h3 className="mb-4 text-[1.5rem]">The quick version</h3>
      <dl className="mt-auto">
        {glance.map((g) => (
          <div key={g.label} className="flex items-baseline justify-between gap-4 border-t border-line py-3">
            <dt className="whitespace-nowrap text-[.9rem] text-muted">{g.label}</dt>
            <dd className="text-right font-mono text-[.78rem] text-ink sm:text-[.82rem]">{g.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Builds and repairs, alternating, so the carousel stays varied. */
function featuredCards(featured: GalleryItem[]) {
  const builds = featured.map((g) => (
    <Link key={`b-${g.title}`} to="/pc-builds" className="card lift group flex w-full flex-col overflow-hidden p-0 no-underline">
      <Photo item={g} className="aspect-[4/3] w-full" />
      <div className="flex flex-1 flex-col p-5">
        <p className="eyebrow mb-2">Build</p>
        <h3 className="text-[1.25rem] text-ink">{g.title}</h3>
        <p className="mb-4 mt-2 text-[.88rem] text-muted">{g.specs[0]}</p>
        <p className="mt-auto flex items-center justify-between border-t border-line pt-4 text-[.85rem]">
          <span className="font-mono text-accent">{g.price ?? "Custom quote"}</span>
          <span className="inline-flex items-center gap-1 text-muted transition-colors group-hover:text-accent">See builds <Icon name="arrow" className="h-3.5 w-3.5" /></span>
        </p>
      </div>
    </Link>
  ));
  const repairs = repairServices.filter((r) => r.featured).map((r) => (
    <Link key={`r-${r.name}`} to="/tech-repair" className="card lift group flex w-full flex-col p-7 no-underline">
      <IconTile name={r.icon} size="h-12 w-12" />
      <p className="eyebrow mb-2 mt-6">Repair</p>
      <h3 className="text-[1.45rem] text-ink">{r.name}</h3>
      <p className="mt-2 text-[.92rem] text-muted">{r.description}</p>
      <p className="mt-auto flex items-center justify-between border-t border-line pt-4 text-[.85rem]">
        <span className="font-mono text-accent">{r.price}{r.plusParts && <span className="text-muted"> + parts</span>}</span>
        <span className="inline-flex items-center gap-1 text-muted transition-colors group-hover:text-accent">Request <Icon name="arrow" className="h-3.5 w-3.5" /></span>
      </p>
    </Link>
  ));
  const mixed = [];
  for (let i = 0; i < Math.max(builds.length, repairs.length); i++) {
    if (builds[i]) mixed.push(builds[i]);
    if (repairs[i]) mixed.push(repairs[i]);
  }
  return mixed;
}

export default function Home() {
  // Carousel builds: the ones marked "Home carousel" in the admin portal if there are any, otherwise content/gallery.ts
  const builds = useBuilds();
  const fromPortal = builds?.filter((b) => b.featured && b.photos.length > 0) ?? [];
  const featured = fromPortal.length > 0 ? fromPortal.map(toGalleryItem) : gallery.filter((g) => g.featured);
  useSeo(site.fullName, "Student-run computer repair and custom PC builds. Submit a request and get a quote fast.");
  return (
    <>
      <HomeHero />

      <section id="paths" className="section scroll-mt-20">
        <div className="wrap">
          <SectionHead eyebrow="Get started" title="What do you need?" />
          <div className="grid gap-5 md:grid-cols-2">
            {[
              { to: "/pc-builds", icon: "chip", title: "Build me a PC", text: "Custom builds for your budget: gaming, school, editing and more. I plan the parts, build it and test it.", cta: "See builds & request" },
              { to: "/tech-repair", icon: "wrench", title: "Fix my device", text: "Slow, broken or overheating? Repairs and upgrades with a firm quote before I start.", cta: "See prices & request" },
            ].map((p, i) => (
              <Reveal key={p.to} delay={i * 100} as={i ? "right" : "left"}>
                <Link to={p.to} className="card lift group block h-full p-8 no-underline">
                  <IconTile name={p.icon} size="h-12 w-12" />
                  <h3 className="mb-2 mt-6 text-[1.7rem] text-ink">{p.title}</h3>
                  <p className="mb-6 max-w-[44ch] text-muted">{p.text}</p>
                  <span className="inline-flex items-center gap-2 text-[.92rem] font-medium text-accent">{p.cta} <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="wrap">
          <SectionHead eyebrow="Process" title="How it works" sub={`Three steps from "it's broken" to "it works."`} />
          <div className="grid gap-5 md:grid-cols-3">
            {howItWorks.map((s, i) => (
              <Reveal key={s.title} delay={i * 80}>
                <div className="h-full border-t border-line pt-6">
                  <div className="font-mono text-[.8rem] text-accent2">{String(i + 1).padStart(2, "0")}</div>
                  <h3 className="mb-2 mt-3 text-[1.35rem]">{s.title}</h3>
                  <p className="text-[.95rem] text-muted">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" >
        <div className="wrap">
          <SectionHead center eyebrow="Featured" title="Recent work & the basics" sub="A few builds, popular repairs, and the quick facts." />
        </div>
        <div data-reveal="zoom"><Carousel key={featured.length} label="Featured builds and repairs" items={[<GlanceCard key="glance" />, ...featuredCards(featured)]} /></div>
      </section>

      <section className="section alt">
        <div className="wrap">
          <SectionHead eyebrow="Why me" title="Why people pick me" />
          <div className="grid overflow-hidden rounded-card border border-line bg-card sm:grid-cols-2 lg:grid-cols-4">
            {trustPoints.map((t, i) => (
              <Reveal key={t.title} delay={i * 80} className="border-b border-line p-7 last:border-b-0 sm:odd:border-r lg:border-b-0 lg:border-r lg:last:border-r-0">
                <IconTile name={t.icon} />
                <h3 className="mb-2 mt-5 text-[1.15rem]">{t.title}</h3>
                <p className="text-[.92rem] text-muted">{t.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap grid items-center gap-12 lg:grid-cols-2">
          <div data-reveal-group="blur">
            <p className="eyebrow mb-3">Local</p>
            <h2 className="text-[clamp(1.8rem,3.6vw,2.6rem)]">{site.localTitle}</h2>
            <p className="mt-4 max-w-[52ch] text-muted">{site.localText}</p>
            {site.serviceArea && <p className="mt-4 text-[.9rem] text-muted">Serving {site.serviceArea}.</p>}
          </div>
          <ul data-reveal="right" className="divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
            {meetingMethods.map((m) => (
              <li key={m.value} className="flex items-center gap-4 p-5">
                <IconTile name={m.icon ?? "pin"} />
                <div><p className="font-medium">{m.label ?? m.value}</p><p className="text-[.9rem] text-muted">{m.description}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section alt">
        <div className="wrap max-w-[51.25rem]">
          <SectionHead eyebrow="FAQ" title="Quick answers" />
          <FaqList items={faq.filter((f) => f.preview)} />
          <p data-reveal="up" className="mt-6"><Link to="/faq" className="inline-flex items-center gap-2 font-medium">All FAQ & terms <Icon name="arrow" className="h-4 w-4" /></Link></p>
        </div>
      </section>

      <section className="section theme-dark relative overflow-hidden bg-bg text-center text-ink">
        <div className="hero-grid pointer-events-none absolute inset-0" aria-hidden />
        <div data-reveal-group="zoom" className="wrap relative">
          <h2 className="text-[clamp(2rem,4.4vw,3.2rem)]">Ready when <em className="grad-text">you are.</em></h2>
          <p className="mx-auto mb-8 mt-4 max-w-[48ch] text-muted">{site.responseTime} Tell me what you need.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/pc-builds" className="btn">Build me a PC</Link>
            <Link to="/tech-repair" className="btn btn-ghost">Fix my device</Link>
          </div>
        </div>
      </section>
    </>
  );
}

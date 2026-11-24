import { Link } from "react-router-dom";
import HomeHero from "../components/HomeHero";
import Carousel from "../components/Carousel";
import { Photo } from "../components/Gallery";
import SectionHead from "../components/SectionHead";
import Reveal from "../components/Reveal";
import FaqList from "../components/FaqList";
import ReviewsRotator, { useReviews } from "../components/ReviewsSection";
import Icon, { IconTile } from "../components/Icon";
import { useSeo } from "../lib/seo";
import { glance, howItWorks, site, trustPoints } from "../content/site";
import { gallery } from "../content/gallery";
import { toGalleryItem, useBuilds } from "../lib/useBuilds";
import type { GalleryItem } from "../types";
import { repairServices } from "../content/repairServices";
import { faq } from "../content/faq";

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
  // Reviews from the admin portal; the rotating reviews section only shows once there are some
  const reviews = useReviews();
  useSeo(site.fullName, "Student-run computer repair and custom PC builds. Submit a request and get a quote fast.");
  return (
    <>
      <HomeHero />

      <section id="paths" className="section scroll-mt-20">
        <div className="wrap">
          <SectionHead eyebrow="Get started" title="What do you need?" />
          <div className="grid gap-5 md:grid-cols-2">
            {[
              { to: "/pc-builds", icon: "desktop", tag: "Custom builds", title: "Build me a PC", text: "Custom builds for your budget: gaming, school, editing and more. I plan the parts, build it and test it.", cta: "See builds & request" },
              { to: "/tech-repair", icon: "wrench", tag: "Repairs & upgrades", title: "Fix my device", text: "Slow, broken or overheating? Repairs and upgrades with a firm quote before I start.", cta: "See prices & request" },
            ].map((p, i) => (
              <Reveal key={p.to} delay={i * 100} as={i ? "right" : "left"}>
                <Link to={p.to} className="card lift group relative block h-full overflow-hidden p-8 no-underline sm:p-10">
                  {/* large faint icon as artwork */}
                  <Icon name={p.icon} className="pointer-events-none absolute -right-8 -top-8 h-56 w-56 text-accent opacity-[.07] transition-all duration-700 ease-out group-hover:-translate-x-2 group-hover:translate-y-2 group-hover:opacity-[.14]" />
                  <p className="eyebrow relative">{p.tag}</p>
                  <h3 className="relative mb-3 mt-16 text-[clamp(1.8rem,3vw,2.4rem)] tracking-[-0.03em] text-ink">{p.title}</h3>
                  <p className="relative mb-8 max-w-[42ch] text-muted">{p.text}</p>
                  <span className="relative inline-flex items-center gap-3 text-[.95rem] font-medium text-ink">
                    {p.cta}
                    <span className="grid h-9 w-9 place-items-center rounded-full border border-line text-accent transition-all duration-500 group-hover:translate-x-1 group-hover:border-accent group-hover:bg-accent group-hover:text-onaccent"><Icon name="arrow" className="h-4 w-4" /></span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="wrap">
          <SectionHead eyebrow="Process" title="How it works" sub={`Three steps from "it's broken" to "it works."`} />
          <div className="relative grid gap-10 md:grid-cols-3 md:gap-8">
            {/* the line the steps sit on */}
            <div className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-accent/50 via-line to-transparent md:block" aria-hidden />
            {howItWorks.map((s, i) => (
              <Reveal key={s.title} delay={i * 120}>
                <div className="relative">
                  <div className="relative grid h-12 w-12 place-items-center rounded-full border border-accent/40 bg-bg font-mono text-[.85rem] text-accent shadow-[0_0_0_6px_var(--bg2)]">{String(i + 1).padStart(2, "0")}</div>
                  <h3 className="mb-2 mt-6 text-[1.4rem]">{s.title}</h3>
                  <p className="max-w-[34ch] text-muted">{s.text}</p>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trustPoints.map((t, i) => (
              <Reveal key={t.title} delay={i * 90} className="h-full">
                <div className="card lift h-full p-7">
                  <IconTile name={t.icon} size="h-11 w-11" />
                  <h3 className="mb-2 mt-6 text-[1.15rem]">{t.title}</h3>
                  <p className="text-[.93rem] text-muted">{t.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {reviews && (
        <section className="section">
          <div className="wrap max-w-[60rem]"><ReviewsRotator data={reviews} /></div>
        </section>
      )}

      <section className={`section ${reviews ? "alt" : ""}`}>
        <div className="wrap max-w-[51.25rem]">
          <SectionHead eyebrow="FAQ" title="Quick answers" />
          <FaqList items={faq.filter((f) => f.preview)} />
          <p data-reveal="up" className="mt-6"><Link to="/faq" className="inline-flex items-center gap-2 font-medium">All FAQ & terms <Icon name="arrow" className="h-4 w-4" /></Link></p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div data-reveal="zoom" className="cta-panel relative overflow-hidden rounded-[1.75rem] border border-line px-6 py-16 text-center sm:py-24">
            <div className="hero-grid pointer-events-none absolute inset-0 !opacity-40" aria-hidden />
            <div className="relative">
              <p className="pill mb-7"><span className="pill-dot" aria-hidden />{site.responseTime}</p>
              <h2 className="text-[clamp(2.3rem,5.4vw,4rem)]">Ready when <em className="grad-text">you are.</em></h2>
              <p className="mx-auto mb-9 mt-5 max-w-[44ch] text-[1.05rem] text-muted">Tell me what you need. You get a firm quote before any work starts.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link to="/pc-builds" className="btn !px-8 !py-3.5">Build me a PC <Icon name="arrow" className="h-4 w-4" /></Link>
                <Link to="/tech-repair" className="btn btn-ghost !px-8 !py-3.5">Fix my device</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

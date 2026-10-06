import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import SectionHead from "../components/SectionHead";
import Reveal from "../components/Reveal";
import Gallery from "../components/Gallery";
import FaqList from "../components/FaqList";
import Icon, { IconTile } from "../components/Icon";
import { useSeo } from "../lib/seo";
import { glance, howItWorks, site, trustPoints } from "../content/site";
import { gallery } from "../content/gallery";
import { faq } from "../content/faq";
import { meetingMethods } from "../content/formOptions";

function Glance() {
  return (
    <aside className="rounded-card border border-line bg-card/80 p-6 backdrop-blur" aria-label="At a glance">
      <p className="eyebrow mb-4">At a glance</p>
      <dl>
        {glance.map((g) => (
          <div key={g.label} className="flex items-baseline justify-between gap-6 border-b border-line py-3 last:border-0">
            <dt className="text-[.9rem] text-muted">{g.label}</dt>
            <dd className="text-right font-mono text-[.85rem] text-ink">{g.value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

export default function Home() {
  useSeo(`${site.fullName} | York, PA`, "Student-run computer repair and custom PC builds in York, PA. Submit a request and get a quote fast.");
  return (
    <>
      <PageHero tag={site.localTag} aside={<Glance />}
        title={<>Busted laptop? Dream PC? <em className="grad-text">Let's fix it, or build it.</em></>}
        actions={<>
          <Link to="/pc-builds" className="btn">Build me a PC <Icon name="arrow" className="h-4 w-4" /></Link>
          <Link to="/tech-repair" className="btn btn-ghost">Fix my device</Link>
        </>}>
        Repairs, upgrades and custom PC builds for college students and the York area. Fair prices, cash-friendly, and I'll explain everything in plain English.
      </PageHero>

      <section id="paths" className="section scroll-mt-16">
        <div className="wrap">
          <SectionHead eyebrow="Get started" title="What do you need?" />
          <div className="grid gap-5 md:grid-cols-2">
            {[
              { to: "/pc-builds", icon: "chip", title: "Build me a PC", text: "Custom builds for your budget: gaming, school, editing and more. I plan the parts, build it and test it.", cta: "See builds & request" },
              { to: "/tech-repair", icon: "wrench", title: "Fix my device", text: "Slow, broken or overheating? Repairs and upgrades with a firm quote before I start.", cta: "See prices & request" },
            ].map((p, i) => (
              <Reveal key={p.to} delay={i * 100}>
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

      {gallery.some((g) => g.featured) && (
        <section className="section">
          <div className="wrap">
            <SectionHead eyebrow="Portfolio" title="Recent builds" sub="A few PCs I've put together." />
            <Gallery items={gallery.filter((g) => g.featured).slice(0, 3)} />
            <p className="mt-8"><Link to="/pc-builds" className="inline-flex items-center gap-2 font-medium">See all builds <Icon name="arrow" className="h-4 w-4" /></Link></p>
          </div>
        </section>
      )}

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
          <div>
            <p className="eyebrow mb-3">Local</p>
            <h2 className="text-[clamp(1.8rem,3.6vw,2.6rem)]">{site.localTitle}</h2>
            <p className="mt-4 max-w-[52ch] text-muted">{site.localText}</p>
            <p className="mt-4 text-[.9rem] text-muted">Serving {site.serviceArea}.</p>
          </div>
          <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
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
        <div className="wrap max-w-[820px]">
          <SectionHead eyebrow="FAQ" title="Quick answers" />
          <FaqList items={faq.filter((f) => f.preview)} />
          <p className="mt-6"><Link to="/faq" className="inline-flex items-center gap-2 font-medium">All FAQ & terms <Icon name="arrow" className="h-4 w-4" /></Link></p>
        </div>
      </section>

      <section className="section relative overflow-hidden text-center">
        <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />
        <div className="wrap relative">
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

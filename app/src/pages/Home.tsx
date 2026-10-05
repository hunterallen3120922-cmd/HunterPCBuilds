import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import SectionHead from "../components/SectionHead";
import Reveal from "../components/Reveal";
import Gallery from "../components/Gallery";
import FaqList from "../components/FaqList";
import { useSeo } from "../lib/seo";
import { howItWorks, trustPoints, site } from "../content/site";
import { gallery } from "../content/gallery";
import { faq } from "../content/faq";

export default function Home() {
  useSeo(`${site.fullName} | York, PA`, "Student-run computer repair and custom PC builds in York, PA. Submit a request and get a quote fast.");
  return (
    <>
      <PageHero tag="Student-run · York, PA"
        title={<>Busted laptop? Dream PC? <em className="grad-text not-italic">Let's fix it, or build it.</em></>}>
        Repairs, upgrades and custom PC builds for college students and the York area. Fair prices, cash-friendly, and I'll explain everything in plain English.
      </PageHero>

      <section id="paths" className="scroll-mt-16 pb-[70px]">
        <div className="wrap grid gap-[18px] md:grid-cols-2">
          <Reveal><Link to="/pc-builds" className="card lift block no-underline">
            <div className="text-3xl" aria-hidden>🖥️</div>
            <h2 className="mt-2 text-2xl font-bold text-ink">Build me a PC</h2>
            <p className="my-2 text-muted">Custom builds for your budget: gaming, school, editing and more.</p>
            <span className="btn mt-2">See builds & request →</span>
          </Link></Reveal>
          <Reveal delay={100}><Link to="/tech-repair" className="card lift block no-underline">
            <div className="text-3xl" aria-hidden>🔧</div>
            <h2 className="mt-2 text-2xl font-bold text-ink">Fix my device</h2>
            <p className="my-2 text-muted">Slow, broken or overheating? Repairs and upgrades with firm quotes.</p>
            <span className="btn btn-ghost mt-2">See prices & request →</span>
          </Link></Reveal>
        </div>
      </section>

      <section className="section alt">
        <div className="wrap">
          <SectionHead title="How it works" sub={`Three steps from "it's broken" to "it works."`} />
          <div className="grid gap-[18px] md:grid-cols-3">
            {howItWorks.map((s, i) => (
              <Reveal key={s.title} delay={i * 80}>
                <div className="card h-full">
                  <div className="eyebrow">{String(i + 1).padStart(2, "0")}</div>
                  <h3 className="mb-[6px] mt-2 text-[1.2rem] font-bold">{s.title}</h3>
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
            <SectionHead title="Recent builds" sub="A few PCs I've put together." />
            <Gallery items={gallery.filter((g) => g.featured).slice(0, 3)} />
            <p className="mt-6"><Link to="/pc-builds">See all builds →</Link></p>
          </div>
        </section>
      )}

      <section className="section alt">
        <div className="wrap">
          <SectionHead title="Why people pick me" />
          <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
            {trustPoints.map((t, i) => (
              <Reveal key={t.title} delay={i * 80}>
                <div className="card h-full">
                  <div className="text-2xl" aria-hidden>{t.icon}</div>
                  <h3 className="mb-1 mt-2 font-bold">{t.title}</h3>
                  <p className="text-[.92rem] text-muted">{t.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap max-w-[800px]">
          <SectionHead title="Quick answers" />
          <FaqList items={faq.filter((f) => f.preview)} />
          <p className="mt-4"><Link to="/faq">All FAQ & terms →</Link></p>
        </div>
      </section>

      <section className="section alt text-center">
        <div className="wrap">
          <h2 className="text-[clamp(1.7rem,3.5vw,2.3rem)] font-bold">Ready when you are</h2>
          <p className="mx-auto mb-7 mt-2 max-w-[520px] text-muted">{site.responseTime} Tell me what you need.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/pc-builds" className="btn">Build me a PC</Link>
            <Link to="/tech-repair" className="btn btn-ghost">Fix my device</Link>
          </div>
        </div>
      </section>
    </>
  );
}

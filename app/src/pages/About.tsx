import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import Icon from "../components/Icon";
import { useSeo } from "../lib/seo";
import { about } from "../content/about";
import { site } from "../content/site";

export default function About() {
  useSeo(`About | ${site.name}`, "Meet the student behind HunterPCBuilds: computer repair and custom PC builds.");
  return (
    <>
      <PageHero tag="About me" title={<>{about.title} <em className="grad-text">{about.titleAccent}</em></>}>
        {about.intro}
      </PageHero>
      <section className="section">
        <div className="wrap grid items-start gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div className="max-w-[62ch] space-y-5 text-[1.05rem] text-muted">
            {about.story.map((p) => <p key={p} data-reveal="up">{p}</p>)}
            <div data-reveal="up" className="flex flex-wrap gap-3 pt-4">
              <Link to="/pc-builds" className="btn">Build me a PC <Icon name="arrow" className="h-4 w-4" /></Link>
              <Link to="/tech-repair" className="btn btn-ghost">Fix my device</Link>
            </div>
          </div>
          <dl data-reveal="right" className="card p-7">
            <p className="eyebrow mb-2">Quick facts</p>
            {about.facts.map((f) => (
              <div key={f.label} className="flex items-baseline justify-between gap-4 border-t border-line py-3 first-of-type:border-t-0">
                <dt className="text-[.9rem] text-muted">{f.label}</dt>
                <dd className="text-right font-mono text-[.85rem] text-ink">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}

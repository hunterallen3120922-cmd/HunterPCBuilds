import PageHero from "../components/PageHero";
import { useSeo } from "../lib/seo";
import { privacy, privacyUpdated } from "../content/privacy";
import { site } from "../content/site";

export default function Privacy() {
  useSeo(`Privacy | ${site.name}`, "How HunterPCBuilds collects and uses the information you send in a request.");
  return (
    <>
      <PageHero tag="Privacy" title={<>Your info, <em className="grad-text">kept simple.</em></>}>
        What I collect, why, and who sees it. Last updated {privacyUpdated}.
      </PageHero>
      <section className="section">
        <div className="wrap max-w-[820px] space-y-8">
          {privacy.map((p) => (
            <div key={p.heading}>
              <h2 className="mb-2 text-2xl">{p.heading}</h2>
              <p className="text-muted">{p.text}</p>
            </div>
          ))}
          <p className="text-muted">Questions or deletion requests: <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a></p>
        </div>
      </section>
    </>
  );
}

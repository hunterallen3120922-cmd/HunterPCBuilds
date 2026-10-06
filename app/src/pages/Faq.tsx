import PageHero from "../components/PageHero";
import FaqList from "../components/FaqList";
import { useSeo } from "../lib/seo";
import { faq } from "../content/faq";
import { site } from "../content/site";

export default function Faq() {
  useSeo(`FAQ & Terms | ${site.name}`, "Answers about payment, warranty, timing and data, plus terms of service for HunterPCBuilds Tech Repair.");
  return (
    <>
      <PageHero tag="FAQ & terms" title={<>Questions? <em className="grad-text">Answered.</em></>}>
        Payment, timing, warranty and the fine print, in plain English.
      </PageHero>
      <section className="section">
        <div className="wrap max-w-[820px]"><FaqList items={faq} /></div>
      </section>
    </>
  );
}

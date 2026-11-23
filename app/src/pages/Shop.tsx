import { useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import Icon from "../components/Icon";
import { useSeo } from "../lib/seo";
import { site } from "../content/site";
import FormDialog from "../components/FormDialog";
import { notifyForm, shopItemForm } from "../forms/shopForms";
import type { FormConfig } from "../components/form/types";
import { listings, shopTabs, type Listing, type ShopTab } from "../content/shop";

const statusStyle = {
  available: { label: "Available", cls: "text-accent border-accent/40 bg-accent/10" },
  reserved: { label: "Reserved", cls: "text-accent2 border-accent2/40 bg-accent2/10" },
  sold: { label: "Sold", cls: "text-muted border-line bg-bg/60" },
};

function ListingCard({ l, onOpen }: { l: Listing; onOpen: (f: FormConfig) => void }) {
  const label = `${l.name} · $${l.price} (${l.condition})`;
  const s = statusStyle[l.status];
  const sold = l.status === "sold";
  return (
    <article className={`card lift flex h-full flex-col overflow-hidden !p-0 ${sold ? "opacity-60" : ""}`}>
      <div className="relative aspect-[4/3] overflow-hidden border-b border-line bg-bg2">
        {l.photo
          ? <img src={`${import.meta.env.BASE_URL}photos/${l.photo}`} alt="" className="h-full w-full object-cover" />
          : <div className="hero-grid grid h-full place-items-center text-accent/70"><Icon name={l.icon ?? "box"} className="h-16 w-16" /></div>}
        <span className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 font-mono text-[.65rem] uppercase tracking-wider bg-bg/70 backdrop-blur ${s.cls}`}>{s.label}</span>
        {l.note && <span className="absolute bottom-3 left-3 rounded-full border border-line bg-bg/70 px-2.5 py-1 text-[.72rem] text-ink backdrop-blur">{l.note}</span>}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg">{l.name}</h3>
          <p className={`font-mono text-[1.15rem] ${sold ? "text-muted line-through" : "text-accent"}`}>${l.price}</p>
        </div>
        <p className="mt-1 text-[.8rem] text-accent2">{l.condition}</p>
        <ul className="mb-5 mt-4 space-y-1.5 text-[.88rem] text-muted">
          {l.specs.map((x) => <li key={x} className="flex gap-2"><Icon name="check" className="mt-[3px] h-3.5 w-3.5 shrink-0 text-accent" />{x}</li>)}
        </ul>
        <div className="mt-auto flex gap-2">
          <button type="button" disabled={l.status !== "available"} onClick={() => onOpen(shopItemForm(label, "reserve"))} className={`btn flex-1 !px-4 !py-2.5 !text-[.88rem] ${l.status !== "available" ? "btn-ghost" : ""}`}>
            {l.status === "available" ? "Reserve" : s.label}
          </button>
          <button type="button" onClick={() => onOpen(shopItemForm(label, "ask"))} className="btn btn-ghost !px-4 !py-2.5 !text-[.88rem]" aria-label={`Ask about ${l.name}`}><Icon name="chat" className="h-4 w-4" /> Ask</button>
        </div>
      </div>
    </article>
  );
}

export default function Shop() {
  useSeo(`Shop | ${site.name}`, "Prebuilt PCs, refurbished laptops and tested used parts, checked by hand.");
  const initial = (new URLSearchParams(window.location.hash.split("?")[1]).get("tab") as ShopTab) || "pcs";
  const [tab, setTab] = useState<ShopTab>(initial);
  const [hideSold, setHideSold] = useState(false);
  const [form, setForm] = useState<FormConfig | null>(null);
  const t = shopTabs.find((x) => x.id === tab)!;
  const items = listings.filter((l) => l.tab === tab && !(hideSold && l.status === "sold"));

  return (
    <>
      <PageHero tag="Shop" title={<>Ready to go, <span className="grad-text">checked by hand.</span></>}
        actions={<Link to="/sell" className="btn btn-ghost"><Icon name="tag" className="h-4 w-4" /> Trading in? Your credit works here</Link>}>
        Prebuilt PCs, refurbished laptops and tested used parts. Reserve one and we'll set up a time to see it and pay in person. {site.paymentMethods.join(" or ")}.
      </PageHero>

      <section className="section !pt-4">
        <div className="wrap">
          <div className="sticky top-20 z-10 -mx-2 mb-8 flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] px-2 py-2">
            <div role="tablist" className="flex w-full gap-1 overflow-x-auto rounded-full border border-line bg-bg/80 p-1 backdrop-blur-xl sm:w-auto">
              {shopTabs.map((x) => (
                <button key={x.id} role="tab" type="button" aria-selected={tab === x.id} onClick={() => setTab(x.id)}
                  className={`inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-[.88rem] transition-colors ${tab === x.id ? "bg-accent text-onaccent" : "text-muted hover:text-ink"}`}>
                  <Icon name={x.icon} className="h-4 w-4" />{x.label}
                  <span className={`font-mono text-[.7rem] ${tab === x.id ? "text-onaccent/70" : "text-muted"}`}>{listings.filter((l) => l.tab === x.id && l.status !== "sold").length}</span>
                </button>
              ))}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-[.85rem] text-muted">
              <input type="checkbox" checked={hideSold} onChange={(e) => setHideSold(e.target.checked)} className="accent-[var(--accent)]" /> Hide sold
            </label>
          </div>

          <p className="mb-6 max-w-[60ch] text-muted">{t.blurb}</p>
          {items.length === 0 && (
            <div className="card grid place-items-center gap-3 px-6 py-14 text-center">
              <span className="icon-tile h-14 w-14"><Icon name={t.icon} className="h-7 w-7" /></span>
              <h3 className="text-xl">Nothing here right now</h3>
              <p className="max-w-[44ch] text-[.95rem] text-muted">New {t.label.toLowerCase()} show up as I finish them. Tell me what you want and I'll text you first.</p>
              <button type="button" onClick={() => setForm(notifyForm)} className="btn mt-2">Get notified <Icon name="arrow" className="h-4 w-4" /></button>
            </div>
          )}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((l) => <ListingCard key={l.name} l={l} onOpen={setForm} />)}
          </div>

          <div className="card mt-12 flex flex-col items-start justify-between gap-5 p-7 sm:flex-row sm:items-center">
            <div>
              <p className="eyebrow mb-2">Don't see it?</p>
              <h2 className="text-2xl">Tell me what you're after</h2>
              <p className="mt-2 text-[.95rem] text-muted">New stock comes in from trade-ins and repairs all the time. I'll text you when something fits.</p>
            </div>
            <button type="button" onClick={() => setForm(notifyForm)} className="btn shrink-0">Get notified <Icon name="arrow" className="h-4 w-4" /></button>
          </div>
        </div>
      </section>

      <FormDialog config={form} onClose={() => setForm(null)} />
    </>
  );
}

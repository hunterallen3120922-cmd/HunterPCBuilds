import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import PageHero from "../components/PageHero";
import SectionHead from "../components/SectionHead";
import Icon, { IconTile } from "../components/Icon";
import { useSeo } from "../lib/seo";
import { site } from "../content/site";
import FormDialog from "../components/FormDialog";
import { notifyForm, printRequestForm, shopItemForm } from "../forms/shopForms";
import type { FormConfig } from "../components/form/types";
import { submitPrintRequest } from "../lib/submit";
import { getPrintItems, photoUrl, supabaseReady } from "../lib/supabase";
import type { Listing } from "../content/shop";
import {
  colors, details, fileOptions, ideas, materials, printEstimate, printSteps, sizes,
  type DetailId, type FileOptionId, type MaterialId, type SizeId,
} from "../content/prints";

const MAX_FILES = 5;
const MAX_MB = 25;
const ACCEPT = ".stl,.3mf,.obj,.step,.stp,.jpg,.jpeg,.png,.webp,.heic,.gif";
const ANY_COLOR = "Any color, you pick";

/** HashRouter owns the # in the address, so in-page jumps scroll by id instead of using href="#id". */
const scrollToId = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

/** Print Shop items and past prints from the admin portal's Shop tab. Empty until you add some. */
function usePrints(): Listing[] | null {
  const [list, setList] = useState<Listing[] | null>(supabaseReady ? null : []);
  useEffect(() => {
    if (!supabaseReady) return;
    let alive = true;
    getPrintItems()
      .then((rows) => alive && setList(rows.map((r) => ({
        tab: r.tab, name: r.name, price: Number(r.price), condition: r.condition ?? "", status: r.status, specs: r.specs,
        note: r.note ?? undefined, photo: r.photos[0] ? photoUrl(r.photos[0]) : undefined, colors: r.colors ?? [], icon: "printer",
      }))))
      .catch((err) => { console.warn("No 3D prints loaded:", err); if (alive) setList([]); });
    return () => { alive = false; };
  }, []);
  return list;
}

const swatch = (name: string) => colors.find((c) => c.name.toLowerCase() === name.toLowerCase())?.hex;

function Swatches({ names }: { names: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label={`Colors: ${names.join(", ")}`}>
      {names.slice(0, 8).map((n) => (
        <span key={n} title={n} className="h-4 w-4 rounded-full border border-line" style={{ background: swatch(n) ?? "conic-gradient(#e44,#fb3,#4c8,#38f,#a5f,#e44)" }} />
      ))}
      {names.length > 8 && <span className="text-[.75rem] text-muted">+{names.length - 8}</span>}
    </div>
  );
}

function PrintCard({ l, onOpen }: { l: Listing; onOpen: (f: FormConfig) => void }) {
  const label = `${l.name} · $${l.price}${l.condition ? ` (${l.condition})` : ""}`;
  const open = l.status === "available";
  return (
    <article className={`card lift flex h-full flex-col overflow-hidden !p-0 ${l.status === "sold" ? "opacity-60" : ""}`}>
      <div className="relative aspect-[4/3] overflow-hidden border-b border-line bg-bg2">
        {l.photo
          ? <img src={l.photo} loading="lazy" alt="" className="h-full w-full object-cover" />
          : <div className="hero-grid grid h-full place-items-center text-accent/70"><Icon name="printer" className="h-16 w-16" /></div>}
        {l.note && <span className="absolute bottom-3 left-3 rounded-full border border-line bg-bg/70 px-2.5 py-1 text-[.72rem] text-ink backdrop-blur">{l.note}</span>}
        {!open && <span className="absolute left-3 top-3 rounded-full border border-line bg-bg/70 px-2.5 py-1 font-mono text-[.65rem] uppercase tracking-wider text-muted backdrop-blur">{l.status === "sold" ? "Sold out" : "On hold"}</span>}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg">{l.name}</h3>
          <p className="font-mono text-[1.15rem] text-accent">${l.price}</p>
        </div>
        {l.condition && <p className="mt-1 text-[.8rem] text-accent2">{l.condition}</p>}
        {l.specs.length > 0 && (
          <ul className="mt-4 space-y-1.5 text-[.88rem] text-muted">
            {l.specs.map((x) => <li key={x} className="flex gap-2"><Icon name="check" className="mt-[3px] h-3.5 w-3.5 shrink-0 text-accent" />{x}</li>)}
          </ul>
        )}
        {l.colors && l.colors.length > 0 && <div className="mt-4"><Swatches names={l.colors} /></div>}
        <div className="mt-auto flex gap-2 pt-5">
          <button type="button" disabled={!open} onClick={() => onOpen(shopItemForm(label, "reserve", l.colors?.length ? l.colors : [ANY_COLOR]))}
            className={`btn flex-1 !px-4 !py-2.5 !text-[.88rem] ${open ? "" : "btn-ghost"}`}>{open ? "Order one" : l.status === "sold" ? "Sold out" : "On hold"}</button>
          <button type="button" onClick={() => onOpen(shopItemForm(label, "ask"))} className="btn btn-ghost !px-4 !py-2.5 !text-[.88rem]" aria-label={`Ask about ${l.name}`}><Icon name="chat" className="h-4 w-4" /> Ask</button>
        </div>
      </div>
    </article>
  );
}

const choice = (on: boolean) =>
  `cursor-pointer rounded-[.9rem] border text-left transition-colors ${on ? "border-accent bg-accent/10" : "border-line hover:border-accent/50"}`;

export default function Prints() {
  useSeo(`3D Prints | ${site.name}`, "Custom 3D prints and ready-made prints for your PC setup: GPU brackets, cable combs, stands and more, in PLA, PETG or TPU.");
  const all = usePrints();
  const shop = (all ?? []).filter((l) => l.tab === "prints");
  const gallery = (all ?? []).filter((l) => l.tab === "past_prints" && l.photo);
  const [form, setForm] = useState<FormConfig | null>(null);
  const [dialogKind, setDialogKind] = useState<"request" | "other">("other");

  // The custom request
  const [description, setDescription] = useState("");
  const [fileOpt, setFileOpt] = useState<FileOptionId>("file");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [size, setSize] = useState<SizeId>("medium");
  const [detail, setDetail] = useState<DetailId>("simple");
  const [material, setMaterial] = useState<MaterialId>("PLA");
  const [color, setColor] = useState<string>(ANY_COLOR);
  const [qty, setQty] = useState(1);
  const [missing, setMissing] = useState(false);
  const describeRef = useRef<HTMLTextAreaElement>(null);
  const [details_, setDetails] = useState<Record<string, unknown>>({});
  // The phone price bar only shows while you're on the custom request
  const [inCustom, setInCustom] = useState(false);
  useEffect(() => {
    const el = document.getElementById("custom");
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInCustom(e.isIntersecting), { rootMargin: "-30% 0px -30% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const est = useMemo(() => printEstimate(size, detail, material, fileOpt, qty), [size, detail, material, fileOpt, qty]);
  const sizeInfo = sizes.find((s) => s.id === size)!;
  const mat = materials.find((m) => m.id === material)!;

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    setFileError("");
    const next = [...files];
    for (const f of Array.from(list)) {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ACCEPT.split(",").includes(`.${ext}`)) { setFileError(`${f.name}: use a photo or an STL, 3MF, OBJ or STEP file.`); continue; }
      if (f.size > MAX_MB * 1024 * 1024) { setFileError(`${f.name} is over ${MAX_MB} MB. Send me a link to it in the notes instead.`); continue; }
      if (next.length >= MAX_FILES) { setFileError(`Up to ${MAX_FILES} files.`); break; }
      if (!next.some((x) => x.name === f.name && x.size === f.size)) next.push(f);
    }
    setFiles(next);
  };

  const send = () => {
    if (!description.trim()) { setMissing(true); describeRef.current?.focus(); return; }
    const d = details.find((x) => x.id === detail)!;
    const fo = fileOptions.find((x) => x.id === fileOpt)!;
    const summary = [
      description.trim().slice(0, 300),
      `${sizeInfo.label} · ${d.label} · ${material} · ${color}${qty > 1 ? ` · ×${qty}` : ""}`,
      fo.label,
      `Ballpark $${est[0]}–$${est[1]}`,
    ].join("\n");
    setDetails({ description: description.trim(), size: sizeInfo.label, detail: d.label, material, color, qty, has_file: fileOpt === "file", estimate: est });
    setDialogKind("request");
    setForm(printRequestForm(summary, files.map((f) => f.name)));
  };
  const openOther = (f: FormConfig) => { setDialogKind("other"); setForm(f); };

  const pickIdea = (i: (typeof ideas)[number]) => {
    setDescription(i.text);
    setSize(i.size);
    setMaterial(i.material);
    setMissing(false);
  };

  return (
    <>
      <PageHero tag="3D printing" title={<>Printed for <span className="grad-text">your setup.</span></>}
        actions={<>
          <button type="button" onClick={() => scrollToId("custom")} className="btn">Request a custom print <Icon name="arrow" className="h-4 w-4" /></button>
          <button type="button" onClick={() => scrollToId("print-shop")} className="btn btn-ghost">Browse the Print Shop</button>
        </>}>
        GPU brackets, cable combs, headphone stands, keycaps, or anything you can describe. Printed by me in PLA, PETG or TPU, picked up locally. Pay {site.paymentMethods.join(" or ")} when it's done.
      </PageHero>

      {/* Print Shop */}
      <section id="print-shop" className="section scroll-mt-20 !pt-4">
        <div className="wrap">
          <SectionHead eyebrow="Print Shop" title="Ready-made prints" />
          {all === null && <p className="text-muted">Loading…</p>}
          {all !== null && shop.length === 0 && (
            <div className="card grid place-items-center gap-3 px-6 py-14 text-center">
              <span className="icon-tile h-14 w-14"><Icon name="printer" className="h-7 w-7" /></span>
              <h3 className="text-xl">The Print Shop is warming up</h3>
              <p className="max-w-[46ch] text-[.95rem] text-muted">Ready-made prints show up here soon. Want something now? Ask for it below and I'll print it for you.</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => scrollToId("custom")} className="btn">Request a custom print <Icon name="arrow" className="h-4 w-4" /></button>
                <button type="button" onClick={() => openOther(notifyForm)} className="btn btn-ghost">Get notified</button>
              </div>
            </div>
          )}
          {shop.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {shop.map((l, i) => <PrintCard key={`${l.name}-${i}`} l={l} onOpen={openOther} />)}
            </div>
          )}
        </div>
      </section>

      {/* Custom request with a live ballpark */}
      <section id="custom" className="section alt scroll-mt-20">
        <div className="wrap">
          <SectionHead eyebrow="Custom prints" title="Tell me what to print" />
          <div className="grid items-start gap-6 lg:grid-cols-[1.35fr_1fr]">
            <div className="card p-6 sm:p-8">
              <p className="eyebrow mb-2">Step 1</p>
              <h3 className="text-2xl">What do you want printed?</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {ideas.map((i) => (
                  <button key={i.label} type="button" onClick={() => pickIdea(i)} aria-pressed={description === i.text}
                    className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[.82rem] transition-colors ${description === i.text ? "border-accent bg-accent/10 text-ink" : "border-line text-muted hover:text-ink"}`}>{i.label}</button>
                ))}
              </div>
              <label htmlFor="pr-desc" className="sr-only">Describe your print</label>
              <textarea id="pr-desc" ref={describeRef} className="input mt-3 min-h-[6.5rem]" maxLength={2000} value={description}
                aria-invalid={missing && !description.trim()} aria-describedby={missing && !description.trim() ? "pr-desc-err" : undefined}
                placeholder="Describe it: what it's for, rough size, anything it has to fit…"
                onChange={(e) => { setDescription(e.target.value); setMissing(false); }} />
              {missing && !description.trim() && <p id="pr-desc-err" className="mt-1.5 text-[.85rem] text-danger">Tell me what you'd like printed.</p>}

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {fileOptions.map((f) => (
                  <button key={f.id} type="button" onClick={() => setFileOpt(f.id)} aria-pressed={fileOpt === f.id} className={`${choice(fileOpt === f.id)} px-4 py-3`}>
                    <b className="block text-[.95rem] font-medium text-ink">{f.label}</b>
                    <small className="text-[.8rem] text-muted">{f.hint}{f.high > 0 ? ` · design +$${f.low}–$${f.high}` : ""}</small>
                  </button>
                ))}
              </div>
              <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-[.9rem] border border-dashed border-line px-4 py-4 text-[.88rem] text-muted transition-colors hover:border-accent hover:text-ink"
                onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}>
                <Icon name="upload" className="h-5 w-5 shrink-0 text-accent" />
                <span><b className="font-medium text-ink">{fileOpt === "file" ? "Add your STL or 3MF" : "Add a photo or sketch"}</b> (optional) · tap or drop here · up to {MAX_FILES} files, {MAX_MB} MB each</span>
                <input type="file" multiple accept={ACCEPT} className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
              </label>
              {files.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {files.map((f) => (
                    <li key={f.name + f.size} className="inline-flex items-center gap-2 rounded-full border border-line bg-bg/60 py-1 pl-3 pr-1 text-[.8rem]">
                      {f.name} <span className="font-mono text-[.7rem] text-muted">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                      <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((x) => x !== f))} className="rounded-full px-2 text-muted hover:text-danger">×</button>
                    </li>
                  ))}
                </ul>
              )}
              {fileError && <p className="mt-1.5 text-[.85rem] text-danger" role="alert">{fileError}</p>}

              <p className="eyebrow mb-2 mt-8">Step 2</p>
              <h3 className="text-2xl">How big, how detailed?</h3>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {sizes.map((s) => (
                  <button key={s.id} type="button" onClick={() => setSize(s.id)} aria-pressed={size === s.id} className={`${choice(size === s.id)} flex items-center gap-3 px-4 py-3`}>
                    <span className="grid h-10 w-10 shrink-0 place-items-center" aria-hidden>
                      <span className={`rounded-[4px] border-2 ${size === s.id ? "border-accent" : "border-muted"}`}
                        style={{ width: { small: 12, medium: 20, large: 30, xl: 40 }[s.id], height: { small: 12, medium: 20, large: 30, xl: 40 }[s.id] }} />
                    </span>
                    <span><b className="block text-[.95rem] font-medium text-ink">{s.label}</b><small className="block text-[.8rem] text-muted">{s.hint}</small><small className="block text-[.75rem] text-muted/80">e.g. {s.example}</small></span>
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {details.map((d) => (
                  <button key={d.id} type="button" onClick={() => setDetail(d.id)} aria-pressed={detail === d.id} className={`${choice(detail === d.id)} px-4 py-3`}>
                    <b className="block text-[.95rem] font-medium text-ink">{d.label}</b><small className="text-[.8rem] text-muted">{d.hint}</small>
                  </button>
                ))}
              </div>

              <p className="eyebrow mb-2 mt-8">Step 3</p>
              <h3 className="text-2xl">Material and color</h3>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {materials.map((m) => (
                  <button key={m.id} type="button" onClick={() => setMaterial(m.id)} aria-pressed={material === m.id} className={`${choice(material === m.id)} px-4 py-3`}>
                    <span className="flex items-center justify-between gap-2"><b className="font-mono text-[1rem] text-ink">{m.name}</b><small className="text-[.7rem] uppercase tracking-wider text-accent2">{m.tag}</small></span>
                    <small className="mt-1 block text-[.8rem] text-muted">{m.good.join(" · ")}</small>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[.82rem] text-muted">{mat.blurb} <button type="button" onClick={() => scrollToId("materials")} className="cursor-pointer text-accent underline-offset-2 hover:underline">Compare materials</button></p>

              <div className="mt-5 flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Color">
                {colors.map((c) => (
                  <button key={c.name} type="button" role="radio" aria-checked={color === c.name} title={c.name} aria-label={c.name} onClick={() => setColor(c.name)}
                    className={`h-9 w-9 cursor-pointer rounded-full border-2 transition-transform ${color === c.name ? "scale-110 border-accent" : "border-line hover:scale-105"}`}
                    style={{ background: c.hex, boxShadow: color === c.name ? "0 0 0 3px var(--bg)" : undefined }} />
                ))}
                <button type="button" role="radio" aria-checked={color === ANY_COLOR} onClick={() => setColor(ANY_COLOR)}
                  className={`cursor-pointer rounded-full border px-3.5 py-2 text-[.82rem] ${color === ANY_COLOR ? "border-accent bg-accent/10 text-ink" : "border-line text-muted hover:text-ink"}`}>You pick</button>
              </div>
              <p className="mt-2 text-[.8rem] text-muted">{color === ANY_COLOR ? "I'll pick a color that looks good." : color} · I'll confirm what's in stock. Need another color? Say so in the notes.</p>

              <div className="mt-6 flex items-center gap-4">
                <span className="text-[.9rem] text-muted">How many?</span>
                <div className="inline-flex items-center rounded-full border border-line">
                  <button type="button" aria-label="One fewer" disabled={qty <= 1} onClick={() => setQty(qty - 1)} className="cursor-pointer px-4 py-2 text-lg text-muted hover:text-ink disabled:opacity-30">−</button>
                  <span className="min-w-[2.5ch] text-center font-mono" aria-live="polite">{qty}</span>
                  <button type="button" aria-label="One more" disabled={qty >= 50} onClick={() => setQty(qty + 1)} className="cursor-pointer px-4 py-2 text-lg text-muted hover:text-ink disabled:opacity-30">+</button>
                </div>
              </div>
            </div>

            {/* Right: the live ballpark */}
            <div id="ballpark" className="scroll-mt-24 lg:sticky lg:top-24">
              <div className="card border-accent/40 p-6 sm:p-8">
                <p className="eyebrow">Ballpark price</p>
                <p className="mt-1 text-[.9rem] text-muted">{sizeInfo.label} · {details.find((d) => d.id === detail)!.label} · {material}{qty > 1 ? ` · ×${qty}` : ""}</p>
                <p className="mt-4 font-heading text-[clamp(2.4rem,5vw,3.2rem)] leading-none tracking-tight">${est[0]}<span className="text-muted">–</span>${est[1]}</p>
                <p className="mt-2 text-[.85rem] text-muted">{fileOpt === "design" ? "Includes designing it for you" : "If you send a ready-to-print file"}</p>
                <button type="button" onClick={send} className="btn mt-6 w-full">Send request <Icon name="arrow" className="h-4 w-4" /></button>
                <ul className="mt-5 space-y-2 text-[.82rem] text-muted">
                  <li className="flex gap-2"><Icon name="tag" className="mt-[2px] h-4 w-4 shrink-0 text-accent2" />I check the file and print time, then text you the real price. Nothing prints until you say yes.</li>
                  <li className="flex gap-2"><Icon name="clock" className="mt-[2px] h-4 w-4 shrink-0 text-accent2" />Most prints are ready in 2 to 5 days.</li>
                  <li className="flex gap-2"><Icon name="shield-check" className="mt-[2px] h-4 w-4 shrink-0 text-accent2" />Pay when you pick it up. {site.paymentMethods.join(" or ")}.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Materials */}
      <section id="materials" className="section scroll-mt-20">
        <div className="wrap">
          <SectionHead eyebrow="Materials" title="PLA, PETG or TPU?" />
          <div className="grid gap-5 md:grid-cols-3">
            {materials.map((m) => (
              <div key={m.id} className="card p-7">
                <div className="flex items-center justify-between"><h3 className="font-mono text-2xl">{m.name}</h3><span className="rounded-full border border-accent2/40 px-2.5 py-0.5 text-[.72rem] uppercase tracking-wider text-accent2">{m.tag}</span></div>
                <p className="mt-3 text-[.95rem] text-muted">{m.blurb}</p>
                <ul className="mt-4 space-y-2 text-[.9rem]">{m.good.map((g) => <li key={g} className="flex gap-2"><Icon name="check" className="mt-[3px] h-4 w-4 shrink-0 text-accent" />{g}</li>)}</ul>
                <p className="mt-4 flex gap-2 text-[.85rem] text-muted"><span className="w-4 shrink-0 text-center text-danger">×</span>{m.avoid}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-[.88rem] text-muted">Not sure? Pick the closest one. I'll suggest a better material if it needs one.</p>
        </div>
      </section>

      {/* Gallery: only once you've added past prints in the admin */}
      {gallery.length > 0 && (
        <section className="section alt">
          <div className="wrap">
            <SectionHead eyebrow="Gallery" title="Prints I've made" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {gallery.map((g, i) => (
                <figure key={`${g.name}-${i}`} className="card overflow-hidden !p-0">
                  <img src={g.photo} alt={g.name} loading="lazy" className="aspect-square w-full object-cover" />
                  <figcaption className="px-3 py-2.5 text-[.85rem]"><span className="block text-ink">{g.name}</span>{g.condition && <span className="text-[.75rem] text-muted">{g.condition}</span>}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className={`section ${gallery.length ? "" : "alt"}`}>
        <div className="wrap">
          <SectionHead eyebrow="How it works" title="From idea to your desk" />
          <div className="grid gap-5 md:grid-cols-3">
            {printSteps.map((s, i) => (
              <div key={s.title} className="card p-7">
                <div className="flex items-center justify-between"><IconTile name={s.icon} /><span className="font-mono text-[.8rem] text-accent2">0{i + 1}</span></div>
                <h3 className="mb-2 mt-5 text-xl">{s.title}</h3>
                <p className="text-[.95rem] text-muted">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FormDialog config={form} onClose={() => setForm(null)}
        onSubmit={dialogKind === "request" ? (v) => submitPrintRequest(form!, v, details_, files) : undefined} />

      {/* Phone: the ballpark follows you down the form */}
      {inCustom && createPortal(
        <button type="button" onClick={() => scrollToId("ballpark")} className="cursor-pointer text-left fixed inset-x-3 bottom-3 z-20 flex items-center justify-between rounded-full border border-accent/40 bg-bg/90 py-2 pl-5 pr-2 no-underline shadow-[0_14px_44px_-14px_rgba(0,0,0,.9)] backdrop-blur-xl lg:hidden">
          <span><small className="block font-mono text-[.62rem] uppercase tracking-wider text-accent2">Ballpark · {material}</small><b className="font-heading text-lg text-ink">${est[0]}–${est[1]}</b></span>
          <span className="btn !px-4 !py-2 !text-[.85rem]">See price <Icon name="arrow" className="h-3.5 w-3.5" /></span>
        </button>
      , document.body)}
    </>
  );
}

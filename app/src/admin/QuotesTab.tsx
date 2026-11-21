import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "./client";
import { Totals } from "./Records";
import {
  PART_CATEGORIES, PART_SOURCES, QUOTE_STATUSES, day, money, num, pct, quoteTotals, specLine, today,
  type JobRow, type PartRow, type QuoteItemRow, type QuoteRow,
} from "./money";

type Item = Omit<QuoteItemRow, "id" | "quote_id" | "sort"> & { key: string };
type Draft = Omit<QuoteRow, "id" | "created_at" | "job_id"> & { id?: string; job_id: string | null };
type PastJob = Pick<JobRow, "id" | "title" | "customer" | "status" | "date" | "started_on">;
type Price = { n: number; avg: number; min: number; max: number };

const STATUS_STYLE: Record<QuoteRow["status"], string> = {
  draft: "border-line text-muted",
  sent: "border-accent2/60 text-accent2",
  accepted: "border-accent/60 text-accent",
  declined: "border-danger/50 text-danger",
};
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
let nextKey = 0;
const key = () => `i${++nextKey}`;
const blankItem = (category = "CPU"): Item => ({ key: key(), category, name: "", price: 0, qty: 1, source: "", link: "", optional: false });
const blankQuote = (): Draft => ({
  title: "", customer: "", contact: "", status: "draft", tax_rate: 0.06, build_fee: 0, extra_costs: 0, show_prices: false,
  valid_until: null, customer_note: "", notes: "", job_id: null,
});
/** A fresh parts list in the usual order: one empty line for each main part. */
const starterItems = () => ["CPU", "GPU", "Motherboard", "RAM", "Storage", "PSU", "Case", "CPU cooler"].map((c) => blankItem(c));

/**
 * Quotes: price out a build for a customer, download it as Excel (one for them, one for you),
 * and turn it into a job when they say yes.
 */
export default function QuotesTab({ onJobMade }: { onJobMade?: () => void }) {
  const [quotes, setQuotes] = useState<QuoteRow[] | null>(null);
  const [items, setItems] = useState<QuoteItemRow[]>([]);
  const [error, setError] = useState("");
  const [pick, setPick] = useState<"all" | QuoteRow["status"]>("all");
  const [open, setOpenRaw] = useState<{ quote: Draft; items: Item[]; n: number } | null>(null);
  const setOpen = (o: { quote: Draft; items: Item[] } | null) => setOpenRaw(o && { ...o, n: (open?.n ?? 0) + 1 });

  const load = useCallback(async () => {
    const [q, i] = await Promise.all([
      supabase!.from("quotes").select("*").order("created_at", { ascending: false }).limit(2000),
      supabase!.from("quote_items").select("*").order("sort").limit(20000),
    ]);
    const err = q.error ?? i.error;
    if (err) {
      setError(err.code === "PGRST205" || err.message.includes("does not exist")
        ? "The quotes tables aren't set up yet. Run the quotes SQL file in Supabase (SQL Editor → New query → paste → Run)."
        : err.message);
      return;
    }
    setError("");
    setQuotes(q.data as QuoteRow[]);
    setItems(i.data as QuoteItemRow[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const byQuote = useMemo(() => {
    const m = new Map<string, QuoteItemRow[]>();
    for (const i of items) { const l = m.get(i.quote_id) ?? []; l.push(i); m.set(i.quote_id, l); }
    return m;
  }, [items]);

  const openQuote = (q: QuoteRow) => {
    const { created_at: _c, ...rest } = q;
    setOpen({
      quote: { ...rest, customer: q.customer ?? "", contact: q.contact ?? "", customer_note: q.customer_note ?? "", notes: q.notes ?? "" },
      items: (byQuote.get(q.id) ?? []).map((i) => ({ key: key(), category: i.category, name: i.name, price: i.price, qty: i.qty, source: i.source ?? "", link: i.link ?? "", optional: i.optional })),
    });
  };

  if (open) {
    return <QuoteEditor key={open.n} initial={open} onClose={() => { setOpen(null); load(); }} onJobMade={onJobMade}
      onDuplicate={(d) => setOpen(d)} />;
  }

  const rows = (quotes ?? []).filter((q) => pick === "all" || q.status === pick);
  const totals = (q: QuoteRow) => quoteTotals(q, byQuote.get(q.id) ?? []);
  const openOnes = (quotes ?? []).filter((q) => q.status === "draft" || q.status === "sent");
  const decided = (quotes ?? []).filter((q) => q.status === "accepted" || q.status === "declined");
  const won = decided.filter((q) => q.status === "accepted").length;

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.8rem]">Quotes</h1>
          <p className="text-[.92rem] text-muted">Price out a build, download it as Excel for the customer and for you, and turn it into a job when they say yes.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost !py-2 !text-[.85rem]" onClick={load}>Refresh</button>
          <button type="button" className="btn !py-2 !text-[.85rem]" onClick={() => setOpen({ quote: blankQuote(), items: starterItems() })} disabled={!quotes}>+ New quote</button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-card border border-danger/40 p-3 text-[.9rem] text-danger" role="alert">{error}</p>}
      {!quotes && !error && <p className="text-muted">Loading…</p>}

      {quotes && (
        <>
          <Totals items={[
            { label: `Open quotes (${openOnes.length})`, value: money(openOnes.reduce((s, q) => s + totals(q).total, 0)) },
            { label: "Profit if they all say yes", value: money(openOnes.reduce((s, q) => s + totals(q).profit, 0)), tone: "good" },
            { label: "Accepted", value: decided.length ? `${won} of ${decided.length} (${pct(won / decided.length)})` : "–" },
            { label: "All quotes", value: String(quotes.length) },
          ]} />
          <div className="mb-4 mt-4 flex flex-wrap gap-2">
            {(["all", ...QUOTE_STATUSES] as const).map((o) => (
              <button key={o} type="button" onClick={() => setPick(o)} aria-pressed={pick === o}
                className={`rounded-full border px-3 py-1 text-[.8rem] capitalize ${pick === o ? "border-ink/60 bg-card text-ink" : "border-line text-muted hover:text-ink"}`}>
                {o} <span className="font-mono text-[.72rem] opacity-70">{o === "all" ? quotes.length : quotes.filter((q) => q.status === o).length}</span>
              </button>
            ))}
          </div>
          <ul className="space-y-2">
            {rows.length === 0 && <li className="card p-6 text-center text-muted">{quotes.length ? "No quotes with this status." : "No quotes yet. Press “+ New quote” to start one."}</li>}
            {rows.map((q) => {
              const t = totals(q);
              const spec = specLine(byQuote.get(q.id) ?? []);
              return (
                <li key={q.id}>
                  <button type="button" onClick={() => openQuote(q)} className="card flex w-full items-center gap-3 p-3.5 text-left text-ink hover:border-ink/40">
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium">{q.title}</span>
                        <span className={`shrink-0 rounded-full border px-2 py-px text-[.7rem] capitalize ${STATUS_STYLE[q.status]}`}>{q.status}</span>
                      </span>
                      <span className="block truncate text-[.82rem] text-muted">{[spec, q.customer, day(q.created_at.slice(0, 10))].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono">{money(t.total)}</span>
                      <span className={`block font-mono text-[.75rem] ${t.profit < 0 ? "text-danger" : "text-muted"}`}>{money(t.profit)} profit</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

/** One quote, full page: details, the parts list, the money, and the buttons to export or turn it into a job. */
function QuoteEditor({ initial, onClose, onDuplicate, onJobMade }: {
  initial: { quote: Draft; items: Item[] }; onClose: () => void;
  onDuplicate: (d: { quote: Draft; items: Item[] }) => void; onJobMade?: () => void;
}) {
  const [q, setQ] = useState<Draft>(initial.quote);
  const [list, setList] = useState<Item[]>(initial.items);
  const [dirty, setDirty] = useState(!initial.quote.id);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [prices, setPrices] = useState<Map<string, Price>>(new Map());
  const [names, setNames] = useState<Map<string, string[]>>(new Map());
  const [jobs, setJobs] = useState<{ job: PastJob; parts: PartRow[] }[]>([]);

  // Your past parts: for price hints, name suggestions and "start from a past build"
  useEffect(() => {
    Promise.all([
      supabase!.from("job_parts").select("*").order("sort").limit(20000),
      supabase!.from("jobs").select("id, title, customer, status, date, started_on").limit(5000),
    ]).then(([p, j]) => {
      const parts = (p.data ?? []) as PartRow[];
      const seen = new Map<string, number[]>();
      const byCat = new Map<string, Map<string, { name: string; n: number }>>();
      const byJob = new Map<string, PartRow[]>();
      for (const x of parts) {
        const k = `${x.category}|${norm(x.name)}`;
        if (num(x.price) > 0) { const l = seen.get(k) ?? []; l.push(num(x.price)); seen.set(k, l); }
        const c = byCat.get(x.category) ?? new Map();
        const e = c.get(norm(x.name)) ?? { name: x.name.trim(), n: 0 };
        e.n++; c.set(norm(x.name), e); byCat.set(x.category, c);
        const jl = byJob.get(x.job_id) ?? []; jl.push(x); byJob.set(x.job_id, jl);
      }
      setPrices(new Map([...seen].map(([k, l]) => [k, { n: l.length, avg: l.reduce((a, b) => a + b, 0) / l.length, min: Math.min(...l), max: Math.max(...l) }])));
      setNames(new Map([...byCat].map(([c, m]) => [c, [...m.values()].sort((a, b) => b.n - a.n).map((e) => e.name).slice(0, 60)])));
      setJobs(((j.data ?? []) as PastJob[]).filter((x) => byJob.has(x.id))
        .map((job) => ({ job, parts: byJob.get(job.id)! }))
        .sort((a, b) => (b.job.date ?? b.job.started_on ?? "").localeCompare(a.job.date ?? a.job.started_on ?? "")));
    });
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const t = quoteTotals(q, list);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setQ((c) => ({ ...c, [k]: v })); setDirty(true); };
  const setItem = (k: string, patch: Partial<Item>) => { setList((l) => l.map((i) => (i.key === k ? { ...i, ...patch } : i))); setDirty(true); };
  const flash = (s: string) => { setNote(s); setTimeout(() => setNote(""), 3500); };

  /** Saves the quote and its parts. Returns the quote's id, or null if it failed. */
  const save = async (): Promise<string | null> => {
    if (!q.title.trim()) { setError("Give the quote a name first (at the top)."); return null; }
    setError("");
    const { id, ...fields } = q;
    const body = {
      ...fields, title: q.title.trim(), customer: q.customer?.trim() || null, contact: q.contact?.trim() || null,
      tax_rate: num(q.tax_rate), build_fee: num(q.build_fee), extra_costs: num(q.extra_costs),
      valid_until: q.valid_until || null, customer_note: q.customer_note?.trim() || null, notes: q.notes?.trim() || null,
    };
    let qid = id;
    if (qid) {
      const { error } = await supabase!.from("quotes").update(body).eq("id", qid);
      if (error) { setError(error.message); return null; }
    } else {
      const { data, error } = await supabase!.from("quotes").insert(body).select("id").single();
      if (error || !data) { setError(error?.message ?? "Couldn't save."); return null; }
      qid = (data as { id: string }).id;
      setQ((c) => ({ ...c, id: qid }));
    }
    // Replace the parts list with what's on screen
    const del = await supabase!.from("quote_items").delete().eq("quote_id", qid);
    if (del.error) { setError(del.error.message); return null; }
    const rows = list.filter((i) => i.name.trim()).map((i, n) => ({
      quote_id: qid, category: i.category, name: i.name.trim().slice(0, 200), price: num(i.price), qty: Math.max(0, Math.round(num(i.qty))),
      source: i.source?.trim() || null, link: i.link?.trim() || null, optional: i.optional, sort: (n + 1) * 10,
    }));
    if (rows.length) {
      const ins = await supabase!.from("quote_items").insert(rows);
      if (ins.error) { setError(ins.error.message); return null; }
    }
    setDirty(false);
    return qid!;
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setBusy("");
  };

  const exportIt = (kind: "customer" | "internal") => run(kind, async () => {
    if (dirty && !(await save())) return;
    const { downloadQuote } = await import("./quoteExcel");
    await downloadQuote(q, list, kind);
  });

  const makeJob = () => run("job", async () => {
    if (!confirm("Turn this quote into a job? It adds a job (in progress) with these parts marked “needed”, and marks the quote accepted.")) return;
    const qid = await save();
    if (!qid) return;
    const { data, error } = await supabase!.from("jobs").insert({
      title: q.title.trim(), customer: q.customer?.trim() || null, kind: "build", status: "in progress",
      revenue: t.total, cost: t.cost, started_on: today(),
      notes: [`From quote: parts ${money(t.parts)} + tax ${money(t.tax)} + build fee ${money(t.fee)}.`, q.notes?.trim()].filter(Boolean).join(" "),
    }).select("id").single();
    if (error || !data) { setError(error?.message ?? "Couldn't make the job."); return; }
    const jobId = (data as { id: string }).id;
    const parts = list.filter((i) => i.name.trim() && !i.optional).map((i, n) => ({
      job_id: jobId, category: i.category, name: i.name.trim().slice(0, 200), price: num(i.price), qty: Math.max(0, Math.round(num(i.qty))),
      source: i.source?.trim().slice(0, 80) || null, status: /^(on hand|customer'?s)$/i.test(i.source?.trim() ?? "") ? (/^on/i.test(i.source!.trim()) ? "have" : "customer's") : "needed",
      sort: (n + 1) * 10,
    }));
    if (parts.length) {
      const ins = await supabase!.from("job_parts").insert(parts);
      if (ins.error) { setError(`The job was made, but its parts weren't: ${ins.error.message}`); }
    }
    await supabase!.from("quotes").update({ status: "accepted", job_id: jobId }).eq("id", qid);
    setQ((c) => ({ ...c, status: "accepted", job_id: jobId }));
    setDirty(false);
    onJobMade?.();
    flash("Done! It's in the Jobs tab now. Mark parts “ordered” or “bought” there as you go.");
  });

  const remove = () => run("delete", async () => {
    if (!confirm("Delete this quote? This can't be undone.")) return;
    if (q.id) {
      const { error } = await supabase!.from("quotes").delete().eq("id", q.id);
      if (error) { setError(error.message); return; }
    }
    onClose();
  });

  const close = () => { if (!dirty || confirm("You have unsaved changes. Leave without saving?")) onClose(); };
  const duplicate = () => {
    if (dirty && !confirm("You have unsaved changes. Copy it without saving them?")) return;
    onDuplicate({
      quote: { ...q, id: undefined, title: `${q.title} (copy)`, status: "draft", job_id: null },
      items: list.map((i) => ({ ...i, key: key() })),
    });
  };
  const addFromJob = (id: string) => {
    const j = jobs.find((x) => x.job.id === id);
    if (!j) return;
    const kept = list.filter((i) => i.name.trim());
    setList([...kept, ...j.parts.map((p) => ({ key: key(), category: p.category, name: p.name, price: num(p.price), qty: num(p.qty) || 1, source: p.source ?? "", link: "", optional: false }))]);
    if (!q.title.trim()) set("title", j.job.title);
    setDirty(true);
    flash(`Added ${j.parts.length} parts from “${j.job.title}”. Check the prices; they're what you paid then.`);
  };
  const sortByCategory = () => {
    const at = (c: string) => { const i = PART_CATEGORIES.indexOf(c as never); return i < 0 ? 99 : i; };
    setList((l) => [...l].sort((a, b) => Number(a.optional) - Number(b.optional) || at(a.category) - at(b.category)));
    setDirty(true);
  };

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="text-[.9rem] text-muted hover:text-ink" onClick={close}>← All quotes</button>
        <span className="text-[.8rem] text-muted" aria-live="polite">{busy === "save" ? "Saving…" : dirty ? "Unsaved changes" : q.id ? "Saved" : ""}</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-5">
          <div className="card p-5">
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
              <L label="Quote name *" wide><input className="input" value={q.title} placeholder="Ryzen 5 7600 + RTX 4060 gaming PC" onChange={(e) => set("title", e.target.value)} /></L>
              <L label="Customer"><input className="input" value={q.customer ?? ""} onChange={(e) => set("customer", e.target.value)} /></L>
              <L label="Contact (only on your copy)"><input className="input" value={q.contact ?? ""} placeholder="Phone, email, Snapchat…" onChange={(e) => set("contact", e.target.value)} /></L>
              <L label="Status">
                <select className="input capitalize" value={q.status} onChange={(e) => set("status", e.target.value as Draft["status"])}>
                  {QUOTE_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </L>
              <L label="Good until"><input className="input" type="date" value={q.valid_until ?? ""} onChange={(e) => set("valid_until", e.target.value || null)} /></L>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-[1.05rem]">Parts</h2>
                <p className="text-[.8rem] text-muted">Prices are for one, before tax. Tick “Optional” for upgrades you offer; they're listed separately and not in the total.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {jobs.length > 0 && (
                  <select className="input !w-full max-w-full !py-1.5 !text-[.82rem] sm:!w-72" aria-label="Copy parts from a past build" value="" onChange={(e) => addFromJob(e.target.value)}>
                    <option value="">Copy parts from a past build…</option>
                    {jobs.map(({ job, parts }) => <option key={job.id} value={job.id}>{job.title}{specLine(parts) ? ` (${specLine(parts)})` : ""}</option>)}
                  </select>
                )}
                <button type="button" className="btn btn-ghost !px-3 !py-1.5 !text-[.82rem]" onClick={sortByCategory}>Sort by category</button>
              </div>
            </div>

            <datalist id="quote-sources">{PART_SOURCES.map((s) => <option key={s} value={s} />)}</datalist>
            {[...names].map(([c, l]) => <datalist key={c} id={`past-${c.replace(/\W/g, "")}`}>{l.map((n) => <option key={n} value={n} />)}</datalist>)}

            <div className="mt-3 space-y-2">
              {list.length === 0 && <p className="text-[.85rem] text-muted">No parts yet.</p>}
              {list.map((i) => (
                <ItemLine key={i.key} item={i} price={prices.get(`${i.category}|${norm(i.name)}`)}
                  onChange={(p) => setItem(i.key, p)} onRemove={() => { setList((l) => l.filter((x) => x.key !== i.key)); setDirty(true); }} />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn btn-ghost !py-1.5 !text-[.82rem]" onClick={() => { setList((l) => [...l, blankItem("Other")]); setDirty(true); }}>+ Add part</button>
              <button type="button" className="btn btn-ghost !py-1.5 !text-[.82rem]" onClick={() => { setList((l) => [...l, { ...blankItem("GPU"), optional: true }]); setDirty(true); }}>+ Add optional upgrade</button>
            </div>
          </div>

          <div className="card grid gap-x-4 gap-y-3 p-5 sm:grid-cols-2">
            <L label="Note for the customer (printed on their quote)"><textarea className="input min-h-[6rem]" maxLength={3000} value={q.customer_note ?? ""} placeholder="Includes Windows install, cable management and a stress test." onChange={(e) => set("customer_note", e.target.value)} /></L>
            <L label="Private notes (only on your copy)"><textarea className="input min-h-[6rem]" maxLength={5000} value={q.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></L>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-36 lg:self-start">
          <div className="card p-5">
            <h2 className="text-[1.05rem]">Price</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <L label="Build fee"><Money value={q.build_fee} onChange={(v) => set("build_fee", v)} /></L>
              <L label="Tax %">
                <input className="input" type="number" step="0.01" min={0} max={50} inputMode="decimal" value={+(num(q.tax_rate) * 100).toFixed(2)}
                  onChange={(e) => set("tax_rate", num(e.target.value) / 100)} />
              </L>
              <L label="Your extra costs" wide><Money value={q.extra_costs} onChange={(v) => set("extra_costs", v)} /></L>
            </div>
            <p className="mt-1 text-[.72rem] text-muted">Extra costs are things the customer doesn't see, like shipping or selling fees. They lower your profit.</p>
            <dl className="mt-4 space-y-1.5 text-[.9rem]">
              <Row label="Parts" value={money(t.parts)} />
              <Row label={`Tax (${+(num(q.tax_rate) * 100).toFixed(2)}%)`} value={money(t.tax)} />
              <Row label="Build fee" value={money(t.fee)} />
              <div className="border-t border-line pt-2"><Row label={<b>Customer pays</b>} value={<b className="text-[1.15rem] text-ink">{money(t.total)}</b>} /></div>
              <Row label="Your cost" value={money(t.cost)} />
              <Row label={<b>Your profit</b>} value={<b className={t.profit < 0 ? "text-danger" : "text-accent"}>{money(t.profit)}</b>} />
              <Row label="Margin" value={t.total ? pct(t.profit / t.total) : "–"} />
              {t.upgrades > 0 && <Row label="Optional upgrades" value={`+${money(t.upgrades * (1 + num(q.tax_rate)))}`} />}
            </dl>
            <fieldset className="mt-4 text-[.85rem]">
              <legend className="mb-1.5 text-muted">Customer quote shows</legend>
              {([[false, "Simple", "Parts list and one total price. No build fee or tax lines."], [true, "Full breakdown", "Each part's price, tax and the build fee."]] as const).map(([v, label, sub]) => (
                <label key={label} className="mb-1.5 flex items-start gap-2">
                  <input type="radio" name="quote-style" className="mt-1 h-4 w-4 accent-[var(--accent)]" checked={q.show_prices === v} onChange={() => set("show_prices", v)} />
                  <span><b className="font-medium text-ink">{label}</b><span className="block text-[.75rem] text-muted">{sub}</span></span>
                </label>
              ))}
            </fieldset>
          </div>

          <div className="card space-y-2 p-5">
            <button type="button" className="btn w-full !py-2" disabled={!!busy || (!dirty && !!q.id)} onClick={() => run("save", async () => { if (await save()) flash("Saved."); })}>
              {busy === "save" ? "Saving…" : "Save quote"}
            </button>
            <button type="button" className="btn btn-ghost w-full !py-2 !text-[.88rem]" disabled={!!busy} onClick={() => exportIt("customer")}>
              {busy === "customer" ? "Making file…" : "⬇ Customer quote (Excel)"}
            </button>
            <button type="button" className="btn btn-ghost w-full !py-2 !text-[.88rem]" disabled={!!busy} onClick={() => exportIt("internal")}>
              {busy === "internal" ? "Making file…" : "⬇ My copy with costs (Excel)"}
            </button>
            {q.job_id ? (
              <p className="rounded-card border border-accent/40 p-2.5 text-center text-[.82rem] text-accent">This quote is a job now (see the Jobs tab).</p>
            ) : (
              <button type="button" className="btn btn-ghost w-full !py-2 !text-[.88rem]" disabled={!!busy || !list.some((i) => i.name.trim())} onClick={makeJob}>
                {busy === "job" ? "Making the job…" : "✓ They said yes: make it a job"}
              </button>
            )}
            {note && <p className="text-[.82rem] text-accent" role="status">{note}</p>}
            {error && <p className="text-[.85rem] text-danger" role="alert">{error}</p>}
            <div className="flex justify-between pt-2 text-[.82rem]">
              <button type="button" className="text-muted underline hover:text-ink" onClick={duplicate}>Make a copy</button>
              <button type="button" className="text-muted underline hover:text-danger" onClick={remove}>Delete</button>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

/** One part on the quote, with what you've paid for it before (from your jobs) when there's a match. */
function ItemLine({ item: i, price, onChange, onRemove }: { item: Item; price?: Price; onChange: (p: Partial<Item>) => void; onRemove: () => void }) {
  const cls = "input !rounded-[.6rem] !px-2.5 !py-1.5 !text-[.85rem]";
  return (
    <div className={`rounded-card border p-2 ${i.optional ? "border-dashed border-accent2/50" : "border-line bg-bg2"}`}>
      <div className="flex items-start gap-2">
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5 sm:grid-cols-[8.5rem_minmax(0,1fr)_6.5rem_3.5rem_8rem]">
          <select className={cls} aria-label="Category" value={i.category} onChange={(e) => onChange({ category: e.target.value })}>
            {PART_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            {!PART_CATEGORIES.includes(i.category as never) && <option>{i.category}</option>}
          </select>
          <input className={`${cls} col-span-2 sm:col-span-1`} aria-label="Part" placeholder="Part name" value={i.name} list={`past-${i.category.replace(/\W/g, "")}`}
            onChange={(e) => onChange({ name: e.target.value })} />
          <span className="relative block">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[.8rem] text-muted">$</span>
            <input className={`${cls} !pl-5`} aria-label="Price" type="number" inputMode="decimal" step="0.01" min={0} value={i.price}
              onChange={(e) => onChange({ price: e.target.value as unknown as number })} />
          </span>
          <input className={cls} aria-label="Quantity" type="number" min={0} step={1} value={i.qty} title="How many" onChange={(e) => onChange({ qty: e.target.value as unknown as number })} />
          <input className={cls} aria-label="Where from" placeholder="From" list="quote-sources" value={i.source ?? ""} onChange={(e) => onChange({ source: e.target.value })} />
          <input className={`${cls} col-span-2 sm:col-span-4`} aria-label="Link" placeholder="Link (only on your copy)" type="url" value={i.link ?? ""} onChange={(e) => onChange({ link: e.target.value })} />
          <label className="flex items-center gap-1.5 px-1 text-[.8rem] text-muted">
            <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={i.optional} onChange={(e) => onChange({ optional: e.target.checked })} /> Optional
          </label>
        </div>
        <button type="button" aria-label={`Remove ${i.name || "part"}`} title="Remove part" className="mt-1.5 px-2 text-muted hover:text-danger" onClick={onRemove}>✕</button>
      </div>
      {price && (
        <p className="mt-1.5 px-1 text-[.75rem] text-muted">
          You've paid {price.n > 1 ? <>{money(price.min)} – {money(price.max)}, avg <b className="font-mono text-ink">{money(price.avg)}</b> ({price.n} times)</> : <b className="font-mono text-ink">{money(price.avg)}</b>} before.
          {Math.abs(num(i.price) - price.avg) > 0.005 && (
            <button type="button" className="ml-2 text-accent underline" onClick={() => onChange({ price: Math.round(price.avg * 100) / 100 })}>Use {money(price.avg)}</button>
          )}
        </p>
      )}
    </div>
  );
}

function L({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2 col-span-2" : ""}`}>
      <span className="mb-1 block text-[.82rem] text-muted">{label}</span>
      {children}
    </label>
  );
}

function Money({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <span className="relative block">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
      <input className="input !pl-7" type="number" inputMode="decimal" step="0.01" min={0} value={value} onChange={(e) => onChange(e.target.value as unknown as number)} />
    </span>
  );
}

function Row({ label, value }: { label: ReactNode; value: ReactNode }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted">{label}</dt><dd className="font-mono">{value}</dd></div>;
}

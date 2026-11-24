import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "./client";
import { Totals } from "./Records";
import PartsGrid, { blankRow, newKey, norm, type GridItem, type PastPart } from "./PartsGrid";
import TradeInEditor from "./TradeInEditor";
import PrintRequestEditor from "./PrintRequestEditor";
import { fetchSheet, findParts, readFile, type FoundPart } from "./sheetImport";
import {
  PART_CATEGORIES, PLATFORMS, PRINT_STATUS, STATUSES_FOR, TRADE_IN_STATUS, day, jobDay, money, num, pct, quoteTotals, resaleTotals, specLine, today,
  type JobRow, type PartRow, type QuoteItemRow, type QuoteRow,
} from "./money";

type Purpose = QuoteRow["purpose"];
type Draft = Omit<QuoteRow, "id" | "created_at"> & { id?: string };
type Opened = { quote: Draft; items: GridItem[] };
type PastJob = Pick<JobRow, "id" | "title" | "customer" | "status" | "kind" | "date" | "started_on">;
type PastBuild = { job: PastJob; parts: PartRow[]; spec: string; cost: number };

const STATUS_STYLE: Record<QuoteRow["status"], string> = {
  draft: "border-line text-muted",
  sent: "border-accent2/60 text-accent2",
  building: "border-accent2/60 text-accent2",
  listed: "border-accent2/60 text-accent2",
  accepted: "border-accent/60 text-accent",
  sold: "border-accent/60 text-accent",
  declined: "border-danger/50 text-danger",
};
const catAt = (c: string) => { const i = PART_CATEGORIES.indexOf(c as never); return i < 0 ? 99 : i; };

const blankQuote = (purpose: Purpose): Draft => ({
  title: "", customer: "", contact: "", status: "draft", purpose, platform: purpose === "resale" ? "eBay" : null,
  list_price: 0, fee_pct: purpose === "resale" ? PLATFORMS[0].pct : 0, fee_fixed: purpose === "resale" ? PLATFORMS[0].fixed : 0, shipping: 0,
  tax_rate: 0.06, build_fee: 0, extra_costs: 0, show_prices: false, valid_until: null, customer_note: "", notes: "", job_id: null,
});
/** A fresh parts list: one empty row for each main part, then type away. */
const starterRows = () => ["CPU", "GPU", "Motherboard", "RAM", "Storage", "PSU", "Case", "CPU cooler"].map((c) => blankRow(c, false));

/**
 * Quotes: price out a build for a customer, or plan one you'll sell yourself (eBay, Marketplace…).
 * Customer quotes download as Excel; builds to sell show fees, payout and profit.
 */
export default function QuotesTab({ onJobMade }: { onJobMade?: () => void }) {
  const [quotes, setQuotes] = useState<QuoteRow[] | null>(null);
  const [items, setItems] = useState<QuoteItemRow[]>([]);
  const [error, setError] = useState("");
  const [show, setShow] = useState<"all" | Purpose>("all");
  const [open, setOpenRaw] = useState<(Opened & { n: number }) | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [tradeIn, setTradeIn] = useState<QuoteRow | null>(null);
  const [printReq, setPrintReq] = useState<QuoteRow | null>(null);
  const setOpen = (o: Opened | null) => setOpenRaw((cur) => o && { ...o, n: (cur?.n ?? 0) + 1 });

  const load = useCallback(async () => {
    const [q, i] = await Promise.all([
      supabase!.from("quotes").select("*").order("created_at", { ascending: false }).limit(2000),
      supabase!.from("quote_items").select("*").order("sort").limit(20000),
    ]);
    const err = q.error ?? i.error;
    if (err) {
      setError(err.code === "PGRST205" || err.code === "42703" || err.message.includes("does not exist")
        ? "The quotes tables need an update. Run the newest quotes SQL file in Supabase (SQL Editor → New query → paste → Run)."
        : err.message);
      return;
    }
    setError("");
    setQuotes((q.data as QuoteRow[]).map((x) => ({ ...x, purpose: x.purpose ?? "customer" })));
    setItems(i.data as QuoteItemRow[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const byQuote = useMemo(() => {
    const m = new Map<string, QuoteItemRow[]>();
    for (const i of items) { const l = m.get(i.quote_id) ?? []; l.push(i); m.set(i.quote_id, l); }
    return m;
  }, [items]);

  const openQuote = (q: QuoteRow) => {
    if (q.purpose === "trade_in") { setTradeIn(q); return; }
    if (q.purpose === "print") { setPrintReq(q); return; }
    const { created_at: _c, ...rest } = q;
    setOpen({
      quote: { ...rest, customer: q.customer ?? "", contact: q.contact ?? "", customer_note: q.customer_note ?? "", notes: q.notes ?? "" },
      items: (byQuote.get(q.id) ?? []).map((i) => ({ key: newKey(), category: i.category, name: i.name, price: num(i.price), qty: i.qty, source: i.source ?? "", link: i.link ?? "", optional: i.optional, auto: false })),
    });
  };

  if (printReq) return <PrintRequestEditor quote={printReq} onClose={() => { setPrintReq(null); load(); }} />;
  if (tradeIn) return <TradeInEditor quote={tradeIn} onClose={() => { setTradeIn(null); load(); }} />;
  if (open) {
    return <QuoteEditor key={open.n} initial={open} onClose={() => { setOpen(null); load(); }} onJobMade={onJobMade} onDuplicate={setOpen} />;
  }

  const money2 = (q: QuoteRow) => {
    const its = byQuote.get(q.id) ?? [];
    if (q.purpose === "trade_in" || q.purpose === "print") return { price: num(q.offer), profit: 0 };
    if (q.purpose === "resale") { const t = resaleTotals(q, its); return { price: t.list, profit: t.profit }; }
    const t = quoteTotals(q, its);
    return { price: t.total, profit: t.profit };
  };
  const all = quotes ?? [];
  const rows = all.filter((q) => show === "all" || q.purpose === show);
  const openCustomer = all.filter((q) => q.purpose === "customer" && (q.status === "draft" || q.status === "sent"));
  const decided = all.filter((q) => q.purpose === "customer" && (q.status === "accepted" || q.status === "declined"));
  const won = decided.filter((q) => q.status === "accepted").length;
  const forSale = all.filter((q) => q.purpose === "resale" && q.status !== "sold");
  const newTradeIns = all.filter((q) => q.purpose === "trade_in" && q.status === "draft").length;
  const newPrints = all.filter((q) => q.purpose === "print" && q.status === "draft").length;

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.8rem]">Quotes</h1>
          <p className="text-[.92rem] text-muted">Price a build for a customer, or plan one to sell yourself. Then turn it into a job.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost !py-2 !text-[.85rem]" onClick={load}>Refresh</button>
          <button type="button" className="btn !py-2 !text-[.85rem]" onClick={() => setChoosing(true)} disabled={!quotes}>+ New quote</button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-card border border-danger/40 p-3 text-[.9rem] text-danger" role="alert">{error}</p>}
      {!quotes && !error && <p className="text-muted">Loading…</p>}

      {quotes && (
        <>
          <Totals items={[
            { label: `Open customer quotes (${openCustomer.length})`, value: money(openCustomer.reduce((s, q) => s + money2(q).price, 0)) },
            { label: "Customer quotes accepted", value: decided.length ? `${won} of ${decided.length} (${pct(won / decided.length)})` : "–" },
            { label: `Builds to sell (${forSale.length})`, value: money(forSale.reduce((s, q) => s + money2(q).price, 0)) },
            { label: "Expected profit on those", value: money(forSale.reduce((s, q) => s + money2(q).profit, 0)), tone: "good" },
          ]} />
          {newTradeIns > 0 && show !== "trade_in" && (
            <button type="button" onClick={() => setShow("trade_in")} className="mt-4 w-full rounded-card border border-accent/50 bg-accent/10 px-4 py-2.5 text-left text-[.9rem] text-accent">
              {newTradeIns} new trade-in request{newTradeIns === 1 ? "" : "s"} from the site. Show them →
            </button>
          )}
          {newPrints > 0 && show !== "print" && (
            <button type="button" onClick={() => setShow("print")} className="mt-4 w-full rounded-card border border-accent/50 bg-accent/10 px-4 py-2.5 text-left text-[.9rem] text-accent">
              {newPrints} new 3D print request{newPrints === 1 ? "" : "s"} from the site. Show them →
            </button>
          )}
          <div className="mb-4 mt-4 flex flex-wrap gap-2">
            {([["all", "All"], ["customer", "For customers"], ["resale", "To sell"], ["trade_in", "Trade-ins"], ["print", "3D prints"]] as const).map(([o, label]) => (
              <button key={o} type="button" onClick={() => setShow(o)} aria-pressed={show === o}
                className={`rounded-full border px-3 py-1 text-[.8rem] ${show === o ? "border-ink/60 bg-card text-ink" : "border-line text-muted hover:text-ink"}`}>
                {label} <span className="font-mono text-[.72rem] opacity-70">{o === "all" ? all.length : all.filter((q) => q.purpose === o).length}</span>
              </button>
            ))}
          </div>
          <ul className="space-y-2">
            {rows.length === 0 && <li className="card p-6 text-center text-muted">{all.length ? "Nothing here." : "No quotes yet. Press “+ New quote” to start one."}</li>}
            {rows.map((q) => {
              const m = money2(q);
              const spec = specLine(byQuote.get(q.id) ?? []);
              return (
                <li key={q.id}>
                  <button type="button" onClick={() => openQuote(q)} className="card flex w-full items-center gap-3 p-3.5 text-left text-ink hover:border-ink/40">
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium">{q.title}</span>
                        <span className={`shrink-0 rounded-full border px-2 py-px text-[.7rem] capitalize ${STATUS_STYLE[q.status]}`}>{q.purpose === "trade_in" ? TRADE_IN_STATUS[q.status] ?? q.status : q.purpose === "print" ? PRINT_STATUS[q.status] ?? q.status : q.status}</span>
                      </span>
                      <span className="block truncate text-[.82rem] text-muted">
                        {[q.purpose === "resale" ? `To sell${q.platform ? ` on ${q.platform}` : ""}` : q.purpose === "trade_in" ? `Trade-in from ${q.customer || "the site"}` : q.purpose === "print" ? `3D print for ${q.customer || "the site"}` : q.customer || "Customer",
                          q.purpose === "trade_in" ? q.trade_in?.condition : q.purpose === "print" ? [q.print_job?.material, q.print_job?.size].filter(Boolean).join(" · ") : spec, day(q.created_at.slice(0, 10))].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono">{m.price ? money(m.price) : "–"}{q.purpose === "resale" && <span className="text-[.7rem] text-muted"> list</span>}{q.purpose === "trade_in" && m.price > 0 && <span className="text-[.7rem] text-muted"> offer</span>}{q.purpose === "print" && m.price > 0 && <span className="text-[.7rem] text-muted"> price</span>}</span>
                      {q.purpose === "print"
                        ? <span className="block font-mono text-[.75rem] text-muted">{q.print_job?.estimate ? `est. ${money(q.print_job.estimate[0])}–${money(q.print_job.estimate[1])}` : ""}</span>
                        : q.purpose === "trade_in"
                        ? <span className="block font-mono text-[.75rem] text-muted">{q.trade_in?.estimate_cash ? `est. ${money(q.trade_in.estimate_cash[0])}–${money(q.trade_in.estimate_cash[1])}` : "price by hand"}</span>
                        : <span className={`block font-mono text-[.75rem] ${m.profit < 0 ? "text-danger" : "text-muted"}`}>{money(m.profit)} profit</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {choosing && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={() => setChoosing(false)}>
          <div role="dialog" aria-modal="true" aria-label="What's this quote for?" className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl">What's this build for?</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {([
                ["customer", "For a customer", "Someone asked for a PC. Set your build fee and send them a quote."],
                ["resale", "To sell", "You're building it to sell on eBay, Marketplace or locally. See fees and profit."],
              ] as const).map(([p, title, sub]) => (
                <button key={p} type="button" autoFocus={p === "customer"} onClick={() => { setChoosing(false); setOpen({ quote: blankQuote(p), items: starterRows() }); }}
                  className="rounded-card border border-line p-4 text-left text-ink hover:border-accent focus:border-accent">
                  <span className="block font-medium">{title}</span>
                  <span className="mt-1 block text-[.82rem] text-muted">{sub}</span>
                </button>
              ))}
            </div>
            <button type="button" className="mt-4 text-[.85rem] text-muted underline" onClick={() => setChoosing(false)}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}

/** One quote, full page: details, the parts grid, the money, and what to do with it next. */
function QuoteEditor({ initial, onClose, onDuplicate, onJobMade }: {
  initial: Opened; onClose: () => void; onDuplicate: (d: Opened) => void; onJobMade?: () => void;
}) {
  const [q, setQ] = useState<Draft>(initial.quote);
  const [list, setListRaw] = useState<GridItem[]>(initial.items.length ? initial.items : [blankRow()]);
  const [dirty, setDirty] = useState(!initial.quote.id);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [past, setPast] = useState<PastPart[]>([]);
  const [builds, setBuilds] = useState<PastBuild[]>([]);
  const [picking, setPicking] = useState<"" | "build" | "sheet">("");
  const resale = q.purpose === "resale";

  // Everything you've bought before: for part suggestions and "copy from a past build"
  useEffect(() => {
    Promise.all([
      supabase!.from("job_parts").select("*").order("sort").limit(20000),
      supabase!.from("jobs").select("id, title, customer, status, kind, date, started_on").limit(5000),
    ]).then(([p, j]) => {
      const parts = (p.data ?? []) as PartRow[];
      const seen = new Map<string, { name: string; category: string; prices: number[]; n: number }>();
      const byJob = new Map<string, PartRow[]>();
      for (const x of parts) {
        const k = `${x.category}|${norm(x.name)}`;
        const e = seen.get(k) ?? { name: x.name.trim(), category: x.category, prices: [], n: 0 };
        e.n++;
        if (num(x.price) > 0) e.prices.push(num(x.price));
        seen.set(k, e);
        const l = byJob.get(x.job_id) ?? []; l.push(x); byJob.set(x.job_id, l);
      }
      setPast([...seen.values()].filter((e) => e.prices.length).map((e) => ({
        name: e.name, category: e.category, n: e.n, avg: e.prices.reduce((a, b) => a + b, 0) / e.prices.length,
        min: Math.min(...e.prices), max: Math.max(...e.prices), last: e.prices[e.prices.length - 1],
      })));
      setBuilds(((j.data ?? []) as PastJob[]).filter((x) => byJob.has(x.id)).map((job) => {
        const ps = byJob.get(job.id)!;
        return { job, parts: ps, spec: specLine(ps), cost: ps.reduce((s, x) => s + num(x.price) * num(x.qty), 0) };
      }).sort((a, b) => (jobDay(b.job) ?? "").localeCompare(jobDay(a.job) ?? "")));
    });
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const setList = (l: GridItem[]) => { setListRaw(l); setDirty(true); };
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setQ((c) => ({ ...c, [k]: v })); setDirty(true); };
  const flash = (s: string) => { setNote(s); setTimeout(() => setNote(""), 5000); };
  const named = list.filter((i) => i.name.trim());
  const items = named.map((i) => ({ ...i, price: num(i.price), qty: num(i.qty) }));
  const ct = quoteTotals(q, items);
  const rt = resaleTotals(q, items);

  const switchPurpose = (p: Purpose) => {
    if (p === q.purpose) return;
    const fresh = blankQuote(p);
    setQ((c) => ({
      ...c, purpose: p, status: "draft",
      ...(p === "resale" && !c.platform ? { platform: fresh.platform, fee_pct: fresh.fee_pct, fee_fixed: fresh.fee_fixed } : {}),
    }));
    setDirty(true);
  };
  const pickPlatform = (name: string) => {
    const p = PLATFORMS.find((x) => x.name === name);
    setQ((c) => ({ ...c, platform: name || null, ...(p ? { fee_pct: p.pct, fee_fixed: p.fixed } : {}) }));
    setDirty(true);
  };

  /** Saves the quote and its parts. Returns the quote's id, or null if it failed. */
  const save = async (): Promise<string | null> => {
    if (!q.title.trim()) { setError("Give it a name first (at the top)."); return null; }
    setError("");
    const { id, ...fields } = q;
    const body = {
      ...fields, title: q.title.trim(), customer: q.customer?.trim() || null, contact: q.contact?.trim() || null,
      tax_rate: num(q.tax_rate), build_fee: num(q.build_fee), extra_costs: num(q.extra_costs),
      list_price: num(q.list_price), fee_pct: num(q.fee_pct), fee_fixed: num(q.fee_fixed), shipping: num(q.shipping),
      platform: q.platform?.trim() || null,
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
    const del = await supabase!.from("quote_items").delete().eq("quote_id", qid);
    if (del.error) { setError(del.error.message); return null; }
    const rows = items.map((i, n) => ({
      quote_id: qid, category: i.category, name: i.name.trim().slice(0, 200), price: i.price, qty: Math.max(0, Math.round(i.qty)) || 1,
      source: i.source.trim().slice(0, 80) || null, link: i.link.trim().slice(0, 500) || null, optional: i.optional, sort: (n + 1) * 10,
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
    await downloadQuote(q, items, kind);
  });

  const listingText = () => {
    const main = items.filter((i) => !i.optional).sort((a, b) => catAt(a.category) - catAt(b.category));
    const lines = main.map((i) => `• ${i.category}: ${i.name.trim()}${i.qty > 1 ? ` (x${i.qty})` : ""}`);
    const head = specLine(main);
    return [`${q.title.trim() || "Custom gaming PC"}${head ? ` | ${head}` : ""}`, "", "Specs:", ...lines, "", "Freshly built, cleaned and stress tested. Ready to plug in and play."].join("\n");
  };
  const copyListing = async () => {
    try { await navigator.clipboard.writeText(listingText()); flash("Listing text copied. Paste it into your eBay or Marketplace description."); }
    catch { setError("Couldn't copy automatically. Select the text in your copy's Excel file instead."); }
  };

  const makeJob = () => run("job", async () => {
    const msg = resale
      ? "Start this build? It adds a job (in progress) with these parts marked “needed”, and marks this as building."
      : "Turn this quote into a job? It adds a job (in progress) with these parts marked “needed”, and marks the quote accepted.";
    if (!confirm(msg)) return;
    const qid = await save();
    if (!qid) return;
    const { data, error } = await supabase!.from("jobs").insert(resale ? {
      title: q.title.trim(), kind: "build", status: "in progress", channel: q.platform?.slice(0, 60) || null,
      revenue: 0, cost: rt.cost, started_on: today(),
      notes: [`Planned list price ${money(rt.list)}${q.platform ? ` on ${q.platform}` : ""}, expected payout ${money(rt.payout)} after fees and shipping. Put what you actually got in "You were paid" when it sells.`, q.notes?.trim()].filter(Boolean).join(" "),
    } : {
      title: q.title.trim(), customer: q.customer?.trim() || null, kind: "build", status: "in progress",
      revenue: ct.total, cost: ct.cost, started_on: today(),
      notes: [`From quote: parts ${money(ct.parts)} + tax ${money(ct.tax)} + build fee ${money(ct.fee)}.`, q.notes?.trim()].filter(Boolean).join(" "),
    }).select("id").single();
    if (error || !data) { setError(error?.message ?? "Couldn't make the job."); return; }
    const jobId = (data as { id: string }).id;
    const parts = items.filter((i) => !i.optional).map((i, n) => ({
      job_id: jobId, category: i.category, name: i.name.trim().slice(0, 200), price: i.price, qty: Math.max(0, Math.round(i.qty)) || 1,
      source: i.source.trim().slice(0, 80) || null,
      status: /^on hand$/i.test(i.source.trim()) ? "have" : /^customer'?s$/i.test(i.source.trim()) ? "customer's" : "needed",
      sort: (n + 1) * 10,
    }));
    if (parts.length) {
      const ins = await supabase!.from("job_parts").insert(parts);
      if (ins.error) setError(`The job was made, but its parts weren't: ${ins.error.message}`);
    }
    const status = resale ? "building" : "accepted";
    await supabase!.from("quotes").update({ status, job_id: jobId }).eq("id", qid);
    setQ((c) => ({ ...c, status, job_id: jobId }));
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
    onDuplicate({ quote: { ...q, id: undefined, title: `${q.title} (copy)`, status: "draft", job_id: null }, items: list.map((i) => ({ ...i, key: newKey() })) });
  };
  const copyBuild = (b: PastBuild, replace: boolean) => {
    const rows = b.parts.map((p) => ({ key: newKey(), category: p.category, name: p.name, price: num(p.price), qty: num(p.qty) || 1, source: p.source ?? "", link: "", optional: false, auto: false }));
    setList(replace ? rows : [...list.filter((i) => i.name.trim()), ...rows]);
    if (!q.title.trim()) set("title", b.job.title);
    setPicking("");
    flash(`${replace ? "Replaced the list with" : "Added"} ${rows.length} parts from “${b.job.title}”. Prices are what you paid then.`);
  };
  const copySheet = (parts: FoundPart[], replace: boolean, from: string) => {
    const rows = parts.map((p) => ({ key: newKey(), category: p.category, name: p.name, price: p.price, qty: 1, source: p.source, link: p.link, optional: false, auto: false }));
    setList(replace ? rows : [...list.filter((i) => i.name.trim()), ...rows]);
    setPicking("");
    flash(`${replace ? "Replaced the list with" : "Added"} ${rows.length} parts from ${from}.`);
  };
  const sortByCategory = () => setList([...list].sort((a, b) => Number(a.optional) - Number(b.optional) || catAt(a.category) - catAt(b.category)));
  const statuses = STATUSES_FOR[q.purpose];

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="text-[.9rem] text-muted hover:text-ink" onClick={close}>← All quotes</button>
        <span className="text-[.8rem] text-muted" aria-live="polite">{busy === "save" ? "Saving…" : dirty ? "Unsaved changes" : q.id ? "Saved" : ""}</span>
      </div>

      <div className="card mb-5 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <input className="input min-w-[16rem] flex-1 !text-[1.05rem] font-medium" aria-label="Name" value={q.title}
            placeholder={resale ? "i5-7600 + GTX 1660 Super eBay build" : "Ryzen 5 7600 + RTX 4060 gaming PC"} onChange={(e) => set("title", e.target.value)} />
          <div className="flex rounded-full border border-line bg-bg2 p-1 text-[.82rem]" role="group" aria-label="What's it for">
            {([["customer", "For a customer"], ["resale", "To sell"]] as const).map(([p, label]) => (
              <button key={p} type="button" aria-pressed={q.purpose === p} onClick={() => switchPurpose(p)}
                className={`rounded-full px-3 py-1 ${q.purpose === p ? "bg-card text-ink" : "text-muted hover:text-ink"}`}>{label}</button>
            ))}
          </div>
          <select className="input !w-auto capitalize" aria-label="Status" value={q.status} onChange={(e) => set("status", e.target.value as Draft["status"])}>
            {statuses.map((s) => <option key={s}>{s}</option>)}
            {!statuses.includes(q.status as never) && <option>{q.status}</option>}
          </select>
        </div>
        {!resale && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <L label="Customer"><input className="input" value={q.customer ?? ""} onChange={(e) => set("customer", e.target.value)} /></L>
            <L label="Contact (only on your copy)"><input className="input" value={q.contact ?? ""} placeholder="Phone, email, Snapchat…" onChange={(e) => set("contact", e.target.value)} /></L>
            <L label="Good until"><input className="input" type="date" value={q.valid_until ?? ""} onChange={(e) => set("valid_until", e.target.value || null)} /></L>
          </div>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-5">
          <div className="card p-4 sm:p-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[1.05rem]">Parts</h2>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-ghost !px-3 !py-1.5 !text-[.82rem]" onClick={() => setPicking((v) => v === "build" ? "" : "build")} aria-expanded={picking === "build"}>
                  {picking === "build" ? "Close" : "Copy from a past build"}
                </button>
                <button type="button" className="btn btn-ghost !px-3 !py-1.5 !text-[.82rem]" onClick={() => setPicking((v) => v === "sheet" ? "" : "sheet")} aria-expanded={picking === "sheet"}>
                  {picking === "sheet" ? "Close" : "Import from Google Sheet"}
                </button>
                <button type="button" className="btn btn-ghost !px-3 !py-1.5 !text-[.82rem]" onClick={sortByCategory}>Sort by category</button>
              </div>
            </div>
            {picking === "build" && <BuildPicker builds={builds} onPick={copyBuild} hasParts={named.length > 0} />}
            {picking === "sheet" && <SheetImporter onPick={copySheet} hasParts={named.length > 0} />}
            <PartsGrid items={list} onChange={setList} past={past} taxRate={num(q.tax_rate)} />
          </div>

          <div className="card grid gap-x-4 gap-y-3 p-5 sm:grid-cols-2">
            {!resale && <L label="Note for the customer (printed on their quote)"><textarea className="input min-h-[5rem]" maxLength={3000} value={q.customer_note ?? ""} placeholder="Includes Windows install, cable management and a stress test." onChange={(e) => set("customer_note", e.target.value)} /></L>}
            <L label="Private notes" wide={resale}><textarea className="input min-h-[5rem]" maxLength={5000} value={q.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></L>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-36 xl:self-start">
          {resale ? (
            <div className="card p-5">
              <h2 className="text-[1.05rem]">Selling it</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <L label="List price" wide><Money value={q.list_price} onChange={(v) => set("list_price", v)} big /></L>
                <L label="Selling on" wide>
                  <select className="input" value={PLATFORMS.some((p) => p.name === q.platform) ? q.platform ?? "" : "Other"} onChange={(e) => pickPlatform(e.target.value === "Other" ? "Other" : e.target.value)}>
                    {PLATFORMS.map((p) => <option key={p.name}>{p.name}</option>)}
                    <option>Other</option>
                  </select>
                </L>
                <L label="Fee %"><Num value={+(num(q.fee_pct) * 100).toFixed(2)} onChange={(v) => set("fee_pct", num(v) / 100)} /></L>
                <L label="+ per order"><Money value={q.fee_fixed} onChange={(v) => set("fee_fixed", v)} /></L>
                <L label="Shipping (you pay)"><Money value={q.shipping} onChange={(v) => set("shipping", v)} /></L>
                <L label="Tax on parts %"><Num value={+(num(q.tax_rate) * 100).toFixed(2)} onChange={(v) => set("tax_rate", num(v) / 100)} /></L>
                <L label="Other costs" wide><Money value={q.extra_costs} onChange={(v) => set("extra_costs", v)} /></L>
              </div>
              <p className="mt-1 text-[.72rem] text-muted">{PLATFORMS.find((p) => p.name === q.platform)?.note ?? "Enter the site's fee."} Fees change, so check them now and then.</p>
              <dl className="mt-4 space-y-1.5 text-[.9rem]">
                <Row label="Parts + tax" value={money(rt.parts + rt.tax)} />
                {num(q.extra_costs) > 0 && <Row label="Other costs" value={money(num(q.extra_costs))} />}
                <Row label={<b>Your cost</b>} value={<b className="text-ink">{money(rt.cost)}</b>} />
                <div className="border-t border-line pt-2"><Row label="List price" value={money(rt.list)} /></div>
                <Row label={`Fees${q.platform ? ` (${q.platform.replace(/ \(.*\)/, "")})` : ""}`} value={`−${money(rt.fees)}`} />
                {rt.shipping > 0 && <Row label="Shipping" value={`−${money(rt.shipping)}`} />}
                <Row label="You get paid" value={money(rt.payout)} />
                <div className="border-t border-line pt-2"><Row label={<b>Profit</b>} value={<b className={`text-[1.15rem] ${rt.profit < 0 ? "text-danger" : "text-accent"}`}>{rt.list ? money(rt.profit) : "–"}</b>} /></div>
                <Row label="Margin" value={rt.list ? pct(rt.profit / rt.list) : "–"} />
                <Row label="Break-even price" value={money(rt.breakEven)} />
              </dl>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[50, 75, 100, 150].map((p) => {
                  const price = Math.ceil((rt.breakEven + p / Math.max(0.01, 1 - num(q.fee_pct))) / 5) * 5;
                  return <button key={p} type="button" className="rounded-full border border-line px-2.5 py-1 text-[.75rem] text-muted hover:border-accent hover:text-ink" onClick={() => set("list_price", price)} title={`List at ${money(price)}`}>~${p} profit → {money(price).replace(".00", "")}</button>;
                })}
              </div>
            </div>
          ) : (
            <div className="card p-5">
              <h2 className="text-[1.05rem]">Price</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <L label="Build fee"><Money value={q.build_fee} onChange={(v) => set("build_fee", v)} /></L>
                <L label="Tax %"><Num value={+(num(q.tax_rate) * 100).toFixed(2)} onChange={(v) => set("tax_rate", num(v) / 100)} /></L>
                <L label="Your extra costs" wide><Money value={q.extra_costs} onChange={(v) => set("extra_costs", v)} /></L>
              </div>
              <p className="mt-1 text-[.72rem] text-muted">Extra costs are things the customer doesn't see, like shipping. They lower your profit.</p>
              <dl className="mt-4 space-y-1.5 text-[.9rem]">
                <Row label="Parts" value={money(ct.parts)} />
                <Row label={`Tax (${+(num(q.tax_rate) * 100).toFixed(2)}%)`} value={money(ct.tax)} />
                <Row label="Build fee" value={money(ct.fee)} />
                <div className="border-t border-line pt-2"><Row label={<b>Customer pays</b>} value={<b className="text-[1.15rem] text-ink">{money(ct.total)}</b>} /></div>
                <Row label="Your cost" value={money(ct.cost)} />
                <Row label={<b>Your profit</b>} value={<b className={ct.profit < 0 ? "text-danger" : "text-accent"}>{money(ct.profit)}</b>} />
                <Row label="Margin" value={ct.total ? pct(ct.profit / ct.total) : "–"} />
                {ct.upgrades > 0 && <Row label="Optional upgrades" value={`+${money(ct.upgrades * (1 + num(q.tax_rate)))}`} />}
              </dl>
              <fieldset className="mt-4 text-[.85rem]">
                <legend className="mb-1.5 text-muted">Customer quote shows</legend>
                {([[false, "Simple", "Parts list and one total price."], [true, "Full breakdown", "Each part's price, tax and the build fee."]] as const).map(([v, label, sub]) => (
                  <label key={label} className="mb-1.5 flex items-start gap-2">
                    <input type="radio" name="quote-style" className="mt-1 h-4 w-4 accent-[var(--accent)]" checked={q.show_prices === v} onChange={() => set("show_prices", v)} />
                    <span><b className="font-medium text-ink">{label}</b><span className="block text-[.75rem] text-muted">{sub}</span></span>
                  </label>
                ))}
              </fieldset>
            </div>
          )}

          <div className="card space-y-2 p-5">
            <button type="button" className="btn w-full !py-2" disabled={!!busy || (!dirty && !!q.id)} onClick={() => run("save", async () => { if (await save()) flash("Saved."); })}>
              {busy === "save" ? "Saving…" : "Save"}
            </button>
            {!resale && (
              <button type="button" className="btn btn-ghost w-full !py-2 !text-[.88rem]" disabled={!!busy} onClick={() => exportIt("customer")}>
                {busy === "customer" ? "Making file…" : "⬇ Customer quote (Excel)"}
              </button>
            )}
            {resale && <button type="button" className="btn btn-ghost w-full !py-2 !text-[.88rem]" disabled={!named.length} onClick={copyListing}>⧉ Copy listing text</button>}
            <button type="button" className="btn btn-ghost w-full !py-2 !text-[.88rem]" disabled={!!busy} onClick={() => exportIt("internal")}>
              {busy === "internal" ? "Making file…" : "⬇ My copy with costs (Excel)"}
            </button>
            {q.job_id ? (
              <p className="rounded-card border border-accent/40 p-2.5 text-center text-[.82rem] text-accent">This is a job now (see the Jobs tab).</p>
            ) : (
              <button type="button" className="btn btn-ghost w-full !py-2 !text-[.88rem]" disabled={!!busy || !named.length} onClick={makeJob}>
                {busy === "job" ? "Making the job…" : resale ? "▶ Start the build (make a job)" : "✓ They said yes: make it a job"}
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

/** Search your past builds and pull one's parts into this quote. */
function BuildPicker({ builds, onPick, hasParts }: { builds: PastBuild[]; onPick: (b: PastBuild, replace: boolean) => void; hasParts: boolean }) {
  const [search, setSearch] = useState("");
  const words = norm(search).split(" ").filter(Boolean);
  const shown = builds.filter((b) => words.every((w) => norm(`${b.job.title} ${b.job.customer ?? ""} ${b.spec} ${b.parts.map((p) => p.name).join(" ")}`).includes(w))).slice(0, 12);
  return (
    <div className="mb-4 rounded-card border border-accent/30 bg-bg2 p-3">
      <input className="input !py-2 !text-[.88rem]" type="search" autoFocus placeholder="Search past builds: name, customer, part (e.g. “1660 super”)…"
        aria-label="Search past builds" value={search} onChange={(e) => setSearch(e.target.value)} />
      <ul className="mt-2 max-h-[22rem] divide-y divide-line overflow-y-auto">
        {shown.length === 0 && <li className="py-3 text-center text-[.85rem] text-muted">{builds.length ? "No builds match." : "Loading your builds…"}</li>}
        {shown.map((b) => (
          <li key={b.job.id} className="flex flex-wrap items-center gap-2 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[.9rem] text-ink">{b.job.title}</span>
              <span className="block truncate text-[.75rem] text-muted">{[b.spec, b.job.customer, `${b.parts.length} parts`, money(b.cost), day(jobDay(b.job))].filter(Boolean).join(" · ")}</span>
            </span>
            <button type="button" className="btn !px-3 !py-1 !text-[.78rem]" onClick={() => onPick(b, true)}>{hasParts ? "Replace list" : "Use these parts"}</button>
            {hasParts && <button type="button" className="btn btn-ghost !px-3 !py-1 !text-[.78rem]" onClick={() => onPick(b, false)}>Add to list</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Read a build sheet (by its link, or a downloaded Excel/CSV file) and pick which parts to bring in. */
function SheetImporter({ onPick, hasParts }: { onPick: (parts: FoundPart[], replace: boolean, from: string) => void; hasParts: boolean }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [found, setFound] = useState<FoundPart[] | null>(null);
  const [from, setFrom] = useState("");
  const [skip, setSkip] = useState<Set<number>>(new Set());
  const [over, setOver] = useState(false);

  const load = async (read: () => Promise<string[][]>, label: string) => {
    setBusy(true); setError(""); setFound(null); setSkip(new Set());
    try {
      const parts = findParts(await read());
      if (!parts.length) setError("I couldn't find any parts in that sheet. It needs a row with headers like “Part Name” and “Price” above the parts.");
      else { setFound(parts); setFrom(label); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that sheet.");
    }
    setBusy(false);
  };
  const fromLink = () => { if (url.trim()) load(() => fetchSheet(url.trim()), "the sheet"); };
  const fromFile = (f?: File | null) => { if (f) load(() => readFile(f), `“${f.name}”`); };
  const chosen = found?.filter((_, k) => !skip.has(k)) ?? [];
  const toggle = (k: number) => setSkip((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  return (
    <div className={`mb-4 rounded-card border bg-bg2 p-3 ${over ? "border-accent" : "border-accent/30"}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); fromFile(e.dataTransfer.files[0]); }}>
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); fromLink(); }}>
        <input className="input !py-2 !text-[.88rem] min-w-0 flex-1" type="url" autoFocus placeholder="Paste the Google Sheet's link (https://docs.google.com/spreadsheets/…)"
          aria-label="Google Sheet link" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button type="submit" className="btn !px-4 !py-1.5 !text-[.85rem]" disabled={busy || !url.trim()}>{busy ? "Reading…" : "Load"}</button>
        <label className="btn btn-ghost cursor-pointer !px-4 !py-1.5 !text-[.85rem]">
          Or pick a file
          <input type="file" className="sr-only" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            onChange={(e) => { fromFile(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </form>
      <p className="mt-1.5 text-[.75rem] text-muted">The sheet has to be shared as “Anyone with the link can view”. You can also drop a downloaded Excel or CSV file here.</p>
      {error && <p className="mt-2 text-[.85rem] text-danger" role="alert">{error}</p>}
      {found && (
        <>
          <ul className="mt-3 max-h-[22rem] divide-y divide-line overflow-y-auto rounded-card border border-line bg-card">
            {found.map((p, k) => (
              <li key={k}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-1.5 text-[.85rem]">
                  <input type="checkbox" checked={!skip.has(k)} onChange={() => toggle(k)} />
                  <span className="w-[4.5rem] shrink-0 text-[.78rem] text-muted sm:w-28 sm:text-[.85rem]">{p.category}</span>
                  <span className="min-w-0 flex-1 break-words text-ink sm:truncate">{p.name}</span>
                  <span className="hidden w-28 shrink-0 truncate text-muted sm:block">{p.source}</span>
                  <span className="w-[4.5rem] shrink-0 text-right font-mono">{money(p.price)}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="mr-auto text-[.8rem] text-muted">{chosen.length} of {found.length} parts · {money(chosen.reduce((t, p) => t + p.price, 0))}</span>
            <button type="button" className="btn !px-3 !py-1 !text-[.78rem]" disabled={!chosen.length} onClick={() => onPick(chosen, true, from)}>{hasParts ? "Replace list" : "Use these parts"}</button>
            {hasParts && <button type="button" className="btn btn-ghost !px-3 !py-1 !text-[.78rem]" disabled={!chosen.length} onClick={() => onPick(chosen, false, from)}>Add to list</button>}
          </div>
        </>
      )}
    </div>
  );
}

function L({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={`block ${wide ? "col-span-2" : ""}`}>
      <span className="mb-1 block text-[.8rem] text-muted">{label}</span>
      {children}
    </label>
  );
}

function Money({ value, onChange, big }: { value: number; onChange: (v: number) => void; big?: boolean }) {
  return (
    <span className="relative block">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
      <input className={`input !pl-7 ${big ? "!text-[1.1rem] font-medium" : ""}`} inputMode="decimal" value={value || value === 0 ? String(value) : ""} placeholder="0"
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, "") as unknown as number)} />
    </span>
  );
}

function Num({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return <input className="input" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, "") as unknown as number)} />;
}

function Row({ label, value }: { label: ReactNode; value: ReactNode }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted">{label}</dt><dd className="font-mono">{value}</dd></div>;
}

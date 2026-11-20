import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./client";
import { Totals } from "./Records";
import { PART_CATEGORIES, day, jobDay, money, num, pct, type JobRow, type PartRow } from "./money";

type Job = Pick<JobRow, "id" | "title" | "customer" | "kind" | "status" | "date" | "started_on">;
type Part = PartRow & { job: Job; total: number; year: string };

/** Which jobs' parts to count. Quotes are parts you never bought, so they're left out unless asked for. */
const SCOPES = [
  { id: "bought", label: "Finished and in-progress jobs", test: (j: Job) => j.status === "done" || j.status === "in progress" },
  { id: "done", label: "Finished jobs only", test: (j: Job) => j.status === "done" },
  { id: "all", label: "Everything, including quotes", test: (j: Job) => j.status !== "cancelled" },
] as const;

/** Lowercase, single-spaced, so "RTX 3060" and "rtx  3060 " count as the same part. */
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const catOrder = (c: string) => { const i = PART_CATEGORIES.indexOf(c as never); return i < 0 ? 99 : i; };

/** Where your money goes, part by part: spend per category, where you buy, and the parts you use most. */
export default function PartsTab() {
  const [rows, setRows] = useState<{ parts: PartRow[]; jobs: Job[] } | null>(null);
  const [error, setError] = useState("");
  const [scope, setScope] = useState<(typeof SCOPES)[number]["id"]>("bought");
  const [year, setYear] = useState("all");
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(100);

  const load = useCallback(async () => {
    const [p, j] = await Promise.all([
      supabase!.from("job_parts").select("*").limit(20000),
      supabase!.from("jobs").select("id, title, customer, kind, status, date, started_on").limit(5000),
    ]);
    const err = p.error ?? j.error;
    if (err) {
      setError(err.code === "PGRST205" || err.message.includes("does not exist")
        ? "The parts table isn't set up yet. Run the parts SQL file in Supabase (SQL Editor → New query → paste → Run)."
        : err.message);
      return;
    }
    setRows({ parts: p.data as PartRow[], jobs: j.data as Job[] });
  }, []);
  useEffect(() => { load(); }, [load]);

  // Every part joined to its job, with its line total (price × qty)
  const all = useMemo<Part[]>(() => {
    if (!rows) return [];
    const jobs = new Map(rows.jobs.map((j) => [j.id, j]));
    return rows.parts.flatMap((p) => {
      const job = jobs.get(p.job_id);
      return job ? [{ ...p, job, total: num(p.price) * num(p.qty), year: (jobDay(job) ?? "").slice(0, 4) }] : [];
    });
  }, [rows]);
  const years = useMemo(() => [...new Set(all.map((p) => p.year).filter(Boolean))].sort().reverse(), [all]);

  const test = SCOPES.find((s) => s.id === scope)!.test;
  const inScope = useMemo(() => all.filter((p) => test(p.job) && (year === "all" || p.year === year)), [all, test, year]);

  const s = useMemo(() => {
    const spent = inScope.reduce((a, p) => a + p.total, 0);
    const builds = new Set(inScope.map((p) => p.job_id));

    const cats = new Map<string, { n: number; total: number; min: number; max: number; jobs: Set<string> }>();
    for (const p of inScope) {
      const price = num(p.price);
      const c = cats.get(p.category) ?? { n: 0, total: 0, min: Infinity, max: 0, jobs: new Set<string>() };
      c.n += num(p.qty) || 1; c.total += p.total; c.jobs.add(p.job_id);
      if (price > 0) { c.min = Math.min(c.min, price); c.max = Math.max(c.max, price); }
      cats.set(p.category, c);
    }
    const byCat = [...cats.entries()].sort((a, b) => catOrder(a[0]) - catOrder(b[0]) || b[1].total - a[1].total);

    const src = new Map<string, { label: string; n: number; total: number }>();
    for (const p of inScope) {
      const key = p.source ? norm(p.source) : "";
      const v = src.get(key) ?? { label: p.source?.trim() || "Not recorded", n: 0, total: 0 };
      v.n++; v.total += p.total;
      src.set(key, v);
    }
    const sources = [...src.values()].sort((a, b) => b.total - a.total);

    const named = new Map<string, { name: string; category: string; n: number; prices: number[] }>();
    for (const p of inScope) {
      const key = `${p.category}|${norm(p.name)}`;
      const v = named.get(key) ?? { name: p.name.trim(), category: p.category, n: 0, prices: [] };
      v.n += num(p.qty) || 1;
      if (num(p.price) > 0) v.prices.push(num(p.price));
      named.set(key, v);
    }
    const repeat = [...named.values()].filter((v) => v.n > 1).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).slice(0, 20);

    return { spent, builds: builds.size, byCat, sources, repeat };
  }, [inScope]);

  const list = useMemo(() => {
    const words = norm(q).split(" ").filter(Boolean);
    return inScope
      .filter((p) => !cat || p.category === cat)
      .filter((p) => words.every((w) => norm(`${p.name} ${p.source ?? ""} ${p.job.title} ${p.job.customer ?? ""}`).includes(w)))
      .sort((a, b) => (jobDay(b.job) ?? "").localeCompare(jobDay(a.job) ?? "") || a.sort - b.sort);
  }, [inScope, cat, q]);

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.8rem]">Parts</h1>
          <p className="text-[.92rem] text-muted">What you spend on each kind of part, where you buy, and what you use most. Add parts from a job in the Jobs tab.</p>
        </div>
        <button type="button" className="btn btn-ghost !py-2 !text-[.85rem]" onClick={load}>Refresh</button>
      </div>

      {error && <p className="mb-4 rounded-card border border-danger/40 p-3 text-[.9rem] text-danger" role="alert">{error}</p>}
      {!rows && !error && <p className="text-muted">Loading…</p>}

      {rows && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <select className="input !w-auto !py-2 !text-[.85rem]" aria-label="Which jobs" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
              {SCOPES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <select className="input !w-auto !py-2 !text-[.85rem]" aria-label="Year" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="all">All years</option>
              {years.map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>

          <Totals items={[
            { label: "Spent on parts", value: money(s.spent) },
            { label: "Builds with parts", value: String(s.builds) },
            { label: "Avg parts per build", value: s.builds ? money(s.spent / s.builds) : "–" },
            { label: "Parts logged", value: String(inScope.length) },
          ]} />

          <div className="card overflow-x-auto p-5">
            <h2 className="text-[1.05rem]">By category</h2>
            <p className="text-[.8rem] text-muted">Tap a category to see its parts below. "Per build" is the average for builds that had one.</p>
            {s.byCat.length === 0 ? <p className="mt-4 text-[.9rem] text-muted">No parts here yet.</p> : (
              <table className="mt-3 w-full min-w-[36rem] text-[.88rem]">
                <thead className="text-left text-[.75rem] text-muted">
                  <tr><th className="py-1.5 font-normal">Category</th><th className="font-normal">Share of spend</th><th className="text-right font-normal">Total</th><th className="text-right font-normal">Count</th><th className="text-right font-normal">Per build</th><th className="text-right font-normal">Cheapest – priciest</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {s.byCat.map(([c, v]) => (
                    <tr key={c} className={cat === c ? "bg-bg2" : ""}>
                      <td className="py-2 pr-3">
                        <button type="button" className={`text-left hover:text-accent ${cat === c ? "text-accent" : "text-ink"}`} onClick={() => setCat(cat === c ? "" : c)}>{c}</button>
                      </td>
                      <td className="w-[28%] pr-3">
                        <span className="flex items-center gap-2">
                          <span className="h-2 flex-1 rounded-full bg-bg2"><span className="block h-2 rounded-full bg-accent" style={{ width: `${s.spent ? (v.total / s.spent) * 100 : 0}%` }} /></span>
                          <span className="w-9 text-right font-mono text-[.75rem] text-muted">{s.spent ? pct(v.total / s.spent) : "–"}</span>
                        </span>
                      </td>
                      <td className="text-right font-mono">{money(v.total)}</td>
                      <td className="text-right font-mono">{v.n}</td>
                      <td className="text-right font-mono">{money(v.total / v.jobs.size)}</td>
                      <td className="whitespace-nowrap pl-3 text-right font-mono text-[.8rem] text-muted">{v.max ? `${money(v.min)} – ${money(v.max)}` : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="card p-5">
              <h2 className="text-[1.05rem]">Where you buy</h2>
              <ul className="mt-2 divide-y divide-line text-[.88rem]">
                {s.sources.map((v) => (
                  <li key={v.label} className="flex justify-between gap-3 py-2">
                    <span className="min-w-0 truncate">{v.label} <span className="text-muted">× {v.n}</span></span>
                    <span className="shrink-0 font-mono">{money(v.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-5">
              <h2 className="text-[1.05rem]">Parts you use again and again</h2>
              {s.repeat.length === 0 ? <p className="mt-2 text-[.88rem] text-muted">No part shows up more than once yet.</p> : (
                <ul className="mt-2 divide-y divide-line text-[.88rem]">
                  {s.repeat.map((v) => {
                    const avg = v.prices.length ? v.prices.reduce((a, b) => a + b, 0) / v.prices.length : 0;
                    return (
                      <li key={`${v.category}|${v.name}`} className="flex justify-between gap-3 py-2">
                        <span className="min-w-0"><span className="block truncate">{v.name} <span className="text-muted">× {v.n}</span></span><span className="text-[.75rem] text-muted">{v.category}</span></span>
                        <span className="shrink-0 text-right">
                          <span className="block font-mono">{avg ? `${money(avg)} avg` : "–"}</span>
                          {v.prices.length > 1 && <span className="font-mono text-[.72rem] text-muted">{money(Math.min(...v.prices))} – {money(Math.max(...v.prices))}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[1.05rem]">{cat ? `${cat} parts` : "Every part"} <span className="text-[.85rem] text-muted">({list.length})</span></h2>
              <div className="flex flex-wrap gap-2">
                <select className="input !w-auto !py-1.5 !text-[.85rem]" aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}>
                  <option value="">All categories</option>
                  {s.byCat.map(([c]) => <option key={c}>{c}</option>)}
                </select>
                <input className="input !w-56 !py-1.5 !text-[.85rem]" type="search" placeholder="Search parts, jobs, stores" aria-label="Search parts" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </div>
            <ul className="mt-3 divide-y divide-line text-[.88rem]">
              {list.slice(0, limit).map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block">{p.name}{num(p.qty) > 1 && <span className="text-muted"> × {p.qty}</span>}</span>
                    <span className="block text-[.75rem] text-muted">
                      {[p.category, p.source, p.status !== "bought" ? p.status : null, p.job.title, day(jobDay(p.job))].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono">{money(p.total)}</span>
                </li>
              ))}
            </ul>
            {list.length > limit && (
              <button type="button" className="btn btn-ghost mt-3 !py-1.5 !text-[.82rem]" onClick={() => setLimit(limit + 200)}>Show more ({list.length - limit} left)</button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

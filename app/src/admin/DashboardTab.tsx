import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./client";
import {
  countsTowardProfit, money, moneyShort, num, pct,
  type ExpenseRow, type InventoryRow, type JobRow, type PrinterRow, type PrintRow,
} from "./money";

interface Data { jobs: JobRow[]; expenses: ExpenseRow[]; prints: PrintRow[]; printers: PrinterRow[]; inventory: InventoryRow[] }

const monthKey = (iso: string) => iso.slice(0, 7);
const monthLabel = (key: string) => new Date(`${key}-15T12:00:00`).toLocaleDateString(undefined, { month: "short", year: "2-digit" });

/** The big picture: money in, money out, profit, and how it changes month to month. */
export default function DashboardTab({ go }: { go: (tab: "jobs" | "expenses" | "prints" | "inventory") => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const tables = ["jobs", "expenses", "prints", "printers", "inventory"] as const;
    const res = await Promise.all(tables.map((t) => supabase!.from(t).select("*").limit(5000)));
    const failed = res.find((r) => r.error);
    if (failed?.error) {
      setError(failed.error.message.includes("does not exist") || failed.error.code === "42P01" || failed.error.code === "PGRST205"
        ? "The business tables aren't set up yet. Run supabase/business.sql in Supabase (SQL Editor → New query → paste → Run)."
        : failed.error.message);
      return;
    }
    const [jobs, expenses, prints, printers, inventory] = res.map((r) => r.data ?? []);
    setData({ jobs, expenses, prints, printers, inventory } as Data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const s = useMemo(() => {
    if (!data) return null;
    const done = data.jobs.filter(countsTowardProfit);
    const jobRev = done.reduce((a, j) => a + num(j.revenue), 0);
    const jobCost = done.reduce((a, j) => a + num(j.cost), 0);
    const printRev = data.prints.reduce((a, p) => a + num(p.price), 0);
    const printCost = data.prints.reduce((a, p) => a + num(p.filament_cost), 0);
    const overhead = data.expenses.reduce((a, e) => a + num(e.amount), 0);
    const revenue = jobRev + printRev;
    const net = jobRev - jobCost + printRev - printCost - overhead;
    const printerCost = data.printers.reduce((a, p) => a + num(p.purchase_price), 0);
    const tiedUp = data.jobs.filter((j) => j.status === "in progress").reduce((a, j) => a + num(j.cost), 0);
    const stock = data.inventory.filter((i) => i.status === "on hand").reduce((a, i) => a + num(i.cost) * num(i.qty), 0);

    // Net profit per month (only things with a date)
    const months = new Map<string, { jobs: number; prints: number; expenses: number }>();
    const add = (iso: string | null, k: "jobs" | "prints" | "expenses", v: number) => {
      if (!iso) return;
      const m = months.get(monthKey(iso)) ?? { jobs: 0, prints: 0, expenses: 0 };
      m[k] += v;
      months.set(monthKey(iso), m);
    };
    done.forEach((j) => add(j.date, "jobs", num(j.profit)));
    data.prints.forEach((p) => add(p.date, "prints", num(p.profit)));
    data.expenses.forEach((e) => add(e.date, "expenses", num(e.amount)));
    const keys = [...months.keys()].sort();
    const series: { key: string; net: number; jobs: number; prints: number; expenses: number }[] = [];
    if (keys.length) {
      // Fill empty months so the chart has no gaps; show at most the last 12
      const [y0, m0] = keys[0].split("-").map(Number);
      const [y1, m1] = keys[keys.length - 1].split("-").map(Number);
      for (let y = y0, m = m0; y < y1 || (y === y1 && m <= m1); m === 12 ? (y++, m = 1) : m++) {
        const key = `${y}-${String(m).padStart(2, "0")}`;
        const v = months.get(key) ?? { jobs: 0, prints: 0, expenses: 0 };
        series.push({ key, ...v, net: v.jobs + v.prints - v.expenses });
      }
    }
    const undated = done.filter((j) => !j.date).length;

    const byKind = new Map<string, { n: number; profit: number; revenue: number }>();
    for (const j of done) {
      const k = byKind.get(j.kind) ?? { n: 0, profit: 0, revenue: 0 };
      k.n++; k.profit += num(j.profit); k.revenue += num(j.revenue);
      byKind.set(j.kind, k);
    }
    const top = [...done].sort((a, b) => num(b.profit) - num(a.profit)).slice(0, 5);
    const losers = done.filter((j) => num(j.profit) < 0).length;

    return {
      revenue, net, jobRev, jobProfit: jobRev - jobCost, printRev, printProfit: printRev - printCost, overhead,
      printerCost, tiedUp, stock, series: series.slice(-12), undated, byKind, top, losers,
      jobsDone: done.length, prints: data.prints.length, avgProfit: done.length ? (jobRev - jobCost) / done.length : 0,
      open: data.jobs.filter((j) => j.status === "in progress" || j.status === "quote").length,
    };
  }, [data]);

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.8rem]">Dashboard</h1>
          <p className="text-[.92rem] text-muted">PC jobs, 3D prints and expenses together. Personal PCs and unfinished jobs don't count toward profit.</p>
        </div>
        <button type="button" className="btn btn-ghost !py-2 !text-[.85rem]" onClick={load}>Refresh</button>
      </div>

      {error && <p className="mb-4 rounded-card border border-danger/40 p-3 text-[.9rem] text-danger" role="alert">{error}</p>}
      {!s && !error && <p className="text-muted">Loading…</p>}

      {s && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label="Net profit" value={money(s.net)} sub="jobs + prints − expenses" tone={s.net < 0 ? "bad" : "good"} big />
            <Tile label="Revenue" value={money(s.revenue)} sub={`${s.jobsDone} jobs · ${s.prints} prints`} big />
            <Tile label="Profit margin" value={s.revenue ? pct(s.net / s.revenue) : "–"} sub="net profit ÷ revenue" big />
            <Tile label="Avg profit per job" value={money(s.avgProfit)} sub={s.losers ? `${s.losers} jobs lost money` : "no jobs lost money"} big />
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="card p-5">
              <h2 className="text-[1.05rem]">Net profit by month</h2>
              <p className="text-[.8rem] text-muted">
                Last 12 months with dated entries.
                {s.undated > 0 && <> {s.undated} finished jobs have no date yet, so they're in the totals but not here.</>}
              </p>
              <MonthChart series={s.series} />
            </div>

            <div className="card p-5">
              <h2 className="text-[1.05rem]">Where it comes from</h2>
              <ul className="mt-3 divide-y divide-line text-[.9rem]">
                <Line label="PC jobs" sub={`${money(s.jobRev)} in`} value={s.jobProfit} onClick={() => go("jobs")} />
                <Line label="3D prints" sub={`${money(s.printRev)} in`} value={s.printProfit} onClick={() => go("prints")} />
                <Line label="Expenses" sub="tools, supplies, fees" value={-s.overhead} onClick={() => go("expenses")} />
                <li className="flex justify-between py-2.5 font-medium"><span>Net profit</span><span className={`font-mono ${s.net < 0 ? "text-danger" : "text-accent"}`}>{money(s.net)}</span></li>
              </ul>
              <h3 className="mt-5 text-[.85rem] text-muted">By job type</h3>
              <ul className="mt-1 text-[.85rem]">
                {[...s.byKind.entries()].sort((a, b) => b[1].profit - a[1].profit).map(([k, v]) => (
                  <li key={k} className="flex justify-between py-1">
                    <span className="capitalize">{k} <span className="text-muted">× {v.n}</span></span>
                    <span className="font-mono">{money(v.profit)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="card p-5 lg:col-span-2">
              <h2 className="text-[1.05rem]">Most profitable jobs</h2>
              <ol className="mt-2 divide-y divide-line text-[.9rem]">
                {s.top.map((j) => (
                  <li key={j.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate">{j.title}{j.customer && <span className="text-muted"> · {j.customer}</span>}</span>
                    <span className="shrink-0 font-mono text-accent">{money(j.profit)}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="grid content-start gap-3">
              <Tile label="Open jobs and quotes" value={String(s.open)} sub={`${money(s.tiedUp)} spent on unfinished builds`} onClick={() => go("jobs")} />
              <Tile label="Inventory on hand" value={money(s.stock)} sub="what you paid" onClick={() => go("inventory")} />
              <Tile label="3D printers" value={money(s.printerCost)} sub={s.printerCost ? `${pct(Math.min(1, Math.max(0, s.printProfit) / s.printerCost))} paid back by prints` : "none added"} onClick={() => go("prints")} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Tile({ label, value, sub, tone, big, onClick }: { label: string; value: string; sub?: string; tone?: "good" | "bad"; big?: boolean; onClick?: () => void }) {
  const body = (
    <>
      <span className="block text-[.78rem] text-muted">{label}</span>
      <span className={`block font-mono ${big ? "text-[1.45rem]" : "text-[1.15rem]"} ${tone === "bad" ? "text-danger" : tone === "good" ? "text-accent" : "text-ink"}`}>{value}</span>
      {sub && <span className="block text-[.75rem] text-muted">{sub}</span>}
    </>
  );
  return onClick
    ? <button type="button" onClick={onClick} className="card block w-full p-4 text-left text-ink hover:border-ink/40">{body}</button>
    : <div className="card p-4">{body}</div>;
}

function Line({ label, sub, value, onClick }: { label: string; sub: string; value: number; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex w-full items-center justify-between py-2.5 text-left text-ink hover:text-accent">
        <span>{label} <span className="text-[.8rem] text-muted">{sub}</span></span>
        <span className={`font-mono ${value < 0 ? "text-danger" : "text-ink"}`}>{money(value)}</span>
      </button>
    </li>
  );
}

/** Bars for net profit per month, growing up from zero (down, in red, for a month that lost money). Hover or tap a bar for its breakdown. */
function MonthChart({ series }: { series: { key: string; net: number; jobs: number; prints: number; expenses: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!series.length) return <p className="mt-6 text-center text-[.9rem] text-muted">No dated jobs, prints or expenses yet.</p>;
  const max = Math.max(1, ...series.map((m) => m.net));
  const min = Math.min(0, ...series.map((m) => m.net));
  const span = max - min;
  const H = 180;
  const zero = (max / span) * H;
  const h = hover == null ? null : series[hover];

  return (
    <div className="mt-4">
      <div className="mb-2 h-10 text-[.8rem]" aria-live="polite">
        {h ? (
          <>
            <span className="font-medium">{monthLabel(h.key)}: </span>
            <span className={`font-mono ${h.net < 0 ? "text-danger" : "text-accent"}`}>{money(h.net)}</span>
            <span className="block text-muted">jobs {money(h.jobs)} · prints {money(h.prints)} · expenses −{money(h.expenses)}</span>
          </>
        ) : <span className="text-muted">Hover or tap a month for details.</span>}
      </div>
      <div className="relative" style={{ height: H }} onMouseLeave={() => setHover(null)}>
        <span className="absolute inset-x-0 border-t border-line" style={{ top: zero }} aria-hidden="true" />
        <span className="absolute right-0 -translate-y-full font-mono text-[.68rem] text-muted" style={{ top: 0 }}>{moneyShort(max)}</span>
        <div className="absolute inset-0 flex gap-[2px]">
          {series.map((m, i) => {
            const barH = (Math.abs(m.net) / span) * H;
            return (
              <button key={m.key} type="button" className="group relative h-full flex-1" aria-label={`${monthLabel(m.key)}: ${money(m.net)}`}
                onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onClick={() => setHover(i)}>
                <span className={`absolute inset-x-[18%] ${m.net < 0 ? "rounded-b-[4px] bg-danger" : "rounded-t-[4px] bg-accent"} ${hover === i ? "opacity-100" : "opacity-80"}`}
                  style={m.net < 0 ? { top: zero, height: Math.max(1, barH) } : { top: zero - barH, height: Math.max(m.net ? 1 : 0, barH) }} />
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-1 flex gap-[2px]">
        {series.map((m, i) => (
          <span key={m.key} className={`flex-1 text-center font-mono text-[.62rem] ${hover === i ? "text-ink" : "text-muted"}`}>
            {series.length > 8 && i % 2 ? "" : monthLabel(m.key)}
          </span>
        ))}
      </div>
    </div>
  );
}

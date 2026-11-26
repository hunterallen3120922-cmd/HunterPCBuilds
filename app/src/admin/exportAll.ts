import { supabase } from "./client";
import {
  countsTowardProfit, jobDay, num, quoteTotals, resaleTotals, today,
  type ExpenseRow, type InventoryRow, type JobRow, type PartRow, type PrinterRow, type PrintRow, type QuoteItemRow, type QuoteRow,
} from "./money";

const BLUE = "FF1D4ED8";
const MUTED = "FF6B7280";
const MONEY = '"$"#,##0.00';
const PCT = "0%";

interface RequestRow { id: string; created_at: string; type: string; name: string | null; email: string | null; phone: string | null; fields: Record<string, string> | null; status: string; notes: string | null }
interface SiteBuild { id: string; title: string; specs: string[]; price: string | null; photos: string[]; featured: boolean; in_gallery: boolean; in_slideshow: boolean; published: boolean; created_at: string }

/** Reads a whole table, 1000 rows at a time (Supabase sends at most 1000 per request). */
async function all<T>(table: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase!.from(table).select("*").range(from, from + 999);
    if (error) {
      // A table you haven't set up yet just comes out empty
      if (error.code === "42P01" || error.code === "PGRST205" || /does not exist/.test(error.message)) return out;
      throw new Error(`Couldn't read ${table}: ${error.message}`);
    }
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return out;
  }
}

function groupBy<T, K>(rows: T[], key: (r: T) => K) {
  const m = new Map<K, T[]>();
  for (const r of rows) { const k = key(r); const list = m.get(k); if (list) list.push(r); else m.set(k, [r]); }
  return m;
}
const d = (iso: string | null | undefined) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00`) : null);
const byDate = <T,>(rows: T[], get: (r: T) => string | null | undefined) =>
  [...rows].sort((a, b) => (get(b) ?? "").localeCompare(get(a) ?? ""));

type Kind = "text" | "money" | "date" | "num" | "pct" | "bool";
type Column<T> = [head: string, get: (r: T) => unknown, kind?: Kind, width?: number];

/**
 * Downloads one Excel file with everything in the admin portal:
 * a summary, then a sheet for each part of the business.
 */
export async function downloadEverything() {
  const [jobs, parts, quotes, quoteItems, expenses, prints, printers, inventory, requests, builds] = await Promise.all([
    all<JobRow>("jobs"), all<PartRow>("job_parts"), all<QuoteRow>("quotes"), all<QuoteItemRow>("quote_items").then((l) => l.filter((i) => i.name?.trim())),
    all<ExpenseRow>("expenses"), all<PrintRow>("prints"), all<PrinterRow>("printers"), all<InventoryRow>("inventory"),
    all<RequestRow>("requests"), all<SiteBuild>("builds"),
  ]);
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "HunterPCBuilds";
  wb.created = new Date();

  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const printerById = new Map(printers.map((p) => [p.id, p]));
  const quoteById = new Map(quotes.map((q) => [q.id, q]));
  const partsByJob = groupBy(parts, (p) => p.job_id);
  const itemsByQuote = groupBy(quoteItems, (i) => i.quote_id);

  /** A sheet with a blue header row, filters, frozen header and the right number formats. */
  function table<T>(name: string, rows: T[], cols: Column<T>[], totals?: string[]) {
    const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = cols.map(([head, , kind, width]) => ({
      header: head,
      width: width ?? (kind === "money" ? 13 : kind === "date" ? 12 : kind === "num" || kind === "pct" || kind === "bool" ? 9 : 22),
      style: { font: { name: "Calibri", size: 11 }, numFmt: kind === "money" ? MONEY : kind === "date" ? "mmm d, yyyy" : kind === "pct" ? PCT : undefined },
    }));
    for (const r of rows) {
      ws.addRow(cols.map(([, get, kind]) => {
        const v = get(r);
        if (v == null || v === "") return null;
        if (kind === "money" || kind === "num" || kind === "pct") return num(v);
        if (kind === "date") return d(String(v));
        if (kind === "bool") return v ? "Yes" : null;
        return String(v);
      }));
    }
    const head = ws.getRow(1);
    head.font = { name: "Calibri", bold: true, color: { argb: "FFFFFFFF" } };
    head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    head.height = 20;
    if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
    // Optional totals row under money columns
    if (totals && rows.length) {
      const r = ws.addRow([]);
      r.getCell(1).value = "Total";
      r.font = { name: "Calibri", bold: true };
      cols.forEach(([head], k) => {
        if (!totals.includes(head)) return;
        const letter = ws.getColumn(k + 1).letter;
        r.getCell(k + 1).value = { formula: `SUBTOTAL(9,${letter}2:${letter}${rows.length + 1})` };
      });
      r.border = { top: { style: "thin", color: { argb: BLUE } } };
    }
    return ws;
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const done = jobs.filter(countsTowardProfit);
  const jobRev = done.reduce((a, j) => a + num(j.revenue), 0);
  const jobCost = done.reduce((a, j) => a + num(j.cost), 0);
  const printRev = prints.reduce((a, p) => a + num(p.price), 0);
  const printCost = prints.reduce((a, p) => a + num(p.filament_cost), 0);
  const overhead = expenses.reduce((a, e) => a + num(e.amount), 0);
  const revenue = jobRev + printRev;
  const net = jobRev - jobCost + printRev - printCost - overhead;

  const sum = wb.addWorksheet("Summary", { views: [{ showGridLines: false }], pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  sum.columns = [{ width: 34 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }];
  sum.getCell("A1").value = "HunterPCBuilds";
  sum.getCell("A1").font = { name: "Calibri", size: 20, bold: true, color: { argb: BLUE } };
  sum.getCell("A2").value = `Everything in the admin portal, exported ${new Date().toLocaleString()}`;
  sum.getCell("A2").font = { name: "Calibri", color: { argb: MUTED } };
  sum.getCell("A3").value = "Profit counts finished jobs only (not personal PCs or jobs still in progress).";
  sum.getCell("A3").font = { name: "Calibri", italic: true, size: 10, color: { argb: MUTED } };
  let r = 5;
  const heading = (text: string) => {
    r++;
    const c = sum.getCell(r, 1); c.value = text; c.font = { name: "Calibri", size: 13, bold: true, color: { argb: BLUE } };
    r++;
  };
  const line = (label: string, value: number | string, fmt: string | null = MONEY, bold = false) => {
    sum.getCell(r, 1).value = label;
    const c = sum.getCell(r, 2); c.value = value; if (fmt && typeof value === "number") c.numFmt = fmt;
    sum.getRow(r).font = { name: "Calibri", bold };
    r++;
  };
  const grid = (heads: string[], rows: (string | number)[][], fmts: (string | null)[]) => {
    heads.forEach((h, k) => { const c = sum.getCell(r, k + 1); c.value = h; c.font = { name: "Calibri", bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } }; });
    r++;
    for (const row of rows) {
      row.forEach((v, k) => { const c = sum.getCell(r, k + 1); c.value = v; c.font = { name: "Calibri" }; if (fmts[k] && typeof v === "number") c.numFmt = fmts[k]!; });
      r++;
    }
  };

  r = 4;
  heading("The big picture");
  line("Net profit (jobs + prints − expenses)", net, MONEY, true);
  line("Revenue", revenue);
  line("Profit margin", revenue ? net / revenue : 0, PCT);
  line("PC jobs finished", done.length, null);
  line("PC job revenue", jobRev);
  line("PC job profit", jobRev - jobCost);
  line("Average profit per job", done.length ? (jobRev - jobCost) / done.length : 0);
  line("Jobs that lost money", done.filter((j) => num(j.profit) < 0).length, null);
  line("3D prints", prints.length, null);
  line("3D print revenue", printRev);
  line("3D print profit", printRev - printCost);
  line("Expenses (overhead)", overhead);
  line("Printers bought", printers.reduce((a, p) => a + num(p.purchase_price), 0));
  line("Money tied up in jobs in progress", jobs.filter((j) => j.status === "in progress").reduce((a, j) => a + num(j.cost), 0));
  line("Parts on hand (inventory value)", inventory.filter((i) => i.status === "on hand").reduce((a, i) => a + num(i.cost) * num(i.qty), 0));
  line("Open jobs (quote or in progress)", jobs.filter((j) => j.status === "in progress" || j.status === "quote").length, null);
  line("Jobs flagged to double-check", jobs.filter((j) => j.needs_review).length, null);

  heading("By kind of job");
  const kinds = [...groupBy(done, (j) => j.kind)].map(([k, js]) => {
    const rev = js.reduce((a, j) => a + num(j.revenue), 0), prof = js.reduce((a, j) => a + num(j.profit), 0);
    return [k[0].toUpperCase() + k.slice(1), js.length, rev, prof, js.length ? prof / js.length : 0, rev ? prof / rev : 0];
  }).sort((a, b) => (b[3] as number) - (a[3] as number));
  grid(["Kind", "Jobs", "Revenue", "Profit", "Avg profit", "Margin"], kinds, [null, null, MONEY, MONEY, MONEY, PCT]);

  heading("By year");
  const years = new Map<string, { jobs: number; jobProfit: number; prints: number; expenses: number; revenue: number }>();
  const yr = (iso: string | null) => (iso ? iso.slice(0, 4) : "No date");
  const y = (k: string) => years.get(k) ?? (years.set(k, { jobs: 0, jobProfit: 0, prints: 0, expenses: 0, revenue: 0 }), years.get(k)!);
  done.forEach((j) => { const v = y(yr(jobDay(j))); v.jobs++; v.jobProfit += num(j.profit); v.revenue += num(j.revenue); });
  prints.forEach((p) => { const v = y(yr(p.date)); v.prints += num(p.profit); v.revenue += num(p.price); });
  expenses.forEach((e) => { y(yr(e.date)).expenses += num(e.amount); });
  grid(["Year", "Jobs", "Revenue", "Job profit", "Print profit", "Expenses", "Net profit"],
    [...years].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, v.jobs, v.revenue, v.jobProfit, v.prints, v.expenses, v.jobProfit + v.prints - v.expenses]),
    [null, null, MONEY, MONEY, MONEY, MONEY, MONEY]);

  heading("Where the parts come from");
  const stores = [...groupBy(parts, (p) => p.source || "Not noted")].map(([s, ps]) => [s, ps.length, ps.reduce((a, p) => a + num(p.price) * (num(p.qty) || 1), 0)] as [string, number, number])
    .sort((a, b) => b[2] - a[2]);
  // The biggest 12, then everything else on one line
  const rest = stores.slice(12);
  if (rest.length) stores.splice(12, rest.length, [`${rest.length} others`, rest.reduce((a, x) => a + x[1], 0), rest.reduce((a, x) => a + x[2], 0)]);
  grid(["Store", "Parts", "Spent"], stores, [null, null, MONEY]);

  heading("Spend by part type");
  const cats = [...groupBy(parts, (p) => p.category)].map(([c, ps]) => {
    const spent = ps.reduce((a, p) => a + num(p.price) * (num(p.qty) || 1), 0);
    return [c, ps.length, spent, ps.length ? spent / ps.length : 0] as [string, number, number, number];
  }).sort((a, b) => b[2] - a[2]);
  grid(["Part type", "Parts", "Spent", "Avg price"], cats, [null, null, MONEY, MONEY]);

  heading("What's in this file");
  const contents: [string, number][] = [
    ["Monthly", 0], ["Jobs", jobs.length], ["Job parts", parts.length], ["Quotes", quotes.length], ["Quote parts", quoteItems.length],
    ["Expenses", expenses.length], ["3D prints", prints.length], ["Printers", printers.length], ["Inventory", inventory.length],
    ["Requests", requests.length], ["Site builds", builds.length],
  ];
  grid(["Sheet", "Rows"], contents.map(([n, c]) => [n, n === "Monthly" ? "–" : c]), [null, null]);

  // ── Monthly ──────────────────────────────────────────────────────────────
  const months = new Map<string, { jobs: number; jobRev: number; jobProfit: number; prints: number; printProfit: number; expenses: number }>();
  const m = (iso: string | null) => {
    if (!iso) return null;
    const k = iso.slice(0, 7);
    if (!months.has(k)) months.set(k, { jobs: 0, jobRev: 0, jobProfit: 0, prints: 0, printProfit: 0, expenses: 0 });
    return months.get(k)!;
  };
  done.forEach((j) => { const v = m(jobDay(j)); if (v) { v.jobs++; v.jobRev += num(j.revenue); v.jobProfit += num(j.profit); } });
  prints.forEach((p) => { const v = m(p.date); if (v) { v.prints++; v.printProfit += num(p.profit); } });
  expenses.forEach((e) => { const v = m(e.date); if (v) v.expenses += num(e.amount); });
  const monthRows = [...months].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ k, ...v, net: v.jobProfit + v.printProfit - v.expenses }));
  table("Monthly", monthRows, [
    ["Month", (x) => new Date(`${x.k}-15T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" }), "text", 12],
    ["Jobs", (x) => x.jobs, "num"], ["Job revenue", (x) => x.jobRev, "money"], ["Job profit", (x) => x.jobProfit, "money"],
    ["3D prints", (x) => x.prints, "num"], ["Print profit", (x) => x.printProfit, "money"], ["Expenses", (x) => x.expenses, "money"],
    ["Net profit", (x) => x.net, "money"],
  ], ["Jobs", "Job revenue", "Job profit", "3D prints", "Print profit", "Expenses", "Net profit"]);

  // ── Records ──────────────────────────────────────────────────────────────
  table("Jobs", byDate(jobs, jobDay), [
    ["Date", (j) => j.date, "date"], ["Started", (j) => j.started_on, "date"], ["Job", (j) => j.title, "text", 34], ["Customer", (j) => j.customer],
    ["Kind", (j) => j.kind, "text", 11], ["Status", (j) => j.status, "text", 12], ["Sold on", (j) => j.channel, "text", 16],
    ["Revenue", (j) => j.revenue, "money"], ["Cost", (j) => j.cost, "money"], ["Profit", (j) => j.profit, "money"],
    ["Margin", (j) => (num(j.revenue) ? num(j.profit) / num(j.revenue) : null), "pct"],
    ["Parts", (j) => partsByJob.get(j.id)?.length ?? 0, "num"], ["Batch", (j) => j.batch], ["Check", (j) => j.needs_review, "bool"],
    ["Notes", (j) => j.notes, "text", 40], ["Old sheet", (j) => j.sheet_url, "text", 30],
  ], ["Revenue", "Cost", "Profit"]);

  table("Job parts", [...parts].sort((a, b) => (jobDay(jobById.get(b.job_id) ?? { date: null, started_on: null }) ?? "").localeCompare(jobDay(jobById.get(a.job_id) ?? { date: null, started_on: null }) ?? "") || a.sort - b.sort), [
    ["Job", (p) => jobById.get(p.job_id)?.title, "text", 30], ["Job date", (p) => { const j = jobById.get(p.job_id); return j ? jobDay(j) : null; }, "date"],
    ["Category", (p) => p.category, "text", 14], ["Part", (p) => p.name, "text", 36], ["Price", (p) => p.price, "money"], ["Qty", (p) => p.qty, "num"],
    ["Total", (p) => num(p.price) * (num(p.qty) || 1), "money"], ["From", (p) => p.source, "text", 16], ["Status", (p) => p.status, "text", 11],
    ["Notes", (p) => p.notes, "text", 30],
  ], ["Total"]);

  const qt = (q: QuoteRow) => {
    const items = itemsByQuote.get(q.id) ?? [];
    return q.purpose === "resale" ? { kind: "resale" as const, r: resaleTotals(q, items) } : { kind: "customer" as const, t: quoteTotals(q, items) };
  };
  table("Quotes", byDate(quotes, (q) => q.created_at), [
    ["Made", (q) => q.created_at, "date"], ["Quote", (q) => q.title, "text", 34], ["For", (q) => (q.purpose === "resale" ? "To sell" : "Customer"), "text", 10],
    ["Status", (q) => q.status, "text", 10], ["Customer", (q) => q.customer], ["Contact", (q) => q.contact],
    ["Parts", (q) => { const x = qt(q); return x.kind === "resale" ? x.r.parts : x.t.parts; }, "money"],
    ["Tax", (q) => { const x = qt(q); return x.kind === "resale" ? x.r.tax : x.t.tax; }, "money"],
    ["Windows install", (q) => { const x = qt(q); return x.kind === "customer" && x.t.windowsName ? x.t.windows : null; }, "money"],
    ["Build fee", (q) => { const x = qt(q); return x.kind === "customer" ? x.t.fee : null; }, "money"],
    ["Customer pays", (q) => { const x = qt(q); return x.kind === "customer" ? x.t.total : null; }, "money"],
    ["List price", (q) => (q.purpose === "resale" ? q.list_price : null), "money"], ["Platform / Windows", (q) => q.platform, "text", 18],
    ["Fees", (q) => { const x = qt(q); return x.kind === "resale" ? x.r.fees : null; }, "money"],
    ["Your cost", (q) => { const x = qt(q); return x.kind === "resale" ? x.r.cost : x.t.cost; }, "money"],
    ["Profit", (q) => { const x = qt(q); return x.kind === "resale" ? x.r.profit : x.t.profit; }, "money"],
    ["Good until", (q) => q.valid_until, "date"], ["Became job", (q) => (q.job_id ? jobById.get(q.job_id)?.title ?? "yes" : null), "text", 24],
    ["Note to customer", (q) => q.customer_note, "text", 30], ["Notes", (q) => q.notes, "text", 30],
  ], ["Profit"]);

  table("Quote parts", [...quoteItems].sort((a, b) => (quoteById.get(b.quote_id)?.created_at ?? "").localeCompare(quoteById.get(a.quote_id)?.created_at ?? "") || a.sort - b.sort), [
    ["Quote", (i) => quoteById.get(i.quote_id)?.title, "text", 30], ["Category", (i) => i.category, "text", 14], ["Part", (i) => i.name, "text", 36],
    ["Price", (i) => i.price, "money"], ["Qty", (i) => i.qty, "num"], ["Total", (i) => num(i.price) * (num(i.qty) || 1), "money"],
    ["Extra", (i) => i.optional, "bool"], ["From", (i) => i.source, "text", 16], ["Link", (i) => i.link, "text", 40],
  ]);

  table("Expenses", byDate(expenses, (e) => e.date), [
    ["Date", (e) => e.date, "date"], ["Category", (e) => e.category, "text", 18], ["What", (e) => e.description, "text", 36],
    ["Amount", (e) => e.amount, "money"], ["Notes", (e) => e.notes, "text", 40],
  ], ["Amount"]);

  table("3D prints", byDate(prints, (p) => p.date), [
    ["Date", (p) => p.date, "date"], ["Item", (p) => p.item, "text", 30], ["Customer", (p) => p.customer], ["Printer", (p) => (p.printer_id ? printerById.get(p.printer_id)?.name : null), "text", 18],
    ["Material", (p) => p.material, "text", 10], ["Grams", (p) => p.grams, "num"], ["Price", (p) => p.price, "money"],
    ["Filament", (p) => p.filament_cost, "money"], ["Profit", (p) => p.profit, "money"], ["Notes", (p) => p.notes, "text", 30],
  ], ["Price", "Filament", "Profit"]);

  table("Printers", printers, [
    ["Printer", (p) => p.name, "text", 26], ["Bought", (p) => p.purchased_on, "date"], ["Price", (p) => p.purchase_price, "money"],
    ["Prints", (p) => prints.filter((x) => x.printer_id === p.id).length, "num"],
    ["Print profit", (p) => prints.filter((x) => x.printer_id === p.id).reduce((a, x) => a + num(x.profit), 0), "money"],
    ["Notes", (p) => p.notes, "text", 40],
  ], ["Price", "Print profit"]);

  table("Inventory", [...inventory].sort((a, b) => a.status.localeCompare(b.status) || a.category.localeCompare(b.category)), [
    ["Category", (i) => i.category, "text", 14], ["Part", (i) => i.name, "text", 36], ["Cost each", (i) => i.cost, "money"], ["Qty", (i) => i.qty, "num"],
    ["Value", (i) => num(i.cost) * num(i.qty), "money"], ["Status", (i) => i.status, "text", 10], ["Notes", (i) => i.notes, "text", 40],
  ], ["Value"]);

  const fieldKeys = [...new Set(requests.flatMap((q) => Object.keys(q.fields ?? {})))];
  table("Requests", byDate(requests, (q) => q.created_at), [
    ["Sent", (q) => q.created_at, "date"], ["Type", (q) => q.type, "text", 9], ["Status", (q) => q.status, "text", 10], ["Name", (q) => q.name],
    ["Email", (q) => q.email, "text", 26], ["Phone", (q) => q.phone, "text", 14],
    ...fieldKeys.map((k): Column<RequestRow> => [k, (q) => q.fields?.[k], "text", 24]),
    ["Notes", (q) => q.notes, "text", 30],
  ]);

  table("Site builds", builds, [
    ["Build", (b) => b.title, "text", 30], ["Specs", (b) => b.specs?.join(" · "), "text", 60], ["Price", (b) => b.price, "text", 12],
    ["Photos", (b) => b.photos?.length ?? 0, "num"], ["On site", (b) => b.published, "bool"], ["Featured", (b) => b.featured, "bool"],
    ["Added", (b) => b.created_at, "date"],
  ]);

  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `HunterPCBuilds everything ${today()}.xlsx` });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return { jobs: jobs.length, parts: parts.length, quotes: quotes.length };
}

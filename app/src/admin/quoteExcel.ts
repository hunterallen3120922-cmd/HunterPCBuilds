import { PART_CATEGORIES, day, num, quoteTotals, resaleTotals, today, type QuoteItemRow, type QuoteRow } from "./money";

type Item = Pick<QuoteItemRow, "category" | "name" | "price" | "qty" | "source" | "link" | "optional" | "bought">;
type Quote = Pick<QuoteRow, "title" | "customer" | "contact" | "tax_rate" | "build_fee" | "extra_costs" | "show_prices" | "valid_until" | "customer_note" | "notes"> & Partial<Pick<QuoteRow, "purpose" | "platform" | "list_price" | "fee_pct" | "fee_fixed" | "shipping">>;

const BLUE = "FF1D4ED8";
const INK = "FF16181D";
const MUTED = "FF6B7280";
const LINE = "FFD9DDE3";
const MONEY = '"$"#,##0.00';

const catOrder = (c: string) => { const i = PART_CATEGORIES.indexOf(c as never); return i < 0 ? 99 : i; };
const safe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim().slice(0, 80) || "Quote";

/**
 * Builds the quote as an Excel file and downloads it.
 * "customer": the parts list, tax, build fee and total, to send to the customer.
 * "internal": the same plus where each part comes from, links, your costs and profit.
 */
export async function downloadQuote(q: Quote, allItems: Item[], kind: "customer" | "internal") {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "HunterPCBuilds";
  const ws = wb.addWorksheet(kind === "customer" ? "Quote" : "My copy", {
    pageSetup: { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } },
    views: [{ showGridLines: false }],
  });
  const internal = kind === "internal";
  const prices = internal || q.show_prices;
  const t = quoteTotals(q, allItems);
  const items = [...allItems].filter((i) => i.name.trim()).sort((a, b) => Number(a.optional) - Number(b.optional) || catOrder(a.category) - catOrder(b.category));
  const main = items.filter((i) => !i.optional);
  const ups = items.filter((i) => i.optional);
  const taxPct = `${+(num(q.tax_rate) * 100).toFixed(2)}%`;

  // Columns are only added when they're needed: Qty only if something comes in more than one,
  // a price column on a simple quote only for the total and upgrade prices.
  const showQty = items.some((i) => num(i.qty) !== 1);
  type Col = { key: "cat" | "part" | "qty" | "price" | "total" | "amt" | "from" | "link"; w: number; head: string };
  const cols: Col[] = [
    { key: "cat", w: internal ? 14 : 16, head: "Category" },
    { key: "part", w: internal ? 40 : prices ? 46 : 54, head: "Part" },
    ...(showQty ? [{ key: "qty", w: 6, head: "Qty" } as Col] : []),
    ...(prices ? [{ key: "price", w: 13, head: "Price" } as Col, ...(showQty ? [{ key: "total", w: 13, head: "Total" } as Col] : [])] : [{ key: "amt", w: 15, head: "" } as Col]),
    ...(internal ? [{ key: "from", w: 16, head: "From" } as Col, { key: "link", w: 40, head: "Link" } as Col] : []),
  ];
  const col = (k: Col["key"]) => cols.findIndex((c) => c.key === k) + 1;
  const valueCol = col("total") || col("price") || col("amt");
  ws.columns = cols.map((c) => ({ width: c.w }));
  const last = cols.length;
  const lastCol = String.fromCharCode(64 + last);

  // Header
  ws.mergeCells(`A1:${lastCol}1`);
  Object.assign(ws.getCell("A1"), { value: "HunterPCBuilds" });
  ws.getCell("A1").font = { name: "Calibri", size: 20, bold: true, color: { argb: BLUE } };
  ws.getRow(1).height = 30;
  ws.mergeCells(`A2:${lastCol}2`);
  ws.getCell("A2").value = internal ? (q.purpose === "resale" ? "Build to sell: your copy" : "Quote: your copy (don't send this one)") : "Custom PC quote";
  ws.getCell("A2").font = { size: 12, color: { argb: internal ? "FFB45309" : MUTED } };

  let r = 4;
  const info = (label: string, value: string | null | undefined) => {
    if (!value) return;
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).font = { color: { argb: MUTED } };
    ws.mergeCells(r, 2, r, last);
    ws.getCell(r, 2).value = value;
    ws.getCell(r, 2).font = { bold: label === "Build", color: { argb: INK } };
    r++;
  };
  info("Build", q.title);
  info("For", q.customer);
  if (internal) info("Contact", q.contact);
  info("Date", day(today()));
  info("Good until", day(q.valid_until));
  r++;

  // Parts table
  const headRow = ws.getRow(r);
  cols.forEach((h, i) => {
    const c = headRow.getCell(i + 1);
    c.value = h.head;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    c.alignment = { vertical: "middle", horizontal: ["qty", "price", "total", "amt"].includes(h.key) ? "right" : "left", indent: h.key === "from" || h.key === "link" ? 1 : 0 };
  });
  headRow.height = 20;
  r++;
  const line = (i: Item, upgrade = false) => {
    const row = ws.getRow(r);
    const unit = upgrade && !internal ? num(i.price) * (1 + num(q.tax_rate)) : num(i.price);
    const qty = num(i.qty);
    const set = (k: Col["key"], v: unknown, fmt?: string) => { const n = col(k); if (!n) return; const c = row.getCell(n); c.value = v as never; if (fmt) c.numFmt = fmt; };
    set("cat", i.category);
    set("part", !showQty && qty > 1 ? `${i.name} (×${qty})` : i.name);
    set("qty", qty);
    if (prices) {
      // One price column when nothing has a quantity: show the line total there
      set("price", showQty ? unit : unit * qty, MONEY);
      set("total", unit * qty, MONEY);
      if (num(i.price) === 0 && !upgrade && !internal) set("price", "Included");
    } else if (upgrade) set("amt", unit * qty, '"+$"#,##0.00');
    set("from", [i.source, i.bought ? "bought ✓" : ""].filter(Boolean).join(" · "));
    if (i.link && col("link")) { set("link", { text: i.link, hyperlink: i.link }); row.getCell(col("link")).font = { color: { argb: BLUE }, underline: true }; }
    for (let k = 1; k <= last; k++) row.getCell(k).border = { bottom: { style: "thin", color: { argb: LINE } } };
    for (const k of ["qty", "price", "total", "amt"] as const) if (col(k)) row.getCell(col(k)).alignment = { horizontal: "right" };
    r++;
  };
  main.forEach((i) => line(i));
  // A simple quote has no price breakdown, so list the Windows install with the parts
  if (!prices && t.windowsName) line({ category: "Windows", name: `${t.windowsName} install and setup`, price: 0, qty: 1, source: "", link: "", optional: false });
  r++;

  // Totals
  const total = (label: string, value: number, opts: { bold?: boolean; color?: string; note?: string } = {}) => {
    const lc = valueCol - 1;
    const vc = valueCol;
    ws.getCell(r, lc).value = label;
    ws.getCell(r, lc).alignment = { horizontal: "right" };
    ws.getCell(r, lc).font = { bold: opts.bold, color: { argb: opts.color ?? INK } };
    ws.getCell(r, vc).value = value;
    ws.getCell(r, vc).numFmt = MONEY;
    ws.getCell(r, vc).font = { bold: opts.bold, color: { argb: opts.color ?? INK }, size: opts.bold ? 13 : 11 };
    if (opts.note && internal) { ws.getCell(r, col("from")).value = opts.note; ws.getCell(r, col("from")).font = { color: { argb: MUTED }, italic: true }; }
    r++;
  };
  if (internal && q.purpose === "resale") {
    // A build you're selling yourself: your cost, then what the sale brings in
    const rt = resaleTotals({ ...q, list_price: q.list_price ?? 0, fee_pct: q.fee_pct ?? 0, fee_fixed: q.fee_fixed ?? 0, shipping: q.shipping ?? 0 }, allItems);
    total("Parts", rt.parts);
    total(`Sales tax (${taxPct})`, rt.tax);
    if (num(q.extra_costs)) total("Other costs", num(q.extra_costs));
    total("Your cost", rt.cost, { bold: true });
    r++;
    total(`List price${q.platform ? ` (${q.platform})` : ""}`, rt.list);
    total("Fees", -rt.fees, { note: `${+(num(q.fee_pct) * 100).toFixed(2)}% + $${num(q.fee_fixed).toFixed(2)}` });
    if (rt.shipping) total("Shipping", -rt.shipping);
    total("You get paid", rt.payout);
    total("Profit", rt.profit, { bold: true, color: rt.profit < 0 ? "FFDC2626" : BLUE });
    total("Margin", rt.list ? rt.profit / rt.list : 0);
    ws.getCell(r - 1, valueCol).numFmt = "0%";
    total("Break-even price", rt.breakEven);
  } else {
    if (prices) {
      total("Parts", t.parts);
      total(`Sales tax (${taxPct})`, t.tax);
      if (t.windowsName) total(`${t.windowsName} install`, t.windows);
      if (t.fee) total("Build fee", t.fee, { note: t.custom ? "what's left of your price" : undefined });
      total("Total", t.total, { bold: true, color: BLUE, note: t.custom ? "your custom price" : undefined });
    } else {
      // Simple quote: one price for the finished PC, no breakdown
      total("Total (tax included)", t.total, { bold: true, color: BLUE, note: t.custom ? "your custom price" : undefined });
      ws.mergeCells(r, 1, r, last);
      ws.getCell(r, 1).value = "Includes every part listed, plus assembly, setup and testing.";
      ws.getCell(r, 1).font = { color: { argb: MUTED }, italic: true };
      ws.getCell(r, 1).alignment = { horizontal: "right" };
      r++;
    }
    if (internal) {
      r++;
      total("Your parts cost (with tax)", t.parts + t.tax);
      if (num(q.extra_costs)) total("Extra costs", num(q.extra_costs), { note: "shipping, fees…" });
      total("Your profit", t.profit, { bold: true, color: t.profit < 0 ? "FFDC2626" : BLUE });
      total("Margin", t.total ? t.profit / t.total : 0);
      ws.getCell(r - 1, valueCol).numFmt = "0%";
    }
  }

  if (ups.length) {
    r++;
    ws.getCell(r, 1).value = internal ? "Optional upgrades (not in the total)" : "Optional upgrades";
    ws.getCell(r, 1).font = { bold: true, size: 12 };
    r++;
    if (!internal) {
      ws.mergeCells(r, 1, r, last);
      ws.getCell(r, 1).value = prices ? "Want any of these? Each one adds its price (tax included) to the total." : "Want any of these? Each one adds its price to the total.";
      ws.getCell(r, 1).font = { color: { argb: MUTED }, italic: true };
      r++;
    }
    ups.forEach((i) => line(i, true));
  }

  const note = (title: string, text: string | null) => {
    if (!text?.trim()) return;
    r++;
    ws.getCell(r, 1).value = title;
    ws.getCell(r, 1).font = { bold: true };
    r++;
    ws.mergeCells(r, 1, r, last);
    const c = ws.getCell(r, 1);
    c.value = text.trim();
    c.alignment = { wrapText: true, vertical: "top" };
    ws.getRow(r).height = Math.min(300, 16 * Math.max(1, Math.ceil(text.length / 90) + (text.match(/\n/g)?.length ?? 0)));
    r++;
  };
  note("Notes", q.customer_note);
  if (internal) note("Private notes", q.notes);

  if (!internal) {
    r++;
    ws.mergeCells(r, 1, r, last);
    ws.getCell(r, 1).value = "Thanks for choosing HunterPCBuilds! Prices can change until parts are ordered.";
    ws.getCell(r, 1).font = { color: { argb: MUTED }, italic: true };
  }

  // One font everywhere, and a little gap between the money columns and "From"
  ws.eachRow({ includeEmpty: false }, (row) => row.eachCell({ includeEmpty: false }, (c) => {
    c.font = { name: "Calibri", size: 11, ...c.font };
    if (internal && Number(c.col) >= col("from")) c.alignment = { ...c.alignment, indent: 1 };
  }));

  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safe([q.customer, q.title].filter(Boolean).join(" - "))}${internal ? " (my copy)" : " - quote"}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

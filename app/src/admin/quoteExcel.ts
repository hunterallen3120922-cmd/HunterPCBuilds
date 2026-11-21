import { PART_CATEGORIES, day, num, quoteTotals, today, type QuoteItemRow, type QuoteRow } from "./money";

type Item = Pick<QuoteItemRow, "category" | "name" | "price" | "qty" | "source" | "link" | "optional">;
type Quote = Pick<QuoteRow, "title" | "customer" | "contact" | "tax_rate" | "build_fee" | "extra_costs" | "show_prices" | "valid_until" | "customer_note" | "notes">;

const GREEN = "FF1F9D55";
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

  // Columns: Category, Part, Qty, Price, Total (+ From, Link for your copy)
  const cols = internal
    ? [{ w: 14 }, { w: 40 }, { w: 6 }, { w: 12 }, { w: 12 }, { w: 16 }, { w: 40 }]
    : prices ? [{ w: 16 }, { w: 46 }, { w: 6 }, { w: 13 }, { w: 13 }] : [{ w: 18 }, { w: 56 }, { w: 12 }];
  ws.columns = cols.map((c) => ({ width: c.w }));
  const last = cols.length;
  const lastCol = String.fromCharCode(64 + last);

  // Header
  ws.mergeCells(`A1:${lastCol}1`);
  Object.assign(ws.getCell("A1"), { value: "HunterPCBuilds" });
  ws.getCell("A1").font = { name: "Calibri", size: 20, bold: true, color: { argb: GREEN } };
  ws.getRow(1).height = 30;
  ws.mergeCells(`A2:${lastCol}2`);
  ws.getCell("A2").value = internal ? "Quote: your copy (don't send this one)" : "Custom PC quote";
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
  const head = internal ? ["Category", "Part", "Qty", "Price", "Total", "From", "Link"] : prices ? ["Category", "Part", "Qty", "Price", "Total"] : ["Category", "Part", "Qty"];
  const headRow = ws.getRow(r);
  head.forEach((h, i) => {
    const c = headRow.getCell(i + 1);
    c.value = h;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
    c.alignment = { vertical: "middle", horizontal: i >= 2 && i <= 4 ? "right" : "left" };
  });
  headRow.height = 20;
  r++;
  const line = (i: Item, upgrade = false) => {
    const row = ws.getRow(r);
    const unit = upgrade && !internal ? num(i.price) * (1 + num(q.tax_rate)) : num(i.price);
    const vals: (string | number | { text: string; hyperlink: string } | null)[] = [i.category, i.name, num(i.qty)];
    if (prices) vals.push(unit, unit * num(i.qty));
    if (internal) vals.push(i.source ?? "", i.link ? { text: i.link, hyperlink: i.link } : "");
    vals.forEach((v, k) => {
      const c = row.getCell(k + 1);
      c.value = v as never;
      if (k === 3 || k === 4) c.numFmt = MONEY;
      if (k === 2) c.alignment = { horizontal: "right" };
      if (k === 6 && i.link) c.font = { color: { argb: "FF2563EB" }, underline: true };
      c.border = { bottom: { style: "thin", color: { argb: LINE } } };
    });
    if (upgrade && !prices) { row.getCell(3).value = unit * num(i.qty); row.getCell(3).numFmt = '"+$"#,##0.00'; }
    if (num(i.price) === 0 && prices && !upgrade) row.getCell(4).value = internal ? 0 : "Included";
    r++;
  };
  main.forEach((i) => line(i));
  r++;

  // Totals
  const total = (label: string, value: number, opts: { bold?: boolean; color?: string; note?: string } = {}) => {
    const lc = prices ? 4 : 2;
    const vc = prices ? 5 : 3;
    ws.getCell(r, lc).value = label;
    ws.getCell(r, lc).alignment = { horizontal: "right" };
    ws.getCell(r, lc).font = { bold: opts.bold, color: { argb: opts.color ?? INK } };
    ws.getCell(r, vc).value = value;
    ws.getCell(r, vc).numFmt = MONEY;
    ws.getCell(r, vc).font = { bold: opts.bold, color: { argb: opts.color ?? INK }, size: opts.bold ? 13 : 11 };
    if (opts.note && internal) { ws.getCell(r, 6).value = opts.note; ws.getCell(r, 6).font = { color: { argb: MUTED }, italic: true }; }
    r++;
  };
  if (prices) {
    total("Parts", t.parts);
    total(`Sales tax (${taxPct})`, t.tax);
    if (t.fee) total("Build fee", t.fee);
    total("Total", t.total, { bold: true, color: GREEN });
  } else {
    // Simple quote: one price for the finished PC, no breakdown
    total("Total (tax included)", t.total, { bold: true, color: GREEN });
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
    total("Your profit", t.profit, { bold: true, color: t.profit < 0 ? "FFDC2626" : GREEN });
    total("Margin", t.total ? t.profit / t.total : 0);
    ws.getCell(r - 1, prices ? 5 : 3).numFmt = "0%";
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
    if (internal && Number(c.col) >= 6) c.alignment = { ...c.alignment, indent: 1 };
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

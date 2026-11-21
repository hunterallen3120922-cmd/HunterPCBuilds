import { PART_CATEGORIES, PART_SOURCES, num } from "./money";
import { guessCategory } from "./PartsGrid";

/** A part found in a sheet, before it goes into the quote. */
export interface FoundPart { category: string; name: string; price: number; source: string; link: string }

/** Pulls the spreadsheet id and tab (gid) out of a Google Sheets link. */
export function parseSheetLink(url: string): { id: string; gid: string | null } | null {
  const id = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/)?.[1] ?? (/^[a-zA-Z0-9_-]{30,}$/.test(url.trim()) ? url.trim() : null);
  if (!id) return null;
  return { id, gid: url.match(/[#&?]gid=(\d+)/)?.[1] ?? null };
}

/**
 * Reads a Google Sheet tab as rows of text. Works when the sheet is shared as "Anyone with the link can view";
 * a private sheet answers 401, which we turn into a friendly message.
 */
export async function fetchSheet(url: string): Promise<string[][]> {
  const link = parseSheetLink(url);
  if (!link) throw new Error("That doesn't look like a Google Sheets link. Copy it from the address bar of the sheet.");
  const tab = link.gid ? `&gid=${link.gid}` : "";
  let res: Response;
  try {
    res = await fetch(`https://docs.google.com/spreadsheets/d/${link.id}/export?format=csv${tab}`);
  } catch {
    throw new Error(PRIVATE);
  }
  if (!res.ok) throw new Error(res.status === 404 ? "Couldn't find that sheet. Check the link." : PRIVATE);
  const text = await res.text();
  if (/^\s*<!doctype html|<html/i.test(text)) throw new Error(PRIVATE);
  return parseCsv(text);
}
const PRIVATE = "Google didn't let the site read that sheet. In the sheet, press Share → General access → “Anyone with the link” (Viewer), then try again. Or download it (File → Download → Microsoft Excel) and drop the file here.";

/** Reads a downloaded .xlsx or .csv file as rows of text (first tab of an Excel file). */
export async function readFile(file: File): Promise<string[][]> {
  if (/\.csv$/i.test(file.name) || file.type === "text/csv") return parseCsv(await file.text());
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const rows: string[][] = [];
  ws.eachRow({ includeEmpty: true }, (row, n) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (c, col) => {
      const v = c.value as unknown;
      let s = "";
      if (v == null) s = "";
      else if (typeof v === "object" && v !== null && "result" in v) s = String((v as { result: unknown }).result ?? "");
      else if (typeof v === "object" && v !== null && "text" in v) s = String((v as { text: unknown }).text ?? "");
      else if (typeof v === "object" && v !== null && "hyperlink" in v) s = String((v as { hyperlink: unknown }).hyperlink ?? "");
      else if (typeof v === "object" && v !== null && "richText" in v) s = (v as { richText: { text: string }[] }).richText.map((r) => r.text).join("");
      else s = String(v);
      if (c.hyperlink && !/^https?:/i.test(s)) s = c.hyperlink; // a store name linked to the product page
      cells[col - 1] = s;
    });
    rows[n - 1] = Array.from(cells, (x) => x ?? "");
  });
  return Array.from(rows, (r) => r ?? []);
}

/** A small CSV reader (handles quotes, commas and line breaks inside quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

/** What each of your build sheets calls a part type, in the app's categories. */
const CATEGORY_WORDS: [RegExp, string][] = [
  [/^(cpu ?(fan|cooler)|cooler|cpu cooling|aio)$/i, "CPU cooler"],
  [/^(cpu|processor)$/i, "CPU"],
  [/^(gpu|graphics( card)?|video card)$/i, "GPU"],
  [/^(motherboard|mobo|mb)$/i, "Motherboard"],
  [/^(ram|memory)$/i, "RAM"],
  [/^(storage|ssd|hdd|nvme|drive|hard drive)$/i, "Storage"],
  [/^(psu|power ?supply)$/i, "PSU"],
  [/^(case|chassis|tower)$/i, "Case"],
  [/^(fans?|case fans?)$/i, "Fans"],
  [/^(wi-?fi( card)?|wireless|network( card)?|bluetooth)$/i, "Wi-Fi"],
  [/^(windows|os|windows key|license)$/i, "Windows"],
  [/^(prebuilt|prebuilt pc|pc|computer)$/i, "Prebuilt PC"],
  [/^(keyboard|mouse|monitor|speakers?|headphones?|headset|webcam|mouse ?pad|cables?|accessor(y|ies))$/i, "Accessories"],
];
const toCategory = (type: string, name: string) => {
  const t = type.trim();
  const exact = PART_CATEGORIES.find((c) => c.toLowerCase() === t.toLowerCase());
  if (exact) return exact;
  const hit = CATEGORY_WORDS.find(([re]) => re.test(t))?.[1];
  return hit ?? guessCategory(`${t} ${name}`) ?? "Other";
};

const STORES: [RegExp, string][] = [
  [/ebay/i, "eBay"], [/amazon|amzn/i, "Amazon"], [/newegg/i, "Newegg"], [/aliexpress|ali ?express/i, "AliExpress"],
  [/micro ?center/i, "Micro Center"], [/best ?buy/i, "Best Buy"], [/facebook|marketplace|fb\b/i, "Facebook Marketplace"],
  [/walmart/i, "Walmart"], [/^on ?hand$|inventory/i, "On hand"], [/customer/i, "Customer's"],
];
/** "ebay", "eBay ", or an eBay link all become "eBay"; anything else stays as you wrote it. */
const toSource = (s: string) => {
  const t = s.trim();
  if (!t) return "";
  const store = STORES.find(([re]) => re.test(t))?.[1];
  if (store) return store;
  if (/^https?:\/\//i.test(t)) { try { return new URL(t).hostname.replace(/^www\./, ""); } catch { return ""; } }
  return PART_SOURCES.find((x) => x.toLowerCase() === t.toLowerCase()) ?? t.slice(0, 80);
};

const MONEY = /^\(?-?\$?\s*\d[\d,]*(\.\d+)?\)?$/;
/** Rows that end a parts table in your build sheets (totals, fees, notes). */
const STOP = /^(initial price|after tax|total|subtotal|taxes?|notes?|fees?|build(ing)? fee|windows fee|profit|hunter profit|charged|grand total)\b/i;

/**
 * Finds the parts in a build sheet. It looks for header rows like "Part | Part Name | Price | Part Link",
 * reads the rows under each one (a sheet can have more than one table, in any column order), and stops at
 * totals or notes. Sheets without headers fall back to rows that have a part type and a price.
 */
export function findParts(rows: string[][]): FoundPart[] {
  const out: FoundPart[] = [];
  let cols: { type: number; name: number; price: number; link: number } | null = null;

  for (const raw of rows) {
    const row = raw.map((c) => (c ?? "").trim());
    const lower = row.map((c) => c.toLowerCase());
    const nameCol = lower.findIndex((c) => /^(part ?name|name|item|product|description|component)$/.test(c));
    const priceCol = lower.findIndex((c) => /^(part ?price|price|cost|amount|\$)$/.test(c));
    if (nameCol >= 0 && priceCol >= 0) {
      cols = {
        name: nameCol, price: priceCol,
        type: lower.findIndex((c, k) => k !== nameCol && /^(part|type|category|part type|component type)$/.test(c)),
        link: lower.findIndex((c) => /link|supplier|source|store|from|where/.test(c)),
      };
      continue;
    }
    if (!row.some(Boolean)) { continue; }
    if (STOP.test(row.find(Boolean) ?? "")) { cols = null; continue; }

    if (cols) {
      const name = row[cols.name] ?? "";
      const priceCell = row[cols.price] ?? "";
      if (!name || (priceCell && !MONEY.test(priceCell))) continue;
      const type = cols.type >= 0 ? row[cols.type] ?? "" : "";
      const linkCell = cols.link >= 0 ? row[cols.link] ?? "" : "";
      out.push({
        category: toCategory(type, name), name: name.replace(/\s+/g, " ").slice(0, 200),
        price: num(priceCell.replace(/[$,\s()]/g, "")),
        source: toSource(linkCell), link: /^https?:\/\//i.test(linkCell) ? linkCell.slice(0, 500) : "",
      });
      continue;
    }

    // No header: "Type | Name | $Price | store" style rows
    const typeAt = row.findIndex((c) => c && (PART_CATEGORIES.some((x) => x.toLowerCase() === c.toLowerCase()) || CATEGORY_WORDS.some(([re]) => re.test(c))));
    const priceAt = row.findIndex((c, k) => k !== typeAt && MONEY.test(c) && /[$.]/.test(c));
    if (typeAt < 0 || priceAt < 0) continue;
    const name = row.find((c, k) => k !== typeAt && k !== priceAt && c && !MONEY.test(c) && !/^https?:/i.test(c)) ?? "";
    if (!name) continue;
    const rest = row.filter((c, k) => k !== typeAt && k !== priceAt && c && c !== name);
    const link = rest.find((c) => /^https?:\/\//i.test(c)) ?? "";
    out.push({ category: toCategory(row[typeAt], name), name: name.slice(0, 200), price: num(row[priceAt].replace(/[$,\s()]/g, "")), source: toSource(link || rest[0] || ""), link });
  }
  return out;
}

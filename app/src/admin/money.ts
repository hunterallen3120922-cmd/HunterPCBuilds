/** Shared types and helpers for the business tabs (jobs, expenses, 3D prints, inventory, dashboard). */

export const JOB_KINDS = ["build", "upgrade", "repair", "rental", "resale", "personal", "other"] as const;
export const JOB_STATUSES = ["quote", "in progress", "done", "cancelled"] as const;
export const INVENTORY_STATUSES = ["on hand", "used", "sold"] as const;
export const EXPENSE_CATEGORIES = ["Tools", "Shipping & supplies", "Fees", "Software", "Filament", "Advertising", "Travel", "Other"] as const;
/** Part categories, in the order a parts list is shown. Add new ones at the end of the right group. */
export const PART_CATEGORIES = [
  "CPU", "GPU", "Motherboard", "RAM", "Storage", "PSU", "Case", "CPU cooler", "Fans", "Wi-Fi", "Windows",
  "Prebuilt PC", "Accessories", "Other",
] as const;
export const PART_STATUSES = ["needed", "ordered", "bought", "have", "customer's"] as const;
export const PART_SOURCES = ["eBay", "Amazon", "Newegg", "AliExpress", "Micro Center", "Best Buy", "Facebook Marketplace", "On hand", "Customer's"] as const;

export interface JobRow {
  id: string;
  title: string;
  customer: string | null;
  kind: (typeof JOB_KINDS)[number];
  status: (typeof JOB_STATUSES)[number];
  channel: string | null;
  date: string | null;
  revenue: number;
  cost: number;
  profit: number;
  notes: string | null;
  created_at: string;
  started_on: string | null;
  sheet_url: string | null;
  batch: string | null;
  needs_review: boolean;
}

export interface PartRow {
  id: string;
  job_id: string;
  category: string;
  name: string;
  price: number;
  qty: number;
  source: string | null;
  status: (typeof PART_STATUSES)[number];
  sort: number;
  notes: string | null;
}

/** "Ryzen 5 5600 · RTX 3060" from a parts list: the CPU and GPU (or the prebuilt PC). */
export const specLine = (parts: Pick<PartRow, "category" | "name">[]) =>
  ["Prebuilt PC", "CPU", "GPU"].map((c) => parts.find((p) => p.category === c)?.name).filter(Boolean).join(" · ");

/** The date a job counts in month-by-month stats: when it sold, or else when it was started. */
export const jobDay = (j: Pick<JobRow, "date" | "started_on">) => j.date ?? j.started_on;

export interface ExpenseRow {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  notes: string | null;
}

export interface PrinterRow {
  id: string;
  name: string;
  purchase_price: number;
  purchased_on: string | null;
  notes: string | null;
}

export interface PrintRow {
  id: string;
  date: string;
  customer: string | null;
  item: string;
  printer_id: string | null;
  material: string | null;
  grams: number | null;
  price: number;
  filament_cost: number;
  profit: number;
  notes: string | null;
}

export interface InventoryRow {
  id: string;
  category: string;
  name: string;
  cost: number;
  qty: number;
  status: (typeof INVENTORY_STATUSES)[number];
  notes: string | null;
}

/** Supabase returns numeric columns as strings; this turns them into numbers (and null/blank into 0). */
export const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const money = (v: unknown) => usd.format(num(v));
export const moneyShort = (v: unknown) => usd0.format(num(v));
export const pct = (v: number) => `${Math.round(v * 100)}%`;

/** A date column (YYYY-MM-DD) shown like "Nov 4, 2026". */
export const day = (iso: string | null) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Jobs that count toward revenue and profit: finished, and not your own personal PCs. */
export const countsTowardProfit = (j: Pick<JobRow, "status" | "kind">) => j.status === "done" && j.kind !== "personal";

export const QUOTE_STATUSES = ["draft", "sent", "accepted", "declined", "building", "listed", "sold"] as const;
/** The statuses that make sense for each kind of quote. */
export const STATUSES_FOR = {
  customer: ["draft", "sent", "accepted", "declined"],
  resale: ["draft", "building", "listed", "sold"],
  trade_in: ["draft", "sent", "accepted", "declined"],
  print: ["draft", "sent", "accepted", "sold", "declined"],
} as const;

/** Trade-ins reuse the quote statuses under friendlier names. */
export const TRADE_IN_STATUS: Record<string, string> = { draft: "New", sent: "Offer sent", accepted: "Bought", declined: "Passed" };

/** Custom 3D print requests reuse the quote statuses under these names. */
export const PRINT_STATUS: Record<string, string> = { draft: "New", sent: "Price sent", accepted: "Printing", sold: "Done", declined: "Passed" };

/** What the site's custom 3D print form saves on the quote (quotes.print_job). */
export interface PrintJobDetails {
  description?: string;
  size?: string;
  detail?: string;
  material?: string;
  color?: string;
  qty?: number;
  has_file?: boolean;
  estimate?: [number, number] | null;
  files?: string[];
  files_failed?: string[];
  message?: string;
  phone?: string;
  contact_by?: string;
}

/** What the site's trade-in form saves on the quote (quotes.trade_in). */
export interface TradeInDetails {
  part_type?: string;
  model?: string;
  condition?: string;
  extras?: string[];
  payout?: string;
  estimate_cash?: [number, number] | null;
  estimate_credit?: [number, number] | null;
  message?: string;
  phone?: string;
  contact_by?: string;
}

/** Where you sell builds yourself, with the site's usual cut. Fees change, so they can be edited on each quote. */
export const PLATFORMS = [
  { name: "eBay", pct: 0.136, fixed: 0.4, note: "13.6% + $0.40 per order (most categories)" },
  { name: "Facebook Marketplace (shipped)", pct: 0.1, fixed: 0, note: "10% when shipped" },
  { name: "Facebook Marketplace (local)", pct: 0, fixed: 0, note: "no fee for local pickup" },
  { name: "OfferUp (shipped)", pct: 0.129, fixed: 0, note: "12.9% when shipped" },
  { name: "Local / cash", pct: 0, fixed: 0, note: "no fees" },
] as const;

export interface QuoteRow {
  id: string;
  title: string;
  customer: string | null;
  contact: string | null;
  status: (typeof QUOTE_STATUSES)[number];
  purpose: "customer" | "resale" | "trade_in" | "print";
  platform: string | null;
  list_price: number;
  fee_pct: number;
  fee_fixed: number;
  shipping: number;
  tax_rate: number;
  build_fee: number;
  extra_costs: number;
  show_prices: boolean;
  valid_until: string | null;
  customer_note: string | null;
  notes: string | null;
  job_id: string | null;
  trade_in?: TradeInDetails | null;
  print_job?: PrintJobDetails | null;
  offer?: number | null;
  created_at: string;
}

export interface QuoteItemRow {
  id: string;
  quote_id: string;
  category: string;
  name: string;
  price: number;
  qty: number;
  source: string | null;
  link: string | null;
  optional: boolean;
  sort: number;
}

const cents = (v: number) => Math.round(v * 100) / 100;

/**
 * The money on a quote. The customer pays parts + tax on parts + build fee.
 * Your cost is parts + tax + extra costs, so your profit is the build fee minus extra costs.
 */
/**
 * Windows install on a customer quote. Saved in columns the customer quote doesn't otherwise use
 * (so no database change was needed): `platform` holds the edition, `fee_fixed` the fee.
 */
export const WINDOWS = [
  { name: "Windows 10 Home", fee: 10 },
  { name: "Windows 10 Pro", fee: 25 },
] as const;
export const NO_WINDOWS = "No Windows install";

/**
 * The money on a customer quote: parts + tax + Windows install + build fee.
 * With a custom price (`list_price` > 0 on a customer quote), the customer pays that,
 * and the build fee is whatever is left after parts, tax and Windows.
 */
export const quoteTotals = (q: Pick<QuoteRow, "tax_rate" | "build_fee" | "extra_costs"> & Partial<Pick<QuoteRow, "platform" | "fee_fixed" | "list_price">>, items: Pick<QuoteItemRow, "price" | "qty" | "optional">[]) => {
  const parts = cents(items.filter((i) => !i.optional).reduce((s, i) => s + num(i.price) * num(i.qty), 0));
  const tax = cents(parts * num(q.tax_rate));
  const windows = q.platform && q.platform !== NO_WINDOWS ? num(q.fee_fixed) : 0;
  const windowsName = q.platform && q.platform !== NO_WINDOWS ? q.platform : "";
  const custom = num(q.list_price) > 0 ? cents(num(q.list_price)) : 0;
  const fee = custom ? cents(custom - parts - tax - windows) : num(q.build_fee);
  const total = custom || cents(parts + tax + windows + fee);
  const cost = cents(parts + tax + num(q.extra_costs));
  const upgrades = cents(items.filter((i) => i.optional).reduce((s, i) => s + num(i.price) * num(i.qty), 0));
  return { parts, tax, windows, windowsName, custom, fee, total, cost, profit: cents(total - cost), upgrades };
};

/**
 * The money on a build you sell yourself: you pay parts + tax + extra costs,
 * the site takes its fee from the list price, and you pay shipping.
 */
export const resaleTotals = (q: Pick<QuoteRow, "tax_rate" | "extra_costs" | "list_price" | "fee_pct" | "fee_fixed" | "shipping">, items: Pick<QuoteItemRow, "price" | "qty" | "optional">[]) => {
  const parts = cents(items.filter((i) => !i.optional).reduce((s, i) => s + num(i.price) * num(i.qty), 0));
  const tax = cents(parts * num(q.tax_rate));
  const cost = cents(parts + tax + num(q.extra_costs));
  const list = num(q.list_price);
  const fees = list > 0 ? cents(list * num(q.fee_pct) + num(q.fee_fixed)) : 0;
  const shipping = num(q.shipping);
  const payout = cents(list - fees - shipping);
  const profit = cents(payout - cost);
  const pctLeft = 1 - num(q.fee_pct);
  const breakEven = pctLeft > 0 ? cents((cost + shipping + num(q.fee_fixed)) / pctLeft) : 0;
  return { parts, tax, cost, list, fees, shipping, payout, profit, breakEven };
};

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

export const QUOTE_STATUSES = ["draft", "sent", "accepted", "declined"] as const;

export interface QuoteRow {
  id: string;
  title: string;
  customer: string | null;
  contact: string | null;
  status: (typeof QUOTE_STATUSES)[number];
  tax_rate: number;
  build_fee: number;
  extra_costs: number;
  show_prices: boolean;
  valid_until: string | null;
  customer_note: string | null;
  notes: string | null;
  job_id: string | null;
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
export const quoteTotals = (q: Pick<QuoteRow, "tax_rate" | "build_fee" | "extra_costs">, items: Pick<QuoteItemRow, "price" | "qty" | "optional">[]) => {
  const parts = cents(items.filter((i) => !i.optional).reduce((s, i) => s + num(i.price) * num(i.qty), 0));
  const tax = cents(parts * num(q.tax_rate));
  const fee = num(q.build_fee);
  const total = cents(parts + tax + fee);
  const cost = cents(parts + tax + num(q.extra_costs));
  const upgrades = cents(items.filter((i) => i.optional).reduce((s, i) => s + num(i.price) * num(i.qty), 0));
  return { parts, tax, fee, total, cost, profit: cents(total - cost), upgrades };
};

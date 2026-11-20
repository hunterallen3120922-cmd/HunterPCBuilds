/** Shared types and helpers for the business tabs (jobs, expenses, 3D prints, inventory, dashboard). */

export const JOB_KINDS = ["build", "upgrade", "repair", "rental", "resale", "personal", "other"] as const;
export const JOB_STATUSES = ["quote", "in progress", "done", "cancelled"] as const;
export const INVENTORY_STATUSES = ["on hand", "used", "sold"] as const;
export const EXPENSE_CATEGORIES = ["Tools", "Shipping & supplies", "Fees", "Software", "Filament", "Advertising", "Travel", "Other"] as const;
export const PART_CATEGORIES = ["CPU", "GPU", "Motherboard", "RAM", "Storage", "PSU", "Case", "CPU cooler", "Fans", "Other"] as const;

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
}

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

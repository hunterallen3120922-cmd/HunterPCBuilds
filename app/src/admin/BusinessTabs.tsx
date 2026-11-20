import { useCallback, useEffect, useState } from "react";
import { supabase } from "./client";
import Records, { Signed, Totals, type Field } from "./Records";
import {
  EXPENSE_CATEGORIES, INVENTORY_STATUSES, JOB_KINDS, JOB_STATUSES, PART_CATEGORIES,
  countsTowardProfit, day, money, num, pct, today,
  type ExpenseRow, type InventoryRow, type JobRow, type PrinterRow, type PrintRow,
} from "./money";

const CHANNELS = ["In person", "eBay", "Facebook Marketplace", "Referral", "Other"];

// ─── Jobs ────────────────────────────────────────────────────────────────────
const JOB_FIELDS: Field[] = [
  { key: "title", label: "Job", type: "text", required: true, placeholder: "R5 5600 + RTX 3060 build", wide: true },
  { key: "customer", label: "Customer", type: "text" },
  { key: "date", label: "Date sold / finished", type: "date" },
  { key: "kind", label: "Type", type: "select", options: JOB_KINDS, required: true },
  { key: "status", label: "Status", type: "select", options: JOB_STATUSES, required: true },
  { key: "revenue", label: "You were paid", type: "money", required: true },
  { key: "cost", label: "You spent", type: "money", required: true },
  { key: "channel", label: "Sold through", type: "text", suggest: CHANNELS },
  { key: "notes", label: "Notes", type: "textarea" },
];
const JOB_ORDER = [{ key: "date", ascending: false }, { key: "created_at", ascending: false }];

export function JobsTab({ onChange }: { onChange?: () => void }) {
  return (
    <Records<JobRow & Record<string, unknown>>
      table="jobs" title="Jobs" noun="job" fields={JOB_FIELDS} order={JOB_ORDER} onChange={onChange}
      intro="Every build, upgrade, repair, rental and resale. Profit is worked out for you."
      blank={() => ({ kind: "build", status: "in progress", date: today(), revenue: 0, cost: 0 })}
      filter={{ key: "status", label: "Status", options: JOB_STATUSES }}
      summary={(rows) => {
        const done = rows.filter(countsTowardProfit);
        const rev = done.reduce((s, j) => s + num(j.revenue), 0);
        const profit = done.reduce((s, j) => s + num(j.profit), 0);
        const tiedUp = rows.filter((j) => j.status === "in progress").reduce((s, j) => s + num(j.cost), 0);
        return <Totals items={[
          { label: `Finished (${done.length})`, value: money(rev) },
          { label: "Profit", value: money(profit), tone: profit < 0 ? "bad" : "good" },
          { label: "Margin", value: rev ? pct(profit / rev) : "–" },
          { label: "Spent on unfinished jobs", value: money(tiedUp) },
        ]} />;
      }}
      rowTitle={(j) => j.title}
      rowSub={(j) => [j.customer, j.kind, j.status !== "done" ? j.status : null, j.channel, day(j.date) || "no date"].filter(Boolean).join(" · ")}
      rowRight={(j) => (
        <>
          <Signed value={j.profit} />
          <span className="block font-mono text-[.75rem] text-muted">{money(j.revenue)} in</span>
        </>
      )}
    />
  );
}

// ─── Expenses ────────────────────────────────────────────────────────────────
const EXPENSE_FIELDS: Field[] = [
  { key: "description", label: "What for", type: "text", required: true, wide: true, placeholder: "Anti-static mat" },
  { key: "amount", label: "Amount", type: "money", required: true },
  { key: "date", label: "Date", type: "date", required: true },
  { key: "category", label: "Category", type: "select", options: EXPENSE_CATEGORIES, required: true },
  { key: "notes", label: "Notes", type: "textarea" },
];
const EXPENSE_ORDER = [{ key: "date", ascending: false }, { key: "created_at", ascending: false }];

export function ExpensesTab({ onChange }: { onChange?: () => void }) {
  return (
    <Records<ExpenseRow & Record<string, unknown>>
      table="expenses" title="Expenses" noun="expense" fields={EXPENSE_FIELDS} order={EXPENSE_ORDER} onChange={onChange}
      intro="Business costs that aren't part of one job: tools, shipping supplies, fees, software. Parts for a job go on the job."
      blank={() => ({ date: today(), category: "Other", amount: 0 })}
      filter={{ key: "category", label: "Category", options: EXPENSE_CATEGORIES }}
      summary={(rows) => {
        const total = rows.reduce((s, e) => s + num(e.amount), 0);
        const year = String(new Date().getFullYear());
        const thisYear = rows.filter((e) => e.date?.startsWith(year)).reduce((s, e) => s + num(e.amount), 0);
        return <Totals items={[{ label: `Total (${rows.length})`, value: money(total) }, { label: `In ${year}`, value: money(thisYear) }]} />;
      }}
      rowTitle={(e) => e.description}
      rowSub={(e) => [e.category, day(e.date)].join(" · ")}
      rowRight={(e) => <span className="font-mono text-danger">−{money(e.amount)}</span>}
    />
  );
}

// ─── 3D printing ─────────────────────────────────────────────────────────────
const PRINTER_FIELDS: Field[] = [
  { key: "name", label: "Printer", type: "text", required: true, wide: true },
  { key: "purchase_price", label: "Paid", type: "money", required: true },
  { key: "purchased_on", label: "Bought on", type: "date" },
  { key: "notes", label: "Notes", type: "textarea" },
];
const PRINTER_ORDER = [{ key: "created_at" }];
const PRINT_ORDER = [{ key: "date", ascending: false }, { key: "created_at", ascending: false }];

export function PrintsTab({ onChange }: { onChange?: () => void }) {
  const [printers, setPrinters] = useState<PrinterRow[]>([]);
  const [earned, setEarned] = useState<Record<string, number>>({});
  const loadPrinters = useCallback(async () => {
    const [p, s] = await Promise.all([
      supabase!.from("printers").select("*").order("created_at"),
      supabase!.from("prints").select("printer_id, profit"),
    ]);
    setPrinters((p.data ?? []) as PrinterRow[]);
    const by: Record<string, number> = {};
    for (const r of (s.data ?? []) as { printer_id: string | null; profit: number }[]) if (r.printer_id) by[r.printer_id] = (by[r.printer_id] ?? 0) + num(r.profit);
    setEarned(by);
  }, []);
  useEffect(() => { loadPrinters(); }, [loadPrinters]);
  const changed = () => { loadPrinters(); onChange?.(); };

  const printerName = (id: string | null) => printers.find((p) => p.id === id)?.name ?? "";
  const printFields: Field[] = [
    { key: "item", label: "What you printed", type: "text", required: true, wide: true, placeholder: "Beyblade parts" },
    { key: "customer", label: "Customer", type: "text" },
    { key: "date", label: "Date", type: "date", required: true },
    { key: "printer_id", label: "Printer", type: "select", options: printers.map((p) => ({ value: p.id, label: p.name })) },
    { key: "material", label: "Filament", type: "text", suggest: ["PLA", "PETG", "TPU", "ABS"] },
    { key: "grams", label: "Grams used", type: "number" },
    { key: "price", label: "Price charged", type: "money", required: true },
    { key: "filament_cost", label: "Filament cost", type: "money", required: true },
    { key: "notes", label: "Notes", type: "textarea" },
  ];

  const invested = printers.reduce((s, p) => s + num(p.purchase_price), 0);
  const paidBack = printers.reduce((s, p) => s + Math.min(num(p.purchase_price), Math.max(0, earned[p.id] ?? 0)), 0);

  return (
    <div className="space-y-10">
      <Records<PrintRow & Record<string, unknown>>
        key={printers.length} table="prints" title="3D prints" noun="print" fields={printFields} order={PRINT_ORDER} onChange={changed}
        intro="Every print you sold. Profit counts toward your printers' payoff and your overall stats."
        blank={() => ({ date: today(), price: 0, filament_cost: 0, material: "PLA" })}
        summary={(rows) => {
          const rev = rows.reduce((s, r) => s + num(r.price), 0);
          const profit = rows.reduce((s, r) => s + num(r.profit), 0);
          return <Totals items={[
            { label: `Sales (${rows.length})`, value: money(rev) },
            { label: "Profit", value: money(profit), tone: "good" },
            { label: "Printers cost", value: money(invested) },
            { label: "Paid off", value: invested ? pct(paidBack / invested) : "–" },
          ]} />;
        }}
        rowTitle={(r) => r.item}
        rowSub={(r) => [r.customer, printerName(r.printer_id), r.material, r.grams ? `${num(r.grams)} g` : null, day(r.date)].filter(Boolean).join(" · ")}
        rowRight={(r) => (<><Signed value={r.profit} /><span className="block font-mono text-[.75rem] text-muted">{money(r.price)} charged</span></>)}
      />

      <Records<PrinterRow & Record<string, unknown>>
        compact table="printers" title="Printers" noun="printer" fields={PRINTER_FIELDS} order={PRINTER_ORDER} onChange={changed}
        intro="What each printer cost and how much of it your prints have paid back."
        blank={() => ({ purchase_price: 0 })}
        rowTitle={(p) => p.name}
        rowSub={(p) => {
          const e = earned[p.id] ?? 0;
          const price = num(p.purchase_price);
          return price ? `${money(e)} earned of ${money(price)} · ${e >= price ? "paid off" : `${money(price - e)} to go`}` : `${money(e)} earned`;
        }}
        rowRight={(p) => {
          const price = num(p.purchase_price);
          const share = price ? Math.min(1, Math.max(0, (earned[p.id] ?? 0) / price)) : 1;
          return (
            <span className="flex items-center gap-2">
              <span className="h-2 w-20 overflow-hidden rounded-full bg-line" aria-hidden="true">
                <span className="block h-full rounded-full bg-accent" style={{ width: `${share * 100}%` }} />
              </span>
              <span className="w-10 font-mono text-[.8rem] text-muted">{pct(share)}</span>
            </span>
          );
        }}
      />
    </div>
  );
}

// ─── Inventory ───────────────────────────────────────────────────────────────
const INVENTORY_FIELDS: Field[] = [
  { key: "name", label: "Part", type: "text", required: true, wide: true, placeholder: "GTX 1660 Super" },
  { key: "category", label: "Category", type: "select", options: PART_CATEGORIES, required: true },
  { key: "status", label: "Status", type: "select", options: INVENTORY_STATUSES, required: true },
  { key: "cost", label: "You paid (each)", type: "money", required: true },
  { key: "qty", label: "How many", type: "number", required: true },
  { key: "notes", label: "Notes", type: "textarea" },
];
const INVENTORY_ORDER = [{ key: "category" }, { key: "name" }];

export function InventoryTab({ onChange }: { onChange?: () => void }) {
  return (
    <Records<InventoryRow & Record<string, unknown>>
      table="inventory" title="Inventory" noun="part" fields={INVENTORY_FIELDS} order={INVENTORY_ORDER} onChange={onChange}
      intro="Parts you have on hand. Mark them used or sold when they go into a build."
      blank={() => ({ category: "Other", status: "on hand", cost: 0, qty: 1 })}
      filter={{ key: "status", label: "Status", options: INVENTORY_STATUSES, initial: "on hand" }}
      summary={(rows) => {
        const onHand = rows.filter((r) => r.status === "on hand");
        return <Totals items={[
          { label: "Parts on hand", value: String(onHand.reduce((s, r) => s + num(r.qty), 0)) },
          { label: "Worth (what you paid)", value: money(onHand.reduce((s, r) => s + num(r.cost) * num(r.qty), 0)) },
        ]} />;
      }}
      rowTitle={(r) => r.name}
      rowSub={(r) => [r.category, r.status !== "on hand" ? r.status : null, r.notes].filter(Boolean).join(" · ")}
      rowRight={(r) => (
        <>
          <span className="font-mono">{num(r.qty) > 1 ? `${num(r.qty)} × ` : ""}{money(r.cost)}</span>
        </>
      )}
    />
  );
}

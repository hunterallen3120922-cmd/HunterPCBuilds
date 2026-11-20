import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { supabase } from "./client";
import { day, money, num } from "./money";

type Row = { id: string } & Record<string, unknown>;

export interface Field {
  key: string;
  label: string;
  type: "text" | "money" | "date" | "number" | "select" | "textarea" | "checkbox";
  options?: readonly (string | { value: string; label: string })[];
  required?: boolean;
  /** Show as a column in the list (desktop) */
  column?: boolean;
  placeholder?: string;
  /** Datalist suggestions for a text field */
  suggest?: readonly string[];
  /** Spans both columns in the editor */
  wide?: boolean;
}

/** Columns the database fills in itself; never sent when saving. */
const READ_ONLY = new Set(["id", "created_at", "updated_at", "profit"]);

const optValue = (o: string | { value: string; label: string }) => (typeof o === "string" ? o : o.value);
const optLabel = (o: string | { value: string; label: string }) => (typeof o === "string" ? o : o.label);

/**
 * A list of records from one table, with search, a filter, totals, and an editor to add, change or delete.
 * Used by the Jobs, Expenses, 3D prints and Inventory tabs.
 */
export default function Records<T extends Row>({
  table, title, intro, noun, fields, order, blank, filter, summary, rowTitle, rowSub, rowRight, onChange, compact, editorExtra, flags, sortBy,
}: {
  table: string;
  title: string;
  intro?: ReactNode;
  noun: string;
  fields: Field[];
  order: { key: string; ascending?: boolean }[];
  blank: () => Partial<T>;
  filter?: { key: string; label: string; options: readonly string[]; initial?: string };
  summary?: (rows: T[]) => ReactNode;
  rowTitle: (r: T) => ReactNode;
  rowSub?: (r: T) => ReactNode;
  rowRight?: (r: T) => ReactNode;
  onChange?: () => void;
  compact?: boolean;
  /** Extra content at the bottom of the editor (e.g. a job's parts list). Gets the record and a setter for its fields. */
  editorExtra?: (draft: Partial<T>, set: (key: string, value: unknown) => void) => ReactNode;
  /** Extra toggle filters shown after the main filter (e.g. "Needs a check") */
  flags?: { label: string; test: (r: T) => boolean }[];
  /** Sort the list in the browser (after loading) */
  sortBy?: (a: T, b: T) => number;
}) {
  const [rows, setRows] = useState<T[] | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [pick, setPick] = useState(filter?.initial ?? "all");
  const [editing, setEditing] = useState<Partial<T> | null>(null);
  const [flag, setFlag] = useState<string | null>(null);

  const load = useCallback(async () => {
    let q = supabase!.from(table).select("*");
    for (const o of order) q = q.order(o.key, { ascending: o.ascending ?? true, nullsFirst: false });
    const { data, error } = await q.limit(5000);
    if (error) setError(error.message); else setRows(data as T[]);
  }, [table, order]);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (rows ?? []).filter((r) =>
      (!filter || pick === "all" || r[filter.key] === pick) &&
      (!flag || !!flags?.find((f) => f.label === flag)?.test(r)) &&
      (!q || fields.some((f) => String(r[f.key] ?? "").toLowerCase().includes(q))));
    return sortBy ? [...list].sort(sortBy) : list;
  }, [rows, search, pick, filter, fields, flag, flags, sortBy]);

  const save = async (draft: Partial<T>) => {
    const body: Record<string, unknown> = {};
    for (const f of fields) {
      const v = draft[f.key];
      if (f.type === "money" || f.type === "number") body[f.key] = v === "" || v == null ? (f.required ? 0 : null) : num(v);
      else if (f.type === "checkbox") body[f.key] = !!v;
      else body[f.key] = v === "" || v === undefined ? null : v;
    }
    for (const k of READ_ONLY) delete body[k];
    const res = draft.id
      ? await supabase!.from(table).update(body).eq("id", draft.id)
      : await supabase!.from(table).insert(body);
    if (res.error) return res.error.message;
    setEditing(null);
    await load();
    onChange?.();
    return "";
  };

  const remove = async (r: Partial<T>) => {
    if (!r.id || !confirm(`Delete this ${noun}? This can't be undone.`)) return;
    const { error } = await supabase!.from(table).delete().eq("id", r.id);
    if (error) { setError(error.message); return; }
    setEditing(null);
    await load();
    onChange?.();
  };

  const count = (o: string) => (rows ?? []).filter((r) => o === "all" || r[filter!.key] === o).length;

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={compact ? "text-[1.3rem]" : "text-[1.8rem]"}>{title}</h1>
          {intro && <p className="text-[.92rem] text-muted">{intro}</p>}
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost !py-2 !text-[.85rem]" onClick={load}>Refresh</button>
          <button type="button" className="btn !py-2 !text-[.85rem]" onClick={() => setEditing(blank())}>+ Add {noun}</button>
        </div>
      </div>

      {!compact && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {filter && ["all", ...filter.options].map((o) => (
            <button key={o} type="button" onClick={() => setPick(o)} aria-pressed={pick === o}
              className={`rounded-full border px-3 py-1 text-[.8rem] capitalize ${pick === o ? "border-ink/60 bg-card text-ink" : "border-line text-muted hover:text-ink"}`}>
              {o === "all" ? "All" : o} <span className="font-mono text-[.72rem] opacity-70">{count(o)}</span>
            </button>
          ))}
          {flags?.map((f) => (
            <button key={f.label} type="button" onClick={() => setFlag(flag === f.label ? null : f.label)} aria-pressed={flag === f.label}
              className={`rounded-full border px-3 py-1 text-[.8rem] ${flag === f.label ? "border-accent2/70 bg-accent2/10 text-accent2" : "border-line text-muted hover:text-ink"}`}>
              {f.label} <span className="font-mono text-[.72rem] opacity-70">{(rows ?? []).filter(f.test).length}</span>
            </button>
          ))}
          <input className="input !w-auto min-w-[12rem] flex-1 !py-2 sm:ml-auto sm:flex-none" type="search" placeholder="Search…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      )}

      {error && <p className="mb-4 rounded-card border border-danger/40 p-3 text-[.9rem] text-danger" role="alert">{error}</p>}
      {summary && rows && <div className="mb-4">{summary(shown)}</div>}

      <ul className="space-y-2">
        {rows === null && !error && <li className="text-muted">Loading…</li>}
        {rows !== null && shown.length === 0 && <li className="card p-6 text-center text-muted">Nothing here yet.</li>}
        {shown.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => setEditing({ ...r })}
              className="card flex w-full items-center gap-3 p-3.5 text-left text-ink hover:border-ink/40">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{rowTitle(r)}</span>
                {rowSub && <span className="block truncate text-[.82rem] text-muted">{rowSub(r)}</span>}
              </span>
              {rowRight && <span className="shrink-0 text-right">{rowRight(r)}</span>}
            </button>
          </li>
        ))}
      </ul>

      {editing && (
        <Editor key={String(editing.id ?? "new")} draft={editing} fields={fields} noun={noun} extra={editorExtra}
          onCancel={() => setEditing(null)} onSave={save} onDelete={editing.id ? () => remove(editing) : undefined} />
      )}
    </section>
  );
}

function Editor<T extends Row>({ draft, fields, noun, onCancel, onSave, onDelete, extra }: {
  draft: Partial<T>; fields: Field[]; noun: string;
  extra?: (draft: Partial<T>, set: (key: string, value: unknown) => void) => ReactNode;
  onCancel: () => void; onSave: (d: Partial<T>) => Promise<string>; onDelete?: () => void;
}) {
  const [d, setD] = useState<Record<string, unknown>>(() => ({ ...draft }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: unknown) => setD((cur) => ({ ...cur, [k]: v }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(await onSave(d as Partial<T>));
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={onCancel}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${d.id ? "Edit" : "Add"} ${noun}`}
        className={`card max-h-[92vh] w-full ${extra ? "max-w-4xl" : "max-w-2xl"} overflow-y-auto rounded-b-none p-6 sm:rounded-b-card`}>
        <h2 className="text-xl">{d.id ? `Edit ${noun}` : `Add ${noun}`}</h2>
        <div className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-2">
          {fields.map((f) => (
            <label key={f.key} className={`block ${f.wide || f.type === "textarea" ? "sm:col-span-2" : ""}`}>
              <span className="mb-1 block text-[.82rem] text-muted">{f.label}{f.required && " *"}</span>
              <FieldInput f={f} value={d[f.key]} onChange={(v) => set(f.key, v)} />
            </label>
          ))}
        </div>
        {extra?.(d as Partial<T>, set)}
        {error && <p className="mt-4 text-[.9rem] text-danger" role="alert">{error}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button type="submit" className="btn !py-2" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
          <button type="button" className="btn btn-ghost !py-2" onClick={onCancel}>Cancel</button>
          {onDelete && <button type="button" className="ml-auto text-[.85rem] text-muted underline hover:text-danger" onClick={onDelete}>Delete</button>}
        </div>
      </form>
    </div>
  );
}

function FieldInput({ f, value, onChange }: { f: Field; value: unknown; onChange: (v: unknown) => void }) {
  const v = value == null ? "" : String(value);
  const listId = f.suggest ? `suggest-${f.key}` : undefined;
  switch (f.type) {
    case "checkbox":
      return (
        <span className="flex min-h-[3rem] items-center gap-2 text-[.9rem]">
          <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          {f.placeholder}
        </span>
      );
    case "textarea":
      return <textarea className="input min-h-[5rem]" value={v} maxLength={5000} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />;
    case "select":
      return (
        <select className="input capitalize" value={v} required={f.required} onChange={(e) => onChange(e.target.value)}>
          {!f.required && <option value="">—</option>}
          {f.options?.map((o) => <option key={optValue(o)} value={optValue(o)}>{optLabel(o)}</option>)}
        </select>
      );
    case "money":
      return (
        <span className="relative block">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
          <input className="input !pl-7" type="number" inputMode="decimal" step="0.01" value={v} required={f.required} placeholder="0.00"
            onChange={(e) => onChange(e.target.value)} />
        </span>
      );
    case "number":
      return <input className="input" type="number" inputMode="decimal" step="any" value={v} required={f.required} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />;
    case "date":
      return <input className="input" type="date" value={v} required={f.required} onChange={(e) => onChange(e.target.value)} />;
    default:
      return (
        <>
          <input className="input" type="text" value={v} required={f.required} placeholder={f.placeholder} list={listId} onChange={(e) => onChange(e.target.value)} />
          {f.suggest && <datalist id={listId}>{f.suggest.map((s) => <option key={s} value={s} />)}</datalist>}
        </>
      );
  }
}

/** A row of small totals shown above a list. */
export function Totals({ items }: { items: { label: string; value: ReactNode; tone?: "good" | "bad" }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className="rounded-card border border-line bg-bg2 px-4 py-3">
          <dt className="text-[.75rem] text-muted">{i.label}</dt>
          <dd className={`font-mono text-[1.05rem] ${i.tone === "bad" ? "text-danger" : i.tone === "good" ? "text-accent" : "text-ink"}`}>{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Money shown green when positive, red when negative. */
export function Signed({ value }: { value: unknown }) {
  const n = num(value);
  return <span className={`font-mono ${n < 0 ? "text-danger" : n > 0 ? "text-accent" : "text-muted"}`}>{money(n)}</span>;
}

export { day };

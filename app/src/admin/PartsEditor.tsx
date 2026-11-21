import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { supabase } from "./client";
import { PART_CATEGORIES, PART_SOURCES, PART_STATUSES, money, num, type PartRow } from "./money";

const TAX = 0.06; // PA sales tax, used for the "parts + tax" suggestion

type Draft = Omit<PartRow, "id" | "job_id"> & { id?: string };
const blank = (sort: number): Draft => ({ category: "CPU", name: "", price: 0, qty: 1, source: "", status: "bought", sort, notes: null });

/** Stop Enter in a part's inputs from submitting the job form around it. */
const noSubmit = (e: KeyboardEvent) => { if (e.key === "Enter") e.preventDefault(); };

/**
 * A job's parts list, inside the job editor. Each change saves straight away.
 * The total (with tax) can be copied into the job's "You spent".
 */
export default function PartsEditor({ jobId, onUseTotal }: { jobId?: string; onUseTotal: (total: number) => void }) {
  const [parts, setParts] = useState<PartRow[] | null>(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState<Draft | null>(null);

  const load = useCallback(async () => {
    if (!jobId) return;
    const { data, error } = await supabase!.from("job_parts").select("*").eq("job_id", jobId).order("sort").order("created_at");
    if (error) setError(error.message); else setParts(data as PartRow[]);
  }, [jobId]);
  useEffect(() => { load(); }, [load]);

  if (!jobId) {
    return <p className="mt-6 rounded-card border border-line bg-bg2 p-4 text-[.88rem] text-muted">Save the job first, then open it again to add its parts.</p>;
  }

  const save = async (id: string, patch: Partial<PartRow>) => {
    setParts((cur) => cur?.map((p) => (p.id === id ? { ...p, ...patch } : p)) ?? null);
    const { error } = await supabase!.from("job_parts").update(patch).eq("id", id);
    if (error) { setError(error.message); load(); }
  };
  const remove = async (id: string) => {
    setParts((cur) => cur?.filter((p) => p.id !== id) ?? null);
    const { error } = await supabase!.from("job_parts").delete().eq("id", id);
    if (error) { setError(error.message); load(); }
  };
  const add = async () => {
    if (!adding?.name.trim()) return;
    const { id: _drop, ...body } = adding;
    const { error } = await supabase!.from("job_parts").insert({ ...body, job_id: jobId, name: adding.name.trim(), source: adding.source || null, price: num(adding.price), qty: num(adding.qty) || 1 });
    if (error) { setError(error.message); return; }
    setAdding(blank((parts?.length ?? 0) * 10 + 10));
    load();
  };

  const subtotal = (parts ?? []).reduce((s, p) => s + num(p.price) * num(p.qty), 0);
  const withTax = Math.round(subtotal * (1 + TAX) * 100) / 100;

  return (
    <div className="mt-6 border-t border-line pt-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-[1.05rem]">Parts</h3>
          <p className="text-[.8rem] text-muted">Changes here save right away.</p>
        </div>
        <div className="text-right text-[.85rem]">
          <span className="text-muted">Parts </span><span className="font-mono">{money(subtotal)}</span>
          <span className="text-muted"> · with {TAX * 100}% tax </span><span className="font-mono">{money(withTax)}</span>
          {subtotal > 0 && (
            <button type="button" className="ml-3 text-accent underline" onClick={() => onUseTotal(withTax)}>Use as "You spent"</button>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-[.85rem] text-danger" role="alert">{error}</p>}

      <datalist id="part-sources">{PART_SOURCES.map((s) => <option key={s} value={s} />)}</datalist>
      <div className="mt-3 space-y-2">
        {parts === null && <p className="text-[.85rem] text-muted">Loading…</p>}
        {parts?.length === 0 && <p className="text-[.85rem] text-muted">No parts yet.</p>}
        {parts?.map((p) => <PartLine key={p.id} part={p} onSave={(patch) => save(p.id, patch)} onRemove={() => remove(p.id)} />)}
      </div>

      {adding ? (
        <div className="mt-3 rounded-card border border-accent/40 p-3">
          <PartFields value={adding} onChange={(patch) => setAdding({ ...adding, ...patch })} autoFocus />
          <div className="mt-2 flex gap-2">
            <button type="button" className="btn !px-4 !py-1.5 !text-[.82rem]" onClick={add} disabled={!adding.name.trim()}>Add part</button>
            <button type="button" className="btn btn-ghost !px-4 !py-1.5 !text-[.82rem]" onClick={() => setAdding(null)}>Done</button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-ghost mt-3 !py-1.5 !text-[.82rem]" onClick={() => setAdding(blank((parts?.length ?? 0) * 10 + 10))}>+ Add part</button>
      )}
    </div>
  );
}

/** One saved part: edit in place, saves when you leave a field. */
function PartLine({ part, onSave, onRemove }: { part: PartRow; onSave: (patch: Partial<PartRow>) => void; onRemove: () => void }) {
  const [v, setV] = useState<Draft>(part);
  useEffect(() => setV(part), [part]);
  const commit = (patch: Partial<Draft>) => {
    const next = { ...v, ...patch };
    setV(next);
    const changed: Partial<PartRow> = {};
    for (const k of Object.keys(patch) as (keyof Draft)[]) {
      const val = k === "price" || k === "qty" ? num(next[k]) : next[k] === "" ? null : next[k];
      if (val !== part[k as keyof PartRow]) (changed as Record<string, unknown>)[k] = val;
    }
    if (Object.keys(changed).length) onSave(changed);
  };
  return (
    <div className="flex items-start gap-2 rounded-card border border-line bg-bg2 p-2">
      <div className="min-w-0 flex-1"><PartFields value={v} onChange={(patch) => setV({ ...v, ...patch })} onCommit={commit} /></div>
      <button type="button" aria-label={`Remove ${part.name}`} title="Remove part" className="mt-1.5 px-2 text-muted hover:text-danger" onClick={onRemove}>✕</button>
    </div>
  );
}

/** The inputs for one part. Selects save as soon as they change; text and numbers save when you leave them. */
function PartFields({ value: v, onChange, onCommit, autoFocus }: {
  value: Draft; onChange: (patch: Partial<Draft>) => void; onCommit?: (patch: Partial<Draft>) => void; autoFocus?: boolean;
}) {
  const sel = (patch: Partial<Draft>) => (onCommit ? onCommit(patch) : onChange(patch));
  const blur = (k: keyof Draft) => onCommit?.({ [k]: v[k] });
  const cls = "input !rounded-[.6rem] !px-2.5 !py-1.5 !text-[.85rem]";
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-[8.5rem_minmax(0,1fr)_6.5rem_3.5rem_8rem_7rem]">
      <select className={cls} aria-label="Category" value={v.category} onChange={(e) => sel({ category: e.target.value })}>
        {PART_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        {!PART_CATEGORIES.includes(v.category as never) && <option>{v.category}</option>}
      </select>
      <input className={`${cls} col-span-2 sm:col-span-1`} aria-label="Part" placeholder="Part name" value={v.name} autoFocus={autoFocus} onKeyDown={noSubmit}
        onChange={(e) => onChange({ name: e.target.value })} onBlur={() => v.name.trim() && blur("name")} />
      <span className="relative block">
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[.8rem] text-muted">$</span>
        <input className={`${cls} !pl-5`} aria-label="Price" type="number" inputMode="decimal" step="0.01" value={v.price} onKeyDown={noSubmit}
          onChange={(e) => onChange({ price: e.target.value as unknown as number })} onBlur={() => blur("price")} />
      </span>
      <input className={cls} aria-label="Quantity" type="number" min={0} step={1} value={v.qty} onKeyDown={noSubmit} title="How many"
        onChange={(e) => onChange({ qty: e.target.value as unknown as number })} onBlur={() => blur("qty")} />
      <input className={cls} aria-label="Bought from" placeholder="From" list="part-sources" value={v.source ?? ""} onKeyDown={noSubmit}
        onChange={(e) => onChange({ source: e.target.value })} onBlur={() => blur("source")} />
      <select className={cls} aria-label="Status" value={v.status} onChange={(e) => sel({ status: e.target.value as Draft["status"] })}>
        {PART_STATUSES.map((s) => <option key={s}>{s}</option>)}
      </select>
    </div>
  );
}

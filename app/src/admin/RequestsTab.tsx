import { useCallback, useEffect, useMemo, useState } from "react";
import { STATUSES, supabase, type RequestRow, type Status } from "./client";

const STATUS_STYLE: Record<Status, string> = {
  new: "border-accent/60 bg-accent/15 text-accent",
  quoted: "border-accent2/60 bg-accent2/10 text-accent2",
  scheduled: "border-sky-400/50 bg-sky-400/10 text-sky-300",
  done: "border-line bg-bg2 text-muted",
  archived: "border-line text-muted opacity-70",
};

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** Every request sent from the site's forms. Pick one to see all its answers, set its status and keep private notes. */
export default function RequestsTab({ onChange }: { onChange: () => void }) {
  const [rows, setRows] = useState<RequestRow[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"open" | Status | "all">("open");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase!.from("requests").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) setError(error.message); else setRows(data as RequestRow[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter((r) =>
      (filter === "all" || (filter === "open" ? r.status !== "done" && r.status !== "archived" : r.status === filter)) &&
      (!q || [r.name, r.email, r.phone, ...Object.values(r.fields ?? {})].some((v) => v?.toLowerCase().includes(q))));
  }, [rows, filter, search]);
  const open = rows?.find((r) => r.id === openId) ?? null;

  const update = async (id: string, patch: Partial<Pick<RequestRow, "status" | "notes">>) => {
    setRows((cur) => cur?.map((r) => (r.id === id ? { ...r, ...patch } : r)) ?? null);
    const { error } = await supabase!.from("requests").update(patch).eq("id", id);
    if (error) { setError(error.message); load(); }
    onChange();
  };
  const remove = async (r: RequestRow) => {
    if (!confirm(`Delete the request from ${r.name || "this customer"}? This can't be undone.`)) return;
    const { error } = await supabase!.from("requests").delete().eq("id", r.id);
    if (error) { setError(error.message); return; }
    setOpenId(null);
    load();
    onChange();
  };

  const count = (f: typeof filter) => (rows ?? []).filter((r) => f === "all" || (f === "open" ? r.status !== "done" && r.status !== "archived" : r.status === f)).length;

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.8rem]">Requests</h1>
          <p className="text-[.92rem] text-muted">Everything sent through the site's forms (you still get the emails too).</p>
        </div>
        <button type="button" className="btn btn-ghost !py-2 !text-[.85rem]" onClick={load}>Refresh</button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["open", ...STATUSES, "all"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
            className={`rounded-full border px-3 py-1 text-[.8rem] capitalize ${filter === f ? "border-ink/60 bg-card text-ink" : "border-line text-muted hover:text-ink"}`}>
            {f === "open" ? "Open" : f} <span className="font-mono text-[.72rem] opacity-70">{count(f)}</span>
          </button>
        ))}
        <input className="input !w-auto min-w-[12rem] flex-1 !py-2 sm:ml-auto sm:flex-none" type="search" placeholder="Search name, email, details…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error && <p className="mb-4 rounded-card border border-danger/40 p-3 text-[.9rem] text-danger" role="alert">{error}</p>}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <ul className="space-y-2">
          {rows === null && <li className="text-muted">Loading…</li>}
          {rows !== null && shown.length === 0 && <li className="card p-6 text-center text-muted">Nothing here.</li>}
          {shown.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => setOpenId(r.id)}
                className={`card flex w-full items-center gap-3 p-4 text-left text-ink ${openId === r.id ? "border-accent/60" : "hover:border-ink/40"}`}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{r.name || "No name"}</span>
                  <span className="block truncate text-[.82rem] text-muted">
                    <span className="capitalize">{r.type}</span> · {r.fields?.Service || r.fields?.["Device"] || r.email} · {when(r.created_at)}
                  </span>
                </span>
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[.72rem] capitalize ${STATUS_STYLE[r.status]}`}>{r.status}</span>
              </button>
            </li>
          ))}
        </ul>

        {open ? (
          <article className="card p-6 lg:sticky lg:top-24">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow capitalize">{open.type} request</p>
                <h2 className="mt-1 text-2xl">{open.name || "No name"}</h2>
                <p className="text-[.85rem] text-muted">{new Date(open.created_at).toLocaleString()}</p>
              </div>
              <select className="input !w-auto !py-2 capitalize" value={open.status} aria-label="Status"
                onChange={(e) => update(open.id, { status: e.target.value as Status })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {open.email && <a className="btn !py-2 !text-[.85rem]" href={`mailto:${open.email}?subject=${encodeURIComponent(`Your ${open.type} request – HunterPCBuilds`)}`}>Reply by email</a>}
              {open.phone && <a className="btn btn-ghost !py-2 !text-[.85rem]" href={`tel:${open.phone.replace(/[^\d+]/g, "")}`}>Call {open.phone}</a>}
              {open.phone && <a className="btn btn-ghost !py-2 !text-[.85rem]" href={`sms:${open.phone.replace(/[^\d+]/g, "")}`}>Text</a>}
            </div>

            <dl className="mt-5 divide-y divide-line border-y border-line">
              {Object.entries(open.fields ?? {}).map(([k, v]) => (
                <div key={k} className="grid gap-1 py-2.5 sm:grid-cols-[10rem_1fr] sm:gap-4">
                  <dt className="text-[.85rem] text-muted">{k}</dt>
                  <dd className="whitespace-pre-wrap break-words text-[.92rem]">{v}</dd>
                </div>
              ))}
            </dl>

            <Notes key={open.id} initial={open.notes ?? ""} onSave={(notes) => update(open.id, { notes: notes || null })} />
            <button type="button" className="mt-4 text-[.82rem] text-muted underline hover:text-danger" onClick={() => remove(open)}>Delete request</button>
          </article>
        ) : (
          <div className="card hidden p-8 text-center text-muted lg:block">Pick a request to see the details.</div>
        )}
      </div>
    </section>
  );
}

/** Private notes about a request (only you see these). Saves when you press Save or click away. */
function Notes({ initial, onSave }: { initial: string; onSave: (notes: string) => void }) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(true);
  const save = () => { if (!saved) { onSave(text.trim()); setSaved(true); } };
  return (
    <label className="mt-5 block">
      <span className="mb-1 flex justify-between text-[.85rem] text-muted">
        <span>Private notes</span>
        {saved ? <span className="text-[.75rem]">Saved</span> : <button type="button" className="text-accent underline" onClick={save}>Save</button>}
      </span>
      <textarea className="input min-h-[6rem]" value={text} maxLength={5000} placeholder="Quote sent, parts ordered, pickup time…"
        onChange={(e) => { setText(e.target.value); setSaved(false); }} onBlur={save} />
    </label>
  );
}

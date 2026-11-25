import { useCallback, useEffect, useRef, useState } from "react";
import CloseX from "../components/CloseX";
import { supabase } from "./client";
import { cropToJpeg, loadPhoto, type Crop } from "./resize";
import Cropper from "./Cropper";
import { money, num } from "./money";
import { PHOTO_BUCKET, photoUrl } from "../lib/supabase";
import { printTabs, shopTabs, type PrintTab, type ShopTab } from "../content/shop";

type TabId = ShopTab | PrintTab;
/** The Shop's own tabs, then the 3D Prints page's (Print Shop and the past prints gallery). */
const allTabs = [...shopTabs, ...printTabs];
const isPrint = (t: TabId) => t === "prints" || t === "past_prints";
const MATERIALS = ["PLA", "PETG", "TPU"];
const tabError = (msg: string) => /shop_items_tab_check|colors/.test(msg)
  ? "3D prints need a database update first. Run 8-3d-prints.sql in Supabase (SQL Editor → New query → paste → Run)."
  : msg;

/** A shop item as stored in the database (supabase/shop-and-trade-ins.sql). */
interface ShopRow {
  id: string;
  tab: TabId;
  name: string;
  price: number;
  condition: string | null;
  note: string | null;
  specs: string[];
  photos: string[];
  status: "available" | "reserved" | "sold";
  published: boolean;
  cost: number | null;
  colors?: string[];
  sort_order: number;
  created_at: string;
}
type Draft = Omit<ShopRow, "id" | "created_at" | "sort_order" | "price" | "cost" | "colors"> & { id?: string; price: string; cost: string; colors: string[] };

const STATUSES = [
  { id: "available", label: "Available", cls: "border-accent/60 bg-accent/15 text-accent" },
  { id: "reserved", label: "Reserved", cls: "border-accent2/60 bg-accent2/15 text-accent2" },
  { id: "sold", label: "Sold", cls: "border-line bg-bg2 text-ink" },
] as const;
const CONDITIONS = ["New build", "Refurbished", "Refurbished · A grade", "Refurbished · B grade", "Used · tested", "For parts"];
const blank = (tab: TabId): Draft => ({
  tab, name: "", price: "", cost: "", note: "", specs: [], photos: [], status: "available", published: true, colors: [],
  condition: tab === "pcs" ? "New build" : tab === "laptops" ? "Refurbished" : isPrint(tab) ? "PLA" : "Used · tested",
});

/** Shop: what's for sale on the site's Shop page. Changes show the next time a page loads. */
export default function ShopTab() {
  const [items, setItems] = useState<ShopRow[] | null>(null);
  const [error, setError] = useState("");
  const [show, setShow] = useState<TabId | "all">("all");
  const [editing, setEditing] = useState<Draft | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase!.from("shop_items").select("*").order("sort_order").order("created_at", { ascending: false });
    if (error) {
      setError(error.code === "PGRST205" || error.message.includes("does not exist")
        ? "The Shop needs its table first. Run 7-shop-and-trade-ins.sql in Supabase (SQL Editor → New query → paste → Run)."
        : error.message);
      setItems([]);
    } else { setError(""); setItems(data as ShopRow[]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const patch = async (it: ShopRow, change: Partial<ShopRow>) => {
    setItems((cur) => cur?.map((x) => (x.id === it.id ? { ...x, ...change } : x)) ?? null);
    const { error } = await supabase!.from("shop_items").update(change).eq("id", it.id);
    if (error) { setError(tabError(error.message)); load(); }
  };

  const move = async (list: ShopRow[], index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[index], next[j]] = [next[j], next[index]];
    const renum = next.map((b, i) => ({ ...b, sort_order: (i + 1) * 10 }));
    setItems((cur) => cur?.map((x) => renum.find((r) => r.id === x.id) ?? x).sort((a, b) => a.sort_order - b.sort_order) ?? null);
    const res = await Promise.all(renum.map((b) => supabase!.from("shop_items").update({ sort_order: b.sort_order }).eq("id", b.id)));
    const failed = res.find((r) => r.error);
    if (failed?.error) { setError(failed.error.message); load(); }
  };

  const remove = async (it: ShopRow) => {
    if (!confirm(`Delete "${it.name}" and its photos? This can't be undone. (To keep it but hide it, mark it Sold or turn off "On the site".)`)) return;
    const { error } = await supabase!.from("shop_items").delete().eq("id", it.id);
    if (error) { setError(error.message); return; }
    if (it.photos.length) await supabase!.storage.from(PHOTO_BUCKET).remove(it.photos);
    load();
  };

  const all = items ?? [];
  const rows = all.filter((x) => show === "all" || x.tab === show);
  const live = all.filter((x) => x.published && x.status !== "sold");
  const sold = all.filter((x) => x.status === "sold");
  const soldProfit = sold.filter((x) => x.cost != null).reduce((s, x) => s + num(x.price) - num(x.cost), 0);

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.8rem]">Shop</h1>
          <p className="text-[.92rem] text-muted">What's for sale on the site's Shop page, plus the Print Shop and past prints on the 3D Prints page. Top of the list shows first. Changes appear the next time a page loads.</p>
        </div>
        <button type="button" className="btn" onClick={() => setEditing(blank(show === "all" ? "pcs" : show))} disabled={!!error && !all.length}>+ Add an item</button>
      </div>
      {error && <p className="mb-4 rounded-card border border-danger/40 p-3 text-[.9rem] text-danger" role="alert">{error}</p>}
      {items === null ? <p className="text-muted">Loading…</p> : (
        <>
          <dl className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["For sale now", String(live.length)],
              ["Value for sale", money(live.reduce((s, x) => s + num(x.price), 0))],
              ["Sold", String(sold.length)],
              ["Profit on sold (with cost)", money(soldProfit)],
            ].map(([l, v]) => (
              <div key={l} className="rounded-card border border-line bg-bg2 px-4 py-3"><dt className="text-[.75rem] text-muted">{l}</dt><dd className="font-mono text-[1.05rem]">{v}</dd></div>
            ))}
          </dl>
          <div className="mb-4 flex flex-wrap gap-2">
            {([["all", "All"], ...allTabs.map((t) => [t.id, t.label])] as [TabId | "all", string][]).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setShow(id)} aria-pressed={show === id}
                className={`rounded-full border px-3 py-1 text-[.8rem] ${show === id ? "border-ink/60 bg-card text-ink" : "border-line text-muted hover:text-ink"}`}>
                {label} <span className="font-mono text-[.72rem] opacity-70">{id === "all" ? all.length : all.filter((x) => x.tab === id).length}</span>
              </button>
            ))}
          </div>
          {rows.length === 0 ? (
            <div className="card p-8 text-center text-muted">
              {all.length ? "Nothing in this tab." : <>Nothing for sale yet. Press <b className="text-ink">Add an item</b> and it shows on the site's Shop page.</>}
            </div>
          ) : (
            <ul className="space-y-3">
              {rows.map((it, i) => (
                <li key={it.id} className={`card flex flex-wrap items-center gap-4 p-3 ${it.published ? "" : "opacity-60"}`}>
                  <div className="flex flex-col">
                    <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(rows, i, -1)} className="px-2 text-muted hover:text-ink disabled:opacity-30">▲</button>
                    <button type="button" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(rows, i, 1)} className="px-2 text-muted hover:text-ink disabled:opacity-30">▼</button>
                  </div>
                  {it.photos[0]
                    ? <img src={photoUrl(it.photos[0])} alt="" className="h-16 w-16 rounded-md object-cover" />
                    : <div className="grid h-16 w-16 place-items-center rounded-md bg-bg2 text-[.7rem] text-muted">No photo</div>}
                  <div className="min-w-[10rem] flex-1">
                    <p className="font-medium">{it.name}</p>
                    <p className="text-[.85rem] text-muted">
                      {[allTabs.find((t) => t.id === it.tab)?.label, it.condition, it.tab === "past_prints" ? "" : money(it.price), it.cost != null ? `cost ${money(it.cost)}` : ""].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {it.tab !== "past_prints" && STATUSES.map((s) => (
                      <button key={s.id} type="button" aria-pressed={it.status === s.id} onClick={() => patch(it, { status: s.id })}
                        className={`rounded-full border px-3 py-1 text-[.78rem] ${it.status === s.id ? s.cls : "border-line text-muted hover:text-ink"}`}>{s.label}</button>
                    ))}
                    <button type="button" aria-pressed={it.published} title="Off = hidden from the site" onClick={() => patch(it, { published: !it.published })}
                      className={`rounded-full border px-3 py-1 text-[.78rem] ${it.published ? "border-accent/60 text-accent" : "border-line text-muted"}`}>{it.published ? "✓ On the site" : "Hidden"}</button>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-ghost !px-4 !py-1.5 !text-[.85rem]"
                      onClick={() => setEditing({ ...it, price: String(it.price), cost: it.cost != null ? String(it.cost) : "", condition: it.condition ?? "", note: it.note ?? "", colors: it.colors ?? [] })}>Edit</button>
                    <button type="button" className="rounded-card px-3 text-[.85rem] text-muted hover:text-danger" onClick={() => remove(it)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {editing && (
        <ShopEditor draft={editing} nextOrder={all.length ? Math.min(...all.map((b) => b.sort_order)) - 10 : 10}
          onClose={(saved) => { setEditing(null); if (saved) load(); }} />
      )}
    </section>
  );
}

/** Add / edit one shop item. Photos upload as soon as you crop them. */
function ShopEditor({ draft, nextOrder, onClose }: { draft: Draft; nextOrder: number; onClose: (saved: boolean) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [d, setD] = useState<Draft>(draft);
  const [specsText, setSpecsText] = useState(draft.specs.join("\n"));
  const [colorsText, setColorsText] = useState(draft.colors.join(", "));
  const [uploading, setUploading] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const uploaded = useRef<string[]>([]);
  const removed = useRef<string[]>([]);
  const [toCrop, setToCrop] = useState<{ id: string; img: ImageBitmap; name: string }[]>([]);
  useEffect(() => { dialog.current?.showModal(); }, []);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError("");
    for (const file of Array.from(files)) {
      try { const img = await loadPhoto(file); setToCrop((q) => [...q, { id: crypto.randomUUID(), img, name: file.name }]); }
      catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    }
  };
  const finishCrop = async (crop: Crop) => {
    const item = toCrop[0];
    setToCrop((q) => q.slice(1));
    setUploading((n) => n + 1);
    try {
      const blob = await cropToJpeg(item.img, crop);
      const path = `shop/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase!.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (error) throw error;
      uploaded.current.push(path);
      setD((cur) => ({ ...cur, photos: [...cur.photos, path] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      item.img.close();
      setUploading((n) => n - 1);
    }
  };
  const skipCrop = () => { toCrop[0]?.img.close(); setToCrop((q) => q.slice(1)); };
  const movePhoto = (i: number, dir: -1 | 1) => setD((cur) => {
    const photos = [...cur.photos]; const j = i + dir;
    if (j < 0 || j >= photos.length) return cur;
    [photos[i], photos[j]] = [photos[j], photos[i]];
    return { ...cur, photos };
  });
  const removePhoto = (path: string) => { removed.current.push(path); setD((cur) => ({ ...cur, photos: cur.photos.filter((p) => p !== path) })); };

  const dirty = JSON.stringify({ ...d, specs: specsText, colors: colorsText }) !== JSON.stringify({ ...draft, specs: draft.specs.join("\n"), colors: draft.colors.join(", ") });
  const print = isPrint(d.tab);
  const past = d.tab === "past_prints";
  const cancel = async () => {
    if (dirty && !confirm("Close without saving? Photos you just added won't be kept.")) return;
    if (uploaded.current.length) await supabase!.storage.from(PHOTO_BUCKET).remove(uploaded.current);
    onClose(false);
  };
  const save = async () => {
    if (!d.name.trim()) { setError("Give the item a name."); return; }
    if (!past && (!d.price.trim() || !(num(d.price) >= 0))) { setError("Enter a price."); return; }
    setBusy(true);
    setError("");
    const row = {
      tab: d.tab, name: d.name.trim(), price: past ? 0 : num(d.price), cost: d.cost.trim() ? num(d.cost) : null,
      condition: d.condition?.trim() || null, note: d.note?.trim() || null,
      specs: specsText.split("\n").map((s) => s.trim()).filter(Boolean), photos: d.photos, status: past ? "sold" as const : d.status, published: d.published,
      ...(print ? { colors: colorsText.split(",").map((s) => s.trim()).filter(Boolean) } : {}),
    };
    const { error } = d.id
      ? await supabase!.from("shop_items").update(row).eq("id", d.id)
      : await supabase!.from("shop_items").insert({ ...row, sort_order: nextOrder });
    if (error) { setBusy(false); setError(tabError(error.message)); return; }
    const gone = removed.current.filter((p) => !d.photos.includes(p));
    if (gone.length) await supabase!.storage.from(PHOTO_BUCKET).remove(gone);
    onClose(true);
  };

  const L = "mb-1 block text-[.85rem] text-muted";
  return (
    <dialog ref={dialog} onCancel={(e) => { e.preventDefault(); cancel(); }} className="m-auto w-[min(94vw,46rem)] rounded-card border border-line bg-card p-0 text-ink">
      <div className="max-h-[88vh] overflow-y-auto p-6">
        <CloseX onClick={() => void cancel()} />
        <h2 className="text-2xl">{d.id ? "Edit item" : "Add an item"}</h2>

        <div className="mt-5 flex flex-wrap gap-2" role="radiogroup" aria-label="Which tab">
          {allTabs.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={d.tab === t.id} onClick={() => setD({ ...d, tab: t.id, condition: isPrint(t.id) !== isPrint(d.tab) ? blank(t.id).condition : d.condition })}
              className={`rounded-full border px-4 py-1.5 text-[.85rem] ${d.tab === t.id ? "border-accent bg-accent/15 text-accent" : "border-line text-muted hover:text-ink"}`}>{t.label}</button>
          ))}
        </div>

        {print && <p className="mt-3 text-[.82rem] text-muted">{past ? "Shows in the \"Prints I've made\" gallery on the 3D Prints page. Add a photo, or it won't show." : "For sale in the Print Shop on the 3D Prints page. Customers pick a color when they order."}</p>}
        <div className={`mt-4 grid gap-4 ${past ? "" : "sm:grid-cols-[1fr_8rem_8rem]"}`}>
          <label className="block"><span className={L}>Name</span>
            <input className="input" value={d.name} maxLength={120} placeholder={d.tab === "pcs" ? "e.g. White 1440p gaming PC" : d.tab === "laptops" ? "e.g. Dell Latitude 7420" : print ? "e.g. GPU support bracket" : "e.g. RTX 3070 Founders"} onChange={(e) => setD({ ...d, name: e.target.value })} /></label>
          {!past && <>
          <label className="block"><span className={L}>Price ($)</span>
            <input className="input font-mono" inputMode="decimal" value={d.price} placeholder="549" onChange={(e) => setD({ ...d, price: e.target.value })} /></label>
          <label className="block"><span className={L}>Your cost <span className="text-[.75rem]">(private)</span></span>
            <input className="input font-mono" inputMode="decimal" value={d.cost} placeholder="optional" onChange={(e) => setD({ ...d, cost: e.target.value })} /></label>
          </>}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block"><span className={L}>{print ? "Material" : "Condition"}</span>
            <input className="input" list={print ? "print-materials" : "shop-conditions"} maxLength={60} value={d.condition ?? ""} onChange={(e) => setD({ ...d, condition: e.target.value })} />
            <datalist id="shop-conditions">{CONDITIONS.map((c) => <option key={c} value={c} />)}</datalist>
            <datalist id="print-materials">{MATERIALS.map((c) => <option key={c} value={c} />)}</datalist></label>
          <label className="block"><span className={L}>Tag on the photo (optional)</span>
            <input className="input" maxLength={40} value={d.note ?? ""} placeholder={print ? "Fits most GPUs" : "1440p gaming"} onChange={(e) => setD({ ...d, note: e.target.value })} /></label>
        </div>

        {print && !past && (
          <label className="mt-4 block"><span className={L}>Colors it comes in, separated by commas</span>
            <input className="input" value={colorsText} placeholder="Black, White, Gray" onChange={(e) => setColorsText(e.target.value)} /></label>
        )}

        <label className="mt-4 block"><span className={L}>{print ? "Details, one per line" : "Specs, one per line"}</span>
          <textarea className="input min-h-[7rem]" value={specsText} placeholder={print ? "About 4 in tall\nAdjustable height\nPrinted to order, 2 to 5 days" : "Ryzen 5 7600\nRTX 4060 Ti\n32GB DDR5\n1TB NVMe"} onChange={(e) => setSpecsText(e.target.value)} /></label>

        <div className="mt-5">
          <span className="mb-2 block text-[.85rem] text-muted">Photos (the first one is the cover)</span>
          <div className="flex flex-wrap gap-3">
            {d.photos.map((p, i) => (
              <div key={p}>
                <img src={photoUrl(p)} alt={`Photo ${i + 1}`} className={`h-28 w-28 rounded-md object-cover ${i === 0 ? "ring-2 ring-accent" : ""}`} />
                <div className="mt-1 flex justify-between text-[.8rem]">
                  <button type="button" aria-label="Move photo left" disabled={i === 0} onClick={() => movePhoto(i, -1)} className="px-1 text-muted hover:text-ink disabled:opacity-30">◀</button>
                  <button type="button" onClick={() => removePhoto(p)} className="text-muted hover:text-danger">Remove</button>
                  <button type="button" aria-label="Move photo right" disabled={i === d.photos.length - 1} onClick={() => movePhoto(i, 1)} className="px-1 text-muted hover:text-ink disabled:opacity-30">▶</button>
                </div>
              </div>
            ))}
            <label className="grid h-28 w-28 cursor-pointer place-items-center rounded-md border-2 border-dashed border-line text-center text-[.8rem] text-muted hover:border-accent hover:text-accent">
              {uploading > 0 ? `Uploading ${uploading}…` : "+ Add photos"}
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            </label>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {!past && <span className="mr-1 text-[.85rem] text-muted">Status</span>}
          {!past && STATUSES.map((s) => (
            <button key={s.id} type="button" aria-pressed={d.status === s.id} onClick={() => setD({ ...d, status: s.id })}
              className={`rounded-full border px-3 py-1 text-[.8rem] ${d.status === s.id ? s.cls : "border-line text-muted hover:text-ink"}`}>{s.label}</button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-[.88rem]">
            <input type="checkbox" className="accent-[var(--accent)]" checked={d.published} onChange={(e) => setD({ ...d, published: e.target.checked })} /> Show on the site
          </label>
        </div>

        {toCrop[0] && <Cropper key={toCrop[0].id} img={toCrop[0].img} name={toCrop[0].name} onDone={finishCrop} onSkip={skipCrop} />}
        {error && <p className="mt-4 text-[.9rem] text-danger" role="alert">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn btn-ghost" onClick={cancel} disabled={busy}>Cancel</button>
          <button type="button" className="btn" onClick={save} disabled={busy || uploading > 0}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </dialog>
  );
}

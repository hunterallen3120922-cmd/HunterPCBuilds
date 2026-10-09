import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./client";
import { cropToJpeg, loadPhoto, type Crop } from "./resize";
import Cropper from "./Cropper";
import { PHOTO_BUCKET, photoUrl, type BuildRow } from "../lib/supabase";
import { heroPhotos } from "../content/heroPhotos";
import { photoSrc } from "../components/HeroPhotos";

/** Where each switch puts a build on the site. */
const PLACES: { key: "featured" | "in_gallery" | "in_slideshow" | "published"; label: string; help: string }[] = [
  { key: "published", label: "Published", help: "Off = hidden from the site (a draft)" },
  { key: "featured", label: "Home carousel", help: "Shown in the carousel on the home page" },
  { key: "in_gallery", label: "Past builds", help: "Shown in Past builds on the PC Builds page" },
  { key: "in_slideshow", label: "Slideshow", help: "Its photos rotate at the top of the PC Builds page" },
];

type Draft = Omit<BuildRow, "id" | "created_at" | "sort_order"> & { id?: string; sort_order?: number };
const EMPTY: Draft = { title: "", specs: [], price: "", photos: [], featured: false, in_gallery: true, in_slideshow: true, published: true };

/** Builds: add, edit, reorder, choose where each shows, delete. Changes show on the site on the next page load. */
export default function BuildsTab() {
  const [builds, setBuilds] = useState<BuildRow[] | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Draft | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase!.from("builds").select("*").order("sort_order").order("created_at", { ascending: false });
    if (error) setError(error.message); else setBuilds(data as BuildRow[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (b: BuildRow, key: (typeof PLACES)[number]["key"]) => {
    setBuilds((cur) => cur?.map((x) => (x.id === b.id ? { ...x, [key]: !b[key] } : x)) ?? null);
    const { error } = await supabase!.from("builds").update({ [key]: !b[key] }).eq("id", b.id);
    if (error) { setError(error.message); load(); }
  };

  // Moving renumbers everything 10, 20, 30… so the order is always clean.
  const move = async (index: number, dir: -1 | 1) => {
    if (!builds) return;
    const next = [...builds];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    const renumbered = next.map((b, i) => ({ ...b, sort_order: (i + 1) * 10 }));
    setBuilds(renumbered);
    const changed = renumbered.filter((b, i) => b.sort_order !== builds[i]?.sort_order || b.id !== builds[i]?.id);
    const results = await Promise.all(changed.map((b) => supabase!.from("builds").update({ sort_order: b.sort_order }).eq("id", b.id)));
    const failed = results.find((r) => r.error);
    if (failed?.error) { setError(failed.error.message); load(); }
  };

  // One-time import of the photos already in the site's slideshow (content/heroPhotos.ts), one build per photo,
  // shown in the slideshow only, so the site looks the same until you name and organize them.
  const [importing, setImporting] = useState("");
  const importSlideshow = async () => {
    const list = heroPhotos.pcBuilds;
    for (const [i, p] of list.entries()) {
      setImporting(`Importing ${i + 1} of ${list.length}…`);
      try {
        const blob = await (await fetch(photoSrc(p.photo))).blob();
        const key = `imported/${p.photo}`;
        const up = await supabase!.storage.from(PHOTO_BUCKET).upload(key, blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: true });
        if (up.error) throw up.error;
        const words = p.photo.replace(/^build-/, "").replace(/\.\w+$/, "").replace(/-closeup$/, "").split("-");
        const title = `${words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")} build`;
        const { error } = await supabase!.from("builds").insert({ title, photos: [key], specs: [], featured: false, in_gallery: false, in_slideshow: true, published: true, sort_order: (i + 1) * 10 });
        if (error) throw error;
      } catch (err) {
        setError(`Import stopped at ${p.photo}: ${err instanceof Error ? err.message : String(err)}`);
        break;
      }
    }
    setImporting("");
    load();
  };

  const remove = async (b: BuildRow) => {
    if (!confirm(`Delete "${b.title}" and its photos? This can't be undone.`)) return;
    const { error } = await supabase!.from("builds").delete().eq("id", b.id);
    if (error) { setError(error.message); return; }
    if (b.photos.length) await supabase!.storage.from(PHOTO_BUCKET).remove(b.photos);
    load();
  };

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.8rem]">Builds</h1>
          <p className="text-[.92rem] text-muted">Top of the list shows first on the site. Changes appear the next time a page loads.</p>
        </div>
        <button type="button" className="btn" onClick={() => setEditing({ ...EMPTY })}>+ Add a build</button>
      </div>
      {error && <p className="mb-4 rounded-card border border-danger/40 p-3 text-[.9rem] text-danger" role="alert">{error}</p>}
      {builds === null ? <p className="text-muted">Loading…</p> : builds.length === 0 ? (
        <div className="card p-8 text-center text-muted">
          <p>No builds yet. Press <b className="text-ink">Add a build</b> to put your first one on the site.</p>
          {heroPhotos.pcBuilds.length > 0 && (
            <>
              <p className="mt-4 text-[.9rem]">Or bring in the {heroPhotos.pcBuilds.length} photos already in your slideshow (one build each, slideshow only), then name them and choose where they show.</p>
              <button type="button" className="btn btn-ghost mt-4" disabled={!!importing} onClick={importSlideshow}>
                {importing || `Import ${heroPhotos.pcBuilds.length} slideshow photos`}
              </button>
            </>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {builds.map((b, i) => (
            <li key={b.id} className={`card flex flex-wrap items-center gap-4 p-3 ${b.published ? "" : "opacity-60"}`}>
              <div className="flex flex-col">
                <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="px-2 text-muted hover:text-ink disabled:opacity-30">▲</button>
                <button type="button" aria-label="Move down" disabled={i === builds.length - 1} onClick={() => move(i, 1)} className="px-2 text-muted hover:text-ink disabled:opacity-30">▼</button>
              </div>
              {b.photos[0]
                ? <img src={photoUrl(b.photos[0])} alt="" className="h-16 w-16 rounded-md object-cover" />
                : <div className="grid h-16 w-16 place-items-center rounded-md bg-bg2 text-[.7rem] text-muted">No photo</div>}
              <div className="min-w-[10rem] flex-1">
                <p className="font-medium">{b.title}</p>
                <p className="text-[.85rem] text-muted">{[b.price, `${b.photos.length} photo${b.photos.length === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PLACES.map((p) => (
                  <button key={p.key} type="button" title={p.help} aria-pressed={b[p.key]} onClick={() => toggle(b, p.key)}
                    className={`rounded-full border px-3 py-1 text-[.78rem] ${b[p.key] ? "border-accent/60 bg-accent/15 text-accent" : "border-line text-muted hover:text-ink"}`}>
                    {b[p.key] ? "✓ " : ""}{p.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn btn-ghost !px-4 !py-1.5 !text-[.85rem]" onClick={() => setEditing({ ...b })}>Edit</button>
                <button type="button" className="rounded-card px-3 text-[.85rem] text-muted hover:text-danger" onClick={() => remove(b)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <BuildEditor draft={editing} nextOrder={builds?.length ? Math.min(...builds.map((b) => b.sort_order)) - 10 : 10}
          onClose={(saved) => { setEditing(null); if (saved) load(); }} />
      )}
    </section>
  );
}

/** Add / edit one build in a dialog. Photos upload as soon as you pick them (shrunk first). */
function BuildEditor({ draft, nextOrder, onClose }: { draft: Draft; nextOrder: number; onClose: (saved: boolean) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [d, setD] = useState<Draft>(draft);
  const [specsText, setSpecsText] = useState(draft.specs.join("\n"));
  const [uploading, setUploading] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const uploaded = useRef<string[]>([]); // uploaded in this session (removed again if you cancel)
  const removed = useRef<string[]>([]); // existing photos you removed (deleted from storage when you save)

  useEffect(() => { dialog.current?.showModal(); }, []);

  // Photos waiting to be cropped, one at a time. `replace` = an existing photo being re-cropped.
  const [toCrop, setToCrop] = useState<{ id: string; img: ImageBitmap; name: string; replace?: string }[]>([]);
  const [opening, setOpening] = useState(false);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError("");
    for (const file of Array.from(files)) {
      try {
        const img = await loadPhoto(file);
        setToCrop((q) => [...q, { id: crypto.randomUUID(), img, name: file.name }]);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  };

  const recrop = async (path: string) => {
    setError("");
    setOpening(true);
    try {
      const img = await loadPhoto(photoUrl(path));
      setToCrop((q) => [...q, { id: crypto.randomUUID(), img, name: "Existing photo", replace: path }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOpening(false);
    }
  };

  // Crop chosen: shrink, upload, and add it (or swap it in for the photo being re-cropped)
  const finishCrop = async (crop: Crop) => {
    const item = toCrop[0];
    setToCrop((q) => q.slice(1));
    setUploading((n) => n + 1);
    try {
      const blob = await cropToJpeg(item.img, crop);
      const path = `builds/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase!.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (error) throw error;
      uploaded.current.push(path);
      if (item.replace) {
        const old = item.replace;
        removed.current.push(old);
        setD((cur) => ({ ...cur, photos: cur.photos.map((p) => (p === old ? path : p)) }));
      } else {
        setD((cur) => ({ ...cur, photos: [...cur.photos, path] }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      item.img.close();
      setUploading((n) => n - 1);
    }
  };
  const skipCrop = () => {
    toCrop[0]?.img.close();
    setToCrop((q) => q.slice(1));
  };

  const movePhoto = (i: number, dir: -1 | 1) => setD((cur) => {
    const photos = [...cur.photos];
    const j = i + dir;
    if (j < 0 || j >= photos.length) return cur;
    [photos[i], photos[j]] = [photos[j], photos[i]];
    return { ...cur, photos };
  });
  const removePhoto = (path: string) => {
    removed.current.push(path);
    setD((cur) => ({ ...cur, photos: cur.photos.filter((p) => p !== path) }));
  };

  // Anything changed since the dialog opened? (so closing never silently throws away new photos)
  const dirty = JSON.stringify({ ...d, specs: specsText }) !== JSON.stringify({ ...draft, specs: draft.specs.join("\n") });

  const cancel = async () => {
    if (dirty && !confirm("Close without saving? Photos you just added won't be kept.")) return;
    if (uploaded.current.length) await supabase!.storage.from(PHOTO_BUCKET).remove(uploaded.current);
    onClose(false);
  };

  const save = async () => {
    if (!d.title.trim()) { setError("Give the build a name."); return; }
    setBusy(true);
    setError("");
    const row = {
      title: d.title.trim(),
      price: d.price?.trim() || null,
      specs: specsText.split("\n").map((s) => s.trim()).filter(Boolean),
      photos: d.photos,
      featured: d.featured, in_gallery: d.in_gallery, in_slideshow: d.in_slideshow, published: d.published,
    };
    const { error } = d.id
      ? await supabase!.from("builds").update(row).eq("id", d.id)
      : await supabase!.from("builds").insert({ ...row, sort_order: nextOrder });
    if (error) { setBusy(false); setError(error.message); return; }
    const gone = removed.current.filter((p) => !d.photos.includes(p));
    if (gone.length) await supabase!.storage.from(PHOTO_BUCKET).remove(gone);
    onClose(true);
  };

  return (
    <dialog ref={dialog} onCancel={(e) => { e.preventDefault(); cancel(); }}
      className="m-auto w-[min(94vw,46rem)] rounded-card border border-line bg-card p-0 text-ink">
      <div className="max-h-[88vh] overflow-y-auto p-6">
        <h2 className="text-2xl">{d.id ? "Edit build" : "Add a build"}</h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_10rem]">
          <label className="block">
            <span className="mb-1 block text-[.85rem] text-muted">Name</span>
            <input className="input" value={d.title} maxLength={120} placeholder="e.g. White 1440p gaming build"
              onChange={(e) => setD({ ...d, title: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[.85rem] text-muted">Price (optional)</span>
            <input className="input" value={d.price ?? ""} maxLength={40} placeholder="$1,200" onChange={(e) => setD({ ...d, price: e.target.value })} />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-[.85rem] text-muted">Specs, one per line</span>
          <textarea className="input min-h-[7rem]" value={specsText} placeholder={"Ryzen 5 7600\nRTX 4060 Ti\n32 GB DDR5\n1 TB NVMe SSD"}
            onChange={(e) => setSpecsText(e.target.value)} />
        </label>

        <div className="mt-5">
          <span className="mb-2 block text-[.85rem] text-muted">Photos (the first one is the cover)</span>
          <div className="flex flex-wrap gap-3">
            {d.photos.map((p, i) => (
              <div key={p} className="relative">
                <img src={photoUrl(p)} alt={`Photo ${i + 1}`} className={`h-28 w-28 rounded-md object-cover ${i === 0 ? "ring-2 ring-accent" : ""}`} />
                <div className="mt-1 flex justify-between text-[.8rem]">
                  <button type="button" aria-label="Move photo left" disabled={i === 0} onClick={() => movePhoto(i, -1)} className="px-1 text-muted hover:text-ink disabled:opacity-30">◀</button>
                  <button type="button" onClick={() => recrop(p)} disabled={opening} className="text-muted hover:text-accent">Crop</button>
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

        <fieldset className="mt-5">
          <legend className="mb-2 text-[.85rem] text-muted">Where it shows</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {PLACES.map((p) => (
              <label key={p.key} className="flex cursor-pointer items-start gap-3 rounded-card border border-line p-3">
                <input type="checkbox" className="mt-1 accent-[var(--accent)]" checked={d[p.key]} onChange={(e) => setD({ ...d, [p.key]: e.target.checked })} />
                <span><span className="block text-[.92rem]">{p.label}</span><span className="block text-[.8rem] text-muted">{p.help}</span></span>
              </label>
            ))}
          </div>
        </fieldset>

        {toCrop[0] && <Cropper key={toCrop[0].id} img={toCrop[0].img} name={toCrop[0].name} onDone={finishCrop} onSkip={skipCrop} />}
        {error && <p className="mt-4 text-[.9rem] text-danger" role="alert">{error}</p>}
        {dirty && !error && (
          <p className="mt-4 rounded-card border border-accent/40 bg-accent/10 px-3 py-2 text-[.88rem] text-accent">
            {uploading > 0 ? "Uploading photos…" : "Not on the site yet. Press Save to publish your changes."}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn btn-ghost" onClick={cancel} disabled={busy}>Cancel</button>
          <button type="button" className="btn" onClick={save} disabled={busy || uploading > 0}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </dialog>
  );
}

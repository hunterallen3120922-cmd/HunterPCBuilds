import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "./client";
import { PRINT_STATUS, STATUSES_FOR, day, money, num, today, type QuoteRow } from "./money";
import { PRINT_UPLOAD_BUCKET } from "../lib/supabase";

/**
 * One custom 3D print request from the site's 3D Prints page.
 * See what they asked for and the site's ballpark, open their files, set your price, copy a reply,
 * and when it's done, log it in the 3D prints tab.
 */
export default function PrintRequestEditor({ quote, onClose }: { quote: QuoteRow; onClose: () => void }) {
  const p = quote.print_job ?? {};
  const [status, setStatus] = useState(quote.status);
  const [price, setPrice] = useState(quote.offer != null ? String(quote.offer) : "");
  const [notes, setNotes] = useState(quote.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [links, setLinks] = useState<Record<string, string>>({});
  const dirty = status !== quote.status || price !== (quote.offer != null ? String(quote.offer) : "") || notes !== (quote.notes ?? "");

  // Private files: make short-lived download links
  useEffect(() => {
    if (!p.files?.length) return;
    supabase!.storage.from(PRINT_UPLOAD_BUCKET).createSignedUrls(p.files, 60 * 60).then(({ data }) => {
      const m: Record<string, string> = {};
      for (const x of data ?? []) if (x.path && x.signedUrl) m[x.path] = x.signedUrl;
      setLinks(m);
    });
  }, [p.files]);

  const save = async (patch?: Partial<Pick<QuoteRow, "status">>) => {
    setBusy(true);
    setError("");
    const row = { status: patch?.status ?? status, offer: price.trim() ? num(price) : null, notes: notes.trim() || null };
    const { error } = await supabase!.from("quotes").update(row).eq("id", quote.id);
    setBusy(false);
    if (error) { setError(error.message); return false; }
    if (patch?.status) setStatus(patch.status);
    setNote("Saved.");
    return true;
  };

  /** Adds a row to the 3D prints tab (the sales log), so it counts in your totals. */
  const logPrint = async () => {
    if (!price.trim()) { setError("Enter the price you charged first."); return; }
    setBusy(true);
    setError("");
    const { error } = await supabase!.from("prints").insert({
      date: today(), customer: quote.customer || null, item: (p.description || quote.title).slice(0, 300),
      material: p.material ?? null, price: num(price), notes: [p.color, p.qty && p.qty > 1 ? `×${p.qty}` : ""].filter(Boolean).join(" · ") || null,
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    await save({ status: "sold" });
    setNote("Added to the 3D prints tab and marked Done. Add the filament cost there.");
  };

  const remove = async () => {
    if (!confirm("Delete this print request and its files? This can't be undone.")) return;
    const { error } = await supabase!.from("quotes").delete().eq("id", quote.id);
    if (error) { setError(error.message); return; }
    if (p.files?.length) await supabase!.storage.from(PRINT_UPLOAD_BUCKET).remove(p.files);
    onClose();
  };

  const first = (quote.customer ?? "").split(" ")[0] || "there";
  const reply = price.trim()
    ? `Hi ${first}, thanks for the 3D print request! I can print ${p.qty && p.qty > 1 ? `${p.qty} of them` : "it"} in ${p.material ?? "PLA"}${p.color && !/any color/i.test(p.color) ? ` (${p.color.toLowerCase()})` : ""} for ${money(price)}. It should be ready in about 2 to 5 days after you say go. Want me to start?`
    : "";
  const copyReply = async () => {
    try { await navigator.clipboard.writeText(reply); setNote("Reply copied. Paste it into a text or email."); } catch { setNote("Couldn't copy. Select the text and copy it yourself."); }
  };
  const fileName = (path: string) => path.split("/").pop() ?? path;

  return (
    <section>
      <button type="button" className="mb-4 text-[.88rem] text-muted hover:text-ink" onClick={() => { if (!dirty || confirm("Leave without saving?")) onClose(); }}>← All quotes</button>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">3D print request · {day(quote.created_at.slice(0, 10))}</p>
          <h1 className="text-[1.8rem]">{quote.title}</h1>
        </div>
        <select className="input !w-auto" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as QuoteRow["status"])}>
          {STATUSES_FOR.print.map((s) => <option key={s} value={s}>{PRINT_STATUS[s]}</option>)}
        </select>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="card p-6">
          <h2 className="mb-4 text-lg">What they asked for</h2>
          {p.description && <p className="mb-5 whitespace-pre-wrap rounded-card border border-line bg-bg2 p-3 text-[.95rem]">{p.description}</p>}
          <dl className="grid gap-x-6 gap-y-3 text-[.92rem] sm:grid-cols-2">
            <Row label="Customer">{quote.customer || "–"}</Row>
            <Row label="Contact">{[quote.contact, p.phone].filter(Boolean).join(" · ") || "–"}{p.contact_by ? <span className="text-muted"> (prefers {p.contact_by.toLowerCase()})</span> : null}</Row>
            <Row label="Size · detail">{[p.size, p.detail].filter(Boolean).join(" · ") || "–"}</Row>
            <Row label="Material · color">{[p.material, p.color].filter(Boolean).join(" · ") || "–"}</Row>
            <Row label="How many">{p.qty ?? 1}</Row>
            <Row label="File">{p.has_file ? "They have a file" : "Needs designing"}</Row>
            <Row label="Site ballpark"><span className="font-mono">{p.estimate ? `${money(p.estimate[0])} – ${money(p.estimate[1])}` : "–"}</span></Row>
          </dl>
          {(p.files?.length || p.files_failed?.length) ? (
            <div className="mt-5">
              <p className="mb-2 text-[.75rem] text-muted">Files they attached</p>
              <ul className="space-y-1.5 text-[.9rem]">
                {p.files?.map((f) => (
                  <li key={f}>{links[f] ? <a href={links[f]} target="_blank" rel="noreferrer" className="text-accent underline">⬇ {fileName(f)}</a> : <span className="text-muted">{fileName(f)}</span>}</li>
                ))}
                {p.files_failed?.map((f) => <li key={f} className="text-danger">{f} (didn't upload, ask them to resend it)</li>)}
              </ul>
            </div>
          ) : null}
          {p.message && <p className="mt-5 whitespace-pre-wrap rounded-card border border-line bg-bg2 p-3 text-[.9rem]"><span className="mb-1 block text-[.75rem] text-muted">Their notes</span>{p.message}</p>}
        </div>

        <div className="card space-y-4 p-6">
          <h2 className="text-lg">Your price</h2>
          <label className="block">
            <span className="mb-1 block text-[.85rem] text-muted">Price ($)</span>
            <input className="input font-mono" inputMode="decimal" value={price} placeholder={p.estimate ? String(p.estimate[0]) : "0"} onChange={(e) => setPrice(e.target.value)} />
          </label>
          {reply && (
            <div>
              <p className="mb-1 text-[.85rem] text-muted">Reply to send them</p>
              <p className="rounded-card border border-line bg-bg2 p-3 text-[.88rem]">{reply}</p>
              <button type="button" className="btn btn-ghost mt-2 w-full !py-2 !text-[.88rem]" onClick={copyReply}>⧉ Copy reply</button>
            </div>
          )}
          <label className="block">
            <span className="mb-1 block text-[.85rem] text-muted">Private notes</span>
            <textarea className="input min-h-[5rem]" maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn flex-1 !py-2" disabled={busy || !dirty} onClick={() => save()}>{busy ? "Saving…" : "Save"}</button>
            {status === "draft" && price.trim() && <button type="button" className="btn btn-ghost !py-2" disabled={busy} onClick={() => save({ status: "sent" })}>Save + mark price sent</button>}
          </div>
          {status !== "sold" && status !== "declined" && (
            <button type="button" className="btn btn-ghost w-full !py-2 !text-[.88rem]" disabled={busy} onClick={logPrint}>✓ Done: add it to the 3D prints tab</button>
          )}
          <button type="button" className="text-[.85rem] text-muted hover:text-danger" onClick={remove}>Delete request</button>
          {error && <p className="text-[.88rem] text-danger" role="alert">{error}</p>}
          {note && !error && <p className="text-[.82rem] text-accent" role="status">{note}</p>}
        </div>
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt className="text-[.75rem] text-muted">{label}</dt><dd>{children}</dd></div>;
}

import { useState, type ReactNode } from "react";
import { supabase } from "./client";
import { STATUSES_FOR, TRADE_IN_STATUS, day, money, num, type QuoteRow } from "./money";

const range = (r?: [number, number] | null) => (r ? `${money(r[0])} – ${money(r[1])}` : "–");

/**
 * One trade-in request from the site's "Sell or trade your parts" page.
 * See what they sent and the site's estimate, set your offer, copy a reply, and track where it stands.
 */
export default function TradeInEditor({ quote, onClose }: { quote: QuoteRow; onClose: () => void }) {
  const t = quote.trade_in ?? {};
  const [status, setStatus] = useState(quote.status);
  const [offer, setOffer] = useState(quote.offer != null ? String(quote.offer) : "");
  const [notes, setNotes] = useState(quote.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const dirty = status !== quote.status || offer !== (quote.offer != null ? String(quote.offer) : "") || notes !== (quote.notes ?? "");

  const save = async (patch?: Partial<Pick<QuoteRow, "status">>) => {
    setBusy(true);
    setError("");
    const row = { status: patch?.status ?? status, offer: offer.trim() ? num(offer) : null, notes: notes.trim() || null };
    const { error } = await supabase!.from("quotes").update(row).eq("id", quote.id);
    setBusy(false);
    if (error) { setError(error.message); return false; }
    if (patch?.status) setStatus(patch.status);
    setNote("Saved.");
    return true;
  };

  const remove = async () => {
    if (!confirm("Delete this trade-in request? This can't be undone.")) return;
    const { error } = await supabase!.from("quotes").delete().eq("id", quote.id);
    if (error) setError(error.message); else onClose();
  };

  const first = (quote.customer ?? "").split(" ")[0] || "there";
  const what = t.model || t.part_type?.toLowerCase();
  const reply = offer.trim()
    ? `Hi ${first}, thanks for reaching out about your ${what || "part"}! I can offer ${money(offer)}${/credit/i.test(t.payout ?? "") ? " in trade-in credit toward a build, repair or anything in my shop" : " cash or Zelle"}, as long as it checks out when I test it in person. Want to set up a time to meet?`
    : "";
  const copyReply = async () => {
    try { await navigator.clipboard.writeText(reply); setNote("Reply copied. Paste it into a text or email."); } catch { setNote("Couldn't copy. Select the text and copy it yourself."); }
  };

  return (
    <section>
      <button type="button" className="mb-4 text-[.88rem] text-muted hover:text-ink" onClick={() => { if (!dirty || confirm("Leave without saving?")) onClose(); }}>← All quotes</button>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Trade-in · {day(quote.created_at.slice(0, 10))}</p>
          <h1 className="text-[1.8rem]">{quote.title}</h1>
        </div>
        <select className="input !w-auto" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as QuoteRow["status"])}>
          {STATUSES_FOR.trade_in.map((s) => <option key={s} value={s}>{TRADE_IN_STATUS[s]}</option>)}
        </select>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="card p-6">
          <h2 className="mb-4 text-lg">What they sent</h2>
          <dl className="grid gap-x-6 gap-y-3 text-[.92rem] sm:grid-cols-2">
            <Row label="Customer">{quote.customer || "–"}</Row>
            <Row label="Contact">{[quote.contact, t.phone].filter(Boolean).join(" · ") || "–"}{t.contact_by ? <span className="text-muted"> (prefers {t.contact_by.toLowerCase()})</span> : null}</Row>
            <Row label="Part">{[t.part_type, t.model].filter(Boolean).join(": ") || "–"}</Row>
            <Row label="Condition">{[t.condition, ...(t.extras ?? [])].filter(Boolean).join(" · ") || "–"}</Row>
            <Row label="Wants">{t.payout || "–"}</Row>
            <Row label="Site estimate">
              <span className="block font-mono">Cash {range(t.estimate_cash)}</span>
              <span className="block font-mono">Credit {range(t.estimate_credit)}</span>
            </Row>
          </dl>
          {t.message && <p className="mt-5 whitespace-pre-wrap rounded-card border border-line bg-bg2 p-3 text-[.9rem]">{t.message}</p>}
        </div>

        <div className="card space-y-4 p-6">
          <h2 className="text-lg">Your offer</h2>
          <label className="block">
            <span className="mb-1 block text-[.85rem] text-muted">Offer ($)</span>
            <input className="input font-mono" inputMode="decimal" value={offer} placeholder={t.estimate_cash ? String(t.estimate_cash[0]) : "0"} onChange={(e) => setOffer(e.target.value)} />
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
            {status === "draft" && offer.trim() && <button type="button" className="btn btn-ghost !py-2" disabled={busy} onClick={() => save({ status: "sent" })}>Save + mark offer sent</button>}
          </div>
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

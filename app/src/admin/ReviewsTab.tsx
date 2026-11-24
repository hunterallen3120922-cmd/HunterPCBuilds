import { useCallback, useEffect, useState } from "react";
import { supabase } from "./client";
import Records, { Totals, type Field } from "./Records";
import { day, today } from "./money";
import { parseEbayFeedback, type PastedPage } from "./reviewPaste";

interface ReviewRow {
  id: string;
  source: string;
  rating: "positive" | "neutral" | "negative";
  comment: string;
  buyer: string | null;
  item: string | null;
  item_number: string | null;
  price: number | null;
  reviewed_on: string;
  published: boolean;
}
interface Stats { ebay_username: string | null; positive_pct: number | null; feedback_count: number | null }

const FIELDS: Field[] = [
  { key: "comment", label: "What they said", type: "textarea", required: true },
  { key: "rating", label: "Rating", type: "select", options: ["positive", "neutral", "negative"], required: true },
  { key: "reviewed_on", label: "Date", type: "date", required: true },
  { key: "buyer", label: "Buyer (as eBay shows it)", type: "text", placeholder: "n***f" },
  { key: "source", label: "Where", type: "select", options: [{ value: "ebay", label: "eBay" }, "in person", { value: "facebook", label: "Facebook" }, "other"], required: true },
  { key: "item", label: "What they bought", type: "text", wide: true, placeholder: "Ryzen 5 5600 + RTX 3060 gaming PC" },
  { key: "price", label: "Price", type: "money" },
  { key: "item_number", label: "eBay item number", type: "text" },
  { key: "published", label: "On the site", type: "checkbox", placeholder: "Show on the home page (positive reviews only)" },
];
const ORDER = [{ key: "reviewed_on", ascending: false }, { key: "created_at", ascending: false }];
const RATING_DOT = { positive: "text-accent", neutral: "text-muted", negative: "text-danger" } as const;

export default function ReviewsTab() {
  const [key, setKey] = useState(0); // bump to reload the list after a paste
  return (
    <div className="space-y-8">
      <EbaySummary />
      <PasteBox onAdded={() => setKey((k) => k + 1)} />
      <Records<ReviewRow & Record<string, unknown>>
        key={key} table="reviews" title="Reviews" noun="review" fields={FIELDS} order={ORDER}
        intro="The home page shows the 6 newest positive reviews that are on the site."
        blank={() => ({ source: "ebay", rating: "positive", reviewed_on: today(), published: true })}
        filter={{ key: "rating", label: "Rating", options: ["positive", "neutral", "negative"] }}
        summary={(rows) => <Totals items={[
          { label: "Reviews", value: rows.length },
          { label: "Positive", value: rows.filter((r) => r.rating === "positive").length, tone: "good" },
          { label: "On the site", value: rows.filter((r) => r.published && r.rating === "positive").length },
          { label: "Newest", value: rows[0] ? day(rows[0].reviewed_on) : "–" },
        ]} />}
        rowTitle={(r) => <><span className={`mr-1.5 ${RATING_DOT[r.rating]}`} title={r.rating}>●</span>{r.comment}</>}
        rowSub={(r) => [r.buyer, r.item, r.source === "ebay" ? "eBay" : r.source, day(r.reviewed_on), r.published ? null : "hidden"].filter(Boolean).join(" · ")}
      />
    </div>
  );
}

/** Username, positive % and count shown on the home page. */
function EbaySummary() {
  const [s, setS] = useState<Stats | null>(null);
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await supabase!.from("review_stats").select("ebay_username, positive_pct, feedback_count").eq("id", 1).maybeSingle();
    if (error) setMsg(error.message.includes("review_stats") ? "Run 9-reviews.sql in Supabase first." : error.message);
    else setS((data as Stats | null) ?? { ebay_username: "", positive_pct: null, feedback_count: null });
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const on = (e: Event) => setS((cur) => ({ ...(cur ?? { ebay_username: "", positive_pct: null, feedback_count: null }), ...(e as CustomEvent<Partial<Stats>>).detail }));
    window.addEventListener("review-stats", on);
    return () => window.removeEventListener("review-stats", on);
  }, []);

  const save = async () => {
    if (!s) return;
    const body = {
      id: 1,
      ebay_username: s.ebay_username?.trim() || null,
      positive_pct: s.positive_pct === null || String(s.positive_pct) === "" ? null : Number(s.positive_pct),
      feedback_count: s.feedback_count === null || String(s.feedback_count) === "" ? null : Number(s.feedback_count),
    };
    const { error } = await supabase!.from("review_stats").upsert(body);
    setMsg(error ? error.message : "Saved. The home page shows it now.");
  };
  const set = (k: keyof Stats, v: string) => { setS((cur) => ({ ...cur!, [k]: v as never })); setMsg(""); };

  return (
    <section className="card p-5">
      <h2 className="text-[1.3rem]">eBay summary</h2>
      <p className="mb-4 text-[.88rem] text-muted">Shown above your reviews on the home page. Pasting your feedback page below fills these in too.</p>
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
        <label><span className="mb-1 block text-[.82rem] text-muted">eBay username</span>
          <input className="input" value={s?.ebay_username ?? ""} placeholder="your-ebay-name" onChange={(e) => set("ebay_username", e.target.value)} /></label>
        <label><span className="mb-1 block text-[.82rem] text-muted">Positive %</span>
          <input className="input" type="number" step="0.1" min={0} max={100} value={s?.positive_pct ?? ""} placeholder="100" onChange={(e) => set("positive_pct", e.target.value)} /></label>
        <label><span className="mb-1 block text-[.82rem] text-muted">Feedback count</span>
          <input className="input" type="number" min={0} value={s?.feedback_count ?? ""} placeholder="42" onChange={(e) => set("feedback_count", e.target.value)} /></label>
        <button type="button" className="btn !py-2.5" onClick={save} disabled={!s}>Save</button>
      </div>
      {s?.ebay_username && (
        <p className="mt-3 text-[.82rem] text-muted">
          "See all on eBay" goes to{" "}
          <a href={`https://www.ebay.com/fdbk/feedback_profile/${encodeURIComponent(s.ebay_username.trim())}`} target="_blank" rel="noreferrer">your feedback page</a>.
        </p>
      )}
      {msg && <p className="mt-3 text-[.88rem] text-muted" role="status">{msg}</p>}
    </section>
  );
}

/** Paste the text of your eBay feedback page; new reviews get added, ones already here are skipped. */
function PasteBox({ onAdded }: { onAdded: () => void }) {
  const [text, setText] = useState("");
  const [page, setPage] = useState<PastedPage | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const read = (t: string) => { setText(t); setMsg(""); setPage(t.trim() ? parseEbayFeedback(t) : null); };

  const add = async () => {
    if (!page) return;
    setBusy(true);
    const { data: have, error: e1 } = await supabase!.from("reviews").select("buyer, comment, item_number").limit(5000);
    if (e1) { setMsg(e1.message); setBusy(false); return; }
    const seen = new Set((have ?? []).map((r) => `${r.buyer}|${r.item_number ?? ""}|${r.comment}`));
    const fresh = page.reviews.filter((r) => !seen.has(`${r.buyer}|${r.item_number ?? ""}|${r.comment}`));
    if (fresh.length) {
      const { error } = await supabase!.from("reviews").insert(fresh.map((r) => ({ ...r, source: "ebay", rating: "positive", published: true })));
      if (error) { setMsg(error.message); setBusy(false); return; }
    }
    const stats: Partial<Stats> = {};
    if (page.positivePct !== null) stats.positive_pct = page.positivePct;
    if (page.feedbackCount !== null) stats.feedback_count = page.feedbackCount;
    if (page.username) stats.ebay_username = page.username;
    if (Object.keys(stats).length) {
      await supabase!.from("review_stats").upsert({ id: 1, ...stats });
      window.dispatchEvent(new CustomEvent("review-stats", { detail: stats }));
    }
    const skipped = page.reviews.length - fresh.length;
    setMsg(`Added ${fresh.length} review${fresh.length === 1 ? "" : "s"}${skipped ? `, skipped ${skipped} already here` : ""}. They come in as positive: change any neutral or negative ones below.`);
    setText(""); setPage(null); setBusy(false);
    onAdded();
  };

  return (
    <section className="card p-5">
      <h2 className="text-[1.3rem]">Paste from eBay</h2>
      <ol className="mb-4 mt-1 list-decimal space-y-0.5 pl-5 text-[.88rem] text-muted">
        <li>On eBay, open your feedback page (your username → Feedback → <em>Received as seller</em>).</li>
        <li>Press Ctrl+A then Ctrl+C to copy the whole page.</li>
        <li>Paste it here. Reviews you already added are skipped, so paste again whenever you get new ones.</li>
      </ol>
      <textarea className="input min-h-[7rem] font-mono !text-[.8rem]" value={text} placeholder="Paste your eBay feedback page here…" onChange={(e) => read(e.target.value)} />
      {page && (
        <div className="mt-4">
          {page.reviews.length === 0 ? (
            <p className="text-[.9rem] text-danger">No reviews found in that text. Make sure you copied the whole feedback page.</p>
          ) : (
            <>
              <p className="mb-2 text-[.9rem]">
                Found <strong>{page.reviews.length}</strong> review{page.reviews.length === 1 ? "" : "s"}
                {page.positivePct !== null && <> · {page.positivePct}% positive</>}
                {page.feedbackCount !== null && <> · {page.feedbackCount.toLocaleString()} feedback</>}
                {page.username && <> · {page.username}</>}
              </p>
              <ul className="max-h-64 space-y-1.5 overflow-y-auto rounded-card border border-line bg-bg2 p-3 text-[.84rem]">
                {page.reviews.map((r, i) => (
                  <li key={i} className="truncate"><span className="text-muted">{r.buyer} · {day(r.reviewed_on)} ·</span> {r.comment}</li>
                ))}
              </ul>
              <button type="button" className="btn mt-3 !py-2" onClick={add} disabled={busy}>{busy ? "Adding…" : `Add ${page.reviews.length} review${page.reviews.length === 1 ? "" : "s"}`}</button>
            </>
          )}
        </div>
      )}
      {msg && <p className="mt-3 text-[.88rem] text-muted" role="status">{msg}</p>}
    </section>
  );
}

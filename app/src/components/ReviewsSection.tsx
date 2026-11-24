import { useEffect, useRef, useState } from "react";
import { getReviews, type ReviewRow, type ReviewStats } from "../lib/supabase";
import Icon from "./Icon";

type Data = { reviews: ReviewRow[]; stats: ReviewStats | null };
let cache: Promise<Data | null> | null = null;

/** Reviews from the admin portal's Reviews tab. undefined while loading, null when there's nothing to show. */
export function useReviews() {
  const [data, setData] = useState<Data | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    (cache ??= getReviews()).then((d) => alive && setData(d && d.reviews.length ? d : null));
    return () => { alive = false; };
  }, []);
  return data;
}

const SOURCE = { ebay: "Verified eBay purchase", "in person": "Local customer", facebook: "Facebook Marketplace", other: "Customer" } as const;
const ROTATE_MS = 7000;

/** Long eBay reviews get cut at a sentence end near 200 characters, so the card keeps one size. */
function trim(text: string, max = 200) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "));
  return end > 80 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

/**
 * One review at a time, fading to the next every few seconds. Pauses while hovered or focused,
 * and doesn't auto-advance for people who turned off motion (the dots still work).
 */
export default function ReviewsRotator({ data }: { data: Data }) {
  const { reviews, stats } = data;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const still = useRef(typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    if (paused || still.current || reviews.length < 2) return;
    const t = setTimeout(() => setI((n) => (n + 1) % reviews.length), ROTATE_MS);
    return () => clearTimeout(t);
  }, [i, paused, reviews.length]);

  const user = stats?.ebay_username?.trim();
  const profile = user ? `https://www.ebay.com/fdbk/feedback_profile/${encodeURIComponent(user)}?filter=feedback_page:RECEIVED_AS_SELLER` : null;
  const pct = stats?.positive_pct;
  const count = stats?.feedback_count;
  const proof = [pct != null && `${Number(pct) % 1 ? Number(pct).toFixed(1) : Number(pct)}% positive on eBay`, count != null && `${Number(count).toLocaleString()} ratings`].filter(Boolean).join(" · ");

  return (
    <figure data-reveal="up" aria-roledescription="carousel" aria-label="What customers say"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      className="card relative mt-4 overflow-hidden px-6 py-10 text-center sm:px-14 sm:py-14">
      <span className="pointer-events-none absolute left-5 top-0 select-none font-serif text-[9rem] leading-none text-accent opacity-[.08] sm:left-10" aria-hidden>“</span>
      <p className="eyebrow mb-6">People have great things to say</p>

      {/* every review is laid out in the same spot; the tallest one sets the height so nothing jumps */}
      <div className="grid" aria-live={paused ? "polite" : "off"}>
        {reviews.map((r, n) => (
          <div key={r.id} aria-hidden={n !== i} style={{ gridArea: "1 / 1" }}
            className={`flex flex-col items-center justify-center transition-[opacity,transform] duration-700 ease-out ${n === i ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}>
            <blockquote className="mx-auto max-w-[40ch] text-[clamp(1.2rem,2.3vw,1.6rem)] leading-snug tracking-[-0.01em] text-ink">“{trim(r.comment)}”</blockquote>
            <figcaption className="mt-5 text-[.85rem] text-muted">
              {[r.buyer, SOURCE[r.source] ?? "Customer"].filter(Boolean).join(" · ")}
              {r.item && <span className="mx-auto mt-0.5 block max-w-[46ch] truncate text-[.8rem] opacity-80">{r.item}</span>}
            </figcaption>
          </div>
        ))}
      </div>

      {reviews.length > 1 && (
        <div className="mt-7 flex justify-center gap-2" role="group" aria-label="Choose a review">
          {reviews.map((r, n) => (
            <button key={r.id} type="button" onClick={() => setI(n)} aria-label={`Review ${n + 1} of ${reviews.length}`} aria-current={n === i}
              className={`h-1.5 rounded-full transition-all duration-500 ${n === i ? "w-6 bg-accent" : "w-1.5 bg-line hover:bg-muted"}`} />
          ))}
        </div>
      )}

      {(proof || profile) && (
        <p className="mt-7 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-line pt-6 text-[.88rem] text-muted">
          {proof && <span className="inline-flex items-center gap-2"><Icon name="check" className="h-4 w-4 text-accent" />{proof}</span>}
          {profile && <a href={profile} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium">See all on eBay <Icon name="arrow" className="h-3.5 w-3.5" /></a>}
        </p>
      )}
    </figure>
  );
}

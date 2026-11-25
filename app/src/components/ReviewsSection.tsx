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
 * Two columns: the heading, eBay numbers and link on one side, one review at a time on the other (stacked on phones).
 * Reviews fade to the next every few seconds; arrows and dots step through them. Pauses while hovered or focused,
 * and doesn't auto-advance for people who turned off motion.
 */
export default function ReviewsRotator({ data }: { data: Data }) {
  const { reviews, stats } = data;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const still = useRef(typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const many = reviews.length > 1;
  const go = (step: number) => setI((n) => (n + step + reviews.length) % reviews.length);

  useEffect(() => {
    if (paused || still.current || !many) return;
    const t = setTimeout(() => setI((n) => (n + 1) % reviews.length), ROTATE_MS);
    return () => clearTimeout(t);
  }, [i, paused, many, reviews.length]);

  const user = stats?.ebay_username?.trim();
  const profile = user ? `https://www.ebay.com/fdbk/feedback_profile/${encodeURIComponent(user)}?filter=feedback_page:RECEIVED_AS_SELLER` : null;
  const pct = stats?.positive_pct;
  const count = stats?.feedback_count;

  return (
    <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      <div data-reveal-group="blur">
        <p className="eyebrow mb-4 flex items-center gap-3"><span className="h-px w-7 bg-accent2/60" aria-hidden />Reviews</p>
        <h2 className="text-[clamp(2rem,4.2vw,3.1rem)]">Here's what people <em className="grad-text">have to say.</em></h2>
        {(pct != null || count != null) && (
          <p className="mt-6 flex items-baseline gap-3 text-muted">
            {pct != null && <span className="font-mono text-[2rem] leading-none tracking-[-0.03em] text-accent">{Number(pct) % 1 ? Number(pct).toFixed(1) : Number(pct)}%</span>}
            <span className="text-[.92rem]">positive on eBay{count != null && <> · {Number(count).toLocaleString()} ratings</>}</span>
          </p>
        )}
        {profile && (
          <a href={profile} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 font-medium">
            See all on eBay <Icon name="arrow" className="h-4 w-4" />
          </a>
        )}
      </div>

      <figure data-reveal="right" aria-roledescription="carousel" aria-label="What customers say"
        onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
        className="card relative min-w-0 overflow-hidden p-7 sm:p-10">
        <span className="pointer-events-none absolute right-6 top-0 select-none font-serif text-[9rem] leading-none text-accent opacity-[.08]" aria-hidden>”</span>

        {/* every review sits in the same spot; the tallest one sets the height so nothing jumps */}
        <div className="grid min-w-0 grid-cols-1" aria-live={paused ? "polite" : "off"}>
          {reviews.map((r, n) => (
            <div key={r.id} aria-hidden={n !== i} style={{ gridArea: "1 / 1" }}
              className={`flex min-w-0 flex-col justify-center transition-[opacity,transform] duration-700 ease-out ${n === i ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}>
              <blockquote className="text-[clamp(1.15rem,2vw,1.45rem)] leading-snug tracking-[-0.01em] text-ink">“{trim(r.comment)}”</blockquote>
              <figcaption className="mt-5 text-[.85rem] text-muted">
                {[r.buyer, SOURCE[r.source] ?? "Customer"].filter(Boolean).join(" · ")}
                {r.item && <span className="mt-0.5 block truncate text-[.8rem] opacity-80">{r.item}</span>}
              </figcaption>
            </div>
          ))}
        </div>

        {many && (
          <div className="mt-7 flex items-center gap-4 border-t border-line pt-5">
            <div className="flex gap-2">
              {[{ step: -1, label: "Previous review" }, { step: 1, label: "Next review" }].map(({ step, label }) => (
                <button key={step} type="button" onClick={() => go(step)} aria-label={label}
                  className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink transition-colors hover:border-accent hover:bg-accent hover:text-onaccent">
                  <Icon name="arrow" className={`h-4 w-4 ${step < 0 ? "rotate-180" : ""}`} />
                </button>
              ))}
            </div>
            <div className="flex flex-1 flex-wrap gap-1.5" role="group" aria-label="Choose a review">
              {reviews.map((r, n) => (
                <button key={r.id} type="button" onClick={() => setI(n)} aria-label={`Review ${n + 1} of ${reviews.length}`} aria-current={n === i}
                  className={`h-1.5 rounded-full transition-all duration-500 ${n === i ? "w-6 bg-accent" : "w-1.5 bg-line hover:bg-muted"}`} />
              ))}
            </div>
            <span className="font-mono text-[.75rem] text-muted">{i + 1} / {reviews.length}</span>
          </div>
        )}
      </figure>
    </div>
  );
}

import { useEffect, useState } from "react";
import SectionHead from "./SectionHead";
import Reveal from "./Reveal";
import Icon from "./Icon";
import { getReviews, type ReviewRow, type ReviewStats } from "../lib/supabase";

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

const monthYear = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" });

/** Long eBay reviews get cut at a sentence end near 220 characters. */
function trim(text: string, max = 220) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "));
  return end > 80 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

export default function ReviewsSection({ data, alt }: { data: Data; alt?: boolean }) {
  const { reviews, stats } = data;
  const user = stats?.ebay_username?.trim();
  const profile = user ? `https://www.ebay.com/fdbk/feedback_profile/${encodeURIComponent(user)}?filter=feedback_page:RECEIVED_AS_SELLER` : null;
  const pct = stats?.positive_pct;
  const count = stats?.feedback_count;
  return (
    <section className={`section ${alt ? "alt" : ""}`} aria-label="Customer reviews">
      <div className="wrap">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-2">
          <SectionHead eyebrow="Reviews" title="What buyers say" sub="Recent feedback from real orders." />
          {(pct != null || count != null) && (
            <div data-reveal="up" className="mb-12 flex items-center gap-4">
              {pct != null && (
                <div>
                  <p className="font-mono text-[2.4rem] leading-none tracking-[-0.03em] text-accent">{Number(pct) % 1 ? Number(pct).toFixed(1) : Number(pct)}%</p>
                  <p className="mt-1 text-[.8rem] text-muted">positive on eBay</p>
                </div>
              )}
              {pct != null && count != null && <span className="h-10 w-px bg-line" aria-hidden />}
              {count != null && (
                <div>
                  <p className="font-mono text-[2.4rem] leading-none tracking-[-0.03em] text-ink">{Number(count).toLocaleString()}</p>
                  <p className="mt-1 text-[.8rem] text-muted">ratings</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r, i) => (
            <Reveal key={r.id} delay={(i % 3) * 90} className="h-full">
              <figure className="card lift flex h-full flex-col p-6">
                <div className="mb-4 flex items-center gap-2 text-accent">
                  <span className="grid h-7 w-7 place-items-center rounded-full border border-accent/40 bg-accent/10"><Icon name="check" className="h-3.5 w-3.5" /></span>
                  <span className="font-mono text-[.7rem] uppercase tracking-[.14em]">Positive</span>
                </div>
                <blockquote className="flex-1 text-[1rem] leading-relaxed text-ink">“{trim(r.comment)}”</blockquote>
                <figcaption className="mt-5 border-t border-line pt-4 text-[.82rem] text-muted">
                  {r.item && <p className="mb-1 truncate text-ink/80" title={r.item}>{r.item}</p>}
                  <p>{[r.buyer, SOURCE[r.source] ?? "Customer", monthYear(r.reviewed_on)].filter(Boolean).join(" · ")}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>

        {profile && (
          <p data-reveal="up" className="mt-8">
            <a href={profile} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-medium">
              See all my feedback on eBay <Icon name="arrow" className="h-4 w-4" />
            </a>
          </p>
        )}
      </div>
    </section>
  );
}

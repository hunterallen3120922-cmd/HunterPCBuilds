import { useEffect, useRef, useState } from "react";
import type { GalleryItem } from "../types";
import Icon from "./Icon";

/** File names are in public/gallery/; builds from the admin portal already have full web addresses. */
const src = (photo: string) => (photo.includes("/") ? photo : `${import.meta.env.BASE_URL}gallery/${photo}`);

/**
 * A build photo that's always shown whole (never trimmed to fit). Any space around it is filled with a soft,
 * blurred copy of the same photo, so tall and wide photos both look tidy in the same-size card.
 * `className` sets the box size (e.g. "aspect-[4/3] w-full").
 */
export function Photo({ item, photo = item.photo, className = "" }: { item: GalleryItem; photo?: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) return <div className={`grid place-items-center bg-bg2 ${className}`} role="img" aria-label={item.title}><Icon name="desktop" className="h-10 w-10 text-muted" /></div>;
  return (
    <div className={`relative overflow-hidden bg-bg2 ${className}`}>
      <img src={src(photo)} alt="" aria-hidden loading="lazy" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-xl" />
      <img src={src(photo)} alt={item.title} loading="lazy" onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-contain" />
    </div>
  );
}

/** Grid of builds. Clicking one opens a lightbox. */
export default function Gallery({ items }: { items: GalleryItem[] }) {
  const [active, setActive] = useState<GalleryItem | null>(null);
  const [shown, setShown] = useState(0); // which of the active build's photos is big
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (active && !d.open) d.showModal();
    if (!active && d.open) d.close();
  }, [active]);

  return (
    <>
      <ul data-reveal-group="zoom" className="grid list-none grid-cols-[repeat(auto-fit,minmax(16.25rem,1fr))] gap-[1.125rem] p-0">
        {items.map((g) => (
          <li key={g.title}>
            <button type="button" onClick={() => { setShown(0); setActive(g); }}
              className="lift card block w-full cursor-pointer overflow-hidden p-0 text-left" aria-label={`View ${g.title}`}>
              <Photo item={g} className="aspect-[4/3] w-full" />
              <div className="p-4">
                <h3 className="text-[1.1rem]">{g.title}</h3>
                {g.price && <span className="font-mono text-[.85rem] text-accent">{g.price}</span>}
              </div>
            </button>
          </li>
        ))}
      </ul>
      <dialog ref={dialog} onClose={() => setActive(null)}
        onClick={(e) => { if (e.target === dialog.current) setActive(null); }}
        className="m-auto w-[min(92vw,45rem)] rounded-card border border-line bg-card p-0 text-ink">
        {active && (
          <div>
            <Photo item={active} photo={active.photos?.[shown] ?? active.photo} className="h-[60vh] max-h-[36rem] w-full" />
            {(active.photos?.length ?? 0) > 1 && (
              <div className="flex gap-2 overflow-x-auto px-5 pt-4">
                {active.photos!.map((p, i) => (
                  <button key={p} type="button" onClick={() => setShown(i)} aria-label={`Photo ${i + 1}`}
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 p-0 ${i === shown ? "border-accent" : "border-transparent opacity-60 hover:opacity-100"}`}>
                    <img src={p} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-2xl">{active.title}</h3>
                {active.price && <span className="font-mono text-accent">{active.price}</span>}
              </div>
              <ul className="mt-2 list-disc pl-5 text-[.95rem] text-muted">
                {active.specs.map((s) => <li key={s}>{s}</li>)}
              </ul>
              <button type="button" className="btn btn-ghost mt-4" onClick={() => setActive(null)}>Close</button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

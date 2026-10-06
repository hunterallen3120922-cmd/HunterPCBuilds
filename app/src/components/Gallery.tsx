import { useEffect, useRef, useState } from "react";
import type { GalleryItem } from "../types";
import Icon from "./Icon";

const src = (photo: string) => `${import.meta.env.BASE_URL}gallery/${photo}`;

export function Photo({ item, className = "" }: { item: GalleryItem; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) return <div className={`grid place-items-center bg-bg2 ${className}`} role="img" aria-label={item.title}><Icon name="desktop" className="h-10 w-10 text-muted" /></div>;
  return <img src={src(item.photo)} alt={item.title} loading="lazy" onError={() => setBroken(true)} className={`object-cover ${className}`} />;
}

/** Grid of builds. Clicking one opens a lightbox. */
export default function Gallery({ items }: { items: GalleryItem[] }) {
  const [active, setActive] = useState<GalleryItem | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (active && !d.open) d.showModal();
    if (!active && d.open) d.close();
  }, [active]);

  return (
    <>
      <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(16.25rem,1fr))] gap-[1.125rem] p-0">
        {items.map((g) => (
          <li key={g.title}>
            <button type="button" onClick={() => setActive(g)}
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
            <Photo item={active} className="max-h-[60vh] w-full" />
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

import { useEffect, useRef, useState } from "react";
import type { HeroPhoto } from "../content/heroPhotos";

/** Full web address of a photo: files in public/photos/, or an already-complete path (e.g. a gallery photo). */
export const photoSrc = (photo: string) => (photo.includes("/") ? photo : `${import.meta.env.BASE_URL}photos/${photo}`);

/**
 * Real photos that fade in over a page's opening drawing once it has finished (`ready`), after `delay` seconds,
 * then crossfade from one to the next every `interval` seconds with a slow zoom. Each photo is shown whole over a
 * blurred copy of itself. They load one at a time as needed; photos that fail to load are skipped, and if none
 * load the drawing simply stays. `onShow` tells the page to fade its drawing out.
 */
export default function HeroPhotos({ photos, ready, delay, interval, className, onShow }: {
  photos: HeroPhoto[]; ready: boolean; delay: number; interval: number; className: string; onShow: () => void;
}) {
  const [ok, setOk] = useState<(HeroPhoto & { ratio: number })[]>([]); // photos loaded so far, in order, with width ÷ height
  const [tried, setTried] = useState(0); // how many of `photos` have been tried
  const [on, setOn] = useState(false);
  const [index, setIndex] = useState(0);

  // Load photos one at a time, staying one ahead of the one on screen, so the page doesn't download them all at once.
  const loading = tried < photos.length && (ok.length === 0 || index >= ok.length - 1);
  useEffect(() => {
    if (!loading) return;
    let alive = true;
    const p = photos[tried];
    const img = new Image();
    img.onload = () => { if (alive) { setOk((cur) => [...cur, { ...p, ratio: img.naturalWidth / img.naturalHeight || 1 }]); setTried((t) => t + 1); } };
    img.onerror = () => { if (alive) setTried((t) => t + 1); }; // skip photos that fail to load
    img.src = photoSrc(p.photo);
    return () => { alive = false; };
  }, [loading, tried, photos]);

  // Once the drawing is done (and a photo is ready), wait a moment, then fade the photos in.
  useEffect(() => {
    if (!ready || on || ok.length === 0) return;
    const t = window.setTimeout(() => { setOn(true); onShow(); }, delay * 1000);
    return () => clearTimeout(t);
  }, [ready, on, ok.length, delay, onShow]);

  // Rotate through them.
  useEffect(() => {
    if (!on || ok.length < 2) return;
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % ok.length), interval * 1000);
    return () => clearTimeout(t);
  }, [on, ok.length, index, interval]);

  // The frame takes the shape of the photo on screen: as big as fits in the space, resizing smoothly between photos.
  const area = useRef<HTMLDivElement>(null);
  const [space, setSpace] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSpace({ w: el.clientWidth, h: el.clientHeight - parseFloat(getComputedStyle(el).paddingBottom) - parseFloat(getComputedStyle(el).paddingTop) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (photos.length === 0) return null;
  const current = ok[index];
  const ratio = current?.ratio ?? 3 / 4;
  const maxW = Math.min(space.w - 32, 640), maxH = Math.min(space.h, 608); // at most 40rem × 38rem, clear of the screen edge
  const width = Math.min(maxW, maxH * ratio);
  const frame = { width: `${Math.round(width)}px`, height: `${Math.round(width / ratio)}px` };
  return (
    <div className={`${className} transition-opacity duration-1000 ${on ? "opacity-100" : "opacity-0"}`}>
      <div ref={area} className="flex h-full w-full items-center justify-center max-lg:items-end max-lg:pb-10 max-lg:pt-4">
      <figure style={frame}
        className="relative m-0 shrink-0 overflow-hidden rounded-[1.25rem] border border-line bg-bg2 shadow-[0_30px_80px_-30px_rgba(0,0,0,.85)] transition-[width,height] duration-700 ease-[cubic-bezier(.4,0,.2,1)]">
        {ok.map((p, i) => (
          <div key={p.photo} className={`absolute inset-0 transition-opacity duration-1000 ${i === index ? "opacity-100" : "opacity-0"}`} aria-hidden={i !== index}>
            {/* the same photo, blurred, filling the frame behind it, so tall photos are shown whole */}
            <img src={photoSrc(p.photo)} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl" />
            <img src={photoSrc(p.photo)} alt={p.alt} className={`absolute inset-0 h-full w-full object-contain ${i === index ? "photo-zoom" : ""}`}
              style={{ animationDuration: `${interval + 1.5}s` }} />
          </div>
        ))}
        {current?.caption && (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" aria-hidden />
            <figcaption className="absolute bottom-4 left-4 rounded-full border border-white/15 bg-black/45 px-3 py-1 font-mono text-[.72rem] uppercase tracking-[.12em] text-white backdrop-blur">
              {current.caption}
            </figcaption>
          </>
        )}
      </figure>
      </div>
    </div>
  );
}

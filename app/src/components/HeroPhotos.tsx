import { useEffect, useState } from "react";
import type { HeroPhoto } from "../content/heroPhotos";

/** Full web address of a photo: files in public/photos/, or an already-complete path (e.g. a gallery photo). */
export const photoSrc = (photo: string) => (photo.includes("/") ? photo : `${import.meta.env.BASE_URL}photos/${photo}`);

/**
 * Real photos that fade in over a page's opening drawing once it has finished (`ready`), after `delay` seconds,
 * then crossfade from one to the next every `interval` seconds with a slow zoom. Photos that fail to load are
 * skipped, and if none load the drawing simply stays. `onShow` tells the page to fade its drawing out.
 */
export default function HeroPhotos({ photos, ready, delay, interval, className, onShow }: {
  photos: HeroPhoto[]; ready: boolean; delay: number; interval: number; className: string; onShow: () => void;
}) {
  const [ok, setOk] = useState<HeroPhoto[]>([]); // the photos that loaded
  const [on, setOn] = useState(false);
  const [index, setIndex] = useState(0);

  // Load the photos in the background as soon as the page opens.
  useEffect(() => {
    let alive = true;
    photos.forEach((p) => {
      const img = new Image();
      img.onload = () => alive && setOk((cur) => (cur.includes(p) ? cur : [...cur, p]));
      img.src = photoSrc(p.photo);
    });
    return () => { alive = false; };
  }, [photos]);

  // Once the drawing is done (and a photo is ready), wait a moment, then fade the photos in.
  useEffect(() => {
    if (!ready || on || ok.length === 0) return;
    const t = window.setTimeout(() => { setOn(true); onShow(); }, delay * 1000);
    return () => clearTimeout(t);
  }, [ready, on, ok.length, delay, onShow]);

  // Rotate through them.
  useEffect(() => {
    if (!on || ok.length < 2) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % ok.length), interval * 1000);
    return () => clearInterval(t);
  }, [on, ok.length, interval]);

  if (photos.length === 0) return null;
  const current = ok[index % Math.max(ok.length, 1)];
  return (
    <div className={`${className} flex items-center justify-center transition-opacity duration-1000 ${on ? "opacity-100" : "opacity-0"}`}>
      <figure className="relative m-0 w-full max-w-[44rem] max-lg:mb-10 max-lg:aspect-[4/3] max-lg:max-h-full max-lg:self-end lg:h-full lg:max-h-[34rem] overflow-hidden rounded-[1.25rem] border border-line bg-bg2 shadow-[0_30px_80px_-30px_rgba(0,0,0,.85)]">
        {ok.map((p, i) => (
          <img key={p.photo} src={photoSrc(p.photo)} alt={p.alt}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${i === index ? "photo-zoom opacity-100" : "opacity-0"}`}
            style={{ animationDuration: `${interval + 1.5}s` }} />
        ))}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" aria-hidden />
        {current?.caption && (
          <figcaption className="absolute bottom-4 left-4 rounded-full border border-white/15 bg-black/45 px-3 py-1 font-mono text-[.72rem] uppercase tracking-[.12em] text-white backdrop-blur">
            {current.caption}
          </figcaption>
        )}
      </figure>
    </div>
  );
}

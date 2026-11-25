import { useEffect, useRef, useState } from "react";
import { heroPhotos } from "../content/heroPhotos";
import { photoSmall, photoSrc, smallFallback } from "./HeroPhotos";

/** Where each of the three cards sits in the stack: left / top as % of the stack, a slight tilt, and its depth. */
const slots = [
  { left: "0%", top: "9%", rotate: -7, z: 1 },
  { left: "46%", top: "0%", rotate: 5, z: 2 },
  { left: "22%", top: "42%", rotate: -2, z: 3 },
];

/** Seconds between swaps. Each swap changes one card, taking turns, so the three never change at once. */
const SWAP_EVERY = 2.6;

/**
 * Three of Hunter's build photos stacked like cards beside the home page headline. The cards take turns
 * crossfading to the next photo in content/heroPhotos.ts (the same list as the PC Builds slideshow), so every
 * build comes round in time. Each next photo is loaded before it's shown, and the swaps pause while the stack
 * is off screen or the tab is hidden.
 */
export default function BuildStack() {
  const photos = heroPhotos.pcBuilds;
  const box = useRef<HTMLDivElement>(null);
  // Each card keeps the photo it's leaving (under) and the one it's showing (over, fading in)
  const [cards, setCards] = useState(() => slots.map((_, i) => ({ under: -1, over: i % Math.max(1, photos.length) })));

  useEffect(() => {
    if (photos.length <= slots.length) return;
    let turn = 0, next = slots.length, alive = true;
    const timer = window.setInterval(() => {
      const el = box.current;
      if (document.hidden || !el || el.closest('[data-offscreen="true"]')) return;
      const card = turn % slots.length, photo = next % photos.length;
      turn++; next++;
      const img = new Image();
      const show = () => {
        if (alive) setCards((cur) => cur.map((c, i) => (i === card ? { under: c.over, over: photo } : c)));
      };
      // The cards are small, so they use the light copy of each photo (or the full one if there isn't one)
      img.onload = show;
      img.onerror = () => { img.onerror = null; img.src = photoSrc(photos[photo].photo); };
      img.decoding = "async";
      img.src = photoSmall(photos[photo].photo);
    }, SWAP_EVERY * 1000);
    return () => { alive = false; clearInterval(timer); };
  }, [photos]);

  if (photos.length === 0) return null;

  return (
    <div ref={box} className="build-stack relative mx-auto aspect-[1/1.12] w-full max-w-[21rem] sm:max-w-[26rem] lg:max-w-[31rem]">
      {slots.map((s, i) => {
        const c = cards[i];
        return (
          <div
            key={i}
            className="build-card absolute w-[54%] overflow-hidden rounded-2xl border border-line bg-card"
            style={{ left: s.left, top: s.top, zIndex: s.z, transform: `rotate(${s.rotate}deg)` }}
          >
            <div className="relative aspect-[5/6]">
              {c.under >= 0 && (
                <img key={`u${c.under}`} src={photoSmall(photos[c.under].photo)} onError={smallFallback(photos[c.under].photo)} alt="" className="absolute inset-0 h-full w-full object-cover" />
              )}
              <img
                key={`o${c.over}`}
                src={photoSmall(photos[c.over].photo)}
                onError={smallFallback(photos[c.over].photo)}
                alt={photos[c.over].alt}
                className={`absolute inset-0 h-full w-full object-cover${c.under >= 0 ? " build-card-in" : ""}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

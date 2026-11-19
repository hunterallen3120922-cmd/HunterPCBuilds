import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import HeroPhotos from "./HeroPhotos";
import { usePauseOffscreen } from "../lib/usePauseOffscreen";
import { heroPhotos, type HeroPhoto } from "../content/heroPhotos";

export interface AnimatedHeroProps {
  /** The drawing. It plays its own animation (see BuildScene). */
  scene: ReactNode;
  /** Milliseconds after arriving when the drawing counts as finished (the photos wait for that). */
  doneAfter: number;
  /** Real photos the finished drawing fades into after a few seconds (see content/heroPhotos.ts). */
  photos?: HeroPhoto[];
  /** Where the drawing sits above the text on phones/tablets, e.g. "max-lg:bottom-[27rem]". */
  mobileClass: string;
  /** The page's heading, text and buttons. They're there from the start, rising in while the drawing plays. */
  children: ReactNode;
}

/**
 * A page opening that plays a short animation every time you arrive. The drawing plays on the right (or above the
 * text on phones and tablets) while the page text rises in beside it, so nothing is hidden behind it. Once real photos
 * have faded in over it, the drawing is removed so its turning fans stop using the computer.
 */
export default function AnimatedHero({ scene, doneAfter, photos = [], mobileClass, children }: AnimatedHeroProps) {
  const stage = useRef<HTMLDivElement>(null);
  usePauseOffscreen(stage);
  const [done, setDone] = useState(false);
  const [photosOn, setPhotosOn] = useState(false);
  const [sceneGone, setSceneGone] = useState(false);
  const showPhotos = useCallback(() => setPhotosOn(true), []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => setDone(true), reduced ? 0 : doneAfter);
    return () => clearTimeout(t);
  }, [doneAfter]);

  // after the drawing has faded out under the photos
  useEffect(() => {
    if (!photosOn) return;
    const t = window.setTimeout(() => setSceneGone(true), 1000);
    return () => clearTimeout(t);
  }, [photosOn]);

  // Where the drawing (and later the photos) sit: on the right beside the text, or above it on phones and tablets
  const box = `pointer-events-none absolute inset-x-0 bottom-8 top-16 -z-10 px-10 py-6 lg:bottom-10 lg:px-12 lg:py-10 lg:left-[46%] lg:right-0 ${mobileClass}`;

  return (
    <header className="relative">
      <div ref={stage} className="group relative isolate flex min-h-[100svh] items-center overflow-x-clip pt-16 max-lg:items-end max-lg:pb-10">
        <div className="hero-grid pointer-events-none absolute inset-0 -z-20" aria-hidden />
        <div className="hero-ambient pointer-events-none absolute inset-0 -z-20" aria-hidden />

        {/* The drawing, playing beside the text */}
        {!sceneGone && (
          <div aria-hidden className={`${box} transition-opacity duration-[800ms] ${photosOn ? "opacity-0" : ""}`}>
            {scene}
          </div>
        )}

        {/* Real photos, fading in over the finished drawing */}
        <HeroPhotos photos={photos} ready={done} delay={heroPhotos.delay} interval={heroPhotos.interval} className={box} onShow={showPhotos} />

        {/* The page's heading, text and buttons */}
        <div className="fade-up wrap relative w-full" style={{ "--d": "100ms" } as CSSProperties}>
          <div className="lg:max-w-[28rem]">{children}</div>
        </div>

      </div>
    </header>
  );
}

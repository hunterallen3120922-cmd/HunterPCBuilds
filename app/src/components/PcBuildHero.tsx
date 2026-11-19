import { useMemo } from "react";
import AnimatedHero from "./AnimatedHero";
import BuildScene, { BUILD_MS, DONE_AT, START_DELAY } from "./BuildScene";
import Icon from "./Icon";
import { heroPhotos } from "../content/heroPhotos";
import { gallery } from "../content/gallery";
import { useBuilds } from "../lib/useBuilds";
import { photoUrl } from "../lib/supabase";

/** Built-in photos for the end of the animation: heroPhotos.pcBuilds, or else the real (non-example) Past builds photos. */
const BUILT_IN_PHOTOS = heroPhotos.pcBuilds.length > 0 ? heroPhotos.pcBuilds
  : gallery.filter((g) => !g.photo.startsWith("example-")).map((g) => ({ photo: `${import.meta.env.BASE_URL}gallery/${g.photo}`, alt: g.title, caption: g.title }));

/**
 * The PC builds page opening: a PC builds itself (see BuildScene) beside the page text, which is there from the
 * start, and the fans keep turning. How long it takes is BUILD_MS in BuildScene.tsx.
 */
export default function PcBuildHero() {
  // Slideshow photos: builds marked "Slideshow" in the admin portal if there are any (highlights first), otherwise the built-in ones.
  // Nothing is passed until we know which, so the slideshow never switches lists halfway.
  const builds = useBuilds();
  const photos = useMemo(() => {
    if (builds === undefined) return [];
    // Highlights first: builds also on the home carousel, then ones in Past builds, then the rest (each group in list order).
    const rank = (b: { featured: boolean; in_gallery: boolean }) => (b.featured ? 0 : b.in_gallery ? 1 : 2);
    const fromPortal = (builds ?? []).filter((b) => b.in_slideshow)
      .map((b, i) => ({ b, i })).sort((x, y) => rank(x.b) - rank(y.b) || x.i - y.i).map(({ b }) => b)
      .flatMap((b) => b.photos.map((p) => ({ photo: photoUrl(p), alt: b.title })));
    return fromPortal.length > 0 ? fromPortal : BUILT_IN_PHOTOS;
  }, [builds]);
  return (
    <AnimatedHero scene={<BuildScene />} doneAfter={START_DELAY + DONE_AT * BUILD_MS} photos={photos}
      mobileClass="max-lg:bottom-[27rem]">
      {/* The brand name, large. It rises in with the rest of the text while the PC builds beside it. */}
      <p className="mb-6 font-heading text-[clamp(2.4rem,5.2vw,3.4rem)] font-medium leading-none tracking-tight text-ink lg:text-[clamp(2.2rem,3.6vw,3.2rem)]">
        Hunter<span className="text-accent">PC</span>Builder
      </p>
      <p className="eyebrow mb-5 flex items-center gap-2"><span className="h-px w-6 bg-accent2" aria-hidden />Custom PC builds</p>
      <h1 className="text-[clamp(2.4rem,5.6vw,4.2rem)] lg:text-[clamp(2rem,3.5vw,3.6rem)]">
        A PC built <em className="grad-text">for your budget.</em>
      </h1>
      <p className="my-6 max-w-[54ch] text-[1.1rem] text-muted">
        Tell me your budget and what you'll use it for. I plan the parts, build it, test it and hand it over ready to go.
      </p>
      <button type="button" className="btn" onClick={() => document.getElementById("request")?.scrollIntoView()}>
        Start a build request <Icon name="arrow" className="h-4 w-4" />
      </button>
    </AnimatedHero>
  );
}

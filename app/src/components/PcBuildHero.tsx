import { useMemo } from "react";
import AnimatedHero, { type Part } from "./AnimatedHero";
import BuildScene from "./BuildScene";
import Icon from "./Icon";
import { heroPhotos } from "../content/heroPhotos";
import { gallery } from "../content/gallery";
import { useBuilds } from "../lib/useBuilds";
import { photoUrl } from "../lib/supabase";

/** Built-in photos for the end of the animation: heroPhotos.pcBuilds, or else the real (non-example) Past builds photos. */
const BUILT_IN_PHOTOS = heroPhotos.pcBuilds.length > 0 ? heroPhotos.pcBuilds
  : gallery.filter((g) => !g.photo.startsWith("example-")).map((g) => ({ photo: `${import.meta.env.BASE_URL}gallery/${g.photo}`, alt: g.title, caption: g.title }));

/**
 * The timeline, as [start, end] fractions of the duration. It plays as one continuous motion: the case fades in while
 * the parts, floating around it, are already drifting inward; they spiral in together, speeding up ("in" easing) to
 * land with a thud; the PC bounces, the glass slides on and it lights up, and while it settles it slides aside for
 * the text (DONE_AT).
 */
const LAND = 0.62; // when the parts hit the case
const FLY: Part = [0, LAND, "in"];
const PARTS: Record<string, Part> = {
  case: [0, 0.3],
  rear: FLY, board: FLY, psu: FLY, cooler: FLY, ram: FLY, topfans: FLY, gpu: FLY, front: FLY,
  glass: [LAND + 0.02, LAND + 0.2],
  power: [LAND + 0.02, LAND + 0.24],
};
const SPIN_AT = LAND + 0.03;
const DONE_AT = 0.88;

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Extra motion worked out from the overall progress p:
 *   --grow    the PC grows very slightly the whole time it builds, so something is always moving
 *   --bounce  pixels down (negative is up): a short dip from the impact, then it springs up and settles
 *   --squash  1 = normal height; squashes on the impact, stretches a touch on the way up
 *   --flash   a quick glow inside the case as the parts land
 */
function motion(p: number) {
  const g = clamp(p / LAND);
  const grow = 0.95 + 0.05 * (1 - Math.pow(1 - g, 2));
  const f = (p - LAND) / 0.14;
  const flash = f >= 0 && f <= 1 ? Math.pow(1 - f, 2) : 0;
  const t = clamp((p - LAND) / (1 - LAND));
  let bounce = 0, squash = 1;
  if (t > 0 && t < 0.12) { const d = Math.sin((Math.PI * t) / 0.12); bounce = 9 * d; squash = 1 - 0.035 * d; }
  else if (t >= 0.12 && t < 1) { const u = (t - 0.12) / 0.88; bounce = -30 * Math.sin(2.5 * Math.PI * u) * Math.pow(1 - u, 1.6); squash = 1 - bounce * 0.0007; }
  return { "--grow": grow, "--bounce": bounce, "--squash": squash, "--flash": flash };
}

/**
 * The PC builds page opening: a PC builds itself (see BuildScene), then the page text fades in beside it and the
 * fans keep turning. How long it takes is `duration` below, in milliseconds.
 */
export default function PcBuildHero() {
  // Slideshow photos: builds marked "Slideshow" in the admin portal if there are any, otherwise the built-in ones.
  // Nothing is passed until we know which, so the slideshow never switches lists halfway.
  const builds = useBuilds();
  const photos = useMemo(() => {
    if (builds === undefined) return [];
    const fromPortal = (builds ?? []).filter((b) => b.in_slideshow)
      .flatMap((b) => b.photos.map((p) => ({ photo: photoUrl(p), alt: b.title })));
    return fromPortal.length > 0 ? fromPortal : BUILT_IN_PHOTOS;
  }, [builds]);
  return (
    <AnimatedHero scene={<BuildScene />} parts={PARTS} extra={motion} duration={3200} spinAt={SPIN_AT} doneAt={DONE_AT} photos={photos}
      doneMobileClass="max-lg:group-data-[phase=done]:bottom-[27rem]">
      {/* The brand name, large. It fades in with the rest of the text once the PC is built. */}
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

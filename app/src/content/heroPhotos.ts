/**
 * REAL PHOTOS AT THE TOP OF THE PC BUILDS AND TECH REPAIR PAGES.
 * After each page's opening animation finishes, the drawing fades into your real photos, which then slowly rotate.
 *
 * How to add one: put the photo in app/public/photos/ and add a line below, e.g.
 *   { photo: "red-gaming-pc.jpg", alt: "Finished red and black gaming PC", caption: "1440p gaming build" },
 * `alt` describes the photo for screen readers. `caption` is optional (a small label on the photo).
 * Landscape photos (wider than tall) look best.
 *
 * Leave a list empty and that page just keeps its drawing.
 * PC Builds: if `pcBuilds` is empty, your real Past builds photos (content/gallery.ts) are used automatically.
 */
export interface HeroPhoto { photo: string; alt: string; caption?: string }

export const heroPhotos = {
  pcBuilds: [] as HeroPhoto[],
  techRepair: [] as HeroPhoto[],
  /** Seconds the finished drawing stays on screen before fading to the photos. */
  delay: 2.5,
  /** Seconds each photo shows before fading to the next. */
  interval: 4.5,
};

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
  pcBuilds: [
    { photo: "build-white-radeon.jpg", alt: "All-white build with a white Radeon graphics card and a white liquid cooler" },
    { photo: "build-blue-evga-rtx.jpg", alt: "Glass case build lit blue, with an EVGA GeForce RTX graphics card" },
    { photo: "build-gtx1660-closeup.jpg", alt: "Close-up of a GeForce GTX 1660 and RGB fans glowing pink and purple" },
    { photo: "build-rgb-cube-gtx1660.jpg", alt: "Cube-shaped glass case with rainbow RGB fans and a GeForce GTX 1660" },
    { photo: "build-red-aio-closeup.jpg", alt: "Close-up of an EVGA liquid cooler and a GeForce RTX card under red lighting" },
    { photo: "build-red-zalman.jpg", alt: "Glass case build with red-lit fans" },
    { photo: "build-purple-gtx-closeup.jpg", alt: "Close-up inside a build: GeForce GTX card and RGB fans in purple light" },
    { photo: "build-gtx-blue-shelf.jpg", alt: "Compact black build with a GeForce GTX card and blue and pink RGB fans" },
    { photo: "build-blue-rtx-super-closeup.jpg", alt: "Close-up of a GeForce RTX Super and a blue-ringed CPU cooler" },
    { photo: "build-black-msi-rgb.jpg", alt: "Compact black build with RGB fans and an MSI graphics card" },
    { photo: "build-msi-rtx-closeup.jpg", alt: "Close-up of an MSI GeForce RTX card with RGB fans and RAM" },
    { photo: "build-purple-shelf.jpg", alt: "Glass case build glowing purple" },
    { photo: "build-rainbow-closeup.jpg", alt: "Close-up of rainbow-lit fans and an MSI graphics card" },
    { photo: "build-thermalright-mini.jpg", alt: "Small black build with a Thermalright liquid cooler and lit RAM" },
    { photo: "build-black-hyxn.jpg", alt: "Black glass case build with a Gigabyte GeForce RTX card" },
    { photo: "build-blue-desk.jpg", alt: "Finished build glowing blue on a desk next to a monitor" },
  ] as HeroPhoto[],
  techRepair: [] as HeroPhoto[],
  /** Seconds the finished drawing stays on screen before fading to the photos. */
  delay: 2.5,
  /** Seconds each photo shows before fading to the next. */
  interval: 4.5,
};

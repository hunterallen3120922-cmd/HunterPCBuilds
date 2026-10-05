import type { GalleryItem } from "../types";

/**
 * PAST BUILDS. Put the photo in public/gallery/ and add one block here.
 * `photo` is just the file name. `price` and `featured` are optional.
 * These three are placeholder examples. Replace them with your real builds.
 */
export const gallery: GalleryItem[] = [
  {
    title: "White 1440p gaming build",
    photo: "example-1.svg",
    specs: ["Example specs go here", "CPU · GPU · RAM · Storage"],
    price: "$1,350",
    featured: true,
  },
  {
    title: "Budget school & esports PC",
    photo: "example-2.svg",
    specs: ["Example specs go here", "CPU · GPU · RAM · Storage"],
    price: "$700",
    featured: true,
  },
  {
    title: "Video editing workstation",
    photo: "example-3.svg",
    specs: ["Example specs go here", "CPU · GPU · RAM · Storage"],
    featured: true,
  },
];

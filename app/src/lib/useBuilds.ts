import { useEffect, useState } from "react";
import { getBuilds, photoUrl, supabaseReady, type BuildRow } from "./supabase";
import type { GalleryItem } from "../types";

/** One shared request per page load, however many parts of the page ask for builds. */
let cache: Promise<BuildRow[] | null> | null = null;
const load = () => (cache ??= supabaseReady ? getBuilds().catch((err) => { console.warn("Using built-in builds:", err); return null; }) : Promise.resolve(null));

/**
 * Builds from the admin portal. `builds` is undefined while loading, null if the portal isn't set up or couldn't be
 * reached (then use the content files), or the list of published builds.
 */
export function useBuilds() {
  const [builds, setBuilds] = useState<BuildRow[] | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    load().then((b) => alive && setBuilds(b));
    return () => { alive = false; };
  }, []);
  return builds;
}

/** A database build in the shape the site's gallery and carousel use. */
export function toGalleryItem(b: BuildRow): GalleryItem {
  const photos = b.photos.map(photoUrl);
  return { title: b.title, photo: photos[0] ?? "", photos, specs: b.specs, price: b.price ?? undefined, featured: b.featured };
}

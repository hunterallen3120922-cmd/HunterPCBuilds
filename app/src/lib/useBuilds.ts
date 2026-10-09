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

/** "850" → "$850", "2200" → "$2,200". Anything else (already has $, words like "Custom quote") is left as typed. */
export function formatPrice(price: string | null | undefined): string | undefined {
  const p = price?.trim();
  if (!p) return undefined;
  if (!/^\d[\d,]*(\.\d{1,2})?$/.test(p)) return p;
  const n = Number(p.replace(/,/g, ""));
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: p.includes(".") ? 2 : 0, maximumFractionDigits: 2 })}`;
}

/** A database build in the shape the site's gallery and carousel use. */
export function toGalleryItem(b: BuildRow): GalleryItem {
  const photos = b.photos.map(photoUrl);
  return { title: b.title, photo: photos[0] ?? "", photos, specs: b.specs, price: formatPrice(b.price), featured: b.featured };
}

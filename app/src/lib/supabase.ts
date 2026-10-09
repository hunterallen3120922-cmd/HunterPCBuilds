/**
 * The public site's connection to Supabase (the database behind the admin portal).
 * Kept to plain fetch calls so visitors don't download the full Supabase library; the admin portal uses that instead.
 * If the keys aren't set (or Supabase is down/paused) everything here quietly does nothing and the site uses the
 * content files in src/content instead.
 */
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "") || "";
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || "";
export const supabaseReady = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Storage bucket for build photos. */
export const PHOTO_BUCKET = "build-photos";

/** A build as stored in the database (see supabase/schema.sql). */
export interface BuildRow {
  id: string;
  title: string;
  specs: string[];
  price: string | null;
  photos: string[];
  featured: boolean;
  in_gallery: boolean;
  in_slideshow: boolean;
  published: boolean;
  sort_order: number;
  created_at: string;
}

/** Public web address of a photo in storage. */
export const photoUrl = (path: string) => `${SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;

/** Newer projects use a "publishable" key (sb_publishable_…), which goes only in the apikey header; older
 *  "anon" keys are JWTs (eyJ…) and also go in Authorization. */
const headers = (): Record<string, string> => SUPABASE_ANON_KEY.startsWith("eyJ")
  ? { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
  : { apikey: SUPABASE_ANON_KEY };

/** Published builds, in your chosen order. Gives up after `timeoutMs` so the site never waits long. */
export async function getBuilds(timeoutMs = 4000): Promise<BuildRow[]> {
  if (!supabaseReady) throw new Error("Supabase not configured");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/builds?select=*&published=eq.true&order=sort_order.asc,created_at.desc`,
      { headers: headers(), signal: ctrl.signal });
    if (!res.ok) throw new Error(`Builds request failed (${res.status})`);
    return (await res.json()) as BuildRow[];
  } finally {
    clearTimeout(t);
  }
}

/** Saves a request from the site's forms so it shows up in the admin portal's Requests tab. */
export async function insertRequest(row: { type: "build" | "repair"; name: string; email: string; phone: string; fields: Record<string, string> }): Promise<void> {
  if (!supabaseReady) throw new Error("Supabase not configured");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/requests`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Saving the request failed (${res.status})`);
}

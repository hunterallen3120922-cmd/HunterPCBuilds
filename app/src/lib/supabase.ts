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

/** A shop item as the site sees it (see supabase/shop-and-trade-ins.sql). Your cost is never sent to visitors. */
export interface ShopItemRow {
  id: string;
  tab: "pcs" | "laptops" | "parts" | "prints" | "past_prints";
  name: string;
  price: number;
  condition: string | null;
  note: string | null;
  specs: string[];
  photos: string[];
  status: "available" | "reserved" | "sold";
  sort_order: number;
}

/** Published shop items, in your chosen order. */
export async function getShopItems(timeoutMs = 4000): Promise<ShopItemRow[]> {
  if (!supabaseReady) throw new Error("Supabase not configured");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const cols = "id,tab,name,price,condition,note,specs,photos,status,sort_order";
    const res = await fetch(`${SUPABASE_URL}/rest/v1/shop_items?select=${cols}&tab=in.(pcs,laptops,parts)&published=eq.true&order=sort_order.asc,created_at.desc`,
      { headers: headers(), signal: ctrl.signal });
    if (!res.ok) throw new Error(`Shop request failed (${res.status})`);
    return (await res.json()) as ShopItemRow[];
  } finally {
    clearTimeout(t);
  }
}

/** Saves a trade-in from the site as a new quote, so it shows up in the admin portal's Quotes tab. */
export async function insertTradeIn(row: { title: string; customer: string; contact: string; trade_in: Record<string, unknown> }): Promise<void> {
  if (!supabaseReady) throw new Error("Supabase not configured");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/quotes`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ ...row, purpose: "trade_in", status: "draft", tax_rate: 0 }),
  });
  if (!res.ok) throw new Error(`Saving the trade-in failed (${res.status})`);
}

/** Published Print Shop items and past prints for the 3D Prints page (see supabase/3d-prints.sql). */
export async function getPrintItems(timeoutMs = 4000): Promise<(ShopItemRow & { colors: string[] })[]> {
  if (!supabaseReady) throw new Error("Supabase not configured");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const cols = "id,tab,name,price,condition,note,specs,photos,status,sort_order,colors";
    const res = await fetch(`${SUPABASE_URL}/rest/v1/shop_items?select=${cols}&tab=in.(prints,past_prints)&published=eq.true&order=sort_order.asc,created_at.desc`,
      { headers: headers(), signal: ctrl.signal });
    if (!res.ok) throw new Error(`Prints request failed (${res.status})`);
    return (await res.json()) as (ShopItemRow & { colors: string[] })[];
  } finally {
    clearTimeout(t);
  }
}

/** Private bucket for photos and model files attached to custom print requests. Only the admin can open them. */
export const PRINT_UPLOAD_BUCKET = "print-uploads";

/** Uploads one file for a custom print request and returns its storage path. */
export async function uploadPrintFile(folder: string, file: File): Promise<string> {
  if (!supabaseReady) throw new Error("Supabase not configured");
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  const base = file.name.replace(/\.[^.]*$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60) || "file";
  const path = `requests/${folder}/${base}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${PRINT_UPLOAD_BUCKET}/${path}`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" },
    body: file,
  });
  if (!res.ok) throw new Error(`Uploading ${file.name} failed (${res.status})`);
  return path;
}

/** Saves a custom print request from the site as a new quote, so it shows up in the admin portal's Quotes tab. */
export async function insertPrintRequest(row: { title: string; customer: string; contact: string; print_job: Record<string, unknown> }): Promise<void> {
  if (!supabaseReady) throw new Error("Supabase not configured");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/quotes`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ ...row, purpose: "print", status: "draft", tax_rate: 0 }),
  });
  if (!res.ok) throw new Error(`Saving the print request failed (${res.status})`);
}

/** A review as the site shows it (see supabase/reviews.sql). */
export interface ReviewRow {
  id: string;
  source: "ebay" | "in person" | "facebook" | "other";
  rating: "positive" | "neutral" | "negative";
  comment: string;
  buyer: string | null;
  item: string | null;
  reviewed_on: string;
}
/** Your eBay summary: username for the "See all" link, positive % and feedback count. */
export interface ReviewStats {
  ebay_username: string | null;
  positive_pct: number | null;
  feedback_count: number | null;
}

async function getJson<T>(path: string, timeoutMs: number): Promise<T> {
  if (!supabaseReady) throw new Error("Supabase not configured");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: headers(), signal: ctrl.signal });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

/** The newest published reviews and your eBay summary. Null if the portal isn't set up or the tables don't exist yet. */
export async function getReviews(limit = 6, timeoutMs = 4000): Promise<{ reviews: ReviewRow[]; stats: ReviewStats | null } | null> {
  if (!supabaseReady) return null;
  try {
    const [reviews, stats] = await Promise.all([
      getJson<ReviewRow[]>(`reviews?select=id,source,rating,comment,buyer,item,reviewed_on&published=eq.true&rating=eq.positive&order=reviewed_on.desc,created_at.desc&limit=${limit}`, timeoutMs),
      getJson<ReviewStats[]>("review_stats?select=ebay_username,positive_pct,feedback_count&id=eq.1", timeoutMs).catch(() => []),
    ]);
    return { reviews, stats: stats[0] ?? null };
  } catch (err) {
    console.warn("Reviews unavailable:", err);
    return null;
  }
}

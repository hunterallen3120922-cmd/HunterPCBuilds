import type { FormValues } from "../types";

/**
 * PHASE 3 will replace this with: save to Supabase + email through Web3Forms.
 * For now it only works while developing (npm run dev) so you can test the
 * success screen. On the live site it reports "not connected yet".
 */
export async function submitRequest(type: "build" | "repair", values: FormValues): Promise<void> {
  if (import.meta.env.DEV) {
    console.info("[dev] request would be sent:", type, values);
    await new Promise((r) => setTimeout(r, 600));
    return;
  }
  throw new Error("The request form isn't connected yet.");
}

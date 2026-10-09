import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseReady } from "../lib/supabase";

/** The full Supabase client, used only inside the admin portal (login, editing, photo uploads). */
export const supabase = supabaseReady ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

/** The request statuses, in the order you work through them. */
export const STATUSES = ["new", "quoted", "scheduled", "done", "archived"] as const;
export type Status = (typeof STATUSES)[number];

export interface RequestRow {
  id: string;
  created_at: string;
  type: "build" | "repair";
  name: string | null;
  email: string | null;
  phone: string | null;
  fields: Record<string, string>;
  status: Status;
  notes: string | null;
}

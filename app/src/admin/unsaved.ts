import { useEffect } from "react";

/**
 * Keeps unsaved work from being lost. While anything is marked unsaved, closing or reloading the tab
 * makes the browser ask first, and leaveOk() asks before the admin switches sections or signs out.
 */
const unsaved = new Set<string>();
const MSG = "This quote has unsaved changes. Leave without saving? Your work will be lost.";

const onBeforeUnload = (e: BeforeUnloadEvent) => {
  if (!unsaved.size) return;
  e.preventDefault();
  // Older browsers need returnValue set; every browser shows its own wording
  e.returnValue = MSG;
  return MSG;
};
if (typeof window !== "undefined") window.addEventListener("beforeunload", onBeforeUnload);

/** Mark something (by a key) as having unsaved work while `on` is true. Cleared when the component goes away. */
export function useUnsaved(key: string, on: boolean) {
  useEffect(() => {
    if (on) unsaved.add(key); else unsaved.delete(key);
    return () => { unsaved.delete(key); };
  }, [key, on]);
}

/** True when it's fine to move away: nothing is unsaved, or the admin said to leave anyway. */
export function leaveOk(msg = MSG) {
  if (!unsaved.size) return true;
  if (!window.confirm(msg)) return false;
  unsaved.clear();
  return true;
}

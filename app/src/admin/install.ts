import { useEffect, useState } from "react";

/** Chrome/Edge/Android hand us this event when the app can be installed with one click. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPromptEvent | null = null;
const subscribers = new Set<() => void>();
const notify = () => subscribers.forEach((fn) => fn());

/** Call once at startup: the browser fires the event early, before React has drawn anything. */
export function listenForInstall() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => { deferred = null; notify(); });
}

export const isInstalled = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

/** iPhone/iPad Safari can't install with a button; it's Share, then Add to Home Screen. */
export const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/** "prompt" = one-click install available, "ios" = show the Share steps, null = nothing to show. */
export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    subscribers.add(fn);
    return () => { subscribers.delete(fn); };
  }, []);
  const kind: "prompt" | "ios" | null = isInstalled() ? null : deferred ? "prompt" : isIos() ? "ios" : null;
  const install = async () => {
    if (!deferred) return;
    const ev = deferred;
    await ev.prompt();
    await ev.userChoice.catch(() => undefined);
    deferred = null;
    notify();
  };
  return { kind, install };
}

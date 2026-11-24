import { useEffect, useRef } from "react";
import type { CatalogItem } from "../content/prints";

const base = import.meta.env.BASE_URL;

/**
 * Product renders of the ready-made 3D prints (app/public/prints/*.webp, transparent background).
 * Made with app/tools/print-renders (a small three.js scene); re-run it to add or change one.
 */
export default function PrintArt({ kind, className = "", alt = "" }: { kind: CatalogItem["art"]; className?: string; alt?: string }) {
  return <img src={`${base}prints/${kind}.webp`} alt={alt} loading="lazy" decoding="async" width={800} height={600} className={`object-contain ${className}`} />;
}

/**
 * "Something custom": a 3D object being printed layer by layer, then the next one (a short looping video).
 * Plays only while on screen, and stays on its still frame for people who prefer less motion.
 */
export function PrintingVideo({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { v.removeAttribute("autoplay"); v.pause(); return; }
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <video ref={ref} className={className} autoPlay muted loop playsInline preload="metadata" poster={`${base}prints/printing-poster.jpg`} aria-hidden>
      <source src={`${base}prints/printing.webm`} type="video/webm" />
      <source src={`${base}prints/printing.mp4`} type="video/mp4" />
    </video>
  );
}

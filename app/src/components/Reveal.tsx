import type { CSSProperties, ReactNode } from "react";

/** Pops its children in as they scroll into view, and back out as they leave (see ScrollMotion). */
export default function Reveal({ children, className = "", delay = 0, as = "up" }: { children: ReactNode; className?: string; delay?: number; as?: "up" | "zoom" | "blur" | "left" | "right" }) {
  return <div data-reveal={as} className={className} style={{ "--rd": `${delay}ms` } as CSSProperties}>{children}</div>;
}

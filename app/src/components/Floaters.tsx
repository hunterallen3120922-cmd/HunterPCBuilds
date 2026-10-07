import { useEffect, useState, type ReactNode } from "react";

/**
 * A part that floats (gently bobbing) around a drawing, then swoops into place and fades as it arrives.
 * Its flight is driven by the same --q-<id> variable (0 to 1) that makes the real part appear in the drawing.
 * Children are drawn centered on (0, 0). `appear` names the variable that fades the floater in at the start.
 * `swirl` bends the flight path sideways (all parts bend the same way, so together they spiral in) and turns the
 * part a little as it flies; 0 flies straight.
 */
export function Floater({ id, from, to, appear, bob = 0, swirl = 0, children }: {
  id: string; from: [number, number]; to: [number, number]; appear: string; bob?: number; swirl?: number; children: ReactNode;
}) {
  const q = `var(--q-${id}, 0)`;
  const [dx, dy] = [to[0] - from[0], to[1] - from[1]];
  const arc = `(${q} * (1 - ${q}) * 4)`; // 0 at both ends, 1 halfway
  return (
    <g className="floater" style={{
      // floating parts are shown "lit": their fans glow and spin
      ["--q-power" as string]: 1,
      transform: `translate(calc(${from[0]}px + ${dx}px * ${q} + ${-dy * swirl}px * ${arc}), calc(${from[1]}px + ${dy}px * ${q} + ${dx * swirl}px * ${arc}))`
        + ` rotate(calc((1 - ${q}) * ${swirl * 70}deg)) scale(calc(1 - ${q} * .5))`,
      opacity: `calc(var(--q-${appear}, 1) * (1 - ${q} * ${q} * ${q}))`,
    }}>
      {/* the bob calms down as the part flies in */}
      <g className="float-bob" style={{ animationDelay: `${-bob}s`, ["--bob" as string]: `calc(1 - ${q})` }}>{children}</g>
    </g>
  );
}

/** True when the screen is taller than wide: there is room above/below the drawing rather than beside it. */
export function usePortrait() {
  const query = "(max-aspect-ratio: 1/1)";
  const [portrait, setPortrait] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setPortrait(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return portrait;
}

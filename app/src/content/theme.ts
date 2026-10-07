/**
 * COLORS, FONTS AND CORNERS. Change a value here and the whole site updates.
 * (If you change a font, also change the Google Fonts link in index.html.)
 */
export const theme = {
  colors: {
    bg: "#eaede2", // page background - sage paper
    bg2: "#e0e5d2", // alternate section background
    card: "#f4f6eb", // cards - lightest paper
    line: "#c6cdb2", // hairline borders
    text: "#22261b", // ink
    muted: "#5d6450",
    accent: "#cf2e50", // main accent (buttons, highlights) - crimson, used sparingly
    accent2: "#6f7a56", // small details (labels, numbers) - dark sage
    danger: "#b3273c",
    success: "#3d8a5a", // "fixed / all good" states (Tech Repair animation)
  },
  fonts: {
    heading: '"Inter Tight", Inter, system-ui, sans-serif',
    body: 'Inter, system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
  radius: "3px",
};

/** Copies the theme into CSS variables. Called once at startup. */
export function applyTheme() {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(theme.colors)) root.style.setProperty(`--${k}`, v);
  root.style.setProperty("--font-heading", theme.fonts.heading);
  root.style.setProperty("--font-body", theme.fonts.body);
  root.style.setProperty("--font-mono", theme.fonts.mono);
  root.style.setProperty("--radius", theme.radius);
}

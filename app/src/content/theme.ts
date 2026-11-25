/**
 * COLORS, FONTS AND CORNERS. Change a value here and the whole site updates.
 * (If you change a font, also update src/fonts.css, which holds the font files the site loads.)
 */
export const theme = {
  colors: {
    bg: "#0b1017", // page background
    bg2: "#0f1621", // alternate section background
    card: "#121a26", // cards
    line: "#1e2938", // hairline borders
    text: "#eceff4",
    muted: "#8e9bad",
    accent: "#3ecf9a", // main accent (buttons, highlights) - emerald
    accent2: "#d6b370", // small details (labels, numbers) - brass
    danger: "#ff7a7a",
    success: "#3ecf9a", // "fixed / all good" states (Tech Repair animation)
  },
  fonts: {
    heading: 'Geist, Inter, system-ui, sans-serif',
    body: 'Geist, Inter, system-ui, sans-serif',
    mono: '"Geist Mono", ui-monospace, monospace',
  },
  radius: "14px", // corner roundness of cards
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

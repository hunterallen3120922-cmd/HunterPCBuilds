/**
 * COLORS, FONTS AND CORNERS. Change a value here and the whole site updates.
 * (If you change a font, also change the Google Fonts link in index.html.)
 */
export const theme = {
  colors: {
    bg: "#0b0f14", // page background
    bg2: "#111821", // alternate section background
    card: "#151e29", // cards
    line: "#243142", // borders
    text: "#e6edf5",
    muted: "#8fa1b5",
    accent: "#2ee6a6", // green
    accent2: "#3aa0ff", // blue
    danger: "#ff6b6b",
  },
  fonts: {
    heading: '"Space Grotesk", sans-serif',
    body: 'Inter, system-ui, sans-serif',
  },
  radius: "14px",
};

/** Copies the theme into CSS variables. Called once at startup. */
export function applyTheme() {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(theme.colors)) root.style.setProperty(`--${k}`, v);
  root.style.setProperty("--font-heading", theme.fonts.heading);
  root.style.setProperty("--font-body", theme.fonts.body);
  root.style.setProperty("--radius", theme.radius);
}

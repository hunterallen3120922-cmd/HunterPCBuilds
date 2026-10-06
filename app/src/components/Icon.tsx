import type { ReactNode } from "react";

/**
 * Line icons. In the content files, set `icon: "shield"` etc.
 * Available names: see the list below. Anything else (like an emoji) is shown as plain text.
 */
const paths: Record<string, ReactNode> = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  shield: <path d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6z" />,
  "shield-check": <><path d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6z" /><path d="m9 12 2 2 4-4" /></>,
  disc: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /></>,
  chip: <><rect x="6" y="6" width="12" height="12" rx="2" /><rect x="9.5" y="9.5" width="5" height="5" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></>,
  battery: <><rect x="2" y="7" width="17" height="10" rx="2" /><path d="M22 11v2M6 10v4M10 10v4" /></>,
  monitor: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>,
  fan: <path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8a2.5 2.5 0 1 1-2.5 2.5" />,
  laptop: <><rect x="5" y="5" width="14" height="10" rx="1.5" /><path d="M2.5 19h19" /></>,
  desktop: <><rect x="7" y="3" width="10" height="18" rx="2" /><circle cx="12" cy="8" r="1.5" /><path d="M10 16h4" /></>,
  gamepad: <><path d="M7 8h10a4 4 0 0 1 4 4.2L20 16a2.5 2.5 0 0 1-4.3 1.2L14.5 16h-5l-1.2 1.2A2.5 2.5 0 0 1 4 16l-1-3.8A4 4 0 0 1 7 8z" /><path d="M8 11v3M6.5 12.5h3M15.5 11.5h.01M17.5 13.5h.01" /></>,
  phone: <><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01" /></>,
  graduation: <><path d="m2 9 10-5 10 5-10 5z" /><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5M22 9v6" /></>,
  tag: <><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1" /></>,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  pin: <><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  box: <><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" /><path d="m3 7.5 9 4.5 9-4.5M12 12v9" /></>,
  video: <><rect x="3" y="6" width="12" height="12" rx="2" /><path d="m15 10 6-3v10l-6-3z" /></>,
  save: <><path d="M5 4h11l3 3v13H5z" /><path d="M8 4v5h7V4M8 20v-6h8v6" /></>,
  wrench: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
  check: <path d="m5 12 5 5 9-10" />,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  pause: <path d="M9 5v14M15 5v14" />,
  play: <path d="M8 5.5v13l11-6.5z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
};

export const iconNames = Object.keys(paths);

export default function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  const p = paths[name];
  if (!p) return <span aria-hidden className={className.includes("h-") ? "leading-none" : ""}>{name}</span>;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      {p}
    </svg>
  );
}

/** Icon inside a small rounded tile. */
export function IconTile({ name, size = "h-10 w-10" }: { name: string; size?: string }) {
  return <span className={`icon-tile ${size}`}><Icon name={name} /></span>;
}

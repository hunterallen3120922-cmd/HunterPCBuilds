/** The ✕ in the top-right corner of every popup. Clicking outside a popup never closes it, so this (or Esc) is the way out. */
export default function CloseX({ onClick, label = "Close", over = false }: {
  onClick: () => void; label?: string;
  /** Sit on top of a full-bleed photo instead of floating beside the heading (stays put while the popup scrolls) */
  over?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className={`${over ? "absolute right-3 top-3 shadow-lg" : "sticky top-0 float-right -mr-2 -mt-2 mb-2 ml-3"} z-10 grid h-9 w-9 place-items-center rounded-full border border-line bg-card text-[1.05rem] leading-none text-muted hover:border-accent hover:text-ink focus-visible:border-accent`}>
      ✕
    </button>
  );
}

/** Ask before a popup throws away what was typed. Returns true when it's fine to close. */
export function okToDiscard(dirty: boolean, msg = "Close without saving? What you typed will be lost.") {
  return !dirty || window.confirm(msg);
}

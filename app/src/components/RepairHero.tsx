import type { CSSProperties } from "react";
import Icon from "./Icon";

/** The checks on the diagnostic panel: each starts red (`bad`) and flips green (`good`) once it's fixed. */
const CHECKS = [
  { label: "CPU temp", bad: "96°C", good: "41°C" },
  { label: "Disk", bad: "Failing", good: "New SSD" },
  { label: "Battery", bad: "38% health", good: "100%" },
  { label: "Malware", bad: "3 found", good: "Removed" },
];

/** When the panel's pieces happen, in milliseconds after the page opens. The heading rises at the same time. */
const T = { panel: 150, scan: 450, firstFix: 1000, fixGap: 140, done: 1650 };

const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/**
 * The Tech Repair page opening. The heading and buttons are there straight away (rising in like the other pages),
 * and beside them a diagnostic panel plays a quick repair: a scan sweeps the readouts, each red problem flips to
 * green, and it finishes on "All systems normal". It's about two seconds and never covers the page.
 * Timings are in `T` above; the motion itself is under "Repair diagnostic panel" in index.css.
 */
export default function RepairHero() {
  return (
    <header className="relative overflow-hidden pt-16">
      <div className="hero-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="wrap relative grid items-center gap-10 py-14 sm:py-24 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
        <div>
          <p className="eyebrow fade-up mb-6 flex items-center gap-3"><span className="h-px w-7 bg-accent2/60" aria-hidden />Tech repair</p>
          <h1 className="text-[clamp(2.4rem,5.6vw,4.4rem)] lg:text-[clamp(2.4rem,4.4vw,4.2rem)]">
            <span className="line-rise" style={d(100)}><span>Slow, broken or overheating?</span></span>
            <span className="line-rise" style={d(220)}><em className="grad-text">Let's fix it.</em></span>
          </h1>
          <p className="fade-up my-7 max-w-[50ch] text-[1.1rem] text-muted" style={d(340)}>
            Repairs and upgrades with a firm quote before I start. Simple fixes often happen same-day.
          </p>
          <div className="fade-up" style={d(440)}>
            <button type="button" className="btn" onClick={() => document.getElementById("request")?.scrollIntoView()}>
              Start a repair request <Icon name="arrow" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <DiagPanel />
      </div>
    </header>
  );
}

/** The diagnostic panel. Purely decorative (the same facts are in the services list below), so it's hidden from screen readers. */
function DiagPanel() {
  const fixAt = (i: number) => T.firstFix + i * T.fixGap;
  return (
    <div aria-hidden className="rx-panel card relative mx-auto w-full max-w-[30rem] overflow-hidden p-0" style={d(T.panel)}>
      {/* title bar */}
      <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
        <span className="flex gap-1.5">{[0, 1, 2].map((k) => <span key={k} className="h-2.5 w-2.5 rounded-full bg-line" />)}</span>
        <span className="font-mono text-[.72rem] tracking-[.18em] text-muted">DEVICE CHECK</span>
        <span className="ml-auto grid font-mono text-[.68rem] tracking-[.14em]">
          <span className="rx-out col-start-1 row-start-1 rounded-full border border-danger/40 px-2.5 py-1 text-center text-danger" style={d(T.done)}>3 ISSUES</span>
          <span className="rx-in col-start-1 row-start-1 rounded-full border border-accent/50 px-2.5 py-1 text-center text-accent" style={d(T.done)}>FIXED</span>
        </span>
      </div>

      {/* progress bar */}
      <div className="h-[3px] bg-line/60"><div className="rx-bar h-full bg-accent" style={d(T.scan)} /></div>

      {/* readouts, with a scan line sweeping down them once */}
      <ul className="relative m-0 list-none px-5 py-2">
        <span className="rx-scan pointer-events-none absolute inset-x-0 top-0 h-14" style={d(T.scan)} />
        {CHECKS.map((c, i) => (
          <li key={c.label} className="flex items-center gap-3 border-b border-line/60 py-3.5 last:border-b-0">
            <span className="relative h-2.5 w-2.5 shrink-0">
              <span className="rx-out absolute inset-0 rounded-full bg-danger" style={d(fixAt(i))} />
              <span className="rx-in rx-ping absolute inset-0 rounded-full bg-accent" style={d(fixAt(i))} />
            </span>
            <span className="font-mono text-[.75rem] uppercase tracking-[.14em] text-muted">{c.label}</span>
            <span className="relative ml-auto grid font-mono text-[.95rem]">
              <span className="rx-out col-start-1 row-start-1 text-right text-danger" style={d(fixAt(i))}>{c.bad}</span>
              <span className="rx-in col-start-1 row-start-1 text-right text-accent" style={d(fixAt(i))}>{c.good}</span>
            </span>
          </li>
        ))}
      </ul>

      {/* result */}
      <div className="flex items-center gap-3 border-t border-line px-5 py-4">
        <span className="rx-pop grid h-8 w-8 place-items-center rounded-full border border-accent/60 text-accent" style={d(T.done)}>
          <Icon name="check" className="h-4 w-4" />
        </span>
        <span className="rx-in text-[1rem]" style={d(T.done + 80)}>All systems normal</span>
        <span className="rx-in ml-auto font-mono text-[.72rem] text-muted" style={d(T.done + 160)}>READY</span>
      </div>

      {/* soft green glow along the bottom once it's fixed */}
      <span className="rx-glow pointer-events-none absolute inset-x-0 bottom-0 h-24" style={d(T.done)} />
    </div>
  );
}

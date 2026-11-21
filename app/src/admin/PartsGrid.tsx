import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { PART_CATEGORIES, PART_SOURCES, money, num } from "./money";

/** One line in a quote's parts list. `auto` means the category is still guessed from the name. */
export interface GridItem {
  key: string;
  category: string;
  name: string;
  price: number | string;
  qty: number | string;
  source: string;
  link: string;
  optional: boolean;
  auto?: boolean;
}
/** A part you've bought before (from your jobs), for suggestions. */
export interface PastPart { name: string; category: string; n: number; avg: number; min: number; max: number; last: number }

let next = 0;
export const newKey = () => `r${++next}`;
export const blankRow = (category = "Other", auto = true): GridItem => ({ key: newKey(), category, name: "", price: "", qty: 1, source: "", link: "", optional: false, auto });

export const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Best guess at a part's category from its name ("RTX 3060" is a GPU). */
export function guessCategory(name: string): string | null {
  const n = ` ${name.toLowerCase()} `;
  const rules: [RegExp, string][] = [
    [/optiplex|elitedesk|prodesk|thinkcentre|prebuilt|mini pc|dell \w+ \d{4}/, "Prebuilt PC"],
    [/\b(rtx|gtx|rx ?\d{3,4}|radeon|arc a\d|quadro|geforce|gpu|graphics)\b/, "GPU"],
    [/\b(ryzen|threadripper|athlon|xeon|core|i[3579][ -]?\d{3,5}|pentium|celeron|cpu|processor)\b/, "CPU"],
    [/\b(ddr[345]|ram|memory|sodimm|dimm)\b/, "RAM"],
    [/\b(ssd|nvme|m\.2|hdd|hard drive|sata ssd|\d+ ?tb|\d+ ?gb ssd)\b/, "Storage"],
    [/\b(psu|power supply|\d{3,4} ?w\b|watt|80\+|80 plus)/, "PSU"],
    [/\b(b\d{3}m?|x\d{3}|z\d{3}|h\d{2,3}m?|a\d{3}m?|motherboard|mobo|itx board|lga ?\d+)\b/, "Motherboard"],
    [/\b(cooler|aio|liquid|heatsink|noctua|hyper 212|peerless)\b/, "CPU cooler"],
    [/\b(fans?|argb fan|rgb fan)\b/, "Fans"],
    [/\b(wi-?fi|wifi|bluetooth|wireless|network card)\b/, "Wi-Fi"],
    [/\b(windows|win ?1[01]|license|os key)\b/, "Windows"],
    [/\b(case|tower|chassis|matx case|atx case)\b/, "Case"],
    [/\b(keyboard|mouse|monitor|headset|speakers?|webcam|cable|mousepad|controller)\b/, "Accessories"],
  ];
  return rules.find(([re]) => re.test(n))?.[1] ?? null;
}

const COLS = ["category", "name", "price", "qty", "source", "link"] as const;
type Col = (typeof COLS)[number];

/**
 * The parts list as a spreadsheet: type in the cells, Enter goes down a row (and adds one at the bottom),
 * and the arrow keys move up and down. Each part is one line.
 */
export default function PartsGrid({ items, onChange, past, taxRate }: {
  items: GridItem[]; onChange: (items: GridItem[]) => void; past: PastPart[]; taxRate: number;
}) {
  const ref = useRef<HTMLTableElement>(null);
  const [focus, setFocus] = useState<{ row: number; col: Col } | null>(null);

  // Move focus after rows are added
  useLayoutEffect(() => {
    if (!focus) return;
    const el = ref.current?.querySelector<HTMLElement>(`[data-row="${focus.row}"][data-col="${focus.col}"]`);
    el?.focus();
    if (el instanceof HTMLInputElement) el.select();
    setFocus(null);
  }, [focus, items.length]);

  const update = (key: string, patch: Partial<GridItem>) => onChange(items.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  const remove = (key: string) => onChange(items.filter((i) => i.key !== key));

  const nav = (e: KeyboardEvent, row: number, col: Col) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (row === items.length - 1) onChange([...items, blankRow()]);
      setFocus({ row: row + 1, col: col === "name" || col === "category" ? "name" : col });
    } else if ((e.key === "Enter" && e.shiftKey) || (e.key === "ArrowUp" && col !== "category")) {
      e.preventDefault();
      if (row > 0) setFocus({ row: row - 1, col });
    } else if (e.key === "ArrowDown" && col !== "category") {
      e.preventDefault();
      if (row < items.length - 1) setFocus({ row: row + 1, col });
    }
  };

  const subtotal = items.filter((i) => !i.optional).reduce((s, i) => s + num(i.price) * num(i.qty), 0);
  const cell = "w-full bg-transparent px-2 py-1.5 text-[.86rem] text-ink outline-none placeholder:text-muted/60 focus:bg-card focus:ring-1 focus:ring-accent/60 rounded-[4px]";

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table ref={ref} className="w-full min-w-[68rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-line text-[.72rem] uppercase tracking-wide text-muted">
            <th className="w-[8.5rem] px-2 py-2 font-normal">Category</th>
            <th className="px-2 py-2 font-normal">Part</th>
            <th className="w-[6.5rem] px-2 py-2 text-right font-normal">Price</th>
            <th className="w-[3.5rem] px-2 py-2 text-right font-normal">Qty</th>
            <th className="w-[6.5rem] px-2 py-2 text-right font-normal">Total</th>
            <th className="w-[8.5rem] px-2 py-2 font-normal">From</th>
            <th className="w-[9rem] px-2 py-2 font-normal">Link</th>
            <th className="w-[4.5rem] px-2 py-2 text-center font-normal" title="Optional upgrade: listed separately, not in the total">Extra</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {items.map((i, row) => {
            const total = num(i.price) * num(i.qty);
            return (
              <tr key={i.key} className={`group border-b border-line/70 ${i.optional ? "bg-accent2/[.06]" : ""}`}>
                <td className="px-0.5 py-0.5">
                  <select className={`${cell} cursor-pointer`} aria-label={`Row ${row + 1} category`} data-row={row} data-col="category" value={i.category}
                    onChange={(e) => update(i.key, { category: e.target.value, auto: false })} onKeyDown={(e) => nav(e, row, "category")}>
                    {PART_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    {!PART_CATEGORIES.includes(i.category as never) && <option>{i.category}</option>}
                  </select>
                </td>
                <td className="px-0.5 py-0.5">
                  <NameCell item={i} row={row} past={past} className={cell}
                    onChange={(name) => update(i.key, { name, ...(i.auto ? { category: guessCategory(name) ?? "Other" } : {}) })}
                    onPick={(p) => update(i.key, { name: p.name, category: p.category, auto: false, ...(num(i.price) ? {} : { price: Math.round(p.avg * 100) / 100 }) })}
                    onKeyDown={(e) => nav(e, row, "name")} />
                </td>
                <td className="px-0.5 py-0.5">
                  <input className={`${cell} text-right font-mono`} aria-label={`Row ${row + 1} price`} data-row={row} data-col="price" inputMode="decimal" placeholder="0.00"
                    value={i.price} onChange={(e) => update(i.key, { price: e.target.value.replace(/[^\d.]/g, "") })} onKeyDown={(e) => nav(e, row, "price")} />
                </td>
                <td className="px-0.5 py-0.5">
                  <input className={`${cell} text-right font-mono`} aria-label={`Row ${row + 1} quantity`} data-row={row} data-col="qty" inputMode="numeric"
                    value={i.qty} onChange={(e) => update(i.key, { qty: e.target.value.replace(/\D/g, "") })} onKeyDown={(e) => nav(e, row, "qty")} />
                </td>
                <td className="px-2 py-0.5 text-right font-mono text-[.86rem] text-muted">{total ? money(total) : ""}</td>
                <td className="px-0.5 py-0.5">
                  <input className={cell} aria-label={`Row ${row + 1} from`} data-row={row} data-col="source" list="grid-sources" placeholder="eBay…"
                    value={i.source} onChange={(e) => update(i.key, { source: e.target.value })} onKeyDown={(e) => nav(e, row, "source")} />
                </td>
                <td className="px-0.5 py-0.5">
                  <span className="flex items-center">
                    <input className={cell} aria-label={`Row ${row + 1} link`} data-row={row} data-col="link" placeholder="Paste link"
                      value={i.link} onChange={(e) => update(i.key, { link: e.target.value })} onKeyDown={(e) => nav(e, row, "link")} />
                    {/^https?:\/\//.test(i.link) && <a href={i.link} target="_blank" rel="noreferrer" className="px-1 text-[.8rem] no-underline" title="Open link">↗</a>}
                  </span>
                </td>
                <td className="text-center">
                  <input type="checkbox" className="h-4 w-4 accent-[var(--accent2)]" aria-label={`Row ${row + 1} is an optional upgrade`} checked={i.optional}
                    onChange={(e) => update(i.key, { optional: e.target.checked })} />
                </td>
                <td className="text-center">
                  <button type="button" aria-label={`Remove row ${row + 1}`} title="Remove row" tabIndex={-1}
                    className="px-1.5 text-muted opacity-40 hover:text-danger group-hover:opacity-100 focus:opacity-100" onClick={() => remove(i.key)}>✕</button>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="text-[.86rem]">
            <td colSpan={2} className="px-2 py-2">
              <button type="button" className="text-[.82rem] text-accent hover:underline" onClick={() => { onChange([...items, blankRow()]); setFocus({ row: items.length, col: "name" }); }}>+ Add row</button>
              <span className="ml-3 text-[.75rem] text-muted">Enter = next row · ↑↓ move between rows</span>
            </td>
            <td colSpan={2} className="px-2 py-2 text-right text-muted">Parts</td>
            <td className="px-2 py-2 text-right font-mono">{money(subtotal)}</td>
            <td colSpan={4} className="px-2 py-2 text-[.78rem] text-muted">+ {+(taxRate * 100).toFixed(2)}% tax = <span className="font-mono text-ink">{money(subtotal * (1 + taxRate))}</span></td>
          </tr>
        </tfoot>
      </table>
      <datalist id="grid-sources">{PART_SOURCES.map((s) => <option key={s} value={s} />)}</datalist>
    </div>
  );
}

/** The part name cell, with a short list of matching parts you've bought before (shown once you start typing). */
function NameCell({ item, row, past, className, onChange, onPick, onKeyDown }: {
  item: GridItem; row: number; past: PastPart[]; className: string;
  onChange: (name: string) => void; onPick: (p: PastPart) => void;
  onKeyDown: (e: KeyboardEvent) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const [box, setBox] = useState<{ left: number; top: number; width: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const words = norm(item.name).split(" ").filter(Boolean);
    if (!open || norm(item.name).length < 2) return [];
    return past
      .filter((p) => words.every((w) => norm(p.name).includes(w)) && norm(p.name) !== norm(item.name))
      .sort((a, b) => Number(b.category === item.category) - Number(a.category === item.category) || b.n - a.n)
      .slice(0, 6);
  }, [open, item.name, item.category, past]);

  const place = () => {
    const r = input.current?.getBoundingClientRect();
    if (r) setBox({ left: r.left, top: r.bottom + 2, width: Math.max(r.width, 340) });
  };

  const key = (e: KeyboardEvent) => {
    if (matches.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(matches.length - 1, h + 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); return; }
      if (e.key === "Enter" || e.key === "Tab") {
        if (e.key === "Enter" || hi > 0) { e.preventDefault(); onPick(matches[hi]); setOpen(false); return; }
      }
      if (e.key === "Escape") { setOpen(false); return; }
    }
    onKeyDown(e);
  };

  return (
    <>
      <input ref={input} className={className} aria-label={`Row ${row + 1} part`} data-row={row} data-col="name" placeholder="Start typing a part…"
        autoComplete="off" value={item.name} maxLength={200}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setHi(0); place(); }}
        onFocus={place} onBlur={() => setTimeout(() => setOpen(false), 120)} onKeyDown={key} />
      {matches.length > 0 && box && (
        <ul role="listbox" className="fixed z-50 overflow-hidden rounded-card border border-line bg-card shadow-2xl"
          style={{ left: box.left, top: box.top, width: box.width }}>
          {matches.map((p, k) => (
            <li key={`${p.category}|${p.name}`} role="option" aria-selected={k === hi}
              onMouseDown={(e) => { e.preventDefault(); onPick(p); setOpen(false); }} onMouseEnter={() => setHi(k)}
              className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-[.84rem] ${k === hi ? "bg-bg2" : ""}`}>
              <span className="min-w-0"><span className="block truncate text-ink">{p.name}</span><span className="text-[.72rem] text-muted">{p.category} · bought {p.n}×</span></span>
              <span className="shrink-0 text-right font-mono text-[.8rem]">
                <span className="block text-ink">{money(p.avg)}</span>
                {p.n > 1 && <span className="text-[.7rem] text-muted">{money(p.min)}–{money(p.max)}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

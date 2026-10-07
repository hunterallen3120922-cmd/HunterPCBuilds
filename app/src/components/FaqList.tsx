import type { FaqItem } from "../types";

export default function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div data-reveal-group="up" className="divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
      {items.map((f) => (
        <details key={f.question} className="group px-6 py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
            {f.question}
            <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line text-accent transition-transform group-open:rotate-45">+</span>
          </summary>
          <p className="mt-3 max-w-[70ch] text-[.95rem] text-muted">{f.answer}</p>
        </details>
      ))}
    </div>
  );
}

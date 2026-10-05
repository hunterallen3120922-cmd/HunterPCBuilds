import type { FaqItem } from "../types";

export default function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div>
      {items.map((f) => (
        <details key={f.question} className="group mb-[10px] rounded-xl border border-line bg-card px-5 py-4">
          <summary className="cursor-pointer list-none font-semibold">
            {f.question}
            <span aria-hidden className="float-right text-accent group-open:hidden">+</span>
            <span aria-hidden className="float-right hidden text-accent group-open:inline">–</span>
          </summary>
          <p className="mt-[10px] text-[.95rem] text-muted">{f.answer}</p>
        </details>
      ))}
    </div>
  );
}

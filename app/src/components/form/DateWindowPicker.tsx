import type { PreferredWindow } from "../../types";
import { timeSlots } from "../../content/formOptions";

const MAX = 3;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 1 to 3 date + time suggestions. */
export default function DateWindowPicker({ id, value, onChange }: { id: string; value: PreferredWindow[]; onChange: (v: PreferredWindow[]) => void }) {
  const rows = value.length ? value : [{ date: "", time: "" }];
  const set = (i: number, patch: Partial<PreferredWindow>) => onChange(rows.map((r, n) => (n === i ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 max-sm:grid-cols-[1fr_1fr]">
          <input id={i === 0 ? id : undefined} type="date" className="input" min={todayStr()} value={r.date}
            aria-label={`Option ${i + 1} date`} onChange={(e) => set(i, { date: e.target.value })} />
          <select className="input" value={r.time} aria-label={`Option ${i + 1} time`} onChange={(e) => set(i, { time: e.target.value })}>
            <option value="">Time…</option>
            {timeSlots.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {rows.length > 1 && (
            <button type="button" className="btn btn-ghost max-sm:col-span-2" onClick={() => onChange(rows.filter((_, n) => n !== i))}
              aria-label={`Remove option ${i + 1}`}>Remove</button>
          )}
        </div>
      ))}
      {rows.length < MAX && (
        <button type="button" className="text-[.9rem] text-accent underline-offset-2 hover:underline"
          onClick={() => onChange([...rows, { date: "", time: "" }])}>
          + Add another option ({rows.length}/{MAX})
        </button>
      )}
    </div>
  );
}

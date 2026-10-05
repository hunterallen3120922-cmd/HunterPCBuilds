import { useId } from "react";
import type { FieldDef } from "./types";
import type { FieldValue, PreferredWindow } from "../../types";
import DateWindowPicker from "./DateWindowPicker";

interface Props {
  def: FieldDef;
  value: FieldValue;
  error?: string;
  onChange: (v: FieldValue) => void;
}

export default function Field({ def, value, error, onChange }: Props) {
  const id = useId();
  const errId = `${id}-err`;
  const common = { id, "aria-invalid": error ? true : undefined, "aria-describedby": error ? errId : undefined } as const;
  const opts = def.options ?? [];
  const str = typeof value === "string" ? value : "";

  const label = (
    <span className="mb-[6px] block text-[.95rem] font-medium">
      {def.label} {def.hint && <span className="text-[.82rem] font-normal text-muted">{def.hint}</span>}
    </span>
  );

  let control;
  switch (def.kind) {
    case "static":
      control = <p className="rounded-[10px] border border-accent/40 bg-accent/[.07] px-[14px] py-3 font-semibold">{def.defaultValue}</p>;
      break;
    case "choice":
      control = (
        <div role="radiogroup" aria-labelledby={`${id}-l`} className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
          {opts.map((o) => (
            <label key={o.value} className="relative block cursor-pointer">
              <input type="radio" name={def.name} value={o.value} checked={str === o.value}
                onChange={() => onChange(o.value)} className="peer absolute opacity-0" />
              <span className="block h-full rounded-xl border-[1.5px] border-line bg-bg2 p-4 transition hover:border-[#3a4c63] peer-checked:border-accent peer-checked:bg-accent/[.07] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent2">
                {o.icon && <span className="block text-2xl" aria-hidden>{o.icon}</span>}
                <strong className="mt-[6px] block">{o.label ?? o.value}</strong>
                {o.description && <span className="text-[.85rem] text-muted">{o.description}</span>}
              </span>
            </label>
          ))}
        </div>
      );
      break;
    case "pills": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      control = (
        <div role="group" aria-labelledby={`${id}-l`} className="flex flex-wrap gap-2">
          {opts.map((o) => (
            <label key={o.value} className="relative cursor-pointer">
              <input type="checkbox" checked={arr.includes(o.value)} className="peer absolute opacity-0"
                onChange={(e) => onChange(e.target.checked ? [...arr, o.value] : arr.filter((x) => x !== o.value))} />
              <span className="inline-block rounded-full border-[1.5px] border-line bg-bg2 px-[14px] py-2 text-[.9rem] peer-checked:border-accent peer-checked:text-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent2">
                {o.label ?? o.value}
              </span>
            </label>
          ))}
        </div>
      );
      break;
    }
    case "select":
      control = (
        <select {...common} className="input" value={str} onChange={(e) => onChange(e.target.value)}>
          {!def.defaultValue && <option value="">Choose…</option>}
          {opts.map((o) => <option key={o.value} value={o.value}>{o.label ?? o.value}</option>)}
        </select>
      );
      break;
    case "textarea":
      control = <textarea {...common} className="input min-h-[110px] resize-y" value={str} placeholder={def.placeholder} maxLength={2000} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "windows":
      control = <DateWindowPicker id={id} value={(value as PreferredWindow[]) ?? []} onChange={onChange} />;
      break;
    default:
      control = (
        <input {...common} className="input" type={def.kind} value={str} placeholder={def.placeholder} maxLength={200}
          autoComplete={def.kind === "email" ? "email" : def.kind === "tel" ? "tel" : def.name === "name" ? "name" : "off"}
          onChange={(e) => onChange(e.target.value)} />
      );
  }

  const isGroup = def.kind === "choice" || def.kind === "pills" || def.kind === "windows" || def.kind === "static";
  return (
    <div className="mb-[18px]">
      {isGroup ? <div id={`${id}-l`}>{label}</div> : <label htmlFor={id}>{label}</label>}
      {control}
      {error && <p id={errId} role="alert" className="mt-2 text-[.9rem] text-danger">{error}</p>}
    </div>
  );
}

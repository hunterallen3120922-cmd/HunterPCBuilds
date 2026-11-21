import { useId } from "react";
import type { FieldDef } from "./types";
import type { FieldValue, PreferredWindow } from "../../types";
import DateWindowPicker from "./DateWindowPicker";
import Icon from "../Icon";
import PartArt from "../build/PartArt";

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
    // Picture cards sit under a step title that already asks the question, so their label is for screen readers only
    <span className={def.kind === "cards" ? "sr-only" : "mb-[0.375rem] block text-[.95rem] font-medium"}>
      {def.label} {def.hint && <span className="text-[.82rem] font-normal text-muted">{def.hint}</span>}
    </span>
  );

  let control;
  switch (def.kind) {
    case "static":
      control = <p className="rounded-lg border border-accent/40 bg-accent/[.07] px-[0.875rem] py-3 font-medium">{def.defaultValue}</p>;
      break;
    case "cards": {
      // Big picture cards. One answer is a string; with `multi`, a list.
      const arr = Array.isArray(value) ? (value as string[]) : [];
      const isOn = (v: string) => (def.multi ? arr.includes(v) : str === v);
      const pick = (v: string) => onChange(def.multi ? (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]) : v);
      control = (
        <div role={def.multi ? "group" : "radiogroup"} aria-labelledby={`${id}-l`} className={`grid gap-3 ${opts.length % 3 === 0 && opts.length !== 6 ? "grid-cols-3" : "grid-cols-2"} ${opts.length === 6 ? "sm:grid-cols-3" : ""}`}>
          {opts.map((o) => (
            <label key={o.value} className="relative block cursor-pointer">
              <input type={def.multi ? "checkbox" : "radio"} name={def.name} value={o.value} checked={isOn(o.value)}
                onChange={() => pick(o.value)} className="peer absolute opacity-0" />
              <span className="flex h-full flex-col rounded-card border-2 border-line bg-bg2 p-3.5 text-muted transition hover:-translate-y-0.5 hover:border-accent/40 peer-checked:border-accent peer-checked:bg-accent/[.08] peer-checked:text-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent max-sm:p-3">
                {o.art ? <PartArt name={o.art} /> : o.icon && <span className="grid h-14 place-items-center"><Icon name={o.icon} className="h-8 w-8" /></span>}
                <strong className="mt-2 block font-medium text-ink">{o.label ?? o.value}</strong>
                {o.description && <span className="text-[.78rem] leading-snug text-muted">{o.description}</span>}
              </span>
              <span className="pointer-events-none absolute right-2 top-2 hidden h-5 w-5 place-items-center rounded-full bg-accent text-bg peer-checked:grid"><Icon name="check" className="h-3 w-3" /></span>
            </label>
          ))}
        </div>
      );
      break;
    }
    case "choice":
      control = (
        <div role="radiogroup" aria-labelledby={`${id}-l`} className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-3">
          {opts.map((o) => (
            <label key={o.value} className="relative block cursor-pointer">
              <input type="radio" name={def.name} value={o.value} checked={str === o.value}
                onChange={() => onChange(o.value)} className="peer absolute opacity-0" />
              <span className="block h-full rounded-lg border border-line bg-bg2 p-4 transition hover:border-ink/30 peer-checked:border-accent peer-checked:bg-accent/[.07] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
                {o.icon && <Icon name={o.icon} className="mb-1 h-6 w-6 text-accent" />}
                <strong className="mt-[0.375rem] block">{o.label ?? o.value}</strong>
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
              <span className="inline-block rounded-full border border-line bg-bg2 px-[0.875rem] py-2 text-[.9rem] peer-checked:border-accent peer-checked:text-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
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
      control = <textarea {...common} className="input min-h-[6.875rem] resize-y" value={str} placeholder={def.placeholder} maxLength={2000} onChange={(e) => onChange(e.target.value)} />;
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

  const isGroup = def.kind === "cards" || def.kind === "choice" || def.kind === "pills" || def.kind === "windows" || def.kind === "static";
  return (
    <div className="mb-[1.125rem]">
      {isGroup ? <div id={`${id}-l`}>{label}</div> : <label htmlFor={id}>{label}</label>}
      {control}
      {error && <p id={errId} role="alert" className="mt-2 text-[.9rem] text-danger">{error}</p>}
    </div>
  );
}

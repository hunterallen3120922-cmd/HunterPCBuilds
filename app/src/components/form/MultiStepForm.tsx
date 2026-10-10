import { useMemo, useRef, useState } from "react";
import type { FieldValue, FormValues, PreferredWindow } from "../../types";
import type { Errors, FormConfig } from "./types";
import { validateStep } from "./validate";
import Field from "./Field";
import { site } from "../../content/site";
import { Link } from "react-router-dom";
import Icon from "../Icon";

interface Props {
  config: FormConfig;
  onSubmit: (values: FormValues) => Promise<void>;
  /** Inside a popup: no card styling, and the success screen offers "Close" */
  bare?: boolean;
  onClose?: () => void;
  /** Answers to start with (e.g. a package picked with "Build now") */
  prefill?: FormValues;
}

function display(v: FieldValue | undefined): string {
  if (!v) return "–";
  if (typeof v === "string") return v.trim() || "–";
  if (!v.length) return "–";
  return (v as (string | PreferredWindow)[]).map((x) =>
    typeof x === "string" ? x : `${x.date} at ${x.time}`).join(", ");
}

/** Generic multi-step request form. What it asks is defined in src/forms/. */
export default function MultiStepForm({ config, onSubmit, bare = false, onClose, prefill }: Props) {
  const total = config.steps.length + 1; // + review step
  const initial = useMemo<FormValues>(() => {
    const v: FormValues = {};
    for (const s of config.steps) for (const f of s.fields) {
      v[f.name] = f.kind === "pills" ? [] : f.kind === "windows" ? [{ date: "", time: "" }] : f.defaultValue ?? "";
    }
    return { ...v, ...prefill };
  }, [config, prefill]);

  const [values, setValues] = useState<FormValues>(initial);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [agreed, setAgreed] = useState(false);
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const honeypot = useRef<HTMLInputElement>(null);
  const top = useRef<HTMLDivElement>(null);

  const isReview = step === config.steps.length;
  const current = config.steps[step];

  const go = (n: number) => {
    setStep(n); setErrors({}); setFormError("");
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const next = async () => {
    if (!isReview) {
      const errs = validateStep(current.fields, values);
      setErrors(errs);
      if (Object.keys(errs).length) return;
      return go(step + 1);
    }
    if (!agreed) { setFormError("Please agree to the terms to send."); return; }
    if (honeypot.current?.checked) { setDone(true); return; } // bot: pretend success, send nothing
    setSending(true); setFormError("");
    try {
      await onSubmit(values);
      setDone(true);
    } catch {
      setFormError(`Something went wrong sending your request. Please try again in a few minutes${site.contactEmail ? `, or email ${site.contactEmail}` : ""}.`);
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className={`mx-auto max-w-[47.5rem] text-center ${bare ? "py-6" : "rounded-card border border-line bg-card p-8"}`} role="status">
        <span className="icon-tile mx-auto h-14 w-14 rounded-full"><Icon name="check" className="h-7 w-7" /></span>
        <h3 className="mt-4 text-3xl">Request sent!</h3>
        <p className="mt-2 text-muted">Thanks! I aim to reach out within 24 hours to confirm a time and quote.</p>
        <button type="button" className="btn btn-ghost mt-5"
          onClick={() => { if (onClose) return onClose(); setValues(initial); setAgreed(false); setDone(false); setStep(0); }}>
          {onClose ? "Close" : "Submit another"}
        </button>
      </div>
    );
  }

  return (
    <div ref={top} className={`mx-auto max-w-[47.5rem] scroll-mt-24 ${bare ? "" : "rounded-card border border-line bg-card p-8 max-sm:p-[1.375rem]"}`}>
      <div className="mb-7 flex gap-2" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step + 1} aria-label={`Step ${step + 1} of ${total}`}>
        {Array.from({ length: total }, (_, n) => (
          <div key={n} className={`h-[5px] flex-1 rounded-card transition-colors duration-300 ${n <= step ? "bg-accent" : "bg-line"}`} />
        ))}
      </div>

      <form noValidate onSubmit={(e) => { e.preventDefault(); void next(); }}>
        {/* Spam trap: real people never see or tick this */}
        <input ref={honeypot} type="checkbox" name="botcheck" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px]" />

        <div key={step} className="step-in">
          {!isReview ? (
            <>
              <h3 className="mb-1 text-[1.6rem]">{current.title}</h3>
              {current.sub && <p className="mb-[1.375rem] text-[.95rem] text-muted">{current.sub}</p>}
              {current.fields.map((f) => (
                <Field key={f.name} def={f} value={values[f.name]} error={errors[f.name]}
                  onChange={(v) => { setValues((p) => ({ ...p, [f.name]: v })); if (errors[f.name]) setErrors((p) => ({ ...p, [f.name]: "" })); }} />
              ))}
            </>
          ) : (
            <>
              <h3 className="mb-1 text-[1.6rem]">{config.reviewTitle ?? "Look good?"}</h3>
              <p className="mb-[1.375rem] text-[.95rem] text-muted">Check your details, then send.</p>
              <dl className="rounded-card border border-line bg-bg2 px-[1.125rem] py-4 text-[.92rem]">
                {config.steps.flatMap((s) => s.fields).map((f) => (
                  <div key={f.name} className="flex gap-[0.625rem] border-b border-dashed border-line py-[0.375rem] last:border-0 max-sm:flex-col max-sm:gap-0">
                    <dt className="min-w-[10.625rem] text-muted">{f.label}</dt>
                    <dd className="break-words">{display(values[f.name])}</dd>
                  </div>
                ))}
              </dl>
              <label className="mt-[1.125rem] flex items-start gap-[0.625rem] rounded-card border border-line bg-bg2 p-[0.875rem] text-[.9rem] text-muted">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-[1.125rem] w-[1.125rem] shrink-0 accent-accent" />
                <span>
                  I'm 18 or older (or have a parent/guardian's permission). I understand HunterPCBuilds is an independent, student-run service.
                  I'm responsible for backing up my data, and HunterPCBuilds isn't responsible for data loss or pre-existing damage.
                  See the <Link to="/faq">terms</Link> and{" "}
                  <Link to="/privacy">privacy notice</Link>.
                </span>
              </label>
            </>
          )}
        </div>

        <p role="alert" className="mt-[0.625rem] min-h-[1.2em] text-[.9rem] text-danger">{formError}</p>
        <div className="mt-[1.625rem] flex justify-between gap-[0.625rem]">
          <button type="button" className={`btn btn-ghost ${step === 0 ? "invisible" : ""}`} onClick={() => go(step - 1)} disabled={sending}>Back</button>
          <button type="submit" className="btn" disabled={sending}>
            {sending ? "Sending…" : isReview ? "Send request" : "Next"}
          </button>
        </div>
      </form>
    </div>
  );
}

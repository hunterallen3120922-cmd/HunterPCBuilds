import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import SectionHead from "../components/SectionHead";
import Icon, { IconTile } from "../components/Icon";
import { useSeo } from "../lib/seo";
import { site } from "../content/site";
import FormDialog from "../components/FormDialog";
import { tradeInForm } from "../forms/shopForms";
import type { FormConfig } from "../components/form/types";
import { submitTradeIn } from "../lib/submit";
import { conditions, creditBonus, extras, partTypes, priceList, tradeInRate, tradeInUpdated, type PartType } from "../content/tradeIn";

/** HashRouter owns the # in the address, so in-page jumps scroll by id instead of using href="#id". */
const scrollToId = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

/** Counts a number up from 0 so the price "lands" when it's revealed. */
function useCountUp(target: number, run: boolean, ms = 900) {
  const [v, setV] = useState(run ? target : 0);
  const from = useRef(0);
  useEffect(() => {
    if (!run) { setV(0); from.current = 0; return; }
    const start = performance.now(), a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms), e = 1 - Math.pow(1 - k, 3);
      const n = Math.round(a + (target - a) * e);
      setV(n);
      if (k < 1) raf = requestAnimationFrame(tick); else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms]);
  return v;
}

const CHECKING = ["Looking up recent sold prices…", "Checking the condition…", "Adding up your extras…"];

const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

const steps = [
  { icon: "tag", title: "Get an estimate", text: "Pick your part and its condition. You see a price range right away." },
  { icon: "chat", title: "Send it to me", text: "Add a photo or two. I reply with a firm offer, usually within a day." },
  { icon: "check", title: "Meet up and get paid", text: "I test it in person, then pay cash or Zelle, or add credit to your build." },
];

const takes = ["Graphics cards, processors, memory, SSDs", "Motherboards and power supplies", "Whole PCs and gaming laptops", "Broken stuff too, for parts"];
const skips = ["Anything stolen or locked to an account", "Hard drives I can't wipe in front of you", "Parts older than about 8 years"];

export default function TradeIn() {
  useSeo(`Sell or trade your parts | ${site.name}`, "Get an instant estimate for your old PC parts, then take cash or put it toward a build.");
  const [type, setType] = useState<PartType>("gpu");
  const models = priceList.filter((p) => p.type === type);
  const [model, setModel] = useState(models.find((m) => m.name === "RTX 3070")?.name ?? models[0]?.name ?? "");
  const [cond, setCond] = useState<string>("good");
  const [picked, setPicked] = useState<string[]>(["box"]);
  const [payout, setPayout] = useState<"cash" | "credit">("credit");
  const [form, setForm] = useState<FormConfig | null>(null);
  // The price stays hidden until they ask for it: locked → checking (a short build-up) → shown
  const [stage, setStage] = useState<"locked" | "checking" | "shown">("locked");
  const [line, setLine] = useState(0);
  const reveal = () => {
    if (stage !== "locked") return;
    setStage("checking");
    setLine(0);
    CHECKING.forEach((_, i) => i && setTimeout(() => setLine(i), i * 650));
    setTimeout(() => setStage("shown"), CHECKING.length * 650 + 250);
  };
  const shown = stage === "shown";
  const [details, setDetails] = useState<Record<string, unknown>>({});

  const est = useMemo(() => {
    const item = priceList.find((p) => p.name === model);
    const c = conditions.find((x) => x.id === cond);
    if (!item || !c) return null;
    const bonus = 1 + extras.filter((e) => picked.includes(e.id)).reduce((s, e) => s + e.bonus, 0);
    const base = item.sold * tradeInRate;
    const lo = base * c.low * bonus, hi = base * c.high * bonus;
    return { cash: [round5(lo), round5(hi)], credit: [round5(lo * (1 + creditBonus)), round5(hi * (1 + creditBonus))] };
  }, [model, cond, picked]);

  const openOffer = (negotiate = false) => {
    const c = conditions.find((x) => x.id === cond)!;
    const typeLabel = partTypes.find((t) => t.id === type)!.label;
    const ex = extras.filter((e) => picked.includes(e.id)).map((e) => e.label);
    const range = est ? `Cash $${est.cash[0]}–$${est.cash[1]} · Credit $${est.credit[0]}–$${est.credit[1]}` : "Not on the list, price by hand";
    const summary = `${typeLabel}: ${model || "not listed"} · ${c.label}${ex.length ? ` · ${ex.join(", ")}` : ""} · ${range}`;
    setDetails({ part_type: typeLabel, model, condition: c.label, extras: ex, estimate_cash: est?.cash ?? null, estimate_credit: est?.credit ?? null });
    setForm(tradeInForm(summary, payout === "credit" ? "Trade-in credit" : "Cash or Zelle", !model, negotiate));
  };

  const pickType = (t: PartType) => { setType(t); setModel(priceList.find((p) => p.type === t)?.name ?? ""); };

  return (
    <>
      <PageHero tag="Trade-ins welcome" title={<>Sell or trade your <span className="grad-text">old parts.</span></>}
        actions={<>
          <button type="button" onClick={() => scrollToId("estimate")} className="btn">Get an estimate <Icon name="arrow" className="h-4 w-4" /></button>
          <Link to="/shop" className="btn btn-ghost">See the shop</Link>
        </>}>
        Upgrading? Got an old graphics card in a drawer? Get a price in seconds, then take cash or put it toward a new build or repair for {Math.round(creditBonus * 100)}% more.
      </PageHero>

      <section id="estimate" className="section scroll-mt-20 !pt-6">
        <div className="wrap grid items-start gap-6 lg:grid-cols-[1.35fr_1fr]">
          {/* Left: what are you trading in */}
          <div className="card p-6 sm:p-8">
            <p className="eyebrow mb-2">Step 1</p>
            <h2 className="text-2xl">What are you trading in?</h2>
            <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(6.6rem,1fr))] gap-2">
              {partTypes.map((t) => (
                <button key={t.id} type="button" onClick={() => pickType(t.id)} aria-pressed={type === t.id}
                  className={`flex cursor-pointer flex-col items-center gap-2 rounded-[.9rem] border px-2 py-3 text-[.82rem] transition-colors ${type === t.id ? "border-accent bg-accent/10 text-ink" : "border-line text-muted hover:border-accent/50 hover:text-ink"}`}>
                  <Icon name={t.icon} className="h-6 w-6" />{t.label}
                </button>
              ))}
            </div>

            <label className="mt-6 block text-[.9rem] text-muted" htmlFor="ti-model">Model</label>
            <select id="ti-model" className="input mt-2" value={model} onChange={(e) => setModel(e.target.value)}>
              {[...new Set(models.map((m) => m.group))].map((grp) => (
                <optgroup key={grp} label={grp}>
                  {models.filter((m) => m.group === grp).map((m) => <option key={m.name}>{m.name}</option>)}
                </optgroup>
              ))}
              <option value="">Not listed, I'll type it</option>
            </select>
            <p className="mt-2 text-[.8rem] text-muted">Not on the list? Pick "Not listed" and I'll price it by hand.</p>

            <p className="eyebrow mb-2 mt-8">Step 2</p>
            <h2 className="text-2xl">What shape is it in?</h2>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {conditions.map((c) => (
                <button key={c.id} type="button" onClick={() => setCond(c.id)} aria-pressed={cond === c.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-[.9rem] border px-4 py-3 text-left transition-colors ${cond === c.id ? "border-accent bg-accent/10" : "border-line hover:border-accent/50"}`}>
                  <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${cond === c.id ? "border-accent" : "border-muted"}`}>
                    {cond === c.id && <span className="h-2 w-2 rounded-full bg-accent" />}
                  </span>
                  <span><b className="block text-[.95rem] font-medium text-ink">{c.label}</b><small className="text-[.8rem] text-muted">{c.note}</small></span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {extras.map((e) => {
                const on = picked.includes(e.id);
                return (
                  <button key={e.id} type="button" aria-pressed={on} onClick={() => setPicked(on ? picked.filter((x) => x !== e.id) : [...picked, e.id])}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-[.85rem] transition-colors ${on ? "border-accent bg-accent/10 text-ink" : "border-line text-muted hover:text-ink"}`}>
                    {on && <Icon name="check" className="h-3.5 w-3.5 text-accent" />}{e.label} <span className="font-mono text-[.75rem] text-accent">+{Math.round(e.bonus * 100)}%</span>
                  </button>
                );
              })}
            </div>

            <p className="mt-8 flex gap-2 rounded-[.9rem] border border-dashed border-line px-4 py-4 text-[.88rem] text-muted">
              <Icon name="video" className="mt-[1px] h-5 w-5 shrink-0 text-accent" />
              Have photos? Send them when I reply. They help me give a firmer offer faster.
            </p>
          </div>

          {/* Right: the live estimate */}
          <div id="offer" className="scroll-mt-24 lg:sticky lg:top-24">
            <div className="card border-accent/40 p-6 sm:p-8">
              <p className="eyebrow">Your estimate</p>
              <p className="mt-1 text-[.9rem] text-muted">{model || "Your part"} · {conditions.find((c) => c.id === cond)?.label}</p>

              {stage === "locked" && (
                <div className="mt-5">
                  <p aria-hidden className="select-none font-heading text-[clamp(2.4rem,5vw,3.2rem)] leading-none tracking-tight text-muted/60 blur-[6px]">$???–$???</p>
                  <p className="mt-3 text-[.92rem] text-muted">Pick your part and its condition, then see what it's worth.</p>
                  <button type="button" onClick={reveal} className="btn mt-5 w-full">Get my estimate <Icon name="arrow" className="h-4 w-4" /></button>
                </div>
              )}

              {stage === "checking" && (
                <div className="mt-5" role="status" aria-live="polite">
                  <p className="font-heading text-[clamp(2.4rem,5vw,3.2rem)] leading-none tracking-tight text-muted/60"><span className="ti-shuffle">$???–$???</span></p>
                  <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-line"><div className="ti-bar h-full rounded-full bg-accent" style={{ animationDuration: `${CHECKING.length * 650 + 250}ms` }} /></div>
                  <p key={line} className="ti-line mt-3 font-mono text-[.8rem] text-accent2">{CHECKING[line]}</p>
                </div>
              )}

              {shown && (
                <div className="ti-pop">
                  <Price est={est} payout={payout} />
                  <p className="mt-2 text-[.85rem] text-muted">{payout === "credit" ? "In credit toward a build, repair or shop item" : "Cash or Zelle"}</p>

                  <div className="mt-6 grid grid-cols-2 gap-2">
                    {(["cash", "credit"] as const).map((p) => (
                      <button key={p} type="button" onClick={() => setPayout(p)} aria-pressed={payout === p}
                        className={`relative cursor-pointer rounded-[.9rem] border p-4 text-left transition-colors ${payout === p ? "border-accent bg-accent/10" : "border-line hover:border-accent/50"}`}>
                        {p === "credit" && <span className="absolute -top-2.5 right-3 rounded-full bg-accent2 px-2 py-0.5 font-mono text-[.62rem] font-semibold uppercase tracking-wider text-bg">+{Math.round(creditBonus * 100)}%</span>}
                        <b className="block text-[.95rem] font-medium">{p === "cash" ? "Cash" : "Trade-in credit"}</b>
                        <span className="font-mono text-[.85rem] text-accent">{est ? `$${est[p][0]}–$${est[p][1]}` : "—"}</span>
                      </button>
                    ))}
                  </div>

                  <button type="button" onClick={() => openOffer()} className="btn mt-6 w-full">Send for a firm offer <Icon name="arrow" className="h-4 w-4" /></button>
                  <p className="mt-3 text-center text-[.8rem] text-muted">
                    Think my price is wrong?{" "}
                    <button type="button" onClick={() => openOffer(true)} className="text-accent2 underline underline-offset-2 hover:text-ink">Message me to negotiate</button>
                  </p>
                </div>
              )}
              <ul className="mt-5 space-y-2 text-[.82rem] text-muted">
                <li className="flex gap-2"><Icon name="clock" className="mt-[2px] h-4 w-4 shrink-0 text-accent2" />Prices checked against recent sold listings · updated {tradeInUpdated}</li>
                <li className="flex gap-2"><Icon name="shield-check" className="mt-[2px] h-4 w-4 shrink-0 text-accent2" />Final offer after I test it in person. No pressure to sell.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="wrap">
          <SectionHead eyebrow="How it works" title="Three steps, no haggling" />
          <div className="grid gap-5 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="card p-7">
                <div className="flex items-center justify-between"><IconTile name={s.icon} /><span className="font-mono text-[.8rem] text-accent2">0{i + 1}</span></div>
                <h3 className="mb-2 mt-5 text-xl">{s.title}</h3>
                <p className="text-[.95rem] text-muted">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap grid gap-5 md:grid-cols-2">
          <div className="card p-7">
            <p className="eyebrow mb-3">I'll take</p>
            <ul className="space-y-3 text-[.95rem]">{takes.map((t) => <li key={t} className="flex gap-3"><Icon name="check" className="mt-[3px] h-4 w-4 shrink-0 text-accent" />{t}</li>)}</ul>
          </div>
          <div className="card p-7">
            <p className="eyebrow mb-3">I'll pass on</p>
            <ul className="space-y-3 text-[.95rem] text-muted">{skips.map((t) => <li key={t} className="flex gap-3"><span className="mt-[2px] w-4 shrink-0 text-center text-danger">×</span>{t}</li>)}</ul>
          </div>
        </div>
      </section>
      <FormDialog config={form} onClose={() => setForm(null)} onSubmit={(v) => submitTradeIn(form!, v, details)} />

      {/* Phone: a bar at the bottom that asks for the estimate, then keeps it in view */}
      {stage !== "checking" && (shown ? est : true) && createPortal(
        <button type="button" onClick={() => { scrollToId("offer"); reveal(); }}
          className="fixed inset-x-3 bottom-3 z-20 flex items-center justify-between rounded-full border border-accent/40 bg-bg/90 py-2 pl-5 pr-2 text-left shadow-[0_14px_44px_-14px_rgba(0,0,0,.9)] backdrop-blur-xl lg:hidden">
          {shown && est
            ? <span><small className="block font-mono text-[.62rem] uppercase tracking-wider text-accent2">Estimate · {payout === "credit" ? "credit" : "cash"}</small><b className="font-heading text-lg text-ink">${est[payout][0]}–${est[payout][1]}</b></span>
            : <span><small className="block font-mono text-[.62rem] uppercase tracking-wider text-accent2">Your estimate</small><b className="font-heading text-lg text-muted blur-[4px]">$???–$???</b></span>}
          <span className="btn !px-4 !py-2 !text-[.85rem]">{shown ? "See offer" : "Get my estimate"} <Icon name="arrow" className="h-3.5 w-3.5" /></span>
        </button>
      , document.body)}
    </>
  );
}

/** The big price, counting up when it first appears and when the choice changes. */
function Price({ est, payout }: { est: { cash: number[]; credit: number[] } | null; payout: "cash" | "credit" }) {
  const lo = useCountUp(est ? est[payout][0] : 0, !!est);
  const hi = useCountUp(est ? est[payout][1] : 0, !!est);
  return (
    <p className="mt-4 font-heading text-[clamp(2.4rem,5vw,3.2rem)] leading-none tracking-tight">
      {est ? <>${lo}<span className="text-muted">–</span>${hi}</> : <span className="text-muted">I'll price it</span>}
    </p>
  );
}

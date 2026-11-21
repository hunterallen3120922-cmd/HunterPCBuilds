import { useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";

/** DRAFT: three picture-based takes on the build request form. Not linked from the site. */

const ph = (f: string) => `${import.meta.env.BASE_URL}photos/build-${f}.jpg`;

const USES = [
  { v: "Gaming", icon: "gamepad", img: "rainbow-closeup", sub: "Fortnite, Valorant, AAA" },
  { v: "School & work", icon: "graduation", img: "blue-desk", sub: "Docs, browsing, Zoom" },
  { v: "Streaming", icon: "video", img: "purple-gtx-closeup", sub: "Play + stream at once" },
  { v: "Editing & 3D", icon: "monitor", img: "msi-rtx-closeup", sub: "Premiere, Blender, CAD" },
];
const LOOKS = [
  { v: "Stealth black", img: "black-hyxn", sub: "Dark, little or no lighting" },
  { v: "Clean white", img: "white-radeon", sub: "White case and parts" },
  { v: "One color glow", img: "blue-evga-rtx", sub: "All one color, e.g. blue or red" },
  { v: "Full RGB", img: "rgb-cube-gtx1660", sub: "Rainbow fans, the works" },
];
const SIZES = [
  { v: "Compact", img: "thermalright-mini", sub: "Fits a small desk or dorm" },
  { v: "Mid tower", img: "gtx-blue-shelf", sub: "Most popular, easy to upgrade" },
  { v: "Big showpiece", img: "black-msi-rgb", sub: "Room for big parts + fans" },
];
const BUDGETS = [
  { v: "$300 – $600", t: "Budget", sub: "1080p esports, school", n: 1 },
  { v: "$750 – $1,000", t: "Midrange", sub: "Smooth 1080p / 1440p", n: 2 },
  { v: "$1,000+", t: "High performance", sub: "High-refresh 1440p / 4K", n: 3 },
  { v: "Not sure yet", t: "Help me decide", sub: "We'll figure it out together", n: 0 },
];
const EXTRAS = ["Quiet", "Wi-Fi built in", "Easy to upgrade", "Water cooling", "Lots of storage", "Monitor & keyboard too"];

/** A big tappable photo card. */
function PhotoCard({ img, title, sub, on, onClick, icon, tall }: { img: string; title: string; sub?: string; on: boolean; onClick: () => void; icon?: string; tall?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className={`group relative overflow-hidden rounded-card border-2 text-left transition ${on ? "border-accent shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_20%,transparent)]" : "border-line hover:border-accent/50"}`}>
      <img src={ph(img)} alt="" loading="lazy" className={`w-full object-cover transition duration-500 group-hover:scale-[1.04] ${tall ? "aspect-[3/4]" : "aspect-[4/3]"}`} />
      <span className="absolute inset-0 bg-gradient-to-t from-[#05080c] via-[#05080c]/40 to-transparent" />
      {on && <span className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full bg-accent text-bg"><Icon name="check" className="h-4 w-4" /></span>}
      <span className="absolute inset-x-0 bottom-0 p-3.5">
        {icon && <Icon name={icon} className="mb-1 h-5 w-5 text-accent" />}
        <b className="block font-medium text-ink">{title}</b>
        {sub && <span className="block text-[.78rem] text-[#b9c3d0]">{sub}</span>}
      </span>
    </button>
  );
}

/** Little PC bars that grow with the budget tier. */
const TierArt = ({ n }: { n: number }) => (
  <span className="flex h-10 items-end gap-1">{[1, 2, 3].map((k) => <span key={k} className={`w-2.5 rounded-sm ${k <= n ? "bg-accent" : "bg-line"}`} style={{ height: `${k * 33}%` }} />)}</span>
);

function useAnswers() {
  const [uses, setUses] = useState<string[]>(["Gaming", "Streaming"]);
  const [look, setLook] = useState("Full RGB");
  const [size, setSize] = useState("Mid tower");
  const [budget, setBudget] = useState("$750 – $1,000");
  const [extras, setExtras] = useState<string[]>(["Quiet", "Wi-Fi built in"]);
  const toggle = (arr: string[], set: (a: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  return { uses, look, size, budget, extras, setLook, setSize, setBudget, tUse: (v: string) => toggle(uses, setUses, v), tExtra: (v: string) => toggle(extras, setExtras, v) };
}

// ---------------------------------------------------------------------------------------------------------------
// 1: Picture quiz with a "build ticket" that fills in beside it

const QUIZ = ["What's it for?", "Pick a look", "What size?", "Budget", "Extras"];

function Option1({ step: s0 }: { step: number }) {
  const a = useAnswers();
  const [step, setStep] = useState(s0);
  const filled = (i: number) => i < step;
  let body: ReactNode;
  if (step === 0) body = <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{USES.map((u) => <PhotoCard key={u.v} img={u.img} title={u.v} sub={u.sub} icon={u.icon} tall on={a.uses.includes(u.v)} onClick={() => a.tUse(u.v)} />)}</div>;
  else if (step === 1) body = <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{LOOKS.map((u) => <PhotoCard key={u.v} img={u.img} title={u.v} sub={u.sub} tall on={a.look === u.v} onClick={() => a.setLook(u.v)} />)}</div>;
  else if (step === 2) body = <div className="grid grid-cols-3 gap-3">{SIZES.map((u) => <PhotoCard key={u.v} img={u.img} title={u.v} sub={u.sub} tall on={a.size === u.v} onClick={() => a.setSize(u.v)} />)}</div>;
  else if (step === 3) body = (
    <div className="grid gap-3 sm:grid-cols-2">{BUDGETS.map((b) => (
      <button key={b.v} type="button" onClick={() => a.setBudget(b.v)} className={`flex items-center gap-4 rounded-card border-2 bg-bg2 p-4 text-left ${a.budget === b.v ? "border-accent bg-accent/[.07]" : "border-line"}`}>
        {b.n ? <TierArt n={b.n} /> : <Icon name="help" className="h-8 w-8 text-accent" />}
        <span><b className="block font-medium">{b.t}</b><span className="font-mono text-[.8rem] text-accent2">{b.v}</span><span className="block text-[.78rem] text-muted">{b.sub}</span></span>
      </button>))}
    </div>
  );
  else body = (
    <>
      <div className="mb-4 flex flex-wrap gap-2">{EXTRAS.map((x) => <button key={x} type="button" onClick={() => a.tExtra(x)} className={`rounded-full border px-3.5 py-2 text-[.88rem] ${a.extras.includes(x) ? "border-accent bg-accent/15 text-ink" : "border-line text-muted"}`}>{a.extras.includes(x) ? "✓ " : "+ "}{x}</button>)}</div>
      <textarea className="input min-h-24" placeholder="Games you play, must-have parts, anything else…" defaultValue="Mostly Valorant and Fortnite, want it to hit 240 fps" />
    </>
  );
  const rows: [string, ReactNode, string?][] = [
    ["For", a.uses.join(", "), USES.find((u) => u.v === a.uses[0])?.img],
    ["Look", a.look, LOOKS.find((l) => l.v === a.look)?.img],
    ["Size", a.size, SIZES.find((l) => l.v === a.size)?.img],
    ["Budget", a.budget],
    ["Extras", a.extras.join(", ")],
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_17rem]">
      <div className="card p-7 max-sm:p-5">
        <div className="mb-6 flex gap-2">{Array.from({ length: 8 }, (_, n) => <div key={n} className={`h-[5px] flex-1 rounded-card ${n <= step ? "bg-accent" : "bg-line"}`} />)}</div>
        <p className="eyebrow">Question {step + 1} of 5</p>
        <h3 className="mb-1 mt-1 text-[1.6rem]">{QUIZ[step]}</h3>
        <p className="mb-5 text-[.92rem] text-muted">{step === 0 ? "Tap all that apply." : step === 4 ? "Tap any that matter to you." : "Tap the one closest to what you want. These are builds I've done."}</p>
        {body}
        <div className="mt-6 flex justify-between"><button type="button" className={`btn btn-ghost ${step ? "" : "invisible"}`} onClick={() => setStep(step - 1)}>Back</button><button type="button" className="btn" onClick={() => setStep(Math.min(4, step + 1))}>Next <Icon name="arrow" className="h-4 w-4" /></button></div>
      </div>
      {/* the build ticket */}
      <aside className="card h-fit p-5 lg:sticky lg:top-24">
        <p className="eyebrow">Your build so far</p>
        <ul className="mt-3 space-y-2.5">
          {rows.map(([k, v, img], i) => (
            <li key={k} className={`flex items-center gap-3 rounded-lg border p-2 transition ${filled(i) ? "border-line bg-bg2" : "border-dashed border-line/70 opacity-45"}`}>
              {img && filled(i) ? <img src={ph(img)} alt="" className="h-10 w-10 rounded-md object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-md border border-dashed border-line font-mono text-[.7rem] text-muted">{i + 1}</span>}
              <span className="min-w-0 text-[.82rem]"><span className="block text-muted">{k}</span><span className="block truncate">{filled(i) ? v : "…"}</span></span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[.78rem] text-muted">Next: when to meet and how to reach you. No payment now.</p>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// 2: Moodboard. Heart the builds you like; the form reads your taste from them.

const BOARD = [
  ["black-msi-rgb", ["RGB fans", "Black case", "Glass"]], ["white-radeon", ["White parts", "Water cooling", "Clean look"]], ["red-aio-closeup", ["Red lighting", "Water cooling"]],
  ["thermalright-mini", ["Compact", "Subtle lighting"]], ["rgb-cube-gtx1660", ["RGB fans", "Cube case", "Glass"]], ["blue-evga-rtx", ["Blue lighting", "Glass", "Black case"]],
  ["black-hyxn", ["Black case", "No RGB"]], ["purple-shelf", ["Purple lighting", "Compact"]], ["rainbow-closeup", ["RGB fans"]],
  ["red-zalman", ["Red lighting", "Cube case"]], ["gtx-blue-shelf", ["Compact", "Black case"]], ["msi-rtx-closeup", ["RGB fans", "Big graphics card"]],
] as const;

function Option2() {
  const [liked, setLiked] = useState<string[]>(["black-msi-rgb", "rgb-cube-gtx1660", "blue-evga-rtx"]);
  const a = useAnswers();
  const tags = new Map<string, number>();
  BOARD.filter(([f]) => liked.includes(f)).forEach(([, t]) => t.forEach((x) => tags.set(x, (tags.get(x) ?? 0) + 1)));
  const top = [...tags.entries()].sort((x, y) => y[1] - x[1]);
  return (
    <div className="card p-7 max-sm:p-5">
      <div className="mb-6 flex gap-2">{Array.from({ length: 5 }, (_, n) => <div key={n} className={`h-[5px] flex-1 rounded-card ${n <= 0 ? "bg-accent" : "bg-line"}`} />)}</div>
      <div className="grid gap-7 lg:grid-cols-[1fr_16rem]">
        <div>
          <h3 className="mb-1 text-[1.6rem]">Tap the builds you like</h3>
          <p className="mb-5 text-[.92rem] text-muted">All builds I've done. Heart as many as you want and I'll match the style.</p>
          <div className="columns-2 gap-3 sm:columns-4 [&>*]:mb-3">
            {BOARD.map(([f], i) => {
              const on = liked.includes(f);
              return (
                <button key={f} type="button" onClick={() => setLiked(on ? liked.filter((x) => x !== f) : [...liked, f])}
                  className={`relative block w-full break-inside-avoid overflow-hidden rounded-card border-2 ${on ? "border-accent" : "border-transparent"}`}>
                  <img src={ph(f)} alt="" loading="lazy" className={`w-full object-cover ${i % 3 === 0 ? "aspect-[3/4]" : "aspect-square"} ${on ? "" : "opacity-80"}`} />
                  <span className={`absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full text-[1rem] backdrop-blur ${on ? "bg-accent text-bg" : "bg-black/50 text-white"}`}>{on ? "♥" : "♡"}</span>
                </button>
              );
            })}
          </div>
        </div>
        <aside className="h-fit space-y-5 lg:sticky lg:top-24">
          <div className="rounded-card border border-line bg-bg2 p-4">
            <p className="eyebrow">Your style</p>
            <p className="mt-1 text-[.82rem] text-muted">{liked.length} liked. Here's what I'm picking up:</p>
            <div className="mt-3 flex flex-wrap gap-1.5">{top.map(([t, n]) => <span key={t} className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-[.78rem]" style={{ opacity: 0.55 + 0.15 * n }}>{t}{n > 1 && <span className="ml-1 font-mono text-accent">×{n}</span>}</span>)}</div>
            <div className="mt-3 flex -space-x-2">{liked.map((f) => <img key={f} src={ph(f)} alt="" className="h-9 w-9 rounded-full border-2 border-bg2 object-cover" />)}</div>
          </div>
          <div>
            <p className="mb-2 text-[.9rem] font-medium">And it's mostly for…</p>
            <div className="grid grid-cols-2 gap-2">{USES.map((u) => <button key={u.v} type="button" onClick={() => a.tUse(u.v)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[.82rem] ${a.uses.includes(u.v) ? "border-accent bg-accent/10" : "border-line text-muted"}`}><Icon name={u.icon} className="h-4 w-4 text-accent" />{u.v}</button>)}</div>
          </div>
          <button type="button" className="btn w-full justify-center">Next: budget <Icon name="arrow" className="h-4 w-4" /></button>
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// 3: Chat with Hunter. Questions arrive as messages; you answer by tapping pictures.

function Bubble({ me, children }: { me?: boolean; children: ReactNode }) {
  return (
    <div className={`flex items-end gap-2 ${me ? "justify-end" : ""}`}>
      {!me && <img src={`${import.meta.env.BASE_URL}logo-512.png`} alt="" className="h-8 w-8 rounded-full border border-line" />}
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[.92rem] ${me ? "rounded-br-sm bg-accent text-bg" : "rounded-bl-sm border border-line bg-bg2"}`}>{children}</div>
    </div>
  );
}

function Option3() {
  const [look, setLook] = useState<string | null>(null);
  return (
    <div className="card mx-auto max-w-[44rem] overflow-hidden p-0">
      <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
        <span className="relative"><img src={`${import.meta.env.BASE_URL}logo-512.png`} alt="" className="h-10 w-10 rounded-full border border-line" /><span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-accent" /></span>
        <span><b className="block font-medium">Plan your build with Hunter</b><span className="text-[.78rem] text-muted">Usually replies within a day</span></span>
        <span className="ml-auto font-mono text-[.72rem] text-muted">2 of 6</span>
      </div>
      <div className="space-y-3 bg-[radial-gradient(70%_60%_at_50%_0%,color-mix(in_srgb,var(--accent)_6%,transparent),transparent)] px-5 py-5">
        <Bubble>Hey! I'm Hunter 👋 I'll ask a few quick questions so I can plan the right parts. What's the PC mostly for?</Bubble>
        <Bubble me><span className="flex items-center gap-2"><img src={ph("rainbow-closeup")} alt="" className="h-7 w-7 rounded-md object-cover" />Gaming + streaming</span></Bubble>
        <Bubble>Nice. Which of these is closest to the look you want? These are all builds I've done.</Bubble>
        <div className="ml-10 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {LOOKS.map((l) => <PhotoCard key={l.v} img={l.img} title={l.v} tall on={look === l.v} onClick={() => setLook(l.v)} />)}
        </div>
        {look ? <Bubble me>{look}</Bubble> : (
          <div className="ml-10 flex w-fit gap-1 rounded-full border border-line bg-bg2 px-3 py-2.5">{[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted" style={{ animationDelay: `${i * 0.2}s` }} />)}</div>
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-line px-4 py-3">
        <input className="input !py-2 !text-[.9rem]" placeholder="Or type your own answer…" />
        <button type="button" className="btn !px-4"><Icon name="arrow" className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

export default function RequestLab() {
  const [q] = useSearchParams();
  const c = q.get("c") ?? "1";
  return (
    <section className="section !pt-28">
      <div className="wrap max-w-[66rem]">
        {c === "1" && <Option1 step={Number(q.get("s") ?? 1)} />}
        {c === "2" && <Option2 />}
        {c === "3" && <Option3 />}
        {c === "now" && <p>current</p>}
      </div>
    </section>
  );
}

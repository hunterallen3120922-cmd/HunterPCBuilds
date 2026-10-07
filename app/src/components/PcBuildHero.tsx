import AnimatedHero, { type Part } from "./AnimatedHero";
import BuildScene from "./BuildScene";
import Icon from "./Icon";

/**
 * The timeline, as [start, end] fractions of the duration. The case appears, the parts float around it, then they all
 * fly in together ("in" = they speed up and land with a thud), the PC bounces from the impact, and it powers on.
 */
const LAND = 0.5; // when the parts hit the case
const FLY: Part = [0.22, LAND, "in"];
const PARTS: Record<string, Part> = {
  case: [0.0, 0.14],
  board: FLY, psu: FLY, cooler: FLY, ram: FLY, topfans: FLY, gpu: FLY, front: FLY,
  glass: [0.56, 0.7],
  power: [0.62, 0.86],
};

/**
 * The PC's bounce after the parts land, as --bounce (pixels down; negative is up) and --squash (1 = normal height).
 * A short dip from the impact, then it springs up and settles with a smaller rebound.
 */
function bounce(p: number) {
  const t = Math.min(1, Math.max(0, (p - LAND) / 0.32));
  if (t === 0 || t === 1) return { "--bounce": 0, "--squash": 1 };
  if (t < 0.12) { const d = Math.sin((Math.PI * t) / 0.12); return { "--bounce": 9 * d, "--squash": 1 - 0.035 * d }; }
  const u = (t - 0.12) / 0.88;
  const y = -30 * Math.sin(2.5 * Math.PI * u) * Math.pow(1 - u, 1.6);
  return { "--bounce": y, "--squash": 1 - y * 0.0007 };
}

/**
 * The PC builds page opening: a PC builds itself (see BuildScene), then the page text fades in beside it and the
 * fans keep turning. How long it takes is `duration` below, in milliseconds.
 */
export default function PcBuildHero() {
  return (
    <AnimatedHero scene={<BuildScene />} parts={PARTS} extra={bounce} duration={3000} spinAt={0.62}
      doneMobileClass="max-lg:group-data-[phase=done]:bottom-[27rem]">
      {/* The brand name, large. It fades in with the rest of the text once the PC is built. */}
      <p className="mb-6 font-heading text-[clamp(2.4rem,5.2vw,3.4rem)] font-medium leading-none tracking-tight text-ink lg:text-[clamp(2.2rem,3.6vw,3.2rem)]">
        Hunter<span className="text-accent">PC</span>Builder
      </p>
      <p className="eyebrow mb-5 flex items-center gap-2"><span className="h-px w-6 bg-accent2" aria-hidden />Custom PC builds</p>
      <h1 className="text-[clamp(2.4rem,5.6vw,4.2rem)] lg:text-[clamp(2rem,3.5vw,3.6rem)]">
        A PC built <em className="grad-text">for your budget.</em>
      </h1>
      <p className="my-6 max-w-[54ch] text-[1.1rem] text-muted">
        Tell me your budget and what you'll use it for. I plan the parts, build it, test it and hand it over ready to go.
      </p>
      <button type="button" className="btn" onClick={() => document.getElementById("request")?.scrollIntoView()}>
        Start a build request <Icon name="arrow" className="h-4 w-4" />
      </button>
    </AnimatedHero>
  );
}

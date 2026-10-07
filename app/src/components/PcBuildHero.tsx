import AnimatedHero from "./AnimatedHero";
import BuildScene from "./BuildScene";
import Icon from "./Icon";

/** When each floating part flies into the PC, as [start, end] fractions of the duration (before that they float around it). */
const PARTS: Record<string, [number, number]> = {
  case: [0.0, 0.12],
  board: [0.16, 0.34],
  psu: [0.2, 0.36],
  cooler: [0.3, 0.46],
  ram: [0.36, 0.5],
  topfans: [0.4, 0.54],
  gpu: [0.44, 0.6],
  front: [0.5, 0.66],
  glass: [0.64, 0.74],
  power: [0.72, 0.9],
};

/**
 * The PC builds page opening: a PC builds itself (see BuildScene), then the page text fades in beside it and the
 * fans keep turning. How long it takes is `duration` below, in milliseconds.
 */
export default function PcBuildHero() {
  return (
    <AnimatedHero scene={<BuildScene />} parts={PARTS} duration={3200} spinAt={0.68}
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

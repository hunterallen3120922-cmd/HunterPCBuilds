import AnimatedHero from "./AnimatedHero";
import RepairScene from "./RepairScene";
import Icon from "./Icon";

/** When each piece of the repair happens, as [start, end] fractions of the duration. */
const PARTS: Record<string, [number, number]> = {
  laptop: [0.0, 0.1],
  scan: [0.1, 0.3],
  scanend: [0.3, 0.34],
  tag1: [0.12, 0.18],
  tag2: [0.16, 0.22],
  tag3: [0.2, 0.26],
  tag4: [0.24, 0.3],
  screen: [0.3, 0.38],
  oldfan: [0.34, 0.44],
  newfan: [0.4, 0.5],
  oldssd: [0.44, 0.54],
  newssd: [0.5, 0.6],
  oldbatt: [0.54, 0.64],
  newbatt: [0.6, 0.7],
  clean: [0.62, 0.7],
  boot: [0.7, 0.75],
  load: [0.73, 0.82],
  ready: [0.82, 0.9],
};
/**
 * The Tech Repair page opening: a broken laptop gets diagnosed and repaired (see RepairScene), then the page text
 * fades in beside it. How long it takes is `duration` below, in milliseconds.
 */
export default function RepairHero() {
  return (
    <AnimatedHero scene={<RepairScene />} parts={PARTS} duration={2800}
      doneMobileClass="max-lg:group-data-[phase=done]:bottom-[23rem]">
      <p className="eyebrow mb-5 flex items-center gap-2"><span className="h-px w-6 bg-accent2" aria-hidden />Tech repair</p>
      <h1 className="text-[clamp(2.4rem,5.6vw,4.2rem)] lg:text-[clamp(2rem,3.5vw,3.6rem)]">
        Slow, broken or overheating? <em className="grad-text">Let's fix it.</em>
      </h1>
      <p className="my-6 max-w-[54ch] text-[1.1rem] text-muted">
        Repairs and upgrades with a firm quote before I start. Simple fixes often happen same-day.
      </p>
      <button type="button" className="btn" onClick={() => document.getElementById("request")?.scrollIntoView()}>
        Start a repair request <Icon name="arrow" className="h-4 w-4" />
      </button>
    </AnimatedHero>
  );
}

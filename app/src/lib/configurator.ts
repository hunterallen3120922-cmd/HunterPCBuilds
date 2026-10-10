import { BUILDER_MAX, customParts, type Part } from "../content/customParts";

export type Category = keyof typeof customParts;
/** One chosen option (by position in its list) per category. */
export type Pick = Record<Category, number>;

export const CATEGORIES: { key: Category; label: string }[] = [
  { key: "gpu", label: "Graphics card" },
  { key: "cpu", label: "CPU, motherboard & RAM" },
  { key: "storage", label: "Storage" },
  { key: "psu", label: "Power supply" },
  { key: "case", label: "Case" },
  { key: "cooling", label: "Cooling" },
];

export const partOf = (pick: Pick, key: Category): Part => customParts[key][pick[key]];
export const totalOf = (pick: Pick) => CATEGORIES.reduce((sum, c) => sum + partOf(pick, c.key).price, 0);
/** Is the power supply big enough for the graphics card? */
export const powerOk = (pick: Pick) => (partOf(pick, "psu").watts ?? 0) >= (partOf(pick, "gpu").needsWatts ?? 0);
/** The smallest power supply that suits this graphics card. */
export const minPsuFor = (gpu: number) => customParts.psu.findIndex((p) => (p.watts ?? 0) >= (customParts.gpu[gpu].needsWatts ?? 0));

/**
 * Which CPU options pair well with each graphics card (by position in the lists), so a build is never a
 * top graphics card with a weak CPU or the other way round. If you add or reorder parts, update this.
 */
const CPUS_FOR_GPU: number[][] = [[0, 1], [0, 1, 2], [1, 2], [2, 3], [2, 3]];
/** How much each storage option counts when spending leftover money (the 4.5 TB option only wins at the very top). */
const STORAGE_VALUE = [0, 1, 2, 3, 3.1];
const cpusFor = (g: number) => CPUS_FOR_GPU[g] ?? customParts.cpu.map((_, i) => i);

/**
 * The best balanced build whose parts fit within `budget` (the top of the slider means no limit).
 * Money goes first to the graphics card, then the CPU, then storage, then cooling/case/power supply extras.
 */
export function recommend(budget: number): Pick {
  const unlimited = budget >= BUILDER_MAX;
  const idx = (list: Part[]) => list.map((p, i) => ({ p, i })).filter(({ p }) => p.auto !== false).map(({ i }) => i);
  let best: { pick: Pick; score: number; cost: number } | null = null;
  for (const gpu of idx(customParts.gpu))
    for (const cpu of cpusFor(gpu))
      for (const storage of idx(customParts.storage))
        for (const psu of idx(customParts.psu))
          for (const kase of idx(customParts.case))
            for (const cooling of idx(customParts.cooling)) {
              const pick: Pick = { gpu, cpu, storage, psu, case: kase, cooling };
              if (!powerOk(pick)) continue;
              const cost = totalOf(pick);
              if (!unlimited && cost > budget) continue;
              const score = 100 * gpu + 70 * cpu + 12 * STORAGE_VALUE[storage] + 10 * cooling + 8 * kase + 2 * (psu - minPsuFor(gpu));
              if (!best || score > best.score || (score === best.score && cost < best.cost)) best = { pick, score, cost };
            }
  // Below the cheapest possible build: just use the cheapest parts
  return best?.pick ?? { gpu: 0, cpu: 0, storage: 0, psu: minPsuFor(0), case: 0, cooling: 0 };
}

/** "$1,850" */
export const dollars = (n: number) => `$${n.toLocaleString("en-US")}`;

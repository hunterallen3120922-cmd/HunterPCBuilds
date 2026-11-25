export default function SectionHead({ title, sub, eyebrow, center = false }: { title: string; sub?: string; eyebrow?: string; center?: boolean }) {
  return (
    <div data-reveal-group="blur" className={`mb-12 ${center ? "text-center" : ""}`}>
      {eyebrow && <p className={`eyebrow flow-node mb-4 flex items-center gap-3 ${center ? "justify-center" : ""}`}><span className="h-px w-7 bg-accent2/60" aria-hidden />{eyebrow}{center && <span className="h-px w-7 bg-accent2/60" aria-hidden />}</p>}
      <h2 className="text-[clamp(2rem,4.2vw,3.1rem)]">{title}</h2>
      {sub && <p className={`mt-4 max-w-[56ch] text-[1.05rem] text-muted ${center ? "mx-auto" : ""}`}>{sub}</p>}
    </div>
  );
}

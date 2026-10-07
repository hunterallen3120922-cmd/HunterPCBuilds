export default function SectionHead({ title, sub, eyebrow, center = false }: { title: string; sub?: string; eyebrow?: string; center?: boolean }) {
  return (
    <div data-reveal-group="blur" className={`mb-10 ${center ? "text-center" : ""}`}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className="text-[clamp(1.8rem,3.6vw,2.6rem)]">{title}</h2>
      {sub && <p className={`mt-3 max-w-[56ch] text-muted ${center ? "mx-auto" : ""}`}>{sub}</p>}
    </div>
  );
}

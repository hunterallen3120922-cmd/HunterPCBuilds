export default function SectionHead({ title, sub, center = false }: { title: string; sub?: string; center?: boolean }) {
  return (
    <div className={`mb-9 ${center ? "text-center" : ""}`}>
      <h2 className="text-[clamp(1.7rem,3.5vw,2.3rem)] font-bold">{title}</h2>
      {sub && <p className="mt-2 text-muted">{sub}</p>}
    </div>
  );
}

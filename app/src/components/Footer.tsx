import { Link } from "react-router-dom";
import { site } from "../content/site";

export default function Footer() {
  const socials = Object.entries(site.social).filter(([, url]) => url);
  const col = "text-[.9rem] text-muted no-underline hover:text-ink";
  return (
    <footer className="border-t border-line bg-bg2 pt-14 text-[.9rem] text-muted">
      <div className="wrap grid gap-10 pb-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt={`${site.name} logo`} width={112} height={112} className="h-28 w-28" loading="lazy" />
          <p className="mt-4 max-w-[34ch]">{site.tagline}.</p>
        </div>
        <div>
          <p className="eyebrow mb-4">Explore</p>
          <ul className="space-y-2">
            <li><Link to="/pc-builds" className={col}>PC Builds</Link></li>
            <li><Link to="/tech-repair" className={col}>Tech Repair</Link></li>
            <li><Link to="/faq" className={col}>FAQ & Terms</Link></li>
            <li><Link to="/privacy" className={col}>Privacy</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">Details</p>
          <ul className="space-y-2">
            {site.serviceArea && <li>{site.serviceArea}</li>}
            <li>Pay by {site.paymentMethods.join(" or ")}</li>
            {socials.map(([name, url]) => (
              <li key={name}><a href={url} className={`${col} capitalize`} rel="noopener noreferrer" target="_blank">{name}</a></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-5">
        <div className="wrap flex flex-wrap justify-between gap-3 text-[.82rem]">
          <span>{site.name}</span>
          <span>{site.footerDisclaimer}</span>
        </div>
      </div>
    </footer>
  );
}

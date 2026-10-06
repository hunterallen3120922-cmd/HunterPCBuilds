import { Link } from "react-router-dom";
import { Logo } from "./Nav";
import { site } from "../content/site";

export default function Footer() {
  const socials = Object.entries(site.social).filter(([, url]) => url);
  const col = "text-[.9rem] text-muted no-underline hover:text-ink";
  return (
    <footer className="border-t border-line bg-bg2 pt-14 text-[.9rem] text-muted">
      <div className="wrap grid gap-10 pb-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-[34ch]">{site.tagline}.</p>
        </div>
        <div>
          <p className="eyebrow mb-4">Explore</p>
          <ul className="space-y-2">
            <li><Link to="/pc-builds" className={col}>PC Builds</Link></li>
            <li><Link to="/tech-repair" className={col}>Tech Repair</Link></li>
            <li><Link to="/faq" className={col}>FAQ & Terms</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">Details</p>
          <ul className="space-y-2">
            <li>{site.serviceArea}</li>
            <li>Pay by {site.paymentMethods.join(", ")}</li>
            {socials.map(([name, url]) => (
              <li key={name}><a href={url} className={`${col} capitalize`} rel="noopener noreferrer" target="_blank">{name}</a></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-5">
        <div className="wrap flex flex-wrap justify-between gap-3 text-[.82rem]">
          <span>© {new Date().getFullYear()} {site.fullName}</span>
          <span>{site.footerDisclaimer}</span>
        </div>
      </div>
    </footer>
  );
}

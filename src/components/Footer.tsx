import { site } from "../content/site";

export default function Footer() {
  const socials = Object.entries(site.social).filter(([, url]) => url);
  return (
    <footer className="border-t border-line py-9 text-[.85rem] text-muted">
      <div className="wrap flex flex-wrap justify-between gap-3">
        <span>© {new Date().getFullYear()} {site.fullName} · York, PA</span>
        {socials.length > 0 && (
          <span className="flex gap-4">
            {socials.map(([name, url]) => <a key={name} href={url} className="capitalize" rel="noopener noreferrer" target="_blank">{name}</a>)}
          </span>
        )}
        <span>{site.footerDisclaimer}</span>
      </div>
    </footer>
  );
}

import { Link } from "react-router-dom";
import Icon from "./Icon";
import { site } from "../content/site";

/** The big, minimal opening of the home page. */
export default function HomeHero() {
  return (
    <header className="relative isolate flex min-h-[calc(100svh-4rem)] items-center overflow-hidden border-b border-line">
      <div className="hero-grid pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <div className="orb pointer-events-none absolute -left-24 top-[10%] -z-10 h-[420px] w-[420px] rounded-full bg-accent/[.09] blur-[100px]" aria-hidden />
      <div className="orb pointer-events-none absolute -right-24 bottom-[5%] -z-10 h-[360px] w-[360px] rounded-full bg-accent2/[.07] blur-[110px] [animation-delay:-8s]" aria-hidden />

      <div className="wrap py-12 text-center">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" width={132} height={132}
          className="floaty mx-auto mb-7 h-[104px] w-[104px] drop-shadow-[0_0_44px_rgba(62,207,154,.22)] sm:h-[120px] sm:w-[120px]" />
        <p className="eyebrow mb-6 flex items-center justify-center gap-3 !text-[.66rem] sm:!text-[.72rem]">
          <span className="hidden h-px w-8 bg-accent2/70 sm:block" aria-hidden />{site.localTag}<span className="hidden h-px w-8 bg-accent2/70 sm:block" aria-hidden />
        </p>
        <h1 className="text-[clamp(2.5rem,6.4vw,4.7rem)] leading-[1.06]">
          <span className="block text-balance">Busted laptop? Dream PC?</span>
          <em className="grad-text block text-balance">Let's fix it, or build it.</em>
        </h1>
        <p className="mx-auto mb-9 mt-6 max-w-[46ch] text-[1.1rem] text-muted">
          Repairs, upgrades and custom PC builds for the York area. Fair prices, explained in plain English.
        </p>
        <div className="mx-auto flex max-w-[300px] flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Link to="/pc-builds" className="btn !px-7 !py-3.5">Build me a PC <Icon name="arrow" className="h-4 w-4" /></Link>
          <Link to="/tech-repair" className="btn btn-ghost !px-7 !py-3.5">Fix my device</Link>
        </div>
      </div>
    </header>
  );
}

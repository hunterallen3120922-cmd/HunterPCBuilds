import { Suspense, lazy, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import ScrollMotion from "./components/ScrollMotion";
import Polish from "./components/Polish";
import Home from "./pages/Home";

/**
 * Every page but Home is its own small download, so the first visit only loads what it shows.
 * They are all fetched quietly in the background right after the first page settles, so moving
 * between pages stays instant.
 */
const pages = {
  PcBuilds: () => import("./pages/PcBuilds"),
  TechRepair: () => import("./pages/TechRepair"),
  Faq: () => import("./pages/Faq"),
  Privacy: () => import("./pages/Privacy"),
  About: () => import("./pages/About"),
  TradeIn: () => import("./pages/TradeIn"),
  Shop: () => import("./pages/Shop"),
  Prints: () => import("./pages/Prints"),
};
const PcBuilds = lazy(pages.PcBuilds);
const TechRepair = lazy(pages.TechRepair);
const Faq = lazy(pages.Faq);
const Privacy = lazy(pages.Privacy);
const About = lazy(pages.About);
const TradeIn = lazy(pages.TradeIn);
const Shop = lazy(pages.Shop);
const Prints = lazy(pages.Prints);

function PrefetchPages() {
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    const t = window.setTimeout(() => idle(() => { for (const load of Object.values(pages)) load().catch(() => {}); }), 2500);
    return () => clearTimeout(t);
  }, []);
  return null;
}


/** Scrolls to top on page change, or to an element id passed as router state. */
function ScrollManager() {
  const { pathname, state } = useLocation();
  useEffect(() => {
    const id = (state as { scrollTo?: string } | null)?.scrollTo;
    const el = id ? document.getElementById(id) : null;
    if (el) el.scrollIntoView();
    else window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname, state]);
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  // The admin portal lives on its own page (admin.html) so it can be installed as an app.
  // Old /#/admin links and bookmarks still land there.
  if (pathname === "/admin") {
    window.location.replace("./admin.html");
    return <p className="p-8 text-muted">Opening the admin portal…</p>;
  }
  return (
    <>
      <a href="#main" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-card focus:bg-accent focus:px-3 focus:py-2 focus:text-onaccent">
        Skip to content
      </a>
      <ScrollManager />
      <PrefetchPages />
      <ScrollMotion />
      <Polish />
      <Nav />
      {/* key = the page eases in again on every page change */}
      <main id="main" tabIndex={-1} key={pathname} className="page-in outline-none">
        {/* min-h keeps the footer from jumping up while a page's file arrives (only on a slow first visit) */}
        <Suspense fallback={<div className="min-h-[100svh]" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pc-builds" element={<PcBuilds />} />
          <Route path="/tech-repair" element={<TechRepair />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/about" element={<About />} />
          <Route path="/sell" element={<TradeIn />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/3d-prints" element={<Prints />} />
          <Route path="*" element={<Home />} />
        </Routes>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

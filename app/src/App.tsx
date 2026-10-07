import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import PcBuilds from "./pages/PcBuilds";
import TechRepair from "./pages/TechRepair";
import Faq from "./pages/Faq";
import Privacy from "./pages/Privacy";

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
  return (
    <>
      <a href="#main" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-card focus:bg-accent focus:px-3 focus:py-2 focus:text-onaccent">
        Skip to content
      </a>
      <ScrollManager />
      <Nav />
      <main id="main" tabIndex={-1} className="outline-none">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pc-builds" element={<PcBuilds />} />
          <Route path="/tech-repair" element={<TechRepair />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

import { Suspense, lazy, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import ScrollMotion from "./components/ScrollMotion";
import Home from "./pages/Home";
import PcBuilds from "./pages/PcBuilds";
import TechRepair from "./pages/TechRepair";
import Faq from "./pages/Faq";
import Privacy from "./pages/Privacy";
import About from "./pages/About";

/** The admin portal is a separate download, so visitors never load it. */
const AdminApp = lazy(() => import("./admin/AdminApp"));

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
  if (pathname === "/admin") {
    return (
      <Suspense fallback={<p className="p-8 text-muted">Loading…</p>}>
        <AdminApp />
      </Suspense>
    );
  }
  return (
    <>
      <a href="#main" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-card focus:bg-accent focus:px-3 focus:py-2 focus:text-onaccent">
        Skip to content
      </a>
      <ScrollManager />
      <ScrollMotion />
      <Nav />
      <main id="main" tabIndex={-1} className="outline-none">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pc-builds" element={<PcBuilds />} />
          <Route path="/tech-repair" element={<TechRepair />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

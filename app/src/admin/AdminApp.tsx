import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./client";
import BuildsTab from "./BuildsTab";
import ShopTab from "./ShopTab";
import ReviewsTab from "./ReviewsTab";
import RequestsTab from "./RequestsTab";
import DashboardTab from "./DashboardTab";
import PartsTab from "./PartsTab";
import QuotesTab from "./QuotesTab";
import { ExpensesTab, InventoryTab, JobsTab, PrintsTab } from "./BusinessTabs";
import Showcase from "./Showcase";
import { Logo } from "../components/Nav";
import { useInstall } from "./install";
import { leaveOk } from "./unsaved";

/**
 * The admin portal at /#/admin. Not linked anywhere on the site and not shown to search engines.
 * Sign in with the account you created in Supabase; only admin accounts can see or change anything
 * (the database itself enforces this, see supabase/schema.sql).
 */
export default function AdminApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | undefined>(undefined);
  const [tab, setTab] = useState<Tab>(() => {
    try { const t = sessionStorage.getItem("admin-tab") as Tab | null; if (t && TABS.some((x) => x.id === t)) return t; } catch { /* storage blocked */ }
    return "dashboard";
  });
  useEffect(() => { try { sessionStorage.setItem("admin-tab", tab); } catch { /* storage blocked */ } }, [tab]);
  const [newCount, setNewCount] = useState(0);
  const [showcase, setShowcase] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportAll = async () => {
    setExporting(true);
    try {
      const { downloadEverything } = await import("./exportAll");
      await downloadEverything();
    } catch (e) {
      alert(e instanceof Error ? e.message : "The export didn't work. Try again.");
    }
    setExporting(false);
  };
  const closeShowcase = useCallback(() => setShowcase(false), []);
  const openShowcase = () => {
    // Fullscreen has to be asked for right inside the click
    document.documentElement.requestFullscreen?.().catch(() => {});
    setShowcase(true);
  };

  useEffect(() => {
    document.title = "Admin | HunterPCBuilds";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // Is this account allowed in? (the admins table only shows rows to admins)
  useEffect(() => {
    if (!supabase || !session) { setIsAdmin(undefined); return; }
    supabase.from("admins").select("user_id").limit(1).then(({ data, error }) => setIsAdmin(!error && (data?.length ?? 0) > 0));
  }, [session]);

  const refreshNewCount = useCallback(async () => {
    if (!supabase) return;
    const { count } = await supabase.from("requests").select("id", { count: "exact", head: true }).eq("status", "new");
    setNewCount(count ?? 0);
  }, []);
  useEffect(() => { if (isAdmin) refreshNewCount(); }, [isAdmin, refreshNewCount]);

  if (!supabase) return <Shell><SetupNeeded /></Shell>;
  if (session === undefined) return <Shell><p className="text-muted">Loading…</p></Shell>;
  if (!session) return <Shell><SignIn /></Shell>;
  if (isAdmin === undefined) return <Shell><p className="text-muted">Checking your account…</p></Shell>;
  if (!isAdmin) {
    return (
      <Shell>
        <div className="card mx-auto max-w-md p-7">
          <h1 className="text-2xl">Not an admin account</h1>
          <p className="mt-2 text-muted">{session.user.email} is signed in but isn't allowed to use the portal.</p>
          <button type="button" className="btn btn-ghost mt-5" onClick={() => supabase!.auth.signOut()}>Sign out</button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      wide={tab === "quotes"}
      bar={
        <>
          <nav className="order-last flex w-full gap-1 overflow-x-auto rounded-full border border-line bg-bg2 p-1" aria-label="Admin sections">
            {TABS.map(({ id: t, label }) => (
              <button key={t} type="button" onClick={() => { if (t !== tab && leaveOk()) setTab(t); }} aria-current={tab === t ? "page" : undefined}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[.88rem] ${tab === t ? "bg-card text-ink" : "text-muted hover:text-ink"}`}>
                {label}
                {t === "requests" && newCount > 0 && (
                  <span className="ml-2 rounded-full bg-accent px-1.5 py-px font-mono text-[.7rem] text-onaccent">{newCount}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-[.85rem] text-muted">
            <button type="button" onClick={openShowcase} title="Animated full-screen showcase for the projector"
              className="rounded-full border border-line px-3 py-1 text-ink hover:border-accent hover:text-accent">
              ▶ Showcase
            </button>
            <button type="button" onClick={exportAll} disabled={exporting} title="Download one Excel file with everything: a summary, jobs, parts, quotes, expenses, prints, inventory and requests"
              className="rounded-full border border-line px-3 py-1 text-ink hover:border-accent hover:text-accent disabled:opacity-60">
              {exporting ? "Exporting…" : "⬇ Export all (Excel)"}
            </button>
            <span className="hidden sm:inline">{session.user.email}</span>
            <button type="button" className="underline hover:text-ink" onClick={() => { if (leaveOk()) supabase!.auth.signOut(); }}>Sign out</button>
          </div>
        </>
      }>
      {tab === "dashboard" && <DashboardTab go={(t) => { if (leaveOk()) setTab(t); }} />}
      {tab === "jobs" && <JobsTab />}
      {tab === "parts" && <PartsTab />}
      {tab === "quotes" && <QuotesTab />}
      {tab === "expenses" && <ExpensesTab />}
      {tab === "prints" && <PrintsTab />}
      {tab === "inventory" && <InventoryTab />}
      {tab === "builds" && <BuildsTab />}
      {tab === "shop" && <ShopTab />}
      {tab === "reviews" && <ReviewsTab />}
      {tab === "requests" && <RequestsTab onChange={refreshNewCount} />}
      {showcase && <Showcase onClose={closeShowcase} />}
    </Shell>
  );
}

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "jobs", label: "Jobs" },
  { id: "parts", label: "Parts" },
  { id: "quotes", label: "Quotes" },
  { id: "expenses", label: "Expenses" },
  { id: "prints", label: "3D prints" },
  { id: "inventory", label: "Inventory" },
  { id: "builds", label: "Site builds" },
  { id: "shop", label: "Shop" },
  { id: "reviews", label: "Reviews" },
  { id: "requests", label: "Requests" },
] as const;
type Tab = (typeof TABS)[number]["id"];

/** Page frame: top bar with the logo, a link back to the site, and (when signed in) the tabs. */
function Shell({ bar, children, wide }: { bar?: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className={`${wide ? "mx-auto w-full max-w-[120rem] px-4 sm:px-6" : "wrap"} flex min-h-16 flex-wrap items-center justify-between gap-3 py-2`}>
          <div className="flex items-center gap-3">
            <Logo />
            <span className="eyebrow">Admin</span>
          </div>
          {bar}
          <div className="flex items-center gap-3">
            <InstallButton />
            <a href="./" target="_blank" rel="noopener" className="text-[.85rem] text-muted no-underline hover:text-ink">View site →</a>
          </div>
        </div>
      </header>
      <main className={wide ? "mx-auto w-full max-w-[120rem] px-4 py-8 sm:px-6" : "wrap py-8"}>{children}</main>
    </div>
  );
}

/** "Install app" in Chrome/Edge/Android (one click); on iPhone it shows the Share → Add to Home Screen steps. Hidden once installed. */
function InstallButton() {
  const { kind, install } = useInstall();
  const [tip, setTip] = useState(false);
  if (!kind) return null;
  return (
    <span className="relative">
      <button type="button" onClick={() => (kind === "prompt" ? install() : setTip((t) => !t))}
        title="Put the admin portal on your home screen or desktop like an app"
        className="rounded-full border border-accent/60 px-3 py-1 text-[.85rem] text-accent hover:bg-accent hover:text-onaccent">
        ⤓ Install app
      </button>
      {tip && (
        <span role="status" className="card absolute left-0 top-full z-30 mt-2 block w-[min(16rem,calc(100vw-2rem))] p-3 sm:left-auto sm:right-0 text-[.85rem] text-ink">
          In Safari, tap <b>Share</b> <span aria-hidden>(the square with an arrow)</span>, then <b>Add to Home Screen</b>.
        </span>
      )}
    </span>
  );
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
  };

  return (
    <form onSubmit={submit} className="card mx-auto mt-10 max-w-md p-7">
      <h1 className="text-2xl">Sign in</h1>
      <p className="mb-6 mt-1 text-[.92rem] text-muted">Admin portal for your jobs, money, builds and requests.</p>
      <label className="mb-1 block text-[.85rem] text-muted" htmlFor="admin-email">Email</label>
      <input id="admin-email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <label className="mb-1 mt-4 block text-[.85rem] text-muted" htmlFor="admin-password">Password</label>
      <input id="admin-password" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="mt-4 text-[.9rem] text-danger" role="alert">{error}</p>}
      <button type="submit" className="btn mt-6 w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

function SetupNeeded() {
  return (
    <div className="card mx-auto max-w-xl p-7">
      <h1 className="text-2xl">The portal isn't connected yet</h1>
      <p className="mt-3 text-muted">
        This build of the site doesn't have the Supabase keys. Add <code>VITE_SUPABASE_URL</code> and{" "}
        <code>VITE_SUPABASE_ANON_KEY</code> to <code>app/.env</code> and rebuild. The steps are in the README under "Admin portal".
      </p>
    </div>
  );
}

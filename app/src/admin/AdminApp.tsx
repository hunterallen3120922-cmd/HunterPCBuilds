import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./client";
import BuildsTab from "./BuildsTab";
import RequestsTab from "./RequestsTab";
import { Logo } from "../components/Nav";

/**
 * The admin portal at /#/admin. Not linked anywhere on the site and not shown to search engines.
 * Sign in with the account you created in Supabase; only admin accounts can see or change anything
 * (the database itself enforces this, see supabase/schema.sql).
 */
export default function AdminApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | undefined>(undefined);
  const [tab, setTab] = useState<"builds" | "requests">("builds");
  const [newCount, setNewCount] = useState(0);

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
      bar={
        <>
          <nav className="flex gap-1 rounded-full border border-line bg-bg2 p-1" aria-label="Admin sections">
            {(["builds", "requests"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} aria-current={tab === t ? "page" : undefined}
                className={`rounded-full px-4 py-1.5 text-[.9rem] capitalize ${tab === t ? "bg-card text-ink" : "text-muted hover:text-ink"}`}>
                {t}
                {t === "requests" && newCount > 0 && (
                  <span className="ml-2 rounded-full bg-accent px-1.5 py-px font-mono text-[.7rem] text-onaccent">{newCount}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-[.85rem] text-muted">
            <span className="hidden sm:inline">{session.user.email}</span>
            <button type="button" className="underline hover:text-ink" onClick={() => supabase!.auth.signOut()}>Sign out</button>
          </div>
        </>
      }>
      {tab === "builds" ? <BuildsTab /> : <RequestsTab onChange={refreshNewCount} />}
    </Shell>
  );
}

/** Page frame: top bar with the logo, a link back to the site, and (when signed in) the tabs. */
function Shell({ bar, children }: { bar?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="wrap flex min-h-16 flex-wrap items-center justify-between gap-3 py-2">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="eyebrow">Admin</span>
          </div>
          {bar}
          <Link to="/" className="text-[.85rem] text-muted no-underline hover:text-ink">View site →</Link>
        </div>
      </header>
      <main className="wrap py-8">{children}</main>
    </div>
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
      <p className="mb-6 mt-1 text-[.92rem] text-muted">Admin portal for builds and requests.</p>
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

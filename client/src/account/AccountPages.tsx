import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { SignIn, SignUp, useAuth, useClerk } from "@clerk/react";
import * as api from "../api";
import type { User } from "../types";
import "./account.css";

// Sign-in with Clerk, then linking that Clerk account to a partner in a
// planner: create a new wedding, claim an existing planner once with the old
// password, or join through a partner's invite link.

const PENDING_INVITE_KEY = "aislelys:pendingInvite";

function rememberInvite(token: string) {
  try {
    sessionStorage.setItem(PENDING_INVITE_KEY, token);
  } catch {
    // storage unavailable (private mode); the invite page still works directly
  }
}

function takePendingInvite(): string | null {
  try {
    const token = sessionStorage.getItem(PENDING_INVITE_KEY);
    sessionStorage.removeItem(PENDING_INVITE_KEY);
    return token;
  } catch {
    return null;
  }
}

function AccountShell({ children }: { children: ReactNode }) {
  return (
    <div className="acct">
      <Link to="/" className="acct-brand" aria-label="Aislelys home">
        <img src="/favicon.png" alt="" width={34} height={34} />
        <img className="acct-wordmark" src="/logo-aislelys.png" alt="Aislelys" width={798} height={211} />
      </Link>
      <main className="acct-main">{children}</main>
    </div>
  );
}

export function SignInPage() {
  return (
    <AccountShell>
      <SignIn path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/start" />
    </AccountShell>
  );
}

export function SignUpPage() {
  return (
    <AccountShell>
      <SignUp path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/start" />
    </AccountShell>
  );
}

// Where everyone lands after signing in or up: straight into their planner if
// their account is linked, otherwise the choice to create or claim one.
export function StartPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"choose" | "create" | "claim">("choose");

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const account = await api.getAccount();
        if (account.linked) return navigate(`/${account.coupleId}`, { replace: true });
        const invite = takePendingInvite();
        if (invite) {
          const joined = await api.acceptInvite(invite);
          return navigate(`/${joined.coupleId}`, { replace: true });
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) return <AccountShell>{null}</AccountShell>;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;
  if (checking) return <AccountShell><p className="acct-muted">Finding your planner…</p></AccountShell>;

  return (
    <AccountShell>
      <section className="acct-card">
        {error && <p className="acct-error">{error}</p>}
        {mode === "choose" && (
          <>
            <h1>Welcome to Aislelys</h1>
            <p className="acct-muted">Let's get you into your wedding planner.</p>
            <div className="acct-choices">
              <button type="button" className="acct-choice" onClick={() => setMode("create")}>
                <strong>Create our wedding</strong>
                <span>Start a new planner for the two of you.</span>
              </button>
              <button type="button" className="acct-choice" onClick={() => setMode("claim")}>
                <strong>We already have a planner</strong>
                <span>Link this account using your old planner password — just once.</span>
              </button>
            </div>
          </>
        )}
        {mode === "create" && <CreateWedding onBack={() => setMode("choose")} />}
        {mode === "claim" && <ClaimPlanner onBack={() => setMode("choose")} />}
        <button type="button" className="acct-link" onClick={() => signOut({ redirectUrl: "/" })}>
          Sign out
        </button>
      </section>
    </AccountShell>
  );
}

function CreateWedding({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const [yourName, setYourName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ coupleId: string; inviteToken: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!yourName.trim() || !partnerName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      setCreated(await api.createWedding(yourName.trim(), partnerName.trim(), weddingDate || undefined));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (created) {
    const link = `${window.location.origin}/join/${created.inviteToken}`;
    return (
      <>
        <h1>Your planner is ready</h1>
        <p className="acct-muted">Send this private link to {partnerName.trim()} so they can join with their own account.</p>
        <div className="acct-invite">
          <input readOnly value={link} aria-label="Partner invite link" onFocus={(e) => e.target.select()} />
          <button
            type="button"
            className="acct-btn acct-btn-ghost"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              } catch {
                // clipboard unavailable; the link can be copied by hand
              }
            }}
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
        <button type="button" className="acct-btn" onClick={() => navigate(`/${created.coupleId}`)}>
          Go to our planner
        </button>
      </>
    );
  }

  return (
    <form className="acct-form" onSubmit={submit}>
      <h1>Create your wedding</h1>
      {error && <p className="acct-error">{error}</p>}
      <label>
        Your name
        <input value={yourName} onChange={(e) => setYourName(e.target.value)} autoFocus required />
      </label>
      <label>
        Your partner's name
        <input value={partnerName} onChange={(e) => setPartnerName(e.target.value)} required />
      </label>
      <label>
        Wedding date <span className="acct-optional">(optional)</span>
        <input type="date" value={weddingDate} onChange={(e) => setWeddingDate(e.target.value)} />
      </label>
      <button type="submit" className="acct-btn" disabled={saving}>
        {saving ? "Creating…" : "Create our planner"}
      </button>
      <button type="button" className="acct-link" onClick={onBack}>
        Back
      </button>
    </form>
  );
}

// Existing couples (from before Clerk) link their account once by proving
// who they are with the planner password they already have.
function ClaimPlanner({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [partners, setPartners] = useState<User[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function findPlanner(e: React.FormEvent) {
    e.preventDefault();
    const slug = address.trim().replace(/^https?:\/\/[^/]+/i, "").replace(/^\/+/, "").split(/[/?#]/)[0].toLowerCase();
    if (!slug) return;
    setBusy(true);
    setError(null);
    try {
      const status = await api.getCoupleAuthStatus(slug);
      setCoupleId(slug);
      setPartners(status.users);
    } catch {
      setError("We couldn't find that planner — check the address and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function claim(e: React.FormEvent) {
    e.preventDefault();
    if (!coupleId || !userId || !password) return;
    setBusy(true);
    setError(null);
    try {
      await api.claimAccount(coupleId, userId, password);
      navigate(`/${coupleId}`, { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (!coupleId) {
    return (
      <form className="acct-form" onSubmit={findPlanner}>
        <h1>Link your planner</h1>
        <p className="acct-muted">Enter your planner's address — the part after the domain, like your names.</p>
        {error && <p className="acct-error">{error}</p>}
        <label>
          Planner address
          <span className="acct-prefix">
            <span>{window.location.host}/</span>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="alex-sam" autoFocus />
          </span>
        </label>
        <button type="submit" className="acct-btn" disabled={busy || !address.trim()}>
          {busy ? "Checking…" : "Continue"}
        </button>
        <button type="button" className="acct-link" onClick={onBack}>
          Back
        </button>
      </form>
    );
  }

  return (
    <form className="acct-form" onSubmit={claim}>
      <h1>Which one is you?</h1>
      <p className="acct-muted">Then enter your old planner password. You'll only need it this once.</p>
      {error && <p className="acct-error">{error}</p>}
      <div className="acct-people">
        {partners.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`acct-person ${userId === p.id ? "selected" : ""}`}
            aria-pressed={userId === p.id}
            onClick={() => setUserId(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>
      {userId && (
        <label>
          Old planner password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </label>
      )}
      <button type="submit" className="acct-btn" disabled={busy || !userId || !password}>
        {busy ? "Linking…" : "Link and open my planner"}
      </button>
      <button type="button" className="acct-link" onClick={() => setCoupleId(null)}>
        Back
      </button>
    </form>
  );
}

// A partner's invite link: sign up (or in) first, then join the planner.
export function JoinPage() {
  const { token = "" } = useParams<{ token: string }>();
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<Awaited<ReturnType<typeof api.getInvite>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    api.getInvite(token).then(setInvite).catch((err) => setError((err as Error).message));
  }, [token]);

  async function join() {
    setJoining(true);
    setError(null);
    try {
      const { coupleId } = await api.acceptInvite(token);
      navigate(`/${coupleId}`, { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setJoining(false);
    }
  }

  const couple = invite?.names.filter(Boolean).join(" & ");

  return (
    <AccountShell>
      <section className="acct-card">
        {error && <p className="acct-error">{error}</p>}
        {!invite && !error && <p className="acct-muted">Opening your invite…</p>}
        {invite && invite.used && (
          <>
            <h1>This invite has been used</h1>
            <p className="acct-muted">If that was you, just sign in to open the planner.</p>
            <Link className="acct-btn" to="/sign-in">Sign in</Link>
          </>
        )}
        {invite && !invite.used && (
          <>
            <h1>You're invited</h1>
            <p className="acct-muted">
              Join {couple ? `${couple}'s` : "your"} wedding planner as <strong>{invite.partnerName}</strong>.
            </p>
            {!isLoaded ? null : isSignedIn ? (
              <button type="button" className="acct-btn" onClick={join} disabled={joining}>
                {joining ? "Joining…" : "Join the planner"}
              </button>
            ) : (
              <div className="acct-actions">
                <button
                  type="button"
                  className="acct-btn"
                  onClick={() => {
                    rememberInvite(token);
                    navigate("/sign-up");
                  }}
                >
                  Create my account
                </button>
                <button
                  type="button"
                  className="acct-btn acct-btn-ghost"
                  onClick={() => {
                    rememberInvite(token);
                    navigate("/sign-in");
                  }}
                >
                  I already have an account
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </AccountShell>
  );
}

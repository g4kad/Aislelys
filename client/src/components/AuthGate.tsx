import { useState, type ReactNode } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../auth";
import { coupleTitle } from "../textUtils";

function LoginScreen() {
  const { accounts, login } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !password) return;
    setError(null);
    setSubmitting(true);
    try {
      await login(selected, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="invite-title">{coupleTitle(accounts.map((a) => a.name))}</h1>
        <Link className="btn primary auth-clerk-btn" to="/sign-in">
          Sign in with your Aislelys account
        </Link>
        <p className="page-subtitle auth-legacy-label">Or use your planner password — who's logging in?</p>
        {error && (
          <div className="error-banner" onClick={() => setError(null)}>
            {error} (click to dismiss)
          </div>
        )}
        <div className="auth-account-tiles">
          {accounts.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`auth-account-tile ${selected === a.id ? "selected" : ""}`}
              onClick={() => {
                setSelected(a.id);
                setError(null);
              }}
            >
              {a.name}
            </button>
          ))}
        </div>
        {selected && (
          <form className="auth-login-form" onSubmit={handleSubmit}>
            <label className="title-field">
              Password
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting ? "Logging in…" : "Log in"}
            </button>
          </form>
        )}
        <HomeLink />
      </div>
    </div>
  );
}

// the way back from the app to the public Home page
export function HomeLink() {
  return (
    <p className="auth-home-link">
      New to Aislelys? <Link to="/">See how it works →</Link>
    </p>
  );
}

function WorkspaceNotFound() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="invite-title">Our Wedding Planner</h1>
        <p className="page-subtitle">This planner link isn't valid — double-check the link, or create your own.</p>
        <a className="btn primary" href="/signup">Create your wedding planner</a>
        <HomeLink />
      </div>
    </div>
  );
}

export function LoginPage() {
  const { loading, user, workspaceNotFound } = useAuth();
  const { coupleId } = useParams<{ coupleId: string }>();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string; search: string } })?.from;
  const backTo = from ? `${from.pathname}${from.search}` : `/${coupleId}`;

  if (loading) return <p className="empty-hint">Loading…</p>;
  if (workspaceNotFound) return <WorkspaceNotFound />;
  if (user) return <Navigate to={backTo} replace />;
  return <LoginScreen />;
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const { loading, user, workspaceNotFound } = useAuth();
  const { coupleId } = useParams<{ coupleId: string }>();
  const location = useLocation();
  if (loading) return <p className="empty-hint">Loading…</p>;
  if (workspaceNotFound) return <WorkspaceNotFound />;
  if (!user) return <Navigate to={`/${coupleId}/login`} state={{ from: location }} replace />;
  return <>{children}</>;
}

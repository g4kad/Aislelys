import { HomeLink } from "../components/AuthGate";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as api from "../api";

export default function SignupPage() {
  const navigate = useNavigate();
  const [partner1Name, setPartner1Name] = useState("");
  const [partner1Password, setPartner1Password] = useState("");
  const [partner2Name, setPartner2Name] = useState("");
  const [partner2Password, setPartner2Password] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ coupleId: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!partner1Name.trim() || !partner1Password || !partner2Name.trim() || !partner2Password) {
      setError("Please fill in a name and password for both of you.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.signup(
        { name: partner1Name.trim(), password: partner1Password },
        { name: partner2Name.trim(), password: partner2Password },
        weddingDate || undefined
      );
      setCreated({ coupleId: result.coupleId, link: `${window.location.origin}/${result.coupleId}` });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access may be unavailable — the link is still shown for manual copying.
    }
  }

  if (created) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="invite-title">You're all set!</h1>
          <p className="page-subtitle">
            Save this link — it's the only way back into your planner. There's no email, so bookmark this page or
            copy the link somewhere safe before you leave.
          </p>
          <div className="signup-link-row">
            <input type="text" readOnly value={created.link} onFocus={(e) => e.target.select()} />
            <button type="button" className="btn small" onClick={copyLink}>
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
          <button className="btn primary" onClick={() => navigate(`/${created.coupleId}`)}>
            Continue to your planner
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="invite-title">Our Wedding Planner</h1>
        <p className="page-subtitle">Set up your own planner — just names and passwords, no email needed.</p>
        {error && (
          <div className="error-banner" onClick={() => setError(null)}>
            {error} (click to dismiss)
          </div>
        )}
        <form className="auth-setup-form" onSubmit={handleSubmit}>
          <div className="auth-setup-columns">
            <div className="auth-setup-column">
              <span className="view-label">Partner 1</span>
              <label className="title-field">
                Name
                <input type="text" value={partner1Name} onChange={(e) => setPartner1Name(e.target.value)} />
              </label>
              <label className="title-field">
                Password
                <input
                  type="password"
                  value={partner1Password}
                  onChange={(e) => setPartner1Password(e.target.value)}
                />
              </label>
            </div>
            <div className="auth-setup-column">
              <span className="view-label">Partner 2</span>
              <label className="title-field">
                Name
                <input type="text" value={partner2Name} onChange={(e) => setPartner2Name(e.target.value)} />
              </label>
              <label className="title-field">
                Password
                <input
                  type="password"
                  value={partner2Password}
                  onChange={(e) => setPartner2Password(e.target.value)}
                />
              </label>
            </div>
          </div>
          <label className="title-field">
            Wedding date
            <input type="date" value={weddingDate} onChange={(e) => setWeddingDate(e.target.value)} />
          </label>
          <button className="btn primary" type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create your planner"}
          </button>
        </form>
        <HomeLink />
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import * as api from "../api";
import { formatDateLong } from "../dateUtils";

type Props = {
  weddingDate: string | null;
  onWeddingDateChange: (date: string | null) => void;
};

export default function SettingsPage({ weddingDate, onWeddingDateChange }: Props) {
  const [draft, setDraft] = useState(weddingDate ?? "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "saved" | "error"; message: string } | null>(null);

  // the date loads after the page can already be open (e.g. a refresh on /settings)
  useEffect(() => {
    setDraft(weddingDate ?? "");
  }, [weddingDate]);

  const unchanged = draft === (weddingDate ?? "");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (unchanged) return;
    setSaving(true);
    setStatus(null);
    try {
      const { date } = await api.updateWeddingDate(draft || null);
      onWeddingDateChange(date);
      setStatus({ kind: "saved", message: date ? `Saved — ${formatDateLong(date)}` : "Wedding date cleared" });
    } catch (err) {
      setStatus({ kind: "error", message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-page">
      <h2 className="board-region-title">Settings</h2>

      <PartnerInviteCard />

      <section className="settings-card">
        <h3>Wedding date</h3>
        <p className="page-subtitle">Used for the countdown at the top of every page.</p>
        <form className="settings-form" onSubmit={handleSave}>
          <label className="title-field">
            Date
            <input
              type="date"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setStatus(null);
              }}
            />
          </label>
          <button className="btn primary" type="submit" disabled={saving || unchanged}>
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
        {status && <p className={`settings-status ${status.kind === "error" ? "error" : ""}`}>{status.message}</p>}
      </section>
    </div>
  );
}

// Shown to a partner signed in with their Aislelys (Clerk) account while the
// other partner hasn't joined yet: the private link to send them.
function PartnerInviteCard() {
  const [invite, setInvite] = useState<{ token: string; partnerName?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .getPartnerInvite()
      .then((r) => (r.token ? setInvite({ token: r.token, partnerName: r.partnerName }) : setInvite(null)))
      .catch(() => setInvite(null)); // not signed in with Clerk, or partner already joined
  }, []);

  if (!invite) return null;
  const link = `${window.location.origin}/join/${invite.token}`;

  return (
    <section className="settings-card settings-invite">
      <h3>Invite {invite.partnerName ?? "your partner"}</h3>
      <p className="page-subtitle">Send this private link so they can join the planner with their own account.</p>
      <div className="settings-invite-row">
        <input readOnly value={link} aria-label="Partner invite link" onFocus={(e) => e.target.select()} />
        <button
          type="button"
          className="btn"
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
    </section>
  );
}

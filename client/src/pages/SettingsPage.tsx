import { useEffect, useState } from "react";
import * as api from "../api";
import { formatDateLong } from "../dateUtils";
import { useAuth } from "../auth";
import Modal from "../components/Modal";

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

      <DeletePlannerCard />
    </div>
  );
}

const DELETE_PHRASE = "yes, I do want to delete";

// Deleting takes three deliberate steps: the muted button arms on the first
// click, opens the confirmation on the second, and the confirmation only
// goes through once the phrase is typed out.
function DeletePlannerCard() {
  const { logout } = useAuth();
  const [armed, setArmed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = typed.trim().toLowerCase() === DELETE_PHRASE.toLowerCase();

  function closeConfirm() {
    if (deleting) return;
    setConfirming(false);
    setArmed(false);
    setTyped("");
    setError(null);
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!matches) return;
    setDeleting(true);
    setError(null);
    try {
      await api.deletePlanner(typed);
    } catch (err) {
      setError((err as Error).message);
      setDeleting(false);
      return;
    }
    await logout().catch(() => {});
    window.location.replace("/");
  }

  return (
    <section className="settings-card settings-danger">
      <h3>Delete planner</h3>
      <p className="page-subtitle">
        Permanently deletes this planner for both of you: plans, guests, budget, vendors and inspiration.
      </p>
      <button
        type="button"
        className={`btn settings-delete-btn${armed ? " armed" : ""}`}
        onClick={() => (armed ? setConfirming(true) : setArmed(true))}
        onBlur={() => !confirming && setArmed(false)}
      >
        {armed ? "Click again to delete" : "Delete planner"}
      </button>

      {confirming && (
        <Modal title="Delete this planner?" onClose={closeConfirm}>
          <form className="settings-delete-confirm" onSubmit={handleDelete}>
            <p>
              Are you sure you want to delete this planner? Everything in it will be gone for both of you, and it
              can't be undone.
            </p>
            <label className="title-field">
              Type “{DELETE_PHRASE}” to confirm
              <input
                autoFocus
                value={typed}
                onChange={(e) => {
                  setTyped(e.target.value);
                  setError(null);
                }}
                placeholder={DELETE_PHRASE}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            {error && <p className="settings-status error">{error}</p>}
            <div className="btn-row">
              <button type="submit" className="btn danger" disabled={!matches || deleting}>
                {deleting ? "Deleting…" : "Delete planner"}
              </button>
              <button type="button" className="btn ghost" onClick={closeConfirm} disabled={deleting}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
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

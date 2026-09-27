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

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { GuestOwner } from "../types";
import * as api from "../api";
import { IconClose } from "../components/Icons";

export default function GuestInviteView() {
  const { ownerId } = useParams<{ ownerId: string }>();
  const [owner, setOwner] = useState<GuestOwner | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [plus, setPlus] = useState("0");

  useEffect(() => {
    if (!ownerId) return;
    api
      .getGuestOwner(ownerId)
      .then(setOwner)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [ownerId]);

  const totalAttendees = owner ? owner.guests.reduce((sum, g) => sum + 1 + g.plusCount, 0) : 0;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !ownerId) return;
    try {
      const guest = await api.addGuest(ownerId, name.trim(), Math.max(0, Math.floor(Number(plus)) || 0));
      setOwner((prev) => (prev ? { ...prev, guests: [...prev.guests, guest] } : prev));
      setName("");
      setPlus("0");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleUpdatePlus(guestId: string, plusCount: number) {
    if (!ownerId) return;
    setOwner((prev) =>
      prev ? { ...prev, guests: prev.guests.map((g) => (g.id === guestId ? { ...g, plusCount } : g)) } : prev
    );
    try {
      await api.updateGuest(ownerId, guestId, { plusCount });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleRemove(guestId: string) {
    if (!ownerId) return;
    setOwner((prev) => (prev ? { ...prev, guests: prev.guests.filter((g) => g.id !== guestId) } : prev));
    try {
      await api.deleteGuest(ownerId, guestId);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (loading) {
    return (
      <div className="invite-page">
        <p className="empty-hint">Loading…</p>
      </div>
    );
  }

  if (notFound || !owner) {
    return (
      <div className="invite-page">
        <h1 className="invite-title">Our Wedding Planner</h1>
        <p>This invite link isn't valid anymore. Please ask for a new link.</p>
      </div>
    );
  }

  return (
    <div className="invite-page">
      <h1 className="invite-title">Our Wedding Planner</h1>
      <p className="invite-subtitle">
        Add the guests you'd like to invite for <strong>{owner.name}</strong>. If someone is bringing extra
        people (a plus-one, kids, etc.), add how many more next to their name.
      </p>

      {error && (
        <div className="error-banner" onClick={() => setError(null)}>
          {error} (click to dismiss)
        </div>
      )}

      <form className="add-owner-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="Guest name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <label className="plus-input-label">
          +
          <input
            className="plus-input"
            type="number"
            min={0}
            value={plus}
            onChange={(e) => setPlus(e.target.value)}
          />
        </label>
        <button className="btn primary" type="submit">Add guest</button>
      </form>

      <div className="view-block">
        <span className="view-label">{totalAttendees} total guests expected</span>
        {owner.guests.length === 0 ? (
          <p className="empty-hint">No guests added yet.</p>
        ) : (
          <ul className="task-list">
            {owner.guests.map((g) => (
              <li key={g.id} className="task-item">
                <span className="task-name">{g.name}</span>
                <label className="plus-input-label">
                  +
                  <input
                    className="plus-input"
                    type="number"
                    min={0}
                    value={g.plusCount}
                    onChange={(e) => handleUpdatePlus(g.id, Math.max(0, Math.floor(Number(e.target.value)) || 0))}
                  />
                </label>
                <button className="icon-btn" title="Remove" onClick={() => handleRemove(g.id)}>
                  <IconClose />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import type { Guest, GuestOwner } from "../types";
import * as api from "../api";
import GuestOwnerCard from "../components/GuestOwnerCard";

export default function GuestListPage() {
  const [owners, setOwners] = useState<GuestOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    api
      .getGuestOwners()
      .then(setOwners)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const totalGuests = useMemo(
    () => owners.reduce((sum, o) => sum + o.guests.reduce((s, g) => s + 1 + g.plusCount, 0), 0),
    [owners]
  );

  async function createOwner(name: string) {
    try {
      const created = await api.createGuestOwner(name);
      setOwners((prev) => [...prev, created]);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleAddOwner(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await createOwner(newName.trim());
    setNewName("");
  }

  async function handleUpdateOwner(id: string, patch: Partial<Pick<GuestOwner, "name">>) {
    setOwners((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    try {
      await api.updateGuestOwner(id, patch);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDeleteOwner(id: string) {
    setOwners((prev) => prev.filter((o) => o.id !== id));
    try {
      await api.deleteGuestOwner(id);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleAddGuest(ownerId: string, name: string, plusCount: number) {
    try {
      const guest = await api.addGuest(ownerId, name, plusCount);
      setOwners((prev) =>
        prev.map((o) => (o.id === ownerId ? { ...o, guests: [...o.guests, guest] } : o))
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleUpdateGuest(ownerId: string, guestId: string, patch: Partial<Pick<Guest, "name" | "plusCount">>) {
    setOwners((prev) =>
      prev.map((o) =>
        o.id === ownerId
          ? { ...o, guests: o.guests.map((g) => (g.id === guestId ? { ...g, ...patch } : g)) }
          : o
      )
    );
    try {
      await api.updateGuest(ownerId, guestId, patch);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDeleteGuest(ownerId: string, guestId: string) {
    setOwners((prev) =>
      prev.map((o) => (o.id === ownerId ? { ...o, guests: o.guests.filter((g) => g.id !== guestId) } : o))
    );
    try {
      await api.deleteGuest(ownerId, guestId);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (loading) return <p className="empty-hint">Loading…</p>;

  const brideExists = owners.some((o) => o.name.trim().toLowerCase() === "bride");
  const groomExists = owners.some((o) => o.name.trim().toLowerCase() === "groom");
  const showCoupleSetup = owners.length < 2;

  return (
    <div className="guest-list-page">
      {error && (
        <div className="error-banner" onClick={() => setError(null)}>
          {error} (click to dismiss)
        </div>
      )}

      <div className="guest-list-header">
        <h2 className="board-region-title">Guest List</h2>
        <span className="guest-total-pill">{totalGuests} guests total</span>
      </div>

      <p className="page-subtitle">
        Give each person their own list — bride, groom, or their parents — and share their invite link so
        they can add their own guests.
      </p>

      {showCoupleSetup ? (
        <div className="couple-setup">
          <span className="view-label">Who is this list for?</span>
          <div className="btn-row">
            <button
              type="button"
              className="btn primary"
              disabled={brideExists}
              onClick={() => createOwner("Bride")}
            >
              + Add Bride
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={groomExists}
              onClick={() => createOwner("Groom")}
            >
              + Add Groom
            </button>
          </div>
        </div>
      ) : (
        <form className="add-owner-form" onSubmit={handleAddOwner}>
          <input
            type="text"
            placeholder="e.g. Bride's Parents, Groom's Friends…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button className="btn primary" type="submit">+ Add person</button>
        </form>
      )}

      {owners.length === 0 ? (
        <p className="empty-hint">No lists yet — add the bride and groom above to get started.</p>
      ) : (
        <div className="card-list">
          {owners.map((owner, index) => (
            <GuestOwnerCard
              key={owner.id}
              owner={owner}
              showInviteLink={index >= 2}
              onUpdateOwner={(patch) => handleUpdateOwner(owner.id, patch)}
              onDeleteOwner={() => handleDeleteOwner(owner.id)}
              onAddGuest={(name, plusCount) => handleAddGuest(owner.id, name, plusCount)}
              onUpdateGuest={(guestId, patch) => handleUpdateGuest(owner.id, guestId, patch)}
              onDeleteGuest={(guestId) => handleDeleteGuest(owner.id, guestId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

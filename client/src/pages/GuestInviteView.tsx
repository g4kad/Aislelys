import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Guest, GuestCategory, GuestOwner } from "../types";
import * as api from "../api";
import { IconChevronRight, IconClose } from "../components/Icons";
import { guestNamePlaceholder } from "../textUtils";

type ContactDetails = { phone: string; email: string; address: string; notes: string };

type CategorySectionProps = {
  category: GuestCategory;
  guests: Guest[];
  open: boolean;
  onToggleOpen: () => void;
  onAddGuest: (categoryId: string, name: string, plusCount: number, contact: ContactDetails) => void;
  onUpdatePlus: (guestId: string, plusCount: number) => void;
  onRemove: (guestId: string) => void;
};

const emptyContact: ContactDetails = { phone: "", email: "", address: "", notes: "" };

function CategorySection({ category, guests, open, onToggleOpen, onAddGuest, onUpdatePlus, onRemove }: CategorySectionProps) {
  const [name, setName] = useState("");
  const [plus, setPlus] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [contact, setContact] = useState<ContactDetails>(emptyContact);
  const total = guests.reduce((sum, g) => sum + 1 + g.plusCount, 0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const plusCount = plus === "" ? 0 : Math.max(0, Math.floor(Number(plus)) || 0);
    onAddGuest(category.id, name.trim(), plusCount, contact);
    setName("");
    setPlus("");
    setContact(emptyContact);
    setShowDetails(false);
  }

  return (
    <div className="guest-subsection">
      <button type="button" className="guest-subsection-header" onClick={onToggleOpen} aria-expanded={open}>
        <span className={`chevron ${open ? "open" : ""}`}><IconChevronRight /></span>
        <span className="view-label">{category.title}</span>
        <span className="task-pill">{total}</span>
      </button>
      {open && (
        <div className="guest-subsection-body">
          {guests.length > 0 && (
            <div className="guest-names-box">
              <ul className="task-list">
                {guests.map((g) => (
                  <li key={g.id} className="task-item">
                    <span className="task-status">•</span>
                    <span className="task-name">{g.name}</span>
                    <label className="plus-input-label">
                      +
                      <input
                        className="plus-input"
                        type="number"
                        min={0}
                        placeholder="0"
                        value={g.plusCount === 0 ? "" : g.plusCount}
                        onChange={(e) => {
                          const raw = e.target.value;
                          onUpdatePlus(g.id, raw === "" ? 0 : Math.max(0, Math.floor(Number(raw)) || 0));
                        }}
                      />
                    </label>
                    <button className="icon-btn" title="Remove" onClick={() => onRemove(g.id)}>
                      <IconClose />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <form className="guest-add-form-block" onSubmit={submit}>
            <div className="guest-add-form">
              <input
                type="text"
                placeholder={guestNamePlaceholder(category.title)}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <label className="plus-input-label">
                +
                <input
                  className="plus-input"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={plus}
                  onChange={(e) => setPlus(e.target.value)}
                />
              </label>
              <button className="btn small" type="submit">Add</button>
            </div>

            {showDetails ? (
              <div className="guest-contact-panel">
                <label className="guest-contact-field">
                  Number
                  <input
                    type="text"
                    placeholder="e.g. 012-345 6789"
                    value={contact.phone}
                    onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                  />
                </label>
                <label className="guest-contact-field">
                  Email
                  <input
                    type="email"
                    placeholder="e.g. alice@example.com"
                    value={contact.email}
                    onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                  />
                </label>
                <label className="guest-contact-field">
                  Address
                  <input
                    type="text"
                    placeholder="Mailing address"
                    value={contact.address}
                    onChange={(e) => setContact((c) => ({ ...c, address: e.target.value }))}
                  />
                </label>
                <label className="guest-contact-field">
                  Notes
                  <textarea
                    rows={2}
                    placeholder="Dietary needs, seating preference, etc."
                    value={contact.notes}
                    onChange={(e) => setContact((c) => ({ ...c, notes: e.target.value }))}
                  />
                </label>
                <button type="button" className="link-btn" onClick={() => setShowDetails(false)}>
                  Hide contact details
                </button>
              </div>
            ) : (
              <button type="button" className="link-btn" onClick={() => setShowDetails(true)}>
                + Add their contact details (optional)
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

export default function GuestInviteView() {
  const { ownerId } = useParams<{ ownerId: string }>();
  const [owner, setOwner] = useState<(GuestOwner & { partner1Name: string | null; partner2Name: string | null }) | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const [showAddList, setShowAddList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");

  useEffect(() => {
    if (!ownerId) return;
    api
      .getGuestOwner(ownerId)
      .then((o) => {
        setOwner(o);
        if (o.categories.length > 0) setOpenCategoryId(o.categories[0].id);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [ownerId]);

  const totalAttendees = owner
    ? owner.guests.reduce((sum, g) => (g.included === false ? sum : sum + 1 + g.plusCount), 0)
    : 0;

  function toggleCategoryOpen(categoryId: string) {
    setOpenCategoryId((prev) => (prev === categoryId ? null : categoryId));
  }

  async function handleAddGuest(categoryId: string, name: string, plusCount: number, contact: ContactDetails) {
    if (!ownerId) return;
    try {
      const guest = await api.addGuest(ownerId, name, plusCount, categoryId, false, contact);
      setOwner((prev) => (prev ? { ...prev, guests: [...prev.guests, guest] } : prev));
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

  async function handleAddList(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerId || !newListTitle.trim()) return;
    try {
      const category = await api.createGuestCategory(ownerId, newListTitle.trim());
      setOwner((prev) => (prev ? { ...prev, categories: [...prev.categories, category] } : prev));
      setOpenCategoryId(category.id);
      setNewListTitle("");
      setShowAddList(false);
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
      <h1 className="invite-title">Hello {owner.name}!</h1>
      <p className="invite-subtitle">
        Add the guest you'd like to invite for{" "}
        <strong>
          {owner.partner1Name} & {owner.partner2Name}'s
        </strong>{" "}
        wedding. If someone you know is bringing extra people (a plus-one, kids, etc.), add how many more next
        to their name.
      </p>

      {error && (
        <div className="error-banner" onClick={() => setError(null)}>
          {error} (click to dismiss)
        </div>
      )}

      <div className="card invite-guest-card view-block">
        <span className="view-label">{totalAttendees} total guests expected</span>

        {owner.categories.map((cat) => (
          <CategorySection
            key={cat.id}
            category={cat}
            guests={owner.guests.filter((g) => g.categoryId === cat.id)}
            open={openCategoryId === cat.id}
            onToggleOpen={() => toggleCategoryOpen(cat.id)}
            onAddGuest={handleAddGuest}
            onUpdatePlus={handleUpdatePlus}
            onRemove={handleRemove}
          />
        ))}

        <div className="invite-add-list-row">
          {showAddList ? (
            <form className="add-owner-form guest-category-add-form" onSubmit={handleAddList}>
              <input
                type="text"
                placeholder="e.g. Highschool, Work…"
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                autoFocus
              />
              <button className="btn small primary" type="submit">Add</button>
              <button className="btn small ghost" type="button" onClick={() => setShowAddList(false)}>
                Cancel
              </button>
            </form>
          ) : (
            <button className="btn small ghost invite-add-list-btn" type="button" onClick={() => setShowAddList(true)}>
              + Add list
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

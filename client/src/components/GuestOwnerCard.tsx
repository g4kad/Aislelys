import { useState } from "react";
import type { Guest, GuestOwner } from "../types";
import { IconChevronRight, IconClose, IconTrash } from "./Icons";

type Props = {
  owner: GuestOwner;
  defaultExpanded?: boolean;
  showInviteLink?: boolean;
  onUpdateOwner: (patch: Partial<Pick<GuestOwner, "name">>) => void;
  onDeleteOwner: () => void;
  onAddGuest: (name: string, plusCount: number) => void;
  onUpdateGuest: (guestId: string, patch: Partial<Pick<Guest, "name" | "plusCount">>) => void;
  onDeleteGuest: (guestId: string) => void;
};

export default function GuestOwnerCard({
  owner,
  defaultExpanded = false,
  showInviteLink = false,
  onUpdateOwner,
  onDeleteOwner,
  onAddGuest,
  onUpdateGuest,
  onDeleteGuest,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPlus, setGuestPlus] = useState("0");
  const [copied, setCopied] = useState(false);

  const inviteLink = `${window.location.origin}/guests/${owner.id}`;
  const totalAttendees = owner.guests.reduce((sum, g) => sum + 1 + g.plusCount, 0);

  function toggleExpanded() {
    setExpanded((v) => {
      const next = !v;
      if (!next) {
        setEditing(false);
        setConfirmDelete(false);
      }
      return next;
    });
  }

  function submitGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!guestName.trim()) return;
    onAddGuest(guestName.trim(), Math.max(0, Math.floor(Number(guestPlus)) || 0));
    setGuestName("");
    setGuestPlus("0");
  }

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard API unavailable; ignore silently
    }
  }

  return (
    <div className="card guest-owner-card">
      <button className="card-header" onClick={toggleExpanded} aria-expanded={expanded}>
        <span className={`chevron ${expanded ? "open" : ""}`}><IconChevronRight /></span>
        <span className="card-title">{owner.name}</span>
        <span className="task-pill">
          {totalAttendees} {totalAttendees === 1 ? "guest" : "guests"}
        </span>
      </button>

      {expanded && (
        <div className="card-body">
          {showInviteLink && (
            <div className="invite-row">
              <span className="view-label">Invite link</span>
              <div className="invite-link-box">
                <button type="button" className="btn small ghost" onClick={copyInviteLink}>
                  {copied ? "Copied!" : "Copy link"}
                </button>
              </div>
              <p className="empty-hint">Send this link so {owner.name} can add their own guests.</p>
            </div>
          )}

          {!editing ? (
            <>
              <div className="view-block">
                <span className="view-label">Guests</span>
                {owner.guests.length === 0 ? (
                  <p className="empty-hint">No guests added yet.</p>
                ) : (
                  <ul className="task-view-list">
                    {owner.guests.map((g) => (
                      <li key={g.id} className="task-view-item">
                        <span className="task-status">•</span>
                        <span className="task-name">{g.name}</span>
                        {g.plusCount > 0 && <span className="plus-badge">+{g.plusCount}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="card-footer">
                <button className="btn small ghost card-footer-right" onClick={() => setEditing(true)}>
                  Edit
                </button>
              </div>
            </>
          ) : (
            <>
              <label className="title-field">
                List name
                <input
                  type="text"
                  value={owner.name}
                  onChange={(e) => onUpdateOwner({ name: e.target.value })}
                />
              </label>

              <div className="tasks-block">
                <div className="notes-block-header">
                  <span>Guests</span>
                </div>
                {owner.guests.length === 0 && <p className="empty-hint">No guests added yet.</p>}
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
                          onChange={(e) =>
                            onUpdateGuest(g.id, { plusCount: Math.max(0, Math.floor(Number(e.target.value)) || 0) })
                          }
                        />
                      </label>
                      <button className="icon-btn" title="Remove guest" onClick={() => onDeleteGuest(g.id)}>
                        <IconClose />
                      </button>
                    </li>
                  ))}
                </ul>
                <form className="guest-add-form" onSubmit={submitGuest}>
                  <input
                    type="text"
                    placeholder="Guest name…"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                  <label className="plus-input-label">
                    +
                    <input
                      className="plus-input"
                      type="number"
                      min={0}
                      value={guestPlus}
                      onChange={(e) => setGuestPlus(e.target.value)}
                    />
                  </label>
                  <button className="btn small" type="submit">Add guest</button>
                </form>
              </div>

              <div className="card-footer">
                {confirmDelete ? (
                  <span className="confirm-row">
                    Delete this list?
                    <button className="btn small danger" onClick={onDeleteOwner}>Yes, delete</button>
                    <button className="btn small ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
                  </span>
                ) : (
                  <button className="icon-btn danger" title="Delete list" onClick={() => setConfirmDelete(true)}>
                    <IconTrash />
                  </button>
                )}
                <button className="btn small primary card-footer-right" onClick={() => setEditing(false)}>
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

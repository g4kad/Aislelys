import { useState } from "react";
import type { GuestOwner } from "../types";
import { IconChevronRight } from "./Icons";

type Props = {
  owners: GuestOwner[];
  defaultExpanded?: boolean;
};

export default function VipCard({ owners, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [openOwnerId, setOpenOwnerId] = useState<string | null>(null);

  const vipCount = (guests: GuestOwner["guests"]) =>
    guests
      .filter((g) => g.isVip)
      .reduce((sum, g) => (g.included === false ? sum : sum + 1 + g.plusCount), 0);

  const totalVip = owners.reduce((sum, o) => sum + vipCount(o.guests), 0);

  function toggleOwner(id: string) {
    setOpenOwnerId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="card guest-owner-card vip-card">
      <button className="card-header" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
        <span className={`chevron ${expanded ? "open" : ""}`}><IconChevronRight /></span>
        <span className="card-title">VIP</span>
        <span className="task-pill">{totalVip}</span>
      </button>

      {expanded && (
        <div className="card-body">
          {owners.map((owner) => {
            const vipGuests = owner.guests.filter((g) => g.isVip);
            const open = openOwnerId === owner.id;
            return (
              <div className="guest-subsection" key={owner.id}>
                <button
                  type="button"
                  className="guest-subsection-header"
                  onClick={() => toggleOwner(owner.id)}
                  aria-expanded={open}
                >
                  <span className={`chevron ${open ? "open" : ""}`}><IconChevronRight /></span>
                  <span className="view-label">{owner.name}</span>
                  <span className="task-pill">{vipCount(owner.guests)}</span>
                </button>
                {open && (
                  <div className="guest-subsection-body">
                    {vipGuests.length === 0 ? (
                      <p className="empty-hint">No VIPs in {owner.name}'s list yet.</p>
                    ) : (
                      <ul className="task-view-list">
                        {vipGuests.map((g) => (
                          <li key={g.id} className="task-view-item">
                            <span className="task-status">•</span>
                            <span className="task-name">{g.name}</span>
                            {g.plusCount > 0 && <span className="plus-badge">+{g.plusCount}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

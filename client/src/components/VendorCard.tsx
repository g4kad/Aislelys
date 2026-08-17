import { useState } from "react";
import type { Vendor } from "../types";
import { IconChevronRight, IconTrash } from "./Icons";
import Dropdown from "./Dropdown";
import { VENDOR_CATEGORIES, VENDOR_STATUSES } from "../constants";

type Props = {
  vendor: Vendor;
  defaultExpanded?: boolean;
  onUpdate: (patch: Partial<Pick<Vendor, "name" | "category" | "contact" | "cost" | "status" | "notes">>) => void;
  onDelete: () => void;
};

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  VENDOR_STATUSES.map((s) => [s.value, s.label])
);

export default function VendorCard({ vendor, defaultExpanded = false, onUpdate, onDelete }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  return (
    <div className="card vendor-card">
      <button className="card-header" onClick={toggleExpanded} aria-expanded={expanded}>
        <span className={`chevron ${expanded ? "open" : ""}`}><IconChevronRight /></span>
        <span className="card-title">{vendor.name}</span>
        <span className={`status-pill status-${vendor.status}`}>{STATUS_LABEL[vendor.status] ?? vendor.status}</span>
      </button>

      {expanded && !editing && (
        <div className="card-body card-view">
          <div className="card-meta">{vendor.category}</div>

          <div className="view-block">
            <span className="view-label">Contact</span>
            <p className="notes-text">{vendor.contact || <em>No contact info yet.</em>}</p>
          </div>

          <div className="view-block">
            <span className="view-label">Cost</span>
            <p className="notes-text">RM {vendor.cost.toLocaleString()}</p>
          </div>

          <div className="view-block">
            <span className="view-label">Notes</span>
            <p className="notes-text">{vendor.notes || <em>No notes yet.</em>}</p>
          </div>

          <div className="card-footer">
            <button className="btn small ghost card-footer-right" onClick={() => setEditing(true)}>Edit</button>
          </div>
        </div>
      )}

      {expanded && editing && (
        <div className="card-body">
          <label className="title-field">
            Name
            <input type="text" value={vendor.name} onChange={(e) => onUpdate({ name: e.target.value })} />
          </label>

          <div className="field-row">
            <label>
              Category
              <Dropdown
                value={vendor.category}
                onChange={(v) => onUpdate({ category: v })}
                options={VENDOR_CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            </label>
            <label>
              Status
              <Dropdown
                value={vendor.status}
                onChange={(v) => onUpdate({ status: v as Vendor["status"] })}
                options={VENDOR_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
              />
            </label>
          </div>

          <div className="field-row">
            <label>
              Contact
              <input type="text" value={vendor.contact} onChange={(e) => onUpdate({ contact: e.target.value })} />
            </label>
            <label>
              Cost (RM)
              <input
                type="number"
                min={0}
                value={vendor.cost}
                onChange={(e) => onUpdate({ cost: Math.max(0, Number(e.target.value) || 0) })}
              />
            </label>
          </div>

          <div className="notes-block">
            <div className="notes-block-header">
              <span>Notes</span>
            </div>
            <textarea
              value={vendor.notes}
              onChange={(e) => onUpdate({ notes: e.target.value })}
              rows={3}
              placeholder="Add notes for this vendor…"
            />
          </div>

          <div className="card-footer">
            {confirmDelete ? (
              <span className="confirm-row">
                Delete this vendor?
                <button className="btn small danger" onClick={onDelete}>Yes, delete</button>
                <button className="btn small ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
              </span>
            ) : (
              <button className="icon-btn danger" title="Delete vendor" onClick={() => setConfirmDelete(true)}>
                <IconTrash />
              </button>
            )}
            <button className="btn small primary card-footer-right" onClick={() => setEditing(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

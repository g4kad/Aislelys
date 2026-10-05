import { useState } from "react";
import type { BudgetCategory, Currency, Vendor, VendorCategory } from "../types";
import { IconChevronRight, IconTrash } from "./Icons";
import Dropdown from "./Dropdown";
import { VENDOR_STATUSES, CURRENCIES } from "../constants";
import { extrasTotal, formatMoney } from "../money";
import { CostBreakdown, ExtraCostsEditor } from "./ExtraCosts";
import { vendorCategoryOptions } from "../categoryOptions";
import SwipeToDelete from "./SwipeToDelete";

type Props = {
  vendor: Vendor;
  categories: VendorCategory[];
  budgetCategories: BudgetCategory[];
  color?: string;
  defaultExpanded?: boolean;
  onCreateCategory: (title: string, color?: string) => Promise<VendorCategory>;
  onUpdate: (patch: Partial<Pick<Vendor, "name" | "category" | "contact" | "cost" | "status" | "notes" | "currency" | "budgetCategory" | "downpayment" | "extras">>) => void;
  onDelete: () => void;
};

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  VENDOR_STATUSES.map((s) => [s.value, s.label])
);

export default function VendorCard({
  vendor,
  categories,
  budgetCategories,
  color,
  defaultExpanded = false,
  onCreateCategory,
  onUpdate,
  onDelete,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // the category is shared with the budget, so both move together
  async function handleCategoryChange(title: string) {
    if (title && !categories.some((c) => c.title === title)) {
      const fromBudget = budgetCategories.find((b) => b.title === title);
      await onCreateCategory(title, fromBudget?.color);
    }
    onUpdate({ category: title, budgetCategory: title });
  }

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
    <SwipeToDelete onDelete={onDelete} disabled={expanded}>
      <div className="card vendor-card" style={{ borderLeftColor: color ?? "#ccc" }}>
        <button className="card-header" onClick={toggleExpanded} aria-expanded={expanded}>
          <span className={`chevron ${expanded ? "open" : ""}`}><IconChevronRight /></span>
          <span className="card-title">{vendor.name}</span>
          <span className={`status-pill status-${vendor.status}`}>{STATUS_LABEL[vendor.status] ?? vendor.status}</span>
        </button>

        {expanded && !editing && (
          <div className="card-body card-view">
            <div className="view-block">
              <span className="view-label">Contact</span>
              <p className="notes-text">{vendor.contact || <em>No contact info yet.</em>}</p>
            </div>

            <div className="view-block">
              <span className="view-label">Cost</span>
              <CostBreakdown baseLabel="Base cost" base={vendor.cost} extras={vendor.extras ?? []} currency={vendor.currency} />
            </div>

            {vendor.downpayment > 0 && (
              <div className="view-block">
                <span className="view-label">Downpayment</span>
                <p className="notes-text">
                  {formatMoney(vendor.downpayment, vendor.currency)}
                  {vendor.status !== "paid" && (
                    <span className="vendor-balance">
                      {" "}
                      · {formatMoney(
                        Math.max(0, vendor.cost + extrasTotal(vendor.extras) - vendor.downpayment),
                        vendor.currency
                      )} left to pay
                    </span>
                  )}
                </p>
              </div>
            )}

            <div className="view-block">
              <span className="view-label">Budget</span>
              <p className="notes-text">
                {vendor.status === "inquired"
                  ? "Added to your budget from Downpayment onwards"
                  : `On your budget · ${vendor.category || "Uncategorized"}`}
              </p>
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

            <label className="title-field">
              Contact
              <input type="text" value={vendor.contact} onChange={(e) => onUpdate({ contact: e.target.value })} />
            </label>

            <div className="field-row">
              <label>
                Category
                <Dropdown
                  value={vendor.category}
                  onChange={handleCategoryChange}
                  placeholder="No category"
                  options={vendorCategoryOptions(categories, budgetCategories)}
                  className="category-dropdown"
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

            <label className="title-field">
              Cost
              <input
                type="number"
                min={0}
                placeholder="0"
                value={vendor.cost || ""}
                onChange={(e) => onUpdate({ cost: Math.max(0, Number(e.target.value) || 0) })}
              />
            </label>

            <label className="title-field">
              Downpayment
              <input
                type="number"
                min={0}
                placeholder="0"
                value={vendor.downpayment || ""}
                onChange={(e) => onUpdate({ downpayment: Math.max(0, Number(e.target.value) || 0) })}
              />
            </label>

            <label className="title-field">
              Currency
              <Dropdown
                value={vendor.currency}
                onChange={(v) => onUpdate({ currency: v as Currency })}
                options={CURRENCIES}
              />
            </label>

            <ExtraCostsEditor extras={vendor.extras ?? []} onChange={(extras) => onUpdate({ extras })} />

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
    </SwipeToDelete>
  );
}

import { useState } from "react";
import type { BudgetCategory, BudgetItem, Currency } from "../types";
import { IconChevronRight, IconTrash } from "./Icons";
import Dropdown from "./Dropdown";
import { CURRENCIES, PURCHASES_CATEGORY } from "../constants";
import { extrasTotal, formatMoney } from "../money";
import { CostBreakdown, ExtraCostsEditor } from "./ExtraCosts";

type Props = {
  budgetItem: BudgetItem;
  categories: BudgetCategory[];
  mode: "estimated" | "actual";
  color?: string;
  defaultExpanded?: boolean;
  onUpdate: (patch: Partial<Pick<BudgetItem, "item" | "category" | "currency" | "estimated" | "actual" | "paid" | "downpayment" | "notes" | "extras">>) => void;
  onDelete: () => void;
};

export default function BudgetItemCard({ budgetItem, categories, mode, color, defaultExpanded = false, onUpdate, onDelete }: Props) {
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
    <div className="card budget-card" style={{ borderLeftColor: color ?? "#ccc" }}>
      <button className="card-header" onClick={toggleExpanded} aria-expanded={expanded}>
        <span className={`chevron ${expanded ? "open" : ""}`}><IconChevronRight /></span>
        <span className="card-title">{budgetItem.item}</span>
        {budgetItem.sourceVendorId && <span className="vendor-link-pill">Vendor</span>}
        <span className={`paid-pill ${budgetItem.paid ? "paid" : ""}`}>{budgetItem.paid ? "Paid" : "Unpaid"}</span>
      </button>

      {expanded && !editing && (
        <div className="card-body card-view">
          <div className="view-block">
            <span className="view-label">{mode === "estimated" ? "Estimated" : "Actual"}</span>
            <CostBreakdown
              baseLabel="Base cost"
              base={mode === "estimated" ? budgetItem.estimated : budgetItem.actual}
              extras={budgetItem.extras ?? []}
              currency={budgetItem.currency}
            />
          </div>

          {budgetItem.sourceVendorId && (budgetItem.downpayment ?? 0) > 0 && (
            <div className="view-block">
              <span className="view-label">Downpayment</span>
              <p className="notes-text">
                {formatMoney(budgetItem.downpayment ?? 0, budgetItem.currency)}
                {!budgetItem.paid && (
                  <span className="vendor-balance">
                    {" "}
                    · {formatMoney(
                      Math.max(0, budgetItem.actual + extrasTotal(budgetItem.extras) - (budgetItem.downpayment ?? 0)),
                      budgetItem.currency
                    )} left
                    to pay
                  </span>
                )}
              </p>
            </div>
          )}

          <div className="view-block">
            <span className="view-label">Notes</span>
            <p className="notes-text">{budgetItem.notes || <em>No notes yet.</em>}</p>
          </div>

          <div className="card-footer">
            <button className="btn small ghost card-footer-right" onClick={() => setEditing(true)}>Edit</button>
          </div>
        </div>
      )}

      {expanded && editing && (
        <div className="card-body">
          <label className="title-field">
            Item
            <input type="text" value={budgetItem.item} onChange={(e) => onUpdate({ item: e.target.value })} />
          </label>

          <label className="title-field">
            Category
            <Dropdown
              value={budgetItem.category}
              onChange={(v) => onUpdate({ category: v })}
              options={categories
                // a vendor's line can't move into the budget-only Purchases category
                .filter((c) => !(budgetItem.sourceVendorId && c.title === PURCHASES_CATEGORY))
                .map((c) => ({ value: c.title, label: c.title }))}
              className="category-dropdown"
            />
          </label>

          <div className="field-row">
            <label>
              Currency
              <Dropdown
                value={budgetItem.currency}
                onChange={(v) => onUpdate({ currency: v as Currency })}
                options={CURRENCIES}
              />
            </label>
            <label>
              Estimated
              <input
                type="number"
                min={0}
                placeholder="0"
                value={budgetItem.estimated || ""}
                onChange={(e) => onUpdate({ estimated: Math.max(0, Number(e.target.value) || 0) })}
              />
            </label>
            <label>
              Actual
              <input
                type="number"
                min={0}
                placeholder="0"
                value={budgetItem.actual || ""}
                onChange={(e) => onUpdate({ actual: Math.max(0, Number(e.target.value) || 0) })}
              />
            </label>
          </div>

          {budgetItem.sourceVendorId && (
            <label className="title-field">
              Downpayment
              <input
                type="number"
                min={0}
                placeholder="0"
                value={budgetItem.downpayment || ""}
                onChange={(e) => onUpdate({ downpayment: Math.max(0, Number(e.target.value) || 0) })}
              />
            </label>
          )}

          <ExtraCostsEditor extras={budgetItem.extras ?? []} onChange={(extras) => onUpdate({ extras })} />

          <div className="notes-block">
            <div className="notes-block-header">
              <span>Notes</span>
            </div>
            <textarea
              value={budgetItem.notes ?? ""}
              onChange={(e) => onUpdate({ notes: e.target.value })}
              rows={3}
              placeholder="Add notes for this expense…"
            />
          </div>

          <label className="checkbox-field">
            <input type="checkbox" checked={budgetItem.paid} onChange={(e) => onUpdate({ paid: e.target.checked })} />
            Paid
          </label>

          {budgetItem.sourceVendorId && (
            <p className="form-hint">
              Linked to a vendor — changes to the name, category, currency, actual cost, downpayment, extra expenses,
              notes and paid status also update it on the Vendors page.
            </p>
          )}

          <div className="card-footer">
            {confirmDelete ? (
              <span className="confirm-row">
                {budgetItem.sourceVendorId ? "Remove from budget? The vendor stays, set back to Inquired." : "Delete this expense?"}
                <button className="btn small danger" onClick={onDelete}>Delete</button>
                <button className="btn small ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
              </span>
            ) : (
              <button className="icon-btn danger" title="Delete expense" onClick={() => setConfirmDelete(true)}>
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

import { useState } from "react";
import type { BudgetCategory, BudgetItem, Currency } from "../types";
import { IconChevronRight, IconTrash } from "./Icons";
import Dropdown from "./Dropdown";
import { CURRENCIES } from "../constants";
import { formatMoney } from "../money";

type Props = {
  budgetItem: BudgetItem;
  categories: BudgetCategory[];
  defaultExpanded?: boolean;
  onUpdate: (patch: Partial<Pick<BudgetItem, "item" | "category" | "currency" | "estimated" | "actual" | "paid">>) => void;
  onDelete: () => void;
};

export default function BudgetItemCard({ budgetItem, categories, defaultExpanded = false, onUpdate, onDelete }: Props) {
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
    <div className="card budget-card">
      <button className="card-header" onClick={toggleExpanded} aria-expanded={expanded}>
        <span className={`chevron ${expanded ? "open" : ""}`}><IconChevronRight /></span>
        <span className="card-title">{budgetItem.item}</span>
        <span className={`paid-pill ${budgetItem.paid ? "paid" : ""}`}>{budgetItem.paid ? "Paid" : "Unpaid"}</span>
      </button>

      {expanded && !editing && (
        <div className="card-body card-view">
          <div className="card-meta">{budgetItem.category}</div>

          <div className="view-block">
            <span className="view-label">Estimated</span>
            <p className="notes-text">{formatMoney(budgetItem.estimated, budgetItem.currency)}</p>
          </div>

          <div className="view-block">
            <span className="view-label">Actual</span>
            <p className="notes-text">{formatMoney(budgetItem.actual, budgetItem.currency)}</p>
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
              options={categories.map((c) => ({ value: c.title, label: c.title }))}
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
                value={budgetItem.estimated}
                onChange={(e) => onUpdate({ estimated: Math.max(0, Number(e.target.value) || 0) })}
              />
            </label>
            <label>
              Actual
              <input
                type="number"
                min={0}
                value={budgetItem.actual}
                onChange={(e) => onUpdate({ actual: Math.max(0, Number(e.target.value) || 0) })}
              />
            </label>
          </div>

          <label className="checkbox-field">
            <input type="checkbox" checked={budgetItem.paid} onChange={(e) => onUpdate({ paid: e.target.checked })} />
            Paid
          </label>

          <div className="card-footer">
            {confirmDelete ? (
              <span className="confirm-row">
                Delete this expense?
                <button className="btn small danger" onClick={onDelete}>Yes, delete</button>
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

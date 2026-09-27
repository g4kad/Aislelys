import { useState } from "react";
import type { BudgetCategory } from "../types";
import Modal from "./Modal";
import { SECTION_COLORS } from "../palette";
import { GENERIC_BUDGET_CATEGORIES } from "../constants";
import { IconClose } from "./Icons";

type Props = {
  categories: BudgetCategory[];
  onClose: () => void;
  onCreate: (title: string, color: string) => void;
  onUpdate: (id: string, patch: Partial<Pick<BudgetCategory, "title" | "color">>) => void;
  onDelete: (id: string) => void;
};

export default function BudgetCategoryManagerModal({ categories, onClose, onCreate, onUpdate, onDelete }: Props) {
  const [newTitle, setNewTitle] = useState("");
  const [newColor, setNewColor] = useState(SECTION_COLORS[0].value);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftColor, setDraftColor] = useState("");

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreate(newTitle.trim(), newColor);
    setNewTitle("");
  }

  function startEdit(category: BudgetCategory) {
    setEditingId(category.id);
    setDraftTitle(category.title);
    setDraftColor(category.color);
    setConfirmDeleteId(null);
  }

  function saveEdit() {
    if (!editingId) return;
    if (draftTitle.trim()) {
      onUpdate(editingId, { title: draftTitle.trim(), color: draftColor });
    }
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  const existingTitles = new Set(categories.map((c) => c.title.trim().toLowerCase()));
  const suggestions = GENERIC_BUDGET_CATEGORIES.filter((title) => !existingTitles.has(title.toLowerCase()));

  return (
    <Modal title="Manage categories" onClose={onClose}>
      <ul className="section-manage-list">
        {categories.map((c) => {
          const isEditing = editingId === c.id;
          return (
            <li key={c.id} className="section-manage-row">
              {isEditing ? (
                <div className="section-manage-edit">
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    autoFocus
                  />
                  <div className="color-swatches">
                    {SECTION_COLORS.map((sc) => (
                      <button
                        type="button"
                        key={sc.value}
                        className={`swatch ${draftColor === sc.value ? "selected" : ""}`}
                        style={{ background: sc.value }}
                        title={sc.name}
                        onClick={() => setDraftColor(sc.value)}
                      />
                    ))}
                  </div>
                  <div className="btn-row">
                    <button className="btn small primary" onClick={saveEdit}>Save</button>
                    <button className="btn small ghost" onClick={cancelEdit}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="section-dot" style={{ background: c.color }} />
                  <span className="section-title-view">{c.title}</span>
                  <div className="btn-row">
                    <button className="btn small ghost" onClick={() => startEdit(c)}>Edit</button>
                    {confirmDeleteId === c.id ? (
                      <span className="confirm-row">
                        <button className="btn small danger" onClick={() => { onDelete(c.id); setConfirmDeleteId(null); }}>
                          Confirm
                        </button>
                        <button className="btn small ghost" onClick={() => setConfirmDeleteId(null)}>
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button className="icon-btn" title="Delete category" onClick={() => setConfirmDeleteId(c.id)}>
                        <IconClose />
                      </button>
                    )}
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>

      {!editingId && (
        <form className="event-form" onSubmit={handleCreate}>
          <label>
            New category title
            <input
              type="text"
              placeholder="e.g. Attire"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </label>
          {suggestions.length > 0 && (
            <div className="category-suggestions">
              <span className="category-suggestions-label">Or pick a common one:</span>
              <div className="category-suggestions-row">
                {suggestions.map((title) => (
                  <button
                    key={title}
                    type="button"
                    className="category-suggestion-chip"
                    onClick={() => setNewTitle(title)}
                  >
                    {title}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="color-swatches">
            {SECTION_COLORS.map((c) => (
              <button
                type="button"
                key={c.value}
                className={`swatch ${newColor === c.value ? "selected" : ""}`}
                style={{ background: c.value }}
                title={c.name}
                onClick={() => setNewColor(c.value)}
              />
            ))}
          </div>
          <div className="btn-row">
            <button type="submit" className="btn primary">Add category</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

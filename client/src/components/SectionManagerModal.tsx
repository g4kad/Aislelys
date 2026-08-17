import { useState } from "react";
import type { Section } from "../types";
import Modal from "./Modal";
import { SECTION_COLORS } from "../palette";
import { IconClose } from "./Icons";

type Props = {
  sections: Section[];
  onClose: () => void;
  onCreate: (title: string, color: string) => void;
  onUpdate: (id: string, patch: Partial<Pick<Section, "title" | "color">>) => void;
  onDelete: (id: string) => void;
};

export default function SectionManagerModal({ sections, onClose, onCreate, onUpdate, onDelete }: Props) {
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

  function startEdit(section: Section) {
    setEditingId(section.id);
    setDraftTitle(section.title);
    setDraftColor(section.color);
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

  return (
    <Modal title="Manage sections" onClose={onClose}>
      <ul className="section-manage-list">
        {sections.map((s) => {
          const isEditing = editingId === s.id;
          return (
            <li key={s.id} className="section-manage-row">
              {isEditing ? (
                <>
                  <div className="color-swatches">
                    {SECTION_COLORS.map((c) => (
                      <button
                        type="button"
                        key={c.value}
                        className={`swatch ${draftColor === c.value ? "selected" : ""}`}
                        style={{ background: c.value }}
                        title={c.name}
                        onClick={() => setDraftColor(c.value)}
                      />
                    ))}
                  </div>
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    autoFocus
                  />
                  <div className="btn-row">
                    <button className="btn small primary" onClick={saveEdit}>Save</button>
                    <button className="btn small ghost" onClick={cancelEdit}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <span className="section-dot" style={{ background: s.color }} />
                  <span className="section-title-view">{s.title}</span>
                  <div className="btn-row">
                    <button className="btn small ghost" onClick={() => startEdit(s)}>Edit</button>
                    {confirmDeleteId === s.id ? (
                      <span className="confirm-row">
                        <button className="btn small danger" onClick={() => { onDelete(s.id); setConfirmDeleteId(null); }}>
                          Confirm
                        </button>
                        <button className="btn small ghost" onClick={() => setConfirmDeleteId(null)}>
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button className="icon-btn" title="Delete section" onClick={() => setConfirmDeleteId(s.id)}>
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

      <form className="event-form" onSubmit={handleCreate}>
        <label>
          New section title
          <input
            type="text"
            placeholder="e.g. Ceremony Day"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
        </label>
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
          <button type="submit" className="btn primary">Add section</button>
        </div>
      </form>
    </Modal>
  );
}

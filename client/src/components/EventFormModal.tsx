import { useState } from "react";
import type { Section } from "../types";
import Modal from "./Modal";
import Dropdown from "./Dropdown";
import { SECTION_COLORS } from "../palette";

type Props = {
  initialDate: string;
  sections: Section[];
  onClose: () => void;
  onCreate: (data: { title: string; date: string; time: string; sectionId: string | null; notes: string }) => void;
  onCreateSection: (title: string, color: string) => Promise<Section>;
};

export default function EventFormModal({ initialDate, sections, onClose, onCreate, onCreateSection }: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState("");
  const [sectionId, setSectionId] = useState<string>(sections[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [creatingSection, setCreatingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionColor, setNewSectionColor] = useState(SECTION_COLORS[0].value);

  async function handleAddSection() {
    if (!newSectionTitle.trim()) return;
    const section = await onCreateSection(newSectionTitle.trim(), newSectionColor);
    setSectionId(section.id);
    setNewSectionTitle("");
    setCreatingSection(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    onCreate({ title: title.trim(), date, time, sectionId: sectionId || null, notes: notes.trim() });
    onClose();
  }

  return (
    <Modal title="Add task" onClose={onClose}>
      <form className="event-form" onSubmit={handleSubmit}>
        <label>
          Title
          <input
            type="text"
            placeholder="e.g. Book the venue"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            required
          />
        </label>

        <div className="field-row">
          <label>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            Time (optional)
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>

        <label>
          Section
          <Dropdown
            value={sectionId}
            onChange={setSectionId}
            placeholder="No section"
            options={[
              { value: "", label: "No section" },
              ...sections.map((s) => ({ value: s.id, label: s.title })),
            ]}
          />
        </label>

        {!creatingSection ? (
          <button type="button" className="link-btn" onClick={() => setCreatingSection(true)}>
            + Create a new section
          </button>
        ) : (
          <div className="inline-create-box">
            <input
              type="text"
              placeholder="Section title (e.g. Set Up)"
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
            />
            <div className="color-swatches">
              {SECTION_COLORS.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  className={`swatch ${newSectionColor === c.value ? "selected" : ""}`}
                  style={{ background: c.value }}
                  title={c.name}
                  onClick={() => setNewSectionColor(c.value)}
                />
              ))}
            </div>
            <div className="btn-row">
              <button type="button" className="btn small" onClick={handleAddSection}>
                Add section
              </button>
              <button type="button" className="btn small ghost" onClick={() => setCreatingSection(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <label>
          Notes
          <textarea
            rows={3}
            placeholder="Any details worth remembering…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <div className="btn-row">
          <button type="submit" className="btn primary">Add task</button>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

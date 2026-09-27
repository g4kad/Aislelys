import { useState } from "react";
import type { VendorCategory } from "../types";
import Modal from "./Modal";
import Dropdown from "./Dropdown";
import { VENDOR_STATUSES, GENERIC_VENDOR_CATEGORIES } from "../constants";
import { useIsMobile } from "../useIsMobile";

type Props = {
  categories: VendorCategory[];
  onClose: () => void;
  onCreate: (data: {
    name: string;
    category: string;
    contact: string;
    cost: number;
    status: string;
    notes: string;
  }) => void;
  onCreateCategory: (title: string) => Promise<VendorCategory>;
};

export default function VendorFormModal({ categories, onClose, onCreate, onCreateCategory }: Props) {
  const isMobile = useIsMobile();
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0]?.title ?? "");
  const [contact, setContact] = useState("");
  const [cost, setCost] = useState("");
  const [status, setStatus] = useState<string>("inquired");
  const [notes, setNotes] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState("");

  async function handleAddCategory() {
    if (!newCategoryTitle.trim()) return;
    const created = await onCreateCategory(newCategoryTitle.trim());
    setCategory(created.title);
    setNewCategoryTitle("");
    setCreatingCategory(false);
  }

  async function handleCategoryChange(value: string) {
    const alreadyExists = categories.some((c) => c.title === value);
    if (!alreadyExists && value) {
      const created = await onCreateCategory(value);
      setCategory(created.title);
    } else {
      setCategory(value);
    }
  }

  const existingTitles = new Set(categories.map((c) => c.title.trim().toLowerCase()));
  const suggestions = GENERIC_VENDOR_CATEGORIES.filter((title) => !existingTitles.has(title.toLowerCase()));
  const categoryOptions = [
    ...categories.map((c) => ({ value: c.title, label: c.title })),
    ...suggestions.map((title) => ({ value: title, label: title })),
  ];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      category: category || "",
      contact: contact.trim(),
      cost: Math.max(0, Number(cost) || 0),
      status,
      notes: notes.trim(),
    });
    onClose();
  }

  return (
    <Modal title="Add vendor" onClose={onClose}>
      <form className="event-form" onSubmit={handleSubmit}>
        <label>
          Name
          <input
            type="text"
            placeholder="e.g. Concorde Hotel Catering"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus={!isMobile}
            required
          />
        </label>

        <div className="field-row">
          <label>
            Category
            <Dropdown
              value={category}
              onChange={handleCategoryChange}
              placeholder="No category"
              options={categoryOptions}
              className="category-dropdown"
            />
          </label>
          <label>
            Status
            <Dropdown
              value={status}
              onChange={setStatus}
              options={VENDOR_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
            />
          </label>
        </div>

        {!creatingCategory ? (
          <button type="button" className="link-btn" onClick={() => setCreatingCategory(true)}>
            + Add category
          </button>
        ) : (
          <div className="inline-create-box">
            <input
              type="text"
              placeholder="Category name (e.g. Caterer)"
              value={newCategoryTitle}
              onChange={(e) => setNewCategoryTitle(e.target.value)}
              autoFocus={!isMobile}
            />
            <div className="btn-row">
              <button type="button" className="btn small" onClick={handleAddCategory}>
                Add category
              </button>
              <button type="button" className="btn small ghost" onClick={() => setCreatingCategory(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="field-row">
          <label>
            Contact
            <input
              type="text"
              placeholder="e.g. 012-345 6789"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </label>
          <label>
            Cost (RM)
            <input
              type="number"
              min={0}
              placeholder="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </label>
        </div>

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
          <button type="submit" className="btn primary">Add vendor</button>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

import { useState } from "react";
import Modal from "./Modal";
import Dropdown from "./Dropdown";
import { VENDOR_CATEGORIES, VENDOR_STATUSES } from "../constants";

type Props = {
  onClose: () => void;
  onCreate: (data: {
    name: string;
    category: string;
    contact: string;
    cost: number;
    status: string;
    notes: string;
  }) => void;
};

export default function VendorFormModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(VENDOR_CATEGORIES[0]);
  const [contact, setContact] = useState("");
  const [cost, setCost] = useState("");
  const [status, setStatus] = useState<string>("inquired");
  const [notes, setNotes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      category,
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
            autoFocus
            required
          />
        </label>

        <div className="field-row">
          <label>
            Category
            <Dropdown
              value={category}
              onChange={setCategory}
              options={VENDOR_CATEGORIES.map((c) => ({ value: c, label: c }))}
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

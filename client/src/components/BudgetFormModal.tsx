import { useState } from "react";
import type { BudgetCategory, Currency, ExtraCost } from "../types";
import { ExtraCostsEditor } from "./ExtraCosts";
import Modal from "./Modal";
import Dropdown from "./Dropdown";
import { CURRENCIES, GENERIC_BUDGET_CATEGORIES, PURCHASES_CATEGORY } from "../constants";
import { useIsMobile } from "../useIsMobile";

type Props = {
  categories: BudgetCategory[];
  onClose: () => void;
  onCreate: (data: {
    item: string;
    category: string;
    currency: Currency;
    estimated: number;
    actual: number;
    paid: boolean;
    notes: string;
    extras: ExtraCost[];
  }) => void;
  onCreateCategory: (title: string) => Promise<BudgetCategory>;
};

export default function BudgetFormModal({ categories, onClose, onCreate, onCreateCategory }: Props) {
  const isMobile = useIsMobile();
  const [item, setItem] = useState("");
  const [category, setCategory] = useState(PURCHASES_CATEGORY);
  const [currency, setCurrency] = useState<Currency>("SGD");
  const [actual, setActual] = useState("");
  const [paid, setPaid] = useState(false);
  const [notes, setNotes] = useState("");
  const [extras, setExtras] = useState<ExtraCost[]>([]);
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
    const alreadyExists = value === PURCHASES_CATEGORY || categories.some((c) => c.title === value);
    if (!alreadyExists && value) {
      const created = await onCreateCategory(value);
      setCategory(created.title);
    } else {
      setCategory(value);
    }
  }

  // Purchases always comes first (it may not exist yet — the server creates it)
  const existingTitles = new Set(categories.map((c) => c.title.trim().toLowerCase()));
  const suggestions = GENERIC_BUDGET_CATEGORIES.filter((title) => !existingTitles.has(title.toLowerCase()));
  const categoryOptions = [
    { value: PURCHASES_CATEGORY, label: PURCHASES_CATEGORY },
    ...categories.filter((c) => c.title !== PURCHASES_CATEGORY).map((c) => ({ value: c.title, label: c.title })),
    ...suggestions.map((title) => ({ value: title, label: title })),
  ];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item.trim()) return;
    onCreate({
      item: item.trim(),
      category: category || PURCHASES_CATEGORY,
      currency,
      estimated: Math.max(0, Number(actual) || 0),
      actual: Math.max(0, Number(actual) || 0),
      paid,
      notes: notes.trim(),
      extras,
    });
    onClose();
  }

  return (
    <Modal title="Add expense" onClose={onClose}>
      <form className="event-form" onSubmit={handleSubmit}>
        <label>
          Item
          <input
            type="text"
            placeholder="e.g. Wedding gown"
            value={item}
            onChange={(e) => setItem(e.target.value)}
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
            Currency
            <Dropdown
              value={currency}
              onChange={(v) => setCurrency(v as Currency)}
              options={CURRENCIES}
            />
          </label>
        </div>

        {!creatingCategory ? (
          <button type="button" className="link-btn" onClick={() => setCreatingCategory(true)}>
            + Create a new category
          </button>
        ) : (
          <div className="inline-create-box">
            <input
              type="text"
              placeholder="Category name (e.g. Rentals)"
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
            Cost
            <input
              type="number"
              min={0}
              placeholder="0"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
            />
          </label>
        </div>

        <ExtraCostsEditor extras={extras} onChange={setExtras} />

        <label>
          Notes
          <textarea
            rows={3}
            placeholder="Any details worth remembering…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <label className="checkbox-field">
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
          Paid
        </label>

        <p className="form-hint">
          {category === PURCHASES_CATEGORY
            ? "Purchases are day-to-day expenses and stay on the budget only."
            : "This will also be added to your vendors."}
        </p>

        <div className="btn-row">
          <button type="submit" className="btn primary">Add expense</button>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

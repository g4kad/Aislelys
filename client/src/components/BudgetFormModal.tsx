import { useState } from "react";
import type { BudgetCategory, Currency } from "../types";
import Modal from "./Modal";
import Dropdown from "./Dropdown";
import { CURRENCIES } from "../constants";

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
  }) => void;
  onCreateCategory: (title: string) => Promise<BudgetCategory>;
};

export default function BudgetFormModal({ categories, onClose, onCreate, onCreateCategory }: Props) {
  const [item, setItem] = useState("");
  const [category, setCategory] = useState(categories[0]?.title ?? "");
  const [currency, setCurrency] = useState<Currency>("SGD");
  const [estimated, setEstimated] = useState("");
  const [actual, setActual] = useState("");
  const [paid, setPaid] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState("");

  async function handleAddCategory() {
    if (!newCategoryTitle.trim()) return;
    const created = await onCreateCategory(newCategoryTitle.trim());
    setCategory(created.title);
    setNewCategoryTitle("");
    setCreatingCategory(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item.trim()) return;
    onCreate({
      item: item.trim(),
      category: category || "Other",
      currency,
      estimated: Math.max(0, Number(estimated) || 0),
      actual: Math.max(0, Number(actual) || 0),
      paid,
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
              placeholder="No category"
              options={categories.map((c) => ({ value: c.title, label: c.title }))}
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
              autoFocus
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
            Estimated
            <input
              type="number"
              min={0}
              placeholder="0"
              value={estimated}
              onChange={(e) => setEstimated(e.target.value)}
            />
          </label>
          <label>
            Actual
            <input
              type="number"
              min={0}
              placeholder="0"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
            />
          </label>
        </div>

        <label className="checkbox-field">
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
          Paid
        </label>

        <div className="btn-row">
          <button type="submit" className="btn primary">Add expense</button>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

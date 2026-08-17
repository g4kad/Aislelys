import { useEffect, useMemo, useState } from "react";
import type { BudgetCategory, BudgetItem, Currency } from "../types";
import * as api from "../api";
import BudgetBoard from "../components/BudgetBoard";
import BudgetFormModal from "../components/BudgetFormModal";
import { formatSgd, toSgd } from "../money";

export default function BudgetPage() {
  const [total, setTotal] = useState(0);
  const [totalInput, setTotalInput] = useState("0");
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [myrToSgd, setMyrToSgd] = useState(0.31);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    Promise.all([api.getBudget(), api.getBudgetItems(), api.getBudgetCategories()])
      .then(([budget, budgetItems, budgetCategories]) => {
        setTotal(budget.total);
        setTotalInput(String(budget.total));
        setItems(budgetItems);
        setCategories(budgetCategories);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    // Keep the SGD conversion current without exposing any rate UI.
    api
      .refreshExchangeRate()
      .then((rate) => setMyrToSgd(rate.myrToSgd))
      .catch(() => api.getExchangeRate().then((rate) => setMyrToSgd(rate.myrToSgd)).catch(() => {}));
  }, []);

  async function handleCreateCategory(title: string): Promise<BudgetCategory> {
    const created = await api.createBudgetCategory(title);
    setCategories((prev) => [...prev, created]);
    return created;
  }

  const { estimatedSum, actualSum } = useMemo(
    () => ({
      estimatedSum: items.reduce((sum, i) => sum + toSgd(i.estimated, i.currency, myrToSgd), 0),
      actualSum: items.reduce((sum, i) => sum + toSgd(i.actual, i.currency, myrToSgd), 0),
    }),
    [items, myrToSgd]
  );
  const remaining = total - actualSum;

  async function commitTotal() {
    const next = Math.max(0, Number(totalInput) || 0);
    setTotal(next);
    setTotalInput(String(next));
    try {
      await api.updateBudget(next);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCreate(data: {
    item: string;
    category: string;
    currency: Currency;
    estimated: number;
    actual: number;
    paid: boolean;
  }) {
    try {
      const created = await api.createBudgetItem(data);
      setItems((prev) => [created, ...prev]);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleUpdate(
    id: string,
    patch: Partial<Pick<BudgetItem, "item" | "category" | "currency" | "estimated" | "actual" | "paid">>
  ) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    try {
      await api.updateBudgetItem(id, patch);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await api.deleteBudgetItem(id);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (loading) return <p className="empty-hint">Loading…</p>;

  return (
    <div className="budget-page">
      {error && (
        <div className="error-banner" onClick={() => setError(null)}>
          {error} (click to dismiss)
        </div>
      )}

      <div className="board-region-header">
        <h2 className="board-region-title">Budget</h2>
      </div>

      <p className="page-subtitle">
        Set your overall budget and log expenses in SGD or MYR — everything totals in SGD automatically.
      </p>

      <div className="budget-summary">
        <label className="budget-summary-stat budget-total-stat">
          <span className="budget-stat-label">Total budget (SGD)</span>
          <div className="budget-total-input-row">
            <span className="budget-currency-prefix">S$</span>
            <input
              type="number"
              min={0}
              value={totalInput}
              onChange={(e) => setTotalInput(e.target.value)}
              onBlur={commitTotal}
            />
          </div>
        </label>
        <div className="budget-summary-stat">
          <span className="budget-stat-label">Estimated (SGD)</span>
          <span className="budget-stat-value">{formatSgd(estimatedSum)}</span>
        </div>
        <div className="budget-summary-stat">
          <span className="budget-stat-label">Actual spent (SGD)</span>
          <span className="budget-stat-value">{formatSgd(actualSum)}</span>
        </div>
        <div className="budget-summary-stat">
          <span className="budget-stat-label">Remaining (SGD)</span>
          <span className={`budget-stat-value ${remaining < 0 ? "over" : ""}`}>{formatSgd(remaining)}</span>
        </div>
      </div>

      <div className="btn-row" style={{ marginBottom: 16 }}>
        <button type="button" className="btn primary" onClick={() => setShowAddModal(true)}>
          + Add expense
        </button>
      </div>

      {items.length === 0 ? (
        <p className="empty-hint">No expenses yet — add your first one above.</p>
      ) : (
        <BudgetBoard
          items={items}
          categories={categories}
          myrToSgd={myrToSgd}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      {showAddModal && (
        <BudgetFormModal
          categories={categories}
          onClose={() => setShowAddModal(false)}
          onCreate={handleCreate}
          onCreateCategory={handleCreateCategory}
        />
      )}
    </div>
  );
}

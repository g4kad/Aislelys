import { useEffect, useMemo, useState } from "react";
import type { BudgetCategory, BudgetItem, Currency, ExtraCost } from "../types";
import * as api from "../api";
import BudgetBoard from "../components/BudgetBoard";
import BudgetFormModal from "../components/BudgetFormModal";
import { budgetLineAmount, formatSgd, toSgd } from "../money";
import { SECTION_COLORS } from "../palette";

export default function BudgetPage() {
  const [total, setTotal] = useState(0);
  const [totalInput, setTotalInput] = useState("0");
  const [savingsInput, setSavingsInput] = useState("0");
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
        setSavingsInput(String(budget.savings));
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

  async function handleCreateCategory(title: string, color?: string): Promise<BudgetCategory> {
    const finalColor = color || SECTION_COLORS[categories.length % SECTION_COLORS.length].value;
    const created = await api.createBudgetCategory(title, finalColor);
    setCategories((prev) => [created, ...prev]);
    return created;
  }

  async function handleUpdateCategory(id: string, patch: Partial<Pick<BudgetCategory, "title" | "color">>) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    try {
      await api.updateBudgetCategory(id, patch);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDeleteCategory(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    try {
      await api.deleteBudgetCategory(id);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const spentSum = useMemo(
    () => items.reduce((sum, i) => sum + toSgd(budgetLineAmount(i), i.currency, myrToSgd), 0),
    [items, myrToSgd]
  );
  const remaining = total - spentSum;
  const savingsPercent = total > 0 ? Math.round(((Number(savingsInput) || 0) / total) * 100) : 0;

  async function commitTotal() {
    const next = Math.max(0, Number(totalInput) || 0);
    setTotal(next);
    setTotalInput(String(next));
    try {
      await api.updateBudget({ total: next });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function commitSavings() {
    const next = Math.max(0, Number(savingsInput) || 0);
    setSavingsInput(String(next));
    try {
      await api.updateBudget({ savings: next });
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
    notes: string;
    extras: ExtraCost[];
  }) {
    try {
      const created = await api.createBudgetItem(data);
      setItems((prev) => [created, ...prev]);
      // the server creates the category (e.g. Purchases) if it didn't exist yet
      if (!categories.some((c) => c.title === created.category)) {
        setCategories(await api.getBudgetCategories());
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleUpdate(
    id: string,
    patch: Partial<Pick<BudgetItem, "item" | "category" | "currency" | "estimated" | "actual" | "paid" | "downpayment" | "notes" | "extras">>
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
        <label className="budget-summary-stat budget-total-stat">
          <span className="budget-stat-label">Total savings</span>
          <div className="budget-total-input-row">
            <span className="budget-currency-prefix">S$</span>
            <input
              type="number"
              min={0}
              value={savingsInput}
              onChange={(e) => setSavingsInput(e.target.value)}
              onBlur={commitSavings}
            />
            {total > 0 && <span className="budget-savings-percent">({savingsPercent}%)</span>}
          </div>
        </label>
        <div className="budget-summary-stat">
          <span className="budget-stat-label">Remaining (SGD)</span>
          <span className={`budget-stat-value ${remaining < 0 ? "over" : "positive"}`}>{formatSgd(remaining)}</span>
        </div>
        <div className="budget-summary-stat budget-stat-highlight">
          <span className="budget-stat-label">Total (SGD)</span>
          <span className="budget-stat-value">{formatSgd(spentSum)}</span>
        </div>
      </div>

      <div className="btn-row" style={{ marginBottom: 16 }}>
        <button type="button" className="btn primary btn-add-primary" onClick={() => setShowAddModal(true)}>
          + Add expense
        </button>
      </div>

      <BudgetBoard
        items={items}
        categories={categories}
        myrToSgd={myrToSgd}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onCreateCategory={handleCreateCategory}
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={handleDeleteCategory}
      />

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

import { useMemo, useState } from "react";
import type { BudgetCategory, BudgetItem } from "../types";
import BudgetItemCard from "./BudgetItemCard";
import BudgetCategoryManagerModal from "./BudgetCategoryManagerModal";
import { budgetLineAmount, formatSgd, toSgd } from "../money";

type Props = {
  items: BudgetItem[];
  categories: BudgetCategory[];
  myrToSgd: number;
  onUpdate: (id: string, patch: Partial<Pick<BudgetItem, "item" | "category" | "currency" | "estimated" | "actual" | "paid" | "downpayment" | "notes" | "extras">>) => void;
  onDelete: (id: string) => void;
  onCreateCategory: (title: string, color: string) => void;
  onUpdateCategory: (id: string, patch: Partial<Pick<BudgetCategory, "title" | "color">>) => void;
  onDeleteCategory: (id: string) => void;
  formatTotal?: (amount: number) => string; // category subtotals; S$ by default
  amountFor?: (item: BudgetItem) => number; // what each line adds to its subtotal; its cost by default
  expandedIds?: string[]; // when set, exactly these lines are held open
};

export default function BudgetBoard({
  items,
  categories,
  myrToSgd,
  onUpdate,
  onDelete,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  formatTotal = formatSgd,
  amountFor = budgetLineAmount,
  expandedIds,
}: Props) {
  const [showManageCategories, setShowManageCategories] = useState(false);
  const groups = useMemo(() => {
    const byCategory = new Map<string, BudgetItem[]>();
    const uncategorized: BudgetItem[] = [];
    for (const item of items) {
      if (item.category && categories.some((c) => c.title === item.category)) {
        const list = byCategory.get(item.category) ?? [];
        list.push(item);
        byCategory.set(item.category, list);
      } else {
        uncategorized.push(item);
      }
    }
    return { byCategory, uncategorized };
  }, [items, categories]);

  function categorySgd(list: BudgetItem[]) {
    return list.reduce((sum, i) => sum + toSgd(amountFor(i), i.currency, myrToSgd), 0);
  }

  const subtotalLabel = "spent";

  return (
    <div className="board-sections">
      {items.length === 0 && <p className="empty-hint">No expenses yet.</p>}
      {/* empty categories are hidden here but still exist, so they stay in the pickers */}
      {categories.filter((category) => groups.byCategory.has(category.title)).map((category) => {
        const categoryItems = groups.byCategory.get(category.title) ?? [];
        return (
          <div className="board-section" style={{ borderLeftColor: category.color }} key={category.id}>
            <div className="board-section-header">
              <span className="section-dot" style={{ background: category.color }} />
              <h3>{category.title}</h3>
              <span className="section-subtotal">{formatTotal(categorySgd(categoryItems))} {subtotalLabel}</span>
              <span className="section-count">{categoryItems.length}</span>
            </div>
            <div className="card-list">
                {categoryItems.map((item) => (
                  <BudgetItemCard
                    key={item.id}
                    budgetItem={item}
                    categories={categories}
                    color={category.color}
                    expanded={expandedIds?.includes(item.id)}
                    onUpdate={(patch) => onUpdate(item.id, patch)}
                    onDelete={() => onDelete(item.id)}
                  />
                ))}
            </div>
          </div>
        );
      })}

      {groups.uncategorized.length > 0 && (
        <div className="board-section" style={{ borderLeftColor: "#ede2cc" }}>
          <div className="board-section-header">
            <span className="section-dot" style={{ background: "#ede2cc" }} />
            <h3>Uncategorized</h3>
            <span className="section-subtotal">{formatTotal(categorySgd(groups.uncategorized))} {subtotalLabel}</span>
            <span className="section-count">{groups.uncategorized.length}</span>
          </div>
          <div className="card-list">
            {groups.uncategorized.map((item) => (
              <BudgetItemCard
                key={item.id}
                budgetItem={item}
                categories={categories}
                color="#ede2cc"
                expanded={expandedIds?.includes(item.id)}
                onUpdate={(patch) => onUpdate(item.id, patch)}
                onDelete={() => onDelete(item.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="board-footer">
        <button className="btn ghost" onClick={() => setShowManageCategories(true)}>Manage categories</button>
      </div>

      {showManageCategories && (
        <BudgetCategoryManagerModal
          categories={categories}
          onClose={() => setShowManageCategories(false)}
          onCreate={onCreateCategory}
          onUpdate={onUpdateCategory}
          onDelete={onDeleteCategory}
        />
      )}
    </div>
  );
}

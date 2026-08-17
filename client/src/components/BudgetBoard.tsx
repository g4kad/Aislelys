import { useMemo } from "react";
import type { BudgetCategory, BudgetItem } from "../types";
import BudgetItemCard from "./BudgetItemCard";
import { SECTION_COLORS } from "../palette";
import { formatSgd, toSgd } from "../money";

type Props = {
  items: BudgetItem[];
  categories: BudgetCategory[];
  myrToSgd: number;
  onUpdate: (id: string, patch: Partial<Pick<BudgetItem, "item" | "category" | "currency" | "estimated" | "actual" | "paid">>) => void;
  onDelete: (id: string) => void;
};

export default function BudgetBoard({ items, categories, myrToSgd, onUpdate, onDelete }: Props) {
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

  function categoryActualSgd(list: BudgetItem[]) {
    return list.reduce((sum, i) => sum + toSgd(i.actual, i.currency, myrToSgd), 0);
  }

  return (
    <div className="board-sections">
      {categories.map((category, index) => {
        const categoryItems = groups.byCategory.get(category.title) ?? [];
        if (categoryItems.length === 0) return null;
        const color = SECTION_COLORS[index % SECTION_COLORS.length].value;
        return (
          <div className="board-section" key={category.id}>
            <div className="board-section-header" style={{ borderLeftColor: color }}>
              <span className="section-dot" style={{ background: color }} />
              <h3>{category.title}</h3>
              <span className="section-subtotal">{formatSgd(categoryActualSgd(categoryItems))} spent</span>
              <span className="section-count">{categoryItems.length}</span>
            </div>
            <div className="card-list">
              {categoryItems.map((item) => (
                <BudgetItemCard
                  key={item.id}
                  budgetItem={item}
                  categories={categories}
                  onUpdate={(patch) => onUpdate(item.id, patch)}
                  onDelete={() => onDelete(item.id)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {groups.uncategorized.length > 0 && (
        <div className="board-section">
          <div className="board-section-header" style={{ borderLeftColor: "#bbb" }}>
            <span className="section-dot" style={{ background: "#bbb" }} />
            <h3>Uncategorized</h3>
            <span className="section-subtotal">{formatSgd(categoryActualSgd(groups.uncategorized))} spent</span>
            <span className="section-count">{groups.uncategorized.length}</span>
          </div>
          <div className="card-list">
            {groups.uncategorized.map((item) => (
              <BudgetItemCard
                key={item.id}
                budgetItem={item}
                categories={categories}
                onUpdate={(patch) => onUpdate(item.id, patch)}
                onDelete={() => onDelete(item.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

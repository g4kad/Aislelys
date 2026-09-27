import { useMemo, useState } from "react";
import type { BudgetCategory, Vendor, VendorCategory } from "../types";
import VendorCard from "./VendorCard";
import VendorCategoryManagerModal from "./VendorCategoryManagerModal";
import { IconChevronRight } from "./Icons";

type Props = {
  vendors: Vendor[];
  categories: VendorCategory[];
  budgetCategories: BudgetCategory[];
  onUpdate: (id: string, patch: Partial<Pick<Vendor, "name" | "category" | "contact" | "cost" | "status" | "notes" | "currency" | "budgetCategory" | "downpayment">>) => void;
  onDelete: (id: string) => void;
  onCreateCategory: (title: string, color: string) => void;
  onUpdateCategory: (id: string, patch: Partial<Pick<VendorCategory, "title" | "color">>) => void;
  onDeleteCategory: (id: string) => void;
};

export default function VendorsBoard({
  vendors,
  categories,
  budgetCategories,
  onUpdate,
  onDelete,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: Props) {
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const byCategory = new Map<string, Vendor[]>();
    const uncategorized: Vendor[] = [];
    for (const vendor of vendors) {
      if (vendor.category && categories.some((c) => c.title === vendor.category)) {
        const list = byCategory.get(vendor.category) ?? [];
        list.push(vendor);
        byCategory.set(vendor.category, list);
      } else {
        uncategorized.push(vendor);
      }
    }
    return { byCategory, uncategorized };
  }, [vendors, categories]);

  function toggleCollapsed(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="board">
      <div className="board-sections">
        {categories.map((category) => {
          const categoryVendors = groups.byCategory.get(category.title) ?? [];
          const isOpen = !collapsed.has(category.id);
          return (
            <div className="board-section" style={{ borderLeftColor: category.color }} key={category.id}>
              <button
                type="button"
                className="board-section-header board-section-header-toggle"
                onClick={() => toggleCollapsed(category.id)}
                aria-expanded={isOpen}
              >
                <span className={`chevron ${isOpen ? "open" : ""}`}><IconChevronRight /></span>
                <span className="section-dot" style={{ background: category.color }} />
                <h3>{category.title}</h3>
                <span className="section-count">{categoryVendors.length}</span>
              </button>
              {isOpen && (
                categoryVendors.length === 0 ? (
                  <p className="empty-hint">No vendors in this category yet.</p>
                ) : (
                  <div className="card-list">
                    {categoryVendors.map((vendor) => (
                      <VendorCard
                        key={vendor.id}
                        vendor={vendor}
                        categories={categories}
                        budgetCategories={budgetCategories}
                        color={category.color}
                        onUpdate={(patch) => onUpdate(vendor.id, patch)}
                        onDelete={() => onDelete(vendor.id)}
                      />
                    ))}
                  </div>
                )
              )}
            </div>
          );
        })}

        {groups.uncategorized.length > 0 && (
          <div className="board-section" style={{ borderLeftColor: "#ede2cc" }}>
            <button
              type="button"
              className="board-section-header board-section-header-toggle"
              onClick={() => toggleCollapsed("uncategorized")}
              aria-expanded={!collapsed.has("uncategorized")}
            >
              <span className={`chevron ${!collapsed.has("uncategorized") ? "open" : ""}`}><IconChevronRight /></span>
              <span className="section-dot" style={{ background: "#ede2cc" }} />
              <h3>Uncategorized</h3>
              <span className="section-count">{groups.uncategorized.length}</span>
            </button>
            {!collapsed.has("uncategorized") && (
              <div className="card-list">
                {groups.uncategorized.map((vendor) => (
                  <VendorCard
                    key={vendor.id}
                    vendor={vendor}
                    categories={categories}
                    budgetCategories={budgetCategories}
                    color="#ede2cc"
                    onUpdate={(patch) => onUpdate(vendor.id, patch)}
                    onDelete={() => onDelete(vendor.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="board-footer">
        <button className="btn ghost" onClick={() => setShowManageCategories(true)}>Manage categories</button>
      </div>

      {showManageCategories && (
        <VendorCategoryManagerModal
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

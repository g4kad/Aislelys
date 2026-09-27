import type { BudgetCategory, VendorCategory } from "./types";

// Vendor and budget categories are one matching list: the vendor category
// picker offers every vendor category, then any budget category not yet used
// for vendors, then generic suggestions — each title once.
export function vendorCategoryOptions(
  vendorCategories: VendorCategory[],
  budgetCategories: BudgetCategory[],
  suggestions: string[] = []
): { value: string; label: string }[] {
  const seen = new Set<string>();
  const options: { value: string; label: string }[] = [];
  for (const title of [
    ...vendorCategories.map((c) => c.title),
    ...budgetCategories.map((c) => c.title),
    ...suggestions,
  ]) {
    const key = title.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    options.push({ value: title, label: title });
  }
  return options;
}

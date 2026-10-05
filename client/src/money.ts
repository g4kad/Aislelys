import type { BudgetItem, Currency, ExtraCost } from "./types";

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  SGD: "S$",
  MYR: "RM",
  THB: "฿",
  PHP: "₱",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "CN¥",
  KRW: "₩",
};

// Shown before a live rate has loaded; refreshed from the server on load.
export const DEFAULT_RATES: Record<Currency, number> = {
  SGD: 1,
  MYR: 0.31,
  THB: 0.0375,
  PHP: 0.0237,
  USD: 1.34,
  EUR: 1.45,
  GBP: 1.7,
  JPY: 0.0089,
  CNY: 0.186,
  KRW: 0.00097,
};

// `rates[c]` is "how many SGD equal 1 unit of c" (SGD itself is always 1),
// so any currency can convert to any other via SGD as the pivot.
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  rates: Record<Currency, number>
): number {
  if (from === to) return amount;
  const inSgd = amount * (rates[from] ?? 1);
  return inSgd / (rates[to] ?? 1);
}

export function formatMoney(amount: number, currency: Currency): string {
  return `${CURRENCY_SYMBOL[currency]} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function extrasTotal(extras: ExtraCost[] | undefined): number {
  return (extras ?? []).reduce((sum, e) => sum + (e.amount || 0), 0);
}

// A budget line's cost, including any extra costs.
export function budgetLineAmount(item: BudgetItem): number {
  return item.actual + extrasTotal(item.extras);
}

// An amount already converted into the couple's home currency. SGD keeps
// its plain "$" look (dropping the "S" prefix, as it always has); any other
// home currency just shows its own symbol.
export function formatHome(amount: number, home: Currency): string {
  if (home === "SGD") return formatMoney(amount, "SGD").replace(/^S\$/, "$");
  return formatMoney(amount, home);
}

// The Home page's marketing previews always show SGD regardless of any
// real couple's settings.
export function formatDollars(amount: number): string {
  return formatHome(amount, "SGD");
}

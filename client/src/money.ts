import type { BudgetItem, Currency, ExtraCost } from "./types";

export const CURRENCY_SYMBOL: Record<Currency, string> = { SGD: "S$", MYR: "RM" };

export function toSgd(amount: number, currency: Currency, myrToSgd: number): number {
  return currency === "MYR" ? amount * myrToSgd : amount;
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

export function formatSgd(amount: number): string {
  return formatMoney(amount, "SGD");
}

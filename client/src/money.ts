import type { Currency } from "./types";

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

export function formatSgd(amount: number): string {
  return formatMoney(amount, "SGD");
}

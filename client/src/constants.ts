import type { BigDayPriority, Currency } from "./types";

export const VENDOR_STATUSES: { value: "inquired" | "downpayment" | "booked" | "paid"; label: string }[] = [
  { value: "inquired", label: "Inquired" },
  { value: "downpayment", label: "Downpayment" },
  { value: "booked", label: "Booked" },
  { value: "paid", label: "Paid" },
];

// Budget-only category for day-to-day spending: never becomes a vendor, and
// never shows up in the vendor categories. The default for new expenses.
export const PURCHASES_CATEGORY = "Purchases";

export const CURRENCIES: { value: Currency; label: string }[] = [
  { value: "SGD", label: "SGD (S$)" },
  { value: "MYR", label: "MYR (RM)" },
  { value: "THB", label: "THB (฿)" },
  { value: "PHP", label: "PHP (₱)" },
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "JPY", label: "JPY (¥)" },
  { value: "CNY", label: "CNY (CN¥)" },
  { value: "KRW", label: "KRW (₩)" },
];

export const GENERIC_VENDOR_CATEGORIES: string[] = [
  "Venue",
  "Catering",
  "Photography",
  "Videography",
  "Florist",
  "Music & DJ",
  "Officiant",
  "Hair & Makeup",
  "Attire",
  "Cake",
  "Transportation",
  "Decor & Rentals",
  "Stationery",
];

export const GENERIC_BUDGET_CATEGORIES: string[] = [
  "Venue",
  "Catering",
  "Photography",
  "Videography",
  "Attire",
  "Flowers & Decor",
  "Music & Entertainment",
  "Invitations & Stationery",
  "Transportation",
  "Beauty",
  "Rings",
  "Favors & Gifts",
  "Honeymoon",
];

export const BIG_DAY_PRIORITIES: { value: BigDayPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

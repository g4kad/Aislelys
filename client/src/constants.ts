export const VENDOR_STATUSES: { value: "inquired" | "booked" | "downpayment" | "paid"; label: string }[] = [
  { value: "inquired", label: "Inquired" },
  { value: "booked", label: "Booked" },
  { value: "downpayment", label: "Downpayment" },
  { value: "paid", label: "Paid" },
];

export const CURRENCIES: { value: "SGD" | "MYR"; label: string }[] = [
  { value: "SGD", label: "SGD (S$)" },
  { value: "MYR", label: "MYR (RM)" },
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

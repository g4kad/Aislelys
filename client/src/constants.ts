export const VENDOR_CATEGORIES = [
  "Venue",
  "Caterer",
  "Photographer",
  "Videographer",
  "Florist",
  "DJ / Band",
  "Officiant",
  "Hair & Makeup",
  "Cake",
  "Transportation",
  "Rentals",
  "Other",
];

export const VENDOR_STATUSES: { value: "inquired" | "booked" | "paid"; label: string }[] = [
  { value: "inquired", label: "Inquired" },
  { value: "booked", label: "Booked" },
  { value: "paid", label: "Paid" },
];

export const CURRENCIES: { value: "SGD" | "MYR"; label: string }[] = [
  { value: "SGD", label: "SGD (S$)" },
  { value: "MYR", label: "MYR (RM)" },
];

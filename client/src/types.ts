export type Section = {
  id: string;
  title: string;
  color: string;
  position: number;
};

export type WeddingDate = {
  date: string | null; // YYYY-MM-DD, null when not set
};

export type BigDaySession = {
  id: string;
  name: string; // may be blank — shown as "Session N"
  day: number; // 1-based, within BigDay.days
};

export type BigDay = {
  days: number;
  sessions: BigDaySession[];
};

export type Task = {
  id: string;
  name: string;
  assigneeUserId: string | null;
  createdByUserId: string | null;
  done: boolean;
};

export type EventItem = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (24h), or "" if not set
  sectionId: string | null;
  notes: string;
  tasks: Task[];
  createdAt: string;
};

export type TodoItem = {
  id: string;
  date: string; // YYYY-MM-DD
  text: string;
  assigneeUserId: string | null;
  createdByUserId: string | null;
  done: boolean;
  createdAt: string;
};

export type User = {
  id: string;
  name: string;
};

export type Notification = {
  id: string;
  userId: string;
  actorUserId: string | null;
  message: string;
  entityType: string | null;
  entityId: string | null;
  read: boolean;
  createdAt: string;
};

export type GuestCategory = {
  id: string;
  ownerId: string;
  title: string;
};

export type Guest = {
  id: string;
  name: string;
  plusCount: number; // additional people this guest/family is bringing
  categoryId: string;
  isVip: boolean;
  included: boolean; // whether this guest counts toward the guest totals
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
};

export type GuestOwner = {
  id: string;
  name: string;
  categories: GuestCategory[];
  guests: Guest[];
  createdAt: string;
};

export type InspirationItem = {
  id: string;
  url: string;
  caption: string;
  categoryId: string | null;
  approved: boolean;
  createdAt: string;
};

export type InspirationCategory = {
  id: string;
  title: string;
  createdAt: string;
};

export type Budget = {
  total: number;
  savings: number;
  homeCurrency: Currency;
};

export type Currency = "SGD" | "MYR" | "THB" | "PHP" | "USD" | "KRW" | "JPY" | "CNY" | "EUR" | "GBP";

export type BudgetCategory = {
  id: string;
  title: string;
  color: string;
  createdAt: string;
};

export type ExtraCost = {
  id: string;
  label: string;
  amount: number; // same currency as the vendor / expense it belongs to
};

export type BudgetItem = {
  id: string;
  item: string;
  category: string;
  currency: Currency;
  estimated: number;
  actual: number;
  paid: boolean;
  createdAt: string;
  sourceVendorId?: string | null; // set when this line mirrors a vendor
  downpayment?: number; // the linked vendor's downpayment (vendor lines only)
  notes?: string; // shared with the vendor on vendor lines
  extras?: ExtraCost[]; // shared with the vendor on vendor lines
};

// Every rate is "how many SGD equal 1 unit of this currency" (SGD itself is
// always 1), so any two currencies can be converted via SGD as the pivot —
// regardless of which one a couple has picked as their home currency.
export type ExchangeRate = {
  base: "SGD";
  rates: Record<Currency, number>;
  updatedAt: string | null;
  source: string;
};

export type VendorStatus = "inquired" | "downpayment" | "booked" | "paid";

export type VendorCategory = {
  id: string;
  title: string;
  color: string;
  createdAt: string;
};

export type Vendor = {
  id: string;
  name: string;
  category: string;
  contact: string;
  cost: number;
  status: VendorStatus;
  notes: string;
  createdAt: string;
  currency: Currency;
  budgetCategory: string; // budget category title; "" = Uncategorized
  downpayment: number; // in the vendor's currency
  extras: ExtraCost[];
};

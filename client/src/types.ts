export type Section = {
  id: string;
  title: string;
  color: string;
  position: number;
};

export type WeddingDate = {
  date: string | null; // YYYY-MM-DD, null when not set
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
};

export type Currency = "SGD" | "MYR";

export type BudgetCategory = {
  id: string;
  title: string;
  color: string;
  createdAt: string;
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
};

export type ExchangeRate = {
  myrToSgd: number;
  updatedAt: string | null;
  source: string;
};

export type VendorStatus = "inquired" | "booked" | "paid";

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
};

export type Section = {
  id: string;
  title: string;
  color: string;
};

export type WeddingDate = {
  date: string; // YYYY-MM-DD
};

export type Task = {
  id: string;
  name: string;
  assignee: string;
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
  done: boolean;
  createdAt: string;
};

export type Guest = {
  id: string;
  name: string;
  plusCount: number; // additional people this guest is bringing
};

export type GuestOwner = {
  id: string;
  name: string;
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
};

export type Currency = "SGD" | "MYR";

export type BudgetCategory = {
  id: string;
  title: string;
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
};

export type ExchangeRate = {
  myrToSgd: number;
  updatedAt: string | null;
  source: string;
};

export type VendorStatus = "inquired" | "booked" | "paid";

export type Vendor = {
  id: string;
  name: string;
  category: string;
  contact: string;
  cost: number;
  status: VendorStatus;
  notes: string;
  createdAt: string;
};

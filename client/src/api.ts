import type {
  Section,
  EventItem,
  Task,
  GuestOwner,
  Guest,
  InspirationItem,
  InspirationCategory,
  Budget,
  BudgetItem,
  BudgetCategory,
  Vendor,
  ExchangeRate,
  TodoItem,
  WeddingDate,
} from "./types";

const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Wedding date
export const getWeddingDate = () => request<WeddingDate>("/wedding-date");

// Day to-dos
export const getTodos = () => request<TodoItem[]>("/todos");
export const createTodo = (date: string, text: string) =>
  request<TodoItem>("/todos", { method: "POST", body: JSON.stringify({ date, text }) });
export const updateTodo = (id: string, patch: Partial<Pick<TodoItem, "text" | "done">>) =>
  request<TodoItem>(`/todos/${id}`, { method: "PUT", body: JSON.stringify(patch) });
export const deleteTodo = (id: string) => request<void>(`/todos/${id}`, { method: "DELETE" });

// Sections
export const getSections = () => request<Section[]>("/sections");
export const createSection = (title: string, color: string) =>
  request<Section>("/sections", {
    method: "POST",
    body: JSON.stringify({ title, color }),
  });
export const updateSection = (id: string, patch: Partial<Pick<Section, "title" | "color">>) =>
  request<Section>(`/sections/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
export const deleteSection = (id: string) =>
  request<void>(`/sections/${id}`, { method: "DELETE" });

// Events
export const getEvents = () => request<EventItem[]>("/events");
export const createEvent = (data: {
  title: string;
  date: string;
  time: string;
  sectionId: string | null;
  notes: string;
}) =>
  request<EventItem>("/events", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const updateEvent = (
  id: string,
  patch: Partial<Pick<EventItem, "title" | "date" | "time" | "sectionId" | "notes">>
) =>
  request<EventItem>(`/events/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
export const deleteEvent = (id: string) =>
  request<void>(`/events/${id}`, { method: "DELETE" });

// Tasks
export const createTask = (eventId: string, name: string, assignee: string) =>
  request<Task>(`/events/${eventId}/tasks`, {
    method: "POST",
    body: JSON.stringify({ name, assignee }),
  });
export const updateTask = (
  eventId: string,
  taskId: string,
  patch: Partial<Pick<Task, "name" | "assignee" | "done">>
) =>
  request<Task>(`/events/${eventId}/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
export const deleteTask = (eventId: string, taskId: string) =>
  request<void>(`/events/${eventId}/tasks/${taskId}`, { method: "DELETE" });

// Guest owners
export const getGuestOwners = () => request<GuestOwner[]>("/guest-owners");
export const getGuestOwner = (id: string) => request<GuestOwner>(`/guest-owners/${id}`);
export const createGuestOwner = (name: string) =>
  request<GuestOwner>("/guest-owners", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
export const updateGuestOwner = (id: string, patch: Partial<Pick<GuestOwner, "name">>) =>
  request<GuestOwner>(`/guest-owners/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
export const deleteGuestOwner = (id: string) =>
  request<void>(`/guest-owners/${id}`, { method: "DELETE" });

// Guests (nested in a guest owner's list)
export const addGuest = (ownerId: string, name: string, plusCount = 0) =>
  request<Guest>(`/guest-owners/${ownerId}/guests`, {
    method: "POST",
    body: JSON.stringify({ name, plusCount }),
  });
export const updateGuest = (ownerId: string, guestId: string, patch: Partial<Pick<Guest, "name" | "plusCount">>) =>
  request<Guest>(`/guest-owners/${ownerId}/guests/${guestId}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
export const deleteGuest = (ownerId: string, guestId: string) =>
  request<void>(`/guest-owners/${ownerId}/guests/${guestId}`, { method: "DELETE" });

// Inspiration board
export const getInspirationItems = () => request<InspirationItem[]>("/inspiration");
export const createInspirationItem = (url: string, caption: string, categoryId: string | null) =>
  request<InspirationItem>("/inspiration", {
    method: "POST",
    body: JSON.stringify({ url, caption, categoryId }),
  });
export const updateInspirationItem = (
  id: string,
  patch: Partial<Pick<InspirationItem, "caption" | "approved" | "categoryId">>
) =>
  request<InspirationItem>(`/inspiration/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
export const deleteInspirationItem = (id: string) =>
  request<void>(`/inspiration/${id}`, { method: "DELETE" });

// Inspiration categories
export const getInspirationCategories = () => request<InspirationCategory[]>("/inspiration-categories");
export const createInspirationCategory = (title: string) =>
  request<InspirationCategory>("/inspiration-categories", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
export const deleteInspirationCategory = (id: string) =>
  request<void>(`/inspiration-categories/${id}`, { method: "DELETE" });

// Budget
export const getBudget = () => request<Budget>("/budget");
export const updateBudget = (total: number) =>
  request<Budget>("/budget", { method: "PUT", body: JSON.stringify({ total }) });

// Budget items
export const getBudgetItems = () => request<BudgetItem[]>("/budget-items");
export const createBudgetItem = (data: {
  item: string;
  category: string;
  currency: string;
  estimated: number;
  actual: number;
  paid: boolean;
}) =>
  request<BudgetItem>("/budget-items", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const updateBudgetItem = (
  id: string,
  patch: Partial<Pick<BudgetItem, "item" | "category" | "currency" | "estimated" | "actual" | "paid">>
) =>
  request<BudgetItem>(`/budget-items/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
export const deleteBudgetItem = (id: string) =>
  request<void>(`/budget-items/${id}`, { method: "DELETE" });

// Budget categories
export const getBudgetCategories = () => request<BudgetCategory[]>("/budget-categories");
export const createBudgetCategory = (title: string) =>
  request<BudgetCategory>("/budget-categories", {
    method: "POST",
    body: JSON.stringify({ title }),
  });

// Exchange rate (MYR -> SGD)
export const getExchangeRate = () => request<ExchangeRate>("/exchange-rate");
export const refreshExchangeRate = () =>
  request<ExchangeRate>("/exchange-rate/refresh", { method: "POST" });
export const updateExchangeRate = (myrToSgd: number) =>
  request<ExchangeRate>("/exchange-rate", {
    method: "PUT",
    body: JSON.stringify({ myrToSgd }),
  });

// Vendors
export const getVendors = () => request<Vendor[]>("/vendors");
export const createVendor = (data: {
  name: string;
  category: string;
  contact: string;
  cost: number;
  status: string;
  notes: string;
}) =>
  request<Vendor>("/vendors", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const updateVendor = (
  id: string,
  patch: Partial<Pick<Vendor, "name" | "category" | "contact" | "cost" | "status" | "notes">>
) =>
  request<Vendor>(`/vendors/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
export const deleteVendor = (id: string) =>
  request<void>(`/vendors/${id}`, { method: "DELETE" });

// Link preview resolution (for pages that aren't direct image URLs, e.g. Pinterest pins)
export const resolvePreviewImage = async (url: string): Promise<string | null> => {
  const data = await request<{ imageUrl: string | null }>(`/resolve-preview?url=${encodeURIComponent(url)}`);
  return data.imageUrl;
};

import type {
  Section,
  EventItem,
  Task,
  GuestOwner,
  GuestCategory,
  Guest,
  InspirationItem,
  InspirationCategory,
  Budget,
  BudgetItem,
  BudgetCategory,
  Vendor,
  VendorCategory,
  ExchangeRate,
  TodoItem,
  WeddingDate,
  User,
  Notification,
  Currency,
  ExtraCost,
} from "./types";

const BASE = "/api";

// When someone is signed in with Clerk, every API call carries their Clerk
// session token (set up once by <ClerkTokenBridge> in main.tsx).
let getAuthToken: (() => Promise<string | null>) | null = null;
export function setAuthTokenGetter(getter: (() => Promise<string | null>) | null) {
  getAuthToken = getter;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = getAuthToken ? await getAuthToken().catch(() => null) : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(await authHeaders()), ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth
export const signup = (
  partner1: { name: string; password: string },
  partner2: { name: string; password: string },
  weddingDate?: string
) =>
  request<{ coupleId: string; user: User }>("/signup", {
    method: "POST",
    body: JSON.stringify({ partner1, partner2, weddingDate }),
  });
export const getCoupleAuthStatus = (coupleId: string) => request<{ users: User[] }>(`/couples/${coupleId}/auth-status`);
export const loginToCouple = (coupleId: string, userId: string, password: string) =>
  request<User>(`/couples/${coupleId}/login`, { method: "POST", body: JSON.stringify({ userId, password }) });
export const logout = () => request<void>("/auth/logout", { method: "POST" });
export const getMe = () => request<User>("/auth/me");

// Clerk accounts: linking a Clerk sign-in to a partner in a planner
export type AccountStatus = { linked: false } | { linked: true; coupleId: string; user: User };
export const getAccount = () => request<AccountStatus>("/account/me");
export const createWedding = (yourName: string, partnerName: string, weddingDate?: string) =>
  request<{ coupleId: string; inviteToken: string }>("/account/onboard", {
    method: "POST",
    body: JSON.stringify({ yourName, partnerName, weddingDate }),
  });
export const claimAccount = (coupleId: string, userId: string, password: string) =>
  request<{ coupleId: string; user: User }>("/account/claim", {
    method: "POST",
    body: JSON.stringify({ coupleId, userId, password }),
  });
export const getPartnerInvite = () => request<{ token: string | null; partnerName?: string }>("/account/partner-invite");
export const getInvite = (token: string) =>
  request<{ coupleId: string; partnerName: string; names: string[]; used: boolean }>(`/account/invites/${token}`);
export const acceptInvite = (token: string) =>
  request<{ coupleId: string }>(`/account/invites/${token}/accept`, { method: "POST" });

// Notifications
export const getNotifications = () => request<Notification[]>("/notifications");
export const markNotificationRead = (id: string) => request<void>(`/notifications/${id}/read`, { method: "POST" });
export const markAllNotificationsRead = () => request<void>("/notifications/read-all", { method: "POST" });

// Wedding date
export const getWeddingDate = () => request<WeddingDate>("/wedding-date");
export const updateWeddingDate = (date: string | null) =>
  request<WeddingDate>("/wedding-date", { method: "PUT", body: JSON.stringify({ date }) });

// Delete planner: while the partner has joined it only removes you and they
// keep everything; otherwise the whole planner goes. `confirm` is the typed phrase.
export const getDeletePlannerInfo = () =>
  request<{ partnerName: string | null; partnerJoined: boolean }>("/couple/delete-info");
export const deletePlanner = (confirm: string) =>
  request<{ deleted: "membership" | "planner" }>("/couple", { method: "DELETE", body: JSON.stringify({ confirm }) });

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
export const reorderSections = (orderedIds: string[]) =>
  request<void>("/sections/reorder", { method: "PUT", body: JSON.stringify({ orderedIds }) });

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
export const createTask = (eventId: string, name: string, assigneeUserId: string | null) =>
  request<Task>(`/events/${eventId}/tasks`, {
    method: "POST",
    body: JSON.stringify({ name, assigneeUserId }),
  });
export const updateTask = (
  eventId: string,
  taskId: string,
  patch: Partial<Pick<Task, "name" | "assigneeUserId" | "done">>
) =>
  request<Task>(`/events/${eventId}/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
export const deleteTask = (eventId: string, taskId: string) =>
  request<void>(`/events/${eventId}/tasks/${taskId}`, { method: "DELETE" });

// Guest owners
export const getGuestOwners = () => request<GuestOwner[]>("/guest-owners");
export const getGuestOwner = (id: string) =>
  request<GuestOwner & { partner1Name: string | null; partner2Name: string | null }>(`/guest-owners/${id}`);
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
export const addGuest = (
  ownerId: string,
  name: string,
  plusCount: number,
  categoryId?: string,
  isVip = false,
  contact?: Pick<Guest, "phone" | "email" | "address" | "notes">
) =>
  request<Guest>(`/guest-owners/${ownerId}/guests`, {
    method: "POST",
    body: JSON.stringify({ name, plusCount, categoryId, isVip, ...contact }),
  });
export const updateGuest = (ownerId: string, guestId: string, patch: Partial<Pick<Guest, "name" | "plusCount" | "isVip" | "included" | "phone" | "email" | "address" | "notes">>) =>
  request<Guest>(`/guest-owners/${ownerId}/guests/${guestId}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
export const deleteGuest = (ownerId: string, guestId: string) =>
  request<void>(`/guest-owners/${ownerId}/guests/${guestId}`, { method: "DELETE" });

// Guest categories (custom lists like "Family", "Highschool", "Work")
export const createGuestCategory = (ownerId: string, title: string) =>
  request<GuestCategory>(`/guest-owners/${ownerId}/categories`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
export const updateGuestCategory = (ownerId: string, categoryId: string, title: string) =>
  request<GuestCategory>(`/guest-owners/${ownerId}/categories/${categoryId}`, {
    method: "PUT",
    body: JSON.stringify({ title }),
  });
export const deleteGuestCategory = (ownerId: string, categoryId: string) =>
  request<void>(`/guest-owners/${ownerId}/categories/${categoryId}`, { method: "DELETE" });

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
export const updateBudget = (patch: Partial<Budget>) =>
  request<Budget>("/budget", { method: "PUT", body: JSON.stringify(patch) });

// Budget items
export const getBudgetItems = () => request<BudgetItem[]>("/budget-items");
export const createBudgetItem = (data: {
  item: string;
  category: string;
  currency: string;
  estimated: number;
  actual: number;
  paid: boolean;
  notes: string;
  extras: ExtraCost[];
}) =>
  request<BudgetItem>("/budget-items", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const updateBudgetItem = (
  id: string,
  patch: Partial<Pick<BudgetItem, "item" | "category" | "currency" | "estimated" | "actual" | "paid" | "downpayment" | "notes" | "extras">>
) =>
  request<BudgetItem>(`/budget-items/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
export const deleteBudgetItem = (id: string) =>
  request<void>(`/budget-items/${id}`, { method: "DELETE" });

// Budget categories
export const getBudgetCategories = () => request<BudgetCategory[]>("/budget-categories");
export const createBudgetCategory = (title: string, color?: string) =>
  request<BudgetCategory>("/budget-categories", {
    method: "POST",
    body: JSON.stringify({ title, color }),
  });
export const updateBudgetCategory = (id: string, patch: Partial<Pick<BudgetCategory, "title" | "color">>) =>
  request<BudgetCategory>(`/budget-categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
export const deleteBudgetCategory = (id: string) =>
  request<void>(`/budget-categories/${id}`, { method: "DELETE" });

// Exchange rate (MYR -> SGD)
export const getExchangeRate = () => request<ExchangeRate>("/exchange-rate");
export const refreshExchangeRate = () =>
  request<ExchangeRate>("/exchange-rate/refresh", { method: "POST" });
export const updateExchangeRate = (myrToSgd: number) =>
  request<ExchangeRate>("/exchange-rate", {
    method: "PUT",
    body: JSON.stringify({ myrToSgd }),
  });

// Vendor categories
export const getVendorCategories = () => request<VendorCategory[]>("/vendor-categories");
export const createVendorCategory = (title: string, color: string) =>
  request<VendorCategory>("/vendor-categories", {
    method: "POST",
    body: JSON.stringify({ title, color }),
  });
export const updateVendorCategory = (id: string, patch: Partial<Pick<VendorCategory, "title" | "color">>) =>
  request<VendorCategory>(`/vendor-categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
export const deleteVendorCategory = (id: string) =>
  request<void>(`/vendor-categories/${id}`, { method: "DELETE" });

// Vendors
export const getVendors = () => request<Vendor[]>("/vendors");
export const createVendor = (data: {
  name: string;
  category: string;
  contact: string;
  cost: number;
  status: string;
  notes: string;
  currency: Currency;
  budgetCategory: string;
  downpayment: number;
  extras: ExtraCost[];
}) =>
  request<Vendor>("/vendors", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const updateVendor = (
  id: string,
  patch: Partial<Pick<Vendor, "name" | "category" | "contact" | "cost" | "status" | "notes" | "currency" | "budgetCategory" | "downpayment" | "extras">>
) =>
  request<Vendor>(`/vendors/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
export const deleteVendor = (id: string) =>
  request<void>(`/vendors/${id}`, { method: "DELETE" });

// Link preview resolution (for pages that aren't direct image URLs, e.g. Pinterest pins).
// For TikTok links, this may also resolve an embedUrl — needed when the pasted
// link is a short share link (vm.tiktok.com, tiktok.com/t/...) that doesn't
// carry the video id the client would otherwise extract itself.
export const resolvePreviewImage = (url: string) =>
  request<{ imageUrl: string | null; embedUrl?: string | null }>(`/resolve-preview?url=${encodeURIComponent(url)}`);

// Image upload (e.g. a photo taken/picked on mobile) for the Inspiration board
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE}/upload`, { method: "POST", body: formData, headers: await authHeaders() });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Upload failed: ${res.status}`);
  }
  const data = await res.json();
  return data.url;
}

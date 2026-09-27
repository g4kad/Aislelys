export function coupleTitle(names: string[]): string {
  const initials = names.map((n) => n.trim().charAt(0).toUpperCase()).filter(Boolean);
  if (initials.length < 2) return "Our Wedding Planner";
  return `${initials.join(" & ")}'s Wedding`;
}

export function guestNamePlaceholder(categoryTitle: string): string {
  const t = categoryTitle.trim().toLowerCase();
  if (t === "family") return "Family member's name";
  if (t === "guests" || t === "guest") return "Guest Name";
  return "Name…";
}

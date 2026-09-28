import type { ReactNode } from "react";
import type { BudgetCategory, BudgetItem, EventItem, GuestOwner, Section, User } from "../types";
import { DemoAuthProvider } from "../auth";
import SectionsBoard from "../components/SectionsBoard";
import EventCard from "../components/EventCard";
import BudgetBoard from "../components/BudgetBoard";
import GuestOwnerCard from "../components/GuestOwnerCard";
import { budgetLineAmount, formatSgd } from "../money";
import { toDateKey } from "../dateUtils";

// The Home page's pictures of the app are the app's own components, rendered
// with made-up sample data (never a real couple's), inside a frame that makes
// them look-only: `inert` stops clicks, typing and focus, and they're hidden
// from screen readers since the surrounding copy already describes them.

const noop = () => {};
const noopAsync = async () => ({}) as never;

const PARTNERS: User[] = [
  { id: "demo-mira", name: "Mira" },
  { id: "demo-theo", name: "Theo" },
];
const [MIRA, THEO] = PARTNERS;

function inDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

// Everything dated in the coming weeks, so the previews never look stale.
const SECTIONS: Section[] = [
  { id: "s-venue", title: "Venue", color: "#B99767", position: 0 },
  { id: "s-decor", title: "Décor", color: "#7C9885", position: 1 },
  { id: "s-beauty", title: "Beauty", color: "#C98E77", position: 2 },
];

const task = (id: string, name: string, who: User | null, done = false) => ({
  id,
  name,
  assigneeUserId: who?.id ?? null,
  createdByUserId: MIRA.id,
  done,
});

const EVENTS: EventItem[] = [
  {
    id: "e-venue-visit",
    title: "Second visit to the garden venue",
    date: inDays(3),
    time: "10:30",
    sectionId: "s-venue",
    notes: "Ask about the rain plan and when we can get in to set up.",
    tasks: [
      task("t1", "Confirm the time with the venue", MIRA, true),
      task("t2", "List questions about the rain plan", THEO, true),
      task("t3", "Measure the terrace for long tables", THEO),
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "e-florists",
    title: "Shortlist three florists",
    date: inDays(6),
    time: "",
    sectionId: "s-decor",
    notes: "",
    tasks: [task("t4", "Ask for quotes", MIRA), task("t5", "Pull photos from our board", THEO, true)],
    createdAt: new Date().toISOString(),
  },
  {
    id: "e-trial",
    title: "Hair & makeup trial",
    date: inDays(12),
    time: "14:00",
    sectionId: "s-beauty",
    notes: "",
    tasks: [task("t6", "Book the trial", MIRA, true)],
    createdAt: new Date().toISOString(),
  },
  {
    id: "e-tasting",
    title: "Cake tasting",
    date: inDays(15),
    time: "",
    sectionId: "s-venue",
    notes: "",
    tasks: [task("t7", "Pick three flavours", THEO)],
    createdAt: new Date().toISOString(),
  },
];

const BUDGET_CATEGORIES: BudgetCategory[] = [
  { id: "b-venue", title: "Venue", color: "#B99767", createdAt: "" },
  { id: "b-photo", title: "Photography", color: "#7C9885", createdAt: "" },
  { id: "b-purchases", title: "Purchases", color: "#C98E77", createdAt: "" },
];

const line = (
  id: string,
  item: string,
  category: string,
  actual: number,
  paid: boolean,
  vendor = false,
  downpayment = 0
): BudgetItem => ({
  id,
  item,
  category,
  currency: "SGD",
  estimated: actual,
  actual,
  paid,
  createdAt: "",
  sourceVendorId: vendor ? `v-${id}` : null,
  downpayment,
  notes: "",
  extras: [],
});

const BUDGET_ITEMS: BudgetItem[] = [
  line("bi1", "Garden venue", "Venue", 14000, true, true),
  line("bi2", "Long-table rentals", "Venue", 1800, false, true, 500),
  line("bi3", "Photographer", "Photography", 4200, false, true, 1200),
  line("bi4", "Ribbon & place cards", "Purchases", 160, true),
  line("bi5", "Welcome sign", "Purchases", 90, false),
];

const BUDGET_TOTAL = 40000;
const BUDGET_SAVINGS = 28500;

const OWNERS: GuestOwner[] = [
  {
    id: "g-couple",
    name: "Mira",
    createdAt: "",
    categories: [
      { id: "gc-family", ownerId: "g-couple", title: "Family" },
      { id: "gc-school", ownerId: "g-couple", title: "School mates" },
      { id: "gc-work", ownerId: "g-couple", title: "Work mates" },
    ],
    guests: [
      { id: "gg1", name: "Grandma Lina", plusCount: 0, categoryId: "gc-family", isVip: true, included: true },
      { id: "gg2", name: "Aunt Carmen", plusCount: 1, categoryId: "gc-family", isVip: false, included: true },
      { id: "gg3", name: "Rafi Santos", plusCount: 1, categoryId: "gc-school", isVip: true, included: true },
      { id: "gg4", name: "Daniel Koh", plusCount: 0, categoryId: "gc-school", isVip: false, included: true },
      { id: "gg5", name: "Jess Tan", plusCount: 1, categoryId: "gc-work", isVip: false, included: true },
    ],
  },
  {
    id: "g-mum",
    name: "Mum",
    createdAt: "",
    categories: [
      { id: "gm-family", ownerId: "g-mum", title: "Family" },
      { id: "gm-friends", ownerId: "g-mum", title: "Church friends" },
    ],
    guests: Array.from({ length: 14 }, (_, i) => ({
      id: `gm${i}`,
      name: `Guest ${i + 1}`,
      plusCount: 0,
      categoryId: i < 9 ? "gm-family" : "gm-friends",
      isVip: false,
      included: true,
    })),
  },
];

function Frame({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`hp-shot ${className}`} aria-hidden="true">
      <div className="hp-shot-bar">
        <span className="hp-shot-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="hp-shot-label">{label}</span>
      </div>
      <div className="hp-shot-body" inert>
        <DemoAuthProvider accounts={PARTNERS}>{children}</DemoAuthProvider>
      </div>
    </div>
  );
}

const eventHandlers = {
  onUpdateEvent: noop,
  onDeleteEvent: noop,
  onAddTask: noop,
  onUpdateTask: noop,
  onDeleteTask: noop,
};

export function WeddingCardsPreview() {
  return (
    <Frame label="Planner · Wedding Cards" className="hp-shot-cards">
      <SectionsBoard
        events={EVENTS}
        sections={SECTIONS}
        onCreateSection={noopAsync}
        onUpdateSection={noop}
        onDeleteSection={noop}
        onReorderSections={noop}
        onOpenAddTask={noop}
        {...eventHandlers}
      />
    </Frame>
  );
}

export function TaskPreview() {
  const venue = SECTIONS[0];
  const [visit, , , tasting] = EVENTS;
  return (
    <Frame label="Planner · task breakdown" className="hp-shot-tasks">
      <div className="card-list">
        <EventCard event={visit} section={venue} sections={SECTIONS} expanded onToggleExpand={noop} {...eventHandlers} />
        <EventCard event={tasting} section={venue} sections={SECTIONS} expanded={false} onToggleExpand={noop} {...eventHandlers} />
      </div>
    </Frame>
  );
}

export function BudgetCellsPreview({ only }: { only?: "remaining" }) {
  const spent = BUDGET_ITEMS.reduce((sum, i) => sum + budgetLineAmount(i), 0);
  const remaining = BUDGET_TOTAL - spent;
  const remainingCell = (
    <div className="budget-summary-stat">
      <span className="budget-stat-label">Remaining (SGD)</span>
      <span className="budget-stat-value positive">{formatSgd(remaining)}</span>
    </div>
  );
  if (only === "remaining") return remainingCell;
  return (
    <div className="budget-summary">
      <div className="budget-summary-stat">
        <span className="budget-stat-label">Total budget (SGD)</span>
        <span className="budget-stat-value">{formatSgd(BUDGET_TOTAL)}</span>
      </div>
      <div className="budget-summary-stat">
        <span className="budget-stat-label">Total savings</span>
        <span className="budget-stat-value">{formatSgd(BUDGET_SAVINGS)}</span>
      </div>
      {remainingCell}
      <div className="budget-summary-stat budget-stat-highlight">
        <span className="budget-stat-label">Total (SGD)</span>
        <span className="budget-stat-value">{formatSgd(spent)}</span>
      </div>
    </div>
  );
}

export function RemainingBadge() {
  return (
    <div className="hp-shot-badge" aria-hidden="true">
      <BudgetCellsPreview only="remaining" />
    </div>
  );
}

export function BudgetPreview() {
  return (
    <Frame label="Budget" className="hp-shot-budget">
      <BudgetCellsPreview />
      <BudgetBoard
        items={BUDGET_ITEMS}
        categories={BUDGET_CATEGORIES}
        myrToSgd={0.31}
        onUpdate={noop}
        onDelete={noop}
        onCreateCategory={noop}
        onUpdateCategory={noop}
        onDeleteCategory={noop}
      />
    </Frame>
  );
}

const guestHandlers = {
  onUpdateOwner: noop,
  onDeleteOwner: noop,
  onAddGuest: noop,
  onUpdateGuest: noop,
  onDeleteGuest: noop,
  onAddCategory: noop,
  onUpdateCategory: noop,
  onDeleteCategory: noop,
};

export function GuestListPreview() {
  return (
    <Frame label="Guest List" className="hp-shot-guests">
      <div className="card-list">
        <GuestOwnerCard owner={OWNERS[0]} expanded onToggleExpand={noop} deletable={false} nameEditable={false} {...guestHandlers} />
      </div>
    </Frame>
  );
}

export function FamilyInvitePreview() {
  return (
    <Frame label="Guest List · Mum's list" className="hp-shot-guests">
      <div className="card-list">
        <GuestOwnerCard owner={OWNERS[1]} expanded onToggleExpand={noop} showInviteLink {...guestHandlers} />
      </div>
    </Frame>
  );
}

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { BudgetCategory, BudgetItem, EventItem, GuestOwner, Section, User } from "../types";
import { DemoAuthProvider } from "../auth";
import SectionsBoard from "../components/SectionsBoard";
import EventCard from "../components/EventCard";
import BudgetBoard from "../components/BudgetBoard";
import GuestOwnerCard from "../components/GuestOwnerCard";
import InspirationCard from "../components/InspirationCard";
import { budgetLineAmount, formatDollars } from "../money";
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
      task("t3", "Measure the terrace", THEO),
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

// Sample names for the family lists (shown once a list is opened).
const FAMILY_NAMES = [
  "Auntie Rosa", "Uncle Ben", "Cousin Nadia", "Cousin Leo", "Grandpa Joe", "Auntie May", "Uncle Sam",
  "Cousin Ivy", "Mrs. Lee", "Mr. & Mrs. Tan", "Pastor Mark", "Mrs. Wong", "Mr. Ramos", "Ms. Chen",
];

function familyList(id: string, name: string, count: number): GuestOwner {
  const categoryId = `${id}-family`;
  return {
    id,
    name,
    createdAt: "",
    categories: [{ id: categoryId, ownerId: id, title: "Family" }],
    guests: Array.from({ length: count }, (_, i) => ({
      id: `${id}-${i}`,
      name: FAMILY_NAMES[(i + 5) % FAMILY_NAMES.length],
      plusCount: 0,
      categoryId,
      isVip: false,
      included: true,
    })),
  };
}

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
      {
        id: "gg1",
        name: "Grandma Lina",
        plusCount: 0,
        categoryId: "gc-family",
        isVip: true,
        included: true,
        phone: "012-345 6789",
        address: "Taman Tun, Kuala Lumpur",
        notes: "Front table, near the aisle",
      },
      { id: "gg2", name: "Aunt Carmen", plusCount: 1, categoryId: "gc-family", isVip: false, included: true },
      {
        id: "gg3",
        name: "Rafi Santos",
        plusCount: 1,
        categoryId: "gc-school",
        isVip: true,
        included: true,
        email: "rafi@example.com",
        notes: "Vegetarian",
      },
      { id: "gg4", name: "Daniel Koh", plusCount: 0, categoryId: "gc-school", isVip: false, included: true },
      { id: "gg5", name: "Jess Tan", plusCount: 1, categoryId: "gc-work", isVip: false, included: true },
    ],
  },
  {
    id: "g-mum",
    name: "Mum's list",
    createdAt: "",
    categories: [
      { id: "gm-family", ownerId: "g-mum", title: "Family" },
      { id: "gm-friends", ownerId: "g-mum", title: "Church friends" },
    ],
    guests: Array.from({ length: 14 }, (_, i) => ({
      id: `gm${i}`,
      name: FAMILY_NAMES[i],
      plusCount: 0,
      categoryId: i < 9 ? "gm-family" : "gm-friends",
      isVip: false,
      included: true,
    })),
  },
  familyList("g-dad", "Dad's list", 9),
  familyList("g-theo", "Theo's parents", 0),
];

// Fade-in + slide-up the first time an element scrolls into view (a little
// way in, so the motion is seen). Shown straight away where unsupported.
function useRevealOnScroll<T extends Element>() {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shown]);
  return [ref, shown] as const;
}

function Frame({
  label,
  children,
  className = "",
  interactive = false,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  interactive?: boolean; // clickable (e.g. open a guest list); still saves nothing
}) {
  const [ref, shown] = useRevealOnScroll<HTMLDivElement>();
  return (
    <div ref={ref} className={`hp-shot-wrap ${className}-wrap hp-reveal ${shown ? "is-shown" : ""}`}>
      <FrameWindow label={label} className={className} interactive={interactive}>
        {children}
      </FrameWindow>
    </div>
  );
}

function FrameWindow({
  label,
  children,
  className,
  interactive,
}: {
  label: string;
  children: ReactNode;
  className: string;
  interactive: boolean;
}) {
  return (
    <div
      className={`hp-shot ${className} ${interactive ? "hp-shot-live" : ""}`}
      aria-hidden={interactive ? undefined : "true"}
      aria-label={interactive ? `Example: ${label}` : undefined}
      role={interactive ? "group" : undefined}
    >
      <div className="hp-shot-bar">
        <span className="hp-shot-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="hp-shot-label">{label}</span>
      </div>
      <div className="hp-shot-body" inert={!interactive}>
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

// the hero floats just Venue (the other sections stay in the other previews)
const HERO_SECTIONS = SECTIONS.filter((s) => s.id === "s-venue");

// Hero: an (empty) Wedding Cards window as the backdrop, with each section
// floating on its own in front of it — still the real board component, one
// section at a time.
function FloatingSection({ section }: { section: Section }) {
  const [ref, shown] = useRevealOnScroll<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`hp-float-card hp-float-${section.id} hp-reveal ${shown ? "is-shown" : ""}`}
      aria-hidden="true"
    >
      <div className="hp-float-inner" inert>
        <DemoAuthProvider accounts={PARTNERS}>
          <SectionsBoard
            events={EVENTS.filter((e) => e.sectionId === section.id)}
            sections={[section]}
            onCreateSection={noopAsync}
            onUpdateSection={noop}
            onDeleteSection={noop}
            onReorderSections={noop}
            onOpenAddTask={noop}
            {...eventHandlers}
          />
        </DemoAuthProvider>
      </div>
    </div>
  );
}

// A photo from the Inspiration board, as the app shows it (approve heart,
// edit and remove buttons, caption on the image), floating in the hero.
function FloatingPhoto({
  id,
  url,
  caption,
  approved,
  className,
}: {
  id: string;
  url: string;
  caption: string;
  approved: boolean;
  className: string;
}) {
  const [ref, shown] = useRevealOnScroll<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`hp-float-card hp-float-photo ${className} hp-reveal ${shown ? "is-shown" : ""}`}
      aria-hidden="true"
    >
      <div className="hp-float-inner" inert>
        <InspirationCard
          item={{ id, url, caption, categoryId: null, approved, createdAt: "" }}
          onToggleApproved={noop}
          onEdit={noop}
          onDelete={noop}
          onImageReady={noop}
          onOpenImage={noop}
        />
      </div>
    </div>
  );
}

export function WeddingCardsPreview() {
  return (
    <>
      <Frame label="Planner · Wedding Cards" className="hp-shot-cards">
        <div className="hp-ghost-board">
          <span />
          <span />
          <span />
          <span />
        </div>
      </Frame>
      {HERO_SECTIONS.map((section) => (
        <FloatingSection key={section.id} section={section} />
      ))}
      <FloatingPhoto id="hero-rings" url="/hero-rings.jpg" caption="Our rings" approved className="hp-photo-rings" />
      <FloatingPhoto
        id="hero-venue"
        url="/hero-venue.jpg"
        caption="Garden hall venue"
        approved={false}
        className="hp-photo-venue"
      />
    </>
  );
}

// The planner picture ticks its last open task off and back on, on a loop,
// so visitors see a task being crossed off (still for reduced motion).
const LOOP_OPEN_MS = 2000;
const LOOP_DONE_MS = 2600;

export function TaskPreview() {
  const venue = SECTIONS[0];
  const [visit, , , tasting] = EVENTS;
  const [ticked, setTicked] = useState(false);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let timer: number;
    const step = (next: boolean) => {
      timer = window.setTimeout(() => {
        setTicked(next);
        step(!next);
      }, next ? LOOP_OPEN_MS : LOOP_DONE_MS);
    };
    step(true);
    return () => window.clearTimeout(timer);
  }, []);

  const animated = {
    ...visit,
    tasks: visit.tasks.map((t) => (t.id === "t3" ? { ...t, done: ticked } : t)),
  };

  return (
    <Frame label="Planner · task breakdown" className="hp-shot-tasks">
      <div className="card-list">
        <EventCard event={animated} section={venue} sections={SECTIONS} expanded onToggleExpand={noop} {...eventHandlers} />
        <EventCard event={tasting} section={venue} sections={SECTIONS} expanded={false} onToggleExpand={noop} {...eventHandlers} />
      </div>
    </Frame>
  );
}

export function BudgetCellsPreview() {
  const spent = BUDGET_ITEMS.reduce((sum, i) => sum + budgetLineAmount(i), 0);
  const remaining = BUDGET_TOTAL - spent;
  const remainingCell = (
    <div className="budget-summary-stat">
      <span className="budget-stat-label">Remaining (SGD)</span>
      <span className="budget-stat-value positive">{formatDollars(remaining)}</span>
    </div>
  );
  return (
    <div className="budget-summary">
      <div className="budget-summary-stat">
        <span className="budget-stat-label">Total budget (SGD)</span>
        <span className="budget-stat-value">{formatDollars(BUDGET_TOTAL)}</span>
      </div>
      <div className="budget-summary-stat">
        <span className="budget-stat-label">Total savings</span>
        <span className="budget-stat-value">{formatDollars(BUDGET_SAVINGS)}</span>
      </div>
      {remainingCell}
      <div className="budget-summary-stat budget-stat-highlight">
        <span className="budget-stat-label">Total (SGD)</span>
        <span className="budget-stat-value">{formatDollars(spent)}</span>
      </div>
    </div>
  );
}

// The hero's corner card: the couple's total wedding budget.
export function WeddingBudgetBadge() {
  const [ref, shown] = useRevealOnScroll<HTMLDivElement>();
  return (
    <div ref={ref} className={`hp-shot-badge hp-reveal hp-reveal-late ${shown ? "is-shown" : ""}`} aria-hidden="true">
      <div className="budget-summary-stat">
        <span className="budget-stat-label">Wedding budget</span>
        <span className="budget-stat-value">{formatDollars(BUDGET_TOTAL)}</span>
      </div>
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
        formatTotal={formatDollars}
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
    <Frame label="Guest List" className="hp-shot-guests hp-shot-guests-main" interactive>
      <div className="card-list">
        <GuestOwnerCard owner={OWNERS[0]} expanded onToggleExpand={noop} deletable={false} nameEditable={false} {...guestHandlers} />
      </div>
    </Frame>
  );
}

// The family's own lists: closed to start (name + guest count), and each one
// opens like the app to show its groups and names.
export function FamilyListsPreview() {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <Frame label="Guest List · family lists" className="hp-shot-guests hp-shot-guests-family" interactive>
      <div className="card-list">
        {OWNERS.slice(1).map((owner) => (
          <GuestOwnerCard
            key={owner.id}
            owner={owner}
            expanded={openId === owner.id}
            onToggleExpand={() => setOpenId((prev) => (prev === owner.id ? null : owner.id))}
            showInviteLink
            {...guestHandlers}
          />
        ))}
      </div>
    </Frame>
  );
}

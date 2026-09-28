import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Budget, BudgetItem, EventItem, InspirationItem, Section } from "../types";
import * as api from "../api";
import { daysUntil, formatDateDMY, formatDateLong, formatTime, todayKey } from "../dateUtils";
import { getInstagramEmbedUrl, getTikTokEmbedUrl, getVimeoEmbedUrl, getYouTubeEmbedUrl } from "../inspirationUtils";
import { LOVE_QUOTES } from "../loveQuotes";
import { budgetLineAmount, formatSgd, toSgd } from "../money";

type Props = {
  weddingDate: string | null;
};

const LIST_LIMIT = 3;
const IMAGE_LIMIT = 3;

function isEmbed(url: string) {
  return !!(getYouTubeEmbedUrl(url) || getVimeoEmbedUrl(url) || getInstagramEmbedUrl(url) || getTikTokEmbedUrl(url));
}

export default function OverviewPage({ weddingDate }: Props) {
  const { coupleId } = useParams<{ coupleId: string }>();
  const base = `/${coupleId}`;
  const [events, setEvents] = useState<EventItem[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [inspiration, setInspiration] = useState<InspirationItem[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [myrToSgd, setMyrToSgd] = useState(0.31);
  const [loading, setLoading] = useState(true);
  // a new quote each time the page is opened
  const [quote] = useState(() => LOVE_QUOTES[Math.floor(Math.random() * LOVE_QUOTES.length)]);

  useEffect(() => {
    Promise.all([
      api.getEvents().catch(() => []),
      api.getSections().catch(() => []),
      api.getInspirationItems().catch(() => []),
      api.getBudget().catch(() => null),
      api.getBudgetItems().catch(() => []),
      api.getExchangeRate().catch(() => null),
    ])
      .then(([e, s, i, b, bi, rate]) => {
        setEvents(e);
        setSections(s);
        setInspiration(i);
        setBudget(b);
        setBudgetItems(bi);
        if (rate) setMyrToSgd(rate.myrToSgd);
      })
      .finally(() => setLoading(false));
  }, []);

  const sectionColor = useMemo(() => new Map(sections.map((s) => [s.id, s.color])), [sections]);

  const newlyAdded = useMemo(
    () => [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, LIST_LIMIT),
    [events]
  );

  const upcoming = useMemo(() => {
    const today = todayKey();
    return events
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
      .slice(0, LIST_LIMIT);
  }, [events]);

  const days = weddingDate ? daysUntil(weddingDate) : null;

  return (
    <div className="overview-page">
      <section className="overview-hero">
        <div className="overview-countdown">
          {days === null ? (
            <>
              <p className="overview-hero-label">Your big day</p>
              <p className="overview-hero-empty">
                Set your wedding date in <Link to={`${base}/settings`}>Settings</Link> to start the countdown.
              </p>
            </>
          ) : days > 0 ? (
            <>
              <p className="overview-days">{days.toLocaleString()}</p>
              <p className="overview-hero-label">{days === 1 ? "day to go" : "days to go"}</p>
            </>
          ) : days === 0 ? (
            <>
              <p className="overview-days overview-days-today">Today</p>
              <p className="overview-hero-label">is the day!</p>
            </>
          ) : (
            <>
              <p className="overview-hero-label">Married since</p>
              <p className="overview-hero-date overview-hero-date-large">{formatDateLong(weddingDate!)}</p>
            </>
          )}
        </div>

        <figure className="overview-quote">
          <blockquote>“{quote.text}”</blockquote>
          <figcaption>— {quote.author}</figcaption>
        </figure>
      </section>

      {loading ? (
        <p className="empty-hint">Loading…</p>
      ) : (
        <>
          <div className="overview-columns">
            <section className="overview-panel">
              <div className="overview-panel-header">
                <h2>Newly added</h2>
                <Link to={`${base}/planner`} className="overview-view-all">Planner →</Link>
              </div>
              <TaskList events={newlyAdded} sectionColor={sectionColor} empty="No tasks yet." base={base} />
            </section>

            <section className="overview-panel">
              <div className="overview-panel-header">
                <h2>Coming up</h2>
                <Link to={`${base}/planner`} className="overview-view-all">Planner →</Link>
              </div>
              <TaskList events={upcoming} sectionColor={sectionColor} empty="Nothing coming up." base={base} />
            </section>
          </div>

          {budget && (
            <section className="overview-panel">
              <div className="overview-panel-header">
                <h2>Budget</h2>
                <Link to={`${base}/budget`} className="overview-view-all">Budget →</Link>
              </div>
              <BudgetCells budget={budget} items={budgetItems} myrToSgd={myrToSgd} />
            </section>
          )}

          <section className="overview-panel">
            <div className="overview-panel-header">
              <h2>Latest inspiration</h2>
              <Link to={`${base}/inspiration`} className="overview-view-all">Inspiration →</Link>
            </div>
            <LatestImages items={inspiration} base={base} />
          </section>
        </>
      )}
    </div>
  );
}

// The Overview shows amounts as plain "$" rather than "S$".
function formatDollars(amount: number) {
  return formatSgd(amount).replace(/^S\$/, "$");
}

// Read-only version of the summary cells at the top of the Budget page.
function BudgetCells({ budget, items, myrToSgd }: { budget: Budget; items: BudgetItem[]; myrToSgd: number }) {
  const spent = items.reduce((sum, i) => sum + toSgd(budgetLineAmount(i), i.currency, myrToSgd), 0);
  const remaining = budget.total - spent;
  return (
    <div className="budget-summary overview-budget">
      <div className="budget-summary-stat">
        <span className="budget-stat-label">Total budget</span>
        <span className="budget-stat-value">{formatDollars(budget.total)}</span>
      </div>
      <div className="budget-summary-stat">
        <span className="budget-stat-label">Total savings</span>
        <span className="budget-stat-value">{formatDollars(budget.savings)}</span>
      </div>
      <div className="budget-summary-stat">
        <span className="budget-stat-label">Remaining (SGD)</span>
        <span className={`budget-stat-value ${remaining < 0 ? "over" : "positive"}`}>{formatDollars(remaining)}</span>
      </div>
      <div className="budget-summary-stat budget-stat-highlight">
        <span className="budget-stat-label">Total (SGD)</span>
        <span className="budget-stat-value">{formatDollars(spent)}</span>
      </div>
    </div>
  );
}

function TaskList({
  events,
  sectionColor,
  empty,
  base,
}: {
  events: EventItem[];
  sectionColor: Map<string, string>;
  empty: string;
  base: string;
}) {
  if (events.length === 0) return <p className="empty-hint">{empty}</p>;
  return (
    <ul className="overview-task-list">
      {events.map((ev) => {
        const done = ev.tasks.filter((t) => t.done).length;
        return (
          <li key={ev.id}>
            <Link to={`${base}/planner?event=${ev.id}`} className="overview-task">
              <span
                className="overview-task-dot"
                style={{ background: (ev.sectionId && sectionColor.get(ev.sectionId)) || "var(--border)" }}
              />
              <span className="overview-task-title">{ev.title}</span>
              {ev.tasks.length > 0 && (
                <span className="task-pill">
                  {done}/{ev.tasks.length}
                </span>
              )}
              <span className="overview-task-date">
                {formatDateDMY(ev.date)}
                {ev.time && ` · ${formatTime(ev.time)}`}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// The newest few inspiration images. Links that aren't direct images (e.g.
// Pinterest pins) are resolved to a preview; anything that still won't load
// is skipped so the next newest takes its place.
function LatestImages({ items, base }: { items: InspirationItem[]; base: string }) {
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const candidates = useMemo(
    () => [...items].filter((i) => !isEmbed(i.url)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [items]
  );
  const shown = candidates.filter((i) => !failed.has(i.id)).slice(0, IMAGE_LIMIT);

  if (shown.length === 0) return <p className="empty-hint">No inspiration images yet.</p>;

  return (
    <div className="overview-images">
      {shown.map((item) => (
        <OverviewImage
          key={item.id}
          item={item}
          href={`${base}/inspiration`}
          onFail={() => setFailed((prev) => new Set(prev).add(item.id))}
        />
      ))}
    </div>
  );
}

function OverviewImage({ item, href, onFail }: { item: InspirationItem; href: string; onFail: () => void }) {
  const [src, setSrc] = useState(item.url);
  const [triedResolve, setTriedResolve] = useState(false);

  function handleError() {
    if (triedResolve) return onFail();
    setTriedResolve(true);
    api
      .resolvePreviewImage(item.url)
      .then((data) => (data.imageUrl ? setSrc(data.imageUrl) : onFail()))
      .catch(onFail);
  }

  return (
    <Link to={href} className="overview-image">
      <img src={src} alt={item.caption || ""} loading="lazy" onError={handleError} />
      {item.caption && <span className="overview-image-caption">{item.caption}</span>}
    </Link>
  );
}

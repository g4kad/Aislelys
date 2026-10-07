import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { EventItem, Section, TodoItem } from "../types";
import * as api from "../api";
import { todayKey, MONTH_NAMES } from "../dateUtils";
import { useIsMobile } from "../useIsMobile";
import CalendarView from "../components/CalendarView";
import SectionsBoard from "../components/SectionsBoard";
import EventFormModal from "../components/EventFormModal";
import { IconChevronLeft, IconChevronRight } from "../components/Icons";

export default function PlannerPage() {
  const isMobile = useIsMobile();
  const [sections, setSections] = useState<Section[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [focusEvent, setFocusEvent] = useState<EventItem | null>(null);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const visibleEvents = useMemo(() => {
    return events.filter((e) => {
      const [y, m] = e.date.split("-").map(Number);
      return y === cursor.getFullYear() && m - 1 === cursor.getMonth();
    });
  }, [events, cursor]);

  // Arriving from a link to a specific task (e.g. the Overview): show its
  // month, open its card and scroll to it. The ?event= is then dropped so a
  // refresh or later navigation doesn't jump again.
  const linkedEventId = searchParams.get("event");
  useEffect(() => {
    if (loading || !linkedEventId) return;
    const ev = events.find((e) => e.id === linkedEventId);
    setSearchParams({}, { replace: true });
    if (!ev) return;
    const [y, m] = ev.date.split("-").map(Number);
    setCursor(new Date(y, m - 1, 1));
    setFocusEvent(ev);
  }, [loading, linkedEventId, events, setSearchParams]);

  useEffect(() => {
    if (!focusEvent) return;
    // wait for the month's cards to render and the card to open
    const t = setTimeout(() => {
      const selector = `[data-event-id="${focusEvent.id}"]`;
      const el =
        document.querySelector(`.board-region ${selector}`) ?? document.querySelector(`.day-panel ${selector}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => clearTimeout(t);
  }, [focusEvent]);

  function goToCardsMonth(delta: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }

  useEffect(() => {
    Promise.all([api.getSections(), api.getEvents(), api.getTodos()])
      .then(([s, e, t]) => {
        setSections(s);
        setEvents(e);
        setTodos(t);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleAddTodo(date: string, text: string) {
    try {
      const created = await api.createTodo(date, text);
      setTodos((prev) => [...prev, created]);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleToggleTodo(id: string, done: boolean) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done } : t)));
    try {
      await api.updateTodo(id, { done });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDeleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    try {
      await api.deleteTodo(id);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCreateEvent(data: { title: string; date: string; time: string; sectionId: string | null; notes: string }) {
    try {
      const created = await api.createEvent(data);
      setEvents((prev) => [...prev, created]);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleUpdateEvent(id: string, patch: Partial<Pick<EventItem, "title" | "date" | "time" | "sectionId" | "notes">>) {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    try {
      await api.updateEvent(id, patch);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDeleteEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    try {
      await api.deleteEvent(id);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCreateSection(title: string, color: string) {
    const created = await api.createSection(title, color);
    setSections((prev) => [...prev, created]);
    return created;
  }

  async function handleUpdateSection(id: string, patch: Partial<Pick<Section, "title" | "color">>) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    try {
      await api.updateSection(id, patch);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDeleteSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
    setEvents((prev) => prev.map((e) => (e.sectionId === id ? { ...e, sectionId: null } : e)));
    try {
      await api.deleteSection(id);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleReorderSections(orderedIds: string[]) {
    setSections((prev) => {
      const byId = new Map(prev.map((s) => [s.id, s]));
      return orderedIds.map((id) => byId.get(id)!).filter(Boolean);
    });
    try {
      await api.reorderSections(orderedIds);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleAddTask(eventId: string, name: string, assigneeUserId: string | null) {
    try {
      const task = await api.createTask(eventId, name, assigneeUserId);
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, tasks: [...e.tasks, task] } : e))
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleUpdateTask(
    eventId: string,
    taskId: string,
    patch: Partial<Pick<EventItem["tasks"][number], "name" | "assigneeUserId" | "done">>
  ) {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, tasks: e.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)) }
          : e
      )
    );
    try {
      await api.updateTask(eventId, taskId, patch);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDeleteTask(eventId: string, taskId: string) {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, tasks: e.tasks.filter((t) => t.id !== taskId) } : e))
    );
    try {
      await api.deleteTask(eventId, taskId);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (loading) return <p className="empty-hint">Loading…</p>;

  return (
    <div className="planner-page glass-page">
      {error && (
        <div className="error-banner" onClick={() => setError(null)}>
          {error} (click to dismiss)
        </div>
      )}

      <CalendarView
        events={events}
        sections={sections}
        todos={todos}
        cursor={cursor}
        onCursorChange={setCursor}
        onCreateEvent={handleCreateEvent}
        onCreateSection={handleCreateSection}
        onUpdateEvent={handleUpdateEvent}
        onDeleteEvent={handleDeleteEvent}
        onAddTask={handleAddTask}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        onAddTodo={handleAddTodo}
        onToggleTodo={handleToggleTodo}
        onDeleteTodo={handleDeleteTodo}
        focusDate={focusEvent?.date ?? null}
        focusEventId={focusEvent?.id ?? null}
      />

      <section className="board-region">
        <div className="board-region-header">
          <h2 className="board-region-title">Wedding Cards</h2>
          {isMobile && (
            <div className="wedding-cards-month-nav">
              <button className="icon-btn" onClick={() => goToCardsMonth(-1)} aria-label="Previous month">
                <IconChevronLeft size={14} />
              </button>
              <span className="wedding-cards-month-label">
                {MONTH_NAMES[cursor.getMonth()]} {String(cursor.getFullYear() % 100).padStart(2, "0")}
              </span>
              <button className="icon-btn" onClick={() => goToCardsMonth(1)} aria-label="Next month">
                <IconChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
        <SectionsBoard
          events={visibleEvents}
          sections={sections}
          onCreateSection={handleCreateSection}
          onUpdateSection={handleUpdateSection}
          onDeleteSection={handleDeleteSection}
          onReorderSections={handleReorderSections}
          onUpdateEvent={handleUpdateEvent}
          onDeleteEvent={handleDeleteEvent}
          onAddTask={handleAddTask}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onOpenAddTask={() => setShowAddTask(true)}
          focusEventId={focusEvent?.id ?? null}
        />
      </section>

      {showAddTask && (
        <EventFormModal
          initialDate={todayKey()}
          sections={sections}
          onClose={() => setShowAddTask(false)}
          onCreate={handleCreateEvent}
          onCreateSection={handleCreateSection}
        />
      )}
    </div>
  );
}

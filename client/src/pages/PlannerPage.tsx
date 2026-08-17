import { useEffect, useState } from "react";
import type { EventItem, Section, TodoItem } from "../types";
import * as api from "../api";
import { todayKey } from "../dateUtils";
import CalendarView from "../components/CalendarView";
import SectionsBoard from "../components/SectionsBoard";
import EventFormModal from "../components/EventFormModal";

export default function PlannerPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);

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

  async function handleAddTask(eventId: string, name: string, assignee: string) {
    try {
      const task = await api.createTask(eventId, name, assignee);
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
    patch: Partial<Pick<EventItem["tasks"][number], "name" | "assignee" | "done">>
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
    <>
      {error && (
        <div className="error-banner" onClick={() => setError(null)}>
          {error} (click to dismiss)
        </div>
      )}

      <CalendarView
        events={events}
        sections={sections}
        todos={todos}
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
      />

      <section className="board-region">
        <div className="board-region-header">
          <h2 className="board-region-title">Wedding Cards</h2>
        </div>
        <SectionsBoard
          events={events}
          sections={sections}
          onCreateSection={handleCreateSection}
          onUpdateSection={handleUpdateSection}
          onDeleteSection={handleDeleteSection}
          onUpdateEvent={handleUpdateEvent}
          onDeleteEvent={handleDeleteEvent}
          onAddTask={handleAddTask}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onOpenAddTask={() => setShowAddTask(true)}
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
    </>
  );
}

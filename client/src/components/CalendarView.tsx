import { useEffect, useMemo, useState } from "react";
import type { EventItem, Section, Task, TodoItem } from "../types";
import { MONTH_NAMES, WEEKDAY_NAMES, getMonthMatrix, toDateKey, todayKey, formatDateLong } from "../dateUtils";
import EventCard from "./EventCard";
import EventFormModal from "./EventFormModal";
import FullTimelineModal from "./FullTimelineModal";
import DayTodoList from "./DayTodoList";
import { IconChevronLeft, IconChevronRight, IconLayers } from "./Icons";

type Props = {
  events: EventItem[];
  sections: Section[];
  todos: TodoItem[];
  cursor: Date;
  onCursorChange: (cursor: Date) => void;
  onCreateEvent: (data: { title: string; date: string; time: string; sectionId: string | null; notes: string }) => void;
  onCreateSection: (title: string, color: string) => Promise<Section>;
  onUpdateEvent: (id: string, patch: Partial<Pick<EventItem, "title" | "date" | "time" | "sectionId" | "notes">>) => void;
  onDeleteEvent: (id: string) => void;
  onAddTask: (eventId: string, name: string, assigneeUserId: string | null) => void;
  onUpdateTask: (eventId: string, taskId: string, patch: Partial<Pick<Task, "name" | "assigneeUserId" | "done">>) => void;
  onDeleteTask: (eventId: string, taskId: string) => void;
  onAddTodo: (date: string, text: string) => void;
  onToggleTodo: (id: string, done: boolean) => void;
  onDeleteTodo: (id: string) => void;
  focusDate?: string | null; // selected when arriving from a link to a specific task
  focusEventId?: string | null;
};

export default function CalendarView(props: Props) {
  const { events, sections, cursor } = props;
  const [selectedDate, setSelectedDate] = useState<string>(todayKey());
  const [showForm, setShowForm] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  const weeks = useMemo(() => getMonthMatrix(cursor.getFullYear(), cursor.getMonth()), [cursor]);

  // Keep the selected day in step with whichever month is being viewed, so
  // navigating months doesn't leave the day panel (and its "+ Add task"
  // default date) stuck on a day from the month you navigated away from.
  useEffect(() => {
    setSelectedDate((prev) => {
      const [, , dStr] = prev.split("-");
      const daysInCursorMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
      const day = Math.min(Number(dStr), daysInCursorMonth);
      return toDateKey(new Date(cursor.getFullYear(), cursor.getMonth(), day));
    });
  }, [cursor]);

  // runs after the cursor effect above, so the exact day wins
  useEffect(() => {
    if (props.focusDate) setSelectedDate(props.focusDate);
  }, [props.focusDate]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const ev of events) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [events]);

  const sectionById = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);

  const selectedEvents = useMemo(
    () => [...(eventsByDate.get(selectedDate) ?? [])].sort((a, b) => a.time.localeCompare(b.time)),
    [eventsByDate, selectedDate]
  );

  const selectedTodos = useMemo(
    () => props.todos.filter((t) => t.date === selectedDate),
    [props.todos, selectedDate]
  );

  function goToMonth(delta: number) {
    props.onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
  }

  return (
    <div className="calendar-layout">
      <div className="calendar-panel">
        <div className="calendar-nav">
          <div className="calendar-month-nav">
            <button className="icon-btn" onClick={() => goToMonth(-1)} aria-label="Previous month">
              <IconChevronLeft />
            </button>
            <h2>{MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}</h2>
            <button className="icon-btn" onClick={() => goToMonth(1)} aria-label="Next month">
              <IconChevronRight size={16} />
            </button>
          </div>
          <button className="icon-btn" onClick={() => setShowTimeline(true)} title="Full timeline" aria-label="Full timeline">
            <IconLayers />
          </button>
        </div>

        <div className="calendar-grid">
          {WEEKDAY_NAMES.map((w) => (
            <div key={w} className="calendar-weekday">{w}</div>
          ))}
          {weeks.flatMap((week, wi) =>
            week.map((day, di) => {
              if (!day) return <div key={`${wi}-${di}`} className="calendar-cell empty" />;
              const key = toDateKey(day);
              const dayEvents = eventsByDate.get(key) ?? [];
              const isSelected = key === selectedDate;
              const isToday = key === todayKey();
              return (
                <button
                  key={key}
                  className={`calendar-cell ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`}
                  onClick={() => setSelectedDate(key)}
                >
                  <span className="cell-daynum">{day.getDate()}</span>
                  <span className="cell-dots">
                    {dayEvents.slice(0, 4).map((ev) => (
                      <span
                        key={ev.id}
                        className="dot"
                        style={{ background: (ev.sectionId && sectionById.get(ev.sectionId)?.color) || "#999" }}
                      />
                    ))}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="day-column">
        <div className="day-panel">
          <div className="day-panel-header">
            <h3>{formatDateLong(selectedDate)}</h3>
            <button className="btn primary small day-panel-add-task btn-add-primary" onClick={() => setShowForm(true)}>
              + Add task
            </button>
          </div>

          {selectedEvents.length === 0 ? (
            <p className="empty-hint">No tasks yet for this day.</p>
          ) : (
            <div className="card-list">
              {selectedEvents.map((ev) => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  section={ev.sectionId ? sectionById.get(ev.sectionId) : undefined}
                  sections={sections}
                  hideDate
                  defaultExpanded={ev.id === props.focusEventId && !ev.sectionId}
                  onUpdateEvent={(patch) => props.onUpdateEvent(ev.id, patch)}
                  onDeleteEvent={() => props.onDeleteEvent(ev.id)}
                  onAddTask={(name, assigneeUserId) => props.onAddTask(ev.id, name, assigneeUserId)}
                  onUpdateTask={(taskId, patch) => props.onUpdateTask(ev.id, taskId, patch)}
                  onDeleteTask={(taskId) => props.onDeleteTask(ev.id, taskId)}
                />
              ))}
            </div>
          )}
        </div>

        <button className="btn primary calendar-mobile-add-task btn-add-primary" onClick={() => setShowForm(true)}>
          + Add task
        </button>

        <div className="day-todo-section">
          <DayTodoList
            todos={selectedTodos}
            onAdd={(text) => props.onAddTodo(selectedDate, text)}
            onToggle={props.onToggleTodo}
            onDelete={props.onDeleteTodo}
          />
        </div>
      </div>

      {showForm && (
        <EventFormModal
          initialDate={selectedDate}
          sections={sections}
          onClose={() => setShowForm(false)}
          onCreate={props.onCreateEvent}
          onCreateSection={props.onCreateSection}
        />
      )}

      {showTimeline && (
        <FullTimelineModal
          events={events}
          sections={sections}
          onClose={() => setShowTimeline(false)}
          onUpdateEvent={props.onUpdateEvent}
          onDeleteEvent={props.onDeleteEvent}
          onAddTask={props.onAddTask}
          onUpdateTask={props.onUpdateTask}
          onDeleteTask={props.onDeleteTask}
        />
      )}
    </div>
  );
}

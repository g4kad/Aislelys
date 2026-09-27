import { useMemo, useState } from "react";
import type { EventItem, Section, Task } from "../types";
import { formatDateLong } from "../dateUtils";
import Modal from "./Modal";
import EventCard from "./EventCard";

type Props = {
  events: EventItem[];
  sections: Section[];
  onClose: () => void;
  onUpdateEvent: (id: string, patch: Partial<Pick<EventItem, "title" | "date" | "time" | "sectionId" | "notes">>) => void;
  onDeleteEvent: (id: string) => void;
  onAddTask: (eventId: string, name: string, assigneeUserId: string | null) => void;
  onUpdateTask: (eventId: string, taskId: string, patch: Partial<Pick<Task, "name" | "assigneeUserId" | "done">>) => void;
  onDeleteTask: (eventId: string, taskId: string) => void;
};

export default function FullTimelineModal({
  events,
  sections,
  onClose,
  onUpdateEvent,
  onDeleteEvent,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}: Props) {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const sectionById = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);

  const groups = useMemo(() => {
    const byDate = new Map<string, EventItem[]>();
    for (const ev of events) {
      const list = byDate.get(ev.date) ?? [];
      list.push(ev);
      byDate.set(ev.date, list);
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayEvents]) => ({
        date,
        events: [...dayEvents].sort((a, b) => a.time.localeCompare(b.time)),
      }));
  }, [events]);

  function toggleExpand(id: string) {
    setExpandedEventId((prev) => (prev === id ? null : id));
  }

  return (
    <Modal title="Full Timeline" onClose={onClose} className="timeline-modal">
      {groups.length === 0 ? (
        <p className="empty-hint">No events yet.</p>
      ) : (
        <div className="timeline-groups">
          {groups.map((group) => (
            <div key={group.date} className="timeline-group">
              <h3 className="timeline-date-label">{formatDateLong(group.date)}</h3>
              <div className="card-list">
                {group.events.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    section={ev.sectionId ? sectionById.get(ev.sectionId) : undefined}
                    sections={sections}
                    hideDate
                    expanded={expandedEventId === ev.id}
                    onToggleExpand={() => toggleExpand(ev.id)}
                    onUpdateEvent={(patch) => onUpdateEvent(ev.id, patch)}
                    onDeleteEvent={() => onDeleteEvent(ev.id)}
                    onAddTask={(name, assigneeUserId) => onAddTask(ev.id, name, assigneeUserId)}
                    onUpdateTask={(taskId, patch) => onUpdateTask(ev.id, taskId, patch)}
                    onDeleteTask={(taskId) => onDeleteTask(ev.id, taskId)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

import { useMemo, useState } from "react";
import type { EventItem, Section, Task } from "../types";
import EventCard from "./EventCard";
import SectionManagerModal from "./SectionManagerModal";

type Props = {
  events: EventItem[];
  sections: Section[];
  onCreateSection: (title: string, color: string) => Promise<Section>;
  onUpdateSection: (id: string, patch: Partial<Pick<Section, "title" | "color">>) => void;
  onDeleteSection: (id: string) => void;
  onUpdateEvent: (id: string, patch: Partial<Pick<EventItem, "title" | "date" | "time" | "sectionId" | "notes">>) => void;
  onDeleteEvent: (id: string) => void;
  onAddTask: (eventId: string, name: string, assignee: string) => void;
  onUpdateTask: (eventId: string, taskId: string, patch: Partial<Pick<Task, "name" | "assignee" | "done">>) => void;
  onDeleteTask: (eventId: string, taskId: string) => void;
  onOpenAddTask: () => void;
};

export default function SectionsBoard(props: Props) {
  const { events, sections } = props;
  const [showSectionManager, setShowSectionManager] = useState(false);

  const groups = useMemo(() => {
    const bySection = new Map<string, EventItem[]>();
    const unassigned: EventItem[] = [];
    for (const ev of events) {
      if (ev.sectionId && sections.some((s) => s.id === ev.sectionId)) {
        const list = bySection.get(ev.sectionId) ?? [];
        list.push(ev);
        bySection.set(ev.sectionId, list);
      } else {
        unassigned.push(ev);
      }
    }
    const byDateTime = (a: EventItem, b: EventItem) =>
      a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
    for (const list of bySection.values()) list.sort(byDateTime);
    unassigned.sort(byDateTime);
    return { bySection, unassigned };
  }, [events, sections]);

  return (
    <div className="board">
      <div className="board-toolbar">
        <button className="btn primary small" onClick={props.onOpenAddTask}>
          + Add task
        </button>
      </div>

      <div className="board-sections">
        {sections.map((section) => {
          const sectionEvents = groups.bySection.get(section.id) ?? [];
          return (
            <div className="board-section" key={section.id}>
              <div className="board-section-header" style={{ borderLeftColor: section.color }}>
                <span className="section-dot" style={{ background: section.color }} />
                <h3>{section.title}</h3>
                <span className="section-count">{sectionEvents.length}</span>
              </div>
              {sectionEvents.length === 0 ? (
                <p className="empty-hint">No tasks in this section yet.</p>
              ) : (
                <div className="card-list">
                  {sectionEvents.map((ev) => (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      section={section}
                      sections={sections}
                      onUpdateEvent={(patch) => props.onUpdateEvent(ev.id, patch)}
                      onDeleteEvent={() => props.onDeleteEvent(ev.id)}
                      onAddTask={(name, assignee) => props.onAddTask(ev.id, name, assignee)}
                      onUpdateTask={(taskId, patch) => props.onUpdateTask(ev.id, taskId, patch)}
                      onDeleteTask={(taskId) => props.onDeleteTask(ev.id, taskId)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {groups.unassigned.length > 0 && (
          <div className="board-section">
            <div className="board-section-header" style={{ borderLeftColor: "#bbb" }}>
              <span className="section-dot" style={{ background: "#bbb" }} />
              <h3>No section</h3>
              <span className="section-count">{groups.unassigned.length}</span>
            </div>
            <div className="card-list">
              {groups.unassigned.map((ev) => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  section={undefined}
                  sections={sections}
                  onUpdateEvent={(patch) => props.onUpdateEvent(ev.id, patch)}
                  onDeleteEvent={() => props.onDeleteEvent(ev.id)}
                  onAddTask={(name, assignee) => props.onAddTask(ev.id, name, assignee)}
                  onUpdateTask={(taskId, patch) => props.onUpdateTask(ev.id, taskId, patch)}
                  onDeleteTask={(taskId) => props.onDeleteTask(ev.id, taskId)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="board-footer">
        <button className="btn ghost" onClick={() => setShowSectionManager(true)}>Manage sections</button>
      </div>

      {showSectionManager && (
        <SectionManagerModal
          sections={sections}
          onClose={() => setShowSectionManager(false)}
          onCreate={props.onCreateSection}
          onUpdate={props.onUpdateSection}
          onDelete={props.onDeleteSection}
        />
      )}
    </div>
  );
}

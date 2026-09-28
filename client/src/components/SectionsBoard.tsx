import { useEffect, useMemo, useState } from "react";
import type { EventItem, Section, Task } from "../types";
import EventCard from "./EventCard";
import SectionManagerModal from "./SectionManagerModal";
import { IconGrip } from "./Icons";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Props = {
  events: EventItem[];
  sections: Section[];
  onCreateSection: (title: string, color: string) => Promise<Section>;
  onUpdateSection: (id: string, patch: Partial<Pick<Section, "title" | "color">>) => void;
  onDeleteSection: (id: string) => void;
  onReorderSections: (orderedIds: string[]) => void;
  onUpdateEvent: (id: string, patch: Partial<Pick<EventItem, "title" | "date" | "time" | "sectionId" | "notes">>) => void;
  onDeleteEvent: (id: string) => void;
  onAddTask: (eventId: string, name: string, assigneeUserId: string | null) => void;
  onUpdateTask: (eventId: string, taskId: string, patch: Partial<Pick<Task, "name" | "assigneeUserId" | "done">>) => void;
  onDeleteTask: (eventId: string, taskId: string) => void;
  onOpenAddTask: () => void;
  focusEventId?: string | null; // opened when arriving from a link to a specific task
};

type SortableSectionProps = {
  section: Section;
  count: number;
  children: React.ReactNode;
};

function SortableSection({ section, count, children }: SortableSectionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 1 : undefined,
  };
  return (
    <div ref={setNodeRef} style={{ ...style, borderLeftColor: section.color }} className="board-section">
      <div className="board-section-header">
        <button
          type="button"
          className="section-drag-handle"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <IconGrip />
        </button>
        <span className="section-dot" style={{ background: section.color }} />
        <h3>{section.title}</h3>
        <span className="section-count">{count}</span>
      </div>
      {children}
    </div>
  );
}

export default function SectionsBoard(props: Props) {
  const { events, sections } = props;
  const [showSectionManager, setShowSectionManager] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  useEffect(() => {
    if (props.focusEventId) setExpandedEventId(props.focusEventId);
  }, [props.focusEventId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  function toggleExpand(id: string) {
    setExpandedEventId((prev) => (prev === id ? null : id));
  }

  const groups = useMemo(() => {
    const bySection = new Map<string, EventItem[]>();
    for (const ev of events) {
      if (ev.sectionId && sections.some((s) => s.id === ev.sectionId)) {
        const list = bySection.get(ev.sectionId) ?? [];
        list.push(ev);
        bySection.set(ev.sectionId, list);
      }
      // Events with no section (or "No section" chosen) intentionally aren't
      // grouped here — they stay a day-only task in the Calendar view instead
      // of cluttering the Wedding Cards board.
    }
    const byDateTime = (a: EventItem, b: EventItem) =>
      a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
    for (const list of bySection.values()) list.sort(byDateTime);
    return { bySection };
  }, [events, sections]);

  // sections with nothing in them this month are hidden, not deleted — they
  // stay in "Manage cards" and the section pickers
  const visibleSections = sections.filter((s) => groups.bySection.has(s.id));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(sections, oldIndex, newIndex);
    props.onReorderSections(reordered.map((s) => s.id));
  }

  return (
    <div className="board">
      <div className="board-toolbar">
        <button className="btn primary small btn-add-primary" onClick={props.onOpenAddTask}>
          + Add task
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleSections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="board-sections">
            {visibleSections.length === 0 && <p className="empty-hint">No tasks this month.</p>}
            {visibleSections.map((section) => {
              const sectionEvents = groups.bySection.get(section.id) ?? [];
              return (
                <SortableSection key={section.id} section={section} count={sectionEvents.length}>
                  <div className="card-list">
                    {sectionEvents.map((ev) => (
                      <EventCard
                        key={ev.id}
                        event={ev}
                        section={section}
                        sections={sections}
                        expanded={expandedEventId === ev.id}
                        onToggleExpand={() => toggleExpand(ev.id)}
                        onUpdateEvent={(patch) => props.onUpdateEvent(ev.id, patch)}
                        onDeleteEvent={() => props.onDeleteEvent(ev.id)}
                        onAddTask={(name, assignee) => props.onAddTask(ev.id, name, assignee)}
                        onUpdateTask={(taskId, patch) => props.onUpdateTask(ev.id, taskId, patch)}
                        onDeleteTask={(taskId) => props.onDeleteTask(ev.id, taskId)}
                      />
                    ))}
                  </div>
                </SortableSection>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <div className="board-footer">
        <button className="btn ghost" onClick={() => setShowSectionManager(true)}>Manage cards</button>
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

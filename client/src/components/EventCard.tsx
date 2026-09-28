import { useEffect, useState } from "react";
import type { EventItem, Section, Task } from "../types";
import { formatDateDMY, formatDateShort, formatTime } from "../dateUtils";
import { IconCheck, IconChevronRight, IconCircle, IconClose, IconTrash } from "./Icons";
import Dropdown from "./Dropdown";
import { useAuth } from "../auth";
import { colorForKey } from "../palette";

type Props = {
  event: EventItem;
  section: Section | undefined;
  sections: Section[];
  defaultExpanded?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  hideDate?: boolean;
  onUpdateEvent: (patch: Partial<Pick<EventItem, "title" | "date" | "time" | "sectionId" | "notes">>) => void;
  onDeleteEvent: () => void;
  onAddTask: (name: string, assigneeUserId: string | null) => void;
  onUpdateTask: (taskId: string, patch: Partial<Pick<Task, "name" | "assigneeUserId" | "done">>) => void;
  onDeleteTask: (taskId: string) => void;
};

export default function EventCard({
  event,
  section,
  sections,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onToggleExpand,
  hideDate = false,
  onUpdateEvent,
  onDeleteEvent,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}: Props) {
  const { accounts } = useAuth();
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(defaultExpanded);
  const expanded = controlledExpanded ?? uncontrolledExpanded;
  const [editing, setEditing] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const doneCount = event.tasks.filter((t) => t.done).length;
  const nameFor = (userId: string | null) => accounts.find((a) => a.id === userId)?.name;
  const initialsFor = (userId: string | null) => {
    const name = nameFor(userId);
    if (!name) return null;
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("");
  };
  const assigneeOptions = [
    { value: "", label: "Assign" },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  useEffect(() => {
    if (!expanded) {
      setEditing(false);
      setConfirmDelete(false);
    }
  }, [expanded]);

  function toggleExpanded() {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setUncontrolledExpanded((v) => !v);
    }
  }

  function submitTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskName.trim()) return;
    onAddTask(taskName.trim(), taskAssignee || null);
    setTaskName("");
    setTaskAssignee("");
  }

  return (
    <div className="card" data-event-id={event.id} style={{ borderLeftColor: section?.color ?? "#ccc" }}>
      <button
        className="card-header"
        onClick={toggleExpanded}
        aria-expanded={expanded}
      >
        <span className={`chevron ${expanded ? "open" : ""}`}><IconChevronRight /></span>
        <span className="card-title">{event.title}</span>
        {event.tasks.length > 0 && (
          <span className="task-pill">
            {doneCount}/{event.tasks.length} tasks
          </span>
        )}
        {!hideDate && event.date && <span className="card-date event-card-date">{formatDateDMY(event.date)}</span>}
      </button>

      {expanded && !editing && (
        <div className="card-body card-view">
          {(!hideDate || event.time) && (
            <div className="card-meta">
              {!hideDate && formatDateShort(event.date)}
              {!hideDate && event.time && " · "}
              {event.time && formatTime(event.time)}
            </div>
          )}

          <div className="view-block">
            <span className="view-label">Notes</span>
            <p className="notes-text">{event.notes || <em>No notes yet.</em>}</p>
          </div>

          <div className="view-block">
            <span className="view-label">Tasks</span>
            {event.tasks.length === 0 ? (
              <p className="empty-hint">No tasks yet.</p>
            ) : (
              <ul className="task-view-list">
                {event.tasks.map((task) => (
                  <li key={task.id} className="task-view-item">
                    <span className={`task-status ${task.done ? "done" : ""}`}>
                      {task.done ? <IconCheck /> : <IconCircle />}
                    </span>
                    <span className={`task-name ${task.done ? "done" : ""}`}>{task.name}</span>
                    {initialsFor(task.assigneeUserId) && (
                      <span
                        className="task-assignee-avatar"
                        title={nameFor(task.assigneeUserId)}
                        style={{ background: colorForKey(task.assigneeUserId ?? "") }}
                      >
                        {initialsFor(task.assigneeUserId)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card-footer">
            <button className="btn small ghost card-footer-right" onClick={() => setEditing(true)}>Edit</button>
          </div>
        </div>
      )}

      {expanded && editing && (
        <div className="card-body">
          <label className="title-field">
            Title
            <input
              type="text"
              value={event.title}
              onChange={(e) => onUpdateEvent({ title: e.target.value })}
            />
          </label>
          <div className="field-row">
            <label>
              Wedding Card
              <Dropdown
                value={event.sectionId ?? ""}
                onChange={(v) => onUpdateEvent({ sectionId: v || null })}
                placeholder="No wedding card"
                options={[
                  { value: "", label: "No wedding card" },
                  ...sections.map((s) => ({ value: s.id, label: s.title })),
                ]}
              />
            </label>
            <label>
              Date
              <input
                type="date"
                value={event.date}
                onChange={(e) => onUpdateEvent({ date: e.target.value })}
              />
            </label>
            <label>
              Time
              <input
                type="time"
                value={event.time}
                onChange={(e) => onUpdateEvent({ time: e.target.value })}
              />
            </label>
          </div>

          <div className="notes-block">
            <div className="notes-block-header">
              <span>Notes</span>
            </div>
            <textarea
              value={event.notes}
              onChange={(e) => onUpdateEvent({ notes: e.target.value })}
              rows={3}
              placeholder="Add notes for this date…"
            />
          </div>

          <div className="tasks-block">
            <div className="notes-block-header">
              <span>Tasks</span>
            </div>
            {event.tasks.length === 0 && <p className="empty-hint">No tasks yet.</p>}
            <ul className="task-list">
              {event.tasks.map((task) => (
                <li key={task.id} className={`task-item ${task.done ? "done" : ""}`}>
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={(e) => onUpdateTask(task.id, { done: e.target.checked })}
                  />
                  <span className="task-name">{task.name}</span>
                  <Dropdown
                    className="assignee-dropdown"
                    value={task.assigneeUserId ?? ""}
                    onChange={(v) => onUpdateTask(task.id, { assigneeUserId: v || null })}
                    placeholder="Assign"
                    options={assigneeOptions}
                  />
                  <button className="icon-btn" title="Remove task" onClick={() => onDeleteTask(task.id)}>
                    <IconClose />
                  </button>
                </li>
              ))}
            </ul>
            <form className="task-add-form" onSubmit={submitTask}>
              <input
                type="text"
                placeholder="New task…"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
              />
              <Dropdown
                className="assignee-dropdown"
                value={taskAssignee}
                onChange={setTaskAssignee}
                placeholder="Assign"
                options={assigneeOptions}
              />
              <button className="btn small" type="submit">Add task</button>
            </form>
          </div>

          <div className="card-footer">
            {confirmDelete ? (
              <span className="confirm-row">
                Delete this task?
                <button className="btn small danger" onClick={onDeleteEvent}>Yes, delete</button>
                <button className="btn small ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
              </span>
            ) : (
              <button className="icon-btn danger" title="Delete task" onClick={() => setConfirmDelete(true)}>
                <IconTrash />
              </button>
            )}
            <button className="btn small primary card-footer-right" onClick={() => setEditing(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

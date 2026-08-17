import { useState } from "react";
import type { EventItem, Section, Task } from "../types";
import { formatDateShort, formatTime } from "../dateUtils";
import { IconCheck, IconChevronRight, IconCircle, IconClose, IconTrash } from "./Icons";
import Dropdown from "./Dropdown";

type Props = {
  event: EventItem;
  section: Section | undefined;
  sections: Section[];
  defaultExpanded?: boolean;
  onUpdateEvent: (patch: Partial<Pick<EventItem, "title" | "date" | "time" | "sectionId" | "notes">>) => void;
  onDeleteEvent: () => void;
  onAddTask: (name: string, assignee: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<Pick<Task, "name" | "assignee" | "done">>) => void;
  onDeleteTask: (taskId: string) => void;
};

export default function EventCard({
  event,
  section,
  sections,
  defaultExpanded = false,
  onUpdateEvent,
  onDeleteEvent,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [editing, setEditing] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const doneCount = event.tasks.filter((t) => t.done).length;

  function toggleExpanded() {
    setExpanded((v) => {
      const next = !v;
      if (!next) {
        setEditing(false);
        setConfirmDelete(false);
      }
      return next;
    });
  }

  function submitTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskName.trim()) return;
    onAddTask(taskName.trim(), taskAssignee.trim());
    setTaskName("");
    setTaskAssignee("");
  }

  return (
    <div className="card" style={{ borderLeftColor: section?.color ?? "#ccc" }}>
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
      </button>

      {expanded && !editing && (
        <div className="card-body card-view">
          <div className="card-meta">
            {formatDateShort(event.date)}
            {event.time && ` · ${formatTime(event.time)}`}
          </div>

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
                    {task.assignee && <span className="task-assignee-view">{task.assignee}</span>}
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
              Section
              <Dropdown
                value={event.sectionId ?? ""}
                onChange={(v) => onUpdateEvent({ sectionId: v || null })}
                placeholder="No section"
                options={[
                  { value: "", label: "No section" },
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
                  <input
                    className="assignee-input"
                    type="text"
                    placeholder="Assign to…"
                    value={task.assignee}
                    onChange={(e) => onUpdateTask(task.id, { assignee: e.target.value })}
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
              <input
                type="text"
                placeholder="Assign to…"
                value={taskAssignee}
                onChange={(e) => setTaskAssignee(e.target.value)}
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

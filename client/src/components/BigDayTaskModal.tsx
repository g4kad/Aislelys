import { useState } from "react";
import type { BigDayPriority, BigDayTask } from "../types";
import Modal from "./Modal";
import { IconEdit } from "./Icons";
import { useIsMobile } from "../useIsMobile";
import { BIG_DAY_PRIORITIES } from "../constants";
import { formatTime } from "../dateUtils";

type Props = {
  sessionName: string;
  task?: BigDayTask; // opens read-only when set (edit via the pencil), adding otherwise
  onClose: () => void;
  onSave: (task: Omit<BigDayTask, "id">) => Promise<void>;
  onDelete?: () => Promise<void>;
};

export default function BigDayTaskModal({ sessionName, task, onClose, onSave, onDelete }: Props) {
  const isMobile = useIsMobile();
  // a saved task opens as a plain view; the form only shows after tapping edit
  const [editing, setEditing] = useState(!task);
  const [name, setName] = useState(task?.name ?? "");
  const [time, setTime] = useState(task?.time ?? "");
  const [priority, setPriority] = useState<BigDayPriority>(task?.priority ?? "medium");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function startEditing() {
    if (!task) return;
    setName(task.name);
    setTime(task.time);
    setPriority(task.priority);
    setNotes(task.notes);
    setConfirmDelete(false);
    setEditing(true);
  }

  // adding or deleting closes the popup; saving an edit goes back to the view
  async function run(action: () => Promise<void>, close: boolean) {
    setSaving(true);
    try {
      await action();
      if (close) onClose();
      else setEditing(false);
    } catch {
      // the page shows the error banner; keep the form open to retry
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    run(() => onSave({ name: name.trim(), time, priority, notes: notes.trim() }), !task);
  }

  if (task && !editing) {
    const priorityLabel = BIG_DAY_PRIORITIES.find((p) => p.value === task.priority)?.label ?? task.priority;
    return (
      <Modal
        title={task.name}
        onClose={onClose}
        headerActions={
          <button type="button" className="icon-btn" onClick={startEditing} aria-label="Edit task" title="Edit task">
            <IconEdit size={15} />
          </button>
        }
      >
        <div className="big-day-task-view">
          <dl className="big-day-task-view-meta">
            <div>
              <dt>Session</dt>
              <dd>{sessionName}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd className={task.time ? "big-day-task-view-time" : "empty-hint"}>
                {task.time ? formatTime(task.time) : "No time set"}
              </dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>
                <span className={`big-day-priority-pill priority-${task.priority}`}>{priorityLabel}</span>
              </dd>
            </div>
          </dl>
          <div className="big-day-task-view-notes">
            <h3>Notes</h3>
            {task.notes ? <p>{task.notes}</p> : <p className="empty-hint">No notes.</p>}
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={task ? "Edit task" : `Add task to ${sessionName}`} onClose={onClose}>
      <form className="event-form" onSubmit={handleSubmit}>
        <label>
          Name of task
          <input
            type="text"
            placeholder="e.g. Bridal party arrives"
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus={!isMobile}
            required
          />
        </label>

        <label>
          Time (optional)
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>

        <div className="big-day-priority-field">
          <span className="big-day-field-label">Priority</span>
          <div className="big-day-priority" role="radiogroup" aria-label="Priority">
            {BIG_DAY_PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={priority === p.value}
                className={`big-day-priority-option priority-${p.value}${priority === p.value ? " active" : ""}`}
                onClick={() => setPriority(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <label>
          Notes
          <textarea
            rows={3}
            placeholder="Any details worth remembering…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <div className="btn-row">
          <button type="submit" className="btn primary" disabled={saving}>
            {task ? "Save task" : "Add task"}
          </button>
          <button type="button" className="btn ghost" onClick={task ? () => setEditing(false) : onClose}>
            Cancel
          </button>
          {onDelete &&
            (confirmDelete ? (
              <button type="button" className="btn danger big-day-task-delete" disabled={saving} onClick={() => run(onDelete, true)}>
                Yes, delete
              </button>
            ) : (
              <button type="button" className="btn ghost big-day-task-delete" onClick={() => setConfirmDelete(true)}>
                Delete
              </button>
            ))}
        </div>
      </form>
    </Modal>
  );
}

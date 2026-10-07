import { useState } from "react";
import type { BigDayPriority, BigDayTask } from "../types";
import Modal from "./Modal";
import { useIsMobile } from "../useIsMobile";

export const BIG_DAY_PRIORITIES: { value: BigDayPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

type Props = {
  sessionName: string;
  task?: BigDayTask; // editing when set, adding otherwise
  onClose: () => void;
  onSave: (task: Omit<BigDayTask, "id">) => Promise<void>;
  onDelete?: () => Promise<void>;
};

export default function BigDayTaskModal({ sessionName, task, onClose, onSave, onDelete }: Props) {
  const isMobile = useIsMobile();
  const [name, setName] = useState(task?.name ?? "");
  const [time, setTime] = useState(task?.time ?? "");
  const [priority, setPriority] = useState<BigDayPriority>(task?.priority ?? "medium");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function run(action: () => Promise<void>) {
    setSaving(true);
    try {
      await action();
      onClose();
    } catch {
      setSaving(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    run(() => onSave({ name: name.trim(), time, priority, notes: notes.trim() }));
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
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          {onDelete &&
            (confirmDelete ? (
              <button type="button" className="btn danger big-day-task-delete" disabled={saving} onClick={() => run(onDelete)}>
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

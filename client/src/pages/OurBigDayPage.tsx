import { useEffect, useState } from "react";
import type { BigDay, BigDaySession, BigDayTask } from "../types";
import * as api from "../api";
import Dropdown from "../components/Dropdown";
import BigDayTaskModal from "../components/BigDayTaskModal";
import { BIG_DAY_PRIORITIES } from "../constants";
import { formatTime } from "../dateUtils";
import Modal from "../components/Modal";
import { IconLayers } from "../components/Icons";
import { useIsMobile } from "../useIsMobile";

// below this the full timeline no longer fits beside the sessions, so it
// moves behind a button (matches the stacking breakpoint in App.css)
const FULL_TIMELINE_POPUP_WIDTH = 860;

const MAX_DAYS = 10;
const MAX_SESSIONS = 10;

// Placeholders only — every session name starts blank. Each list fits that
// many sessions, in the order they happen; 4–9 build up from the core day
// (Pre-Wedding → Reception → After Wedding) towards the full 10.
const SESSION_EXAMPLES: Record<number, string[]> = {
  1: ["Wedding Reception"],
  2: ["Pre Wedding", "Wedding Reception"],
  3: ["Pre Wedding", "Wedding Reception", "After Wedding"],
  4: ["Pre-Wedding", "Reception", "Party", "After Wedding"],
  5: ["Morning of the Wedding", "Pre-Wedding", "Reception", "Party", "After Wedding"],
  6: ["Morning of the Wedding", "Pre-Wedding", "Reception", "Party", "After Party", "After Wedding"],
  7: ["Morning of the Wedding", "Pre-Wedding", "Reception", "Lunch/Dinner", "Party", "After Party", "After Wedding"],
  8: [
    "Night before the wedding",
    "Morning of the Wedding",
    "Pre-Wedding",
    "Reception",
    "Lunch/Dinner",
    "Party",
    "After Party",
    "After Wedding",
  ],
  9: [
    "Night before the wedding",
    "Morning of the Wedding",
    "Pre-Wedding",
    "Reception",
    "Lunch/Dinner",
    "Party",
    "After Party",
    "After Wedding",
    "Honeymoon",
  ],
  10: [
    "Night before the wedding",
    "Morning of the Wedding",
    "Pre-Wedding",
    "Reception",
    "Lunch/Dinner",
    "Party",
    "After Party",
    "Tear down",
    "After Wedding",
    "Honeymoon",
  ],
};

function sessionLabel(session: BigDaySession, index: number) {
  return session.name || `Session ${index + 1}`;
}

function blankSession(day = 1): BigDaySession {
  return { id: crypto.randomUUID(), name: "", day, tasks: [] };
}

function CountPicker({ value, max, onChange, label }: { value: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="big-day-count" role="radiogroup" aria-label={label}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          className={`big-day-count-option${value === n ? " active" : ""}`}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function BigDaySetup({
  initial,
  onSave,
  onCancel,
  onReset,
}: {
  initial: BigDay | null;
  onSave: (b: BigDay) => Promise<void>;
  onCancel?: () => void;
  onReset?: () => Promise<void>;
}) {
  const [days, setDays] = useState(initial?.days ?? 1);
  const [sessions, setSessions] = useState<BigDaySession[]>(initial?.sessions ?? [blankSession()]);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const taskCount = initial?.sessions.reduce((n, s) => n + s.tasks.length, 0) ?? 0;

  async function handleReset() {
    if (!onReset) return;
    setSaving(true);
    try {
      await onReset();
    } finally {
      setSaving(false);
    }
  }

  function changeDays(n: number) {
    setDays(n);
    setSessions((prev) => prev.map((s) => (s.day > n ? { ...s, day: n } : s)));
  }

  function changeSessionCount(n: number) {
    setSessions((prev) =>
      n <= prev.length
        ? prev.slice(0, n)
        : [...prev, ...Array.from({ length: n - prev.length }, () => blankSession(prev[prev.length - 1]?.day ?? 1))]
    );
  }

  function updateSession(id: string, patch: Partial<BigDaySession>) {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ days, sessions });
    } finally {
      setSaving(false);
    }
  }

  const dayOptions = Array.from({ length: days }, (_, i) => ({ value: String(i + 1), label: `Day ${i + 1}` }));

  return (
    <form className="settings-card big-day-setup event-form" onSubmit={handleSubmit}>
      <div className="big-day-setup-step">
        <h3>How many days is the wedding?</h3>
        <CountPicker value={days} max={MAX_DAYS} onChange={changeDays} label="Number of days" />
      </div>

      <div className="big-day-setup-step">
        <h3>How many sessions are happening?</h3>
        <p className="form-hint">
          Each session gets its own timeline — like a tea ceremony, the reception, or an after party.
        </p>
        <CountPicker value={sessions.length} max={MAX_SESSIONS} onChange={changeSessionCount} label="Number of sessions" />
      </div>

      <div className="big-day-setup-step">
        <h3>Name your sessions</h3>
        <p className="form-hint">Optional — you can leave these blank and name them later.</p>
        <div className="big-day-session-fields">
          {sessions.map((s, i) => (
            <div key={s.id} className="field-row big-day-session-field">
              <label>
                Session {i + 1}
                <input
                  type="text"
                  maxLength={60}
                  placeholder={`e.g. ${SESSION_EXAMPLES[sessions.length]?.[i] ?? "Reception"}`}
                  value={s.name}
                  onChange={(e) => updateSession(s.id, { name: e.target.value })}
                />
              </label>
              {days > 1 && (
                <label className="big-day-session-day">
                  Day
                  <Dropdown
                    value={String(s.day)}
                    onChange={(v) => updateSession(s.id, { day: Number(v) })}
                    options={dayOptions}
                  />
                </label>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="btn-row">
        <button type="submit" className="btn primary" disabled={saving}>
          {initial ? "Save changes" : "Set up our big day"}
        </button>
        {onCancel && (
          <button type="button" className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        {onReset && !confirmReset && (
          <button type="button" className="btn ghost big-day-reset" onClick={() => setConfirmReset(true)}>
            Reset
          </button>
        )}
      </div>

      {onReset && confirmReset && (
        <div className="big-day-reset-confirm">
          <p>
            This clears every session
            {taskCount > 0 ? ` and all ${taskCount} task${taskCount === 1 ? "" : "s"}` : ""} and starts the setup
            again. It can’t be undone.
          </p>
          <div className="btn-row">
            <button type="button" className="btn danger" disabled={saving} onClick={handleReset}>
              Yes, reset everything
            </button>
            <button type="button" className="btn ghost" onClick={() => setConfirmReset(false)}>
              Keep it
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

// timed tasks in time order, then the ones without a time in the order added
function sortedTasks(tasks: BigDayTask[]) {
  return [...tasks].sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
}

// Morning is until noon, afternoon until 5 PM, evening the rest of the day;
// tasks with no time go in their own group at the end.
const TIME_OF_DAY = [
  { key: "morning", label: "Morning", until: "12:00" },
  { key: "afternoon", label: "Afternoon", until: "17:00" },
  { key: "evening", label: "Evening", until: "24:00" },
] as const;

function tasksByTimeOfDay(tasks: BigDayTask[]) {
  const sorted = sortedTasks(tasks);
  const groups: { key: string; label: string; tasks: BigDayTask[] }[] = TIME_OF_DAY.map((g, gi) => ({
    key: g.key,
    label: g.label,
    tasks: sorted.filter((t) => t.time && t.time < g.until && (gi === 0 || t.time >= TIME_OF_DAY[gi - 1].until)),
  }));
  groups.push({ key: "untimed", label: "No time set", tasks: sorted.filter((t) => !t.time) });
  return groups.filter((g) => g.tasks.length > 0);
}

function PriorityPill({ priority }: { priority: BigDayTask["priority"] }) {
  const label = BIG_DAY_PRIORITIES.find((p) => p.value === priority)?.label ?? priority;
  return <span className={`big-day-priority-pill priority-${priority}`}>{label}</span>;
}

function SessionTimeline({
  session,
  index,
  onAddTask,
  onOpenTask,
}: {
  session: BigDaySession;
  index: number;
  onAddTask: () => void;
  onOpenTask: (task: BigDayTask) => void;
}) {
  const groups = tasksByTimeOfDay(session.tasks);
  return (
    <section className="card big-day-session">
      <div className="big-day-session-header">
        <h4 className="card-title">{sessionLabel(session, index)}</h4>
        <button type="button" className="btn small primary btn-add-primary" onClick={onAddTask}>
          + Add task
        </button>
      </div>
      {groups.length === 0 ? (
        <p className="empty-hint big-day-session-empty">Nothing on this timeline yet.</p>
      ) : (
        groups.map((g) => (
          <div key={g.key} className="big-day-task-group">
            <h5 className="big-day-task-group-title">{g.label}</h5>
            <ul className="big-day-task-list">
              {g.tasks.map((t) => (
                <li key={t.id}>
                  <button type="button" className="big-day-task" onClick={() => onOpenTask(t)}>
                    <span className="big-day-task-time">{t.time ? formatTime(t.time) : "—"}</span>
                    <span className="big-day-task-main">
                      <span className="big-day-task-name">{t.name}</span>
                      {t.notes && <span className="big-day-task-notes">{t.notes}</span>}
                    </span>
                    <PriorityPill priority={t.priority} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

function sessionsByDay(bigDay: BigDay) {
  return Array.from({ length: bigDay.days }, (_, d) => d + 1).map((day) => ({
    day,
    sessions: bigDay.sessions.map((s, i) => ({ s, i })).filter(({ s }) => s.day === day),
  }));
}

// Every session, day by day, on one line — the whole wedding at a glance.
// Sits beside the sessions on wide screens, in a popup on narrow ones.
function FullTimeline({ bigDay }: { bigDay: BigDay }) {
  return (
    <>
      {sessionsByDay(bigDay)
        .filter(({ sessions }) => sessions.length > 0)
        .map(({ day, sessions }) => (
          <div key={day} className="big-day-full-day">
            {bigDay.days > 1 && <h4 className="big-day-full-day-title">Day {day}</h4>}
            <ol className="big-day-full-list">
              {sessions.map(({ s, i }) => (
                <li key={s.id} className="big-day-full-item">
                  <span className="big-day-full-name">{sessionLabel(s, i)}</span>
                  {s.tasks.length === 0 ? (
                    <span className="empty-hint">Nothing scheduled yet.</span>
                  ) : (
                    tasksByTimeOfDay(s.tasks).map((g) => (
                      <div key={g.key} className="big-day-full-group">
                        <span className="big-day-full-group-title">{g.label}</span>
                        <ul className="big-day-full-tasks">
                          {g.tasks.map((t) => (
                            <li key={t.id} className="big-day-full-task">
                              <span className="big-day-full-task-time">{t.time ? formatTime(t.time) : "—"}</span>
                              <span className="big-day-full-task-name">{t.name}</span>
                              {t.priority === "high" && (
                                <span className="big-day-full-task-flag" title="High priority" aria-label="High priority" />
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  )}
                </li>
              ))}
            </ol>
          </div>
        ))}
    </>
  );
}

export default function OurBigDayPage() {
  const [bigDay, setBigDay] = useState<BigDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [showFullTimeline, setShowFullTimeline] = useState(false);
  const timelineInPopup = useIsMobile(FULL_TIMELINE_POPUP_WIDTH);
  // the session a task is being added to, or the task being viewed/edited
  const [taskModal, setTaskModal] = useState<{ sessionId: string; taskId?: string } | null>(null);

  useEffect(() => {
    api
      .getBigDay()
      .then(setBigDay)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(next: BigDay) {
    try {
      setBigDay(await api.saveBigDay(next));
      setEditing(false);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleReset() {
    try {
      await api.resetBigDay();
      setBigDay(null);
      setEditing(false);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  // modal actions rethrow so the modal stays open (with the banner showing) on failure
  async function applyTaskChange(change: Promise<BigDay>) {
    try {
      setBigDay(await change);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }

  const showSetup = !loading && (!bigDay || editing);
  const modalSessionIndex = bigDay?.sessions.findIndex((s) => s.id === taskModal?.sessionId) ?? -1;
  const modalSession = bigDay && modalSessionIndex !== -1 ? bigDay.sessions[modalSessionIndex] : null;
  const modalTask = taskModal?.taskId ? modalSession?.tasks.find((t) => t.id === taskModal.taskId) : undefined;

  return (
    <div className="our-big-day-page">
      {error && (
        <div className="error-banner" onClick={() => setError(null)}>
          {error} (click to dismiss)
        </div>
      )}

      <div className="board-region-header">
        <h2 className="board-region-title">Our Big Day</h2>
        {bigDay && !editing && timelineInPopup && (
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShowFullTimeline(true)}
            title="Full timeline"
            aria-label="Full timeline"
          >
            <IconLayers />
          </button>
        )}
      </div>

      <p className="page-subtitle">
        {bigDay
          ? "The timeline for every part of the day, session by session."
          : "Let’s set up your big day. Tell us how many days it runs and how many sessions are happening — each one gets its own timeline."}
      </p>

      {loading && <p className="empty-hint">Loading…</p>}

      {showSetup && (
        <BigDaySetup
          initial={bigDay}
          onSave={handleSave}
          onCancel={bigDay ? () => setEditing(false) : undefined}
          onReset={bigDay ? handleReset : undefined}
        />
      )}

      {bigDay && !editing && (
        <div className="big-day-layout">
          <div className="big-day-days">
            {sessionsByDay(bigDay).map(({ day, sessions }) => (
              <div key={day} className="big-day-day">
                {bigDay.days > 1 && <h3 className="big-day-day-title">Day {day}</h3>}
                {sessions.length === 0 ? (
                  <p className="empty-hint">No sessions on this day.</p>
                ) : (
                  <div className="big-day-sessions">
                    {sessions.map(({ s, i }) => (
                      <SessionTimeline
                        key={s.id}
                        session={s}
                        index={i}
                        onAddTask={() => setTaskModal({ sessionId: s.id })}
                        onOpenTask={(task) => setTaskModal({ sessionId: s.id, taskId: task.id })}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {!timelineInPopup && (
            <aside className="big-day-full">
              <h3 className="big-day-full-title">Full Timeline</h3>
              <FullTimeline bigDay={bigDay} />
            </aside>
          )}
        </div>
      )}

      {bigDay && !editing && (
        <div className="board-footer">
          <button type="button" className="btn ghost" onClick={() => setEditing(true)}>
            Edit setup
          </button>
        </div>
      )}

      {showFullTimeline && bigDay && timelineInPopup && (
        <Modal title="Full Timeline" onClose={() => setShowFullTimeline(false)} className="timeline-modal">
          <FullTimeline bigDay={bigDay} />
        </Modal>
      )}

      {taskModal && modalSession && (!taskModal.taskId || modalTask) && (
        <BigDayTaskModal
          key={taskModal.taskId ?? taskModal.sessionId}
          sessionName={sessionLabel(modalSession, modalSessionIndex)}
          task={modalTask}
          onClose={() => setTaskModal(null)}
          onSave={(task) =>
            applyTaskChange(
              modalTask ? api.updateBigDayTask(modalTask.id, task) : api.addBigDayTask(taskModal.sessionId, task)
            )
          }
          onDelete={modalTask ? () => applyTaskChange(api.deleteBigDayTask(modalTask.id)) : undefined}
        />
      )}
    </div>
  );
}

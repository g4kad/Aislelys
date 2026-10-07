import { useEffect, useState } from "react";
import type { BigDay, BigDaySession } from "../types";
import * as api from "../api";
import Dropdown from "../components/Dropdown";

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
  return { id: crypto.randomUUID(), name: "", day };
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

function BigDaySetup({ initial, onSave, onCancel }: { initial: BigDay | null; onSave: (b: BigDay) => Promise<void>; onCancel?: () => void }) {
  const [days, setDays] = useState(initial?.days ?? 1);
  const [sessions, setSessions] = useState<BigDaySession[]>(initial?.sessions ?? [blankSession()]);
  const [saving, setSaving] = useState(false);

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
      </div>
    </form>
  );
}

function SessionTimeline({ session, index }: { session: BigDaySession; index: number }) {
  return (
    <section className="card big-day-session">
      <div className="big-day-session-header">
        <h4 className="card-title">{sessionLabel(session, index)}</h4>
      </div>
      <p className="empty-hint big-day-session-empty">Nothing on this timeline yet.</p>
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
function FullTimeline({ bigDay }: { bigDay: BigDay }) {
  return (
    <aside className="big-day-full">
      <h3 className="big-day-full-title">Full Timeline</h3>
      {sessionsByDay(bigDay)
        .filter(({ sessions }) => sessions.length > 0)
        .map(({ day, sessions }) => (
          <div key={day} className="big-day-full-day">
            {bigDay.days > 1 && <h4 className="big-day-full-day-title">Day {day}</h4>}
            <ol className="big-day-full-list">
              {sessions.map(({ s, i }) => (
                <li key={s.id} className="big-day-full-item">
                  <span className="big-day-full-name">{sessionLabel(s, i)}</span>
                  <span className="empty-hint">Nothing scheduled yet.</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
    </aside>
  );
}

export default function OurBigDayPage() {
  const [bigDay, setBigDay] = useState<BigDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

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

  const showSetup = !loading && (!bigDay || editing);

  return (
    <div className="our-big-day-page">
      {error && (
        <div className="error-banner" onClick={() => setError(null)}>
          {error} (click to dismiss)
        </div>
      )}

      <div className="board-region-header">
        <h2 className="board-region-title">Our Big Day</h2>
        {bigDay && !editing && (
          <button type="button" className="btn small ghost" onClick={() => setEditing(true)}>
            Edit setup
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
        <BigDaySetup initial={bigDay} onSave={handleSave} onCancel={bigDay ? () => setEditing(false) : undefined} />
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
                      <SessionTimeline key={s.id} session={s} index={i} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <FullTimeline bigDay={bigDay} />
        </div>
      )}
    </div>
  );
}

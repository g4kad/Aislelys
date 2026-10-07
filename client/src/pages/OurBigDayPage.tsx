import { useEffect, useState } from "react";
import type { BigDay, BigDaySession } from "../types";
import * as api from "../api";
import Dropdown from "../components/Dropdown";

const MAX_DAYS = 7;
const MAX_SESSIONS = 10;

// placeholders only — every session name starts blank
const SESSION_EXAMPLES = ["Tea ceremony", "Reception", "Party", "After party", "Pre-wedding", "Church ceremony"];

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
                  placeholder={`e.g. ${SESSION_EXAMPLES[i % SESSION_EXAMPLES.length]}`}
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
        <div className="big-day-days">
          {Array.from({ length: bigDay.days }, (_, d) => d + 1).map((day) => {
            const daySessions = bigDay.sessions
              .map((s, i) => ({ s, i }))
              .filter(({ s }) => s.day === day);
            return (
              <div key={day} className="big-day-day">
                {bigDay.days > 1 && <h3 className="big-day-day-title">Day {day}</h3>}
                {daySessions.length === 0 ? (
                  <p className="empty-hint">No sessions on this day.</p>
                ) : (
                  <div className="big-day-sessions">
                    {daySessions.map(({ s, i }) => (
                      <SessionTimeline key={s.id} session={s} index={i} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

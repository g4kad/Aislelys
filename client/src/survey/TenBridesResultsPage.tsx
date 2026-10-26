import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Wordmark } from "../home/HomePage";
import * as api from "../api";
import type { SurveyResponse } from "../types";
import { SURVEY_ID, QUESTIONS, SECTIONS } from "./tenBridesQuestions";
import "./survey.css";

const STORAGE_KEY = "aislelys-survey-admin-password";

// One row per answered question, in survey order; an mcq's follow-up (e.g.
// "No, and why?") is nested right under its parent question when answered.
function rowsForSection(section: string, answers: Record<string, string>) {
  const rows: { label: string; value: string; nested?: boolean }[] = [];
  for (const q of QUESTIONS) {
    if (q.section !== section) continue;
    if (answers[q.id] === undefined) continue;
    rows.push({ label: q.prompt, value: answers[q.id] });
    if (q.type === "mcq" && q.followUp && answers[q.followUp.id] !== undefined) {
      rows.push({ label: q.followUp.placeholder, value: answers[q.followUp.id], nested: true });
    }
  }
  return rows;
}

export default function TenBridesResultsPage() {
  const [password, setPassword] = useState("");
  const [responses, setResponses] = useState<SurveyResponse[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(pw: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSurveyResponses(SURVEY_ID, pw);
      setResponses(data);
      try {
        sessionStorage.setItem(STORAGE_KEY, pw);
      } catch {
        // storage unavailable (private mode etc.) — not fatal, just won't persist
      }
    } catch (err) {
      setResponses(null);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // reuse a password already entered this session, so a refresh doesn't ask again
  useEffect(() => {
    let cached = "";
    try {
      cached = sessionStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      // ignore
    }
    if (cached) {
      setPassword(cached);
      load(cached);
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim() || loading) return;
    load(password.trim());
  }

  return (
    <div className="survey-page">
      <header className="survey-header">
        <Link to="/" aria-label="Aislelys home">
          <Wordmark />
        </Link>
      </header>

      <main className="survey-main">
        {!responses ? (
          <form className="survey-card" onSubmit={handleSubmit}>
            <p className="survey-eyebrow">Founding Brides feedback</p>
            <h1>View results</h1>
            <label className="survey-password-field">
              Admin password
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && (
              <div className="survey-error" onClick={() => setError(null)}>
                {error} (click to dismiss)
              </div>
            )}
            <button className="survey-submit" type="submit" disabled={!password.trim() || loading}>
              {loading ? "Checking…" : "View results"}
            </button>
          </form>
        ) : (
          <div className="survey-results">
            <div className="survey-results-header">
              <h1>Results — {responses.length} {responses.length === 1 ? "response" : "responses"}</h1>
              <button
                type="button"
                className="survey-refresh"
                onClick={() => load(password)}
                disabled={loading}
              >
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {responses.length === 0 ? (
              <p className="survey-empty">No responses yet.</p>
            ) : (
              <ul className="survey-results-list">
                {responses.map((r) => (
                  <li key={r.id} className="survey-result-card">
                    <div className="survey-result-meta">
                      <span className="survey-result-date">{new Date(r.createdAt).toLocaleString()}</span>
                      <span className="survey-result-submitter">
                        {r.userName ?? "Unknown"} · {r.coupleId ?? "no planner"}
                      </span>
                    </div>
                    {SECTIONS.map((section) => {
                      const rows = rowsForSection(section, r.answers);
                      if (rows.length === 0) return null;
                      return (
                        <div className="survey-result-section" key={section}>
                          <h3 className="survey-result-section-heading">{section}</h3>
                          {rows.map((row, i) => (
                            <div className={`survey-result-answer ${row.nested ? "nested" : ""}`} key={i}>
                              <span className="survey-result-key">{row.label}</span>
                              <span className="survey-result-value">{row.value || <em>(blank)</em>}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

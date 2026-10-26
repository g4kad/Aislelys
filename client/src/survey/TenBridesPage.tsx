import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Wordmark } from "../home/HomePage";
import * as api from "../api";
import type { User } from "../types";
import { SURVEY_ID, MIN_TEXT_LENGTH, QUESTIONS } from "./tenBridesQuestions";
import "./survey.css";

export default function TenBridesPage() {
  // undefined = still checking, null = signed out, User = who's signed in —
  // submitting requires being signed in, so it can be credited to an account.
  const [me, setMe] = useState<User | null | undefined>(undefined);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getMe().then(setMe).catch(() => setMe(null));
  }, []);

  function textLongEnough(id: string) {
    return (answers[id]?.trim().length ?? 0) >= MIN_TEXT_LENGTH;
  }

  const missingRequired = QUESTIONS.some((q) => {
    if (!answers[q.id]?.trim()) return true;
    if (q.type === "text" && !textLongEnough(q.id)) return true;
    if (q.type === "mcq" && q.followUp && answers[q.id] === q.followUp.whenOption) {
      if (!answers[q.followUp.id]?.trim()) return true;
      if (!textLongEnough(q.followUp.id)) return true;
    }
    return false;
  });

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  // mcq-multi answers are stored as a single ", "-joined string, like the
  // rest of the answers map, so results/validation need no special casing.
  function multiValues(id: string): string[] {
    return (answers[id] ?? "").split(", ").filter(Boolean);
  }

  function toggleMultiOption(id: string, option: string) {
    const current = multiValues(id);
    const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
    setAnswer(id, next.join(", "));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (missingRequired || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.submitSurveyResponse(SURVEY_ID, answers);
      setSubmitted(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  let lastSection = "";

  return (
    <div className="survey-page">
      <header className="survey-header">
        <Link to="/" aria-label="Aislelys home">
          <Wordmark />
        </Link>
      </header>

      <main className="survey-main">
        {me === undefined ? (
          <div className="survey-card survey-done">
            <p className="survey-intro">Loading…</p>
          </div>
        ) : me === null ? (
          <div className="survey-card survey-done">
            <p className="survey-eyebrow">Founding Brides feedback</p>
            <h1>Please sign in first</h1>
            <p className="survey-intro">
              So we can credit your feedback to your account, sign in to your Aislelys planner first, then come
              back to this page.
            </p>
            <Link className="survey-submit" to="/sign-in">
              Sign in to Aislelys
            </Link>
          </div>
        ) : submitted ? (
          <div className="survey-card survey-done">
            <h1>Thank you!</h1>
            <p>Your feedback means a lot — we read every response.</p>
          </div>
        ) : (
          <form className="survey-card" onSubmit={handleSubmit}>
            <p className="survey-eyebrow">Founding Brides feedback</p>
            <h1>Tell us how Aislelys is working for you 💍</h1>
            <div className="survey-intro-block">
              <p className="survey-intro">
                Thank you for being a Founding Bride! We're so grateful you've planned with Aislelys, and we
                can't wait to hear what you think.
              </p>
              <p className="survey-intro">
                Share the good and the not-so-good. Your feedback will shape Aislelys for every bride after you.
                Once we've reviewed your answers, we'll activate your free lifetime subscription ✨
              </p>
            </div>

            <p className="survey-signed-in-as">Signed in as {me.name}</p>

            {error && (
              <div className="survey-error" onClick={() => setError(null)}>
                {error} (click to dismiss)
              </div>
            )}

            {QUESTIONS.map((q) => {
              const showSectionHeading = q.section !== lastSection;
              lastSection = q.section;
              return (
                <div key={q.id}>
                  {showSectionHeading && <h2 className="survey-section-heading">{q.section}</h2>}
                  <div className="survey-question">
                    <span className="survey-question-label">{q.prompt}</span>

                    {q.type === "mcq" && (
                      <>
                        <div className="survey-options">
                          {q.options.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              className={`survey-option ${answers[q.id] === opt ? "selected" : ""}`}
                              onClick={() => setAnswer(q.id, opt)}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                        {q.followUp && answers[q.id] === q.followUp.whenOption && (
                          <>
                            <input
                              type="text"
                              className="survey-followup"
                              placeholder={q.followUp.placeholder}
                              value={answers[q.followUp.id] ?? ""}
                              onChange={(e) => setAnswer(q.followUp!.id, e.target.value)}
                            />
                            <span className={`survey-char-count ${textLongEnough(q.followUp.id) ? "met" : ""}`}>
                              {(answers[q.followUp.id]?.trim().length ?? 0)}/{MIN_TEXT_LENGTH} characters
                            </span>
                          </>
                        )}
                      </>
                    )}

                    {q.type === "mcq-multi" && (
                      <div className="survey-options">
                        {q.options.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            className={`survey-option ${multiValues(q.id).includes(opt) ? "selected" : ""}`}
                            onClick={() => toggleMultiOption(q.id, opt)}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}

                    {q.type === "text" && (
                      <>
                        <textarea
                          rows={3}
                          placeholder={q.placeholder}
                          value={answers[q.id] ?? ""}
                          onChange={(e) => setAnswer(q.id, e.target.value)}
                        />
                        <span className={`survey-char-count ${textLongEnough(q.id) ? "met" : ""}`}>
                          {(answers[q.id]?.trim().length ?? 0)}/{MIN_TEXT_LENGTH} characters
                        </span>
                      </>
                    )}

                    {q.type === "scale" && (
                      <div className="survey-scale">
                        {q.minLabel && <span className="survey-scale-anchor">{q.minLabel}</span>}
                        <div className="survey-scale-options">
                          {Array.from({ length: q.max - q.min + 1 }, (_, i) => q.min + i).map((n) => (
                            <button
                              key={n}
                              type="button"
                              className={`survey-scale-btn ${answers[q.id] === String(n) ? "selected" : ""}`}
                              onClick={() => setAnswer(q.id, String(n))}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                        {q.maxLabel && <span className="survey-scale-anchor">{q.maxLabel}</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <button className="survey-submit" type="submit" disabled={missingRequired || submitting}>
              {submitting ? "Sending…" : "Send feedback"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

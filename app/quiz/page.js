"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { useQuizApp } from "@/components/quiz-app-provider";
import {
  formatTime,
  getOrderedQuestions,
  QUIZ_CLASS_OPTIONS,
  QUIZ_DURATION_MINUTES,
} from "@/lib/quiz-utils";

export default function QuizPage() {
  const router = useRouter();
  const {
    answers,
    biodata,
    isHydrated,
    optionOrder,
    questionOrder,
    sheetSyncError,
    setAnswer,
    startedAt,
    submittedAt,
    submitQuiz,
  } = useQuizApp();
  const [remainingSeconds, setRemainingSeconds] = useState(QUIZ_DURATION_MINUTES * 60);
  const hasSubmittedRef = useRef(false);

  const orderedQuestions = useMemo(
    () => getOrderedQuestions(biodata.classType, questionOrder),
    [biodata.classType, questionOrder],
  );

  const answeredCount = useMemo(() => {
    return orderedQuestions.filter((question) => {
      const answer = answers[question.id];

      if (question.type === "multi") {
        return Array.isArray(answer) && answer.length > 0;
      }

      return String(answer || "").trim().length > 0;
    }).length;
  }, [answers, orderedQuestions]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!biodata.fullName || !biodata.email || !biodata.classType) {
      router.replace("/biodata");
      return;
    }

    if (!startedAt) {
      router.replace("/instructions");
      return;
    }

    if (submittedAt) {
      router.replace("/results");
      return;
    }

    const endTime =
      new Date(startedAt).getTime() + QUIZ_DURATION_MINUTES * 60 * 1000;

    const tick = () => {
      const secondsLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setRemainingSeconds(secondsLeft);

      if (secondsLeft === 0 && !hasSubmittedRef.current) {
        hasSubmittedRef.current = true;
        void submitQuiz({ reason: "timed_out" });
        router.replace("/results");
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [
    biodata.classType,
    biodata.email,
    biodata.fullName,
    isHydrated,
    router,
    startedAt,
    submittedAt,
    submitQuiz,
  ]);

  useEffect(() => {
    if (!isHydrated || !startedAt || submittedAt) {
      return undefined;
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isHydrated, startedAt, submittedAt]);

  if (!isHydrated) {
    return <div className="empty-state">Preparing quiz...</div>;
  }

  const classLabel =
    QUIZ_CLASS_OPTIONS.find((item) => item.value === biodata.classType)?.label || "-";
  const progress =
    orderedQuestions.length === 0 ? 0 : (answeredCount / orderedQuestions.length) * 100;

  const toggleMultiOption = (questionId, option) => {
    const current = Array.isArray(answers[questionId]) ? answers[questionId] : [];
    const next = current.includes(option)
      ? current.filter((item) => item !== option)
      : [...current, option];
    setAnswer(questionId, next);
  };

  const handleSubmit = () => {
    if (hasSubmittedRef.current) {
      return;
    }

    hasSubmittedRef.current = true;
    void submitQuiz({ reason: "manual" });
    router.push("/results");
  };

  return (
    <PageShell>
      <section className="quiz-shell">
        <div className="card quiz-status-bar">
          <div className="quiz-status-grid">
            <div className="status-tile">
              <span>Participant</span>
              <strong>{biodata.fullName}</strong>
            </div>
            <div className="status-tile highlight">
              <span>Time left</span>
              <strong>{formatTime(remainingSeconds)}</strong>
            </div>
            <div className="status-tile">
              <span>Answered</span>
              <strong>
                {answeredCount}/{orderedQuestions.length}
              </strong>
            </div>
            <div className="status-tile">
              <span>Class</span>
              <strong>{classLabel}</strong>
            </div>
            <div className="status-action">
              <button type="button" className="primary-button full-width" onClick={handleSubmit}>
                Submit Quiz
              </button>
            </div>
          </div>

          <div className="quiz-progress-block">
            <div className="progress-head">
              <span>Responses are saved automatically as you answer</span>
              <strong>{Math.round(progress)}% completed</strong>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="quiz-main">
          <div className="quiz-header card">
            <div>
              <span className="section-tag">Answer All Questions</span>
              <h1>{classLabel} Quiz</h1>
            </div>
            <p>
              Answer all questions before the timer expires. Your answers are saved
              automatically as you go, and the quiz will submit immediately once the
              time is exhausted.
            </p>
            <p className="support-note">
              If the browser tries to leave this page during an active session, a
              confirmation prompt may appear to help prevent accidental exits.
            </p>
            {sheetSyncError ? <p className="support-note">{sheetSyncError}</p> : null}
          </div>

          <div className="question-stack">
            {orderedQuestions.map((question, index) => {
              const currentAnswer = answers[question.id];
              const options = optionOrder[question.id] || question.options;

              return (
                <article key={question.id} className="card question-card">
                  <div className="question-topline">
                    <span className="question-number">Question {index + 1}</span>
                    {question.instruction ? (
                      <span className="question-type-tag">{question.instruction}</span>
                    ) : null}
                  </div>

                  <h3>{question.question}</h3>

                  {question.type === "text" ? (
                    <div className="text-answer-wrap">
                      <input
                        className="text-answer"
                        placeholder="Type your answer here"
                        value={currentAnswer || ""}
                        onChange={(event) => setAnswer(question.id, event.target.value)}
                      />
                    </div>
                  ) : null}

                  {question.type === "single" ? (
                    <div className="choice-list">
                      {options.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={`choice-card${currentAnswer === option ? " selected" : ""}`}
                          onClick={() => setAnswer(question.id, option)}
                        >
                          <span className="choice-indicator" aria-hidden="true" />
                          <span>{option}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {question.type === "multi" ? (
                    <div className="choice-list">
                      {options.map((option) => {
                        const selected = Array.isArray(currentAnswer) && currentAnswer.includes(option);

                        return (
                          <button
                            key={option}
                            type="button"
                            className={`choice-card multi${selected ? " selected" : ""}`}
                            onClick={() => toggleMultiOption(question.id, option)}
                          >
                            <span className="choice-indicator checkbox" aria-hidden="true" />
                            <span>{option}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  <div className="question-footer">
                    <span>{currentAnswer ? "Answer saved" : "Awaiting answer"}</span>
                    {currentAnswer ? (
                      <span className="status-pill pending">
                        {question.type === "text" ? "Saved" : "Selected"}
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

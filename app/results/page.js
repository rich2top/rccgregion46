"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { useQuizApp } from "@/components/quiz-app-provider";
import {
  getOrderedQuestions,
  isAnswerCorrect,
  QUIZ_CLASS_OPTIONS,
} from "@/lib/quiz-utils";

export default function ResultsPage() {
  const router = useRouter();
  const [showReview, setShowReview] = useState(false);
  const {
    answers,
    biodata,
    isHydrated,
    lastScore,
    questionOrder,
    sheetSyncError,
    sheetSyncStatus,
    syncSubmission,
    submittedAt,
  } = useQuizApp();

  useEffect(() => {
    if (isHydrated && !submittedAt) {
      router.replace("/instructions");
    }
  }, [isHydrated, router, submittedAt]);

  useEffect(() => {
    if (!isHydrated || !submittedAt) {
      return;
    }

    if (sheetSyncStatus !== "submitting") {
      return;
    }

    void syncSubmission();
  }, [isHydrated, sheetSyncStatus, submittedAt, syncSubmission]);

  const orderedQuestions = useMemo(
    () => getOrderedQuestions(biodata.classType, questionOrder),
    [biodata.classType, questionOrder],
  );

  if (!isHydrated) {
    return <div className="empty-state">Loading result...</div>;
  }

  if (!submittedAt) {
    return <div className="empty-state">Redirecting...</div>;
  }

  const safeScore = Number.isFinite(lastScore) ? lastScore : 0;
  const percentage = orderedQuestions.length
    ? Math.round((safeScore / orderedQuestions.length) * 100)
    : 0;
  const classLabel =
    QUIZ_CLASS_OPTIONS.find((item) => item.value === biodata.classType)?.label || "-";

  return (
    <PageShell>
      <section className="results-shell">
        <div className="card result-hero">
          <span className="section-tag">Quiz Result</span>
          <h1>
            {safeScore} out of {orderedQuestions.length}
          </h1>
          <p>
            {biodata.fullName} has completed the {classLabel} quiz. This submission
            is final and the quiz cannot be taken again.
          </p>
          {sheetSyncStatus === "submitted" ? (
            <div className="message-banner success" role="status">
              Quiz result has been saved successfully.
            </div>
          ) : null}
          {sheetSyncStatus === "submitting" ? (
            <div className="message-banner info" role="status">
              Saving quiz result to the leaderboard...
            </div>
          ) : null}
          {sheetSyncError && sheetSyncStatus === "error" ? (
            <div className="message-banner error" role="alert">
              {sheetSyncError}
            </div>
          ) : null}

          <div className="stats-strip">
            <div className="stat-card">
              <strong>{percentage}%</strong>
              <span>Score</span>
            </div>
            <div className="stat-card">
              <strong>{classLabel}</strong>
              <span>Class</span>
            </div>
            <div className="stat-card">
              <strong>{biodata.region}</strong>
              <span>Region</span>
            </div>
          </div>

          <div className="action-row">
            <button type="button" className="primary-button" onClick={() => setShowReview(true)}>
              Review My Selections
            </button>
            {sheetSyncStatus === "error" ? (
              <button type="button" className="secondary-button" onClick={() => void syncSubmission()}>
                Save Result Again
              </button>
            ) : null}
          </div>
        </div>

        {showReview ? (
          <div className="review-stack">
            {orderedQuestions.map((question, index) => {
              const answer = answers[question.id];
              const correct = isAnswerCorrect(question, answer);
              const userAnswer = Array.isArray(answer)
                ? answer.join(", ")
                : String(answer || "No answer");
              const accepted = question.acceptedAnswers.join(", ");

              return (
                <article key={question.id} className="card review-card">
                  <div className="question-topline">
                    <span className="question-number">Question {index + 1}</span>
                    <span className={`status-pill${correct ? " correct" : " wrong"}`}>
                      {correct ? "Correct" : "Wrong"}
                    </span>
                  </div>

                  <h3>{question.question}</h3>

                  <div className="review-line">
                    <span className="label">Your answer</span>
                    <strong>{userAnswer}</strong>
                  </div>
                  <div className="review-line">
                    <span className="label">Correct answer</span>
                    <strong>{accepted}</strong>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </PageShell>
  );
}

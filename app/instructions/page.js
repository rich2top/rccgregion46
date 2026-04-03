"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { useQuizApp } from "@/components/quiz-app-provider";
import {
  QUIZ_COPY,
  QUIZ_CLASS_OPTIONS,
  QUIZ_DURATION_MINUTES,
} from "@/lib/quiz-utils";

export default function InstructionsPage() {
  const router = useRouter();
  const { biodata, isHydrated, startQuiz, startedAt, submittedAt } = useQuizApp();
  const [canRedirect, setCanRedirect] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState("");

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setCanRedirect(true);
    }, 250);

    return () => window.clearTimeout(timerId);
  }, [isHydrated]);

  useEffect(() => {
    if (!isHydrated || !canRedirect) {
      return;
    }

    if (startedAt && !submittedAt) {
      router.replace("/quiz");
      return;
    }

    if (!biodata.fullName || !biodata.email || !biodata.classType) {
      router.replace("/biodata");
    }
  }, [
    biodata.classType,
    biodata.email,
    biodata.fullName,
    canRedirect,
    isHydrated,
    router,
    startedAt,
    submittedAt,
  ]);

  if (!isHydrated) {
    return <div className="empty-state">Loading instructions...</div>;
  }

  const classLabel =
    QUIZ_CLASS_OPTIONS.find((item) => item.value === biodata.classType)?.label || "-";
  const quizCopy = QUIZ_COPY[biodata.classType] || QUIZ_COPY.adult;
  const startNotice = isStarting
    ? "Checking the email address and preparing the quiz session..."
    : "";

  if (!biodata.fullName || !biodata.email || !biodata.classType) {
    return <div className="empty-state">Preparing instructions...</div>;
  }

  return (
    <PageShell>
      <section className="content-shell">
        <div className="card form-card">
          <div className="page-heading">
            <span className="section-tag">Instructions</span>
            <h1>{quizCopy.title}</h1>
            <p>{quizCopy.intro}</p>
          </div>

          <div className="participant-strip">
            <div className="participant-item">
              <span>Participant</span>
              <strong>{biodata.fullName}</strong>
            </div>
            <div className="participant-item">
              <span>Region</span>
              <strong>{biodata.region}</strong>
            </div>
            <div className="participant-item">
              <span>Email</span>
              <strong>{biodata.email}</strong>
            </div>
            <div className="participant-item">
              <span>Province</span>
              <strong>{biodata.province}</strong>
            </div>
            <div className="participant-item">
              <span>Zone</span>
              <strong>{biodata.zone}</strong>
            </div>
          </div>

          <div className="stats-strip">
            <div className="stat-card">
              <strong>{QUIZ_DURATION_MINUTES} mins</strong>
              <span>Time limit</span>
            </div>
            <div className="stat-card">
              <strong>Once</strong>
              <span>Attempt only</span>
            </div>
            <div className="stat-card">
              <strong>{classLabel}</strong>
              <span>Class</span>
            </div>
          </div>

          <ul className="instruction-list">
            {quizCopy.rules.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          {startNotice ? (
            <div className="message-banner info" role="status">
              {startNotice}
            </div>
          ) : null}
          {startError ? (
            <div className="message-banner error" role="alert">
              {startError}
            </div>
          ) : null}

          <div className="action-row">
            <button type="button" className="secondary-button" onClick={() => router.push("/biodata")}>
              Back
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={isStarting}
              onClick={async () => {
                setIsStarting(true);
                setStartError("");

                const result = await startQuiz();

                if (!result.ok) {
                  setStartError(result.error || "Unable to start the quiz at the moment.");
                  setIsStarting(false);
                  return;
                }

                window.requestAnimationFrame(() => {
                  router.push("/quiz");
                });
              }}
            >
              {isStarting ? "Starting..." : "Start Quiz"}
            </button>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

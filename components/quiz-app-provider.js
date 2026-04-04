"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  buildOptionOrder,
  calculateScore,
  getQuestionBank,
  shuffleArray,
} from "@/lib/quiz-utils";

const STORAGE_KEY = "rccg-region-46-quiz-v1";
const IS_DEVELOPMENT = process.env.NODE_ENV !== "production";

const defaultState = {
  biodata: {
    fullName: "",
    email: "",
    region: "Region 46",
    province: "",
    zone: "",
    classType: "",
  },
  answers: {},
  questionOrder: [],
  optionOrder: {},
  attemptId: null,
  startedAt: null,
  submittedAt: null,
  lastScore: null,
  submissionReason: null,
  sheetSyncStatus: "idle",
  sheetSyncError: null,
};

const QuizAppContext = createContext(null);

function persistState(nextState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

async function postQuizSync(payload) {
  const response = await fetch("/api/quiz-sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({
    ok: false,
    error: "Unexpected response from quiz sync service.",
  }));

  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Quiz sync request failed.");
  }

  return data;
}

export function QuizAppProvider({ children }) {
  const [state, setState] = useState(defaultState);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(STORAGE_KEY);

      if (storedValue) {
        setState((current) => ({
          ...current,
          ...JSON.parse(storedValue),
        }));
      }
    } catch (error) {
      console.error("Unable to load quiz state", error);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    persistState(state);
  }, [isHydrated, state]);

  const value = useMemo(() => {
    const saveBiodata = (biodata) => {
      setState((current) => {
        const nextState = {
          ...current,
          biodata,
        };
        persistState(nextState);
        return nextState;
      });
    };

    const startQuiz = async () => {
      if (state.startedAt && state.questionOrder.length > 0 && !state.submittedAt) {
        return { ok: true, resumed: true };
      }

      if (!state.biodata.email) {
        return { ok: false, error: "Email address is required." };
      }

      const questionBank = getQuestionBank(state.biodata.classType);

      if (!questionBank.length) {
        return { ok: false, error: "No questions are available for this class yet." };
      }

      const randomizedOrder = shuffleArray(questionBank.map((question) => question.id));
      const randomizedOptions = buildOptionOrder(state.biodata.classType);

      try {
        const syncResult = await postQuizSync({
          action: "startAttempt",
          biodata: state.biodata,
        });

        const nextState = {
          ...state,
          answers: {},
          questionOrder: randomizedOrder,
          optionOrder: randomizedOptions,
          attemptId: syncResult.attemptId || null,
          startedAt: syncResult.startedAt || new Date().toISOString(),
          submittedAt: null,
          lastScore: null,
          submissionReason: null,
          sheetSyncStatus: "started",
          sheetSyncError: null,
        };

        setState(nextState);
        persistState(nextState);

        return { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to start the quiz.";

        if (IS_DEVELOPMENT && /google sheet sync is not configured/i.test(message)) {
          const nextState = {
            ...state,
            answers: {},
            questionOrder: randomizedOrder,
            optionOrder: randomizedOptions,
            attemptId: null,
            startedAt: new Date().toISOString(),
            submittedAt: null,
            lastScore: null,
            submissionReason: null,
            sheetSyncStatus: "local-only",
            sheetSyncError: message,
          };

          setState(nextState);
          persistState(nextState);

          return { ok: true, fallback: true, warning: message };
        }

        return { ok: false, error: message };
      }
    };

    const setAnswer = (questionId, option) => {
      setState((current) => {
        if (current.submittedAt) {
          return current;
        }

        const nextState = {
          ...current,
          answers: {
            ...current.answers,
            [questionId]: option,
          },
        };
        persistState(nextState);
        return nextState;
      });
    };

    const syncSubmission = async (snapshot) => {
      const source = {
        ...state,
        ...(snapshot || {}),
      };

      if (!source.submittedAt) {
        return { ok: false, error: "No submitted quiz record was found." };
      }

      const totalQuestions = getQuestionBank(source.biodata.classType).length;
      const score =
        source.lastScore ??
        calculateScore(source.biodata.classType, source.questionOrder, source.answers);

      try {
        await postQuizSync({
          action: "submitAttempt",
          attemptId: source.attemptId,
          biodata: source.biodata,
          startedAt: source.startedAt,
          submittedAt: source.submittedAt,
          submissionReason: source.submissionReason || "manual",
          score,
          totalQuestions,
        });

        const nextState = {
          ...source,
          sheetSyncStatus: "submitted",
          sheetSyncError: null,
          lastScore: score,
        };

        setState(nextState);
        persistState(nextState);

        return { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to save the quiz result.";

        if (IS_DEVELOPMENT && /google sheet sync is not configured/i.test(message)) {
          const nextState = {
            ...source,
            sheetSyncStatus: "local-only",
            sheetSyncError: message,
            lastScore: score,
          };

          setState(nextState);
          persistState(nextState);

          return { ok: true, fallback: true, warning: message };
        }

        const nextState = {
          ...source,
          sheetSyncStatus: "error",
          sheetSyncError: message,
          lastScore: score,
        };

        setState(nextState);
        persistState(nextState);

        return { ok: false, error: message };
      }
    };

    const submitQuiz = async ({ reason = "manual" } = {}) => {
      if (state.submittedAt) {
        return { ok: true, alreadySubmitted: true };
      }

      const nextState = {
        ...state,
        submittedAt: new Date().toISOString(),
        lastScore: calculateScore(
          state.biodata.classType,
          state.questionOrder,
          state.answers,
        ),
        submissionReason: reason,
        sheetSyncStatus: "submitting",
        sheetSyncError: null,
      };

      setState(nextState);
      persistState(nextState);

      return syncSubmission(nextState);
    };

    const resetQuiz = ({ keepBiodata = true } = {}) => {
      setState((current) => {
        const nextState = {
          biodata: keepBiodata ? current.biodata : defaultState.biodata,
          answers: {},
          questionOrder: [],
          optionOrder: {},
          attemptId: null,
          startedAt: null,
          submittedAt: null,
          lastScore: null,
          submissionReason: null,
          sheetSyncStatus: "idle",
          sheetSyncError: null,
        };
        persistState(nextState);
        return nextState;
      });
    };

    return {
      ...state,
      isHydrated,
      saveBiodata,
      startQuiz,
      setAnswer,
      submitQuiz,
      syncSubmission,
      resetQuiz,
    };
  }, [isHydrated, state]);

  return <QuizAppContext.Provider value={value}>{children}</QuizAppContext.Provider>;
}

export function useQuizApp() {
  const context = useContext(QuizAppContext);

  if (!context) {
    throw new Error("useQuizApp must be used inside QuizAppProvider");
  }

  return context;
}

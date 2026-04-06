import { QUESTION_BANKS } from "@/lib/question-banks.generated";

export const QUIZ_DURATION_MINUTES = 45;
export const QUIZ_CLASS_OPTIONS = [
  { value: "adult", label: "Adult" },
  { value: "yaya", label: "YAYA" },
];

export const QUIZ_COPY = {
  adult: {
    title: "2026 Adult Regional CBT Quiz",
    intro:
      "Please read the instructions carefully before you begin. All questions are compulsory and each participant can attempt the quiz only once.",
    rules: [
      "Choose the correct option(s) for each question.",
      "Write all short answers in lowercase except for G in the name of God and J in the name of Jesus.",
      "Write full Bible book names when citing scriptures, for example Matthew 6:33.",
      "For one-word short answers, avoid punctuation.",
      "Your answers are saved automatically as you progress.",
      "When the timer reaches zero, the quiz submits automatically.",
      "Once submitted, the quiz cannot be taken again.",
    ],
  },
  yaya: {
    title: "2026 YAYA Regional CBT Quiz",
    intro:
      "Please read the instructions carefully before you begin. All questions are compulsory and each participant can attempt the quiz only once.",
    rules: [
      "Choose the correct option(s) for each question.",
      "Write all short answers in lowercase except for G in the name of God and J in the name of Jesus.",
      "Write full Bible book names when citing scriptures, for example Matthew 6:33.",
      "For one-word short answers, avoid punctuation.",
      "Your answers are saved automatically as you progress.",
      "When the timer reaches zero, the quiz submits automatically.",
      "Once submitted, the quiz cannot be taken again.",
    ],
  },
};

export function shuffleArray(items) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }

  return result;
}

export function getQuestionBank(classType) {
  return QUESTION_BANKS[classType] || [];
}

export function getQuestionMap(classType) {
  return new Map(getQuestionBank(classType).map((question) => [question.id, question]));
}

export function getOrderedQuestions(classType, questionOrder) {
  const bank = getQuestionBank(classType);

  if (!questionOrder?.length) {
    return bank;
  }

  const map = getQuestionMap(classType);
  return questionOrder.map((id) => map.get(id)).filter(Boolean);
}

export function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function normalizeText(value) {
  return String(value || "")
    .replace(/(\p{L})(\p{N})/gu, "$1 $2")
    .replace(/(\p{N})(\p{L})/gu, "$1 $2")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isAnswerCorrect(question, answer) {
  if (!question) {
    return false;
  }

  if (question.type === "text") {
    const normalized = normalizeText(answer);
    return question.acceptedAnswers.some(
      (item) => normalizeText(item) === normalized,
    );
  }

  if (question.type === "multi") {
    const selected = Array.isArray(answer) ? answer.map(normalizeText).sort() : [];
    const accepted = [...question.acceptedAnswers].map(normalizeText).sort();
    return JSON.stringify(selected) === JSON.stringify(accepted);
  }

  return question.acceptedAnswers.some(
    (item) => normalizeText(item) === normalizeText(answer),
  );
}

export function buildOptionOrder(classType) {
  const questionBank = getQuestionBank(classType);
  const optionOrder = {};

  questionBank.forEach((question) => {
    if (question.options.length > 1) {
      optionOrder[question.id] = shuffleArray(question.options);
    }
  });

  return optionOrder;
}

export function calculateScore(classType, questionOrder, answers) {
  return getOrderedQuestions(classType, questionOrder).reduce((total, question) => {
    return total + (isAnswerCorrect(question, answers[question.id]) ? 1 : 0);
  }, 0);
}

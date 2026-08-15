import { QuestionItem } from "@/services/question.api";

// Writing-task questions often reuse the passage prompt as the question content (e.g. "Task 1"),
// so once the passage text is already shown, showing it again as the question content is redundant.
export const normalizeText = (s?: string | null) => (s || "").replace(/\s+/g, " ").trim();

export const isSameAsPassageContent = (questionContent?: string | null, passageContent?: string | null) =>
  !!passageContent && normalizeText(questionContent) === normalizeText(passageContent);

// Fill-in-Blank authoring convention: a run of 3+ underscores ("___") inside a question's
// content marks where the inline input goes (e.g. "You need to pay ___ for the visa.").
// Returns null when no marker is present, so callers can fall back to the plain layout.
export const splitInlineBlank = (content?: string | null): { before: string; after: string } | null => {
  const match = /_{3,}/.exec(content || "");
  if (!match) return null;
  return {
    before: (content || "").slice(0, match.index).trimEnd(),
    after: (content || "").slice(match.index + match[0].length).trimStart(),
  };
};

// Note/Form/Table Completion (e.g. IELTS Listening) packs several Fill-in-Blank questions into
// one continuous notes block instead of separate cards. Consecutive runs of 2+ Fill-in-Blank
// (questionType 6) questions are grouped for that compact layout; everything else — and lone
// Fill-in-Blank questions — keeps the regular one-card-per-question layout.
export type QuestionSegment =
  | { kind: "notes"; questions: QuestionItem[] }
  | { kind: "single"; question: QuestionItem };

export const segmentQuestions = (questions: QuestionItem[]): QuestionSegment[] => {
  const segments: QuestionSegment[] = [];
  let i = 0;
  while (i < questions.length) {
    if (questions[i].questionType === 6) {
      let j = i;
      while (j < questions.length && questions[j].questionType === 6) j++;
      if (j - i >= 2) {
        segments.push({ kind: "notes", questions: questions.slice(i, j) });
        i = j;
        continue;
      }
    }
    segments.push({ kind: "single", question: questions[i] });
    i++;
  }
  return segments;
};

// Answer-key text for a Fill-in-Blank question. Deliberately not returning an A/B/C letter
// (unlike MCQ option lookups elsewhere) since that's meaningless for a fill-blank text answer.
export const getFillBlankCorrectAnswer = (q: QuestionItem): string =>
  q.questionAnswers?.find((a) => a.isCorrect)?.content ?? "";

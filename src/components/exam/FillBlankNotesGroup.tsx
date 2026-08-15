"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { QuestionItem } from "@/services/question.api";
import { splitInlineBlank } from "@/utils/examQuestionFormat";

export interface FillBlankValue {
  text: string;
  isAnswered?: boolean;
  isCorrect?: boolean | null;
}

interface FillBlankNotesGroupProps {
  // Pre-sliced run of consecutive Fill-in-Blank (questionType 6) questions, from segmentQuestions().
  questions: QuestionItem[];
  // Resolves a question to its position within the whole exam, for the "Question N" numbering.
  getGlobalIndex: (q: QuestionItem) => number;
  // "answerKey" reveals the correct answer (exam sheet / template view). "review" shows what the
  // student actually submitted, color-coded correct/incorrect (attempt review views).
  mode: "answerKey" | "review";
  getBlankValue: (q: QuestionItem) => FillBlankValue;
  className?: string;
}

export function FillBlankNotesGroup({
  questions,
  getGlobalIndex,
  mode,
  getBlankValue,
  className,
}: FillBlankNotesGroupProps) {
  const { t } = useTranslation();

  return (
    <div
      className={
        className ??
        "p-5 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-xl shadow-xs space-y-2.5"
      }
    >
      {questions.map((q) => {
        const globalIdx = getGlobalIndex(q);
        const inline = splitInlineBlank(q.content);
        const val = getBlankValue(q);

        const valueEl =
          mode === "answerKey" ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900/40">
              {val.text || "—"}
            </span>
          ) : (
            <span
              className={
                !val.isAnswered
                  ? "italic text-gray-400"
                  : val.isCorrect
                  ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "text-rose-600 dark:text-rose-400 font-semibold"
              }
            >
              {val.isAnswered ? val.text : t("exams.attemptUnanswered")}
            </span>
          );

        return (
          <React.Fragment key={q.id}>
            {q.instruction && (
              <p className="text-xs font-bold text-gray-600 dark:text-gray-300 tracking-wide whitespace-pre-wrap pt-2 first:pt-0">
                {q.instruction}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-500 text-white text-[11px] font-black shrink-0">
                {globalIdx + 1}
              </span>
              {inline ? (
                <>
                  {inline.before && <span className="whitespace-pre-wrap">{inline.before}</span>}
                  {valueEl}
                  {inline.after && <span className="whitespace-pre-wrap">{inline.after}</span>}
                </>
              ) : (
                <>
                  <span className="whitespace-pre-wrap">{q.content}</span>
                  {valueEl}
                </>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { QuestionItem } from "@/services/question.api";
import { useTranslation } from "react-i18next";

interface QuestionViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: QuestionItem;
}

export function QuestionViewModal({ isOpen, onClose, question }: QuestionViewModalProps) {
  const { t } = useTranslation();

  const getDifficultyBadgeColor = (level: number) => {
    switch (level) {
      case 1:
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
      case 2:
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
      case 3:
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20";
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[700px] p-6 sm:p-8">
      <div className="flex flex-col gap-6">
        {/* Modal Header */}
        <div className="border-b border-gray-100 dark:border-white/[0.05] pb-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
              {question.questionTypeName}
            </span>
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getDifficultyBadgeColor(question.difficultyLevel)}`}>
              {t("question.colDifficulty")}: {question.difficultyLevelName}
            </span>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {t("question.colPoint")}: {question.point ?? 0}
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {question.name}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t("question.viewModalCode")}: {question.code} • {t("question.viewModalCreatedBy")}: {question.createdBy || t("question.viewModalSystem")}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-5">
          {/* Question Content */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">
              {t("question.viewModalContent")}
            </h4>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap leading-relaxed border border-gray-100 dark:border-gray-800">
              {question.content}
            </div>
          </div>

          {/* Choices/Answers */}
          {question.questionType !== 3 && question.questionAnswers && question.questionAnswers.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">
                {t("question.viewModalAnswers")}
              </h4>
              <div className="space-y-2.5">
                {question.questionAnswers.map((answer, index) => {
                  const optionLabel = String.fromCharCode(65 + index); // A, B, C, D...
                  return (
                    <div
                      key={answer.id || index}
                      className={`flex items-start gap-3 p-3.5 rounded-lg border text-sm transition-all ${
                        answer.isCorrect
                          ? "bg-emerald-50/60 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20 text-emerald-950 dark:text-emerald-300 font-medium"
                          : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-850 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <span
                        className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${
                          answer.isCorrect
                            ? "bg-emerald-500 text-white"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                        }`}
                      >
                        {optionLabel}
                      </span>
                      <div className="flex-1 break-words">{answer.content}</div>
                      {answer.isCorrect && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                          ✓ {t("question.viewModalCorrect")}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Explanation */}
          {question.explanation && (
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">
                {t("question.viewModalExplanation")}
              </h4>
              <div className="p-4 bg-amber-50/20 dark:bg-amber-500/5 rounded-lg text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed border border-amber-100/50 dark:border-amber-500/10">
                {question.explanation}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-white/[0.05]">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
          >
            {t("question.viewModalClose")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

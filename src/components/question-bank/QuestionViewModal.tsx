"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { QuestionPassageItem } from "@/services/questionPassage.api";
import { QuestionItem } from "@/services/question.api";
import { useTranslation } from "react-i18next";
import { BookOpen, Volume2, PenTool, Mic, CheckCircle } from "lucide-react";

import { ENV } from "@/config/env";

interface QuestionViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  passage: QuestionPassageItem | null;
  childQuestions?: QuestionItem[];
}

const getFileUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }
  return `${ENV.API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

export function QuestionViewModal({ isOpen, onClose, passage, childQuestions = [] }: QuestionViewModalProps) {
  const { t } = useTranslation();

  if (!passage) return null;

  const getSkillBadgeClass = (skillType: number) => {
    switch (skillType) {
      case 1:
        return "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200/50";
      case 2:
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50";
      case 3:
        return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/50";
      case 4:
        return "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200/50";
      default:
        return "bg-gray-50 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400";
    }
  };

  const getSkillName = (skillType: number) => {
    switch (skillType) {
      case 1:
        return t("question.skillListening", { defaultValue: "Listening" });
      case 2:
        return t("question.skillReading", { defaultValue: "Reading" });
      case 3:
        return t("question.skillSpeaking", { defaultValue: "Speaking" });
      case 4:
        return t("question.skillWriting", { defaultValue: "Writing" });
      default:
        return t("question.filterSkill", { defaultValue: "Kỹ năng" });
    }
  };

  const displayQuestions = childQuestions.length > 0 ? childQuestions : passage.questions || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[760px] p-6 sm:p-8">
      <div className="flex flex-col gap-6 max-h-[85vh] overflow-y-auto custom-scrollbar pr-1">
        {/* Modal Header */}
        <div className="border-b border-gray-100 dark:border-white/[0.05] pb-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getSkillBadgeClass(passage.skillType)}`}>
              {getSkillName(passage.skillType)}
            </span>
            {passage.categoryName && (
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {passage.categoryName}
              </span>
            )}
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
              {displayQuestions.length} {t("questionPassage.childQuestionCount", { defaultValue: "câu hỏi" })}
            </span>
          </div>

          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {passage.title}
          </h3>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("question.viewModalCode", { defaultValue: "Mã" })}: <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{passage.code}</span>
          </p>
        </div>

        {/* Passage Content Section */}
        {passage.content && (
          <div>
            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              📖 {t("questionPassage.passageReadingContentLabel", { defaultValue: "Nội dung Đề bài / Đoạn văn" })}
            </h4>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl text-gray-800 dark:text-gray-200 text-sm font-serif leading-relaxed whitespace-pre-wrap border border-gray-100 dark:border-gray-800">
              {passage.content}
            </div>
          </div>
        )}

        {/* Passage Image Section */}
        {passage.attachmentUrl && (
          <div>
            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              🖼️ {t("questionPassage.imagePreviewLabel", { defaultValue: "Hình ảnh minh họa:" })}
            </h4>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getFileUrl(passage.attachmentUrl)}
              alt=""
              className="max-h-72 rounded-xl border border-gray-100 dark:border-gray-800"
            />
          </div>
        )}

        {/* Audio Player Section */}
        {passage.audioUrl && (
          <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50 space-y-2">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4" /> {t("questionPassage.audioPreviewLabel", { defaultValue: "File âm thanh bài nghe:" })}
            </span>
            <audio controls src={getFileUrl(passage.audioUrl)} className="w-full h-9 rounded-lg" />
          </div>
        )}

        {/* Child Questions List */}
        <div>
          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            📝 {t("questionPassage.step3Title", { count: displayQuestions.length, defaultValue: `Danh sách câu hỏi (${displayQuestions.length} câu)` })}
          </h4>

          {displayQuestions.length === 0 ? (
            <p className="text-sm text-gray-400 italic p-4 text-center bg-gray-50 dark:bg-gray-900 rounded-xl">
              Chưa có câu hỏi nào trong bộ đề này.
            </p>
          ) : (
            <div className="space-y-4">
              {displayQuestions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                    <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-500 text-white text-[11px] font-bold">
                        {idx + 1}
                      </span>
                      {q.code || `Câu #${idx + 1}`}
                    </span>
                  </div>

                  {q.instruction && (
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-lg px-2.5 py-1.5 whitespace-pre-wrap">
                      {q.instruction}
                    </p>
                  )}

                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {q.content || q.name}
                  </p>

                  {/* Answers */}
                  {(q.answers || q.questionAnswers || []).length > 0 && (
                    <div className="space-y-2 pt-1">
                      {(q.answers || q.questionAnswers || []).map((ans, aIdx) => {
                        const optionLabel = String.fromCharCode(65 + aIdx);
                        return (
                          <div
                            key={ans.id || aIdx}
                            className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs transition-all ${
                              ans.isCorrect
                                ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 text-emerald-950 dark:text-emerald-300 font-medium"
                                : "bg-gray-50/50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            <span
                              className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 ${
                                ans.isCorrect
                                  ? "bg-emerald-500 text-white"
                                  : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                              }`}
                            >
                              {optionLabel}
                            </span>
                            <div className="flex-1 break-words leading-relaxed pt-0.5">{ans.content}</div>
                            {ans.isCorrect && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                <CheckCircle className="w-3.5 h-3.5" /> Đúng
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Explanation */}
                  {q.explanation && (
                    <div className="p-2.5 bg-amber-50/40 dark:bg-amber-950/10 rounded-lg text-xs text-amber-900 dark:text-amber-300 border border-amber-100 dark:border-amber-900/30">
                      💡 <strong>Giải thích:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-white/[0.05]">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            {t("question.viewModalClose", { defaultValue: "Đóng" })}
          </button>
        </div>
      </div>
    </Modal>
  );
}

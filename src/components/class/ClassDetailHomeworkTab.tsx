"use client";

import React from "react";
import { FileText } from "lucide-react";

interface ClassDetailHomeworkTabProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

export default function ClassDetailHomeworkTab({
  t,
}: ClassDetailHomeworkTabProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs p-6 space-y-6 animate-fadeIn">
      <h3 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-50 dark:border-gray-800 pb-3">
        <FileText className="w-5 h-5 text-brand-500" />
        <span>{t("class.homeworkTitle", { defaultValue: "Danh sách bài tập" })}</span>
      </h3>
      
      <div className="space-y-4">
        {[
          { id: 1, title: "Bài tập 1: IELTS Listening Practice Test 1 - Section 1", questions: 10, deadline: "02/07/2026", status: "expired" },
          { id: 2, title: "Bài tập 2: Reading Matching Headings & True/False/Not Given", questions: 15, deadline: "06/07/2026", status: "active" },
          { id: 3, title: "Bài tập 3: Writing Task 1 Introduction & Overview draft", questions: 1, deadline: "10/07/2026", status: "active" },
        ].map((hw) => (
          <div
            key={hw.id}
            className="p-4 rounded-xl border border-gray-150 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xs hover:border-brand-300 dark:hover:border-brand-500 transition-colors flex items-center justify-between gap-4"
          >
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {hw.title}
              </h4>
              <div className="flex flex-wrap gap-3 items-center mt-1.5">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  📝 {hw.questions} {t("class.colQuestions", { defaultValue: "câu hỏi" })}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ⏰ Hạn nộp: {hw.deadline}
                </span>
              </div>
            </div>
            
            <div>
              <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold ${
                hw.status === "active"
                  ? "bg-emerald-50 text-emerald-650 dark:bg-emerald-500/10 dark:text-emerald-500"
                  : "bg-rose-50 text-rose-650 dark:bg-rose-500/10 dark:text-rose-500"
              }`}>
                {hw.status === "active" ? t("class.statusActive") : t("class.statusExpired", { defaultValue: "Hết hạn" })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { BookOpen } from "lucide-react";

interface ClassDetailSyllabusTabProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

export default function ClassDetailSyllabusTab({
  t,
}: ClassDetailSyllabusTabProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs p-6 space-y-6 animate-fadeIn">
      <h3 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-50 dark:border-gray-800 pb-3">
        <BookOpen className="w-5 h-5 text-brand-500" />
        <span>{t("class.syllabusTitle", { defaultValue: "Giáo án giảng dạy" })}</span>
      </h3>
      
      <div className="space-y-4">
        {[
          { id: 1, title: "Buổi 1: Tổng quan IELTS & Định hướng học tập", desc: "Giới thiệu cấu trúc đề thi IELTS Academic & General. Bài kiểm tra đánh giá năng lực đầu vào ngắn.", date: "01/07/2026", status: "completed" },
          { id: 2, title: "Buổi 2: Kỹ năng Nghe (Listening) - Section 1 & 2", desc: "Cách xử lý các dạng bài Form Completion, Multiple Choice đơn giản. Luyện nghe nhận dạng số, tên riêng.", date: "03/07/2026", status: "completed" },
          { id: 3, title: "Buổi 3: Kỹ năng Đọc (Reading) - Skimming & Scanning", desc: "Kỹ thuật đọc lướt tìm ý chính và đọc quét thông tin chi tiết. Ứng dụng vào dạng bài True/False/Not Given.", date: "05/07/2026", status: "active" },
          { id: 4, title: "Buổi 4: Kỹ năng Viết (Writing) - Task 1: Line Graph & Bar Chart", desc: "Cấu trúc bài viết Task 1, viết phần mở đầu (Introduction) và tổng quan (Overview). Cách phân tích số liệu.", date: "08/07/2026", status: "upcoming" },
          { id: 5, title: "Buổi 5: Kỹ năng Nói (Speaking) - Part 1: Topics quen thuộc", desc: "Các chủ đề Part 1: Work, Study, Hometown, Hobbies. Cách kéo dài câu trả lời bằng cách đưa ra lý do và ví dụ.", date: "10/07/2026", status: "upcoming" },
        ].map((session) => (
          <div
            key={session.id}
            className="flex gap-4 p-4 rounded-xl border border-gray-150 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-955/20 hover:border-brand-300 dark:hover:border-brand-500 transition-colors"
          >
            <div className="shrink-0">
              {session.status === "completed" ? (
                <span className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">✓</span>
              ) : session.status === "active" ? (
                <span className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xs animate-pulse">▶</span>
              ) : (
                <span className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center font-bold text-xs">○</span>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {session.title}
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-450 dark:text-gray-400 font-medium">
                    📅 {session.date}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                    session.status === "completed"
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500"
                      : session.status === "active"
                      ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-500"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}>
                    {session.status === "completed" ? t("class.statusCompleted") : session.status === "active" ? t("class.statusActive") : t("class.statusPlanning")}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                {session.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";
import React from "react";
import { GradingProgress } from "@/services/dashboard.api";
import { useTranslation } from "react-i18next";
import { BookOpen, FileText, AlertCircle } from "lucide-react";

interface Props {
  data: GradingProgress | null;
  loading?: boolean;
}

export default function GradingProgressCard({ data, loading }: Props) {
  const { t } = useTranslation();

  if (loading || !data) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] animate-pulse">
        <div className="h-5 w-48 bg-gray-200 rounded dark:bg-gray-700 mb-6" />
        <div className="space-y-4">
          <div className="h-20 bg-gray-100 rounded-xl dark:bg-gray-800" />
          <div className="h-20 bg-gray-100 rounded-xl dark:bg-gray-800" />
        </div>
      </div>
    );
  }

  const totalPending = data.pendingHomeworksCount + data.pendingExamsCount;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {t("dashboardPage.gradingProgressTitle", { defaultValue: "Tiến độ Chấm bài của Giáo viên" })}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {t("dashboardPage.gradingProgressDesc", { defaultValue: "Thống kê số lượng bài làm của học sinh chưa được chấm điểm." })}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Homework Alerts */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-950/20">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg dark:bg-blue-950/40 dark:text-blue-450">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {t("dashboardPage.pendingHomeworks", { defaultValue: "Bài tập về nhà chưa chấm" })}
              </p>
              <p className="text-xs text-gray-400">
                {t("dashboardPage.actionRequired", { defaultValue: "Cần giáo viên chấm điểm" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-800 dark:text-white">
              {data.pendingHomeworksCount}
            </span>
            {data.pendingHomeworksCount > 0 && (
              <span className="flex h-2 w-2 rounded-full bg-amber-500" />
            )}
          </div>
        </div>

        {/* Exam Alerts */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-950/20">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg dark:bg-purple-950/40 dark:text-purple-450">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {t("dashboardPage.pendingExams", { defaultValue: "Bài kiểm tra chưa chấm" })}
              </p>
              <p className="text-xs text-gray-400">
                {t("dashboardPage.actionRequired", { defaultValue: "Cần giáo viên chấm điểm" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-800 dark:text-white">
              {data.pendingExamsCount}
            </span>
            {data.pendingExamsCount > 0 && (
              <span className="flex h-2 w-2 rounded-full bg-rose-500" />
            )}
          </div>
        </div>

        {/* Summary Status Banner */}
        {totalPending > 0 ? (
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-amber-50 text-amber-800 border border-amber-100 dark:bg-amber-950/10 dark:text-amber-400 dark:border-amber-900/30 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              {t("dashboardPage.gradingWarning", {
                count: totalPending,
                defaultValue: "Hiện tại đang tồn {{count}} bài nộp chưa được chấm điểm. Hãy nhắc nhở giáo viên!",
              })}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 dark:bg-emerald-950/10 dark:text-emerald-450 dark:border-emerald-900/30 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              {t("dashboardPage.gradingAllClear", {
                defaultValue: "Tuyệt vời! Tất cả các bài nộp của học sinh đã được chấm điểm đầy đủ.",
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

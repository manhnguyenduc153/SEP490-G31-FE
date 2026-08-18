"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { examApi, ExamItem } from "@/services/exam.api";
import {
  FileText,
  Clock,
  Calendar,
  Search,
  Award,
  ArrowRight,
  BookOpen,
  Filter
} from "lucide-react";

interface StudentExamListProps {
  t: (key: string, defaultValue?: any) => string;
}

export function StudentExamList({ t }: StudentExamListProps) {
  const router = useRouter();
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and Filter states
  const [keyword, setKeyword] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedExam, setSelectedExam] = useState<ExamItem | null>(null);

  useEffect(() => {
    async function loadStudentExams() {
      setLoading(true);
      setError(null);
      try {
        const res = await examApi.getStudentExams();
        if (res.success && res.data) {
          setExams(res.data);
          if (res.data.length > 0) {
            setSelectedExam(res.data[0]);
          }
        } else {
          setError(res.message || t("exams.toastLoadingError"));
        }
      } catch (err: any) {
        setError(err.message || t("exams.toastSystemError"));
      } finally {
        setLoading(false);
      }
    }
    loadStudentExams();
  }, []);

  // Filter logic
  const uniqueClasses = Array.from(
    new Set(exams.map((e) => e.className).filter((c): c is string => !!c))
  );

  const filteredExams = exams.filter((exam) => {
    const matchesKeyword =
      exam.title.toLowerCase().includes(keyword.toLowerCase()) ||
      (exam.code && exam.code.toLowerCase().includes(keyword.toLowerCase()));

    const matchesClass =
      selectedClass === "all" || exam.className === selectedClass;

    return matchesKeyword && matchesClass;
  });

  // Listening/Reading/Writing/Speaking exams store their score directly as an IELTS band (0-9),
  // computed server-side from correct-answer count (L/R) or entered directly by the teacher (W/S).
  const isBandScoredExam = (exam: ExamItem) => {
    const skill = exam.skillType;
    return skill === 1 || skill === 2 || skill === 3 || skill === 4;
  };

  const isAttemptPassed = (exam: ExamItem) => {
    if (exam.latestScore === null || exam.latestScore === undefined) return false;
    return exam.latestScore >= (exam.passingScore || 5);
  };

  const getStatusText = (exam: ExamItem) => {
    if (exam.submissionCount && exam.submissionCount > 0) {
      if (exam.isGraded || (exam.latestScore !== null && exam.latestScore !== undefined)) {
        return isAttemptPassed(exam) ? t("exams.statusCompleted") : t("exams.attemptFailed");
      }
      return t("exams.statusPendingGrade");
    }
    return t("exams.statusNotStarted");
  };

  const getStatusColor = (exam: ExamItem) => {
    if (exam.submissionCount && exam.submissionCount > 0) {
      if (exam.isGraded || (exam.latestScore !== null && exam.latestScore !== undefined)) {
        return isAttemptPassed(exam)
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/60"
          : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200/60";
      }
      return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/60";
    }
    return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
  };

  const isManualGradedExam = (examItem: ExamItem) => {
    const typeStr = String(examItem.type || "").toLowerCase();
    const titleStr = String(examItem.title || "").toLowerCase();
    const skillType = (examItem as any).skillType;
    return (
      typeStr.includes("speaking") ||
      typeStr.includes("writing") ||
      titleStr.includes("speaking") ||
      titleStr.includes("writing") ||
      skillType === 3 ||
      skillType === 4 ||
      examItem.type === 3 ||
      examItem.type === 4
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500 text-sm">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent mb-3"></div>
        {t("exams.loadingList")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-rose-500 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="p-5 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-theme-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder={t("exams.searchPlaceholder")}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full rounded-xl border border-gray-250 bg-transparent pl-10 pr-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            {t("exams.classLabel")}
          </span>
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              // Reset details panel selection if not in list anymore
              setSelectedExam(null);
            }}
            className="rounded-xl border border-gray-250 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-855 dark:bg-gray-950 dark:text-white"
          >
            <option value="all">{t("exams.allClasses")}</option>
            {uniqueClasses.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Exam Cards List */}
        <div className="lg:col-span-8 space-y-3.5">
          {filteredExams.length === 0 ? (
            <div className="p-10 text-center bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl text-gray-400">
              {t("exams.noExamsFound")}
            </div>
          ) : (
            filteredExams.map((exam) => {
              const isSelected = selectedExam?.id === exam.id;

              return (
                <div
                  key={exam.id}
                  onClick={() => setSelectedExam(exam)}
                  className={`p-4 bg-white dark:bg-gray-900 border rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition-all duration-200 shadow-theme-xs ${isSelected
                      ? "border-brand-500 ring-2 ring-brand-500/10 dark:border-brand-500"
                      : "border-gray-150 dark:border-gray-850 hover:border-brand-300"
                    }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isSelected
                        ? "bg-brand-500 text-white"
                        : "bg-brand-50 text-brand-500 dark:bg-brand-950/20"
                      }`}>
                      <FileText className="w-6 h-6" />
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {exam.title}
                      </h4>
                      <p className="text-xs text-gray-550 font-medium truncate flex items-center gap-2">
                        <span>{exam.className || t("exams.unlimited")}</span>
                        <span>•</span>
                        <span>{exam.duration ? t("exams.minutesPlural", { count: exam.duration }) : t("exams.unlimited")}</span>
                        <span>•</span>
                        <span>{exam.questionCount || 0} {t("exams.question").toLowerCase()}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(exam)}`}>
                      {getStatusText(exam)}
                    </span>
                    {exam.submissionCount && exam.submissionCount > 0 ? (
                      exam.isGraded || (exam.latestScore !== null && exam.latestScore !== undefined) ? (
                        <span className={`text-xs font-black ${isAttemptPassed(exam) ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {isBandScoredExam(exam)
                            ? `Band ${exam.latestScore}`
                            : `${exam.latestScore} / ${exam.totalScore || 10} ${t("exams.points").toLowerCase()}`}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
                          {t("exams.statusPendingGrade")}
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] text-gray-400 font-semibold">{t("exams.noScore")}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Side: Selected Exam Details Card */}
        <div className="lg:col-span-4 sticky top-24">
          {selectedExam ? (
            <div className="p-6 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-theme-xs space-y-6">
              <div className="text-center space-y-3 pb-4 border-b border-gray-100 dark:border-gray-855">
                <div className="w-16 h-16 bg-brand-50 dark:bg-brand-950/20 rounded-full flex items-center justify-center text-brand-500 mx-auto">
                  <BookOpen className="w-8 h-8" />
                </div>
                <h3 className="text-base font-extrabold text-gray-950 dark:text-white leading-tight">
                  {selectedExam.title}
                </h3>
                <p className="text-xs text-gray-450 dark:text-gray-400">
                  {selectedExam.description || t("exams.noDescription")}
                </p>
              </div>

              {/* Stats parameters */}
              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-855">
                  <span className="text-gray-500">{t("exams.settingsExamCode")}:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedExam.code}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-855">
                  <span className="text-gray-500">{t("exams.settingsClass")}:</span>
                  <span className="font-semibold text-brand-500">{selectedExam.className || t("exams.unlimited")}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-855">
                  <span className="text-gray-500">{t("exams.settingsDuration")}:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {selectedExam.duration ? t("exams.minutesPlural", { count: selectedExam.duration }) : t("exams.unlimited")}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-855">
                  <span className="text-gray-500">{t("exams.deadline")}:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {selectedExam.endTime ? new Date(selectedExam.endTime).toLocaleDateString("vi-VN") : t("exams.noDeadline")}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-855">
                  <span className="text-gray-500">{t("exams.settingsAttempts")}:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {selectedExam.submissionCount || 0} / {selectedExam.maxAttempts || t("exams.unlimited")}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-500">{t("registration.colStatus")}:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(selectedExam)}`}>
                    {getStatusText(selectedExam)}
                  </span>
                </div>
              </div>

              {/* Start test or view attempt detail action */}
              <div className="pt-2">
                <button
                  onClick={() => router.push(`/exams/${selectedExam.id}`)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-all shadow-md shadow-brand-500/20 active:scale-[0.98]"
                >
                  {selectedExam.submissionCount && selectedExam.submissionCount > 0 ? t("exams.gradeDetail") : t("exams.startExam")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl text-center text-gray-400 py-10 shadow-theme-xs">
              {t("exams.noExamsFound")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

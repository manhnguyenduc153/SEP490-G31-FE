"use client";

import React, { useState, useEffect } from "react";
import { FileText, Clock, Award, BookOpen, ChevronRight, Edit2, AlertCircle } from "lucide-react";
import { examApi, ExamItem } from "@/services/exam.api";
import { useRouter } from "next/navigation";
import { authApi } from "@/services/auth.api";

interface ClassDetailExamsTabProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itemDetail: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

export default function ClassDetailExamsTab({
  itemDetail,
  t,
}: ClassDetailExamsTabProps) {
  const router = useRouter();
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);

  useEffect(() => {
    const userRole = authApi.getRole().toLowerCase();
    const permissions = authApi.getPermissions();
    setCanEdit(userRole === "admin" || permissions.includes("Exam.Edit"));
    setIsTeacher(userRole === "teacher");
  }, []);

  useEffect(() => {
    const classId = itemDetail?.id;
    if (!classId) return;

    let active = true;
    async function loadExams() {
      setIsLoading(true);
      try {
        const res = await examApi.getAll(1, 100, { classId });
        if (active && res.success && res.data) {
          setExams(res.data.items || []);
        }
      } catch (err) {
        console.error("Failed to load exams for class", err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadExams();
    return () => {
      active = false;
    };
  }, [itemDetail?.id]);

  const getExamTypeLabel = (type: number) => {
    switch (type) {
      case 1:
        return t("exam.typeAssigned", { defaultValue: "Bài thi chính thức" });
      case 2:
        return t("exam.typeTemplate", { defaultValue: "Bài thi mẫu" });
      default:
        return t("exam.typeUnknown", { defaultValue: "Khác" });
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 1: // Published
        return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500 border border-emerald-200/50 dark:border-emerald-500/20";
      case 2: // Draft
        return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-700";
      default:
        return "bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const getStatusLabel = (status: number) => {
    switch (status) {
      case 1:
        return t("exam.statusPublished", { defaultValue: "Đã xuất bản" });
      case 2:
        return t("exam.statusDraft", { defaultValue: "Nháp" });
      default:
        return t("exam.statusUnknown", { defaultValue: "Không rõ" });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs p-6 space-y-6 animate-fadeIn">
      <h3 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-50 dark:border-gray-800 pb-3">
        <FileText className="w-5 h-5 text-brand-500" />
        <span>{t("class.examsTitle", { defaultValue: "Bài kiểm tra của lớp" })}</span>
      </h3>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 text-sm">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          {t("class.loadingExams", { defaultValue: "Đang tải danh sách bài kiểm tra..." })}
        </div>
      ) : exams.length === 0 ? (
        <p className="text-xs text-gray-450 text-center py-10 italic border border-dashed border-gray-250 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-955/20">
          {t("class.noExams", { defaultValue: "Chưa có bài kiểm tra nào được gán cho lớp này." })}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="p-5 rounded-xl border border-gray-150 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xs hover:border-brand-300 dark:hover:border-brand-500 transition-colors flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Header Info */}
                <div className="flex justify-between items-start gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 rounded">
                    {getExamTypeLabel(exam.type)}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getStatusColor(exam.status)}`}>
                    {getStatusLabel(exam.status)}
                  </span>
                </div>

                {/* Exam Title */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1" title={exam.title}>
                    {exam.title}
                  </h4>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                    {exam.code}
                  </p>
                </div>

                {/* Description */}
                {exam.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    {exam.description}
                  </p>
                )}

                {/* Metadatas */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50 dark:border-gray-800/60">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>{exam.duration ? `${exam.duration} ${t("common.minutes", { defaultValue: "phút" })}` : t("exam.unlimitedDuration", { defaultValue: "Không giới hạn" })}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <Award className="w-3.5 h-3.5 text-gray-400" />
                    <span>{exam.passingScore}/{exam.totalScore} {t("exam.points", { defaultValue: "Điểm đạt" })}</span>
                  </div>
                </div>

                {/* Time range if assigned */}
                {exam.type === 1 && (exam.startTime || exam.endTime) && (
                  <div className="pt-2 text-[10px] text-gray-450 dark:text-gray-500 flex flex-col gap-0.5">
                    {exam.startTime && (
                      <div>
                        {t("exam.startTimeLabel", { defaultValue: "Bắt đầu:" })}{" "}
                        <span className="font-semibold">{new Date(exam.startTime).toLocaleString("vi-VN")}</span>
                      </div>
                    )}
                    {exam.endTime && (
                      <div>
                        {t("exam.endTimeLabel", { defaultValue: "Kết thúc:" })}{" "}
                        <span className="font-semibold">{new Date(exam.endTime).toLocaleString("vi-VN")}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-50 dark:border-gray-800/80">
                <button
                  type="button"
                  onClick={() => router.push(isTeacher ? `/teaching-exams/${exam.id}` : `/exams/${exam.id}`)}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-theme-xs transition-colors cursor-pointer"
                >
                  <span>{t("exam.btnViewOrAttempt", { defaultValue: "Chi tiết / Làm bài" })}</span>
                  <ChevronRight className="w-4.5 h-4.5" />
                </button>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => router.push(`/exams/edit/${exam.id}`)}
                    className="inline-flex items-center justify-center p-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors cursor-pointer"
                    title={t("common.btnEdit", { defaultValue: "Chỉnh sửa" })}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

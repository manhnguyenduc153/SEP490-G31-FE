"use client";

import React, { useEffect, useState, useMemo } from "react";
import { parentStudentApi, ChildItem } from "@/services/parentStudent.api";
import { studentGradeApi, MyGradeClassDto } from "@/services/score.api";
import { authApi } from "@/services/auth.api";
import { useTranslation } from "react-i18next";
import { 
  User, 
  Users, 
  Award, 
  ChevronDown, 
  RefreshCw, 
  AlertCircle, 
  Loader2, 
  TrendingUp, 
  BookOpen 
} from "lucide-react";

// Helper color tones for average scores
const scoreTone = (score: number) => {
  if (score >= 7) return "bg-emerald-50 text-emerald-600 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
  if (score >= 5) return "bg-blue-50 text-blue-600 border-blue-200/60 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20";
  return "bg-amber-50 text-amber-600 border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
};

export default function ChildProgressPage() {
  const { t } = useTranslation();
  
  // State for children list
  const [children, setChildren] = useState<ChildItem[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildItem | null>(null);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);
  const [childrenError, setChildrenError] = useState<string | null>(null);

  // State for selected child's grades
  const [grades, setGrades] = useState<MyGradeClassDto[]>([]);
  const [expandedClassId, setExpandedClassId] = useState<number | null>(null);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);
  const [gradesError, setGradesError] = useState<string | null>(null);

  // 1. Fetch children list mapped with current logged-in parent
  useEffect(() => {
    async function fetchChildren() {
      setIsLoadingChildren(true);
      setChildrenError(null);
      try {
        const role = authApi.getRole().toLowerCase();
        const username = typeof window !== "undefined" ? localStorage.getItem("username") || "" : "";
        
        // If logged in as parent, filter using parent's email (username)
        const filterKeyword = role === "parent" ? username : "";
        
        const res = await parentStudentApi.getAll(1, 100, filterKeyword);
        if (res.statusCode === 200 && res.data) {
          const parentItems = res.data.items || [];
          const allChildren: ChildItem[] = [];
          parentItems.forEach((p) => {
            if (p.children) {
              allChildren.push(...p.children);
            }
          });

          // Filter unique children by studentId
          const uniqueChildren: ChildItem[] = [];
          const seenIds = new Set<number>();
          allChildren.forEach((child) => {
            if (!seenIds.has(child.studentId)) {
              seenIds.add(child.studentId);
              uniqueChildren.push(child);
            }
          });

          setChildren(uniqueChildren);
          if (uniqueChildren.length > 0) {
            setSelectedChild(uniqueChildren[0]);
          }
        } else {
          setChildrenError(
            res.message
              ? t(`backendMessages.${res.message}`, { defaultValue: res.message })
              : t("schedules.loadChildrenError", { defaultValue: "Không thể tải danh sách học sinh." })
          );
        }
      } catch (err) {
        console.error("Failed to load children list", err);
        setChildrenError(t("schedules.connectionError", { defaultValue: "Đã xảy ra lỗi khi kết nối hệ thống." }));
      } finally {
        setIsLoadingChildren(false);
      }
    }
    fetchChildren();
  }, [t]);

  // 2. Fetch grades whenever selected child changes
  useEffect(() => {
    if (!selectedChild) {
      setGrades([]);
      return;
    }

    async function loadChildGrades() {
      setIsLoadingGrades(true);
      setGradesError(null);
      try {
        const res = await studentGradeApi.getChildGrades(selectedChild!.studentId);
        if (res.success && res.data) {
          setGrades(res.data);
          setExpandedClassId(res.data[0]?.classId ?? null);
        } else {
          setGradesError(
            res.message
              ? t(`backendMessages.${res.message}`, { defaultValue: res.message })
              : t("class.gradeLoadError", { defaultValue: "Không thể tải tiến độ học tập." })
          );
        }
      } catch (err) {
        console.error("Failed to load child grades", err);
        setGradesError(t("class.gradeLoadError", { defaultValue: "Không thể tải tiến độ học tập." }));
      } finally {
        setIsLoadingGrades(false);
      }
    }

    loadChildGrades();
  }, [selectedChild, t]);

  const totalClasses = useMemo(() => grades.length, [grades]);

  return (
    <div className="space-y-6 w-full pb-8">
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/[0.05] shadow-xs gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-brand-500/10 text-brand-500 rounded-xl hidden sm:block">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {t("childProgress.title", { defaultValue: "Tiến độ học tập của con" })}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t("sidebar.parentServices", { defaultValue: "Dịch vụ phụ huynh" })} - {t("childProgress.title", { defaultValue: "Tiến độ học tập của con" })}
            </p>
          </div>
        </div>
      </div>

      {/* Children Loading / Error states */}
      {isLoadingChildren ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/[0.05]">
          <Loader2 className="animate-spin h-8 w-8 text-brand-500" />
          <span className="mt-3 text-sm text-gray-500 dark:text-gray-400 font-medium">
            {t("schedules.loadingChildren", { defaultValue: "Đang tải danh sách học sinh..." })}
          </span>
        </div>
      ) : childrenError ? (
        <div className="rounded-xl bg-red-50/70 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-5 flex items-start gap-4 max-w-2xl mx-auto">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-red-800 dark:text-red-300">
              {t("schedules.loadError", { defaultValue: "Lỗi tải dữ liệu" })}
            </h4>
            <p className="mt-1 text-xs text-red-700 dark:text-red-400 leading-relaxed">{childrenError}</p>
          </div>
        </div>
      ) : children.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] p-10 text-center max-w-2xl mx-auto space-y-4">
          <div className="mx-auto w-12 h-12 bg-amber-50 dark:bg-amber-950/20 rounded-full flex items-center justify-center text-amber-500">
            <Users className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-gray-900 dark:text-white">
              {t("schedules.noChildrenLinked", { defaultValue: "Chưa liên kết học sinh" })}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
              {t("schedules.noChildrenLinkedDesc", { defaultValue: "Tài khoản phụ huynh của bạn hiện tại chưa được liên kết với bất kỳ học sinh nào trong hệ thống. Vui lòng liên hệ với trung tâm để cấu hình liên kết." })}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Children Selector Banner */}
          {children.length > 1 ? (
            <div className="bg-white dark:bg-white/[0.03] p-4 rounded-2xl border border-gray-100 dark:border-white/[0.05] shadow-xs">
              <span className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                {t("childProgress.selectChild", { defaultValue: "Chọn con cần xem tiến độ:" })}
              </span>
              <div className="flex flex-wrap gap-3">
                {children.map((child) => {
                  const isActive = selectedChild?.studentId === child.studentId;
                  return (
                    <button
                      key={child.studentId}
                      type="button"
                      onClick={() => setSelectedChild(child)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition duration-200 cursor-pointer ${
                        isActive
                          ? "bg-brand-500 border-brand-500 text-white shadow-md shadow-brand-500/15"
                          : "bg-white border-gray-200 text-gray-650 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-750"
                      }`}
                    >
                      <User className={`w-4 h-4 ${isActive ? "text-white" : "text-gray-400"}`} />
                      <span>{child.studentName || `Học sinh ID: ${child.studentId}`}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            // Only 1 child - show info card
            <div className="bg-white dark:bg-white/[0.03] p-4 px-6 rounded-2xl border border-gray-100 dark:border-white/[0.05] shadow-xs flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-brand-500/10 text-brand-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {t("childProgress.viewingProgressOf", { defaultValue: "Đang xem tiến độ học tập của con:" })}
                  </span>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    {selectedChild?.studentName || `Học sinh ID: ${selectedChild?.studentId}`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Grades View */}
          {isLoadingGrades ? (
            <div className="flex items-center justify-center py-20 bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/[0.05]">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin text-brand-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                {t("childProgress.loadingGrades", { defaultValue: "Đang tải tiến độ học tập..." })}
              </span>
            </div>
          ) : gradesError ? (
            <div className="rounded-xl border border-red-100 bg-red-50/70 dark:border-red-900/30 dark:bg-red-900/10 p-4 text-sm text-red-650 dark:text-red-400">
              {gradesError}
            </div>
          ) : totalClasses === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-500 shadow-xs dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              <BookOpen className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              {t("childProgress.empty", { defaultValue: "Con hiện chưa tham gia lớp học nào có điểm số." })}
            </div>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              {grades.map((item) => {
                const isExpanded = expandedClassId === item.classId;
                return (
                  <div 
                    key={item.classId} 
                    className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900 transition-all duration-300"
                  >
                    {/* Header trigger for Accordion */}
                    <button
                      type="button"
                      onClick={() => setExpandedClassId(isExpanded ? null : item.classId)}
                      className="flex w-full flex-col gap-3 p-5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40 sm:flex-row sm:items-center sm:justify-between cursor-pointer"
                    >
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-550">
                          {item.courseCode ? `${item.courseCode} - ${item.courseName || ""}` : item.courseName || t("sidebar.courses", { defaultValue: "Course" })}
                        </p>
                        <h4 className="mt-1 text-base font-bold text-gray-900 dark:text-white">
                          {item.classCode ? `${item.classCode} - ${item.className || ""}` : item.className || `Lớp học #${item.classId}`}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <div className="flex flex-col items-end mr-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            {t("childProgress.averageScore", { defaultValue: "Điểm trung bình" })}
                          </span>
                          <span className={`mt-0.5 inline-flex min-w-16 items-center justify-center rounded-lg border px-3 py-1 text-sm font-bold ${scoreTone(item.averageScore)}`}>
                            {Number(item.averageScore).toFixed(1)}
                          </span>
                        </div>
                        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>

                    {/* Accordion Detail Table */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 p-5 dark:border-gray-800 bg-gray-50/20 dark:bg-gray-900/20 animate-slideDown">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500 dark:bg-gray-800/40 dark:text-gray-400">
                              <tr>
                                <th className="px-4 py-3 text-left">{t("class.gradeComponentName", { defaultValue: "Đầu điểm" })}</th>
                                <th className="px-4 py-3 text-center">{t("class.gradeWeight", { defaultValue: "Trọng số (%)" })}</th>
                                <th className="px-4 py-3 text-center">{t("studentScores.finalScore", { defaultValue: "Điểm số" })}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                              {item.components.map((component) => (
                                <tr key={component.gradeComponentId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                                    {component.componentName}
                                  </td>
                                  <td className="px-4 py-3 text-center text-gray-500">
                                    {component.weight}%
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`inline-flex min-w-14 items-center justify-center rounded border px-2.5 py-1 text-xs font-bold ${scoreTone(component.score)}`}>
                                      {Number(component.score).toFixed(1)}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                              {/* Average Row */}
                              <tr className="bg-gray-50/80 font-bold dark:bg-gray-800/40">
                                <td className="px-4 py-3 text-gray-900 dark:text-white">
                                  {t("studentScores.totalAverage", { defaultValue: "Điểm trung bình" })}
                                </td>
                                <td className="px-4 py-3 text-center text-gray-500">
                                  100%
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-flex min-w-14 items-center justify-center rounded border px-2.5 py-1 text-xs font-bold ${scoreTone(item.averageScore)}`}>
                                    {Number(item.averageScore).toFixed(1)}
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

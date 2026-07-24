"use client";

import React, { useState, useEffect, useMemo } from "react";
import { roomApi } from "@/services/room.api";
import { classApi } from "@/services/class.api";
import { ArrowLeft, BookOpen, Users, ClipboardCheck, FileText, Award, Info, CheckSquare } from "lucide-react";
import ClassDetailInfoTab from "./ClassDetailInfoTab";
import ClassDetailStudentsTab from "./ClassDetailStudentsTab";
import ClassDetailAttendanceTab from "./ClassDetailAttendanceTab";
import ClassDetailSyllabusTab from "./ClassDetailSyllabusTab";
import ClassDetailHomeworkTab from "./ClassDetailHomeworkTab";
import ClassDetailGradesTab from "./ClassDetailGradesTab";
import ClassDetailExamsTab from "./ClassDetailExamsTab";
import { authApi } from "@/services/auth.api";

interface ClassDetailProps {
  itemId: number;
  onBack: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  showToast: (msg: string, type?: "success" | "error") => void;
}

type DetailTabType = "detail" | "students" | "attendance" | "syllabus" | "homework" | "grades" | "exams";

export default function ClassDetail({
  itemId,
  onBack,
  t,
  showToast,
}: ClassDetailProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rooms, setRooms] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [itemDetail, setItemDetail] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const [activeDetailTab, setActiveDetailTab] = useState<DetailTabType>("detail");
  const [role, setRole] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const userRole = authApi.getRole().toLowerCase();
    setRole(userRole);
    setIsAdmin(userRole === "admin");
    setPermissions(authApi.getPermissions());
  }, []);

  const hasPermission = (perm: string) => {
    return isAdmin || permissions.includes(perm);
  };

  // Load rooms
  useEffect(() => {
    roomApi.getAll(1, 100)
      .then((res) => {
        if (res.success && res.data) {
          setRooms(res.data.items || []);
        }
      })
      .catch((err) => console.error("Failed to load rooms in detail view", err));
  }, []);

  // Fetch Class Detail
  useEffect(() => {
    async function fetchDetail() {
      setIsLoading(true);
      setFormError(null);
      try {
        const res = await classApi.getById(itemId);
        if (res.success && res.data) {
          setItemDetail(res.data);
        } else {
          const errMsg = res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("class.systemError");
          setFormError(errMsg);
          showToast(errMsg, "error");
        }
      } catch {
        setFormError(t("class.systemError"));
        showToast(t("class.systemError"), "error");
      } finally {
        setIsLoading(false);
      }
    }
    fetchDetail();
  }, [itemId, t, showToast]);

  const getRoomName = (roomId: number | null) => {
    if (!roomId) return "";
    const r = rooms.find((room) => room.id === roomId);
    return r ? r.name : t("class.roomWithNumber", { roomId });
  };

  const parsedSchedules = useMemo(() => {
    if (!itemDetail?.weeklySchedulesJson) return [];
    try {
      const parsed = JSON.parse(itemDetail.weeklySchedulesJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error("Failed to parse weeklySchedulesJson", err);
      return [];
    }
  }, [itemDetail?.weeklySchedulesJson]);

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return t("class.statusPlanning", { defaultValue: "Sắp mở" });
      case 1: return t("class.statusActive", { defaultValue: "Đang diễn ra" });
      case 2: return t("class.statusCompleted", { defaultValue: "Đã hoàn thành" });
      case 3: return t("class.statusCancelled", { defaultValue: "Đã hủy" });
      default: return "";
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-500 border border-amber-200/50 dark:border-amber-500/20";
      case 1: return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500 border border-emerald-200/50 dark:border-emerald-500/20";
      case 2: return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-500 border border-blue-200/50 dark:border-blue-500/20";
      case 3: return "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-500 border border-rose-200/50 dark:border-rose-500/20";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  return (
    <div className="space-y-6 w-full pb-10">
      {/* Top Header Card */}
      <div className="flex items-center justify-between p-5 sm:p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-500" />
              {itemDetail ? itemDetail.name : t("class.viewTitle")}
            </h2>
            {itemDetail && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(itemDetail.status)}`}>
                {getStatusText(itemDetail.status)}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {t("class.breadcrumbPath")}{t("class.viewBreadcrumb", { defaultValue: "Chi tiết" })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-850 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("class.btnBack")}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs text-gray-500 dark:text-gray-400 text-sm">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent mb-3"></div>
          {t("class.loadingDetail")}
        </div>
      ) : formError ? (
        <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs text-center text-sm text-error-500 dark:text-error-400">
          {formError}
        </div>
      ) : !itemDetail ? (
        <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs text-center text-sm text-gray-450 dark:text-gray-400">
          {t("class.noDetailsFound")}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Horizontal Tabs Bar */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-2 shadow-xs">
            <button
              onClick={() => setActiveDetailTab("detail")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeDetailTab === "detail"
                  ? "bg-brand-500 text-white shadow-theme-xs"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-250 dark:hover:bg-gray-800"
              }`}
            >
              <Info className="w-4 h-4" />
              {t("class.tabDetail", { defaultValue: "Chi tiết" })}
            </button>
            {hasPermission("Class.View") && (
              <button
                onClick={() => setActiveDetailTab("students")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  activeDetailTab === "students"
                    ? "bg-brand-500 text-white shadow-theme-xs"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-250 dark:hover:bg-gray-800"
                }`}
              >
                <Users className="w-4 h-4" />
                {t("class.tabStudentList", { defaultValue: "Danh sách học sinh" })}
              </button>
            )}
            {hasPermission("Attendance.View") && (
              <button
                onClick={() => setActiveDetailTab("attendance")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  activeDetailTab === "attendance"
                    ? "bg-brand-500 text-white shadow-theme-xs"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-250 dark:hover:bg-gray-800"
                }`}
              >
                <ClipboardCheck className="w-4 h-4" />
                {t("class.tabAttendance", { defaultValue: "Điểm danh" })}
              </button>
            )}
            {hasPermission("LearningMaterial.View") && (
              <button
                onClick={() => setActiveDetailTab("syllabus")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  activeDetailTab === "syllabus"
                    ? "bg-brand-500 text-white shadow-theme-xs"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-250 dark:hover:bg-gray-800"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                {t("class.tabSyllabus", { defaultValue: "Tài liệu" })}
              </button>
            )}
            {hasPermission("HomeworkManagement.View") && (
              <button
                onClick={() => setActiveDetailTab("homework")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  activeDetailTab === "homework"
                    ? "bg-brand-500 text-white shadow-theme-xs"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-250 dark:hover:bg-gray-800"
                }`}
              >
                <FileText className="w-4 h-4" />
                {t("class.tabHomework", { defaultValue: "Bài tập" })}
              </button>
            )}
            {hasPermission("Exam.View") && (
              <button
                onClick={() => setActiveDetailTab("exams")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  activeDetailTab === "exams"
                    ? "bg-brand-500 text-white shadow-theme-xs"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-250 dark:hover:bg-gray-800"
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                {t("class.tabExams", { defaultValue: "Bài kiểm tra" })}
              </button>
            )}
            {hasPermission("StudentGrade.ViewSettings") && (
              <button
                onClick={() => setActiveDetailTab("grades")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  activeDetailTab === "grades"
                    ? "bg-brand-500 text-white shadow-theme-xs"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-250 dark:hover:bg-gray-800"
                }`}
              >
                <Award className="w-4 h-4" />
                {t("class.tabGrades", { defaultValue: "Bảng điểm" })}
              </button>
            )}
          </div>

          {/* Active Tab Content */}
          <div className="w-full">
            {/* TAB 1: CHI TIẾT */}
            {activeDetailTab === "detail" && (
              <ClassDetailInfoTab
                itemDetail={itemDetail}
                parsedSchedules={parsedSchedules}
                getRoomName={getRoomName}
                t={t}
              />
            )}

            {/* TAB 2: DANH SÁCH HỌC SINH */}
            {activeDetailTab === "students" && hasPermission("Class.View") && (
              <ClassDetailStudentsTab
                itemDetail={itemDetail}
                t={t}
              />
            )}

            {/* TAB 3: ĐIỂM DANH */}
            {activeDetailTab === "attendance" && hasPermission("Attendance.View") && (
              <ClassDetailAttendanceTab
                itemDetail={itemDetail}
                t={t}
                showToast={showToast}
              />
            )}

            {/* TAB 4: TÀI LIỆU (REAL DATA FROM COURSE) */}
            {activeDetailTab === "syllabus" && hasPermission("LearningMaterial.View") && (
              <ClassDetailSyllabusTab
                itemDetail={itemDetail}
                t={t}
              />
            )}

            {/* TAB 5: BÀI TẬP (REAL DATA FROM CLASS) */}
            {activeDetailTab === "homework" && hasPermission("HomeworkManagement.View") && (
              <ClassDetailHomeworkTab
                itemDetail={itemDetail}
                t={t}
              />
            )}

            {/* TAB 6: BÀI KIỂM TRA (REAL DATA FROM CLASS) */}
            {activeDetailTab === "exams" && hasPermission("Exam.View") && (
              <ClassDetailExamsTab
                itemDetail={itemDetail}
                t={t}
              />
            )}

            {/* TAB 7: BẢNG ĐIỂM (REAL DATA FROM CLASS) */}
            {activeDetailTab === "grades" && hasPermission("StudentGrade.ViewSettings") && (
              <ClassDetailGradesTab
                itemDetail={itemDetail}
                t={t}
                showToast={showToast}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

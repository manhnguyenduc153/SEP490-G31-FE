"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { parentStudentApi, ChildItem } from "@/services/parentStudent.api";
import { studentGradeApi, MyGradeClassDto } from "@/services/score.api";
import { HomeworkDto, HomeworkSubmissionDto } from "@/services/homework.api";
import { MyAttendanceSessionDto } from "@/services/attendance.api";
import { studentProgressApi } from "@/services/studentProgress.api";
import { authApi } from "@/services/auth.api";
import { useTranslation } from "react-i18next";
import {
  User, Users, Award, RefreshCw, AlertCircle, Loader2, TrendingUp,
  BookOpen, CalendarCheck, ClipboardList, CheckCircle2, XCircle,
  Clock3, ShieldCheck, GraduationCap, BookMarked, ChevronRight,
} from "lucide-react";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

interface HomeworkWithSub extends HomeworkDto {
  submission?: HomeworkSubmissionDto | null;
}

interface SessionRow {
  scheduleId: number;
  lessonNo: number;
  date: string | null;
  status: number; // -1=chưa ghi, 0=vắng, 1=có mặt, 2=muộn, 3=có phép
  description: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (val?: string | null) => {
  if (!val) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(val));
  } catch { return val; }
};

const scoreTone = (score: number) => {
  if (score >= 7) return "bg-emerald-50 text-emerald-600 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
  if (score >= 5) return "bg-blue-50 text-blue-600 border-blue-200/60 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20";
  return "bg-amber-50 text-amber-600 border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
};

const attendanceStyle = (rate: number) => {
  if (rate >= 80) return { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" };
  if (rate >= 60) return { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", badge: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" };
  return { bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", badge: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400" };
};

const sessionStatusInfo = (status: number, t: any) => {
  if (status === 0)  return { label: t("childProgress.statusAbsent", { defaultValue: "Vắng mặt" }),    cls: "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",     icon: <XCircle className="h-3.5 w-3.5" /> };
  if (status === 2)  return { label: t("childProgress.statusLate", { defaultValue: "Đi muộn" }),     cls: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20", icon: <Clock3 className="h-3.5 w-3.5" /> };
  if (status === 3)  return { label: t("childProgress.statusAuthorizedAbsence", { defaultValue: "Nghỉ có phép" }),cls: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",       icon: <ShieldCheck className="h-3.5 w-3.5" /> };
  if (status === -1) return { label: t("childProgress.statusNotRecorded", { defaultValue: "Chưa ghi nhận" }),cls:"bg-gray-50 text-gray-500 border-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",            icon: <RefreshCw className="h-3.5 w-3.5" /> };
  return { label: t("childProgress.statusPresent", { defaultValue: "Có mặt" }), cls: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20", icon: <CheckCircle2 className="h-3.5 w-3.5" /> };
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, colorText, colorBg }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  colorText: string; colorBg: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-xs dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${colorBg} ${colorText}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</p>
        <p className={`mt-0.5 text-xl font-extrabold leading-tight ${colorText}`}>{value}</p>
        {sub && <p className="mt-0.5 truncate text-[10px] text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition cursor-pointer ${
        active
          ? "bg-brand-500 text-white shadow-sm shadow-brand-500/20"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.05] dark:hover:text-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChildProgressPage() {
  const { t } = useTranslation();

  // Children
  const [children, setChildren]             = useState<ChildItem[]>([]);
  const [selectedChild, setSelectedChild]   = useState<ChildItem | null>(null);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);
  const [childrenError, setChildrenError]   = useState<string | null>(null);

  // Grades (all classes for child)
  const [grades, setGrades]                 = useState<MyGradeClassDto[]>([]);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);
  const [gradesError, setGradesError]       = useState<string | null>(null);

  // Selected class
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  // Active content tab
  const [activeTab, setActiveTab] = useState<"scores" | "homework" | "attendance">("scores");

  // Per-class data
  const [homeworkList, setHomeworkList]     = useState<HomeworkWithSub[]>([]);
  const [isLoadingHw, setIsLoadingHw]       = useState(false);

  const [sessions, setSessions]             = useState<SessionRow[]>([]);
  const [isLoadingAtt, setIsLoadingAtt]     = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  // ── 1. Load children ────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchChildren() {
      setIsLoadingChildren(true);
      setChildrenError(null);
      try {
        const role = authApi.getRole().toLowerCase();
        const username = typeof window !== "undefined" ? localStorage.getItem("username") || "" : "";
        const keyword = role === "parent" ? username : "";
        const res = await parentStudentApi.getAll(1, 100, keyword);
        if (res.statusCode === 200 && res.data) {
          const all: ChildItem[] = [];
          (res.data.items || []).forEach((p) => { if (p.children) all.push(...p.children); });
          const seen = new Set<number>();
          const unique = all.filter((c) => { if (seen.has(c.studentId)) return false; seen.add(c.studentId); return true; });
          setChildren(unique);
          if (unique.length > 0) setSelectedChild(unique[0]);
        } else {
          setChildrenError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("childProgress.loadChildrenError", { defaultValue: "Không thể tải danh sách học sinh." }));
        }
      } catch {
        setChildrenError(t("profile.errGeneric", { defaultValue: "Đã xảy ra lỗi. Vui lòng thử lại." }));
      } finally {
        setIsLoadingChildren(false);
      }
    }
    fetchChildren();
  }, [t]);

  // ── 2. Load grades when child changes ───────────────────────────────────────

  useEffect(() => {
    if (!selectedChild) { setGrades([]); setSelectedClassId(null); return; }
    setIsLoadingGrades(true);
    setGradesError(null);
    setGrades([]);
    setSelectedClassId(null);
    studentGradeApi.getChildGrades(selectedChild.studentId)
      .then((res) => {
        if (res.success && res.data) {
          setGrades(res.data);
          setSelectedClassId(res.data[0]?.classId ?? null);
        } else {
          setGradesError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("childProgress.loadGradesError", { defaultValue: "Không thể tải tiến độ học tập." }));
        }
      })
      .catch(() => setGradesError(t("childProgress.loadGradesError", { defaultValue: "Không thể tải tiến độ học tập." })))
      .finally(() => setIsLoadingGrades(false));
  }, [selectedChild, t]);

  // ── 3. Load per-class data when class changes ────────────────────────────────

  const loadClassData = useCallback(async (classId: number, studentId: number) => {
    setIsLoadingHw(true);
    setIsLoadingAtt(true);
    setHomeworkList([]);
    setSessions([]);
    setAttendanceError(null);
    try {
      const res = await studentProgressApi.getChildProgress(classId, studentId);
      if (res.success && res.data) {
        setHomeworkList(res.data.homeworks || []);
        setSessions((res.data.attendanceSessions || []).map((s: MyAttendanceSessionDto) => ({
          scheduleId: s.scheduleId,
          lessonNo: s.lessonNo,
          date: s.date ?? null,
          status: s.status,
          description: s.description ?? null,
        })));
      } else {
        setAttendanceError("Không thể tải dữ liệu tiến độ.");
      }
    } catch {
      setAttendanceError("Không thể tải dữ liệu tiến độ.");
    } finally {
      setIsLoadingHw(false);
      setIsLoadingAtt(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedClassId || !selectedChild) return;
    loadClassData(selectedClassId, selectedChild.studentId);
  }, [selectedClassId, selectedChild, loadClassData]);

  // ── Derived data ─────────────────────────────────────────────────────────────

  const selectedGrade = useMemo(
    () => grades.find((g) => g.classId === selectedClassId) || null,
    [grades, selectedClassId]
  );

  // Homework split: submitted vs not submitted
  const hwSubmitted = useMemo(() => homeworkList.filter((hw) => !!hw.submission), [homeworkList]);
  const hwNotSubmitted = useMemo(() => homeworkList.filter((hw) => !hw.submission), [homeworkList]);

  const attStats = useMemo(() => {
    const now = new Date();
    const pastSessions = sessions.filter((s) => s.date && new Date(s.date) < now);
    const present  = pastSessions.filter((s) => s.status === 1 || s.status === 2 || s.status === 3);
    const absent   = pastSessions.filter((s) => s.status !== 1 && s.status !== 2 && s.status !== 3);
    const rate     = pastSessions.length ? Math.round((present.length / pastSessions.length) * 100) : 100;
    return { total: sessions.length, recorded: pastSessions.length, present: present.length, absent: absent.length, rate };
  }, [sessions]);

  // Score bar chart (horizontal)
  const scoreBarOptions: ApexOptions = useMemo(() => ({
    chart: { type: "bar", fontFamily: "Outfit, sans-serif", toolbar: { show: false }, background: "transparent" },
    colors: selectedGrade?.components.map((c) => {
      if (c.score >= 7) return "#10b981";
      if (c.score >= 5) return "#465fff";
      return "#f59e0b";
    }) || ["#465fff"],
    plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 6, dataLabels: { position: "right" } } },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${Number(val).toFixed(1)}/10`,
      style: { fontSize: "11px", fontWeight: 700, fontFamily: "Outfit, sans-serif" },
      offsetX: 4,
    },
    xaxis: {
      categories: selectedGrade?.components.map((c) => c.componentName) || [],
      min: 0, max: 10,
      labels: { style: { fontFamily: "Outfit, sans-serif", fontSize: "11px" } },
    },
    yaxis: { labels: { style: { fontFamily: "Outfit, sans-serif", fontSize: "12px", fontWeight: 600 } } },
    grid: { borderColor: "#f1f5f9", xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    legend: { show: false },
    tooltip: { y: { formatter: (val: number) => `${Number(val).toFixed(1)} / 10` }, theme: "light" },
  }), [selectedGrade]);

  const scoreBarSeries = useMemo(() => [{
    name: t("childProgress.scoreName", { defaultValue: "Điểm" }),
    data: selectedGrade?.components.map((c) => Math.round(c.score * 10) / 10) || [],
  }], [selectedGrade, t]);

  // Homework donut
  const hwDonutOptions: ApexOptions = useMemo(() => ({
    chart: { type: "donut", fontFamily: "Outfit, sans-serif", background: "transparent" },
    colors: ["#10b981", "#f43f5e"],
    labels: [
      t("childProgress.homeworkSubmitted", { defaultValue: "Bài đã nộp" }),
      t("childProgress.homeworkNotSubmitted", { defaultValue: "Chưa nộp" })
    ],
    plotOptions: {
      pie: {
        donut: {
          size: "68%",
          labels: {
            show: true,
            total: {
              show: true,
              label: t("childProgress.totalHomeworkShort", { defaultValue: "Tổng BT" }),
              formatter: () => `${homeworkList.length}`,
              fontSize: "14px", fontWeight: 700, fontFamily: "Outfit, sans-serif", color: "#374151",
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    legend: { position: "bottom", fontFamily: "Outfit, sans-serif", fontSize: "12px" },
    stroke: { show: false },
    tooltip: { y: { formatter: (v: number) => `${v} ${t("childProgress.homeworkUnit", { defaultValue: "bài" })}` } },
  }), [homeworkList.length, t]);

  // Attendance donut
  const attDonutOptions: ApexOptions = useMemo(() => ({
    chart: { type: "donut", fontFamily: "Outfit, sans-serif", background: "transparent" },
    colors: ["#10b981", "#f43f5e"],
    labels: [
      t("childProgress.statusPresent", { defaultValue: "Có mặt" }),
      t("childProgress.statusAbsent", { defaultValue: "Vắng mặt" })
    ],
    plotOptions: {
      pie: {
        donut: {
          size: "68%",
          labels: {
            show: true,
            total: {
              show: true,
              label: t("childProgress.totalSessionsShort", { defaultValue: "Tổng buổi" }),
              formatter: () => `${sessions.length}`,
              fontSize: "14px", fontWeight: 700, fontFamily: "Outfit, sans-serif", color: "#374151",
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    legend: { position: "bottom", fontFamily: "Outfit, sans-serif", fontSize: "12px" },
    stroke: { show: false },
    tooltip: { y: { formatter: (v: number) => `${v} ${t("childProgress.sessionUnit", { defaultValue: "buổi" })}` } },
  }), [sessions.length, t]);

  // ── Render helpers ───────────────────────────────────────────────────────────

  if (isLoadingChildren) return (
    <div className="flex flex-col items-center justify-center py-32">
      <Loader2 className="animate-spin h-8 w-8 text-brand-500" />
      <p className="mt-3 text-sm text-gray-500">{t("childProgress.loadingChildren", { defaultValue: "Đang tải danh sách học sinh..." })}</p>
    </div>
  );

  if (childrenError) return (
    <div className="rounded-xl bg-red-50/70 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-6 flex items-start gap-4">
      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
      <p className="text-sm text-red-700 dark:text-red-400">{childrenError}</p>
    </div>
  );

  if (children.length === 0) return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
      <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="font-bold text-gray-700 dark:text-gray-300">{t("childProgress.notLinked", { defaultValue: "Chưa liên kết học sinh" })}</p>
      <p className="mt-1 text-sm text-gray-400">{t("childProgress.notLinkedDesc", { defaultValue: "Tài khoản phụ huynh chưa được liên kết với học sinh nào." })}</p>
    </div>
  );

  return (
    <div className="space-y-5 w-full pb-10">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">{t("childProgress.title", { defaultValue: "Tiến độ học tập của con" })}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{t("childProgress.headerDesc", { defaultValue: "Theo dõi điểm số, bài tập và chuyên cần theo từng lớp" })}</p>
        </div>
      </div>

      {/* ── Child Selector ──────────────────────────────────────────────────── */}
      {children.length > 1 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs dark:border-white/[0.05] dark:bg-white/[0.03]">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">{t("childProgress.selectChildTitle", { defaultValue: "Chọn học sinh" })}</p>
          <div className="flex flex-wrap gap-2">
            {children.map((child) => {
              const active = selectedChild?.studentId === child.studentId;
              return (
                <button key={child.studentId} type="button" onClick={() => setSelectedChild(child)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold border transition cursor-pointer ${
                    active ? "bg-brand-500 border-brand-500 text-white shadow-sm" : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                  }`}>
                  <User className="w-3.5 h-3.5" />
                  {child.studentName || `Học sinh #${child.studentId}`}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-xs dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{t("childProgress.viewingProgressShort", { defaultValue: "Đang xem tiến độ của" })}</p>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
              {selectedChild?.studentName || `Học sinh #${selectedChild?.studentId}`}
            </p>
          </div>
        </div>
      )}

      {/* ── Grades loading / error ──────────────────────────────────────────── */}
      {isLoadingGrades ? (
        <div className="flex items-center justify-center py-20 rounded-2xl border border-gray-100 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <RefreshCw className="animate-spin w-5 h-5 text-brand-500 mr-2" />
          <span className="text-sm text-gray-500">{t("childProgress.loadingData", { defaultValue: "Đang tải dữ liệu..." })}</span>
        </div>
      ) : gradesError ? (
        <div className="rounded-xl border border-red-100 bg-red-50/70 dark:border-red-900/30 dark:bg-red-900/10 p-4 text-sm text-red-600 dark:text-red-400">
          {gradesError}
        </div>
      ) : grades.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
          <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">{t("childProgress.noClassData", { defaultValue: "Con chưa có lớp học nào có dữ liệu điểm." })}</p>
        </div>
      ) : (
        <div className="space-y-5">

          {/* ── Class Selector ────────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs dark:border-white/[0.05] dark:bg-white/[0.03]">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">{t("childProgress.selectClassTitle", { defaultValue: "Chọn lớp học để xem chi tiết" })}</p>
            <div className="flex flex-wrap gap-2">
              {grades.map((g) => {
                const active = selectedClassId === g.classId;
                return (
                  <button key={g.classId} type="button"
                    onClick={() => { setSelectedClassId(g.classId); setActiveTab("scores"); }}
                    className={`group flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold border transition cursor-pointer ${
                      active
                        ? "bg-brand-500 border-brand-500 text-white shadow-md shadow-brand-500/15"
                        : "border-gray-200 text-gray-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10"
                    }`}
                  >
                    <BookMarked className={`w-3.5 h-3.5 ${active ? "text-white" : "text-gray-400 group-hover:text-brand-500"}`} />
                    <span>{g.classCode || g.className || `Lớp #${g.classId}`}</span>
                    <span className={`ml-1 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${
                      active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                    }`}>
                      {Number(g.averageScore).toFixed(1)}
                    </span>
                    {!active && <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-brand-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Content for selected class ────────────────────────────────────── */}
          {selectedGrade && (
            !isLoadingAtt && (sessions.length === 0 || attStats.recorded === 0) ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
                <Clock3 className="w-10 h-10 text-gray-300 mx-auto mb-3 animate-pulse" />
                <p className="text-sm font-semibold text-gray-500">
                  {t("childProgress.classNotStarted", { defaultValue: "Lớp học chưa diễn ra buổi nào." })}
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-fadeIn">

              {/* 4 Summary Cards */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  icon={<Award className="w-5 h-5" />}
                  label={t("childProgress.averageScore", { defaultValue: "Điểm trung bình" })}
                  value={Number(selectedGrade.averageScore).toFixed(1)}
                  sub={t("childProgress.outOf10", { defaultValue: "/ 10 điểm" })}
                  colorText={selectedGrade.averageScore >= 7 ? "text-emerald-600 dark:text-emerald-400" : selectedGrade.averageScore >= 5 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}
                  colorBg={selectedGrade.averageScore >= 7 ? "bg-emerald-50 dark:bg-emerald-500/10" : selectedGrade.averageScore >= 5 ? "bg-blue-50 dark:bg-blue-500/10" : "bg-amber-50 dark:bg-amber-500/10"}
                />
                <StatCard
                  icon={<CalendarCheck className="w-5 h-5" />}
                  label={t("childProgress.attendance", { defaultValue: "Chuyên cần" })}
                  value={isLoadingAtt ? "..." : `${attStats.rate}%`}
                  sub={isLoadingAtt ? "" : `${attStats.present}/${sessions.length} ${t("childProgress.sessionsPresent", { defaultValue: "buổi có mặt" })}`}
                  colorText={attStats.rate >= 80 ? "text-emerald-600 dark:text-emerald-400" : attStats.rate >= 60 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}
                  colorBg={attStats.rate >= 80 ? "bg-emerald-50 dark:bg-emerald-500/10" : attStats.rate >= 60 ? "bg-amber-50 dark:bg-amber-500/10" : "bg-rose-50 dark:bg-rose-500/10"}
                />
                <StatCard
                  icon={<CheckCircle2 className="w-5 h-5" />}
                  label={t("childProgress.homeworkSubmitted", { defaultValue: "Bài đã nộp" })}
                  value={isLoadingHw ? "..." : `${hwSubmitted.length}`}
                  sub={isLoadingHw ? "" : `/ ${homeworkList.length} ${t("childProgress.totalHomeworks", { defaultValue: "bài tổng cộng" })}`}
                  colorText="text-emerald-600 dark:text-emerald-400"
                  colorBg="bg-emerald-50 dark:bg-emerald-500/10"
                />
                <StatCard
                  icon={<ClipboardList className="w-5 h-5" />}
                  label={t("childProgress.homeworkNotSubmitted", { defaultValue: "Chưa nộp" })}
                  value={isLoadingHw ? "..." : `${hwNotSubmitted.length}`}
                  sub={isLoadingHw ? "" : t("childProgress.homeworkMissing", { defaultValue: "bài tập còn thiếu" })}
                  colorText={hwNotSubmitted.length === 0 ? "text-gray-400 dark:text-gray-500" : "text-rose-600 dark:text-rose-400"}
                  colorBg={hwNotSubmitted.length === 0 ? "bg-gray-50 dark:bg-white/[0.03]" : "bg-rose-50 dark:bg-rose-500/10"}
                />
              </div>

              {/* Content Tabs */}
              <div className="rounded-2xl border border-gray-100 bg-white shadow-xs dark:border-white/[0.05] dark:bg-white/[0.03] overflow-hidden">
                {/* Tab Bar */}
                <div className="flex items-center gap-1 border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02] px-4 py-3">
                  <TabBtn active={activeTab === "scores"} onClick={() => setActiveTab("scores")}>
                    <Award className="w-3.5 h-3.5" /> {t("childProgress.scores", { defaultValue: "Điểm số" })}
                  </TabBtn>
                  <TabBtn active={activeTab === "homework"} onClick={() => setActiveTab("homework")}>
                    <ClipboardList className="w-3.5 h-3.5" /> {t("childProgress.homework", { defaultValue: "Bài tập" })}
                  </TabBtn>
                  <TabBtn active={activeTab === "attendance"} onClick={() => setActiveTab("attendance")}>
                    <CalendarCheck className="w-3.5 h-3.5" /> {t("childProgress.attendance", { defaultValue: "Chuyên cần" })}
                  </TabBtn>
                </div>

                {/* ── TAB: Điểm số ──────────────────────────────────────── */}
                {activeTab === "scores" && (
                  <div className="p-5 space-y-5">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">
                        {t("childProgress.class", { defaultValue: "Lớp:" })} <span className="font-semibold text-gray-600 dark:text-gray-300">
                          {selectedGrade.classCode ? `${selectedGrade.classCode} - ` : ""}{selectedGrade.className}
                        </span>
                        {selectedGrade.courseName && (
                          <> &nbsp;·&nbsp; <span className="font-semibold text-gray-600 dark:text-gray-300">{selectedGrade.courseName}</span></>
                        )}
                      </p>
                    </div>

                    {/* Horizontal bar chart */}
                    {selectedGrade.components.length > 0 ? (
                      <ReactApexChart
                        options={scoreBarOptions}
                        series={scoreBarSeries}
                        type="bar"
                        height={Math.max(160, selectedGrade.components.length * 52 + 40)}
                      />
                    ) : (
                      <p className="text-sm text-center text-gray-400 py-8">{t("childProgress.noGradeComponents", { defaultValue: "Chưa có thành phần điểm." })}</p>
                    )}

                    {/* Score breakdown table */}
                    <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-white/[0.05]">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-white/[0.03] text-[11px] font-bold uppercase tracking-wider text-gray-400">
                          <tr>
                            <th className="px-4 py-3 text-left">{t("childProgress.colComponent", { defaultValue: "Thành phần" })}</th>
                            <th className="px-4 py-3 text-center">{t("childProgress.colWeight", { defaultValue: "Trọng số" })}</th>
                            <th className="px-4 py-3 text-center">{t("childProgress.colScore", { defaultValue: "Điểm số" })}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                          {selectedGrade.components.map((c) => (
                            <tr key={c.gradeComponentId} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                              <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{c.componentName}</td>
                              <td className="px-4 py-3 text-center text-gray-500 text-xs">{c.weight}%</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex min-w-12 items-center justify-center rounded-lg border px-2.5 py-1 text-xs font-bold ${scoreTone(c.score)}`}>
                                  {Number(c.score).toFixed(1)}
                                </span>
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-brand-50/40 dark:bg-brand-500/5 font-bold border-t-2 border-brand-100 dark:border-brand-500/20">
                            <td className="px-4 py-3 text-gray-900 dark:text-white">{t("childProgress.averageScore", { defaultValue: "Điểm trung bình" })}</td>
                            <td className="px-4 py-3 text-center text-gray-500 text-xs">100%</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex min-w-12 items-center justify-center rounded-lg border px-2.5 py-1 text-sm font-extrabold ${scoreTone(selectedGrade.averageScore)}`}>
                                {Number(selectedGrade.averageScore).toFixed(1)}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── TAB: Bài tập ──────────────────────────────────────── */}
                {activeTab === "homework" && (
                  <div className="p-5 space-y-5">
                    {isLoadingHw ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="animate-spin w-5 h-5 text-brand-500 mr-2" />
                        <span className="text-sm text-gray-500">{t("childProgress.loadingHomework", { defaultValue: "Đang tải bài tập..." })}</span>
                      </div>
                    ) : homeworkList.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                        <ClipboardList className="w-10 h-10 mb-2 opacity-30" />
                        <p className="text-sm">{t("childProgress.noHomework", { defaultValue: "Lớp này chưa có bài tập nào." })}</p>
                      </div>
                    ) : (
                      <>
                        {/* 2 counters + donut */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Left: counters */}
                          <div className="flex flex-col gap-3 justify-center">
                            {/* Đã nộp */}
                            <div className="flex items-center gap-4 rounded-xl border border-emerald-100 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/20 p-4">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{t("childProgress.homeworkSubmitted", { defaultValue: "Bài đã nộp" })}</p>
                                <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{hwSubmitted.length} <span className="text-sm font-medium text-emerald-400">{t("childProgress.homeworkUnit", { defaultValue: "bài" })}</span></p>
                              </div>
                            </div>
                            {/* Chưa nộp */}
                            <div className={`flex items-center gap-4 rounded-xl border p-4 ${
                              hwNotSubmitted.length === 0
                                ? "border-gray-100 bg-gray-50 dark:bg-white/[0.02] dark:border-white/[0.05]"
                                : "border-rose-100 bg-rose-50 dark:bg-rose-500/10 dark:border-rose-500/20"
                            }`}>
                              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                hwNotSubmitted.length === 0
                                  ? "bg-gray-100 text-gray-400 dark:bg-white/[0.05]"
                                  : "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
                              }`}>
                                <XCircle className="w-5 h-5" />
                              </div>
                              <div>
                                <p className={`text-xs font-semibold ${hwNotSubmitted.length === 0 ? "text-gray-500" : "text-rose-700 dark:text-rose-400"}`}>{t("childProgress.homeworkNotSubmitted", { defaultValue: "Chưa nộp" })}</p>
                                <p className={`text-2xl font-extrabold ${hwNotSubmitted.length === 0 ? "text-gray-400" : "text-rose-600 dark:text-rose-400"}`}>
                                  {hwNotSubmitted.length} <span className="text-sm font-medium opacity-70">{t("childProgress.homeworkUnit", { defaultValue: "bài" })}</span>
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Right: donut */}
                          <div className="flex items-center justify-center">
                            <ReactApexChart
                              options={hwDonutOptions}
                              series={[hwSubmitted.length, hwNotSubmitted.length]}
                              type="donut"
                              height={200}
                            />
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-100 dark:border-white/[0.05]" />

                        {/* Bài đã nộp list */}
                        {hwSubmitted.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{t("childProgress.homeworkSubmittedList", { count: hwSubmitted.length, defaultValue: `Bài đã nộp (${hwSubmitted.length})` })}</p>
                            </div>
                            <div className="space-y-2">
                              {hwSubmitted.map((hw) => (
                                <div key={hw.id} className="flex items-start justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 dark:border-emerald-500/15 dark:bg-emerald-500/5 px-4 py-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{hw.title}</p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                      {t("childProgress.dueDate", { defaultValue: "Hạn nộp:" })} {formatDate(hw.dueDate)}
                                      {hw.submission?.submitTime && (
                                        <> &nbsp;·&nbsp; {t("childProgress.submittedAt", { defaultValue: "Đã nộp:" })} {formatDate(hw.submission.submitTime)}</>
                                      )}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 shrink-0">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 px-2.5 py-0.5 text-[10px] font-bold">
                                      <CheckCircle2 className="w-3 h-3" /> {t("childProgress.homeworkSubmitted", { defaultValue: "Bài đã nộp" })}
                                    </span>
                                    {hw.submission?.score != null && (
                                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${scoreTone(hw.submission.score)}`}>
                                        {Number(hw.submission.score).toFixed(1)}/{hw.totalScore}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Bài chưa nộp list */}
                        {hwNotSubmitted.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <XCircle className="w-4 h-4 text-rose-500" />
                              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{t("childProgress.homeworkNotSubmittedList", { count: hwNotSubmitted.length, defaultValue: `Bài chưa nộp (${hwNotSubmitted.length})` })}</p>
                            </div>
                            <div className="space-y-2">
                              {hwNotSubmitted.map((hw) => {
                                const overdue = hw.dueDate && new Date(hw.dueDate) < new Date();
                                return (
                                  <div key={hw.id} className="flex items-start justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50/50 dark:border-rose-500/15 dark:bg-rose-500/5 px-4 py-3">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{hw.title}</p>
                                      <p className={`text-[11px] mt-0.5 ${overdue ? "text-rose-500 font-semibold" : "text-gray-400"}`}>
                                        {overdue ? t("childProgress.overdue", { defaultValue: "⚠ Đã quá hạn: " }) : t("childProgress.dueDate", { defaultValue: "Hạn nộp: " })}{formatDate(hw.dueDate)}
                                      </p>
                                    </div>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 px-2.5 py-0.5 text-[10px] font-bold shrink-0">
                                      <XCircle className="w-3 h-3" /> {t("childProgress.homeworkNotSubmitted", { defaultValue: "Chưa nộp" })}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* ── TAB: Chuyên cần ───────────────────────────────────── */}
                {activeTab === "attendance" && (
                  <div className="p-5 space-y-5">
                    {isLoadingAtt ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="animate-spin w-5 h-5 text-brand-500 mr-2" />
                        <span className="text-sm text-gray-500">{t("childProgress.loadingAttendance", { defaultValue: "Đang tải dữ liệu chuyên cần..." })}</span>
                      </div>
                    ) : attendanceError ? (
                      <div className="rounded-xl border border-amber-100 bg-amber-50/70 dark:border-amber-500/20 dark:bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
                        {attendanceError}
                      </div>
                    ) : sessions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                        <CalendarCheck className="w-10 h-10 mb-2 opacity-30" />
                        <p className="text-sm">{t("childProgress.noAttendance", { defaultValue: "Chưa có buổi học nào được ghi nhận." })}</p>
                      </div>
                    ) : (
                      <>
                        {/* Stats row + donut */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Left: 3 stat cards */}
                          <div className="flex flex-col gap-3 justify-center">
                            <div className="grid grid-cols-3 gap-2">
                              <div className="rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] p-3 text-center">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">{t("childProgress.totalSessions", { defaultValue: "Tổng buổi" })}</p>
                                <p className="text-xl font-extrabold text-gray-800 dark:text-gray-100 mt-1">{sessions.length}</p>
                              </div>
                              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 p-3 text-center">
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wide">{t("childProgress.statusPresent", { defaultValue: "Có mặt" })}</p>
                                <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{attStats.present}</p>
                              </div>
                              <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 p-3 text-center">
                                <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wide">{t("childProgress.statusAbsentShort", { defaultValue: "Vắng" })}</p>
                                <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">{attStats.absent}</p>
                              </div>
                            </div>
                            {/* Attendance rate + progress bar */}
                            <div className="rounded-xl border border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02] p-4">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-gray-500">{t("childProgress.attendanceRate", { defaultValue: "Tỉ lệ chuyên cần" })}</p>
                                <span className={`text-lg font-extrabold ${attendanceStyle(attStats.rate).text}`}>{attStats.rate}%</span>
                              </div>
                              <div className="h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${attendanceStyle(attStats.rate).bar}`}
                                  style={{ width: `${attStats.rate}%` }}
                                />
                              </div>
                              <p className="mt-1.5 text-[11px] text-gray-400">
                                {attStats.present} {t("childProgress.sessionsPresent", { defaultValue: "buổi có mặt" })} / {sessions.length} {t("childProgress.totalSessionsCount", { defaultValue: "tổng số buổi" })}
                              </p>
                            </div>
                          </div>

                          {/* Right: donut */}
                          <div className="flex items-center justify-center">
                            <ReactApexChart
                              options={attDonutOptions}
                              series={[attStats.present, attStats.absent]}
                              type="donut"
                              height={200}
                            />
                          </div>
                        </div>

                        {/* Session list */}
                        <div>
                          <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">{t("childProgress.sessionDetailsTitle", { defaultValue: "Chi tiết từng buổi học" })}</p>
                          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                            {sessions.map((s) => {
                              const si = sessionStatusInfo(s.status, t);
                              return (
                                <div key={s.scheduleId} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 dark:border-white/[0.05] bg-white dark:bg-white/[0.02] px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/[0.05] text-xs font-bold text-gray-500">
                                      {s.lessonNo}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                        {s.date ? formatDate(s.date) : t("childProgress.noDate", { defaultValue: "Chưa có ngày" })}
                                      </p>
                                      {s.description && (
                                        <p className="text-[11px] text-gray-400 mt-0.5">{s.description}</p>
                                      )}
                                    </div>
                                  </div>
                                  <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold shrink-0 ${si.cls}`}>
                                    {si.icon} {si.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        )}
        </div>
      )}
    </div>
  );
}

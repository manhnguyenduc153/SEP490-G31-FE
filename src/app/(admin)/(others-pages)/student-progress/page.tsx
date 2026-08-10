"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { studentGradeApi, MyGradeClassDto } from "@/services/score.api";
import { HomeworkDto, HomeworkSubmissionDto } from "@/services/homework.api";
import { MyAttendanceSessionDto } from "@/services/attendance.api";
import { studentProgressApi, HomeworkWithSub } from "@/services/studentProgress.api";
import { useTranslation } from "react-i18next";
import {
  Award, RefreshCw, Loader2, TrendingUp,
  BookOpen, CalendarCheck, ClipboardList, CheckCircle2, XCircle,
  Clock3, ShieldCheck, BookMarked, ChevronRight,
} from "lucide-react";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });


interface SessionRow {
  scheduleId: number;
  lessonNo: number;
  date: string | null;
  status: number;
  description: string | null;
}

const formatDate = (val?: string | null) => {
  if (!val) return "—";
  try { return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(val)); }
  catch { return val; }
};

const scoreTone = (score: number) => {
  if (score >= 7) return "bg-emerald-50 text-emerald-600 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
  if (score >= 5) return "bg-blue-50 text-blue-600 border-blue-200/60 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20";
  return "bg-amber-50 text-amber-600 border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
};

const attendanceStyle = (rate: number) => {
  if (rate >= 80) return { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" };
  if (rate >= 60) return { bar: "bg-amber-500",   text: "text-amber-600 dark:text-amber-400" };
  return             { bar: "bg-rose-500",         text: "text-rose-600 dark:text-rose-400" };
};

const sessionStatusInfo = (status: number, t: any) => {
  if (status === 0)  return { label: t("studentProgress.statusAbsent", { defaultValue: "Vắng mặt" }),     cls: "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",     icon: <XCircle className="h-3.5 w-3.5" /> };
  if (status === 2)  return { label: t("studentProgress.statusLate", { defaultValue: "Đi muộn" }),      cls: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20", icon: <Clock3 className="h-3.5 w-3.5" /> };
  if (status === 3)  return { label: t("studentProgress.statusAuthorizedAbsence", { defaultValue: "Nghỉ có phép" }), cls: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",       icon: <ShieldCheck className="h-3.5 w-3.5" /> };
  if (status === -1) return { label: t("studentProgress.statusNotRecorded", { defaultValue: "Chưa ghi nhận" }),cls: "bg-gray-50 text-gray-500 border-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",             icon: <RefreshCw className="h-3.5 w-3.5" /> };
  return               { label: t("studentProgress.statusPresent", { defaultValue: "Có mặt" }),            cls: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20", icon: <CheckCircle2 className="h-3.5 w-3.5" /> };
};

function StatCard({ icon, label, value, sub, colorText, colorBg }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; colorText: string; colorBg: string;
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
    <button type="button" onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition cursor-pointer ${
        active ? "bg-brand-500 text-white shadow-sm shadow-brand-500/20"
               : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.05] dark:hover:text-gray-200"
      }`}>
      {children}
    </button>
  );
}

export default function StudentProgressPage() {
  const { t } = useTranslation();

  const [grades, setGrades]                     = useState<MyGradeClassDto[]>([]);
  const [isLoadingGrades, setIsLoadingGrades]   = useState(true);
  const [gradesError, setGradesError]           = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId]   = useState<number | null>(null);
  const [activeTab, setActiveTab]               = useState<"scores" | "homework" | "attendance">("scores");
  const [homeworkList, setHomeworkList]         = useState<HomeworkWithSub[]>([]);
  const [isLoadingHw, setIsLoadingHw]           = useState(false);
  const [sessions, setSessions]                 = useState<SessionRow[]>([]);
  const [isLoadingAtt, setIsLoadingAtt]         = useState(false);
  const [attendanceError, setAttendanceError]   = useState<string | null>(null);

  useEffect(() => {
    setIsLoadingGrades(true);
    studentGradeApi.getMyGrades()
      .then((res) => {
        if (res.success && res.data) {
          setGrades(res.data);
          setSelectedClassId(res.data[0]?.classId ?? null);
        } else {
          setGradesError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : "Không thể tải tiến độ học tập.");
        }
      })
      .catch(() => setGradesError("Không thể tải tiến độ học tập."))
      .finally(() => setIsLoadingGrades(false));
  }, [t]);

  const loadClassData = useCallback(async (classId: number) => {
    setIsLoadingHw(true);
    setIsLoadingAtt(true);
    setHomeworkList([]);
    setSessions([]);
    setAttendanceError(null);
    try {
      const res = await studentProgressApi.getProgress(classId);
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
    if (!selectedClassId) return;
    loadClassData(selectedClassId);
  }, [selectedClassId, loadClassData]);

  const selectedGrade  = useMemo(() => grades.find((g) => g.classId === selectedClassId) || null, [grades, selectedClassId]);
  const hwSubmitted    = useMemo(() => homeworkList.filter((hw) => !!hw.submission), [homeworkList]);
  const hwNotSubmitted = useMemo(() => homeworkList.filter((hw) => !hw.submission),  [homeworkList]);

  const attStats = useMemo(() => {
    const now = new Date();
    const pastSessions = sessions.filter((s) => s.date && new Date(s.date) < now);
    const present  = pastSessions.filter((s) => s.status === 1 || s.status === 2 || s.status === 3);
    const absent   = pastSessions.filter((s) => s.status !== 1 && s.status !== 2 && s.status !== 3);
    const rate     = pastSessions.length ? Math.round((present.length / pastSessions.length) * 100) : 100;
    return { recorded: pastSessions.length, present: present.length, absent: absent.length, rate };
  }, [sessions]);

  const scoreBarOptions: ApexOptions = useMemo(() => ({
    chart: { type: "bar", fontFamily: "Outfit, sans-serif", toolbar: { show: false }, background: "transparent" },
    colors: selectedGrade?.components.map((c) => c.score >= 7 ? "#10b981" : c.score >= 5 ? "#465fff" : "#f59e0b") || ["#465fff"],
    plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 6, dataLabels: { position: "right" } } },
    dataLabels: { enabled: true, formatter: (val: number) => `${Number(val).toFixed(1)}/10`, style: { fontSize: "11px", fontFamily: "Outfit, sans-serif" }, offsetX: 4 },
    xaxis: { categories: selectedGrade?.components.map((c) => c.componentName) || [], min: 0, max: 10, labels: { style: { fontFamily: "Outfit, sans-serif", fontSize: "11px" } } },
    yaxis: { labels: { style: { fontFamily: "Outfit, sans-serif", fontSize: "12px" } } },
    grid: { borderColor: "#f1f5f9", xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    legend: { show: false },
    tooltip: { y: { formatter: (val: number) => `${Number(val).toFixed(1)} / 10` }, theme: "light" },
  }), [selectedGrade]);

  const scoreBarSeries = useMemo(() => [{ name: t("studentProgress.scoreName", { defaultValue: "Điểm" }), data: selectedGrade?.components.map((c) => Math.round(c.score * 10) / 10) || [] }], [selectedGrade, t]);

  const hwDonutOptions: ApexOptions = useMemo(() => ({
    chart: { type: "donut", fontFamily: "Outfit, sans-serif", background: "transparent" },
    colors: ["#10b981", "#f43f5e"], labels: [t("studentProgress.homeworkSubmitted", { defaultValue: "Đã nộp" }), t("studentProgress.homeworkNotSubmitted", { defaultValue: "Chưa nộp" })],
    plotOptions: { pie: { donut: { size: "68%", labels: { show: true, total: { show: true, label: t("studentProgress.totalHomeworkShort", { defaultValue: "Tổng BT" }), formatter: () => `${homeworkList.length}`, fontSize: "14px", fontFamily: "Outfit, sans-serif", color: "#374151" } } } } },
    dataLabels: { enabled: false }, legend: { position: "bottom", fontFamily: "Outfit, sans-serif", fontSize: "12px" },
    stroke: { show: false }, tooltip: { y: { formatter: (v: number) => `${v} ${t("studentProgress.homeworkUnit", { defaultValue: "bài" })}` } },
  }), [homeworkList.length, t]);

  const attDonutOptions: ApexOptions = useMemo(() => ({
    chart: { type: "donut", fontFamily: "Outfit, sans-serif", background: "transparent" },
    colors: ["#10b981", "#f43f5e"], labels: [t("studentProgress.statusPresent", { defaultValue: "Có mặt" }), t("studentProgress.statusAbsent", { defaultValue: "Vắng mặt" })],
    plotOptions: { pie: { donut: { size: "68%", labels: { show: true, total: { show: true, label: t("studentProgress.totalSessionsShort", { defaultValue: "Tổng buổi" }), formatter: () => `${sessions.length}`, fontSize: "14px", fontFamily: "Outfit, sans-serif", color: "#374151" } } } } },
    dataLabels: { enabled: false }, legend: { position: "bottom", fontFamily: "Outfit, sans-serif", fontSize: "12px" },
    stroke: { show: false }, tooltip: { y: { formatter: (v: number) => `${v} ${t("studentProgress.sessionUnit", { defaultValue: "buổi" })}` } },
  }), [sessions.length, t]);

  if (isLoadingGrades) return (
    <div className="flex flex-col items-center justify-center py-32">
      <Loader2 className="animate-spin h-8 w-8 text-brand-500" />
      <p className="mt-3 text-sm text-gray-500">{t("studentProgress.loadingData", { defaultValue: "Đang tải dữ liệu..." })}</p>
    </div>
  );

  if (gradesError) return (
    <div className="rounded-xl bg-red-50/70 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-6">
      <p className="text-sm text-red-700 dark:text-red-400">{gradesError}</p>
    </div>
  );

  return (
    <div className="space-y-5 w-full pb-10">
      <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">{t("studentProgress.title", { defaultValue: "Tiến độ học tập của tôi" })}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{t("studentProgress.headerDesc", { defaultValue: "Theo dõi điểm số, bài tập và chuyên cần theo từng lớp" })}</p>
        </div>
      </div>

      {grades.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
          <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">{t("studentProgress.noClassData", { defaultValue: "Bạn chưa có lớp học nào có dữ liệu điểm." })}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Class Selector */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs dark:border-white/[0.05] dark:bg-white/[0.03]">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">{t("studentProgress.selectClassTitle", { defaultValue: "Chọn lớp học để xem chi tiết" })}</p>
            <div className="flex flex-wrap gap-2">
              {grades.map((g) => {
                const active = selectedClassId === g.classId;
                return (
                  <button key={g.classId} type="button"
                    onClick={() => { setSelectedClassId(g.classId); setActiveTab("scores"); }}
                    className={`group flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold border transition cursor-pointer ${
                      active ? "bg-brand-500 border-brand-500 text-white shadow-md shadow-brand-500/15"
                             : "border-gray-200 text-gray-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"
                    }`}>
                    <BookMarked className={`w-3.5 h-3.5 ${active ? "text-white" : "text-gray-400 group-hover:text-brand-500"}`} />
                    <span>{g.classCode || g.className || `Lớp #${g.classId}`}</span>
                    <span className={`ml-1 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${
                      active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                    }`}>{Number(g.averageScore).toFixed(1)}</span>
                    {!active && <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-brand-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedGrade && (
            !isLoadingAtt && (sessions.length === 0 || attStats.recorded === 0) ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
                <Clock3 className="w-10 h-10 text-gray-300 mx-auto mb-3 animate-pulse" />
                <p className="text-sm font-semibold text-gray-500">
                  {t("studentProgress.classNotStarted", { defaultValue: "Lớp học chưa diễn ra buổi nào." })}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard icon={<Award className="w-5 h-5" />} label={t("studentProgress.averageScore", { defaultValue: "Điểm trung bình" })} value={Number(selectedGrade.averageScore).toFixed(1)} sub={t("studentProgress.outOf10", { defaultValue: "/ 10 điểm" })}
                  colorText={selectedGrade.averageScore >= 7 ? "text-emerald-600 dark:text-emerald-400" : selectedGrade.averageScore >= 5 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}
                  colorBg={selectedGrade.averageScore >= 7 ? "bg-emerald-50 dark:bg-emerald-500/10" : selectedGrade.averageScore >= 5 ? "bg-blue-50 dark:bg-blue-500/10" : "bg-amber-50 dark:bg-amber-500/10"} />
                <StatCard icon={<CalendarCheck className="w-5 h-5" />} label={t("studentProgress.attendance", { defaultValue: "Chuyên cần" })} value={isLoadingAtt ? "..." : `${attStats.rate}%`} sub={isLoadingAtt ? "" : `${attStats.present}/${sessions.length} ${t("studentProgress.sessionsPresent", { defaultValue: "buổi có mặt" })}`}
                  colorText={attStats.rate >= 80 ? "text-emerald-600 dark:text-emerald-400" : attStats.rate >= 60 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}
                  colorBg={attStats.rate >= 80 ? "bg-emerald-50 dark:bg-emerald-500/10" : attStats.rate >= 60 ? "bg-amber-50 dark:bg-amber-500/10" : "bg-rose-50 dark:bg-rose-500/10"} />
                <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label={t("studentProgress.homeworkSubmitted", { defaultValue: "Bài đã nộp" })} value={isLoadingHw ? "..." : `${hwSubmitted.length}`} sub={isLoadingHw ? "" : `/ ${homeworkList.length} ${t("studentProgress.totalHomeworks", { defaultValue: "bài tổng cộng" })}`}
                  colorText="text-emerald-600 dark:text-emerald-400" colorBg="bg-emerald-50 dark:bg-emerald-500/10" />
                <StatCard icon={<ClipboardList className="w-5 h-5" />} label={t("studentProgress.homeworkNotSubmitted", { defaultValue: "Chưa nộp" })} value={isLoadingHw ? "..." : `${hwNotSubmitted.length}`} sub={isLoadingHw ? "" : t("studentProgress.homeworkMissing", { defaultValue: "bài tập còn thiếu" })}
                  colorText={hwNotSubmitted.length === 0 ? "text-gray-400 dark:text-gray-500" : "text-rose-600 dark:text-rose-400"}
                  colorBg={hwNotSubmitted.length === 0 ? "bg-gray-50 dark:bg-white/[0.03]" : "bg-rose-50 dark:bg-rose-500/10"} />
              </div>

              {/* Content Tabs */}
              <div className="rounded-2xl border border-gray-100 bg-white shadow-xs dark:border-white/[0.05] dark:bg-white/[0.03] overflow-hidden">
                <div className="flex items-center gap-1 border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02] px-4 py-3">
                  <TabBtn active={activeTab === "scores"}     onClick={() => setActiveTab("scores")}><Award className="w-3.5 h-3.5" /> {t("studentProgress.scores", { defaultValue: "Điểm số" })}</TabBtn>
                  <TabBtn active={activeTab === "homework"}   onClick={() => setActiveTab("homework")}><ClipboardList className="w-3.5 h-3.5" /> {t("studentProgress.homework", { defaultValue: "Bài tập" })}</TabBtn>
                  <TabBtn active={activeTab === "attendance"} onClick={() => setActiveTab("attendance")}><CalendarCheck className="w-3.5 h-3.5" /> {t("studentProgress.attendance", { defaultValue: "Chuyên cần" })}</TabBtn>
                </div>

                {/* Scores Tab */}
                {activeTab === "scores" && (
                  <div className="p-5 space-y-5">
                    <p className="text-xs text-gray-400">
                      {t("studentProgress.class", { defaultValue: "Lớp:" })} <span className="font-semibold text-gray-600 dark:text-gray-300">{selectedGrade.classCode ? `${selectedGrade.classCode} - ` : ""}{selectedGrade.className}</span>
                      {selectedGrade.courseName && <> &nbsp;·&nbsp; <span className="font-semibold text-gray-600 dark:text-gray-300">{selectedGrade.courseName}</span></>}
                    </p>
                    {selectedGrade.components.length > 0 ? (
                      <ReactApexChart options={scoreBarOptions} series={scoreBarSeries} type="bar" height={Math.max(160, selectedGrade.components.length * 52 + 40)} />
                    ) : <p className="text-sm text-center text-gray-400 py-8">{t("studentProgress.noGradeComponents", { defaultValue: "Chưa có thành phần điểm." })}</p>}
                    <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-white/[0.05]">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-white/[0.03] text-[11px] font-bold uppercase tracking-wider text-gray-400">
                          <tr><th className="px-4 py-3 text-left">{t("studentProgress.colComponent", { defaultValue: "Thành phần" })}</th><th className="px-4 py-3 text-center">{t("studentProgress.colWeight", { defaultValue: "Trọng số" })}</th><th className="px-4 py-3 text-center">{t("studentProgress.colScore", { defaultValue: "Điểm số" })}</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                          {selectedGrade.components.map((c) => (
                            <tr key={c.gradeComponentId} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                              <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{c.componentName}</td>
                              <td className="px-4 py-3 text-center text-gray-500 text-xs">{c.weight}%</td>
                              <td className="px-4 py-3 text-center"><span className={`inline-flex min-w-12 items-center justify-center rounded-lg border px-2.5 py-1 text-xs font-bold ${scoreTone(c.score)}`}>{Number(c.score).toFixed(1)}</span></td>
                            </tr>
                          ))}
                          <tr className="bg-brand-50/40 dark:bg-brand-500/5 font-bold border-t-2 border-brand-100 dark:border-brand-500/20">
                            <td className="px-4 py-3 text-gray-900 dark:text-white">{t("studentProgress.averageScore", { defaultValue: "Điểm trung bình" })}</td>
                            <td className="px-4 py-3 text-center text-gray-500 text-xs">100%</td>
                            <td className="px-4 py-3 text-center"><span className={`inline-flex min-w-12 items-center justify-center rounded-lg border px-2.5 py-1 text-sm font-extrabold ${scoreTone(selectedGrade.averageScore)}`}>{Number(selectedGrade.averageScore).toFixed(1)}</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Homework Tab */}
                {activeTab === "homework" && (
                  <div className="p-5 space-y-5">
                    {isLoadingHw ? (
                      <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin w-5 h-5 text-brand-500 mr-2" /><span className="text-sm text-gray-500">{t("studentProgress.loadingHomework", { defaultValue: "Đang tải bài tập..." })}</span></div>
                    ) : homeworkList.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-14 text-gray-400"><ClipboardList className="w-10 h-10 mb-2 opacity-30" /><p className="text-sm">{t("studentProgress.noHomework", { defaultValue: "Lớp này chưa có bài tập nào." })}</p></div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-3 justify-center">
                            <div className="flex items-center gap-4 rounded-xl border border-emerald-100 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/20 p-4">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600"><CheckCircle2 className="w-5 h-5" /></div>
                              <div><p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{t("studentProgress.homeworkSubmitted", { defaultValue: "Bài đã nộp" })}</p><p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{hwSubmitted.length} <span className="text-sm font-medium text-emerald-400">{t("studentProgress.homeworkUnit", { defaultValue: "bài" })}</span></p></div>
                            </div>
                            <div className={`flex items-center gap-4 rounded-xl border p-4 ${hwNotSubmitted.length === 0 ? "border-gray-100 bg-gray-50 dark:bg-white/[0.02] dark:border-white/[0.05]" : "border-rose-100 bg-rose-50 dark:bg-rose-500/10 dark:border-rose-500/20"}`}>
                              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${hwNotSubmitted.length === 0 ? "bg-gray-100 text-gray-400" : "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"}`}><XCircle className="w-5 h-5" /></div>
                              <div>
                                <p className={`text-xs font-semibold ${hwNotSubmitted.length === 0 ? "text-gray-500" : "text-rose-700 dark:text-rose-400"}`}>{t("studentProgress.homeworkNotSubmitted", { defaultValue: "Chưa nộp" })}</p>
                                <p className={`text-2xl font-extrabold ${hwNotSubmitted.length === 0 ? "text-gray-400" : "text-rose-600 dark:text-rose-400"}`}>{hwNotSubmitted.length} <span className="text-sm font-medium opacity-70">{t("studentProgress.homeworkUnit", { defaultValue: "bài" })}</span></p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-center"><ReactApexChart options={hwDonutOptions} series={[hwSubmitted.length, hwNotSubmitted.length]} type="donut" height={200} /></div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-white/[0.05]" />
                        {hwSubmitted.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><p className="text-sm font-bold text-gray-700 dark:text-gray-300">{t("studentProgress.homeworkSubmittedList", { count: hwSubmitted.length, defaultValue: `Bài đã nộp (${hwSubmitted.length})` })}</p></div>
                            <div className="space-y-2">
                              {hwSubmitted.map((hw) => (
                                <div key={hw.id} className="flex items-start justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 dark:border-emerald-500/15 dark:bg-emerald-500/5 px-4 py-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{hw.title}</p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">{t("studentProgress.dueDate", { defaultValue: "Hạn nộp:" })} {formatDate(hw.dueDate)}{hw.submission?.submitTime && <> &nbsp;·&nbsp; {t("studentProgress.submittedAt", { defaultValue: "Đã nộp:" })} {formatDate(hw.submission.submitTime)}</>}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 shrink-0">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 px-2.5 py-0.5 text-[10px] font-bold"><CheckCircle2 className="w-3 h-3" /> {t("studentProgress.homeworkSubmitted", { defaultValue: "Đã nộp" })}</span>
                                    {hw.submission?.score != null && <span className={`text-xs font-bold px-2 py-0.5 rounded border ${scoreTone(hw.submission.score)}`}>{Number(hw.submission.score).toFixed(1)}/{hw.totalScore}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {hwNotSubmitted.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3"><XCircle className="w-4 h-4 text-rose-500" /><p className="text-sm font-bold text-gray-700 dark:text-gray-300">{t("studentProgress.homeworkNotSubmittedList", { count: hwNotSubmitted.length, defaultValue: `Bài chưa nộp (${hwNotSubmitted.length})` })}</p></div>
                            <div className="space-y-2">
                              {hwNotSubmitted.map((hw) => {
                                const overdue = hw.dueDate && new Date(hw.dueDate) < new Date();
                                return (
                                  <div key={hw.id} className="flex items-start justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50/50 dark:border-rose-500/15 dark:bg-rose-500/5 px-4 py-3">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{hw.title}</p>
                                      <p className={`text-[11px] mt-0.5 ${overdue ? "text-rose-500 font-semibold" : "text-gray-400"}`}>{overdue ? t("studentProgress.overdue", { defaultValue: "⚠ Đã quá hạn: " }) : t("studentProgress.dueDate", { defaultValue: "Hạn nộp: " })}{formatDate(hw.dueDate)}</p>
                                    </div>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 px-2.5 py-0.5 text-[10px] font-bold shrink-0"><XCircle className="w-3 h-3" /> {t("studentProgress.homeworkNotSubmitted", { defaultValue: "Chưa nộp" })}</span>
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

                {/* Attendance Tab */}
                {activeTab === "attendance" && (
                  <div className="p-5 space-y-5">
                    {isLoadingAtt ? (
                      <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin w-5 h-5 text-brand-500 mr-2" /><span className="text-sm text-gray-500">{t("studentProgress.loadingAttendance", { defaultValue: "Đang tải dữ liệu chuyên cần..." })}</span></div>
                    ) : attendanceError ? (
                      <div className="rounded-xl border border-amber-100 bg-amber-50/70 dark:border-amber-500/20 dark:bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">{attendanceError}</div>
                    ) : sessions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-14 text-gray-400"><CalendarCheck className="w-10 h-10 mb-2 opacity-30" /><p className="text-sm">{t("studentProgress.noAttendance", { defaultValue: "Chưa có buổi học nào được ghi nhận." })}</p></div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-3 justify-center">
                            <div className="grid grid-cols-3 gap-2">
                              <div className="rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] p-3 text-center">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">{t("studentProgress.totalSessionsShort", { defaultValue: "Tổng buổi" })}</p>
                                <p className="text-xl font-extrabold text-gray-800 dark:text-gray-100 mt-1">{sessions.length}</p>
                              </div>
                              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 p-3 text-center">
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wide">{t("studentProgress.statusPresent", { defaultValue: "Có mặt" })}</p>
                                <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{attStats.present}</p>
                              </div>
                              <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 p-3 text-center">
                                <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wide">{t("studentProgress.statusAbsentShort", { defaultValue: "Vắng" })}</p>
                                <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">{attStats.absent}</p>
                              </div>
                            </div>
                            <div className="rounded-xl border border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02] p-4">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-gray-500">{t("studentProgress.attendanceRate", { defaultValue: "Tỉ lệ chuyên cần" })}</p>
                                <span className={`text-lg font-extrabold ${attendanceStyle(attStats.rate).text}`}>{attStats.rate}%</span>
                              </div>
                              <div className="h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${attendanceStyle(attStats.rate).bar}`} style={{ width: `${attStats.rate}%` }} />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-center"><ReactApexChart options={attDonutOptions} series={[attStats.present, attStats.absent]} type="donut" height={200} /></div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-white/[0.05]" />
                        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-white/[0.05]">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-white/[0.03] text-[11px] font-bold uppercase tracking-wider text-gray-400">
                              <tr><th className="px-4 py-3 text-center w-16">{t("studentProgress.colSessionNo", { defaultValue: "Buổi" })}</th><th className="px-4 py-3 text-left">{t("studentProgress.colDate", { defaultValue: "Ngày" })}</th><th className="px-4 py-3 text-center">{t("studentProgress.colStatus", { defaultValue: "Trạng thái" })}</th><th className="px-4 py-3 text-left">{t("studentProgress.colNote", { defaultValue: "Ghi chú" })}</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                              {sessions.map((s) => {
                                const info = sessionStatusInfo(s.status, t);
                                return (
                                  <tr key={s.scheduleId} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                                    <td className="px-4 py-3 text-center text-xs font-bold text-gray-500">{s.lessonNo}</td>
                                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">{formatDate(s.date)}</td>
                                    <td className="px-4 py-3 text-center"><span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${info.cls}`}>{info.icon}{info.label}</span></td>
                                    <td className="px-4 py-3 text-xs text-gray-400">{s.description || "—"}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
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

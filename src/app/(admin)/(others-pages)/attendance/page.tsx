"use client";


import { attendanceApi, MyAttendanceClassDto, MyAttendanceSessionDto } from "@/services/attendance.api";
import { BookOpen, CalendarCheck, CalendarDays, CheckCircle2, Clock3, GraduationCap, RefreshCw, ShieldCheck, UserRound, X, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const rateStyles = (rate: number) => {
  if (rate >= 80) return {
    text: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    bar: "bg-emerald-500",
  };
  if (rate >= 50) return {
    text: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    bar: "bg-amber-500",
  };
  return {
    text: "text-rose-600 dark:text-rose-400",
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    bar: "bg-rose-500",
  };
};

export default function MyAttendancePage() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<MyAttendanceClassDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, MyAttendanceSessionDto[]>>({});
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);
  const [detailErrors, setDetailErrors] = useState<Record<number, string>>({});

  const loadAttendance = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await attendanceApi.getMyAttendance();
      if (!response.success || !response.data) {
        throw new Error(response.message
          ? t(`backendMessages.${response.message}`, { defaultValue: response.message })
          : t("myAttendance.loadError", { defaultValue: "Không thể tải dữ liệu điểm danh." }));
      }
      setItems(response.data);
    } catch (err) {
      setError(err instanceof Error
        ? err.message
        : t("myAttendance.loadError", { defaultValue: "Không thể tải dữ liệu điểm danh." }));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  const openDetails = async (classId: number, forceReload = false) => {
    setSelectedClassId(classId);
    if (details[classId] && !forceReload) return;

    setDetailLoadingId(classId);
    setDetailErrors((current) => ({ ...current, [classId]: "" }));
    try {
      const response = await attendanceApi.getMyAttendanceDetails(classId);
      if (!response.success || !response.data) {
        throw new Error(response.message
          ? t(`backendMessages.${response.message}`, { defaultValue: response.message })
          : t("myAttendance.detailError", { defaultValue: "Không thể tải chi tiết điểm danh." }));
      }
      setDetails((current) => ({ ...current, [classId]: response.data! }));
    } catch (err) {
      setDetailErrors((current) => ({
        ...current,
        [classId]: err instanceof Error
          ? err.message
          : t("myAttendance.detailError", { defaultValue: "Không thể tải chi tiết điểm danh." }),
      }));
    } finally {
      setDetailLoadingId(null);
    }
  };

  const closeDetails = useCallback(() => setSelectedClassId(null), []);

  useEffect(() => {
    if (selectedClassId === null) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDetails();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDetails, selectedClassId]);

  const formatDate = (value?: string | null) => {
    if (!value) return t("myAttendance.noDate", { defaultValue: "Chưa có ngày" });
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(i18n.language === "en" ? "en-GB" : "vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  const sessionStatus = (status: number) => {
    if (status === -1) return {
      label: t("myAttendance.notMarked", { defaultValue: "Chưa điểm danh" }),
      className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
      icon: <Clock3 className="h-4 w-4" />,
    };
    if (status === 0) return {
      label: t("myAttendance.absent", { defaultValue: "Nghỉ học" }),
      className: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
      icon: <XCircle className="h-4 w-4" />,
    };
    if (status === 2) return {
      label: t("myAttendance.late", { defaultValue: "Đi muộn" }),
      className: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
      icon: <Clock3 className="h-4 w-4" />,
    };
    if (status === 3) return {
      label: t("myAttendance.excused", { defaultValue: "Nghỉ có phép" }),
      className: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
      icon: <ShieldCheck className="h-4 w-4" />,
    };
    return {
      label: t("myAttendance.present", { defaultValue: "Có mặt" }),
      className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
      icon: <CheckCircle2 className="h-4 w-4" />,
    };
  };

  const selectedClass = items.find((item) => item.classId === selectedClassId) ?? null;

  return (
    <div>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="relative p-6 sm:p-7">
            <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-brand-50 dark:bg-brand-500/5" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                  <CalendarCheck className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {t("myAttendance.title", { defaultValue: "Điểm danh của tôi" })}
                  </h1>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t("myAttendance.subtitle", { defaultValue: "Theo dõi số buổi đã tham gia trong các lớp đang học." })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <div className="h-4 w-24 rounded bg-gray-100 dark:bg-gray-800" />
                <div className="mt-3 h-6 w-2/3 rounded bg-gray-100 dark:bg-gray-800" />
                <div className="mt-8 h-16 rounded-xl bg-gray-100 dark:bg-gray-800" />
                <div className="mt-5 h-2 rounded-full bg-gray-100 dark:bg-gray-800" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-8 text-center dark:border-rose-500/20 dark:bg-rose-500/10">
            <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>
            <button type="button" onClick={loadAttendance} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-xs transition hover:bg-rose-50 dark:bg-gray-900 dark:text-rose-400 dark:hover:bg-gray-800">
              <RefreshCw className="h-4 w-4" />
              {t("myAttendance.retry", { defaultValue: "Thử lại" })}
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center dark:border-gray-800 dark:bg-gray-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 text-gray-400 dark:bg-gray-800"><BookOpen className="h-6 w-6" /></div>
            <h2 className="mt-4 font-bold text-gray-900 dark:text-white">{t("myAttendance.emptyTitle", { defaultValue: "Chưa có lớp đang học" })}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("myAttendance.emptyDescription", { defaultValue: "Các lớp đang học của bạn sẽ được hiển thị tại đây." })}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const styles = rateStyles(item.attendanceRate);
              return (
                <article key={item.classId} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="inline-flex rounded-md bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">{item.classCode || `#${item.classId}`}</span>
                      <h2 className="mt-3 truncate text-lg font-bold text-gray-900 dark:text-white">{item.className || t("myAttendance.class", { defaultValue: "Lớp học" })}</h2>
                    </div>
                    <GraduationCap className="h-6 w-6 shrink-0 text-gray-300 dark:text-gray-600" />
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-gray-500 dark:text-gray-400">
                    <p className="flex items-center gap-2 truncate"><BookOpen className="h-4 w-4 shrink-0" />{item.courseName || t("myAttendance.notUpdated", { defaultValue: "Chưa cập nhật" })}</p>
                    <p className="flex items-center gap-2 truncate"><UserRound className="h-4 w-4 shrink-0" />{item.teacherName || t("myAttendance.notUpdated", { defaultValue: "Chưa cập nhật" })}</p>
                  </div>
                  <div className="mt-5 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`h-5 w-5 ${styles.text}`} />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t("myAttendance.attended", { defaultValue: "Đã tham gia" })}</p>
                        <p className="font-bold text-gray-900 dark:text-white">
                          {item.attendedSessions}/{item.totalSessions}
                          <span className="ml-1 text-xs font-medium text-gray-400">{t("myAttendance.sessions", { defaultValue: "buổi" })}</span>
                        </p>
                      </div>
                    </div>
                    <span className={`rounded-lg px-2.5 py-1 text-sm font-extrabold ${styles.badge}`}>{item.attendanceRate}%</span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div className={`h-full rounded-full transition-all ${styles.bar}`} style={{ width: `${Math.min(100, Math.max(0, item.attendanceRate))}%` }} />
                  </div>
                  <button
                    type="button"
                    onClick={() => openDetails(item.classId)}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                    aria-haspopup="dialog"
                  >
                    <CalendarDays className="h-4 w-4" />
                    {t("myAttendance.viewDetails", { defaultValue: "Xem chi tiết từng buổi" })}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {selectedClass && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-950/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="attendance-detail-title"
          onMouseDown={closeDetails}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-800">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-brand-500">{selectedClass.classCode || `#${selectedClass.classId}`}</p>
                  <h2 id="attendance-detail-title" className="mt-1 truncate text-lg font-bold text-gray-900 dark:text-white">
                    {t("myAttendance.detailTitle", { defaultValue: "Chi tiết điểm danh" })} · {selectedClass.className}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{selectedClass.courseName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDetails}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                aria-label={t("myAttendance.close", { defaultValue: "Đóng" })}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-gray-100 bg-gray-50/70 px-6 py-4 dark:border-gray-800 dark:bg-gray-800/30">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-white px-4 py-3 dark:bg-gray-900">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t("myAttendance.totalSessions", { defaultValue: "Tổng số buổi học" })}</p>
                  <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{selectedClass.totalSessions}</p>
                </div>
                <div className="rounded-xl bg-white px-4 py-3 dark:bg-gray-900">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t("myAttendance.absentSessions", { defaultValue: "Vắng" })}</p>
                  <p className="mt-1 text-lg font-bold text-rose-600 dark:text-rose-400">{selectedClass.absentSessions}</p>
                </div>
                <div className="rounded-xl bg-white px-4 py-3 dark:bg-gray-900">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t("myAttendance.attended", { defaultValue: "Đã tham gia" })}</p>
                  <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">{selectedClass.attendedSessions}</p>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              {detailLoadingId === selectedClass.classId ? (
                <div className="flex min-h-48 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t("myAttendance.loadingDetails", { defaultValue: "Đang tải chi tiết..." })}
                </div>
              ) : detailErrors[selectedClass.classId] ? (
                <div className="rounded-xl bg-rose-50 p-6 text-center dark:bg-rose-500/10">
                  <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{detailErrors[selectedClass.classId]}</p>
                  <button type="button" onClick={() => openDetails(selectedClass.classId, true)} className="mt-3 text-sm font-bold text-rose-700 underline dark:text-rose-300">
                    {t("myAttendance.retry", { defaultValue: "Thử lại" })}
                  </button>
                </div>
              ) : (details[selectedClass.classId]?.length ?? 0) === 0 ? (
                <div className="flex min-h-48 flex-col items-center justify-center text-center">
                  <CalendarCheck className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{t("myAttendance.noSessions")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {details[selectedClass.classId].map((session) => {
                    const status = sessionStatus(session.status);
                    return (
                      <div key={session.scheduleId} className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                          <div>
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{formatDate(session.date)}</p>
                            <p className="mt-1 text-xs text-gray-400">{t("myAttendance.lesson")} {session.lessonNo || "–"}</p>
                          </div>
                          <span className={`inline-flex w-fit items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${status.className}`}>
                            {status.icon}{status.label}
                          </span>
                        </div>
                        {session.description && <p className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">{session.description}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ClipboardCheck, CheckCircle, FileText, X } from "lucide-react";
import { createPortal } from "react-dom";
import { attendanceApi, AttendanceReportDto } from "@/services/attendance.api";
import { authApi } from "@/services/auth.api";

interface ClassDetailAttendanceTabProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itemDetail: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function ClassDetailAttendanceTab({
  itemDetail,
  t,
  showToast,
}: ClassDetailAttendanceTabProps) {
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Local state to store attendance maps: Record<scheduleId, Record<studentId, { status: number; note: string }>>
  const [attendanceMap, setAttendanceMap] = useState<Record<number, Record<number, { status: number; note: string }>>>({});

  // Report Modal state
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportData, setReportData] = useState<AttendanceReportDto | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [role, setRole] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const r = authApi.getRole().toLowerCase();
    setRole(r);
    setIsAdmin(r === "admin");
    setCurrentUsername(localStorage.getItem("username") || "");
    setPermissions(authApi.getPermissions());
  }, []);

  const hasPermission = (perm: string) => {
    return isAdmin || permissions.includes(perm);
  };

  const isStudent = role === "student";

  const displayStudentClasses = useMemo(() => {
    const list = itemDetail?.studentClasses || [];
    if (isStudent) {
      return list.filter((sc: any) => sc.student?.code === currentUsername);
    }
    return list;
  }, [itemDetail?.studentClasses, isStudent, currentUsername]);

  const ATTENDANCE_STATUSES = useMemo(() => [
    { value: 1, label: t("class.present", { defaultValue: "Có mặt" }) },
    { value: 0, label: t("class.absent", { defaultValue: "Vắng" }) },
  ], [t]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Auto-select first schedule on load
  useEffect(() => {
    if (itemDetail?.schedules && itemDetail.schedules.length > 0 && selectedScheduleId === null) {
      const savedScheduleId = sessionStorage.getItem(`attendance_schedule_${itemDetail.id}`);
      if (savedScheduleId) {
        setSelectedScheduleId(Number(savedScheduleId));
      } else {
        setSelectedScheduleId(itemDetail.schedules[0].id);
      }
    }
  }, [itemDetail, selectedScheduleId]);

  // Persist selected schedule selection to sessionStorage to survive page reloads
  useEffect(() => {
    if (selectedScheduleId && itemDetail?.id) {
      sessionStorage.setItem(`attendance_schedule_${itemDetail.id}`, String(selectedScheduleId));
    }
  }, [selectedScheduleId, itemDetail?.id]);

  // Load attendance dynamically when session changes
  useEffect(() => {
    const scheduleId = selectedScheduleId;
    if (!scheduleId) return;

    let active = true;
    async function loadAttendance() {
      setIsLoadingAttendance(true);
      try {
        const res = await attendanceApi.getByScheduleId(scheduleId!);
        if (active && res.success && res.data) {
          const scheduleMap: Record<number, { status: number; note: string }> = {};
          res.data.forEach((item) => {
            if (item.studentId) {
              scheduleMap[item.studentId] = {
                status: item.id === 0 ? -1 : item.status,
                note: item.description || "",
              };
            }
          });
          setAttendanceMap(prev => ({
            ...prev,
            [scheduleId!]: scheduleMap,
          }));
        } else if (active) {
          const errorMsg = res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("class.loadError", { defaultValue: "Không thể tải danh sách điểm danh" });
          showToast(errorMsg, "error");
        }
      } catch (err) {
        console.error("Failed to load attendance", err);
        if (active) {
          showToast(t("class.connectionError", { defaultValue: "Không thể kết nối tới máy chủ để tải điểm danh" }), "error");
        }
      } finally {
        if (active) {
          setIsLoadingAttendance(false);
        }
      }
    }

    loadAttendance();
    return () => {
      active = false;
    };
  }, [selectedScheduleId, showToast, t]);

  // Load attendance report dynamically when modal opens
  useEffect(() => {
    if (!isReportOpen || !itemDetail?.id) return;

    let active = true;
    async function loadReport() {
      setIsLoadingReport(true);
      try {
        const res = await attendanceApi.getReportByClassId(itemDetail.id);
        if (active && res.success && res.data) {
          setReportData(res.data);
        } else if (active) {
          const errorMsg = res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("class.loadError", { defaultValue: "Không thể tải báo cáo điểm danh" });
          showToast(errorMsg, "error");
        }
      } catch (err) {
        console.error("Failed to load report", err);
        if (active) {
          showToast(t("class.connectionError", { defaultValue: "Không thể kết nối tới máy chủ để tải báo cáo" }), "error");
        }
      } finally {
        if (active) {
          setIsLoadingReport(false);
        }
      }
    }

    loadReport();
    return () => {
      active = false;
    };
  }, [isReportOpen, itemDetail?.id, showToast, t]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeSchedule = itemDetail?.schedules?.find((s: any) => s.id === selectedScheduleId);
  
  const currentScheduleAttendance = useMemo(() => {
    const scheduleId = selectedScheduleId;
    return scheduleId ? attendanceMap[scheduleId] || {} : {};
  }, [selectedScheduleId, attendanceMap]);

  // Status handlers
  const handleStatusChange = (studentId: number, status: number) => {
    const scheduleId = selectedScheduleId;
    if (!scheduleId) return;
    setAttendanceMap(prev => {
      const currentSch = prev[scheduleId] || {};
      return {
        ...prev,
        [scheduleId]: {
          ...currentSch,
          [studentId]: {
            ...currentSch[studentId],
            status,
          },
        },
      };
    });
  };

  // Bulk actions
  const handleMarkAll = (status: number) => {
    const scheduleId = selectedScheduleId;
    if (!scheduleId || !itemDetail?.studentClasses) return;
    setAttendanceMap(prev => {
      const currentSch = { ...(prev[scheduleId] || {}) };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      itemDetail.studentClasses.forEach((sc: any) => {
        if (sc.student?.id) {
          currentSch[sc.student.id] = {
            ...currentSch[sc.student.id],
            status,
          };
        }
      });
      return {
        ...prev,
        [scheduleId]: currentSch,
      };
    });
  };

  // Calculate session stats
  const stats = React.useMemo(() => {
    let total = 0;
    let present = 0;
    let absent = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object.values(currentScheduleAttendance).forEach((item: any) => {
      total++;
      if (item.status === 1) present++;
      else if (item.status === 0) absent++;
    });

    return { total, present, absent };
  }, [currentScheduleAttendance]);

  // Submit bulk save
  const handleSave = async () => {
    const scheduleId = selectedScheduleId;
    if (!scheduleId || !itemDetail?.studentClasses) return;

    const currentRoster = attendanceMap[scheduleId] || {};

    // Validate that all students have been explicitly checked (status !== -1)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasUnselected = itemDetail.studentClasses.some((sc: any) => {
      if (!sc.student?.id) return false;
      const entry = currentRoster[sc.student.id];
      return !entry || entry.status === -1;
    });

    if (hasUnselected) {
      showToast(t("class.validateAll", { defaultValue: "Vui lòng điểm danh đầy đủ cho tất cả học sinh trước khi lưu!" }), "error");
      return;
    }

    setIsSaving(true);
    // Map entries to the required bulk save format
    const payload = itemDetail.studentClasses
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((sc: any) => sc.student?.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((sc: any) => {
        const studentId = sc.student.id;
        const entry = currentRoster[studentId];
        return {
          studentId,
          status: entry.status,
          description: entry.note || null,
        };
      });

    try {
      const res = await attendanceApi.bulkSave({
        scheduleId,
        attendances: payload,
      });

      if (res.success) {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("class.saveSuccess", { defaultValue: "Lưu thông tin điểm danh thành công!" }), "success");
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("class.saveError", { defaultValue: "Lưu điểm danh thất bại" }), "error");
      }
    } catch (err) {
      console.error("Failed to save attendance", err);
      showToast(t("class.connectionError", { defaultValue: "Không thể kết nối tới máy chủ để lưu điểm danh" }), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const getScheduleStatusBadge = (status: number) => {
    switch (status) {
      case 0: // Scheduled
        return "bg-blue-50 text-blue-655 dark:bg-blue-900/10 dark:text-blue-400 border border-blue-200/50";
      case 1: // OnGoing
        return "bg-amber-50 text-amber-655 dark:bg-amber-900/10 dark:text-amber-400 border border-amber-200/50 animate-pulse";
      case 2: // Completed
        return "bg-emerald-50 text-emerald-655 dark:bg-emerald-900/10 dark:text-emerald-400 border border-emerald-200/50";
      case 3: // Cancelled
        return "bg-rose-50 text-rose-655 dark:bg-rose-900/10 dark:text-rose-400 border border-rose-200/50";
      default:
        return "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const getScheduleStatusText = (status: number) => {
    switch (status) {
      case 0: return t("class.schedule", { defaultValue: "Lịch học" });
      case 1: return t("class.statusActive", { defaultValue: "Đang diễn ra" });
      case 2: return t("class.statusCompleted", { defaultValue: "Hoàn thành" });
      case 3: return t("class.statusCancelled", { defaultValue: "Đã hủy" });
      default: return "";
    }
  };

  const getStatusReportBadge = (status: number) => {
    switch (status) {
      case 1:
        return (
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-655 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
            {t("class.present", { defaultValue: "Có mặt" })}
          </span>
        );
      case 0:
        return (
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-655 dark:bg-rose-500/10 dark:text-rose-455 border border-rose-100 dark:border-rose-900/30">
            {t("class.absent", { defaultValue: "Vắng" })}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-400 dark:bg-gray-800/40 dark:text-gray-500 border border-gray-100 dark:border-gray-800">
            -
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Selection Card */}
      <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-800 pb-3">
          <h3 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-brand-500" />
            <span>{t("class.attendanceTitle", { defaultValue: "Điểm danh buổi học" })}</span>
          </h3>
          <button
            type="button"
            onClick={() => setIsReportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 hover:bg-brand-100 dark:hover:bg-brand-500/20 border border-brand-200 dark:border-brand-500/30 rounded-lg transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            {t("class.attendanceReportTitle", { defaultValue: "Attendance Report" })}
          </button>
        </div>

        {!itemDetail?.schedules || itemDetail.schedules.length === 0 ? (
          <p className="text-xs text-gray-450 text-center py-6 italic border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
            {t("class.noSchedules", { defaultValue: "Không tìm thấy lịch học để thực hiện điểm danh." })}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
            <div className="md:col-span-4 space-y-1.5">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400">
                {t("class.selectSchedule", { defaultValue: "Chọn buổi học cần điểm danh" })}
              </label>
              <select
                value={selectedScheduleId || ""}
                onChange={(e) => setSelectedScheduleId(Number(e.target.value))}
                className="w-full h-11 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-700 dark:text-white cursor-pointer font-medium focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {itemDetail.schedules.map((s: any) => (
                  <option key={s.id} value={s.id} className="dark:bg-gray-900">
                    {t("class.lesson", { defaultValue: "Buổi" })} {s.lessonNo} ({s.scheduleDate ? new Date(s.scheduleDate).toLocaleDateString(t("locale", { defaultValue: "vi-VN" })) : "-"})
                  </option>
                ))}
              </select>
            </div>

            {activeSchedule && (
              <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-gray-50/50 dark:bg-gray-955/30 p-3 rounded-xl border border-gray-150/80 dark:border-gray-800/80">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-gray-450 dark:text-gray-500">{t("class.status", { defaultValue: "Trạng thái" })}:</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${getScheduleStatusBadge(activeSchedule.status)}`}>
                    {getScheduleStatusText(activeSchedule.status)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs min-w-0">
                  <span className="font-bold text-gray-455 dark:text-gray-500 shrink-0">{t("class.room", { defaultValue: "Phòng học" })}:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 truncate" title={activeSchedule.roomName || ""}>
                    {activeSchedule.roomName || "-"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs min-w-0">
                  <span className="font-bold text-gray-455 dark:text-gray-500 shrink-0">{t("class.slot", { defaultValue: "Ca học / Giờ" })}:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 truncate" title={activeSchedule.startTime || ""}>
                    {activeSchedule.startTime} - {activeSchedule.endTime}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs min-w-0">
                  <span className="font-bold text-gray-455 dark:text-gray-500 shrink-0">{t("class.teacher", { defaultValue: "Giáo viên" })}:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 truncate" title={activeSchedule.teacherName || ""}>
                    {activeSchedule.teacherName || "-"}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {activeSchedule && (
        <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-5">
          {/* Summary Roster Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-50 dark:border-gray-850 pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-105 dark:bg-gray-800 text-gray-655 dark:text-gray-300 rounded-lg text-xs font-semibold">
                {t("class.totalStudents", { defaultValue: "Sĩ số" })}: {stats.total}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-semibold">
                {t("class.present", { defaultValue: "Có mặt" })}: {stats.present}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-455 rounded-lg text-xs font-semibold">
                {t("class.absent", { defaultValue: "Vắng" })}: {stats.absent}
              </span>
            </div>

            {hasPermission("Attendance.SaveAttendance") && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleMarkAll(1)}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-955/20 dark:text-emerald-400 hover:bg-emerald-100/50 dark:hover:bg-emerald-955/40 rounded-lg transition-colors border border-emerald-100 dark:border-emerald-900/30 cursor-pointer"
                >
                  {t("class.allPresent", { defaultValue: "Tất cả Có mặt" })}
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAll(0)}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-955/20 dark:text-rose-400 hover:bg-rose-100/50 dark:hover:bg-rose-955/40 rounded-lg transition-colors border border-rose-100 dark:border-rose-900/30 cursor-pointer"
                >
                  {t("class.allAbsent", { defaultValue: "Tất cả Vắng" })}
                </button>
              </div>
            )}
          </div>

          {/* Roster Table */}
          {isLoadingAttendance ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-500 text-sm">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-2"></div>
              {t("class.loadingAttendance", { defaultValue: "Đang tải danh sách điểm danh..." })}
            </div>
          ) : !displayStudentClasses || displayStudentClasses.length === 0 ? (
            <p className="text-xs text-gray-450 text-center py-10 italic border border-dashed border-gray-250 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-955/20">
              {t("class.noStudents", { defaultValue: "Không có học sinh trong danh sách lớp." })}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-455 dark:text-gray-400 font-semibold bg-gray-50/50 dark:bg-gray-800/40">
                      <th className="px-4 py-3 w-[8%] text-xs font-bold uppercase tracking-wider">#</th>
                      <th className="px-4 py-3 w-[22%] text-xs font-bold uppercase tracking-wider">{t("class.studentCode", { defaultValue: "Mã học sinh" })}</th>
                      <th className="px-4 py-3 w-[35%] text-xs font-bold uppercase tracking-wider">{t("class.studentName", { defaultValue: "Học sinh" })}</th>
                      <th className="px-4 py-3 w-[35%] text-center text-xs font-bold uppercase tracking-wider">{t("class.attendance", { defaultValue: "Điểm danh" })}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-105 dark:divide-gray-800">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {displayStudentClasses.map((sc: any, idx: number) => {
                      const studentId = sc.student?.id;
                      const attendance = currentScheduleAttendance[studentId] || { status: -1, note: "" };

                      return (
                        <tr key={sc.id || sc.studentId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-gray-500">{idx + 1}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{sc.student?.code || "-"}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xs shrink-0">
                                {sc.student?.name ? sc.student.name.charAt(0).toUpperCase() : "?"}
                              </div>
                              <span className="font-semibold text-gray-900 dark:text-white truncate block max-w-[150px]" title={sc.student?.name}>
                                {sc.student?.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1.5">
                              {!hasPermission("Attendance.SaveAttendance") ? (
                                attendance.status === 1 ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-450 border border-emerald-200/50">
                                    {t("class.present", { defaultValue: "Có mặt" })}
                                  </span>
                                ) : attendance.status === 0 ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-450 border border-rose-200/50">
                                    {t("class.absent", { defaultValue: "Vắng" })}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-gray-55 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                    {t("class.unmarked", { defaultValue: "Chưa điểm danh" })}
                                  </span>
                                )
                              ) : (
                                ATTENDANCE_STATUSES.map((statusOpt) => {
                                  const isChecked = attendance.status === statusOpt.value;
                                  return (
                                    <button
                                      key={statusOpt.value}
                                      type="button"
                                      onClick={() => handleStatusChange(studentId, statusOpt.value)}
                                      className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all select-none cursor-pointer ${
                                        isChecked
                                          ? statusOpt.value === 1
                                            ? "bg-emerald-500 text-white border-emerald-500 shadow-xs"
                                            : "bg-rose-500 text-white border-rose-500 shadow-xs"
                                          : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-750 hover:bg-gray-50 dark:hover:bg-gray-800"
                                      }`}
                                    >
                                      {statusOpt.label}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Submit panel */}
              {hasPermission("Attendance.SaveAttendance") && (
                <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-theme-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    {t("class.btnSave", { defaultValue: "Lưu điểm danh" })}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Attendance Report Modal */}
      {isReportOpen && mounted && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-fadeIn">
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-2xl max-w-[90vw] w-full max-h-[85vh] flex flex-col overflow-hidden animate-zoomIn">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
              <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-brand-500" />
                <span>{t("class.attendanceReportTitle", { defaultValue: "Bảng tổng hợp điểm danh" })} - {itemDetail?.name || ""}</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsReportOpen(false)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-655 dark:hover:text-gray-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6">
              {isLoadingReport ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500 text-sm">
                  <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  {t("class.loadingReport", { defaultValue: "Đang tải báo cáo điểm danh..." })}
                </div>
              ) : !reportData || reportData.sessions.length === 0 ? (
                <p className="text-xs text-gray-450 text-center py-10 italic">
                  {t("class.noReportData", { defaultValue: "Không tìm thấy dữ liệu điểm danh nào của lớp học này." })}
                </p>
              ) : (
                <div className="overflow-x-auto border border-gray-150 dark:border-gray-800 rounded-xl bg-gray-50/20">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-205 dark:border-gray-800 text-gray-455 dark:text-gray-400 font-semibold bg-gray-50/50 dark:bg-gray-800/40 sticky top-0 z-10">
                        <th className="px-3 py-3.5 w-10 text-center uppercase tracking-wider">#</th>
                        <th className="px-3 py-3.5 w-24 uppercase tracking-wider">{t("class.studentCode", { defaultValue: "Mã học sinh" })}</th>
                        <th className="px-3 py-3.5 w-44 uppercase tracking-wider">{t("class.studentName", { defaultValue: "Học sinh" })}</th>
                        {reportData.sessions.map((s) => (
                          <th key={s.scheduleId} className="px-2 py-3.5 text-center min-w-[85px] uppercase tracking-wider" title={s.date ? new Date(s.date).toLocaleDateString(t("locale", { defaultValue: "vi-VN" })) : ""}>
                            {t("class.lessonShort", { defaultValue: "B." })} {s.lessonNo}
                            {s.date && (
                              <span className="block text-[8px] font-normal text-gray-400 dark:text-gray-500 mt-0.5">
                                {new Date(s.date).toLocaleDateString(t("locale", { defaultValue: "vi-VN" }), { day: "2-digit", month: "2-digit" })}
                              </span>
                            )}
                          </th>
                        ))}
                        <th className="px-3 py-3.5 w-24 text-center uppercase tracking-wider">{t("class.attendanceRate", { defaultValue: "Tỉ lệ hiện diện" })}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                      {reportData.students.map((st, idx) => {
                        const presentCount = st.attendances.filter((att: any) => att.status === 1).length;
                        const totalSessions = reportData.sessions.length;
                        const percentage = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;
                        return (
                          <tr key={st.studentId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                            <td className="px-3 py-3 text-center font-medium text-gray-500">{idx + 1}</td>
                            <td className="px-3 py-3 font-semibold text-gray-900 dark:text-white">{st.studentCode || "-"}</td>
                            <td className="px-3 py-3 font-semibold text-gray-900 dark:text-white">
                              <span className="truncate block max-w-[150px]" title={st.studentName || ""}>
                                {st.studentName}
                              </span>
                            </td>
                            {st.attendances.map((att) => (
                              <td key={att.scheduleId} className="px-2 py-3 text-center">
                                {getStatusReportBadge(att.status)}
                              </td>
                            ))}
                            <td className="px-3 py-3 text-center font-bold text-gray-805 dark:text-gray-200">
                              {percentage}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex justify-end bg-gray-50/50 dark:bg-gray-900/50">
              <button
                type="button"
                onClick={() => setIsReportOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-750 transition-colors cursor-pointer"
              >
                {t("class.btnClose", { defaultValue: "Đóng" })}
              </button>
            </div>
            
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

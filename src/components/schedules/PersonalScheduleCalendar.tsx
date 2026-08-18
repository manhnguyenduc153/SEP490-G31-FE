"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventClickArg } from "@fullcalendar/core";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import { classApi, ClassScheduleItem } from "@/services/class.api";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ── Fixed time slots (must match backend FixedTimeSlot.All) ──────────────────
const FIXED_SLOTS = [
  { index: 0, label: "Ca 1", time: "07:30 - 09:30", start: "07:30", end: "09:30" },
  { index: 1, label: "Ca 2", time: "10:00 - 12:00", start: "10:00", end: "12:00" },
  { index: 2, label: "Ca 3", time: "13:30 - 15:30", start: "13:30", end: "15:30" },
  { index: 3, label: "Ca 4", time: "16:00 - 18:00", start: "16:00", end: "18:00" },
  { index: 4, label: "Ca 5", time: "18:30 - 20:30", start: "18:30", end: "20:30" },
];

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const SLOT_COLORS = [
  "bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-950/30 dark:border-sky-800 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50",
  "bg-violet-50 border-violet-200 text-violet-800 dark:bg-violet-950/30 dark:border-violet-800 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50",
  "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50",
  "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50",
  "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50",
];

// ── Attendance Status Helper ───────────────────────────────────────────────────
export const getAttendanceStatus = (
  s: number | null | undefined,
  t: (k: string, opt?: Record<string, string>) => string
) => {
  switch (s) {
    case 1:
      return {
        text: t("attendance.statusPresent", { defaultValue: "Có mặt" }),
        badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        dotClass: "bg-emerald-500",
        labelShort: t("attendance.shortPresent", { defaultValue: "Có mặt" }),
      };
    case 0:
      return {
        text: t("attendance.statusAbsent", { defaultValue: "Vắng mặt" }),
        badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800",
        dotClass: "bg-rose-500",
        labelShort: t("attendance.shortAbsent", { defaultValue: "Vắng mặt" }),
      };
    case 2:
      return {
        text: t("attendance.statusLate", { defaultValue: "Đi muộn" }),
        badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        dotClass: "bg-amber-500",
        labelShort: t("attendance.shortLate", { defaultValue: "Đi muộn" }),
      };
    case 3:
      return {
        text: t("attendance.statusExcused", { defaultValue: "Có phép" }),
        badgeClass: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300 border-sky-200 dark:border-sky-800",
        dotClass: "bg-sky-500",
        labelShort: t("attendance.shortExcused", { defaultValue: "Có phép" }),
      };
    default:
      return {
        text: t("attendance.statusNotYet", { defaultValue: "Chưa điểm danh" }),
        badgeClass: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700",
        dotClass: "bg-gray-400",
        labelShort: t("attendance.shortNotYet", { defaultValue: "Chưa điểm danh" }),
      };
  }
};

const getStatus = (s: number, t: (k: string, opt?: Record<string, string>) => string) => {
  const configs: Record<number, { text: string; color: string }> = {
    0: { text: t("schedules.statusNotStarted", { defaultValue: "Chưa diễn ra" }), color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
    1: { text: t("schedules.statusActive", { defaultValue: "Đang học" }), color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
    2: { text: t("schedules.statusCompleted", { defaultValue: "Đã hoàn thành" }), color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800" },
    3: { text: t("schedules.statusCancelled", { defaultValue: "Đã hủy" }), color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800" },
  };
  return configs[s] ?? { text: t("schedules.statusUnknown", { defaultValue: "Không xác định" }), color: "bg-gray-100 text-gray-800 border-gray-200" };
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function toISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function formatWeekLabel(start: Date): string {
  const end = addDays(start, 6);
  return `${start.getDate()}/${start.getMonth() + 1} – ${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
}
function resolveSlotIndex(startTime: string): number {
  const idx = FIXED_SLOTS.findIndex((s) => s.start === startTime);
  return idx >= 0 ? idx : -1;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface ScheduleEvent {
  id: string;
  classCode: string;
  className: string;
  lessonNo: number;
  roomName: string;
  teacherName: string;
  teacherAvatar: string | null;
  startTime: string;
  endTime: string;
  status: number;
  note: string | null;
  scheduleDate: string;
  slotIndex: number;
  attendanceStatus?: number | null;
}

interface PersonalScheduleCalendarProps {
  type: "teacher" | "student";
  studentId?: number;
}

// ── Week grid ─────────────────────────────────────────────────────────────────
function WeekGrid({
  events,
  weekStart,
  onEventClick,
  type,
}: {
  events: ScheduleEvent[];
  weekStart: Date;
  onEventClick: (ev: ScheduleEvent) => void;
  type: "teacher" | "student";
}) {
  const { t } = useTranslation();
  const lookup: Record<string, Record<number, ScheduleEvent[]>> = {};
  for (const ev of events) {
    if (!lookup[ev.scheduleDate]) lookup[ev.scheduleDate] = {};
    if (!lookup[ev.scheduleDate][ev.slotIndex]) lookup[ev.scheduleDate][ev.slotIndex] = [];
    lookup[ev.scheduleDate][ev.slotIndex].push(ev);
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return { date: d, iso: toISO(d), label: `${d.getDate()}/${d.getMonth() + 1}`, dayLabel: t(`common.day${d.getDay()}`, { defaultValue: DAY_LABELS[d.getDay()] }) };
  });

  const todayISO = toISO(new Date());

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-28 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 px-3 py-2.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
              {t("schedules.slotDay", { defaultValue: "Ca / Ngày" })}
            </th>
            {days.map((d) => (
              <th
                key={d.iso}
                className={`border border-gray-200 dark:border-gray-700 px-2 py-2.5 text-center text-xs font-bold uppercase tracking-wider
                  ${d.iso === todayISO ? "bg-brand-500/10 text-brand-600 dark:text-brand-400" : "bg-gray-50 dark:bg-gray-850 text-gray-500 dark:text-gray-400"}`}
              >
                <span className="block">{d.dayLabel}</span>
                <span className={`mt-0.5 block text-[11px] font-semibold ${d.iso === todayISO ? "text-brand-600 dark:text-brand-400" : "text-gray-700 dark:text-gray-300"}`}>
                  {d.label}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FIXED_SLOTS.map((slot) => (
            <tr key={slot.index}>
              <td className="border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-850/60 px-3 py-5 align-top" style={{ height: "120px" }}>
                <p className="font-bold text-xs text-gray-700 dark:text-gray-300">
                  {t("schedules.slotNumber", { index: slot.index + 1, defaultValue: slot.label })}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{slot.time}</p>
              </td>
              {days.map((d) => {
                const cellEvents = lookup[d.iso]?.[slot.index] ?? [];
                return (
                  <td
                    key={d.iso}
                    style={{ height: "120px" }}
                    className={`border border-gray-200 dark:border-gray-700 p-1.5 align-top min-w-[90px]
                      ${d.iso === todayISO ? "bg-brand-500/5 dark:bg-brand-950/10" : "bg-white dark:bg-gray-900"}`}
                  >
                    <div className="flex flex-col gap-1.5 h-full">
                      {cellEvents.map((ev) => {
                        const attInfo = getAttendanceStatus(ev.attendanceStatus, t);
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => onEventClick(ev)}
                            className={`w-full text-left rounded-xl border p-2 text-[11px] font-semibold leading-tight transition-all duration-150 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-px ${SLOT_COLORS[slot.index]}`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="block truncate font-bold">{ev.classCode}</span>
                              {type === "student" && (
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${attInfo.badgeClass}`}>
                                  {attInfo.labelShort}
                                </span>
                              )}
                            </div>
                            <span className="block truncate text-[10px] opacity-70 font-normal">{ev.className}</span>
                            <div className="mt-1 flex items-center justify-between text-[9px] text-gray-500 dark:text-gray-400 font-medium">
                              <span>{t("schedules.lessonShort", { lessonNo: ev.lessonNo, defaultValue: `Buổi ${ev.lessonNo}` })}</span>
                              <span className="truncate max-w-[55%]">{ev.roomName}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PersonalScheduleCalendar({ type, studentId }: PersonalScheduleCalendarProps) {
  const { t } = useTranslation();
  const { isOpen, openModal, closeModal } = useModal();
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"week" | "month">("week");
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = type === "teacher" 
          ? await classApi.getTeacherSchedules() 
          : (studentId ? await classApi.getChildSchedules(studentId) : await classApi.getStudentSchedules());
        if (res.success && res.data) {
          setEvents(
            (res.data as ClassScheduleItem[])
              .map((s): ScheduleEvent | null => {
                const datePart = s.scheduleDate ? s.scheduleDate.split("T")[0] : "";
                const st = s.startTime || "";
                const slotIdx = resolveSlotIndex(st);
                if (slotIdx < 0) return null;
                return {
                  id: String(s.id),
                  classCode: s.classCode || "N/A",
                  className: s.className || "N/A",
                  lessonNo: s.lessonNo || 0,
                  roomName: s.roomName || "N/A",
                  teacherName: s.teacherName || "Chưa phân công",
                  teacherAvatar: s.teacherAvatar || null,
                  startTime: st,
                  endTime: s.endTime || "",
                  status: s.status,
                  note: s.note || null,
                  scheduleDate: datePart,
                  slotIndex: slotIdx,
                  attendanceStatus: s.attendanceStatus ?? null,
                };
              })
              .filter(Boolean) as ScheduleEvent[]
          );
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [type, studentId]);

  const handleEventClick = useCallback((ev: ScheduleEvent) => {
    setSelectedEvent(ev);
    openModal();
  }, [openModal]);

  const fcEvents = events.map((ev) => ({
    id: ev.id,
    title: ev.classCode,
    start: `${ev.scheduleDate}T${ev.startTime}:00`,
    end: `${ev.scheduleDate}T${ev.endTime}:00`,
    extendedProps: ev,
  }));

  const renderMonthEvent = (info: { event: { extendedProps: Record<string, unknown> } }) => {
    const ev = info.event.extendedProps as unknown as ScheduleEvent;
    const attInfo = getAttendanceStatus(ev.attendanceStatus, t);
    return (
      <div className={`rounded px-1.5 py-0.5 text-[10px] font-bold border truncate cursor-pointer transition-all duration-150 flex items-center justify-between gap-1 ${SLOT_COLORS[ev.slotIndex] ?? SLOT_COLORS[0]}`}>
        <span className="truncate">{ev.classCode}</span>
        {type === "student" && (
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${attInfo.dotClass}`} title={attInfo.text} />
        )}
      </div>
    );
  };

  const handleFcEventClick = (clickInfo: EventClickArg) => {
    handleEventClick(clickInfo.event.extendedProps as unknown as ScheduleEvent);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-700">
              {view === "week" ? (
                <>
                  <button type="button" onClick={() => setWeekStart((w) => addDays(w, -7))}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      {t("schedules.weekPrefix", { defaultValue: "Tuần: " })}
                      {formatWeekLabel(weekStart)}
                    </span>
                    <button type="button" onClick={() => setWeekStart(getWeekStart(new Date()))}
                      className="px-3 py-1 text-xs font-semibold rounded-lg border border-brand-300 text-brand-600 dark:text-brand-400 dark:border-brand-700 hover:bg-brand-50 dark:hover:bg-brand-950/20 transition-colors">
                      {t("schedules.today", { defaultValue: "Hôm nay" })}
                    </button>
                  </div>
                  <button type="button" onClick={() => setWeekStart((w) => addDays(w, 7))}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{t("schedules.viewMonthly", { defaultValue: "Xem theo tháng" })}</span>
              )}

              {/* View toggle */}
              <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-850 ml-auto">
                <button type="button" onClick={() => setView("week")}
                  className={`px-4 py-2 text-sm font-semibold transition-colors ${view === "week" ? "bg-brand-500 text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
                  {t("schedules.week", { defaultValue: "Tuần" })}
                </button>
                <button type="button" onClick={() => setView("month")}
                  className={`px-4 py-2 text-sm font-semibold transition-colors ${view === "month" ? "bg-brand-500 text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
                  {t("schedules.month", { defaultValue: "Tháng" })}
                </button>
              </div>
            </div>

            {view === "week" ? (
              <>
                {/* Slot legend */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                  <div className="flex flex-wrap gap-2">
                    {FIXED_SLOTS.map((s) => (
                      <span key={s.index} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${SLOT_COLORS[s.index]}`}>
                        {t("schedules.slotNumber", { index: s.index + 1, defaultValue: s.label })} · {s.time}
                      </span>
                    ))}
                  </div>

                  {type === "student" && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-semibold text-gray-600 dark:text-gray-300">{t("attendance.legendLabel", { defaultValue: "Điểm danh:" })}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {t("attendance.statusPresent", { defaultValue: "Có mặt" })}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> {t("attendance.statusAbsent", { defaultValue: "Vắng mặt" })}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> {t("attendance.statusLate", { defaultValue: "Đi muộn" })}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/20 dark:text-sky-300 dark:border-sky-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span> {t("attendance.statusExcused", { defaultValue: "Có phép" })}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <WeekGrid events={events} weekStart={weekStart} onEventClick={handleEventClick} type={type} />
                </div>
              </>
            ) : (
              <div className="p-5 schedules-calendar-main">
                <FullCalendar
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  locale="vi"
                  buttonText={{ today: t("schedules.today", { defaultValue: "Hôm nay" }) }}
                  headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
                  events={fcEvents}
                  selectable={false}
                  eventClick={handleFcEventClick}
                  eventContent={renderMonthEvent}
                  height="auto"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      <Modal isOpen={isOpen} onClose={closeModal} showCloseButton={false} className="max-w-[500px] p-6 lg:p-8">
        {selectedEvent && (
          <div className="flex flex-col">
            <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
              <div className="flex items-center justify-between gap-3">
                <h5 className="font-bold text-gray-900 dark:text-white text-lg sm:text-xl">
                  {t("schedules.sessionTitle", { lessonNo: selectedEvent.lessonNo, defaultValue: `Chi Tiết Buổi Học ${selectedEvent.lessonNo}` })}
                </h5>
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatus(selectedEvent.status, t).color}`}>
                  {getStatus(selectedEvent.status, t).text}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t("schedules.classLabel", { defaultValue: "Lớp" })}: <strong className="text-gray-700 dark:text-gray-200">{selectedEvent.classCode} – {selectedEvent.className}</strong>
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {[
                { icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", label: t("schedules.dateLabel", { defaultValue: "Ngày diễn ra" }), value: selectedEvent.scheduleDate },
                { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", label: t("schedules.timeLabel", { defaultValue: "Khung giờ" }), value: `${t("schedules.slotNumber", { index: selectedEvent.slotIndex + 1, defaultValue: FIXED_SLOTS[selectedEvent.slotIndex]?.label })} · ${selectedEvent.startTime} – ${selectedEvent.endTime}` },
                { icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4", label: t("schedules.roomLabel", { defaultValue: "Phòng học" }), value: selectedEvent.roomName },
                { icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", label: t("schedules.teacherLabel", { defaultValue: "Giáo viên giảng dạy" }), value: selectedEvent.teacherName },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-start gap-3.5">
                  <div className="mt-0.5 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                    </svg>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 font-semibold uppercase">{label}</span>
                    <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{value}</span>
                  </div>
                </div>
              ))}

              {type === "student" && (
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 font-semibold uppercase">{t("schedules.attendanceStatusLabel", { defaultValue: "Trạng thái điểm danh" })}</span>
                    <span className={`inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${getAttendanceStatus(selectedEvent.attendanceStatus, t).badgeClass}`}>
                      <span className={`w-2 h-2 rounded-full ${getAttendanceStatus(selectedEvent.attendanceStatus, t).dotClass}`}></span>
                      {getAttendanceStatus(selectedEvent.attendanceStatus, t).text}
                    </span>
                  </div>
                </div>
              )}

              {selectedEvent.note && (
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <span className="block text-xs text-gray-400 font-semibold uppercase">{t("schedules.noteLabel", { defaultValue: "Ghi chú" })}</span>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 whitespace-pre-wrap bg-gray-50 dark:bg-gray-850 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                      {selectedEvent.note}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button onClick={closeModal} type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-850 dark:border-gray-700 dark:hover:bg-gray-750 transition-colors">
                {t("schedules.btnClose", { defaultValue: "Đóng" })}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventClickArg } from "@fullcalendar/core";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import { classApi, ClassItem, ClassScheduleItem, ClassSaveDto, ScheduleVersionListItem, ScheduleReliabilityReport } from "@/services/class.api";
import ScheduleReliabilityCard from "./ScheduleReliabilityCard";
import { semesterApi, SemesterItem } from "@/services/semester.api";
import { ChevronLeft, ChevronRight, CalendarClock, Save, X, Loader2, AlertTriangle, Cpu, Check, AlertCircle, Edit, DoorOpen, RotateCcw, History, Trash2, Eye, Lock, GitCompare, Undo2 } from "lucide-react";
import { roomApi, RoomItem } from "@/services/room.api";
import { teacherApi } from "@/services/teacher.api";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useTranslation } from "react-i18next";
import { commonApi } from "@/services/common.api";

// ── Fixed time slots (must stay in sync with backend FixedTimeSlot.All) ──────
const FIXED_SLOTS = [
  { index: 0, label: "Ca 1", time: "07:30 - 09:30", start: "07:30", end: "09:30" },
  { index: 1, label: "Ca 2", time: "10:00 - 12:00", start: "10:00", end: "12:00" },
  { index: 2, label: "Ca 3", time: "13:30 - 15:30", start: "13:30", end: "15:30" },
  { index: 3, label: "Ca 4", time: "16:00 - 18:00", start: "16:00", end: "18:00" },
  { index: 4, label: "Ca 5", time: "18:30 - 20:30", start: "18:30", end: "20:30" },
];

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

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

// ── Types ─────────────────────────────────────────────────────────────────────
interface ScheduleEvent {
  id: string;
  classId?: number | null;
  classCode: string;
  className: string;
  lessonNo: number;
  roomName: string;
  roomId?: number | null;
  teacherId?: number | null;
  teacherName: string;
  teacherAvatar: string | null;
  startTime: string;
  endTime: string;
  status: number;
  note: string | null;
  scheduleDate: string;
  slotIndex: number;
  isDraft?: boolean;
  classStatus?: number | null;
  semesterId?: number | null;
  courseId?: number | null;
  studentCount?: number | null;
  classType?: number | null;
  /** Set only in the version-preview diff overlay: how this occurrence compares to the current live schedule. */
  diffStatus?: "added" | "removed";
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function isPastSlot(scheduleDate: string, endTime?: string): boolean {
  if (!scheduleDate) return false;
  const now = new Date();
  const dateStr = scheduleDate.split("T")[0];
  const [year, month, day] = dateStr.split("-").map(Number);
  let slotEndHours = 23;
  let slotEndMinutes = 59;
  if (endTime && endTime.includes(":")) {
    const [h, m] = endTime.split(":").map(Number);
    slotEndHours = h;
    slotEndMinutes = m;
  }
  const slotEndTime = new Date(year, month - 1, day, slotEndHours, slotEndMinutes, 0);
  return slotEndTime < now;
}

function resolveSlotIndex(startTime: string): number {
  const idx = FIXED_SLOTS.findIndex((s) => s.start === startTime);
  return idx >= 0 ? idx : -1;
}

function mapApiItem(s: ClassScheduleItem, fallbackClass?: ClassItem, isDraft = false): ScheduleEvent | null {
  const datePart = s.scheduleDate ? s.scheduleDate.split("T")[0] : "";
  const st = s.startTime || "";
  const slotIdx = resolveSlotIndex(st);
  if (slotIdx < 0) return null;
  return {
    id: isDraft ? `draft-${s.classId ?? 0}-${s.lessonNo}` : String(s.id),
    classId: s.classId ?? fallbackClass?.id ?? null,
    classCode: s.classCode || fallbackClass?.code || "N/A",
    className: s.className || fallbackClass?.name || "N/A",
    lessonNo: s.lessonNo || 0,
    roomName: s.roomName || "N/A",
    roomId: s.roomId ?? null,
    teacherId: s.teacherId ?? fallbackClass?.teacherId ?? null,
    teacherName: s.teacherName || fallbackClass?.teacherName || "Chưa phân công",
    teacherAvatar: s.teacherAvatar || fallbackClass?.teacherAvatar || null,
    startTime: st,
    endTime: s.endTime || "",
    status: s.status,
    note: s.note || null,
    scheduleDate: datePart,
    slotIndex: slotIdx,
    isDraft,
    classStatus: s.classStatus !== undefined ? s.classStatus : (fallbackClass?.status ?? 0),
    semesterId: fallbackClass?.semesterId || null,
    courseId: fallbackClass?.courseId || null,
    studentCount: fallbackClass?.studentCount ?? null,
    classType: fallbackClass?.type ?? null,
  };
}

function mapDraftClass(cls: ClassItem): ScheduleEvent[] {
  if (!cls.schedules) return [];
  return cls.schedules
    .map((s) => {
      const datePart = s.scheduleDate ? s.scheduleDate.split("T")[0] : "";
      const st = s.startTime || "";
      const slotIdx = resolveSlotIndex(st);
      if (slotIdx < 0 || !datePart) return null;
      return {
        id: `draft-${cls.code}-${s.lessonNo}`,
        classId: cls.id,
        classCode: cls.code,
        className: cls.name,
        lessonNo: s.lessonNo || 0,
        roomName: s.roomName || "—",
        roomId: s.roomId ?? null,
        teacherId: s.teacherId ?? null,
        teacherName: cls.teacherName || "—",
        teacherAvatar: cls.teacherAvatar || null,
        startTime: st,
        endTime: s.endTime || "",
        status: 0,
        note: null,
        scheduleDate: datePart,
        slotIndex: slotIdx,
        isDraft: true,
        classStatus: 0,
        semesterId: cls.semesterId || null,
        courseId: cls.courseId || null,
        studentCount: cls.studentCount ?? null,
        classType: cls.type ?? null,
      } as ScheduleEvent;
    })
    .filter(Boolean) as ScheduleEvent[];
}

/**
 * Collapses events spanning many real weeks (e.g. a whole semester) down to a single
 * representative week, keyed by (day-of-week, slot, class) so recurring duplicates merge
 * into one cell. Used for weekly-pattern previews where actual calendar dates don't matter.
 */
function buildWeeklyPatternEvents(events: ScheduleEvent[], weekStart: Date): ScheduleEvent[] {
  const seen = new Set<string>();
  const result: ScheduleEvent[] = [];
  for (const ev of events) {
    const dayOfWeek = new Date(`${ev.scheduleDate}T00:00:00`).getDay();
    const key = `${dayOfWeek}-${ev.slotIndex}-${ev.classCode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday(1) -> 0 ... Sunday(0) -> 6
    result.push({ ...ev, id: `weekly-${key}`, scheduleDate: toISO(addDays(weekStart, offset)) });
  }
  return result;
}

/**
 * Merges the current live weekly schedule with a candidate version's weekly schedule into
 * one event list tagged with diffStatus, so both can be rendered stacked in the same WeekGrid:
 * "added" = would appear if rolled back, "removed" = would disappear if rolled back, untagged = unchanged.
 */
function buildScheduleDiffEvents(currentEvents: ScheduleEvent[], candidateEvents: ScheduleEvent[], weekStart: Date): ScheduleEvent[] {
  const currentWeekly = buildWeeklyPatternEvents(currentEvents, weekStart);
  const candidateWeekly = buildWeeklyPatternEvents(candidateEvents, weekStart);
  const keyOf = (ev: ScheduleEvent) => `${ev.scheduleDate}-${ev.slotIndex}-${ev.classCode}`;
  const currentKeys = new Set(currentWeekly.map(keyOf));
  const candidateKeys = new Set(candidateWeekly.map(keyOf));

  const result: ScheduleEvent[] = candidateWeekly.map((ev) => ({
    ...ev,
    diffStatus: currentKeys.has(keyOf(ev)) ? undefined : "added",
  }));

  currentWeekly.forEach((ev) => {
    if (!candidateKeys.has(keyOf(ev))) {
      result.push({ ...ev, id: `removed-${ev.id}`, diffStatus: "removed" });
    }
  });

  return result;
}

function getStatus(s: number, t: any) {
  const configs: Record<number, { text: string; color: string; dot: string }> = {
    0: { text: t("schedules.statusNotStarted", { defaultValue: "Chưa học" }), color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800", dot: "bg-blue-400" },
    1: { text: t("schedules.statusActive", { defaultValue: "Đang học" }), color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800", dot: "bg-amber-400" },
    2: { text: t("schedules.statusCompleted", { defaultValue: "Đã hoàn thành" }), color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800", dot: "bg-green-400" },
    3: { text: t("schedules.statusCancelled", { defaultValue: "Đã hủy" }), color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800", dot: "bg-red-400" },
  };
  return configs[s] ?? { text: t("schedules.statusUnknown", { defaultValue: "Không xác định" }), color: "bg-gray-100 text-gray-800 border-gray-200", dot: "bg-gray-400" };
}

function getClassStatus(s: number, t: any) {
  const configs: Record<number, { text: string; color: string }> = {
    0: { text: t("classes.statusPlanning", { defaultValue: "Chưa diễn ra" }), color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
    1: { text: t("classes.statusActive", { defaultValue: "Đang diễn ra" }), color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
    2: { text: t("classes.statusCompleted", { defaultValue: "Đã kết thúc" }), color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800" },
    3: { text: t("classes.statusCancelled", { defaultValue: "Đã hủy" }), color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800" },
  };
  return configs[s] ?? { text: t("classes.statusUnknown", { defaultValue: "Không xác định" }), color: "bg-gray-100 text-gray-800 border-gray-200" };
}

const SLOT_COLORS = [
  "bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-950/30 dark:border-sky-800 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50",
  "bg-violet-50 border-violet-200 text-violet-800 dark:bg-violet-950/30 dark:border-violet-800 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50",
  "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50",
  "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50",
  "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50",
];

const DRAFT_COLOR = "bg-amber-50 border-amber-400 text-amber-900 dark:bg-amber-950/40 dark:border-amber-500 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 border-dashed";

interface WeekGridProps {
  events: ScheduleEvent[];
  weekStart: Date;
  onEventClick: (ev: ScheduleEvent) => void;
  onEventDrop?: (ev: ScheduleEvent, dateStr: string, slotIdx: number) => void;
  isEventEditable: (ev: ScheduleEvent) => boolean;
  /** false = weekly-pattern view (no real dates behind it): hides date numbers and the "today" highlight. */
  showDates?: boolean;
}

function WeekGrid({ events, weekStart, onEventClick, onEventDrop, isEventEditable, showDates = true }: WeekGridProps) {
  const { t } = useTranslation();
  const [dragOverCell, setDragOverCell] = useState<{ date: string; slotIdx: number } | null>(null);

  const lookup: Record<string, Record<number, ScheduleEvent[]>> = {};
  for (const ev of events) {
    if (!lookup[ev.scheduleDate]) lookup[ev.scheduleDate] = {};
    if (!lookup[ev.scheduleDate][ev.slotIndex]) lookup[ev.scheduleDate][ev.slotIndex] = [];
    lookup[ev.scheduleDate][ev.slotIndex].push(ev);
  }

  const days: { date: Date; iso: string; label: string; dayLabel: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    const dayOfWeek = d.getDay();
    days.push({ date: d, iso: toISO(d), label: `${d.getDate()}/${d.getMonth() + 1}`, dayLabel: t(`common.day${dayOfWeek}`, { defaultValue: DAY_LABELS[dayOfWeek] }) });
  }

  const todayISO = toISO(new Date());

  const handleDragStart = (e: React.DragEvent, ev: ScheduleEvent) => {
    e.dataTransfer.setData("text/plain", ev.id);
  };

  const handleDragOver = (e: React.DragEvent, date: string, slotIdx: number) => {
    e.preventDefault();
    setDragOverCell({ date, slotIdx });
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = (e: React.DragEvent, date: string, slotIdx: number) => {
    e.preventDefault();
    setDragOverCell(null);
    const evId = e.dataTransfer.getData("text/plain");
    const ev = events.find((x) => x.id === evId);
    if (ev && onEventDrop) {
      onEventDrop(ev, date, slotIdx);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-28 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 px-3 py-2.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
              {t("classSchedules.slotDayLabel", { defaultValue: "Ca / Ngày" })}
            </th>
            {days.map((d) => (
              <th
                key={d.iso}
                className={`border border-gray-200 dark:border-gray-700 px-2 py-2.5 text-center text-xs font-bold uppercase tracking-wider
                  ${showDates && d.iso === todayISO
                    ? "bg-brand-500/10 text-brand-600 dark:text-brand-400"
                    : "bg-gray-50 dark:bg-gray-850 text-gray-500 dark:text-gray-400"}`}
              >
                <span className="block">{d.dayLabel}</span>
                {showDates && (
                  <span className={`mt-0.5 block text-[11px] font-semibold ${d.iso === todayISO ? "text-brand-600 dark:text-brand-400" : "text-gray-700 dark:text-gray-300"}`}>
                    {d.label}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FIXED_SLOTS.map((slot) => (
            <tr key={slot.index} className="group">
              <td className="border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-850/60 px-3 py-5 align-top" style={{ height: "120px" }}>
                <p className="font-bold text-xs text-gray-700 dark:text-gray-300">{t(`classSchedules.ca${slot.index + 1}`, { defaultValue: slot.label })}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{slot.time}</p>
              </td>
              {days.map((d) => {
                const cellEvents = lookup[d.iso]?.[slot.index] ?? [];
                const isDraggingOver = dragOverCell?.date === d.iso && dragOverCell?.slotIdx === slot.index;
                return (
                  <td
                    key={d.iso}
                    style={{ height: "120px" }}
                    onDragOver={(e) => handleDragOver(e, d.iso, slot.index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, d.iso, slot.index)}
                    className={`border border-gray-200 dark:border-gray-700 p-1.5 align-top min-w-[90px] transition-colors duration-150
                      ${showDates && d.iso === todayISO ? "bg-brand-500/5 dark:bg-brand-950/10" : "bg-white dark:bg-gray-900"}
                      ${isDraggingOver ? "bg-brand-500/10 ring-2 ring-brand-500 ring-inset" : ""}`}
                  >
                    <div className="flex flex-col gap-1 h-full">
                      {cellEvents.map((ev) => {
                        const editable = isEventEditable(ev);
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => onEventClick(ev)}
                            draggable={editable}
                            onDragStart={(e) => handleDragStart(e, ev)}
                            className={`w-full text-left rounded-lg border px-2 py-1.5 text-[11px] font-semibold leading-tight transition-all duration-150 shadow-xs hover:shadow-md hover:-translate-y-px
                              ${ev.diffStatus === "added"
                                ? "bg-emerald-50 border-emerald-500 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-500 dark:text-emerald-200 cursor-default"
                                : ev.diffStatus === "removed"
                                  ? "bg-rose-50 border-rose-400 border-dashed text-rose-700 line-through opacity-70 dark:bg-rose-950/30 dark:border-rose-600 dark:text-rose-300 cursor-default"
                                  : ev.isDraft
                                    ? DRAFT_COLOR + " cursor-grab active:cursor-grabbing hover:border-amber-500"
                                    : editable
                                      ? SLOT_COLORS[slot.index] + " cursor-grab active:cursor-grabbing hover:border-brand-500 hover:ring-1 hover:ring-brand-500"
                                      : SLOT_COLORS[slot.index] + " cursor-pointer"}`}
                          >
                            <span className="flex items-center gap-1">
                              <span className="block truncate font-bold">{ev.classCode}</span>
                            </span>
                            <span className="block truncate text-[10px] opacity-70 font-normal">{ev.className}</span>
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

// ── Auto-Schedule Config Modal (Semester-Style UI) ───────────────────────────
interface AutoScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesters: SemesterItem[];
  onGenerate: (params: {
    semesterId: number;
    maxClassSize: number;
    minClassSize: number;
    sessionsPerWeek: number;
    timePreferences: string[];
    allowConsecutiveDays: boolean;
    allowWeekend: boolean;
    teacherIds?: number[];
    roomIds?: number[];
  }) => void;
  loading: boolean;
  showToast: (msg: string, type?: "success" | "error") => void;
}

function AutoScheduleModal({ isOpen, onClose, semesters, onGenerate, loading, showToast }: AutoScheduleModalProps) {
  const { t } = useTranslation();
  const [semesterId, setSemesterId] = useState<number | null>(null);
  const [maxClassSize, setMaxClassSize] = useState<number>(15);
  const [minClassSize, setMinClassSize] = useState<number>(5);
  const [sessionsPerWeek, setSessionsPerWeek] = useState<number>(2);
  const [timePreferences, setTimePreferences] = useState<string[]>(["Morning", "Afternoon", "Evening"]);
  const [allowConsecutiveDays, setAllowConsecutiveDays] = useState<boolean>(false);
  const [allowWeekend, setAllowWeekend] = useState<boolean>(true);

  const [teachers, setTeachers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<number[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<number[]>([]);

  const [teacherKeyword, setTeacherKeyword] = useState<string>("");
  const [roomKeyword, setRoomKeyword] = useState<string>("");

  const [loadingStep, setLoadingStep] = useState(0);

  const togglePref = (pref: string) => {
    setTimePreferences((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
    );
  };

  const selectedSemesterName = semesters.find(s => s.id === semesterId)?.name || "";
  const semesterOptions = semesters.map((s) => ({ value: s.id, label: `${s.code} — ${s.name}` }));

  useEffect(() => {
    if (isOpen) {
      setSelectedTeachers([]);
      setSelectedRooms([]);
      setTeacherKeyword("");
      setRoomKeyword("");
    }
  }, [isOpen]);

  // Load teachers based on keyword
  useEffect(() => {
    if (isOpen) {
      commonApi.getTeachers(1, 1000, teacherKeyword, 1).then((res) => {
        if (res.success && res.data) {
          setTeachers(res.data.items || []);
        }
      });
    }
  }, [isOpen, teacherKeyword]);

  // Load rooms based on keyword
  useEffect(() => {
    if (isOpen) {
      commonApi.getRooms(1, 1000, roomKeyword, true).then((res) => {
        if (res.success && res.data) {
          setRooms(res.data.items || []);
        }
      });
    }
  }, [isOpen, roomKeyword]);

  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      return;
    }
    setLoadingStep(1);
    const t1 = setTimeout(() => setLoadingStep(2), 1500);
    const t2 = setTimeout(() => setLoadingStep(3), 3550);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [loading]);

  const handleSubmit = () => {
    if (!semesterId) {
      showToast(t("semester.toastSelectSemester", { defaultValue: "Vui lòng chọn học kỳ." }), "error");
      return;
    }
    if (timePreferences.length === 0) {
      showToast(t("semester.errSelectPreference", { defaultValue: "Vui lòng chọn ít nhất một ca học ưu tiên." }), "error");
      return;
    }
    if (minClassSize > maxClassSize) {
      showToast(t("semester.errClassSizeValidation", { defaultValue: "Sĩ số tối thiểu không lớn hơn sĩ số tối đa." }), "error");
      return;
    }
    if (selectedTeachers.length === 0) {
      showToast(t("semester.errSelectTeacher", { defaultValue: "Vui lòng chọn ít nhất một giáo viên để xếp lịch." }), "error");
      return;
    }
    if (selectedRooms.length === 0) {
      showToast(t("semester.errSelectRoom", { defaultValue: "Vui lòng chọn ít nhất một phòng học để xếp lịch." }), "error");
      return;
    }
    onGenerate({
      semesterId,
      maxClassSize,
      minClassSize,
      sessionsPerWeek,
      timePreferences: timePreferences.map(p => p.toLowerCase()),
      allowConsecutiveDays,
      allowWeekend,
      teacherIds: selectedTeachers,
      roomIds: selectedRooms,
    });
  };

  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[1200px] w-full p-6 sm:p-8" showCloseButton={!loading}>
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-brand-500" />
            {t("semester.autoScheduleTitle", { defaultValue: "Xếp lịch học tự động" })}
          </h3>
          {semesterId && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("semester.targetSemester", { defaultValue: "Học kỳ áp dụng:" })} <span className="font-semibold text-gray-700 dark:text-gray-300">{selectedSemesterName}</span>
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-pulse"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 animate-spin"></div>
            </div>
            <div className="text-center space-y-2">
              <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">
                {t("semester.autoScheduleRunningSubtitle", { defaultValue: "Hệ thống đang tính toán lịch học tối ưu..." })}
              </h4>
              <div className="text-sm text-gray-500 dark:text-gray-400 min-h-[40px] flex flex-col items-center justify-center">
                {loadingStep === 1 && <p className="animate-fade-in">{t("semester.autoScheduleStep1", { defaultValue: "Đang nạp danh sách đăng ký học sinh..." })}</p>}
                {loadingStep === 2 && <p className="animate-fade-in text-indigo-650 dark:text-indigo-400">{t("semester.autoScheduleStep2", { defaultValue: "Đang phân nhóm lớp học tối ưu..." })}</p>}
                {loadingStep === 3 && <p className="animate-fade-in text-emerald-650 dark:text-emerald-400">{t("semester.autoScheduleStep3", { defaultValue: "Đang giải ràng buộc & lập ca học..." })}</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 text-xs text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900 rounded-lg">
              <strong>{t("semester.autoScheduleNoteTitle", { defaultValue: "Lưu ý:" })}</strong> {t("semester.autoScheduleNoteBody", { defaultValue: "Quá trình này sử dụng AI để tự động tạo lớp học và thời khóa biểu tối ưu theo các ràng buộc được chỉ định bên dưới." })}
            </div>

            <form className="grid grid-cols-1 lg:grid-cols-12 gap-8" onSubmit={(e) => e.preventDefault()}>
              {/* Cột trái: Form cấu hình cũ */}
              <div className="lg:col-span-5 space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("semester.semesterLabel", { defaultValue: "Học kỳ" })} <span className="text-rose-500">*</span>
                  </label>
                  <SearchableSelect
                    options={semesterOptions}
                    value={semesterId || ""}
                    onChange={(val) => setSemesterId(val as number)}
                    placeholder={t("semester.formSemesterPlaceholder", { defaultValue: "Chọn học kỳ..." })}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("semester.autoScheduleMaxClassSize", { defaultValue: "Sĩ số tối đa" })} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={100}
                      required
                      value={maxClassSize}
                      onChange={(e) => setMaxClassSize(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 dark:border-gray-750 dark:bg-gray-900 dark:text-white/90 focus:border-brand-300 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("semester.autoScheduleMinClassSize", { defaultValue: "Sĩ số tối thiểu" })} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      required
                      value={minClassSize}
                      onChange={(e) => setMinClassSize(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-855 dark:text-gray-250 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:border-brand-300 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("semester.autoScheduleSessionsPerWeek", { defaultValue: "Số buổi mỗi tuần" })} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={sessionsPerWeek}
                    onChange={(e) => setSessionsPerWeek(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-855 dark:text-gray-250 dark:border-gray-700 dark:bg-gray-900 dark:text-white cursor-pointer"
                  >
                    <option value={1}>{t("semester.sessionsPerWeekOption", { count: 1, defaultValue: "1 buổi / tuần" })}</option>
                    <option value={2}>{t("semester.sessionsPerWeekOption", { count: 2, defaultValue: "2 buổi / tuần" })}</option>
                    <option value={3}>{t("semester.sessionsPerWeekOption", { count: 3, defaultValue: "3 buổi / tuần" })}</option>
                    <option value={4}>{t("semester.sessionsPerWeekOption", { count: 4, defaultValue: "4 buổi / tuần" })}</option>
                    <option value={5}>{t("semester.sessionsPerWeekOption", { count: 5, defaultValue: "5 buổi / tuần" })}</option>
                    <option value={6}>{t("semester.sessionsPerWeekOption", { count: 6, defaultValue: "6 buổi / tuần" })}</option>
                    <option value={7}>{t("semester.sessionsPerWeekOption", { count: 7, defaultValue: "7 buổi / tuần" })}</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("semester.autoSchedulePreferences", { defaultValue: "Khung thời gian có thể xếp lớp" })}
                  </label>
                  <div className="flex gap-3">
                    {["Morning", "Afternoon", "Evening"].map((p) => {
                      const label = p === "Morning" ? t("semester.autoSchedulePrefMorning", { defaultValue: "Sáng" }) : p === "Afternoon" ? t("semester.autoSchedulePrefAfternoon", { defaultValue: "Chiều" }) : t("semester.autoSchedulePrefEvening", { defaultValue: "Tối" });
                      const active = timePreferences.includes(p);
                      return (
                        <button
                          type="button"
                          key={p}
                          onClick={() => {
                            if (timePreferences.includes(p)) {
                              setTimePreferences(timePreferences.filter((x) => x !== p));
                            } else {
                              setTimePreferences([...timePreferences, p]);
                            }
                          }}
                          className={`flex-1 py-2 px-3 border text-xs font-semibold rounded-lg transition-all ${active
                            ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-400"
                            : "bg-white border-gray-200 text-gray-500 dark:bg-gray-900 dark:border-gray-800"
                            }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allowWeekend}
                      onChange={(e) => setAllowWeekend(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-650 dark:text-gray-300">
                      {t("semester.autoScheduleWeekend", { defaultValue: "Cho xếp lịch cuối tuần" })}
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allowConsecutiveDays}
                      onChange={(e) => setAllowConsecutiveDays(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-650 dark:text-gray-300">
                      {t("semester.autoScheduleConsecutiveDays", { defaultValue: "Cho phép học các ngày liên tiếp" })}
                    </span>
                  </label>
                </div>
              </div>

              {/* Cột phải: Giáo viên và Phòng học dạng card */}
              <div className="lg:col-span-7 space-y-6 text-left">
                {/* Chỉ định Giáo viên */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {t("semester.autoScheduleTeachers", { defaultValue: "Chỉ định Giáo viên xếp lịch" })}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected = teachers.length > 0 && selectedTeachers.length === teachers.length;
                        setSelectedTeachers(allSelected ? [] : teachers.map(teach => teach.id));
                      }}
                      className="text-xs font-semibold text-blue-650 dark:text-blue-450 hover:underline cursor-pointer select-none"
                    >
                      {teachers.length > 0 && selectedTeachers.length === teachers.length
                        ? t("common.deselectAll", { defaultValue: "Bỏ chọn tất cả" })
                        : t("common.selectAll", { defaultValue: "Chọn tất cả" })}
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder={t("common.searchTeacher", { defaultValue: "Tìm giáo viên theo Tên hoặc Mã..." })}
                    value={teacherKeyword}
                    onChange={(e) => setTeacherKeyword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-1.5 text-xs text-gray-800 focus:border-brand-300 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                  <div className="max-h-56 overflow-y-auto border border-gray-200 dark:border-gray-800 rounded-xl p-3 bg-gray-50/50 dark:bg-gray-950/20">
                    {teachers.length === 0 ? (
                      <p className="text-xs text-gray-400">{t("common.noData", { defaultValue: "Không có dữ liệu" })}</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {teachers.map((teach) => {
                          const isSelected = selectedTeachers.includes(teach.id);
                          return (
                            <div
                              key={teach.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedTeachers(selectedTeachers.filter((id) => id !== teach.id));
                                } else {
                                  setSelectedTeachers([...selectedTeachers, teach.id]);
                                }
                              }}
                              className={`p-2.5 rounded-lg border text-xs cursor-pointer flex flex-col justify-between transition-all select-none ${
                                isSelected
                                  ? "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/20 dark:border-blue-700 dark:text-blue-400 font-medium shadow-xs"
                                  : "bg-white border-gray-200 dark:border-gray-800 text-gray-655 dark:text-gray-300 hover:bg-gray-50/50"
                              }`}
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="truncate max-w-[85%] font-semibold">{teach.name}</span>
                                {isSelected && <span className="text-blue-500 font-bold">✓</span>}
                              </div>
                              <span className="text-[10px] opacity-70 mt-0.5">{teach.code}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Chỉ định Phòng học */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {t("semester.autoScheduleRooms", { defaultValue: "Chỉ định Phòng học xếp lịch" })}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected = rooms.length > 0 && selectedRooms.length === rooms.length;
                        setSelectedRooms(allSelected ? [] : rooms.map(rm => rm.id));
                      }}
                      className="text-xs font-semibold text-blue-655 dark:text-blue-450 hover:underline cursor-pointer select-none"
                    >
                      {rooms.length > 0 && selectedRooms.length === rooms.length
                        ? t("common.deselectAll", { defaultValue: "Bỏ chọn tất cả" })
                        : t("common.selectAll", { defaultValue: "Chọn tất cả" })}
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder={t("common.searchRoom", { defaultValue: "Tìm phòng học theo Tên hoặc Mã..." })}
                    value={roomKeyword}
                    onChange={(e) => setRoomKeyword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-1.5 text-xs text-gray-800 focus:border-brand-300 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                  <div className="max-h-56 overflow-y-auto border border-gray-200 dark:border-gray-800 rounded-xl p-3 bg-gray-50/50 dark:bg-gray-950/20">
                    {rooms.length === 0 ? (
                      <p className="text-xs text-gray-400">{t("common.noData", { defaultValue: "Không có dữ liệu" })}</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {rooms.map((rm) => {
                          const isSelected = selectedRooms.includes(rm.id);
                          return (
                            <div
                              key={rm.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedRooms(selectedRooms.filter((id) => id !== rm.id));
                                } else {
                                  setSelectedRooms([...selectedRooms, rm.id]);
                                }
                              }}
                              className={`p-2.5 rounded-lg border text-xs cursor-pointer flex flex-col justify-between transition-all select-none ${
                                isSelected
                                  ? "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/20 dark:border-blue-700 dark:text-blue-400 font-medium shadow-xs"
                                  : "bg-white border-gray-200 dark:border-gray-800 text-gray-650 dark:text-gray-300 hover:bg-gray-50/50"
                              }`}
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="truncate max-w-[85%] font-semibold">{rm.name}</span>
                                {isSelected && <span className="text-blue-500 font-bold">✓</span>}
                              </div>
                              <span className="text-[10px] opacity-70 mt-0.5">
                                 {rm.code} ({t("room.capacity", { defaultValue: "Sức chứa" })}: {rm.capacity ?? t("common.unknown", { defaultValue: "Chưa rõ" })})
                               </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Hàng nút dưới cùng (kéo dài cả 12 cột) */}
              <div className="col-span-12 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-305 dark:border-gray-650"
                >
                  {t("semester.btnCancel", { defaultValue: "Hủy" })}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!semesterId || loading}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 flex items-center gap-1.5"
                >
                  <CalendarClock className="w-4 h-4" />
                  {t("semester.btnStartScheduling", { defaultValue: "Bắt đầu lập lịch" })}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Edit Slot (Room & Teacher) Modal ──────────────────────────────────────────
interface EditSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: ScheduleEvent | null;
  rooms: RoomItem[];
  classes: ClassItem[];
  onSave: (event: ScheduleEvent, newRoomId: number | null, newRoomName: string, newTeacherId: number | null, newTeacherName: string) => void;
  saving: boolean;
}

function EditSlotModal({ isOpen, onClose, event, rooms, classes, onSave, saving }: EditSlotModalProps) {
  const { t } = useTranslation();
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(event?.roomId ?? null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(event?.teacherId ?? null);
  const [availableRooms, setAvailableRooms] = useState<RoomItem[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [availableTeachers, setAvailableTeachers] = useState<any[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const targetClass = classes.find(c => c.code === event?.classCode || c.id === event?.classId);
  const isOnline = (targetClass?.type === 1) || (event?.classType === 1);
  const isPast = event ? isPastSlot(event.scheduleDate, event.endTime) : false;

  useEffect(() => {
    if (event && isOpen) {
      setSelectedRoomId(event.roomId ?? null);
      setSelectedTeacherId(event.teacherId ?? null);
      setAttemptedSubmit(false);

      const courseId = targetClass?.courseId || event.courseId;
      const semesterId = targetClass?.semesterId || event.semesterId;
      const classId = targetClass?.id || event.classId;
      const dow = new Date(event.scheduleDate).getDay();

      // Fetch Available Rooms if not Online
      if (!isOnline) {
        setLoadingRooms(true);
        commonApi.getAvailableRooms({
          classId: classId ?? undefined,
          minCapacity: targetClass?.studentCount,
          date: event.scheduleDate,
          slotIndex: event.slotIndex,
          dayOfWeek: dow,
          excludeScheduleId: !event.isDraft ? Number(event.id) : undefined,
        })
          .then(res => {
            if (res.success && res.data) {
              setAvailableRooms(res.data);
            } else {
              setAvailableRooms(rooms.filter(r => r.status === 1));
            }
          })
          .catch(() => {
            setAvailableRooms(rooms.filter(r => r.status === 1));
          })
          .finally(() => {
            setLoadingRooms(false);
          });
      } else {
        setAvailableRooms([]);
        setSelectedRoomId(null);
      }

      // Fetch Available Teachers (filtered by required band, availability & schedule conflict)
      setLoadingTeachers(true);
      commonApi.getAvailableTeachers({
        courseId: courseId ?? undefined,
        semesterId: semesterId ?? undefined,
        dayOfWeek: dow,
        slotIndex: event.slotIndex,
        date: event.scheduleDate,
        excludeScheduleId: !event.isDraft ? Number(event.id) : undefined,
      })
        .then(res => {
          if (res.success && res.data) {
            setAvailableTeachers(res.data);
          } else {
            setAvailableTeachers([]);
          }
        })
        .catch(() => {
          setAvailableTeachers([]);
        })
        .finally(() => {
          setLoadingTeachers(false);
        });
    }
  }, [event, isOpen, classes, rooms, isOnline, targetClass]);

  if (!isOpen || !event) return null;

  const roomOptions: { value: string; label: string }[] = [];

  if (selectedRoomId && !availableRooms.some(r => r.id === selectedRoomId)) {
    const currentRoom = rooms.find(r => r.id === selectedRoomId);
    if (currentRoom) {
      roomOptions.push({
        value: String(currentRoom.id),
        label: `${currentRoom.name}${currentRoom.building ? ` (${currentRoom.building}${currentRoom.floor ? ` - T${currentRoom.floor}` : ""})` : ""}${currentRoom.capacity ? ` · ${currentRoom.capacity} chỗ` : ""} (Hiện tại)`,
      });
    }
  }

  availableRooms.forEach(r => {
    roomOptions.push({
      value: String(r.id),
      label: `${r.name}${r.building ? ` (${r.building}${r.floor ? ` - T${r.floor}` : ""})` : ""}${r.capacity ? ` · ${r.capacity} chỗ` : ""}`,
    });
  });

  const teacherOptions: { value: string; label: string }[] = [];

  if (selectedTeacherId && !availableTeachers.some(t => t.id === selectedTeacherId)) {
    teacherOptions.push({
      value: String(selectedTeacherId),
      label: `${event.teacherName} (Hiện tại)`,
    });
  }

  availableTeachers.forEach(tea => {
    teacherOptions.push({
      value: String(tea.id),
      label: `${tea.name} (${tea.code})${tea.gradeLevelName ? ` · Band ${tea.gradeLevelName}` : ""}`,
    });
  });

  const selectedRoom = rooms.find(r => r.id === Number(selectedRoomId));
  const selectedTeacher = availableTeachers.find(t => t.id === Number(selectedTeacherId));

  const hasRoomChanged = isOnline ? false : (selectedRoomId === null ? event.roomId !== null : Number(selectedRoomId) !== Number(event.roomId));
  const hasTeacherChanged = selectedTeacherId === null ? event.teacherId !== null : Number(selectedTeacherId) !== Number(event.teacherId);
  const hasChanged = hasRoomChanged || hasTeacherChanged;

  const handleConfirm = () => {
    if ((!isOnline && !selectedRoomId) || !selectedTeacherId) {
      setAttemptedSubmit(true);
      return;
    }
    const roomName = isOnline ? "Online" : (selectedRoom?.name ?? event.roomName);
    const teacherName = selectedTeacher?.name ?? event.teacherName;
    onSave(
      event,
      isOnline ? null : Number(selectedRoomId),
      roomName,
      Number(selectedTeacherId),
      teacherName
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={!saving} className="max-w-[480px] p-6">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <DoorOpen className="w-5 h-5 text-violet-500" />
            {t("classSchedules.editSlotTitle", { defaultValue: "Đổi phòng & Giáo viên cho buổi học" })}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("classSchedules.editRoomSubtitle", {
              classCode: event.classCode,
              defaultValue: `Lớp: ${event.classCode} — ${event.className}`
            })}
          </p>
        </div>

        {isPast && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <span>⚠️</span>
            <span>{t("classSchedules.pastSlotWarning", { defaultValue: "Buổi học này đã diễn ra trong quá khứ nên không thể thay đổi thông tin." })}</span>
          </div>
        )}

        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <div className="flex gap-2">
            <span className="font-semibold text-gray-700 dark:text-gray-300">{t("classSchedules.currentRoom", { defaultValue: "Phòng hiện tại:" })}</span>
            <span>{isOnline ? t("class.typeOnline", { defaultValue: "Trực tuyến (Online)" }) : event.roomName}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold text-gray-700 dark:text-gray-300">{t("classSchedules.currentTeacher", { defaultValue: "Giáo viên hiện tại:" })}</span>
            <span>{event.teacherName}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold text-gray-700 dark:text-gray-300">{t("classSchedules.slotLabel", { defaultValue: "Ca học:" })}</span>
            <span>{t(`classSchedules.ca${event.slotIndex + 1}`, { defaultValue: FIXED_SLOTS[event.slotIndex]?.label })} · {event.startTime}–{event.endTime}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold text-gray-700 dark:text-gray-300">{t("classSchedules.scheduleDay", { defaultValue: "Lịch buổi học:" })}</span>
            <span>{t(`common.day${new Date(event.scheduleDate).getDay()}`, { defaultValue: DAY_LABELS[new Date(event.scheduleDate).getDay()] })} ({event.scheduleDate})</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between">
            <span>
              {t("classSchedules.newRoomLabel", { defaultValue: "Phòng học" })} {!isOnline && <span className="text-rose-500">*</span>}
            </span>
            {loadingRooms && !isOnline && (
              <span className="text-xs text-violet-500 flex items-center gap-1 font-normal">
                <Loader2 className="w-3 h-3 animate-spin" /> Đang tải phòng phù hợp...
              </span>
            )}
          </label>
          {isOnline ? (
            <div className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/60 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              {t("classSchedules.onlineClassNoRoom", { defaultValue: "Lớp học trực tuyến (Online) — Không sử dụng phòng học." })}
            </div>
          ) : (
            <>
              <SearchableSelect
                options={roomOptions}
                value={selectedRoomId !== null ? String(selectedRoomId) : ""}
                onChange={(val) => {
                  setSelectedRoomId(val ? Number(val) : null);
                  if (val) setAttemptedSubmit(false);
                }}
                placeholder={t("classSchedules.selectRoom", { defaultValue: "Chọn phòng học..." })}
                onClear={() => setSelectedRoomId(null)}
              />
              {attemptedSubmit && !selectedRoomId && (
                <p className="text-xs text-rose-500 font-medium mt-1">
                  {t("classSchedules.errRoomRequired", { defaultValue: "Vui lòng chọn phòng học." })}
                </p>
              )}
              {selectedRoom && (
                <p className="text-xs text-violet-600 dark:text-violet-400">
                  {selectedRoom.building && `${selectedRoom.building}${selectedRoom.floor ? ` · Tầng ${selectedRoom.floor}` : ""} · `}
                  {selectedRoom.capacity ? `${selectedRoom.capacity} chỗ ngồi` : ""}
                </p>
              )}
            </>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between">
            <span>
              {t("classSchedules.newTeacherLabel", { defaultValue: "Giáo viên giảng dạy" })} <span className="text-rose-500">*</span>
            </span>
            {loadingTeachers && (
              <span className="text-xs text-violet-500 flex items-center gap-1 font-normal">
                <Loader2 className="w-3 h-3 animate-spin" /> Đang tải GV thỏa mãn...
              </span>
            )}
          </label>
          <SearchableSelect
            options={teacherOptions}
            value={selectedTeacherId !== null ? String(selectedTeacherId) : ""}
            onChange={(val) => {
              setSelectedTeacherId(val ? Number(val) : null);
              if (val) setAttemptedSubmit(false);
            }}
            placeholder={t("classSchedules.selectTeacher", { defaultValue: "Chọn giáo viên..." })}
            onClear={() => setSelectedTeacherId(null)}
          />
          {attemptedSubmit && !selectedTeacherId && (
            <p className="text-xs text-rose-500 font-medium mt-1">
              {t("classSchedules.errTeacherRequired", { defaultValue: "Vui lòng chọn giáo viên." })}
            </p>
          )}
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            * Danh sách chỉ hiển thị các giáo viên rảnh vào ca này và đạt band yêu cầu của khóa học.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 disabled:opacity-50"
          >
            {t("classSchedules.btnCancel", { defaultValue: "Hủy" })}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving || isPast || (!isOnline && !selectedRoomId) || !selectedTeacherId || !hasChanged}
            className="px-4 py-2 text-sm font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t("classSchedules.btnSaveSlot", { defaultValue: "Lưu thay đổi" })}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ClassScheduleCalendar() {
  const { t } = useTranslation();
  const { isOpen, openModal, closeModal } = useModal();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [semesters, setSemesters] = useState<SemesterItem[]>([]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [classDetail, setClassDetail] = useState<ClassItem | null>(null);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"week" | "month">("week");
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);

  // Edit Room state
  const [editRoomTarget, setEditRoomTarget] = useState<ScheduleEvent | null>(null);
  const [editRoomSaving, setEditRoomSaving] = useState(false);

  // Semester filter state
  const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(null);


  // Toast State
  const [toasts, setToasts] = useState<{ id: number; message: string; type: "success" | "error" }[]>([]);
  const [mounted, setMounted] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    if (!msg) return;
    const messages = msg
      .split(/\r?\n/)
      .map((m) => m.trim())
      .filter(Boolean);

    messages.forEach((message, index) => {
      const id = Date.now() + index;
      setToasts((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    });
  };

  // Draft state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [draftClasses, setDraftClasses] = useState<ClassItem[] | null>(null);
  const [draftEvents, setDraftEvents] = useState<ScheduleEvent[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [draftSemesterId, setDraftSemesterId] = useState<number | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [scheduleReliability, setScheduleReliability] = useState<ScheduleReliabilityReport | null>(null);

  // Schedule version state (save checkpoints + rollback-to-version)
  const [showSaveVersionModal, setShowSaveVersionModal] = useState(false);
  const [versionNameInput, setVersionNameInput] = useState("");
  const [saveVersionLoading, setSaveVersionLoading] = useState(false);
  const [showVersionPickerModal, setShowVersionPickerModal] = useState(false);
  const [scheduleVersions, setScheduleVersions] = useState<ScheduleVersionListItem[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [deletingVersionId, setDeletingVersionId] = useState<number | null>(null);
  const [showVersionPreviewModal, setShowVersionPreviewModal] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewVersionName, setPreviewVersionName] = useState("");
  const [previewEvents, setPreviewEvents] = useState<ScheduleEvent[]>([]);
  const [showVersionOnlyModal, setShowVersionOnlyModal] = useState(false);
  const [versionOnlyLoading, setVersionOnlyLoading] = useState(false);
  const [versionOnlyName, setVersionOnlyName] = useState("");
  const [versionOnlyEvents, setVersionOnlyEvents] = useState<ScheduleEvent[]>([]);

  // Teacher availability cache (teacherId -> Set of "dayOfWeek-slotIndex")
  const [teacherAvailMap, setTeacherAvailMap] = useState<Record<number, Set<string>>>({});

  const activeSemesterId = selectedSemesterId || draftSemesterId;

  useEffect(() => {
    if (!activeSemesterId) {
      setTeacherAvailMap({});
      return;
    }
    semesterApi.getSemesterTeacherAvailabilities(activeSemesterId)
      .then((res) => {
        if (res.success && res.data) {
          const map: Record<number, Set<string>> = {};
          res.data.forEach((item: any) => {
            if (!map[item.teacherId]) {
              map[item.teacherId] = new Set<string>();
            }
            map[item.teacherId].add(`${item.dayOfWeek}-${item.slotIndex}`);
          });
          setTeacherAvailMap(map);
        } else {
          setTeacherAvailMap({});
        }
      })
      .catch((err) => {
        console.error("Failed to fetch teacher availabilities", err);
        setTeacherAvailMap({});
      });
  }, [activeSemesterId]);

  // Edit Mode state — controls whether DB schedule events are draggable
  const [isEditMode, setIsEditMode] = useState(false);
  const [editSaving, setEditSaving] = useState(false); // true while an immediate drag-save is in progress

  // Undo stacks — separate because undoing a draft move is a pure client-side state
  // restore, while undoing a persisted move re-commits the previous state to the DB.
  const UNDO_STACK_LIMIT = 5;
  const [draftUndoStack, setDraftUndoStack] = useState<ClassItem[][]>([]);
  const [dbUndoStack, setDbUndoStack] = useState<
    { classId: number; classCode: string; previousWeeklySchedules: any[]; previousEvents: ScheduleEvent[] }[]
  >([]);
  const [undoingDbMove, setUndoingDbMove] = useState(false);

  // Load classes and semesters
  useEffect(() => {
    setMounted(true);
    classApi.getAll(1, 1000).then((res) => {
      if (res.success && res.data) setClasses(res.data.items || []);
    });
    commonApi.getSemesters().then((res) => {
      if (res.success && res.data) setSemesters(res.data);
    });
    roomApi.getAll(1, 500).then((res) => {
      if (res.success && res.data) setRooms(res.data.items || []);
    });
  }, [reloadTrigger]);

  // Restore draft schedule from localStorage on mount
  useEffect(() => {
    if (mounted) {
      const storedClasses = localStorage.getItem("semester_draft_classes");
      const storedSemesterId = localStorage.getItem("semester_draft_id");
      if (storedClasses && storedSemesterId) {
        try {
          const parsedClasses = JSON.parse(storedClasses);
          const parsedSemesterId = Number(storedSemesterId);
          setDraftClasses(parsedClasses);
          setDraftSemesterId(parsedSemesterId);
          const newDraftEvents = parsedClasses.flatMap((cls: ClassItem) => mapDraftClass(cls));
          setDraftEvents(newDraftEvents);
          if (parsedClasses.length > 0 && parsedClasses[0].startDate) {
            setWeekStart(getWeekStart(new Date(parsedClasses[0].startDate)));
          }
        } catch (e) {
          console.error("Failed to parse stored draft classes", e);
        }
      }
      const storedReliability = localStorage.getItem("semester_draft_reliability");
      if (storedReliability) {
        try {
          setScheduleReliability(JSON.parse(storedReliability));
        } catch (e) {
          console.error("Failed to parse stored schedule reliability report", e);
        }
      }
    }
  }, [mounted]);

  // Load schedules from DB
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (selectedClassId === null) {
          const res = await classApi.getClassSchedules();
          if (res.success && res.data) {
            setClassDetail(null);
            setEvents(
              (res.data as ClassScheduleItem[])
                .map((s) => mapApiItem(s))
                .filter(Boolean) as ScheduleEvent[]
            );
          }
        } else {
          const res = await classApi.getById(selectedClassId);
          if (res.success && res.data) {
            const detail = res.data;
            setClassDetail(detail);
            setEvents(
              (detail.schedules || [])
                .map((s: ClassScheduleItem) => mapApiItem(s, detail))
                .filter(Boolean) as ScheduleEvent[]
            );
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedClassId, reloadTrigger]);

  const isEventEditable = useCallback((ev: ScheduleEvent): boolean => {
    if (editSaving) return false; // Block editing while saving is in progress
    if (isPastSlot(ev.scheduleDate, ev.endTime)) return false; // Block editing past slots
    if (ev.isDraft) return true; // Temp draft always draggable
    if (!isEditMode) return false; // DB events only draggable when Edit Mode is ON
    if (ev.classStatus !== undefined && ev.classStatus !== null) {
      return ev.classStatus === 0; // Only Planning classes
    }
    const cls = classes.find((c) => c.code === ev.classCode);
    return cls?.status === 0; // 0 = Planning
  }, [classes, isEditMode, editSaving]);

  const regenerateSchedulesForClass = (cls: ClassItem, semesterStartStr: string, semesterEndStr: string): ClassScheduleItem[] => {
    const start = new Date(semesterStartStr);
    const end = new Date(semesterEndStr);
    let weeklySchedules = [];
    try {
      weeklySchedules = cls.weeklySchedulesJson ? JSON.parse(cls.weeklySchedulesJson) : [];
    } catch {
      weeklySchedules = [];
    }
    
    const schedules: ClassScheduleItem[] = [];
    let lessonNo = 1;
    const cur = new Date(start);
    
    while (cur <= end) {
      const dayOfWeek = cur.getDay();
      const match = weeklySchedules.find((w: any) => w.dayOfWeek === dayOfWeek);
      if (match) {
        const slotIdx = resolveSlotIndex(match.startTime);
        schedules.push({
          id: 0,
          classId: cls.id,
          classCode: cls.code,
          className: cls.name,
          lessonNo: lessonNo,
          scheduleDate: toISO(cur),
          startTime: match.startTime,
          endTime: match.endTime,
          roomId: match.roomId || null,
          roomName: match.roomId ? (cls.schedules?.[0]?.roomName || "Phòng học") : undefined,
          teacherId: cls.teacherId,
          teacherName: cls.teacherName,
          status: 0,
        });
        lessonNo++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return schedules;
  };

  const handleMoveEvent = (draggedEvent: ScheduleEvent, targetDate: string, targetSlotIdx: number): boolean => {
    // Cannot move events in the past
    if (isPastSlot(draggedEvent.scheduleDate, draggedEvent.endTime)) {
      showToast(t("classSchedules.cannotEditPastSlot", { defaultValue: "Buổi học trong quá khứ không thể chỉnh sửa." }), "error");
      return false;
    }

    // Conflict check against all currently displayed events
    const checkEvents = allDisplayEvents;

    const teacherConflict = checkEvents.some(ev => 
      ev.id !== draggedEvent.id &&
      ev.scheduleDate === targetDate &&
      ev.slotIndex === targetSlotIdx &&
      ev.teacherName === draggedEvent.teacherName &&
      draggedEvent.teacherName !== "—" &&
      draggedEvent.teacherName !== "Chưa phân công"
    );

    const roomConflict = checkEvents.some(ev => 
      ev.id !== draggedEvent.id &&
      ev.scheduleDate === targetDate &&
      ev.slotIndex === targetSlotIdx &&
      ev.roomName === draggedEvent.roomName &&
      draggedEvent.roomName !== "—" &&
      draggedEvent.roomName !== "N/A"
    );

    if (teacherConflict) {
      showToast(t("classSchedules.teacherConflictWarning", { 
        teacher: draggedEvent.teacherName, 
        slot: t(`classSchedules.ca${targetSlotIdx + 1}`, { defaultValue: FIXED_SLOTS[targetSlotIdx].label }), 
        date: targetDate, 
        defaultValue: `Giáo viên ${draggedEvent.teacherName} đã có lịch dạy vào ${FIXED_SLOTS[targetSlotIdx].label} ngày ${targetDate}!` 
      }), "error");
      return false;
    }

    if (roomConflict) {
      showToast(t("classSchedules.roomConflictWarning", { 
        room: draggedEvent.roomName, 
        slot: t(`classSchedules.ca${targetSlotIdx + 1}`, { defaultValue: FIXED_SLOTS[targetSlotIdx].label }), 
        date: targetDate, 
        defaultValue: `Phòng ${draggedEvent.roomName} đã được sử dụng vào ${FIXED_SLOTS[targetSlotIdx].label} ngày ${targetDate}!` 
      }), "error");
      return false;
    }

    // Check teacher availability against cached map
    const targetClass = (draftClasses || []).find(c => c.code === draggedEvent.classCode) 
                      || classes.find(c => c.code === draggedEvent.classCode);
    const teacherId = targetClass?.teacherId;

    if (teacherId) {
      const availSet = teacherAvailMap[teacherId];
      if (availSet && availSet.size > 0) {
        const targetDayOfWeek = new Date(targetDate).getDay();
        const slotKey = `${targetDayOfWeek}-${targetSlotIdx}`;
        if (!availSet.has(slotKey)) {
          showToast(t("class.errTeacherUnavailable", { 
            defaultValue: "Giáo viên không rảnh trong khoảng thời gian đã chọn của học kỳ." 
          }), "error");
          return false;
        }
      }
    }

    // ── DB event in Edit Mode: optimistic update + background API call ──────────
    if (!draggedEvent.isDraft && isEditMode) {
      const targetClass = classes.find(c => c.code === draggedEvent.classCode);
      if (!targetClass) return false;

      // ── 1. Optimistic update: move all occurrences of this class on the same
      //       day-of-week to the new day-of-week + slot, so the calendar reflects
      //       the change instantly without waiting for the API.
      const originalDayOfWeek = new Date(draggedEvent.scheduleDate).getDay();
      const targetDayOfWeek = new Date(targetDate).getDay();
      const dayDiff = targetDayOfWeek - originalDayOfWeek;

      const prevEvents = [...events]; // snapshot for revert

      const optimisticEvents = events.map(ev => {
        if (ev.classCode !== draggedEvent.classCode) return ev;
        if (new Date(ev.scheduleDate).getDay() !== originalDayOfWeek) return ev;
        if (ev.slotIndex !== draggedEvent.slotIndex) return ev;

        // Shift date by day difference, keeping week intact
        const d = new Date(ev.scheduleDate);
        d.setDate(d.getDate() + dayDiff);

        return {
          ...ev,
          scheduleDate: toISO(d),
          slotIndex: targetSlotIdx,
          startTime: FIXED_SLOTS[targetSlotIdx].start,
          endTime: FIXED_SLOTS[targetSlotIdx].end,
        };
      });

      setEvents(optimisticEvents);

      // ── 2. Background API call (getById to get full weeklySchedulesJson, then update)
      setEditSaving(true);
      classApi.getById(targetClass.id).then((detailRes) => {
        if (!detailRes.success || !detailRes.data) {
          showToast(t("classSchedules.toastFetchDetailError", { defaultValue: "Không thể lấy thông tin chi tiết lớp học để cập nhật." }), "error");
          setEvents(prevEvents); // revert
          setEditSaving(false);
          return;
        }

        const cls = detailRes.data;
        let weeklySchedules: any[] = [];
        try {
          weeklySchedules = cls.weeklySchedulesJson ? JSON.parse(cls.weeklySchedulesJson) : [];
        } catch {
          weeklySchedules = [];
        }
        const previousWeeklySchedules = JSON.parse(JSON.stringify(weeklySchedules)); // snapshot for undo

        const wsIdx = weeklySchedules.findIndex((w: any) => w.dayOfWeek === originalDayOfWeek && w.startTime === draggedEvent.startTime);
        if (wsIdx < 0) {
          const wsIdxFallback = weeklySchedules.findIndex((w: any) => w.dayOfWeek === originalDayOfWeek);
          if (wsIdxFallback >= 0) {
            weeklySchedules[wsIdxFallback].dayOfWeek = targetDayOfWeek;
            weeklySchedules[wsIdxFallback].startTime = FIXED_SLOTS[targetSlotIdx].start;
            weeklySchedules[wsIdxFallback].endTime = FIXED_SLOTS[targetSlotIdx].end;
          }
        } else {
          weeklySchedules[wsIdx].dayOfWeek = targetDayOfWeek;
          weeklySchedules[wsIdx].startTime = FIXED_SLOTS[targetSlotIdx].start;
          weeklySchedules[wsIdx].endTime = FIXED_SLOTS[targetSlotIdx].end;
        }

        const saveDto: ClassSaveDto = {
          id: cls.id,
          code: cls.code,
          name: cls.name,
          status: cls.status,
          type: cls.type,
          url: cls.url,
          description: cls.description,
          startDate: cls.startDate,
          endDate: cls.endDate,
          courseId: cls.courseId,
          teacherId: cls.teacherId,
          semesterId: cls.semesterId,
          expectedLessons: cls.expectedLessons,
          weeklySchedules,
          students: (cls.studentClasses || []).map((sc: any) => ({
            studentId: sc.studentId,
            enrollType: sc.enrollType ?? 0,
          })),
        };

        classApi.update(cls.id, saveDto).then((updateRes) => {
          if (updateRes.success) {
            // Optimistic state is already correct — just show toast, no reload needed
            setDbUndoStack((stack) =>
              [...stack, { classId: cls.id, classCode: cls.code, previousWeeklySchedules, previousEvents: prevEvents }].slice(-UNDO_STACK_LIMIT)
            );
            showToast(t("classSchedules.toastMoveSuccess", {
              classCode: draggedEvent.classCode,
              slot: t(`classSchedules.ca${targetSlotIdx + 1}`, { defaultValue: FIXED_SLOTS[targetSlotIdx].label }),
              date: targetDate,
              defaultValue: `Đã đổi lịch lớp ${draggedEvent.classCode} sang ${FIXED_SLOTS[targetSlotIdx].label} ngày ${targetDate}!`
            }), "success");
          } else {
            // API rejected (room/teacher conflict from backend) → revert optimistic change
            setEvents(prevEvents);
            const errMsg = updateRes.message
              ? getFriendlyRoomError(updateRes.message)
              : t("classSchedules.toastUpdateError", { defaultValue: "Lỗi khi cập nhật lịch lớp học." });
            showToast(errMsg, "error");
          }
        }).catch(() => {
          setEvents(prevEvents); // revert on network error
          showToast(t("classSchedules.toastUpdateError", { defaultValue: "Có lỗi xảy ra khi cập nhật lịch." }), "error");
        }).finally(() => {
          setEditSaving(false);
        });
      }).catch(() => {
        setEvents(prevEvents); // revert on network error
        showToast(t("classSchedules.toastUpdateError", { defaultValue: "Có lỗi xảy ra khi cập nhật lịch." }), "error");
        setEditSaving(false);
      });

      return true;
    }


    if (!draftClasses) return false;


    // Find class
    const clsIndex = draftClasses.findIndex(c => c.code === draggedEvent.classCode);
    if (clsIndex < 0) return false;

    const cls = { ...draftClasses[clsIndex] };
    let weeklySchedules = [];
    try {
      weeklySchedules = cls.weeklySchedulesJson ? JSON.parse(cls.weeklySchedulesJson) : [];
    } catch {
      weeklySchedules = [];
    }

    const originalDateObj = new Date(draggedEvent.scheduleDate);
    const originalDayOfWeek = originalDateObj.getDay();

    const targetDateObj = new Date(targetDate);
    const targetDayOfWeek = targetDateObj.getDay();

    // Find the weekly schedule entry to change
    const wsIdx = weeklySchedules.findIndex((w: any) => w.dayOfWeek === originalDayOfWeek && w.startTime === draggedEvent.startTime);
    if (wsIdx < 0) {
      const wsIdxFallback = weeklySchedules.findIndex((w: any) => w.dayOfWeek === originalDayOfWeek);
      if (wsIdxFallback < 0) return false;
      weeklySchedules[wsIdxFallback].dayOfWeek = targetDayOfWeek;
      weeklySchedules[wsIdxFallback].startTime = FIXED_SLOTS[targetSlotIdx].start;
      weeklySchedules[wsIdxFallback].endTime = FIXED_SLOTS[targetSlotIdx].end;
    } else {
      weeklySchedules[wsIdx].dayOfWeek = targetDayOfWeek;
      weeklySchedules[wsIdx].startTime = FIXED_SLOTS[targetSlotIdx].start;
      weeklySchedules[wsIdx].endTime = FIXED_SLOTS[targetSlotIdx].end;
    }

    cls.weeklySchedulesJson = JSON.stringify(weeklySchedules);

    cls.scheduleDisplay = weeklySchedules
      .sort((a: any, b: any) => a.dayOfWeek - b.dayOfWeek)
      .map((w: any) => `${t(`common.day${w.dayOfWeek}`, { defaultValue: DAY_LABELS[w.dayOfWeek] })} ${w.startTime}-${w.endTime}`)
      .join(", ");

    const newSchedules = regenerateSchedulesForClass(cls, cls.startDate || targetDate, cls.endDate || targetDate);
    cls.schedules = newSchedules;

    setDraftUndoStack((stack) => [...stack, draftClasses].slice(-UNDO_STACK_LIMIT));

    const updatedDraftClasses = [...draftClasses];
    updatedDraftClasses[clsIndex] = cls;
    setDraftClasses(updatedDraftClasses);
    localStorage.setItem("semester_draft_classes", JSON.stringify(updatedDraftClasses));

    const newDraftEvents = updatedDraftClasses.flatMap((c) => mapDraftClass(c));
    setDraftEvents(newDraftEvents);

    showToast(t("classSchedules.toastMoveSuccess", {
      classCode: draggedEvent.classCode,
      slot: t(`classSchedules.ca${targetSlotIdx + 1}`, { defaultValue: FIXED_SLOTS[targetSlotIdx].label }),
      date: targetDate,
      defaultValue: `Đã đổi lịch lớp ${draggedEvent.classCode} sang ${FIXED_SLOTS[targetSlotIdx].label} ngày ${targetDate}!`
    }), "success");

    return true;
  };

  const handleUndoDraftMove = () => {
    if (draftUndoStack.length === 0) return;
    const previous = draftUndoStack[draftUndoStack.length - 1];
    setDraftUndoStack((stack) => stack.slice(0, -1));
    setDraftClasses(previous);
    localStorage.setItem("semester_draft_classes", JSON.stringify(previous));
    setDraftEvents(previous.flatMap((c) => mapDraftClass(c)));
    showToast(t("classSchedules.toastUndoSuccess", { defaultValue: "Đã hoàn tác thay đổi lịch nháp." }), "success");
  };

  const handleUndoDbMove = async () => {
    if (dbUndoStack.length === 0) return;
    const entry = dbUndoStack[dbUndoStack.length - 1];
    setDbUndoStack((stack) => stack.slice(0, -1));
    setUndoingDbMove(true);

    const eventsBeforeUndo = events;
    setEvents(entry.previousEvents); // optimistic

    const revertOptimisticState = () => {
      setEvents(eventsBeforeUndo);
      setDbUndoStack((stack) => [...stack, entry]);
    };

    try {
      const detailRes = await classApi.getById(entry.classId);
      if (!detailRes.success || !detailRes.data) {
        revertOptimisticState();
        showToast(t("classSchedules.toastFetchDetailError", { defaultValue: "Không thể lấy thông tin chi tiết lớp học để cập nhật." }), "error");
        return;
      }

      const cls = detailRes.data;
      const saveDto: ClassSaveDto = {
        id: cls.id,
        code: cls.code,
        name: cls.name,
        status: cls.status,
        type: cls.type,
        url: cls.url,
        description: cls.description,
        startDate: cls.startDate,
        endDate: cls.endDate,
        courseId: cls.courseId,
        teacherId: cls.teacherId,
        semesterId: cls.semesterId,
        expectedLessons: cls.expectedLessons,
        weeklySchedules: entry.previousWeeklySchedules,
        students: (cls.studentClasses || []).map((sc: any) => ({
          studentId: sc.studentId,
          enrollType: sc.enrollType ?? 0,
        })),
      };

      const updateRes = await classApi.update(cls.id, saveDto);
      if (updateRes.success) {
        showToast(t("classSchedules.toastUndoDbSuccess", { classCode: entry.classCode, defaultValue: `Đã hoàn tác thay đổi lịch lớp ${entry.classCode}!` }), "success");
      } else {
        revertOptimisticState();
        const errMsg = updateRes.message ? getFriendlyRoomError(updateRes.message) : t("classSchedules.toastUpdateError", { defaultValue: "Lỗi khi cập nhật lịch lớp học." });
        showToast(errMsg, "error");
      }
    } catch {
      revertOptimisticState();
      showToast(t("classSchedules.toastUpdateError", { defaultValue: "Có lỗi xảy ra khi cập nhật lịch." }), "error");
    } finally {
      setUndoingDbMove(false);
    }
  };

  // ── Edit Mode handlers ────────────────────────────────────────────────────
  const handleToggleEditMode = () => {
    setIsEditMode(prev => !prev);
    setDbUndoStack([]);
  };

  const handleSemesterChange = (semesterId: any) => {
    const semId = semesterId ? Number(semesterId) : null;
    setSelectedSemesterId(semId);

    // If a semester is selected, move the calendar's weekStart to its startDate
    if (semId !== null) {
      const selectedSem = semesters.find((s) => s.id === semId);
      if (selectedSem && selectedSem.startDate) {
        setWeekStart(getWeekStart(new Date(selectedSem.startDate)));
      }
    }

    if (selectedClassId !== null) {
      const currentClass = classes.find(c => c.id === Number(selectedClassId));
      if (currentClass && semId !== null && currentClass.semesterId !== semId) {
        setSelectedClassId(null);
      }
    }
  };

  // Parse backend room-specific error codes into user-friendly messages.
  // Mirrors the same logic used in ClassForm.getFriendlyErrorMessage.
  const getFriendlyRoomError = (msg: string): string => {
    if (msg.startsWith("ERR_ROOM_CONFLICT_")) {
      const classCode = msg.replace("ERR_ROOM_CONFLICT_", "");
      return t("class.errRoomConflict", {
        classCode,
        defaultValue: `Phòng đã được sử dụng bởi lớp ${classCode} trong cùng khung giờ này.`,
      });
    }
    if (msg.startsWith("ERR_ROOM_CAPACITY_EXCEEDED_")) {
      const roomName = msg.replace("ERR_ROOM_CAPACITY_EXCEEDED_", "");
      return t("class.errRoomCapacityExceeded", {
        roomName,
        defaultValue: `Sức chứa phòng ${roomName} không đủ cho số lượng học viên của lớp.`,
      });
    }
    if (msg === "ERR_TEACHER_UNAVAILABLE") {
      return t("class.errTeacherUnavailable", {
        defaultValue: "Giáo viên không rảnh trong khoảng thời gian đã chọn của học kỳ.",
      });
    }
    if (msg === "ERR_TEACHER_GRADE_LEVEL_INSUFFICIENT") {
      return t("class.errTeacherGradeLevel", {
        defaultValue: "Giáo viên chưa đạt band điểm yêu cầu tối thiểu của khóa học.",
      });
    }
    if (msg === "ERR_TEACHER_CONFLICT" || msg.startsWith("ERR_TEACHER_CONFLICT_")) {
      const classCode = msg.includes("_") ? msg.replace("ERR_TEACHER_CONFLICT_", "") : "";
      return t("class.errTeacherConflict", {
        classCode,
        defaultValue: classCode
          ? `Giáo viên đã có lịch dạy lớp ${classCode} trong cùng khung giờ này.`
          : "Giáo viên đã có lịch dạy lớp khác trong cùng khung giờ này.",
      });
    }
    if (msg.startsWith("ERR_STUDENT_CONFLICT_")) {
      const parts = msg.replace("ERR_STUDENT_CONFLICT_", "").split("__");
      const emailsStr = parts[1] || "";
      return t("class.errStudentConflictCalendar", {
        emails: emailsStr,
        defaultValue: `Học viên (${emailsStr}) bị trùng lịch học ở lớp khác vào khung giờ này.`,
      });
    }
    return t(`backendMessages.${msg}`, { defaultValue: msg });
  };

  // ── Slot edit handler (Edit Mode: Room & Teacher for a specific session) ──
  const handleSaveSlot = useCallback(async (
    event: ScheduleEvent,
    newRoomId: number | null,
    newRoomName: string,
    newTeacherId: number | null,
    newTeacherName: string
  ) => {
    setEditRoomSaving(true);
    const prevEvents = [...events];

    // Optimistic update for this specific session
    const optimisticEvents = events.map(ev =>
      ev.id === event.id
        ? {
            ...ev,
            roomName: newRoomName,
            roomId: newRoomId,
            teacherId: newTeacherId,
            teacherName: newTeacherName,
          }
        : ev
    );
    setEvents(optimisticEvents);
    setEditRoomTarget(null);

    try {
      if (event.isDraft) {
        setDraftEvents(prev =>
          prev.map(ev =>
            ev.id === event.id
              ? {
                  ...ev,
                  roomName: newRoomName,
                  roomId: newRoomId,
                  teacherId: newTeacherId,
                  teacherName: newTeacherName,
                }
              : ev
          )
        );
        showToast(t("classSchedules.toastSlotDraftSuccess", { defaultValue: "Đã cập nhật buổi học (bản nháp) thành công!" }), "success");
        return;
      }

      const scheduleId = Number(event.id);
      const updateRes = await commonApi.updateScheduleSlot(scheduleId, {
        roomId: newRoomId,
        teacherId: newTeacherId,
      });

      if (updateRes.success) {
        showToast(t("classSchedules.toastSlotSaveSuccess", {
          classCode: event.classCode,
          defaultValue: `Đã cập nhật buổi học lớp ${event.classCode} thành công!`
        }), "success");
      } else {
        setEvents(prevEvents); // revert
        const errMsg = updateRes.message
          ? getFriendlyRoomError(updateRes.message)
          : t("classSchedules.toastUpdateError", { defaultValue: "Lỗi khi cập nhật buổi học." });
        showToast(errMsg, "error");
      }
    } catch {
      setEvents(prevEvents); // revert
      showToast(t("classSchedules.toastUpdateError", { defaultValue: "Có lỗi xảy ra khi cập nhật." }), "error");
    } finally {
      setEditRoomSaving(false);
    }
  }, [events, t]);

  // Combined events = real DB events + draft overlay
  const rawDisplayEvents = [...events, ...draftEvents];
  const allDisplayEvents = selectedSemesterId === null
    ? rawDisplayEvents
    : rawDisplayEvents.filter(ev => {
        if (ev.semesterId) {
          return ev.semesterId === selectedSemesterId;
        }
        const cls = classes.find(c => c.code === ev.classCode);
        return cls?.semesterId === selectedSemesterId;
      });

  const handleEventClick = (ev: ScheduleEvent) => {
    // In Edit Mode, clicking a non-draft DB event opens the Slot Edit modal
    if (isEditMode && !ev.isDraft) {
      if (isPastSlot(ev.scheduleDate, ev.endTime)) {
        showToast(t("classSchedules.cannotEditPastSlot", { defaultValue: "Buổi học trong quá khứ không thể chỉnh sửa." }), "error");
        setSelectedEvent(ev);
        openModal();
        return;
      }
      setEditRoomTarget(ev);
      return;
    }
    setSelectedEvent(ev);
    openModal();
  };

  const handleGenerate = async (params: {
    semesterId: number;
    maxClassSize: number;
    minClassSize: number;
    sessionsPerWeek: number;
    timePreferences: string[];
    allowConsecutiveDays: boolean;
    allowWeekend: boolean;
    teacherIds?: number[];
    roomIds?: number[];
  }) => {
    setScheduleLoading(true);
    const startTime = Date.now();
    try {
      const res = await classApi.autoScheduleSemester({
        semesterId: params.semesterId,
        maxClassSize: params.maxClassSize,
        minClassSize: params.minClassSize,
        constraints: {
          sessionsPerWeek: params.sessionsPerWeek,
          timePreferences: params.timePreferences,
          allowWeekend: params.allowWeekend,
          teacherIds: params.teacherIds,
          roomIds: params.roomIds,
        },
      });

      // Ensure loading state runs for at least 4.5 seconds to complete loading steps transitions visually
      const elapsedTime = Date.now() - startTime;
      const minDelay = 4500;
      if (elapsedTime < minDelay) {
        await new Promise((resolve) => setTimeout(resolve, minDelay - elapsedTime));
      }

      if (res.success && res.data) {
        const draftList = res.data.classes;
        const reliability = res.data.reliability ?? null;
        setDraftClasses(draftList);
        setScheduleReliability(reliability);
        setDraftSemesterId(params.semesterId);
        localStorage.setItem("semester_draft_classes", JSON.stringify(draftList));
        localStorage.setItem("semester_original_draft_classes", JSON.stringify(draftList));
        localStorage.setItem("semester_draft_id", String(params.semesterId));
        if (reliability) {
          localStorage.setItem("semester_draft_reliability", JSON.stringify(reliability));
        } else {
          localStorage.removeItem("semester_draft_reliability");
        }
        const newDraftEvents = draftList.flatMap((cls) => mapDraftClass(cls));
        setDraftEvents(newDraftEvents);
        setShowScheduleModal(false);
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: "Tạo lịch nháp học kỳ thành công! Hãy kiểm tra trên lịch." }) : "Tạo lịch nháp học kỳ thành công! Hãy kiểm tra trên lịch.", "success");
        // Navigate to the semester start week
        if (draftList.length > 0 && draftList[0].startDate) {
          setWeekStart(getWeekStart(new Date(draftList[0].startDate)));
        }
      } else if (res.message === "ERR_SCHEDULE_INFEASIBLE" && res.data?.infeasibilityReasons?.length) {
        const reasonTexts = res.data.infeasibilityReasons.map((r) =>
          t(`backendMessages.infeasibilityReasons.${r.code}`, { ...r.params, defaultValue: r.code })
        );
        showToast(reasonTexts.join(" "), "error");
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("classSchedules.toastDraftGenerateError", { defaultValue: "Xếp lịch thất bại do xung đột ràng buộc hoặc bận lịch giáo viên." }), "error");
      }
    } catch (err: any) {
      showToast(t("classSchedules.toastDraftSystemError", { defaultValue: "Có lỗi hệ thống xảy ra khi lập lịch tự động." }), "error");
    } finally {
      setScheduleLoading(false);
    }
  };

  // Commit draft to DB
  const handleSaveDraft = async () => {
    if (!draftClasses || !draftSemesterId) return;
    setSaveLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const weeklySchedulesOf = (cls: ClassItem): any[] => {
        try {
          return cls.weeklySchedulesJson ? JSON.parse(cls.weeklySchedulesJson) : [];
        } catch { return []; }
      };

      const res = await classApi.saveScheduleDraft({
        semesterId: draftSemesterId,
        classes: draftClasses.map((cls) => ({
          code: cls.code,
          name: cls.name,
          courseId: cls.courseId ?? 0,
          teacherId: cls.teacherId ?? 0,
          enrollType: cls.type ?? 0,
          expectedLessons: cls.expectedLessons ?? 30,
          weeklySchedules: weeklySchedulesOf(cls),
          students: (cls.studentClasses || []).map((sc) => ({
            studentId: sc.studentId,
            enrollType: sc.enrollType ?? 0,
          })),
        })),
      });

      if (res.success) {
        setDraftClasses(null);
        setDraftEvents([]);
        setDraftSemesterId(null);
        setDraftUndoStack([]);
        setScheduleReliability(null);
        localStorage.removeItem("semester_draft_classes");
        localStorage.removeItem("semester_original_draft_classes");
        localStorage.removeItem("semester_draft_id");
        localStorage.removeItem("semester_draft_reliability");
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: "Lưu chính thức thời khóa biểu thành công!" }) : "Lưu chính thức thời khóa biểu thành công!", "success");
        // Reload classes + schedules from DB — must refresh `classes` too, not just `events`,
        // since the semester filter falls back to looking up each event's class in `classes`
        // (freshly-created classes wouldn't be found there otherwise, hiding them from the filter).
        setReloadTrigger((prev) => prev + 1);
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("classSchedules.toastSaveDraftError", { defaultValue: "Không thể lưu bản cơ sở lịch học." }), "error");
      }
    } catch (err: any) {
      showToast(t("classSchedules.toastSaveDraftSystemError", { defaultValue: "Lỗi hệ thống xảy ra khi lưu lịch học." }), "error");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancelDraft = () => {
    setDraftClasses(null);
    setDraftEvents([]);
    setDraftSemesterId(null);
    setDraftUndoStack([]);
    setScheduleReliability(null);
    localStorage.removeItem("semester_draft_classes");
    localStorage.removeItem("semester_original_draft_classes");
    localStorage.removeItem("semester_draft_id");
    localStorage.removeItem("semester_draft_reliability");
    showToast(t("classSchedules.toastCancelDraftSuccess", { defaultValue: "Đã hủy bản cơ sở lịch học hiện tại." }), "success");
  };

  const handleRevertDraft = () => {
    const originalClasses = localStorage.getItem("semester_original_draft_classes");
    if (originalClasses) {
      try {
        const parsedClasses = JSON.parse(originalClasses);
        setDraftClasses(parsedClasses);
        setDraftUndoStack([]);
        localStorage.setItem("semester_draft_classes", originalClasses);
        const newDraftEvents = parsedClasses.flatMap((cls: ClassItem) => mapDraftClass(cls));
        setDraftEvents(newDraftEvents);
        showToast(t("classSchedules.toastRevertDraftSuccess", { defaultValue: "Đã khôi phục về bản lịch gốc ban đầu!" }), "success");
        if (parsedClasses.length > 0 && parsedClasses[0].startDate) {
          setWeekStart(getWeekStart(new Date(parsedClasses[0].startDate)));
        }
      } catch (e) {
        console.error("Failed to parse original draft classes", e);
        showToast("Lỗi khi giải nén lịch gốc.", "error");
      }
    } else {
      showToast("Không tìm thấy dữ liệu bản lịch gốc để khôi phục.", "error");
    }
  };

  const handleOpenVersionPicker = async () => {
    if (!selectedSemesterId) return;
    setSelectedVersionId(null);
    setShowVersionPickerModal(true);
    setVersionsLoading(true);
    try {
      const res = await classApi.getScheduleVersions(selectedSemesterId);
      setScheduleVersions(res.success && res.data ? res.data : []);
      if (!res.success) {
        showToast(
          res.message
            ? t(`backendMessages.${res.message}`, { defaultValue: res.message })
            : t("classSchedules.toastLoadVersionsError", { defaultValue: "Không tải được danh sách phiên bản." }),
          "error"
        );
      }
    } catch {
      setScheduleVersions([]);
      showToast(t("classSchedules.toastLoadVersionsError", { defaultValue: "Không tải được danh sách phiên bản." }), "error");
    } finally {
      setVersionsLoading(false);
    }
  };

  const executeRollback = async () => {
    if (!selectedSemesterId || !selectedVersionId) return;
    setRollbackLoading(true);
    try {
      const res = await classApi.rollbackSemesterSchedule(selectedSemesterId, selectedVersionId);
      if (res.success) {
        showToast(
          res.message
            ? t(`backendMessages.${res.message}`, { defaultValue: "Khôi phục lịch học thành công!" })
            : "Khôi phục lịch học thành công!",
          "success"
        );
        setShowVersionPickerModal(false);
        setDbUndoStack([]); // stale: referenced class Ids no longer exist post-rollback
        setDraftUndoStack([]);
        setReloadTrigger((prev) => prev + 1); // trigger calendar reload
      } else {
        showToast(
          res.message
            ? t(`backendMessages.${res.message}`, { defaultValue: res.message })
            : t("classSchedules.toastRollbackError", { defaultValue: "Khôi phục lịch thất bại." }),
          "error"
        );
      }
    } catch (err: any) {
      showToast(t("classSchedules.toastRollbackSystemError", { defaultValue: "Lỗi hệ thống xảy ra khi khôi phục lịch." }), "error");
    } finally {
      setRollbackLoading(false);
    }
  };

  const handleDeleteVersion = async (versionId: number) => {
    setDeletingVersionId(versionId);
    try {
      const res = await classApi.deleteScheduleVersion(versionId);
      if (res.success) {
        setScheduleVersions((prev) => prev.filter((v) => v.id !== versionId));
        if (selectedVersionId === versionId) setSelectedVersionId(null);
        showToast(t("classSchedules.toastDeleteVersionSuccess", { defaultValue: "Đã xóa phiên bản." }), "success");
      } else {
        showToast(
          res.message
            ? t(`backendMessages.${res.message}`, { defaultValue: res.message })
            : t("classSchedules.toastDeleteVersionError", { defaultValue: "Xóa phiên bản thất bại." }),
          "error"
        );
      }
    } catch {
      showToast(t("classSchedules.toastDeleteVersionError", { defaultValue: "Xóa phiên bản thất bại." }), "error");
    } finally {
      setDeletingVersionId(null);
    }
  };

  const fetchCandidateVersionEvents = async (versionId: number): Promise<ScheduleEvent[] | null> => {
    try {
      const res = await classApi.getScheduleVersionPreview(versionId);
      if (res.success && res.data) {
        return res.data.flatMap((cls) => mapDraftClass(cls));
      }
      showToast(
        res.message
          ? t(`backendMessages.${res.message}`, { defaultValue: res.message })
          : t("classSchedules.toastPreviewError", { defaultValue: "Không thể tải xem trước phiên bản." }),
        "error"
      );
      return null;
    } catch {
      showToast(t("classSchedules.toastPreviewError", { defaultValue: "Không thể tải xem trước phiên bản." }), "error");
      return null;
    }
  };

  const handleViewVersionSchedule = async (versionId: number, versionName: string) => {
    setVersionOnlyName(versionName);
    setVersionOnlyEvents([]);
    setShowVersionOnlyModal(true);
    setVersionOnlyLoading(true);
    const candidateEvents = await fetchCandidateVersionEvents(versionId);
    if (candidateEvents) {
      setVersionOnlyEvents(buildWeeklyPatternEvents(candidateEvents, getWeekStart(new Date())));
    }
    setVersionOnlyLoading(false);
  };

  const handlePreviewVersion = async (versionId: number, versionName: string) => {
    setPreviewVersionName(versionName);
    setPreviewEvents([]);
    setShowVersionPreviewModal(true);
    setPreviewLoading(true);
    const candidateEvents = await fetchCandidateVersionEvents(versionId);
    if (candidateEvents) {
      const currentLiveEvents = events.filter((ev) => {
        if (!selectedSemesterId) return false;
        if (ev.semesterId) return ev.semesterId === selectedSemesterId;
        const cls = classes.find((c) => c.code === ev.classCode);
        return cls?.semesterId === selectedSemesterId;
      });
      setPreviewEvents(buildScheduleDiffEvents(currentLiveEvents, candidateEvents, getWeekStart(new Date())));
    }
    setPreviewLoading(false);
  };

  const handleOpenSaveVersionModal = () => {
    setVersionNameInput("");
    setShowSaveVersionModal(true);
  };

  const executeSaveVersion = async () => {
    if (!selectedSemesterId || !versionNameInput.trim()) return;
    setSaveVersionLoading(true);
    try {
      const res = await classApi.saveScheduleVersion(selectedSemesterId, versionNameInput.trim());
      if (res.success) {
        showToast(t("classSchedules.toastSaveVersionSuccess", { defaultValue: "Đã lưu phiên bản lịch." }), "success");
        setShowSaveVersionModal(false);
      } else {
        showToast(
          res.message
            ? t(`backendMessages.${res.message}`, { defaultValue: res.message })
            : t("classSchedules.toastSaveVersionError", { defaultValue: "Lưu phiên bản thất bại." }),
          "error"
        );
      }
    } catch {
      showToast(t("classSchedules.toastSaveVersionError", { defaultValue: "Lưu phiên bản thất bại." }), "error");
    } finally {
      setSaveVersionLoading(false);
    }
  };

  // ── Month view ──────────────────────────────────────────────────────────────
  const fcEvents = allDisplayEvents.map((ev) => ({
    id: ev.id,
    title: ev.classCode,
    start: `${ev.scheduleDate}T${ev.startTime}:00`,
    end: `${ev.scheduleDate}T${ev.endTime}:00`,
    extendedProps: ev,
    backgroundColor: ev.isDraft ? "#fef3c7" : undefined,
    borderColor: ev.isDraft ? "#f59e0b" : undefined,
    editable: isEventEditable(ev),
  }));

  const renderMonthEvent = (info: { event: { extendedProps: Record<string, unknown> } }) => {
    const ev = info.event.extendedProps as unknown as ScheduleEvent;
    const slot = FIXED_SLOTS[ev.slotIndex] ?? FIXED_SLOTS[0];
    const color = ev.isDraft ? "bg-amber-100 border-amber-400 text-amber-900 border-dashed" : SLOT_COLORS[slot.index];
    return (
      <div className={`rounded px-1.5 py-0.5 text-[10px] font-bold border truncate cursor-pointer transition-all duration-150 ${color}`}>
        {ev.isDraft && <span className="mr-1 opacity-70">[{t("classSchedules.draftStatusLabel", { defaultValue: "Chưa lưu" })}]</span>}
        {ev.classCode}
      </div>
    );
  };

  const handleFcEventClick = (clickInfo: EventClickArg) => {
    const ev = clickInfo.event.extendedProps as unknown as ScheduleEvent;
    // In Edit Mode, non-draft events open Slot Edit modal
    if (isEditMode && !ev.isDraft) {
      if (isPastSlot(ev.scheduleDate, ev.endTime)) {
        showToast(t("classSchedules.cannotEditPastSlot", { defaultValue: "Buổi học trong quá khứ không thể chỉnh sửa." }), "error");
        setSelectedEvent(ev);
        openModal();
        return;
      }
      setEditRoomTarget(ev);
      return;
    }
    setSelectedEvent(ev);
    openModal();
  };

  const handleFcEventDrop = (info: any) => {
    const ev = info.event.extendedProps as ScheduleEvent;
    if (!ev.isDraft) {
      info.revert();
      return;
    }
    
    const newStart = info.event.start;
    if (!newStart) {
      info.revert();
      return;
    }
    
    const targetDate = toISO(newStart);
    const hours = String(newStart.getHours()).padStart(2, "0");
    const minutes = String(newStart.getMinutes()).padStart(2, "0");
    const timeStr = `${hours}:${minutes}`;
    let targetSlotIdx = resolveSlotIndex(timeStr);
    if (targetSlotIdx < 0) {
      targetSlotIdx = ev.slotIndex;
    }
    
    const success = handleMoveEvent(ev, targetDate, targetSlotIdx);
    if (!success) {
      info.revert();
    }
  };

  const classOptions = classes
    .filter((cls) => selectedSemesterId === null || cls.semesterId === selectedSemesterId)
    .map((cls) => ({
      value: cls.id,
      label: `${cls.code} - ${cls.name} (${cls.scheduleDisplay || t("classSchedules.noScheduleConfig", { defaultValue: "Chưa cấu hình lịch" })})`,
    }));

  const semesterOptions = semesters.map((sem) => ({
    value: sem.id,
    label: sem.name,
  }));

  const draftSemesterName = draftSemesterId
    ? semesters.find((s) => s.id === draftSemesterId)?.name ?? `Học kỳ #${draftSemesterId}`
    : "";

  return (
    <div className="space-y-4">
      {/* Toast Notification Container */}
      {mounted && typeof document !== "undefined" && createPortal(
        <div className="fixed bottom-5 right-5 z-[999999] flex flex-col gap-2 max-w-md w-full sm:w-auto">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl shadow-2xl border border-white/10 dark:border-black/5"
            >
              {t.type === "success" ? (
                <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="text-sm font-medium">{t.message}</span>
            </div>
          ))}
        </div>,
        document.body
      )}

      {/* Draft Confirmation Banner */}
      {draftClasses && draftClasses.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-2xl shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                {t("classSchedules.draftPendingTitle", { defaultValue: "Bản cơ sở lịch học đang chờ xác nhận" })}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                {t("classSchedules.draftSemesterPrefix", { defaultValue: "Học kỳ: " })}<strong>{draftSemesterName}</strong> — {t("classSchedules.draftClassesCreated", { count: draftClasses.length, defaultValue: "lớp được tạo. Kiểm tra lịch trên Calendar rồi bấm Lưu nếu hài lòng." })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCancelDraft}
              className="px-4 py-2 rounded-xl border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-sm font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              {t("classSchedules.cancelDraft", { defaultValue: "Hủy bản cơ sở" })}
            </button>
            <button
              onClick={handleRevertDraft}
              className="px-4 py-2 rounded-xl border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-sm font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              {t("classSchedules.revertDraft", { defaultValue: "Khôi phục gốc" })}
            </button>
            <button
              onClick={handleUndoDraftMove}
              disabled={draftUndoStack.length === 0}
              title={draftUndoStack.length === 0 ? t("classSchedules.noUndoAvailable", { defaultValue: "Không có thay đổi nào để hoàn tác" }) : undefined}
              className="px-4 py-2 rounded-xl border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-sm font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Undo2 className="w-4 h-4" />
              {t("classSchedules.undoBtn", { defaultValue: "Hoàn tác" })}
              {draftUndoStack.length > 0 && <span className="ml-0.5 text-[10px] font-bold opacity-70">({draftUndoStack.length})</span>}
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={saveLoading}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t("classSchedules.saveOfficial", { defaultValue: "Lưu chính thức" })}
            </button>
          </div>
        </div>
      )}

      {/* Schedule Reliability Report */}
      {draftClasses && draftClasses.length > 0 && scheduleReliability && (
        <ScheduleReliabilityCard report={scheduleReliability} />
      )}

      {/* Edit Mode Banner */}
      {isEditMode && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 bg-violet-50 dark:bg-violet-950/30 border border-violet-300 dark:border-violet-700 rounded-2xl shadow-sm">
          <div className="flex items-start gap-3">
            <Edit className="w-5 h-5 text-violet-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-violet-800 dark:text-violet-200">
                {t("classSchedules.editModeBannerTitle", { defaultValue: "Chế độ chỉnh sửa lịch đang BẬT" })}
              </p>
              <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">
                {editSaving
                  ? t("classSchedules.editModeSaving", { defaultValue: "Đang lưu thay đổi..." })
                  : t("classSchedules.editModeBannerHint", { defaultValue: "Kéo thả buổi học để đổi lịch · Nhấn vào buổi học để đổi phòng. Thay đổi được lưu ngay lập tức." })
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {editSaving && <Loader2 className="w-4 h-4 animate-spin text-violet-500" />}
            <button
              onClick={handleUndoDbMove}
              disabled={dbUndoStack.length === 0 || undoingDbMove}
              title={dbUndoStack.length === 0 ? t("classSchedules.noUndoAvailable", { defaultValue: "Không có thay đổi nào để hoàn tác" }) : undefined}
              className="px-4 py-2 rounded-xl border border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 text-sm font-semibold hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {undoingDbMove ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
              {t("classSchedules.undoBtn", { defaultValue: "Hoàn tác" })}
              {dbUndoStack.length > 0 && <span className="ml-0.5 text-[10px] font-bold opacity-70">({dbUndoStack.length})</span>}
            </button>
            {selectedSemesterId && (
              <button
                onClick={handleOpenSaveVersionModal}
                disabled={editSaving}
                className="px-4 py-2 rounded-xl border border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 text-sm font-semibold hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {t("classSchedules.saveVersionBtn", { defaultValue: "Lưu phiên bản lịch" })}
              </button>
            )}
            <button
              onClick={handleToggleEditMode}
              disabled={editSaving}
              className="px-4 py-2 rounded-xl border border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 text-sm font-semibold hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              {t("classSchedules.exitEditMode", { defaultValue: "Thoát chỉnh sửa" })}
            </button>
          </div>
        </div>
      )}

      {/* Top bar: class filter + view toggle + schedule button */}
      <div className="p-5 sm:p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:max-w-2xl">
          {/* Semester Filter */}
          <div className="flex flex-col gap-1.5 w-full sm:w-1/2">
            <label className="text-sm font-semibold text-gray-750 dark:text-gray-300">{t("classSchedules.semesterFilterLabel", { defaultValue: "Học kỳ:" })}</label>
            <SearchableSelect
              options={semesterOptions}
              value={selectedSemesterId || ""}
              onChange={handleSemesterChange}
              placeholder={t("classSchedules.allSemestersPlaceholder", { defaultValue: "Tất cả học kỳ" })}
              onClear={() => handleSemesterChange(null)}
            />
          </div>

          {/* Class Filter */}
          <div className="flex flex-col gap-1.5 w-full sm:w-1/2">
            <label className="text-sm font-semibold text-gray-750 dark:text-gray-300">{t("classSchedules.classFilterLabel", { defaultValue: "Lớp học:" })}</label>
            <SearchableSelect
              options={classOptions}
              value={selectedClassId || ""}
              onChange={(val) => setSelectedClassId(val)}
              placeholder={t("classSchedules.allClassesPlaceholder", { defaultValue: "Tất cả các lớp" })}
              onClear={() => setSelectedClassId(null)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {classDetail && (
            <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-850 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-xs">
              <span className="font-semibold text-gray-700 dark:text-gray-300">{classDetail.teacherName || t("classSchedules.unassigned", { defaultValue: "Chưa phân công" })}</span>
              <span className="mx-1.5 text-gray-300">·</span>
              <span>{t("classSchedules.lessonsCount", { count: classDetail.expectedLessons, defaultValue: "buổi" })}</span>
            </div>
          )}

          {/* Edit Mode button — disabled when temp schedule is active */}
          <button
            type="button"
            onClick={handleToggleEditMode}
            disabled={!!(draftClasses && draftClasses.length > 0)}
            title={draftClasses?.length ? t("classSchedules.editModeDisabledHint", { defaultValue: "Không thể chỉnh sửa khi đang có lịch nháp" }) : undefined}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm
              ${isEditMode
                ? "bg-violet-600 hover:bg-violet-700 text-white"
                : "border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <Edit className="w-4 h-4" />
            {isEditMode
              ? t("classSchedules.editModeActiveBtn", { defaultValue: "Đang chỉnh sửa" })
              : t("classSchedules.editModeBtn", { defaultValue: "Chỉnh sửa lịch" })
            }
          </button>

          {/* Auto Schedule button — disabled when Edit Mode is ON */}
          <button
            type="button"
            onClick={() => setShowScheduleModal(true)}
            disabled={isEditMode}
            title={isEditMode ? t("classSchedules.autoScheduleDisabledHint", { defaultValue: "Không thể xếp lịch tự động khi đang ở chế độ chỉnh sửa" }) : undefined}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CalendarClock className="w-4 h-4" />
            {t("classSchedules.autoScheduleBtn", { defaultValue: "Xếp lịch tự động" })}
          </button>

          {/* Rollback To Schedule Version button */}
          {selectedSemesterId && !(draftClasses && draftClasses.length > 0) && (
            <button
              type="button"
              onClick={handleOpenVersionPicker}
              disabled={rollbackLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-sm font-semibold transition-colors shadow-sm disabled:opacity-40"
            >
              {rollbackLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <History className="w-4 h-4" />}
              {t("classSchedules.rollbackSemesterBtn", { defaultValue: "Khôi phục theo phiên bản" })}
            </button>
          )}

          <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-850">
            <button
              type="button"
              onClick={() => setView("week")}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${view === "week" ? "bg-brand-500 text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
            >
              {t("classSchedules.week", { defaultValue: "Tuần" })}
            </button>
            <button
              type="button"
              onClick={() => setView("month")}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${view === "month" ? "bg-brand-500 text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
            >
              {t("classSchedules.month", { defaultValue: "Tháng" })}
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      {(draftClasses && draftClasses.length > 0) || isEditMode ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400">
          {draftClasses && draftClasses.length > 0 && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-3 rounded border-2 border-dashed border-amber-400 bg-amber-100"></span>
                {t("classSchedules.legendDraft", { defaultValue: "Lịch nháp chưa lưu" })}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-3 rounded border border-sky-300 bg-sky-50"></span>
                {t("classSchedules.legendSaved", { defaultValue: "Lịch đã lưu" })}
              </span>
            </>
          )}
          {isEditMode && (
            <span className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400 font-semibold">
              <Edit className="w-3.5 h-3.5" />
              {t("classSchedules.legendEditMode", { defaultValue: "Chế độ chỉnh sửa — kéo thả để di chuyển buổi học" })}
            </span>
          )}
        </div>
      ) : null}

      {/* Calendar area */}
      <div className="relative rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
        {editSaving && (
          <div className="absolute inset-0 bg-white/60 dark:bg-black/60 z-50 flex items-center justify-center backdrop-blur-[1px] transition-all">
            <div className="flex flex-col items-center gap-3 px-5 py-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl max-w-xs text-center animate-fadeIn">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                {t("classSchedules.editModeSaving", { defaultValue: "Đang lưu thay đổi..." })}
              </p>
            </div>
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
          </div>
        ) : view === "week" ? (
          <div>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setWeekStart((w) => addDays(w, -7))}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  {t("classSchedules.weekLabel", { defaultValue: "Tuần: " })}{formatWeekLabel(weekStart)}
                </span>
                <button
                  type="button"
                  onClick={() => setWeekStart(getWeekStart(new Date()))}
                  className="px-3 py-1 text-xs font-semibold rounded-lg border border-brand-300 text-brand-600 dark:text-brand-400 dark:border-brand-700 hover:bg-brand-50 dark:hover:bg-brand-950/20 transition-colors"
                >
                  {t("classSchedules.today", { defaultValue: "Hôm nay" })}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setWeekStart((w) => addDays(w, 7))}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
              {FIXED_SLOTS.map((s) => (
                <span key={s.index} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${SLOT_COLORS[s.index]}`}>
                  {t(`classSchedules.ca${s.index + 1}`, { defaultValue: s.label })} · {s.time}
                </span>
              ))}
            </div>

            <div className="p-4">
              <WeekGrid
                events={allDisplayEvents}
                weekStart={weekStart}
                onEventClick={handleEventClick}
                onEventDrop={handleMoveEvent}
                isEventEditable={isEventEditable}
              />
            </div>
          </div>
        ) : (
          <div className="p-5 schedules-calendar-main">
            <FullCalendar
              key={toISO(weekStart)}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              initialDate={weekStart}
              locale="vi"
              buttonText={{ today: "Hôm nay", month: "Tháng" }}
              headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
              events={fcEvents}
              selectable={false}
              editable={!editSaving && (isEditMode || !!(draftClasses && draftClasses.length > 0))}
              eventStartEditable={!editSaving}
              eventDurationEditable={false}
              eventDrop={handleFcEventDrop}
              eventClick={handleFcEventClick}
              eventContent={renderMonthEvent}
              height="auto"
            />
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal isOpen={isOpen} onClose={closeModal} showCloseButton={false} className="max-w-[580px] p-6 lg:p-8">
        {selectedEvent && (() => {
          const targetClass = classes.find(c => c.code === selectedEvent.classCode || c.id === selectedEvent.classId);
          const studentCount = selectedEvent.studentCount ?? targetClass?.studentCount ?? (classDetail?.studentClasses?.length ?? 0);
          const classType = selectedEvent.classType ?? targetClass?.type ?? (classDetail?.type ?? 0);
          const isOnline = classType === 1;
          const displayRoom = isOnline
            ? t("classSchedules.onlineNoRoom", { defaultValue: "Trực tuyến (Online)" })
            : (selectedEvent.roomName || "N/A");

          return (
            <div className="flex flex-col">
              <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <h5 className="font-bold text-gray-900 dark:text-white text-lg sm:text-xl">
                    {selectedEvent.isDraft
                      ? t("classSchedules.draftSessionTitle", { lessonNo: selectedEvent.lessonNo, defaultValue: `📋 Lịch Nháp — Chi Tiết Buổi Học ${selectedEvent.lessonNo}` })
                      : t("classSchedules.sessionTitle", { lessonNo: selectedEvent.lessonNo, defaultValue: `Chi Tiết Buổi Học ${selectedEvent.lessonNo}` })}
                  </h5>
                  {selectedEvent.isDraft && (
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full border bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700">
                      {t("classSchedules.draftStatusLabel", { defaultValue: "Chưa lưu" })}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {t("classSchedules.classPrefix", { defaultValue: "Lớp: " })}<strong className="text-gray-700 dark:text-gray-200">{selectedEvent.classCode} – {selectedEvent.className}</strong>
                </p>
              </div>

              <div className="mt-6 space-y-4">
                {[
                  {
                    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
                    label: t("classSchedules.dateLabel", { defaultValue: "Ngày học" }),
                    value: selectedEvent.scheduleDate,
                  },
                  {
                    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
                    label: t("classSchedules.timeLabel", { defaultValue: "Khung giờ" }),
                    value: `${t(`classSchedules.ca${selectedEvent.slotIndex + 1}`, { defaultValue: FIXED_SLOTS[selectedEvent.slotIndex]?.label ?? "" })} · ${selectedEvent.startTime} – ${selectedEvent.endTime}`,
                  },
                  {
                    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
                    label: t("classSchedules.roomLabel", { defaultValue: "Phòng học" }),
                    value: displayRoom,
                  },
                  {
                    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
                    label: t("classSchedules.teacherLabel", { defaultValue: "Giáo viên" }),
                    value: selectedEvent.teacherName,
                  },
                  {
                    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
                    label: t("classSchedules.studentCountLabel", { defaultValue: "Số lượng học viên" }),
                    value: `${studentCount} học viên`,
                  },
                  {
                    icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
                    label: t("classSchedules.classTypeLabel", { defaultValue: "Hình thức học" }),
                    value: isOnline ? t("class.typeOnline", { defaultValue: "Trực tuyến (Online)" }) : t("class.typeOffline", { defaultValue: "Trực tiếp (Offline)" }),
                  },
                  {
                    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
                    label: t("classSchedules.classStatusLabel", { defaultValue: "Trạng thái lớp học" }),
                    value: getClassStatus(selectedEvent.classStatus ?? 0, t).text,
                  },
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
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={closeModal}
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-850 dark:border-gray-700 dark:hover:bg-gray-750 transition-colors"
                >
                  {t("classSchedules.btnClose", { defaultValue: "Đóng" })}
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Edit Slot Modal (Room & Teacher) (Edit Mode only) */}
      <EditSlotModal
        isOpen={editRoomTarget !== null}
        onClose={() => setEditRoomTarget(null)}
        event={editRoomTarget}
        rooms={rooms}
        classes={classes}
        onSave={handleSaveSlot}
        saving={editRoomSaving}
      />

      {/* Auto-Schedule Modal */}
      <AutoScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        semesters={semesters}
        onGenerate={handleGenerate}
        loading={scheduleLoading}
        showToast={showToast}
      />

      {/* Schedule Version Picker Modal (rollback to a chosen version) */}
      <Modal
        isOpen={showVersionPickerModal}
        onClose={() => setShowVersionPickerModal(false)}
        showCloseButton={true}
        className="max-w-[500px] p-6 lg:p-8"
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 rounded-xl text-rose-500 border border-rose-100 dark:border-rose-900/30">
              <History className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white">
              {t("classSchedules.versionPickerTitle", { defaultValue: "Chọn phiên bản để khôi phục" })}
            </h4>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("classSchedules.versionPickerHint", { defaultValue: "Toàn bộ lịch học hiện tại của học kỳ sẽ được thay thế bằng phiên bản bạn chọn." })}
          </p>

          <div className="mt-4 max-h-72 overflow-y-auto flex flex-col gap-2">
            {versionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : scheduleVersions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                {t("classSchedules.versionPickerEmpty", { defaultValue: "Chưa có phiên bản lịch nào được lưu cho học kỳ này." })}
              </p>
            ) : (
              scheduleVersions.map((v) => (
                <label
                  key={v.id}
                  className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedVersionId === v.id
                      ? "border-rose-400 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-700"
                      : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-850"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="radio"
                      name="scheduleVersion"
                      checked={selectedVersionId === v.id}
                      onChange={() => setSelectedVersionId(v.id)}
                      className="accent-rose-500"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{v.name}</p>
                        {v.isAutoSaved && (
                          <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            {t("classSchedules.autoVersionBadge", { defaultValue: "Tự động" })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {new Date(v.createdAt).toLocaleString()} · {t("classSchedules.versionClassCount", { count: v.classCount, defaultValue: "{{count}} lớp" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        handleViewVersionSchedule(v.id, v.name);
                      }}
                      title={t("classSchedules.previewVersionBtn", { defaultValue: "Xem lịch phiên bản" })}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        handlePreviewVersion(v.id, v.name);
                      }}
                      title={t("classSchedules.compareVersionBtn", { defaultValue: "So sánh với lịch hiện tại" })}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
                    >
                      <GitCompare className="w-4 h-4" />
                    </button>
                    {v.isAutoSaved ? (
                      <span
                        title={t("classSchedules.cannotDeleteAutoVersionHint", { defaultValue: "Không thể xóa bản gốc tự động" })}
                        className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600"
                      >
                        <Lock className="w-4 h-4" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteVersion(v.id);
                        }}
                        disabled={deletingVersionId === v.id}
                        title={t("classSchedules.deleteVersionBtn", { defaultValue: "Xóa phiên bản" })}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors disabled:opacity-40"
                      >
                        {deletingVersionId === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>

          <div className="flex items-center justify-center gap-3 mt-6 w-full pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setShowVersionPickerModal(false)}
              type="button"
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-850 dark:border-gray-700 dark:hover:bg-gray-750 transition-colors w-1/2"
            >
              {t("classSchedules.btnCancel", { defaultValue: "Hủy" })}
            </button>
            <button
              onClick={executeRollback}
              disabled={!selectedVersionId || rollbackLoading}
              type="button"
              className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm w-1/2 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {rollbackLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("classSchedules.btnConfirmRollback", { defaultValue: "Xác nhận khôi phục" })}
            </button>
          </div>
        </div>
      </Modal>

      {/* Schedule Version Preview Modal */}
      <Modal
        isOpen={showVersionPreviewModal}
        onClose={() => setShowVersionPreviewModal(false)}
        showCloseButton={true}
        className="max-w-[1700px] p-6 lg:p-8"
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-violet-50 dark:bg-violet-950/20 rounded-xl text-violet-500 border border-violet-100 dark:border-violet-900/30">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                {t("classSchedules.previewModalTitle", { defaultValue: "So sánh với lịch hiện tại" })}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("classSchedules.previewModalSubtitle", { name: previewVersionName, defaultValue: `Phiên bản: ${previewVersionName}` })}
              </p>
            </div>
          </div>

          <div className="mt-4">
            {previewLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : previewEvents.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-16">
                {t("classSchedules.previewEmpty", { defaultValue: "Không có buổi học nào để hiển thị." })}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-4 mb-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" />
                    {t("classSchedules.diffLegendAdded", { defaultValue: "Sẽ thêm nếu khôi phục" })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded border border-dashed border-rose-400 bg-rose-50 dark:bg-rose-950/30" />
                    {t("classSchedules.diffLegendRemoved", { defaultValue: "Sẽ mất nếu khôi phục" })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded border border-sky-200 bg-sky-50 dark:bg-sky-950/30" />
                    {t("classSchedules.diffLegendUnchanged", { defaultValue: "Giữ nguyên" })}
                  </span>
                </div>
                <WeekGrid
                  events={previewEvents}
                  weekStart={getWeekStart(new Date())}
                  onEventClick={() => {}}
                  isEventEditable={() => false}
                  showDates={false}
                />
              </>
            )}
          </div>

          <div className="flex items-center justify-end mt-6 w-full pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setShowVersionPreviewModal(false)}
              type="button"
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-850 dark:border-gray-700 dark:hover:bg-gray-750 transition-colors"
            >
              {t("classSchedules.btnClose", { defaultValue: "Đóng" })}
            </button>
          </div>
        </div>
      </Modal>

      {/* Version Schedule Modal (standalone, no comparison) */}
      <Modal
        isOpen={showVersionOnlyModal}
        onClose={() => setShowVersionOnlyModal(false)}
        showCloseButton={true}
        className="max-w-[1700px] p-6 lg:p-8"
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-brand-50 dark:bg-brand-950/20 rounded-xl text-brand-500 border border-brand-100 dark:border-brand-900/30">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                {t("classSchedules.versionOnlyModalTitle", { defaultValue: "Lịch của phiên bản" })}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("classSchedules.previewModalSubtitle", { name: versionOnlyName, defaultValue: `Phiên bản: ${versionOnlyName}` })}
              </p>
            </div>
          </div>

          <div className="mt-4">
            {versionOnlyLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : versionOnlyEvents.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-16">
                {t("classSchedules.previewEmpty", { defaultValue: "Không có buổi học nào để hiển thị." })}
              </p>
            ) : (
              <WeekGrid
                events={versionOnlyEvents}
                weekStart={getWeekStart(new Date())}
                onEventClick={() => {}}
                isEventEditable={() => false}
                showDates={false}
              />
            )}
          </div>

          <div className="flex items-center justify-end mt-6 w-full pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setShowVersionOnlyModal(false)}
              type="button"
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-850 dark:border-gray-700 dark:hover:bg-gray-750 transition-colors"
            >
              {t("classSchedules.btnClose", { defaultValue: "Đóng" })}
            </button>
          </div>
        </div>
      </Modal>

      {/* Save Schedule Version Modal */}
      <Modal
        isOpen={showSaveVersionModal}
        onClose={() => setShowSaveVersionModal(false)}
        showCloseButton={false}
        className="max-w-[420px] p-6 lg:p-8"
      >
        <div className="flex flex-col items-center text-center">
          <div className="p-3.5 bg-violet-50 dark:bg-violet-950/20 rounded-2xl text-violet-500 mb-4 border border-violet-100 dark:border-violet-900/30">
            <Save className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-gray-900 dark:text-white">
            {t("classSchedules.saveVersionDialogTitle", { defaultValue: "Lưu phiên bản lịch học" })}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {t("classSchedules.saveVersionDialogHint", { defaultValue: "Đặt tên cho phiên bản lịch hiện tại để có thể khôi phục lại sau này." })}
          </p>
          <input
            type="text"
            value={versionNameInput}
            onChange={(e) => setVersionNameInput(e.target.value)}
            placeholder={t("classSchedules.versionNamePlaceholder", { defaultValue: "Ví dụ: Bản tôi thích" })}
            className="mt-4 w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-850 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
            maxLength={200}
          />
          <div className="flex items-center justify-center gap-3 mt-6 w-full pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setShowSaveVersionModal(false)}
              type="button"
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-850 dark:border-gray-700 dark:hover:bg-gray-750 transition-colors w-1/2"
            >
              {t("classSchedules.btnCancel", { defaultValue: "Hủy" })}
            </button>
            <button
              onClick={executeSaveVersion}
              disabled={!versionNameInput.trim() || saveVersionLoading}
              type="button"
              className="px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors shadow-sm w-1/2 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {saveVersionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t("classSchedules.btnConfirmSaveVersion", { defaultValue: "Lưu" })}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
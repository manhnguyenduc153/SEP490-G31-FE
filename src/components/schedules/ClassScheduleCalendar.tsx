"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventClickArg } from "@fullcalendar/core";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import { classApi, ClassItem, ClassScheduleItem } from "@/services/class.api";
import { semesterApi, SemesterItem } from "@/services/semester.api";
import { ChevronLeft, ChevronRight, CalendarClock, Save, X, Loader2, AlertTriangle, Cpu, Check, AlertCircle } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useTranslation } from "react-i18next";

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
  isDraft?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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
    classCode: s.classCode || fallbackClass?.code || "N/A",
    className: s.className || fallbackClass?.name || "N/A",
    lessonNo: s.lessonNo || 0,
    roomName: s.roomName || "N/A",
    teacherName: s.teacherName || fallbackClass?.teacherName || "Chưa phân công",
    teacherAvatar: s.teacherAvatar || fallbackClass?.teacherAvatar || null,
    startTime: st,
    endTime: s.endTime || "",
    status: s.status,
    note: s.note || null,
    scheduleDate: datePart,
    slotIndex: slotIdx,
    isDraft,
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
        classCode: cls.code,
        className: cls.name,
        lessonNo: s.lessonNo || 0,
        roomName: s.roomName || "—",
        teacherName: cls.teacherName || "—",
        teacherAvatar: cls.teacherAvatar || null,
        startTime: st,
        endTime: s.endTime || "",
        status: 0,
        note: null,
        scheduleDate: datePart,
        slotIndex: slotIdx,
        isDraft: true,
      } as ScheduleEvent;
    })
    .filter(Boolean) as ScheduleEvent[];
}

function getStatus(s: number, t: any) {
  const configs: Record<number, { text: string; color: string; dot: string }> = {
    0: { text: t("schedules.statusNotStarted", { defaultValue: "Chưa diễn ra" }), color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800", dot: "bg-blue-400" },
    1: { text: t("schedules.statusActive", { defaultValue: "Đang học" }),     color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800", dot: "bg-amber-400" },
    2: { text: t("schedules.statusCompleted", { defaultValue: "Đã hoàn thành" }), color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800", dot: "bg-green-400" },
    3: { text: t("schedules.statusCancelled", { defaultValue: "Đã hủy" }),       color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800", dot: "bg-red-400" },
  };
  return configs[s] ?? { text: t("schedules.statusUnknown", { defaultValue: "Không xác định" }), color: "bg-gray-100 text-gray-800 border-gray-200", dot: "bg-gray-400" };
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
}

function WeekGrid({ events, weekStart, onEventClick }: WeekGridProps) {
  const { t } = useTranslation();
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
    days.push({ date: d, iso: toISO(d), label: `${d.getDate()}/${d.getMonth() + 1}`, dayLabel: DAY_LABELS[dayOfWeek] });
  }

  const todayISO = toISO(new Date());

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
                  ${d.iso === todayISO
                    ? "bg-brand-500/10 text-brand-600 dark:text-brand-400"
                    : "bg-gray-50 dark:bg-gray-850 text-gray-500 dark:text-gray-400"}`}
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
            <tr key={slot.index} className="group">
              <td className="border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-850/60 px-3 py-5 align-top" style={{ height: "120px" }}>
                <p className="font-bold text-xs text-gray-700 dark:text-gray-300">{t(`classSchedules.ca${slot.index + 1}`, { defaultValue: slot.label })}</p>
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
                    <div className="flex flex-col gap-1 h-full">
                      {cellEvents.map((ev) => (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => onEventClick(ev)}
                          className={`w-full text-left rounded-lg border px-2 py-1.5 text-[11px] font-semibold leading-tight transition-all duration-150 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-px
                            ${ev.isDraft ? DRAFT_COLOR : SLOT_COLORS[slot.index]}`}
                        >
                          <span className="flex items-center gap-1">
                            <span className="block truncate font-bold">{ev.classCode}</span>
                          </span>
                          <span className="block truncate text-[10px] opacity-70 font-normal">{ev.className}</span>
                        </button>
                      ))}
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
  const [allowWeekend, setAllowWeekend] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const togglePref = (pref: string) => {
    setTimePreferences((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
    );
  };

  const selectedSemesterName = semesters.find(s => s.id === semesterId)?.name || "";
  const semesterOptions = semesters.map((s) => ({ value: s.id, label: `${s.code} — ${s.name}` }));

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
    onGenerate({
      semesterId,
      maxClassSize,
      minClassSize,
      sessionsPerWeek,
      timePreferences: timePreferences.map(p => p.toLowerCase()),
      allowConsecutiveDays,
      allowWeekend,
    });
  };

  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[600px] p-6 sm:p-8" showCloseButton={!loading}>
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

            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("semester.semesterLabel", { defaultValue: "Học kỳ" })} <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  options={semesterOptions}
                  value={semesterId || ""}
                  onChange={(val) => setSemesterId(val as number)}
                  placeholder="Chọn học kỳ..."
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
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-850 dark:text-gray-250 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:border-brand-300 focus:outline-hidden"
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
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-850 dark:text-gray-250 dark:border-gray-700 dark:bg-gray-900 dark:text-white cursor-pointer"
                >
                  <option value={1}>1 {t("semester.sessionPerWeekOption", { defaultValue: "buổi / tuần" })}</option>
                  <option value={2}>2 {t("semester.sessionPerWeekOption", { defaultValue: "buổi / tuần" })}</option>
                  <option value={3}>3 {t("semester.sessionPerWeekOption", { defaultValue: "buổi / tuần" })}</option>
                  <option value={4}>4 {t("semester.sessionPerWeekOption", { defaultValue: "buổi / tuần" })}</option>
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
                        onClick={() => togglePref(p)}
                        className={`flex-1 py-2 px-3 border text-xs font-semibold rounded-lg transition-all ${
                          active
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
                    checked={allowConsecutiveDays}
                    onChange={(e) => setAllowConsecutiveDays(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-650 dark:text-gray-300">
                    {t("semester.autoScheduleConsecutiveDays", { defaultValue: "Cho học liên tiếp" })}
                  </span>
                </label>

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
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
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

// ── Main component ────────────────────────────────────────────────────────────
export default function ClassScheduleCalendar() {
  const { t } = useTranslation();
  const { isOpen, openModal, closeModal } = useModal();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [semesters, setSemesters] = useState<SemesterItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [classDetail, setClassDetail] = useState<ClassItem | null>(null);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"week" | "month">("week");
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);

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
  const [draftSemesterId, setDraftSemesterId] = useState<number | null>(null);

  // Load classes and semesters
  useEffect(() => {
    setMounted(true);
    classApi.getAll(1, 1000).then((res) => {
      if (res.success && res.data) setClasses(res.data.items || []);
    });
    semesterApi.getAll().then((res) => {
      if (res.success && res.data) setSemesters(res.data);
    });
  }, []);

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
  }, [selectedClassId]);

  // Combined events = real DB events + draft overlay
  const allDisplayEvents = [...events, ...draftEvents];

  const handleEventClick = useCallback((ev: ScheduleEvent) => {
    setSelectedEvent(ev);
    openModal();
  }, [openModal]);

  const handleGenerate = async (params: {
    semesterId: number;
    maxClassSize: number;
    minClassSize: number;
    sessionsPerWeek: number;
    timePreferences: string[];
    allowConsecutiveDays: boolean;
    allowWeekend: boolean;
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
          allowConsecutiveDays: params.allowConsecutiveDays,
          allowWeekend: params.allowWeekend,
        },
      });

      // Ensure loading state runs for at least 4.5 seconds to complete loading steps transitions visually
      const elapsedTime = Date.now() - startTime;
      const minDelay = 4500;
      if (elapsedTime < minDelay) {
        await new Promise((resolve) => setTimeout(resolve, minDelay - elapsedTime));
      }

      if (res.success && res.data) {
        setDraftClasses(res.data);
        setDraftSemesterId(params.semesterId);
        const newDraftEvents = res.data.flatMap((cls) => mapDraftClass(cls));
        setDraftEvents(newDraftEvents);
        setShowScheduleModal(false);
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: "Tạo lịch nháp học kỳ thành công! Hãy kiểm tra trên lịch." }) : "Tạo lịch nháp học kỳ thành công! Hãy kiểm tra trên lịch.", "success");
        // Navigate to the semester start week
        if (res.data.length > 0 && res.data[0].startDate) {
          setWeekStart(getWeekStart(new Date(res.data[0].startDate)));
        }
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
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: "Lưu chính thức thời khóa biểu thành công!" }) : "Lưu chính thức thời khóa biểu thành công!", "success");
        // Reload calendar from DB
        const dbRes = await classApi.getClassSchedules();
        if (dbRes.success && dbRes.data) {
          setEvents(
            (dbRes.data as ClassScheduleItem[])
              .map((s) => mapApiItem(s))
              .filter(Boolean) as ScheduleEvent[]
          );
        }
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("classSchedules.toastSaveDraftError", { defaultValue: "Không thể lưu bản nháp lịch học." }), "error");
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
    showToast(t("classSchedules.toastCancelDraftSuccess", { defaultValue: "Đã hủy bản nháp lịch học hiện tại." }), "success");
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
    setSelectedEvent(ev);
    openModal();
  };

  const classOptions = classes.map((cls) => ({
    value: cls.id,
    label: `${cls.code} - ${cls.name} (${cls.scheduleDisplay || t("classSchedules.noScheduleConfig", { defaultValue: "Chưa cấu hình lịch" })})`,
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
                {t("classSchedules.draftPendingTitle", { defaultValue: "Bản nháp lịch học đang chờ xác nhận" })}
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
              {t("classSchedules.cancelDraft", { defaultValue: "Hủy bản nháp" })}
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

      {/* Top bar: class filter + view toggle + schedule button */}
      <div className="p-5 sm:p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex flex-col gap-1.5 w-full md:max-w-md">
          <label className="text-sm font-semibold text-gray-750 dark:text-gray-300">{t("classSchedules.classFilterLabel", { defaultValue: "Lớp học:" })}</label>
          <SearchableSelect
            options={classOptions}
            value={selectedClassId || ""}
            onChange={(val) => setSelectedClassId(val)}
            placeholder={t("classSchedules.allClassesPlaceholder", { defaultValue: "Tất cả các lớp" })}
            onClear={() => setSelectedClassId(null)}
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {classDetail && (
            <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-850 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-xs">
              <span className="font-semibold text-gray-700 dark:text-gray-300">{classDetail.teacherName || t("classSchedules.unassigned", { defaultValue: "Chưa phân công" })}</span>
              <span className="mx-1.5 text-gray-300">·</span>
              <span>{t("classSchedules.lessonsCount", { count: classDetail.expectedLessons, defaultValue: "buổi" })}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <CalendarClock className="w-4 h-4" />
            {t("classSchedules.autoScheduleBtn", { defaultValue: "Xếp lịch tự động" })}
          </button>

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

      {/* Draft legend */}
      {draftClasses && draftClasses.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
          <span className="inline-block w-4 h-3 rounded border-2 border-dashed border-amber-400 bg-amber-100"></span>
          <span>{t("classSchedules.legendDraft", { defaultValue: "Lịch màu vàng viền nét đứt = lịch nháp chưa lưu" })}</span>
          <span className="ml-2 inline-block w-4 h-3 rounded border border-sky-300 bg-sky-50"></span>
          <span>{t("classSchedules.legendSaved", { defaultValue: "Lịch màu khác = lịch đã lưu trong hệ thống" })}</span>
        </div>
      )}

      {/* Calendar area */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
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
                  {t("schedules.slotNumber", { index: s.index + 1, defaultValue: s.label })} · {s.time}
                </span>
              ))}
            </div>

            <div className="p-4">
              <WeekGrid events={allDisplayEvents} weekStart={weekStart} onEventClick={handleEventClick} />
            </div>
          </div>
        ) : (
          <div className="p-5 schedules-calendar-main">
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale="vi"
              buttonText={{ today: "Hôm nay", month: "Tháng" }}
              headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
              events={fcEvents}
              selectable={false}
              eventClick={handleFcEventClick}
              eventContent={renderMonthEvent}
              height="auto"
            />
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal isOpen={isOpen} onClose={closeModal} showCloseButton={false} className="max-w-[500px] p-6 lg:p-8">
        {selectedEvent && (
          <div className="flex flex-col">
            <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
              <div className="flex items-center justify-between gap-3">
                <h5 className="font-bold text-gray-900 dark:text-white text-lg sm:text-xl">
                  {selectedEvent.isDraft 
                    ? t("classSchedules.draftSessionTitle", { lessonNo: selectedEvent.lessonNo, defaultValue: `📋 Lịch Nháp — Chi Tiết Buổi Học ${selectedEvent.lessonNo}` })
                    : t("classSchedules.sessionTitle", { lessonNo: selectedEvent.lessonNo, defaultValue: `Chi Tiết Buổi Học ${selectedEvent.lessonNo}` })}
                </h5>
                {selectedEvent.isDraft ? (
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full border bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700">
                    {t("classSchedules.draftStatusLabel", { defaultValue: "Chưa lưu" })}
                  </span>
                ) : (
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatus(selectedEvent.status, t).color}`}>
                    {getStatus(selectedEvent.status, t).text}
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
                  value: selectedEvent.roomName,
                },
                {
                  icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
                  label: t("classSchedules.teacherLabel", { defaultValue: "Giáo viên" }),
                  value: selectedEvent.teacherName,
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
        )}
      </Modal>

      {/* Auto-Schedule Modal */}
      <AutoScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        semesters={semesters}
        onGenerate={handleGenerate}
        loading={scheduleLoading}
        showToast={showToast}
      />
    </div>
  );
}

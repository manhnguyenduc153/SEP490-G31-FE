import React, { useState, useEffect } from "react";
import { X, Calendar, Settings, AlertTriangle, CheckSquare, Square } from "lucide-react";
import { ClassItem, AutoScheduleConstraintDto } from "@/services/class.api";

interface AutoScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (constraints: AutoScheduleConstraintDto) => void;
  selectedClasses: ClassItem[];
  isSubmitting: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

export default function AutoScheduleModal({
  isOpen,
  onClose,
  onSubmit,
  selectedClasses,
  isSubmitting,
  t
}: AutoScheduleModalProps) {
  const [sessionsPerWeek, setSessionsPerWeek] = useState<number>(2);
  const [timePreferences, setTimePreferences] = useState<string[]>(["morning", "afternoon", "evening"]);
  const [allowConsecutiveDays, setAllowConsecutiveDays] = useState<boolean>(false);
  const [allowWeekend, setAllowWeekend] = useState<boolean>(false);

  // Phân loại lớp học
  const hasSchedule = (c: ClassItem) => {
    if (!c.weeklySchedulesJson) return false;
    try {
      const parsed = JSON.parse(c.weeklySchedulesJson);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  };

  const toScheduleClasses = selectedClasses.filter((c) => !hasSchedule(c));
  const skippedClasses = selectedClasses.filter((c) => hasSchedule(c));

  useEffect(() => {
    if (isOpen) {
      // Reset values when opened
      setSessionsPerWeek(2);
      setTimePreferences(["morning", "afternoon", "evening"]);
      setAllowConsecutiveDays(false);
      setAllowWeekend(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleTimePreference = (pref: string) => {
    setTimePreferences((prev) => {
      if (prev.includes(pref)) {
        // Luôn giữ ít nhất 1 lựa chọn
        if (prev.length === 1) return prev;
        return prev.filter((p) => p !== pref);
      }
      return [...prev, pref];
    });
  };

  const handleStartScheduling = () => {
    if (timePreferences.length === 0) return;
    onSubmit({
      sessionsPerWeek,
      timePreferences,
      allowConsecutiveDays,
      allowWeekend
    });
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/55 animate-fadeIn">
      <div className="relative w-full max-w-lg overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl rounded-2xl animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-50 dark:bg-brand-950/20 text-brand-500 rounded-lg">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {t("class.autoScheduleConfig", { defaultValue: "Cấu hình xếp lịch tự động" })}
              </h3>
              <p className="text-xs text-gray-500">
                {t("class.scheduleTarget", {
                  defaultValue: `Áp dụng cho ${toScheduleClasses.length} lớp chưa có lịch`
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Số buổi mỗi tuần */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {t("class.sessionsPerWeek", { defaultValue: "Số buổi học mỗi tuần" })}
            </label>
            <div className="flex gap-2">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSessionsPerWeek(num)}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-xl border transition-all duration-150 ${
                    sessionsPerWeek === num
                      ? "bg-brand-500 border-brand-500 text-white shadow-md shadow-brand-500/10"
                      : "bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-850 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Khung giờ học */}
          <div className="space-y-3.5">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">
              {t("class.timePreferences", { defaultValue: "Khung giờ học (chọn ít nhất 1)" })}
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {[
                {
                  id: "morning",
                  title: t("class.morning", { defaultValue: "Buổi sáng" }),
                  desc: "Ca 1 (07:30 - 09:30), Ca 2 (10:00 - 12:00)"
                },
                {
                  id: "afternoon",
                  title: t("class.afternoon", { defaultValue: "Buổi chiều" }),
                  desc: "Ca 3 (13:30 - 15:30), Ca 4 (16:00 - 18:00)"
                },
                {
                  id: "evening",
                  title: t("class.evening", { defaultValue: "Buổi tối" }),
                  desc: "Ca 5 (18:30 - 20:30)"
                }
              ].map((timeOption) => {
                const isChecked = timePreferences.includes(timeOption.id);
                return (
                  <div
                    key={timeOption.id}
                    onClick={() => toggleTimePreference(timeOption.id)}
                    className={`flex items-center gap-3.5 p-3.5 rounded-xl border cursor-pointer select-none transition-all duration-200 ${
                      isChecked
                        ? "bg-brand-50/20 border-brand-500 dark:bg-brand-950/10 dark:border-brand-500"
                        : "bg-gray-50/30 border-gray-200 dark:bg-gray-950/40 dark:border-gray-850 opacity-70 hover:opacity-100"
                    }`}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-5 h-5 text-brand-500 shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0" />
                    )}
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-850 dark:text-gray-200">
                        {timeOption.title}
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">
                        {timeOption.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tùy chọn nâng cao */}
          <div className="space-y-3.5 pt-4 border-t border-gray-100 dark:border-gray-800">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">
              {t("class.advancedOptions", { defaultValue: "Tùy chọn bổ sung" })}
            </label>
            <div className="space-y-3">
              {/* Cho phép ngày liền kề */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allowConsecutiveDays}
                  onChange={(e) => setAllowConsecutiveDays(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer mt-0.5"
                />
                <div className="text-left">
                  <span className="text-sm font-semibold text-gray-850 dark:text-gray-200 block">
                    {t("class.allowConsecutiveDays", {
                      defaultValue: "Cho phép 2 ngày học liền kề nhau"
                    })}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {t("class.allowConsecutiveDaysHelp", {
                      defaultValue: "Tắt: bắt buộc các buổi học phải giãn cách ít nhất 1 ngày (ví dụ T2-T4-T6)"
                    })}
                  </span>
                </div>
              </label>

              {/* Cho phép cuối tuần */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allowWeekend}
                  onChange={(e) => setAllowWeekend(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer mt-0.5"
                />
                <div className="text-left">
                  <span className="text-sm font-semibold text-gray-850 dark:text-gray-200 block">
                    {t("class.allowWeekend", { defaultValue: "Cho phép học ngày cuối tuần (T7, CN)" })}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {t("class.allowWeekendHelp", {
                      defaultValue: "Tắt: hệ thống chỉ xếp lịch vào các ngày trong tuần (T2 - T6)"
                    })}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Cảnh báo các lớp bị bỏ qua */}
          {skippedClasses.length > 0 && (
            <div className="flex gap-2.5 p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-left text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                <p className="font-bold">
                  {t("class.skippedClassesWarning", {
                    defaultValue: `${skippedClasses.length} lớp đã có lịch học sẽ được bỏ qua:`
                  })}
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {skippedClasses.map((c) => (
                    <span
                      key={c.id}
                      className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 rounded text-[10px] font-mono font-semibold"
                    >
                      {c.code}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50"
          >
            {t("common.cancel", { defaultValue: "Hủy" })}
          </button>
          <button
            type="button"
            onClick={handleStartScheduling}
            disabled={isSubmitting || toScheduleClasses.length === 0 || timePreferences.length === 0}
            className="px-5 py-2 text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-xl shadow-md shadow-brand-500/10 hover:shadow-brand-600/25 transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t("class.scheduling", { defaultValue: "Đang xếp..." })}
              </>
            ) : (
              t("class.startScheduling", { defaultValue: "Bắt đầu xếp lịch" })
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

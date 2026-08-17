import React, { useState, useEffect } from "react";
import { X, Calendar, Settings, AlertTriangle, CheckSquare, Square } from "lucide-react";
import { ClassItem, AutoScheduleConstraintDto } from "@/services/class.api";
import { commonApi } from "@/services/common.api";

interface AutoScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (constraints: AutoScheduleConstraintDto) => void;
  selectedClasses: ClassItem[];
  isSubmitting: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function AutoScheduleModal({
  isOpen,
  onClose,
  onSubmit,
  selectedClasses,
  isSubmitting,
  t,
  showToast
}: AutoScheduleModalProps) {
  const [sessionsPerWeek, setSessionsPerWeek] = useState<number>(2);
  const [timePreferences, setTimePreferences] = useState<string[]>(["morning", "afternoon", "evening"]);
  const [allowWeekend, setAllowWeekend] = useState<boolean>(true);

  const [teachers, setTeachers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<number[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<number[]>([]);

  const [teacherKeyword, setTeacherKeyword] = useState<string>("");
  const [roomKeyword, setRoomKeyword] = useState<string>("");

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
      setAllowWeekend(true);
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
    if (timePreferences.length === 0) {
      showToast(t("semester.errSelectPreference", { defaultValue: "Vui lòng chọn ít nhất một khung thời gian ưu tiên." }), "error");
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
    onSubmit({
      sessionsPerWeek,
      timePreferences,
      allowWeekend,
      teacherIds: selectedTeachers,
      roomIds: selectedRooms,
    });
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/55 animate-fadeIn">
      <div className="relative w-full max-w-5xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl rounded-2xl animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-50 dark:bg-brand-950/20 text-brand-500 rounded-lg">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {t("class.autoScheduleConfig")}
              </h3>
              <p className="text-xs text-gray-500">
                {t("class.scheduleTarget", { count: toScheduleClasses.length })}
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Cột trái: Form cấu hình cũ */}
            <div className="lg:col-span-5 space-y-6 text-left">
              {/* Số buổi mỗi tuần */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {t("class.sessionsPerWeek")}
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => (
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
                  {t("class.timePreferences")}
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    {
                      id: "morning",
                      title: t("class.morning"),
                      desc: "Ca 1 (07:30 - 09:30), Ca 2 (10:00 - 12:00)"
                    },
                    {
                      id: "afternoon",
                      title: t("class.afternoon"),
                      desc: "Ca 3 (13:30 - 15:30), Ca 4 (16:00 - 18:00)"
                    },
                    {
                      id: "evening",
                      title: t("class.evening"),
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
                          <p className="text-sm font-semibold text-gray-855 dark:text-gray-250">
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
                  {t("class.advancedOptions")}
                </label>
                <div className="space-y-3">

                  {/* Cho phép cuối tuần */}
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allowWeekend}
                      onChange={(e) => setAllowWeekend(e.target.checked)}
                      className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer mt-0.5"
                    />
                    <div className="text-left">
                      <span className="text-sm font-semibold text-gray-855 dark:text-gray-200 block">
                        {t("class.allowWeekend")}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {t("class.allowWeekendHelp")}
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Cột phải: Giáo viên và Phòng học dạng card */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Chỉ định Giáo viên */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">
                    {t("semester.autoScheduleTeachers", { defaultValue: "Chỉ định Giáo viên xếp lịch" })}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const allSelected = teachers.length > 0 && selectedTeachers.length === teachers.length;
                      setSelectedTeachers(allSelected ? [] : teachers.map(teach => teach.id));
                    }}
                    className="text-xs font-semibold text-brand-500 hover:underline cursor-pointer select-none"
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
                  className="w-full rounded-xl border border-gray-200 bg-transparent px-3.5 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-850 dark:bg-gray-950 dark:text-white"
                />
                <div className="max-h-56 overflow-y-auto border border-gray-205 dark:border-gray-800 rounded-xl p-3 bg-gray-50/30 dark:bg-gray-950/40 animate-fadeIn">
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
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer flex flex-col justify-between transition-all duration-150 select-none ${
                              isSelected
                                ? "bg-brand-50/20 border-brand-500 text-brand-600 dark:bg-brand-950/10 dark:border-brand-500 font-medium shadow-xs"
                                : "bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-850 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
                            }`}
                          >
                            <div className="flex justify-between items-center w-full">
                              <span className="truncate max-w-[85%] font-semibold">{teach.name}</span>
                              {isSelected && <span className="text-brand-500 font-bold">✓</span>}
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
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">
                    {t("semester.autoScheduleRooms", { defaultValue: "Chỉ định Phòng học xếp lịch" })}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const allSelected = rooms.length > 0 && selectedRooms.length === rooms.length;
                      setSelectedRooms(allSelected ? [] : rooms.map(rm => rm.id));
                    }}
                    className="text-xs font-semibold text-brand-500 hover:underline cursor-pointer select-none"
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
                  className="w-full rounded-xl border border-gray-200 bg-transparent px-3.5 py-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-850 dark:bg-gray-950 dark:text-white"
                />
                <div className="max-h-56 overflow-y-auto border border-gray-205 dark:border-gray-800 rounded-xl p-3 bg-gray-50/30 dark:bg-gray-950/40 animate-fadeIn">
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
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer flex flex-col justify-between transition-all duration-150 select-none ${
                              isSelected
                                ? "bg-brand-50/20 border-brand-500 text-brand-600 dark:bg-brand-950/10 dark:border-brand-500 font-medium shadow-xs"
                                : "bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-850 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
                            }`}
                          >
                            <div className="flex justify-between items-center w-full">
                              <span className="truncate max-w-[85%] font-semibold">{rm.name}</span>
                              {isSelected && <span className="text-brand-500 font-bold">✓</span>}
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
          </div>

          {/* Cảnh báo các lớp bị bỏ qua */}
          {skippedClasses.length > 0 && (
            <div className="flex gap-2.5 p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-left text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                <p className="font-bold">
                  {t("class.skippedClassesWarning", { count: skippedClasses.length })}
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
            {t("common.btnCancel")}
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
                {t("class.scheduling")}
              </>
            ) : (
              t("class.startScheduling")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

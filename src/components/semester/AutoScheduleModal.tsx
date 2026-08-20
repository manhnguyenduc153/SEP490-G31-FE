"use client";
import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { semesterApi } from "@/services/semester.api";
import { commonApi } from "@/services/common.api";
import { useTranslation } from "react-i18next";
import { AlertCircle } from "lucide-react";

interface AutoScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesterId: number;
  semesterName: string;
  showToast: (msg: string, type?: "success" | "error") => void;
  onSuccess: () => void;
}

export function AutoScheduleModal({
  isOpen,
  onClose,
  semesterId,
  semesterName,
  showToast,
  onSuccess,
}: AutoScheduleModalProps) {
  const { t } = useTranslation();
  const [maxClassSize, setMaxClassSize] = useState<number>(30);
  const [minClassSize, setMinClassSize] = useState<number>(20);
  const [sessionsPerWeek, setSessionsPerWeek] = useState<number>(2);
  const [timePreferences, setTimePreferences] = useState<string[]>(["Morning", "Afternoon", "Evening"]);

  const [teachers, setTeachers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<number[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<number[]>([]);

  const [teacherKeyword, setTeacherKeyword] = useState<string>("");
  const [roomKeyword, setRoomKeyword] = useState<string>("");

  const [isScheduling, setIsScheduling] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [infeasibilityErrors, setInfeasibilityErrors] = useState<Array<{ code: string; params: any; text: string }>>([]);

  // Reset selections and search keywords when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTeachers([]);
      setSelectedRooms([]);
      setTeacherKeyword("");
      setRoomKeyword("");
      setInfeasibilityErrors([]);
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

  const toggleTimePreference = (pref: string) => {
    if (timePreferences.includes(pref)) {
      setTimePreferences(timePreferences.filter((p) => p !== pref));
    } else {
      setTimePreferences([...timePreferences, pref]);
    }
  };

  const handleStartScheduling = async () => {
    if (timePreferences.length === 0) {
      showToast(t("semester.errSelectPreference", { defaultValue: "Vui lòng chọn ít nhất một khung thời gian ưu tiên." }), "error");
      return;
    }

    if (minClassSize > maxClassSize) {
      showToast(t("semester.errClassSizeValidation", { defaultValue: "Sĩ số tối thiểu không được lớn hơn sĩ số tối đa." }), "error");
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

    setIsScheduling(true);
    setLoadingStep(1);

    // Simulate scheduling steps for beautiful UX
    const timers: NodeJS.Timeout[] = [];
    timers.push(setTimeout(() => setLoadingStep(2), 1500));
    timers.push(setTimeout(() => setLoadingStep(3), 3500));

    try {
      const res = await semesterApi.autoScheduleSemester({
        semesterId,
        maxClassSize,
        minClassSize,
        constraints: {
          sessionsPerWeek,
          timePreferences,
          allowWeekend: true,
          teacherIds: selectedTeachers,
          roomIds: selectedRooms,
        },
      });

      // Clear layout timers
      timers.forEach((t) => clearTimeout(t));

      const getFriendlyAutoScheduleError = (msg: string) => {
        if (msg.startsWith("ERR_CLASS_NO_STUDENTS_")) {
          const code = msg.replace("ERR_CLASS_NO_STUDENTS_", "");
          return t("class.errClassNoStudents", { code });
        }
        if (msg.startsWith("ERR_CLASS_NO_COURSE_")) {
          const code = msg.replace("ERR_CLASS_NO_COURSE_", "");
          return t("class.errClassNoCourse", { code });
        }
        if (msg.startsWith("ERR_CLASS_STUDENTS_EXCEED_ROOM_CAPACITY_")) {
          const code = msg.replace("ERR_CLASS_STUDENTS_EXCEED_ROOM_CAPACITY_", "");
          return t("class.errClassExceedCapacity", { code });
        }
        return t(`backendMessages.${msg}`, { defaultValue: msg });
      };

      if (res.success) {
        setInfeasibilityErrors([]);
        setLoadingStep(4);
        setTimeout(() => {
          showToast(res.message ? getFriendlyAutoScheduleError(res.message) : t("semester.successAutoSchedule", { defaultValue: "Lập lịch tự động học kỳ thành công!" }), "success");
          onSuccess();
          onClose();
          setIsScheduling(false);
          setLoadingStep(0);
        }, 1500);
      } else {
        const reasons = res.data?.infeasibilityReasons || (res.data as any)?.data?.infeasibilityReasons || (res as any)?.infeasibilityReasons;
        if ((res.message === "ERR_SCHEDULE_INFEASIBLE" || !res.success) && Array.isArray(reasons) && reasons.length > 0) {
          const uniqueTexts = Array.from(
            new Set(
              reasons.map((r: any) =>
                String(t(`backendMessages.infeasibilityReasons.${r.code}`, { ...r.params, defaultValue: r.code }))
              )
            )
          );
          const formatted = uniqueTexts.map((text) => ({ code: "", params: {}, text }));
          setInfeasibilityErrors(formatted);
          showToast(t("semester.errAutoScheduleInfeasibleSummary", { defaultValue: "Xếp lịch thất bại do vi phạm một số ràng buộc. Vui lòng xem chi tiết lỗi bên dưới." }), "error");
        } else {
          setInfeasibilityErrors([]);
          showToast(res.message ? getFriendlyAutoScheduleError(res.message) : t("semester.errAutoScheduleConflict", { defaultValue: "Xếp lịch thất bại do xung đột ràng buộc hoặc bận lịch giáo viên." }), "error");
        }
        setIsScheduling(false);
        setLoadingStep(0);
      }
    } catch (err: any) {
      timers.forEach((t) => clearTimeout(t));
      showToast(t("backendMessages.ERR_SYSTEM_ERROR"), "error");
      setIsScheduling(false);
      setLoadingStep(0);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[1200px] w-full p-6 sm:p-8" showCloseButton={!isScheduling}>
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("semester.autoScheduleTitle")}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("semester.targetSemester")} <span className="font-semibold text-gray-700 dark:text-gray-300">{semesterName}</span>
          </p>
        </div>

        {isScheduling ? (
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
                {loadingStep === 1 && (
                  <p className="animate-fade-in">{t("semester.autoScheduleStep1")}</p>
                )}
                {loadingStep === 2 && (
                  <p className="animate-fade-in text-indigo-600 dark:text-indigo-400">
                    {t("semester.autoScheduleStep2")}
                  </p>
                )}
                {loadingStep === 3 && (
                  <p className="animate-fade-in text-emerald-600 dark:text-emerald-400">
                    {t("semester.autoScheduleStep3")}
                  </p>
                )}
                {loadingStep === 4 && (
                  <p className="animate-fade-in font-semibold text-emerald-600">
                    {t("semester.autoScheduleStep4")}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 text-xs text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900 rounded-lg">
              <strong>{t("semester.autoScheduleNoteTitle", { defaultValue: "Lưu ý:" })}</strong> {t("semester.autoScheduleNoteBody")}
            </div>

            <form className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Cột trái: Nội dung form cũ */}
              <div className="lg:col-span-5 space-y-4 text-left">
                {/* Sĩ số lớp */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("semester.autoScheduleMaxClassSize")} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={100}
                      required
                      value={maxClassSize}
                      onChange={(e) => setMaxClassSize(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("semester.autoScheduleMinClassSize")} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      required
                      value={minClassSize}
                      onChange={(e) => setMinClassSize(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    />
                  </div>
                </div>

                {/* Số buổi mỗi tuần */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("semester.autoScheduleSessionsPerWeek")} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={sessionsPerWeek}
                    onChange={(e) => setSessionsPerWeek(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white cursor-pointer"
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

                {/* Ca học ưu tiên */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("semester.autoSchedulePreferences", { defaultValue: "Khung thời gian có thể xếp lớp" })}
                  </label>
                  <div className="flex gap-3">
                    {["Morning", "Afternoon", "Evening"].map((p) => {
                      const label = p === "Morning" ? t("semester.autoSchedulePrefMorning") : p === "Afternoon" ? t("semester.autoSchedulePrefAfternoon") : t("semester.autoSchedulePrefEvening");
                      const active = timePreferences.includes(p);
                      return (
                        <button
                          type="button"
                          key={p}
                          onClick={() => toggleTimePreference(p)}
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

              </div>

              {/* Cột phải: Giáo viên (trên) và Phòng học (dưới) */}
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

              {/* Danh sách lỗi chi tiết vi phạm ràng buộc */}
              {infeasibilityErrors.length > 0 && (
                <div className="col-span-12 p-4 bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-3 shadow-xs animate-fade-in text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-semibold text-sm">
                      <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                      <span>{t("semester.infeasibleReasonsTitle", { defaultValue: "Chi tiết các ràng buộc bị vi phạm:" })} ({infeasibilityErrors.length})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInfeasibilityErrors([])}
                      className="text-xs text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                    >
                      {t("common.dismiss", { defaultValue: "Đóng" })}
                    </button>
                  </div>
                  <div className="max-h-52 overflow-y-auto space-y-2 pr-1 divide-y divide-rose-100 dark:divide-rose-900/40">
                    {infeasibilityErrors.map((err, idx) => (
                      <div key={idx} className="pt-2 first:pt-0 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-200 leading-relaxed">
                        <span className="font-bold text-rose-500 select-none mt-0.5">•</span>
                        <span>{err.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hàng nút dưới cùng (kéo dài cả 12 cột) */}
              <div className="col-span-12 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  {t("semester.btnCancel")}
                </button>
                <button
                  type="button"
                  onClick={handleStartScheduling}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
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

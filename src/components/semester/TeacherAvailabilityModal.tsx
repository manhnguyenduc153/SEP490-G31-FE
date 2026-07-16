"use client";
import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { teacherApi, TeacherItem } from "@/services/teacher.api";
import { semesterApi, TeacherAvailabilitySlotDto } from "@/services/semester.api";
import { useTranslation } from "react-i18next";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Check, Ban } from "lucide-react";

interface TeacherAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesterId: number;
  semesterName: string;
  showToast: (msg: string, type?: "success" | "error") => void;
}

const DAYS = [
  { name: "Thứ 2", value: 1 },
  { name: "Thứ 3", value: 2 },
  { name: "Thứ 4", value: 3 },
  { name: "Thứ 5", value: 4 },
  { name: "Thứ 6", value: 5 },
  { name: "Thứ 7", value: 6 },
  { name: "Chủ Nhật", value: 0 },
];

const SLOTS = [
  { index: 0, name: "Ca 1 (Sáng)", time: "08:00 - 10:00" },
  { index: 1, name: "Ca 2 (Sáng)", time: "10:15 - 12:15" },
  { index: 2, name: "Ca 3 (Chiều)", time: "13:30 - 15:30" },
  { index: 3, name: "Ca 4 (Chiều)", time: "15:45 - 17:45" },
  { index: 4, name: "Ca 5 (Tối)", time: "18:00 - 20:00" },
];

export function TeacherAvailabilityModal({
  isOpen,
  onClose,
  semesterId,
  semesterName,
  showToast,
}: TeacherAvailabilityModalProps) {
  const { t } = useTranslation();
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | "">("");
  const [selectedSlots, setSelectedSlots] = useState<TeacherAvailabilitySlotDto[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [hasSchedules, setHasSchedules] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load teachers list
  useEffect(() => {
    if (!isOpen) return;

    async function loadTeachers() {
      setIsLoadingTeachers(true);
      try {
        const res = await teacherApi.getAll(1, 100);
        if (res.success && res.data) {
          setTeachers(res.data.items || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingTeachers(false);
      }
    }

    loadTeachers();
    setSelectedTeacherId("");
    setSelectedSlots([]);
    setHasSchedules(false);
  }, [isOpen]);

  // Load teacher availability when selectedTeacherId changes
  useEffect(() => {
    if (!selectedTeacherId || !semesterId) {
      setSelectedSlots([]);
      setHasSchedules(false);
      return;
    }

    async function loadAvailability() {
      setIsLoadingAvailability(true);
      try {
        const [res, schedRes] = await Promise.all([
          semesterApi.getTeacherAvailability(semesterId, Number(selectedTeacherId)),
          semesterApi.checkTeacherHasSchedules(semesterId, Number(selectedTeacherId))
        ]);
        if (res.success && res.data) {
          setSelectedSlots(res.data);
        } else {
          setSelectedSlots([]);
        }
        if (schedRes.success && schedRes.data) {
          setHasSchedules(schedRes.data);
        } else {
          setHasSchedules(false);
        }
      } catch (err) {
        console.error(err);
        setSelectedSlots([]);
        setHasSchedules(false);
      } finally {
        setIsLoadingAvailability(false);
      }
    }

    loadAvailability();
  }, [selectedTeacherId, semesterId]);

  const toggleSlot = (dayOfWeek: number, slotIndex: number) => {
    if (hasSchedules) return;
    const exists = selectedSlots.some(
      (s) => s.dayOfWeek === dayOfWeek && s.slotIndex === slotIndex
    );

    if (exists) {
      setSelectedSlots(
        selectedSlots.filter((s) => !(s.dayOfWeek === dayOfWeek && s.slotIndex === slotIndex))
      );
    } else {
      setSelectedSlots([...selectedSlots, { dayOfWeek, slotIndex }]);
    }
  };

  const isSlotSelected = (dayOfWeek: number, slotIndex: number) => {
    return selectedSlots.some((s) => s.dayOfWeek === dayOfWeek && s.slotIndex === slotIndex);
  };

  const toggleDay = (dayOfWeek: number) => {
    if (hasSchedules) return;
    const slotsForDay = SLOTS.map((s) => s.index);
    const selectedForDay = selectedSlots.filter((s) => s.dayOfWeek === dayOfWeek).map((s) => s.slotIndex);
    const allSelected = slotsForDay.every((slotIdx) => selectedForDay.includes(slotIdx));

    if (allSelected) {
      setSelectedSlots(selectedSlots.filter((s) => s.dayOfWeek !== dayOfWeek));
    } else {
      const remainingSlots = SLOTS.filter((s) => !selectedForDay.includes(s.index)).map((s) => ({
        dayOfWeek,
        slotIndex: s.index,
      }));
      setSelectedSlots([...selectedSlots, ...remainingSlots]);
    }
  };

  const toggleSlotRow = (slotIndex: number) => {
    if (hasSchedules) return;
    const daysValues = DAYS.map((d) => d.value);
    const selectedForSlot = selectedSlots.filter((s) => s.slotIndex === slotIndex).map((s) => s.dayOfWeek);
    const allSelected = daysValues.every((day) => selectedForSlot.includes(day));

    if (allSelected) {
      setSelectedSlots(selectedSlots.filter((s) => s.slotIndex !== slotIndex));
    } else {
      const remainingDays = DAYS.filter((d) => !selectedForSlot.includes(d.value)).map((d) => ({
        dayOfWeek: d.value,
        slotIndex,
      }));
      setSelectedSlots([...selectedSlots, ...remainingDays]);
    }
  };

  const totalSlotsCount = DAYS.length * SLOTS.length;
  const isAllSelected = selectedSlots.length === totalSlotsCount;

  const toggleAllSlots = () => {
    if (hasSchedules) return;
    if (isAllSelected) {
      setSelectedSlots([]);
    } else {
      setSelectedSlots(
        DAYS.flatMap((d) => SLOTS.map((s) => ({ dayOfWeek: d.value, slotIndex: s.index })))
      );
    }
  };

  const handleSave = async () => {
    if (!selectedTeacherId) {
      showToast(t("semester.availabilitySelectTeacherError", { defaultValue: "Vui lòng chọn giáo viên." }), "error");
      return;
    }

    setIsSaving(true);
    try {
      const res = await semesterApi.saveTeacherAvailability({
        semesterId,
        teacherId: Number(selectedTeacherId),
        slots: selectedSlots,
      });

      if (res.success) {
        showToast(res.message ? t(`backendMessages.${res.message}`) : t("semester.availabilitySaveSuccess", { defaultValue: "Lưu lịch rảnh của giáo viên thành công!" }), "success");
        onClose();
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`) : t("semester.availabilitySaveError", { defaultValue: "Không thể lưu lịch rảnh." }), "error");
      }
    } catch (err: any) {
      showToast(t("backendMessages.ERR_SYSTEM_ERROR"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[900px] p-6 sm:p-8">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("semester.availabilityTitle")}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("sidebar.semesters", { defaultValue: "Học kỳ" })}: <span className="font-semibold text-gray-700 dark:text-gray-300">{semesterName}</span>
          </p>
        </div>

        {/* Teacher Selection */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap shrink-0">
            {t("semester.availabilitySelectTeacherLabel", { defaultValue: "Chọn giảng viên:" })}
          </label>
          <div className="relative w-full sm:w-[300px]">
            <SearchableSelect
              value={selectedTeacherId}
              onChange={(value) => setSelectedTeacherId(value === "" ? "" : Number(value))}
              disabled={isLoadingTeachers}
              options={teachers.map((t) => ({
                value: t.id,
                label: `${t.name} (${t.code})`,
              }))}
              placeholder={t("semester.availabilitySelectTeacherPlaceholder", { defaultValue: "-- Chọn giáo viên --" })}
            />
          </div>
          {isLoadingTeachers && <span className="text-xs text-gray-400 animate-pulse">{t("semester.availabilityLoadingTeachers", { defaultValue: "Đang tải DS..." })}</span>}
        </div>

        {selectedTeacherId === "" ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-gray-900/20 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
            <svg
              className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="text-sm">{t("semester.availabilitySelectPrompt", { defaultValue: "Vui lòng chọn một giảng viên để xem và thiết lập lịch rảnh." })}</p>
          </div>
        ) : isLoadingAvailability ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-2">
            {hasSchedules && (
              <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-800 dark:text-amber-400 text-sm">
                <Ban className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-500" />
                <span>
                  {t("backendMessages.ERR_TEACHER_ALREADY_SCHEDULED_CANNOT_CHANGE_AVAILABILITY")}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
              <span>{t("semester.availabilityNote")}</span>
              {!hasSchedules && (
                <button
                  type="button"
                  onClick={toggleAllSlots}
                  className="text-blue-500 hover:underline"
                >
                  {isAllSelected
                    ? t("semester.availabilityDeselectAll", { defaultValue: "Bỏ chọn tất cả" })
                    : t("semester.availabilitySelectAll", { defaultValue: "Chọn tất cả các ca" })}
                </button>
              )}
            </div>

            {/* Grid Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full border-collapse text-sm text-center">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                    <th className="py-3 px-4 font-semibold text-left w-[180px]">{t("semester.availabilitySlot", { defaultValue: "Ca học" })}</th>
                    {DAYS.map((d) => (
                      <th
                        key={d.name}
                        className={`py-3 px-2 font-semibold select-none ${hasSchedules ? "cursor-not-allowed" : "cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors"}`}
                        onClick={hasSchedules ? undefined : () => toggleDay(d.value)}
                        title={hasSchedules ? undefined : "Click để chọn/bỏ chọn cả thứ này"}
                      >
                        {t(`semester.days.${d.value}`, { defaultValue: d.name })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SLOTS.map((s) => (
                    <tr
                      key={s.index}
                      className="border-b border-gray-100 dark:border-gray-800/80 hover:bg-gray-50/50 dark:hover:bg-gray-800/20"
                    >
                      <td
                        className={`py-3 px-4 text-left border-r border-gray-100 dark:border-gray-800 font-medium select-none ${hasSchedules ? "cursor-not-allowed" : "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"}`}
                        onClick={hasSchedules ? undefined : () => toggleSlotRow(s.index)}
                        title={hasSchedules ? undefined : "Click để chọn/bỏ chọn cả ca này"}
                      >
                        <div className="font-semibold text-gray-800 dark:text-gray-200">{t(`semester.slots.${s.index}`, { defaultValue: s.name })}</div>
                        <div className="text-xs text-gray-400">{s.time}</div>
                      </td>
                      {DAYS.map((d) => {
                        const active = isSlotSelected(d.value, s.index);
                        return (
                          <td key={d.value} className="p-1.5">
                             <button
                               type="button"
                               onClick={() => toggleSlot(d.value, s.index)}
                               disabled={hasSchedules}
                               className={`w-full py-2.5 flex items-center justify-center rounded-lg border transition-all duration-200 ${hasSchedules ? "cursor-not-allowed opacity-70" : ""} ${
                                 active
                                   ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400 shadow-sm"
                                   : "bg-white border-gray-200 text-gray-400 hover:border-gray-300 dark:bg-gray-900 dark:border-gray-800 dark:hover:border-gray-700 dark:text-gray-500"
                               }`}
                             >
                               {active ? (
                                 <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white dark:bg-emerald-600">
                                   <Check className="w-3.5 h-3.5 stroke-[3]" />
                                 </span>
                               ) : (
                                 <Ban className="w-5 h-5 text-gray-300 dark:text-gray-700" />
                               )}
                             </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                {t("semester.btnCancel")}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || hasSchedules}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? t("semester.btnSaving") : t("semester.availabilityActionSave", { defaultValue: "Lưu" })}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

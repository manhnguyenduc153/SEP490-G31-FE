"use client";
import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { SemesterItem, SemesterSaveDto } from "@/services/semester.api";
import DatePicker from "@/components/form/date-picker";
import { useTranslation } from "react-i18next";
import { z } from "zod";

interface SemesterFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: SemesterItem | null;
  onSubmitSuccess: (message: string) => void;
}

export function SemesterFormModal({
  isOpen,
  onClose,
  editingItem,
  onSubmitSuccess,
}: SemesterFormModalProps) {
  const { t } = useTranslation();
  const hasSchedules = editingItem?.hasSchedules === true;
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setCode(editingItem.code);
      setName(editingItem.name);
      setStartDate(editingItem.startDate ? new Date(editingItem.startDate) : null);
      setEndDate(editingItem.endDate ? new Date(editingItem.endDate) : null);
    } else {
      setCode("");
      setName("");
      setStartDate(null);
      setEndDate(null);
    }
    setErrors([]);
    setInvalidFields([]);
  }, [editingItem, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Zod Validation Schema using detailed translation keys with field names
    const semesterSchema = z.object({
      code: z.string().trim()
        .min(1, t("semester.errorEmptyCode", { defaultValue: "Mã học kỳ không được để trống." }))
        .min(5, t("semester.errorMinLengthCode", { defaultValue: "Mã học kỳ phải có ít nhất 5 ký tự." }))
        .max(50, t("semester.errorLengthCode", { defaultValue: "Mã học kỳ không được vượt quá 50 ký tự." })),
      name: z.string().trim()
        .min(1, t("semester.errorEmptyName", { defaultValue: "Tên học kỳ không được để trống." }))
        .min(5, t("semester.errorMinLengthName", { defaultValue: "Tên học kỳ phải có ít nhất 5 ký tự." }))
        .max(200, t("semester.errorLengthName", { defaultValue: "Tên học kỳ không được vượt quá 200 ký tự." })),
      startDate: z.any().refine(val => val instanceof Date, t("semester.errorEmptyStartDate", { defaultValue: "Ngày bắt đầu không được để trống." })),
      endDate: z.any().refine(val => val instanceof Date, t("semester.errorEmptyEndDate", { defaultValue: "Ngày kết thúc không được để trống." })),
    }).refine((data) => !(data.startDate instanceof Date && data.endDate instanceof Date) || data.endDate >= data.startDate, {
      message: t("backendMessages.ERR_SEMESTER_END_DATE_BEFORE_START_DATE", { defaultValue: "Ngày kết thúc không được trước ngày bắt đầu" }),
      path: ["endDate"],
    }).refine((data) => {
      if (!(data.startDate instanceof Date && data.endDate instanceof Date)) return true;
      const minEndDate = new Date(data.startDate);
      minEndDate.setMonth(minEndDate.getMonth() + 1);
      return data.endDate >= minEndDate;
    }, {
      message: t("backendMessages.ERR_SEMESTER_DURATION_MIN_ONE_MONTH", { defaultValue: "Thời gian học kỳ phải tối thiểu là 1 tháng" }),
      path: ["endDate"],
    }).refine((data) => {
      if (!(data.startDate instanceof Date && data.endDate instanceof Date)) return true;
      const maxEndDate = new Date(data.startDate);
      maxEndDate.setMonth(maxEndDate.getMonth() + 3);
      return data.endDate <= maxEndDate;
    }, {
      message: t("backendMessages.ERR_SEMESTER_DURATION_MAX_THREE_MONTHS", { defaultValue: "Thời gian học kỳ không được vượt quá 3 tháng" }),
      path: ["endDate"],
    });

    const result = semesterSchema.safeParse({ code, name, startDate, endDate });

    if (!result.success) {
      const fieldErrors: string[] = [];
      const fields: string[] = [];
      result.error.issues.forEach((err) => {
        fieldErrors.push(err.message);
        if (err.path.length > 0) {
          fields.push(err.path[0] as string);
        }
      });
      setErrors(fieldErrors);
      setInvalidFields(fields);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);
    setInvalidFields([]);

    const dto: SemesterSaveDto = {
      id: editingItem?.id,
      code: code.trim(),
      name: name.trim(),
      startDate: startDate!.toISOString(),
      endDate: endDate!.toISOString(),
      status: editingItem ? editingItem.status : 1,
    };

    try {
      const { semesterApi } = await import("@/services/semester.api");
      let res;
      if (editingItem) {
        res = await semesterApi.update(editingItem.id, dto);
      } else {
        res = await semesterApi.create(dto);
      }

      if (res.success) {
        onSubmitSuccess(
          res.message ? t(`backendMessages.${res.message}`) : (editingItem ? t("semester.updateSuccess") : t("semester.createSuccess"))
        );
        onClose();
      } else {
        setErrors([res.message ? t(`backendMessages.${res.message}`) : t("semester.saveError", { defaultValue: "Đã xảy ra lỗi khi lưu học kỳ." })]);
        if (res.message === "ERR_SEMESTER_CODE_EXISTS") {
          setInvalidFields(["code"]);
        } else if (res.message === "ERR_SEMESTER_NAME_EXISTS") {
          setInvalidFields(["name"]);
        }
      }
    } catch (err: any) {
      setErrors([t("backendMessages.ERR_SYSTEM_ERROR")]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[560px] p-6 sm:p-8">
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {editingItem ? t("semester.formEditTitle") : t("semester.formCreateTitle")}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {editingItem ? t("semester.formEditDesc") : t("semester.formCreateDesc")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("semester.formCodeLabel")} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={50}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (invalidFields.includes("code")) {
                    setInvalidFields(prev => prev.filter(f => f !== "code"));
                  }
                }}
                placeholder={t("semester.formCodePlaceholder")}
                className={`w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:outline-hidden shadow-theme-xs ${
                  invalidFields.includes("code")
                    ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-500"
                    : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                }`}
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("semester.formNameLabel")} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={200}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (invalidFields.includes("name")) {
                    setInvalidFields(prev => prev.filter(f => f !== "name"));
                  }
                }}
                placeholder={t("semester.formNamePlaceholder")}
                className={`w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:outline-hidden shadow-theme-xs ${
                  invalidFields.includes("name")
                    ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-500"
                    : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("semester.formStartDateLabel")} <span className="text-rose-500">*</span>
              </label>
              <DatePicker
                id="formStartDate"
                disabled={hasSchedules}
                placeholder="dd/MM/yyyy"
                dateFormat="d/m/Y"
                defaultDate={startDate || undefined}
                isError={invalidFields.includes("startDate")}
                onChange={(dates) => {
                  setStartDate(dates && dates.length > 0 ? dates[0] : null);
                  if (invalidFields.includes("startDate")) {
                    setInvalidFields(prev => prev.filter(f => f !== "startDate"));
                  }
                }}
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("semester.formEndDateLabel")} <span className="text-rose-500">*</span>
              </label>
              <DatePicker
                id="formEndDate"
                disabled={hasSchedules}
                placeholder="dd/MM/yyyy"
                dateFormat="d/m/Y"
                defaultDate={endDate || undefined}
                isError={invalidFields.includes("endDate")}
                onChange={(dates) => {
                  setEndDate(dates && dates.length > 0 ? dates[0] : null);
                  if (invalidFields.includes("endDate")) {
                    setInvalidFields(prev => prev.filter(f => f !== "endDate"));
                  }
                }}
              />
            </div>
          </div>

          {errors.length > 0 && (
            <div className="p-3 text-sm text-rose-500 bg-rose-50 dark:bg-rose-955/20 dark:text-rose-400 rounded-lg space-y-1">
              {errors.map((err, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <span className="shrink-0">•</span>
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              {t("semester.btnCancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? t("semester.btnSaving") : t("semester.btnSave")}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

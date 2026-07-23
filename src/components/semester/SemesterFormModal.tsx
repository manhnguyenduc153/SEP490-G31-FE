"use client";
import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { SemesterItem, SemesterSaveDto } from "@/services/semester.api";
import DatePicker from "@/components/form/date-picker";
import { useTranslation } from "react-i18next";

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
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
  }, [editingItem, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !startDate || !endDate) {
      setError(t("semester.requiredFieldsError", { defaultValue: "Vui lòng điền đầy đủ các trường bắt buộc." }));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const dto: SemesterSaveDto = {
      id: editingItem?.id,
      code: code.trim(),
      name: name.trim(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
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
        setError(res.message ? t(`backendMessages.${res.message}`) : t("semester.saveError", { defaultValue: "Đã xảy ra lỗi khi lưu học kỳ." }));
      }
    } catch (err: any) {
      setError(t("backendMessages.ERR_SYSTEM_ERROR"));
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

        {error && (
          <div className="p-3 text-sm text-rose-500 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-400 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("semester.formCodeLabel")} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={50}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t("semester.formCodePlaceholder")}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("semester.formNameLabel")} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={200}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("semester.formNamePlaceholder")}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
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
                defaultDate={editingItem?.startDate ? new Date(editingItem.startDate) : undefined}
                onChange={(dates) => {
                  setStartDate(dates && dates.length > 0 ? dates[0] : null);
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
                defaultDate={editingItem?.endDate ? new Date(editingItem.endDate) : undefined}
                onChange={(dates) => {
                  setEndDate(dates && dates.length > 0 ? dates[0] : null);
                }}
              />
            </div>
          </div>

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

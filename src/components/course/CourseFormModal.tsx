"use client";
import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { CourseItem, CourseSaveDto } from "@/services/course.api";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { CodeHelper } from "@/helpers/CodeHelper";

interface CourseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: CourseItem | null;
  onSubmitSuccess: (savedItem: CourseItem, isEdit: boolean) => void;
}

export function CourseFormModal({
  isOpen,
  onClose,
  editingItem,
  onSubmitSuccess,
}: CourseFormModalProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<number>(1);
  const [description, setDescription] = useState("");

  const [errors, setErrors] = useState<string[]>([]);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setCode(editingItem.code);
      setName(editingItem.name);
      setDuration(editingItem.duration !== null && editingItem.duration !== undefined ? String(editingItem.duration) : "");
      setPrice(editingItem.price !== null && editingItem.price !== undefined ? String(editingItem.price) : "");
      setStatus(editingItem.status);
      setDescription(editingItem.description ?? "");
    } else {
      setCode(CodeHelper.generate("KH"));
      setName("");
      setDuration("");
      setPrice("");
      setStatus(1);
      setDescription("");
    }
    setErrors([]);
    setInvalidFields([]);
  }, [editingItem, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Zod validation schema
    const courseSchema = z.object({
      code: z.string().trim()
        .min(1, t("course.errorEmptyCode", { defaultValue: "Mã khóa học không được để trống." }))
        .min(5, t("course.errorMinLengthCode", { defaultValue: "Mã khóa học phải có ít nhất 5 ký tự." }))
        .max(50, t("course.errorLengthCode", { defaultValue: "Mã khóa học không được vượt quá 50 ký tự." })),
      name: z.string().trim()
        .min(1, t("course.errorEmptyName", { defaultValue: "Tên khóa học không được để trống." }))
        .min(5, t("course.errorMinLengthName", { defaultValue: "Tên khóa học phải có ít nhất 5 ký tự." }))
        .max(200, t("course.errorLengthName", { defaultValue: "Tên khóa học không được vượt quá 200 ký tự." })),
      duration: z.string().trim().refine(val => {
        if (!val) return true;
        const num = Number(val);
        return !isNaN(num) && Number.isInteger(num) && num > 0;
      }, t("course.errorDurationPositive", { defaultValue: "Thời lượng phải là số nguyên dương." })),
      price: z.string().trim().refine(val => {
        if (!val) return true;
        const num = Number(val);
        return !isNaN(num) && num >= 0;
      }, t("course.errorPricePositive", { defaultValue: "Học phí không được âm." })),
      description: z.string().trim().max(1000, t("course.errorLengthDesc", { defaultValue: "Mô tả không được vượt quá 1000 ký tự." })).optional(),
    });

    const result = courseSchema.safeParse({ code, name, duration, price, description });

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

    const durationVal = duration.trim() ? Number(duration) : null;
    const priceVal = price.trim() ? Number(price) : null;

    const dto: CourseSaveDto = {
      id: editingItem?.id,
      code: code.trim(),
      name: name.trim(),
      status: status,
      duration: durationVal,
      price: priceVal,
      description: description.trim() || null,
    };

    try {
      const { courseApi } = await import("@/services/course.api");
      let res;
      if (editingItem) {
        res = await courseApi.update(editingItem.id, dto);
      } else {
        res = await courseApi.create(dto);
      }

      if (res.success && res.data) {
        onSubmitSuccess(res.data, !!editingItem);
        onClose();
      } else {
        setErrors([res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("course.saveError", { defaultValue: "Đã xảy ra lỗi khi lưu khóa học." })]);
        if (res.message === "ERR_CODE_DUPLICATE") {
          setInvalidFields(["code"]);
        } else if (res.message === "ERR_NAME_DUPLICATE") {
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
          {editingItem ? t("course.editTitle") : t("course.createTitle")}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {editingItem ? t("course.editDesc") : t("course.createDesc")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2" noValidate>
          {/* Grid for Code and Name */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("course.formCodeLabel")} <span className="text-rose-500">*</span>
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
                placeholder={t("course.formCodePlaceholder")}
                className={`w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:outline-hidden shadow-theme-xs ${
                  invalidFields.includes("code")
                    ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-500"
                    : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                }`}
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("course.formNameLabel")} <span className="text-rose-500">*</span>
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
                placeholder={t("course.formNamePlaceholder")}
                className={`w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:outline-hidden shadow-theme-xs ${
                  invalidFields.includes("name")
                    ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-500"
                    : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                }`}
              />
            </div>
          </div>


          {/* Status */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("course.formStatusLabel")}
            </label>
            <div className="relative z-20 bg-transparent">
              <select
                value={status}
                onChange={(e) => setStatus(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 appearance-none focus:outline-hidden focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 shadow-theme-xs"
              >
                <option value={1}>{t("course.statusActive")}</option>
                <option value={0}>{t("course.statusInactive")}</option>
              </select>
              <span className="absolute z-30 text-gray-500 -translate-y-1/2 right-4 top-1/2 dark:text-gray-400 pointer-events-none">
                <svg className="stroke-current" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3.8335 5.9165L8.00016 10.0832L12.1668 5.9165" stroke="" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("course.formDescLabel")}
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (invalidFields.includes("description")) {
                  setInvalidFields(prev => prev.filter(f => f !== "description"));
                }
              }}
              placeholder={t("course.formDescPlaceholder")}
              rows={3}
              maxLength={1000}
              className={`w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:outline-hidden shadow-theme-xs resize-none ${
                invalidFields.includes("description")
                  ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-500"
                  : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              }`}
            />
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

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              {t("course.btnCancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? t("course.btnSaving") : t("course.btnSave")}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

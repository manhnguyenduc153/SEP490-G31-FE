"use client";
import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import {
  questionCategoryApi,
  QuestionCategoryItem,
} from "@/services/questionCategory.api";
import { CodeHelper } from "@/helpers/CodeHelper";

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: QuestionCategoryItem | null;
  courses: { id: number; code: string; name: string }[];
  onSubmitSuccess: (savedItem: QuestionCategoryItem, isEdit: boolean) => void;
}

export function CategoryFormModal({
  isOpen,
  onClose,
  editingItem,
  courses,
  onSubmitSuccess,
}: CategoryFormModalProps) {
  const { t } = useTranslation();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [courseId, setCourseId] = useState<number | null>(null);

  const [errors, setErrors] = useState<string[]>([]);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingItem && isOpen) {
      setCode(editingItem.code);
      setName(editingItem.name);
      setDesc(editingItem.description ?? "");
      setCourseId(editingItem.courseId ?? null);
    } else if (isOpen) {
      setCode(CodeHelper.generate("QC"));
      setName("");
      setDesc("");
      setCourseId(null);
    }
    setErrors([]);
    setInvalidFields([]);
  }, [editingItem, isOpen]);

  const clearField = (field: string) => {
    if (invalidFields.includes(field)) {
      setInvalidFields((prev) => prev.filter((f) => f !== field));
    }
  };

  const inputClass = (field: string) =>
    `w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:outline-hidden focus:ring-3 dark:text-white/90 dark:placeholder:text-white/30 shadow-theme-xs ${
      invalidFields.includes(field)
        ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-500"
        : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-brand-800"
    }`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const schema = z.object({
      code: z
        .string()
        .trim()
        .min(1, t("questionCategory.errorEmptyCode", { defaultValue: "Mã danh mục không được để trống." }))
        .min(5, t("questionCategory.errorMinLengthCode", { defaultValue: "Mã danh mục phải có ít nhất 5 ký tự." }))
        .max(50, t("questionCategory.errorMaxLengthCode", { defaultValue: "Mã danh mục không được vượt quá 50 ký tự." })),
      name: z
        .string()
        .trim()
        .min(1, t("questionCategory.errorEmptyName", { defaultValue: "Tên danh mục không được để trống." }))
        .min(5, t("questionCategory.errorMinLengthName", { defaultValue: "Tên danh mục phải có ít nhất 5 ký tự." }))
        .max(200, t("questionCategory.errorMaxLengthName", { defaultValue: "Tên danh mục không được vượt quá 200 ký tự." })),
      desc: z
        .string()
        .trim()
        .max(500, t("questionCategory.errorMaxLengthDesc", { defaultValue: "Mô tả không được vượt quá 500 ký tự." }))
        .optional(),
    });

    const result = schema.safeParse({ code, name, desc });

    if (!result.success) {
      const fieldErrors: string[] = [];
      const fields: string[] = [];
      result.error.issues.forEach((err) => {
        fieldErrors.push(err.message);
        if (err.path.length > 0) fields.push(err.path[0] as string);
      });
      setErrors(fieldErrors);
      setInvalidFields(fields);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);
    setInvalidFields([]);

    try {
      let res;
      if (editingItem) {
        res = await questionCategoryApi.update(editingItem.id, {
          id: editingItem.id,
          code: code.trim(),
          name: name.trim(),
          description: desc.trim() || null,
          courseId,
        });
      } else {
        res = await questionCategoryApi.create({
          code: code.trim(),
          name: name.trim(),
          description: desc.trim() || null,
          courseId,
        });
      }

      if (res.success && res.data) {
        onSubmitSuccess(res.data, !!editingItem);
        onClose();
      } else {
        const msg = res.message
          ? t(`backendMessages.${res.message}`, { defaultValue: res.message })
          : t("questionCategory.saveError", { defaultValue: "Đã xảy ra lỗi khi lưu danh mục." });
        setErrors([msg]);
        if (res.message === "ERR_CODE_DUPLICATE") setInvalidFields(["code"]);
        else if (res.message === "ERR_NAME_DUPLICATE") setInvalidFields(["name"]);
      }
    } catch {
      setErrors([t("questionCategory.systemError", { defaultValue: "Lỗi hệ thống." })]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[520px] p-6 sm:p-8">
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {editingItem
            ? t("questionCategory.editTitle", { defaultValue: "Chỉnh sửa danh mục câu hỏi" })
            : t("questionCategory.createTitle", { defaultValue: "Thêm danh mục câu hỏi" })}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {editingItem
            ? t("questionCategory.editDesc", { defaultValue: "Cập nhật thông tin danh mục câu hỏi." })
            : t("questionCategory.createDesc", { defaultValue: "Điền thông tin để tạo danh mục câu hỏi mới." })}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2" noValidate>
          {/* Code */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("questionCategory.formCodeLabel", { defaultValue: "Mã danh mục" })}{" "}
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              maxLength={50}
              value={code}
              onChange={(e) => { setCode(e.target.value); clearField("code"); }}
              placeholder={t("questionCategory.formCodePlaceholder", { defaultValue: "VD: QC-001..." })}
              className={inputClass("code")}
            />
          </div>

          {/* Name */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("questionCategory.formNameLabel", { defaultValue: "Tên danh mục" })}{" "}
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              maxLength={200}
              value={name}
              onChange={(e) => { setName(e.target.value); clearField("name"); }}
              placeholder={t("questionCategory.formNamePlaceholder", { defaultValue: "VD: IELTS Reading Task 1..." })}
              className={inputClass("name")}
            />
          </div>

          {/* CourseId */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("questionCategory.courseLabel", { defaultValue: "Khóa học" })}
            </label>
            <select
              value={courseId ?? ""}
              onChange={(e) => setCourseId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 shadow-theme-xs"
            >
              <option value="" className="dark:bg-gray-900">
                {t("questionCategory.allCoursesOption", { defaultValue: "-- Chọn khóa học (Tất cả) --" })}
              </option>
              {courses.map((c) => (
                <option key={c.id} value={c.id} className="dark:bg-gray-900">
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("questionCategory.formDescLabel", { defaultValue: "Mô tả" })}
            </label>
            <textarea
              value={desc}
              onChange={(e) => { setDesc(e.target.value); clearField("desc"); }}
              placeholder={t("questionCategory.formDescPlaceholder", { defaultValue: "Mô tả ngắn về danh mục (không bắt buộc)..." })}
              rows={3}
              maxLength={500}
              className={`${inputClass("desc")} resize-none`}
            />
          </div>

          {/* Error block */}
          {errors.length > 0 && (
            <div className="p-3 text-sm text-rose-500 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-400 rounded-lg space-y-1">
              {errors.map((err, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <span className="shrink-0">•</span>
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
            >
              {t("questionCategory.btnCancel", { defaultValue: "Hủy" })}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2.5 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting
                ? t("questionCategory.btnSaving", { defaultValue: "Đang lưu..." })
                : editingItem
                ? t("questionCategory.btnUpdate", { defaultValue: "Cập nhật" })
                : t("questionCategory.btnSave", { defaultValue: "Tạo mới" })}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

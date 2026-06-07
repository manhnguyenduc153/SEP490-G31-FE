"use client";
import React from "react";
import { Modal } from "@/components/ui/modal";
import { QuestionCategoryItem } from "@/services/questionCategory.api";

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  editingItem: QuestionCategoryItem | null;
  formCode: string;
  setFormCode: (val: string) => void;
  formName: string;
  setFormName: (val: string) => void;
  formDesc: string;
  setFormDesc: (val: string) => void;
  formError: string | null;
  isSubmitting: boolean;
  handleSubmit: (e: React.FormEvent) => void;
}

export function CategoryFormModal({
  isOpen,
  onClose,
  t,
  editingItem,
  formCode,
  setFormCode,
  formName,
  setFormName,
  formDesc,
  setFormDesc,
  formError,
  isSubmitting,
  handleSubmit,
}: CategoryFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[520px] p-6 sm:p-8"
    >
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

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Code */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("questionCategory.formCodeLabel", { defaultValue: "Mã danh mục" })} <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={50}
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              placeholder={t("questionCategory.formCodePlaceholder", { defaultValue: "VD: MATH, LITERATURE..." })}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("questionCategory.formNameLabel", { defaultValue: "Tên danh mục" })} <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={200}
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder={t("questionCategory.formNamePlaceholder", { defaultValue: "VD: Toán học, Ngữ văn..." })}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("questionCategory.formDescLabel", { defaultValue: "Mô tả" })}
            </label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder={t("questionCategory.formDescPlaceholder", { defaultValue: "Mô tả ngắn về danh mục (không bắt buộc)..." })}
              rows={3}
              maxLength={500}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs resize-none"
            />
          </div>

          {/* Form-level error */}
          {formError && (
            <p className="text-sm text-error-500 dark:text-error-400">{formError}</p>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
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

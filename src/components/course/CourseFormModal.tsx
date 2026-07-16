"use client";
import React from "react";
import { Modal } from "@/components/ui/modal";
import { CourseItem } from "@/services/course.api";

interface CourseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  editingItem: CourseItem | null;
  formCode: string;
  setFormCode: (val: string) => void;
  formName: string;
  setFormName: (val: string) => void;
  formDuration: string;
  setFormDuration: (val: string) => void;
  formPrice: string;
  setFormPrice: (val: string) => void;
  formStatus: number;
  setFormStatus: (val: number) => void;
  formDesc: string;
  setFormDesc: (val: string) => void;
  formError: string | null;
  isSubmitting: boolean;
  handleSubmit: (e: React.FormEvent) => void;
}

export function CourseFormModal({
  isOpen,
  onClose,
  t,
  editingItem,
  formCode,
  setFormCode,
  formName,
  setFormName,
  formDuration,
  setFormDuration,
  formPrice,
  setFormPrice,
  formStatus,
  setFormStatus,
  formDesc,
  setFormDesc,
  formError,
  isSubmitting,
  handleSubmit,
}: CourseFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[560px] p-6 sm:p-8"
    >
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {editingItem
            ? t("course.editTitle", { defaultValue: "Chỉnh sửa khóa học" })
            : t("course.createTitle", { defaultValue: "Thêm khóa học mới" })}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {editingItem
            ? t("course.editDesc", { defaultValue: "Cập nhật thông tin của khóa học." })
            : t("course.createDesc", { defaultValue: "Điền thông tin để tạo khóa học mới." })}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Grid for Code and Name */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Code */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("course.formCodeLabel", { defaultValue: "Mã khóa học" })} <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={50}
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder={t("course.formCodePlaceholder", { defaultValue: "VD: MATH101..." })}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("course.formNameLabel", { defaultValue: "Tên khóa học" })} <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={200}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("course.formNamePlaceholder", { defaultValue: "VD: Toán Đại Số..." })}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>
          </div>

          {/* Grid for Duration and Price */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Duration */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("course.formDurationLabel", { defaultValue: "Thời lượng (tháng)" })}
              </label>
              <input
                type="number"
                min={0}
                value={formDuration}
                onChange={(e) => setFormDuration(e.target.value)}
                placeholder={t("course.formDurationPlaceholder", { defaultValue: "Nhập số tháng..." })}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("course.formPriceLabel", { defaultValue: "Học phí (VND)" })}
              </label>
              <input
                type="number"
                min={0}
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                placeholder={t("course.formPricePlaceholder", { defaultValue: "Nhập học phí..." })}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("course.formStatusLabel", { defaultValue: "Trạng thái hoạt động" })}
            </label>
            <div className="relative z-20 bg-transparent">
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 appearance-none focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:ring-brand-500/10 dark:focus:border-brand-800 shadow-theme-xs"
              >
                <option value={1} className="dark:bg-gray-900 dark:text-gray-400">
                  {t("course.statusActive", { defaultValue: "Hoạt động" })}
                </option>
                <option value={0} className="dark:bg-gray-900 dark:text-gray-400">
                  {t("course.statusInactive", { defaultValue: "Ngưng hoạt động" })}
                </option>
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
              {t("course.formDescLabel", { defaultValue: "Mô tả" })}
            </label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder={t("course.formDescPlaceholder", { defaultValue: "Mô tả ngắn về khóa học..." })}
              rows={3}
              maxLength={1000}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs resize-none"
            />
          </div>

          {/* Form-level error */}
          {formError && (
            <p className="text-sm text-error-500 dark:text-error-400">{formError}</p>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              {t("course.btnCancel", { defaultValue: "Hủy" })}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting
                ? t("course.btnSaving", { defaultValue: "Đang lưu..." })
                : editingItem
                ? t("course.btnUpdate", { defaultValue: "Cập nhật" })
                : t("course.btnSave", { defaultValue: "Tạo mới" })}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

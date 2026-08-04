"use client";
import React from "react";
import { Modal } from "@/components/ui/modal";

interface CategoryViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  formCode: string;
  formName: string;
  formDesc: string;
  formCourseName?: string | null;
  isLoadingDetail?: boolean;
  formError?: string | null;
}

export function CategoryViewModal({
  isOpen,
  onClose,
  t,
  formCode,
  formName,
  formDesc,
  formCourseName,
  isLoadingDetail = false,
  formError = null,
}: CategoryViewModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[520px] p-6 sm:p-8"
    >
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("questionCategory.viewTitle", { defaultValue: "Chi tiết danh mục câu hỏi" })}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("questionCategory.viewDesc", { defaultValue: "Xem thông tin chi tiết danh mục câu hỏi." })}
        </p>

        {isLoadingDetail ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("questionCategory.loadingDetail", { defaultValue: "Đang tải chi tiết..." })}
            </p>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {/* Code */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("questionCategory.formCodeLabel", { defaultValue: "Mã danh mục" })}
              </label>
              <input
                type="text"
                disabled
                value={formCode}
                placeholder={t("questionCategory.formCodePlaceholder", { defaultValue: "VD: QC-001..." })}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs disabled:bg-gray-100 dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("questionCategory.formNameLabel", { defaultValue: "Tên danh mục" })}
              </label>
              <input
                type="text"
                disabled
                value={formName}
                placeholder={t("questionCategory.formNamePlaceholder", { defaultValue: "VD: IELTS Reading Task 1..." })}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs disabled:bg-gray-100 dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
              />
            </div>

            {/* Course */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("questionCategory.courseLabel", { defaultValue: "Khóa học" })}
              </label>
              <input
                type="text"
                disabled
                value={formCourseName || t("questionCategory.allCourses", { defaultValue: "Tất cả khóa học" })}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs disabled:bg-gray-100 dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("questionCategory.formDescLabel", { defaultValue: "Mô tả" })}
              </label>
              <textarea
                disabled
                value={formDesc}
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs disabled:bg-gray-100 dark:disabled:bg-gray-800 dark:disabled:text-gray-400 resize-none"
              />
            </div>

            {formError && (
              <p className="text-sm text-error-500 dark:text-error-400">{formError}</p>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
              >
                {t("questionCategory.btnClose", { defaultValue: "Đóng" })}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

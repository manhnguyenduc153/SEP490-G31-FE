"use client";
import React from "react";
import { Modal } from "@/components/ui/modal";
import { TrashBinIcon } from "@/icons";
import { useTranslation } from "react-i18next";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  itemName?: string;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  itemName,
}: DeleteConfirmModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[420px] p-6 sm:p-8"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-error-50 dark:bg-error-500/10">
          <TrashBinIcon className="w-6 h-6 text-error-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("common.deleteConfirmTitle", { defaultValue: "Xác nhận xóa" })}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("common.deleteConfirmDesc", {
            name: itemName,
            defaultValue: `Bạn có chắc chắn muốn xóa "${itemName}"? Hành động này không thể hoàn tác.`
          })}
        </p>
        <div className="flex gap-3 mt-2 w-full">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
          >
            {t("common.btnCancel", { defaultValue: "Hủy" })}
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg bg-error-500 hover:bg-error-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isDeleting
              ? t("common.btnDeleting", { defaultValue: "Đang xóa..." })
              : t("common.btnDelete", { defaultValue: "Xóa" })}
          </button>
        </div>
      </div>
    </Modal>
  );
}

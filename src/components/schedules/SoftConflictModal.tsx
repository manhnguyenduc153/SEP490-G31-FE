"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, User, Calendar, Clock, Check, X } from "lucide-react";
import { StudentPreferenceWarning } from "@/services/class.api";

interface SoftConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  warnings: StudentPreferenceWarning[];
  targetDate: string;
  targetSlotLabel: string;
  loading?: boolean;
}

export const SoftConflictModal: React.FC<SoftConflictModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  warnings,
  targetDate,
  targetSlotLabel,
  loading = false,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-900/50 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {t("classSchedules.softConflictTitle", { defaultValue: "Cảnh báo nguyện vọng học viên" })}
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 font-medium">
                {t("classSchedules.softConflictSubtitle", { 
                  count: warnings.length,
                  defaultValue: `Có ${warnings.length} học viên có nguyện vọng lịch học khác với slot mới này.` 
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Target Slot Info */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{t("classSchedules.targetDateLabel", { defaultValue: "Ngày:" })} <strong>{targetDate}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>{t("classSchedules.targetSlotLabel", { defaultValue: "Khung giờ:" })} <strong>{targetSlotLabel}</strong></span>
          </div>
        </div>

        {/* Warning List */}
        <div className="p-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {t("classSchedules.softConflictExplanation", {
              defaultValue: "Những học viên dưới đây đã đăng ký thời gian học ưu tiên khác. Bạn vẫn có thể tiếp tục chuyển lịch nếu chấp thuận sự thay đổi này."
            })}
          </p>

          <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
            {warnings.map((w, idx) => (
              <div
                key={w.studentId || idx}
                className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {w.studentName || t("classSchedules.studentPrefix", { id: w.studentId, defaultValue: `Học viên #${w.studentId}` })}
                    </p>
                    {w.studentEmail && (
                      <p className="text-gray-500 dark:text-gray-400 truncate">{w.studentEmail}</p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block px-2 py-0.5 rounded bg-amber-100/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-medium text-[11px] mb-1">
                    {t("classSchedules.preferenceBadge", { defaultValue: "Nguyện vọng" })}
                  </span>
                  <p className="text-gray-600 dark:text-gray-300 text-[11px]">{w.preferredDays}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-[10px]">{w.preferredSlot}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            {t("common.cancel", { defaultValue: "Hủy bỏ" })}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl shadow-sm transition flex items-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {t("classSchedules.confirmOverride", { defaultValue: "Bỏ qua cảnh báo & Lưu" })}
          </button>
        </div>
      </div>
    </div>
  );
};

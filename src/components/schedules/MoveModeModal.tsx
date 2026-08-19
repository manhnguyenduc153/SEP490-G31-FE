"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, Repeat, ArrowRight, Clock, AlertCircle } from "lucide-react";

interface MoveModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  classCode: string;
  className?: string;
  sourceDate: string;
  sourceSlotLabel: string;
  targetDate: string;
  targetSlotLabel: string;
  onConfirm: (mode: "single" | "series") => void;
  loading?: boolean;
}

export const MoveModeModal: React.FC<MoveModeModalProps> = ({
  isOpen,
  onClose,
  classCode,
  className,
  sourceDate,
  sourceSlotLabel,
  targetDate,
  targetSlotLabel,
  onConfirm,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [selectedMode, setSelectedMode] = useState<"single" | "series">("single");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {t("classSchedules.moveModeTitle", { defaultValue: "Tùy chọn chuyển lịch" })}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {classCode} {className ? `• ${className}` : ""}
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

        {/* Schedule Change Summary Banner */}
        <div className="px-6 py-3.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
            <div className="flex flex-col">
              <span className="font-semibold text-gray-900 dark:text-white">{sourceDate}</span>
              <span className="text-gray-500">{sourceSlotLabel}</span>
            </div>
            <div className="flex items-center px-3 text-brand-500 font-medium">
              <ArrowRight className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex flex-col text-right">
              <span className="font-semibold text-brand-600 dark:text-brand-400">{targetDate}</span>
              <span className="text-brand-500 dark:text-brand-400">{targetSlotLabel}</span>
            </div>
          </div>
        </div>

        {/* Content & Options */}
        <div className="p-6 space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("classSchedules.selectMoveScopePrompt", { defaultValue: "Bạn muốn áp dụng thay đổi lịch này như thế nào?" })}
          </p>

          {/* Option 1: Single Slot */}
          <div
            onClick={() => setSelectedMode("single")}
            className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-start gap-3.5 ${
              selectedMode === "single"
                ? "border-brand-500 bg-brand-50/40 dark:bg-brand-950/20 shadow-sm"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800"
            }`}
          >
            <div className={`mt-0.5 p-2 rounded-lg ${
              selectedMode === "single" 
                ? "bg-brand-500 text-white" 
                : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            }`}>
              <Calendar className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  {t("classSchedules.moveSingleSlot", { defaultValue: "Chỉ chuyển buổi học này" })}
                </h4>
                <input
                  type="radio"
                  name="moveMode"
                  checked={selectedMode === "single"}
                  onChange={() => setSelectedMode("single")}
                  className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-gray-300"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                {t("classSchedules.moveSingleSlotDesc", { 
                  defaultValue: "Chỉ cập nhật duy nhất buổi học vào ngày đã chọn. Các buổi học khác trong kỳ giữ nguyên." 
                })}
              </p>
            </div>
          </div>

          {/* Option 2: All recurring slots in the week */}
          <div
            onClick={() => setSelectedMode("series")}
            className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-start gap-3.5 ${
              selectedMode === "series"
                ? "border-brand-500 bg-brand-50/40 dark:bg-brand-950/20 shadow-sm"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800"
            }`}
          >
            <div className={`mt-0.5 p-2 rounded-lg ${
              selectedMode === "series" 
                ? "bg-brand-500 text-white" 
                : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            }`}>
              <Repeat className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  {t("classSchedules.moveAllSlots", { defaultValue: "Tất cả các buổi cùng slot (Cả kỳ)" })}
                </h4>
                <input
                  type="radio"
                  name="moveMode"
                  checked={selectedMode === "series"}
                  onChange={() => setSelectedMode("series")}
                  className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-gray-300"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                {t("classSchedules.moveAllSlotsDesc", { 
                  defaultValue: "Đổi lịch định kỳ hàng tuần cho toàn bộ học kỳ từ slot cũ sang slot mới." 
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition"
          >
            {t("common.cancel", { defaultValue: "Hủy" })}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selectedMode)}
            disabled={loading}
            className="px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-xl shadow-sm transition flex items-center gap-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {t("common.confirm", { defaultValue: "Xác nhận" })}
          </button>
        </div>
      </div>
    </div>
  );
};

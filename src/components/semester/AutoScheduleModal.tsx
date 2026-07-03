"use client";
import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { semesterApi } from "@/services/semester.api";

interface AutoScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesterId: number;
  semesterName: string;
  showToast: (msg: string, type?: "success" | "error") => void;
  onSuccess: () => void;
}

export function AutoScheduleModal({
  isOpen,
  onClose,
  semesterId,
  semesterName,
  showToast,
  onSuccess,
}: AutoScheduleModalProps) {
  const [maxClassSize, setMaxClassSize] = useState<number>(15);
  const [minClassSize, setMinClassSize] = useState<number>(5);
  const [sessionsPerWeek, setSessionsPerWeek] = useState<number>(2);
  const [allowConsecutiveDays, setAllowConsecutiveDays] = useState<boolean>(false);
  const [allowWeekend, setAllowWeekend] = useState<boolean>(false);
  const [timePreferences, setTimePreferences] = useState<string[]>(["Morning", "Afternoon", "Evening"]);

  const [isScheduling, setIsScheduling] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const toggleTimePreference = (pref: string) => {
    if (timePreferences.includes(pref)) {
      setTimePreferences(timePreferences.filter((p) => p !== pref));
    } else {
      setTimePreferences([...timePreferences, pref]);
    }
  };

  const handleStartScheduling = async () => {
    if (timePreferences.length === 0) {
      showToast("Vui lòng chọn ít nhất một khung thời gian ưu tiên.", "error");
      return;
    }

    if (minClassSize > maxClassSize) {
      showToast("Sĩ số tối thiểu không được lớn hơn sĩ số tối đa.", "error");
      return;
    }

    setIsScheduling(true);
    setLoadingStep(1);

    // Simulate scheduling steps for beautiful UX
    const timers: NodeJS.Timeout[] = [];
    timers.push(setTimeout(() => setLoadingStep(2), 1500));
    timers.push(setTimeout(() => setLoadingStep(3), 3500));

    try {
      const res = await semesterApi.autoScheduleSemester({
        semesterId,
        maxClassSize,
        minClassSize,
        constraints: {
          sessionsPerWeek,
          timePreferences,
          allowConsecutiveDays,
          allowWeekend,
        },
      });

      // Clear layout timers
      timers.forEach((t) => clearTimeout(t));

      if (res.success) {
        setLoadingStep(4);
        setTimeout(() => {
          showToast(res.message || "Lập lịch tự động học kỳ thành công!", "success");
          onSuccess();
          onClose();
          setIsScheduling(false);
          setLoadingStep(0);
        }, 1500);
      } else {
        showToast(res.message || "Xếp lịch thất bại do xung đột ràng buộc hoặc bận lịch giáo viên.", "error");
        setIsScheduling(false);
        setLoadingStep(0);
      }
    } catch (err: any) {
      timers.forEach((t) => clearTimeout(t));
      showToast(err?.message || "Lỗi kết nối máy chủ khi xếp lịch.", "error");
      setIsScheduling(false);
      setLoadingStep(0);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[600px] p-6 sm:p-8" showCloseButton={!isScheduling}>
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tự động lập lịch & Xếp lớp học kỳ
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Học kỳ xếp lớp: <span className="font-semibold text-gray-700 dark:text-gray-300">{semesterName}</span>
          </p>
        </div>

        {isScheduling ? (
          <div className="flex flex-col items-center justify-center py-16 gap-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-pulse"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 animate-spin"></div>
            </div>

            <div className="text-center space-y-2">
              <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">
                Hệ thống đang tính toán lịch học tối ưu...
              </h4>
              <div className="text-sm text-gray-500 dark:text-gray-400 min-h-[40px] flex flex-col items-center justify-center">
                {loadingStep === 1 && (
                  <p className="animate-fade-in">Đang gom nhóm học sinh theo khóa học và ca đăng ký...</p>
                )}
                {loadingStep === 2 && (
                  <p className="animate-fade-in text-indigo-600 dark:text-indigo-400">
                    Đang thiết lập mô hình ràng buộc và giải thuật tối ưu CP-SAT...
                  </p>
                )}
                {loadingStep === 3 && (
                  <p className="animate-fade-in text-emerald-600 dark:text-emerald-400">
                    Đang phân bổ phòng học, ca học và giảng viên tối ưu...
                  </p>
                )}
                {loadingStep === 4 && (
                  <p className="animate-fade-in font-semibold text-emerald-600">
                    ✔ Đã hoàn tất! Đang lưu các lớp và thời khóa biểu mới...
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 text-xs text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900 rounded-lg">
              <strong>Lưu ý:</strong> Hệ thống sẽ tự động phân tích tất cả các đơn đăng ký học viên, gom nhóm thành lớp dự thảo (đáp ứng điều kiện kích thước lớp) rồi chạy bộ giải tối ưu hóa của Google OR-Tools để gán giảng viên, phòng học trống phù hợp nhất.
            </div>

            <form className="space-y-4">
              {/* Sĩ số lớp */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sĩ số tối đa / lớp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    required
                    value={maxClassSize}
                    onChange={(e) => setMaxClassSize(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sĩ số tối thiểu / lớp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    required
                    value={minClassSize}
                    onChange={(e) => setMinClassSize(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>
              </div>

              {/* Số buổi mỗi tuần */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Số buổi học mỗi tuần <span className="text-rose-500">*</span>
                </label>
                <select
                  value={sessionsPerWeek}
                  onChange={(e) => setSessionsPerWeek(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value={2}>2 buổi / tuần</option>
                  <option value={3}>3 buổi / tuần</option>
                  <option value={4}>4 buổi / tuần</option>
                </select>
              </div>

              {/* Ca học ưu tiên */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Khung thời gian có thể xếp lớp
                </label>
                <div className="flex gap-3">
                  {["Morning", "Afternoon", "Evening"].map((p) => {
                    const label = p === "Morning" ? "Sáng (Ca 1,2)" : p === "Afternoon" ? "Chiều (Ca 3,4)" : "Tối (Ca 5)";
                    const active = timePreferences.includes(p);
                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => toggleTimePreference(p)}
                        className={`flex-1 py-2 px-3 border text-xs font-semibold rounded-lg transition-all ${
                          active
                            ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-400"
                            : "bg-white border-gray-200 text-gray-500 dark:bg-gray-900 dark:border-gray-800"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tùy chọn khác */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowConsecutiveDays}
                    onChange={(e) => setAllowConsecutiveDays(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Cho phép học các ngày liên tiếp (ví dụ: học Thứ 2 và Thứ 3 liên tục)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowWeekend}
                    onChange={(e) => setAllowWeekend(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Cho phép xếp lớp vào các ngày cuối tuần (Thứ 7 & Chủ Nhật)
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleStartScheduling}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  Bắt đầu lập lịch
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Modal>
  );
}

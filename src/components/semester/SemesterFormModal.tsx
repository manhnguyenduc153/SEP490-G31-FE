"use client";
import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { SemesterItem, SemesterSaveDto } from "@/services/semester.api";

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
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setCode(editingItem.code);
      setName(editingItem.name);
      setStartDate(editingItem.startDate ? editingItem.startDate.split("T")[0] : "");
      setEndDate(editingItem.endDate ? editingItem.endDate.split("T")[0] : "");
      setStatus(editingItem.status);
    } else {
      setCode("");
      setName("");
      setStartDate("");
      setEndDate("");
      setStatus(0);
    }
    setError(null);
  }, [editingItem, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !startDate || !endDate) {
      setError("Vui lòng điền đầy đủ các trường bắt buộc.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const dto: SemesterSaveDto = {
      id: editingItem?.id,
      code: code.trim(),
      name: name.trim(),
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      status: status,
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
          editingItem ? "Cập nhật học kỳ thành công!" : "Tạo học kỳ mới thành công!"
        );
        onClose();
      } else {
        setError(res.message || "Đã xảy ra lỗi khi lưu học kỳ.");
      }
    } catch (err: any) {
      setError(err?.message || "Lỗi kết nối máy chủ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[560px] p-6 sm:p-8">
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {editingItem ? "Chỉnh sửa học kỳ" : "Thêm học kỳ mới"}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {editingItem
            ? "Cập nhật thông tin chi tiết cho học kỳ này."
            : "Tạo một học kỳ/niên khóa mới cho hệ thống xếp lớp tự động."}
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
                Mã học kỳ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={50}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="VD: SUM26, FALL26..."
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Tên học kỳ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={200}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Học kỳ Hè 2026..."
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Ngày bắt đầu <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Ngày kết thúc <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Trạng thái
            </label>
            <div className="relative z-20 bg-transparent">
              <select
                value={status}
                onChange={(e) => setStatus(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 appearance-none focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:ring-brand-500/10 dark:focus:border-brand-800 shadow-theme-xs"
              >
                <option value={0} className="dark:bg-gray-900 dark:text-white">Nháp (Draft)</option>
                <option value={1} className="dark:bg-gray-900 dark:text-white">Đang hoạt động (Active)</option>
                <option value={2} className="dark:bg-gray-900 dark:text-white">Đã kết thúc (Completed)</option>
                <option value={3} className="dark:bg-gray-900 dark:text-white">Đóng học kỳ (Closed)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Đang xử lý..." : editingItem ? "Lưu thay đổi" : "Tạo mới"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

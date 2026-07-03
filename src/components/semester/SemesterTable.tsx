"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { Calendar, UserCheck, UserPlus, Cpu } from "lucide-react";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import { SemesterFormModal } from "./SemesterFormModal";
import { TeacherAvailabilityModal } from "./TeacherAvailabilityModal";
import { StudentImportModal } from "./StudentImportModal";
import { AutoScheduleModal } from "./AutoScheduleModal";
import { semesterApi, SemesterItem } from "@/services/semester.api";

export default function SemesterTable() {
  const [items, setItems] = useState<SemesterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SemesterItem | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<SemesterItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [activeSemester, setActiveSemester] = useState<SemesterItem | null>(null);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAutoScheduleOpen, setIsAutoScheduleOpen] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
  };

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  // Fetch Semester list
  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await semesterApi.getAll();
        if (!mounted) return;
        if (res.success && res.data) {
          setItems(res.data || []);
        } else {
          setError(res.message || "Không thể tải danh sách học kỳ.");
        }
      } catch (err: any) {
        if (mounted) setError(err.message || "Lỗi hệ thống.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      const res = await semesterApi.delete(deletingItem.id);
      if (res.success) {
        showToast("Xóa học kỳ thành công!");
        triggerRefresh();
      } else {
        showToast(res.message || "Không thể xóa học kỳ.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Lỗi kết nối máy chủ.", "error");
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
      setDeletingItem(null);
    }
  };

  const getStatusBadgeClass = (status: number) => {
    switch (status) {
      case 0: // Draft
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700";
      case 1: // Active
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900";
      case 2: // Completed
        return "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200 dark:border-blue-900";
      case 3: // Closed
        return "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-200 dark:border-rose-900";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusName = (status: number) => {
    switch (status) {
      case 0: return "Nháp (Draft)";
      case 1: return "Đang hoạt động (Active)";
      case 2: return "Đã hoàn thành";
      case 3: return "Đã đóng (Closed)";
      default: return "Không rõ";
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  return (
    <div className="overflow-hidden bg-white dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/[0.05]">
      {/* Toast */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-[99999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg text-sm font-medium text-white transition-all duration-300 ${
            toastType === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {toastType === "success" ? (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 px-6 py-5 border-b border-gray-100 dark:border-white/[0.05] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Niên khóa & Học kỳ</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Quản lý kỳ học, lập lịch tự động giảng viên & học viên đăng ký.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setIsFormOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors shadow-theme-xs self-start sm:self-auto"
        >
          <svg className="fill-current" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8.00016 3.33331V12.6666M3.3335 7.99998H12.6668" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Thêm học kỳ mới
        </button>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-2"></div>
          <span className="text-sm text-gray-500">Đang tải dữ liệu...</span>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-rose-500">{error}</div>
      ) : items.length === 0 ? (
        <div className="p-16 text-center text-gray-500 dark:text-gray-400">
          Không tìm thấy học kỳ nào trong hệ thống. Vui lòng bấm nút thêm mới.
        </div>
      ) : (
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
              <TableRow>
                <TableCell isHeader className="px-6 py-4 text-center w-12">#</TableCell>
                <TableCell isHeader className="px-6 py-4">Mã học kỳ</TableCell>
                <TableCell isHeader className="px-6 py-4">Tên học kỳ</TableCell>
                <TableCell isHeader className="px-6 py-4">Ngày bắt đầu</TableCell>
                <TableCell isHeader className="px-6 py-4">Ngày kết thúc</TableCell>
                <TableCell isHeader className="px-6 py-4">Trạng thái</TableCell>
                <TableCell isHeader className="px-6 py-4 text-right">Xử lý xếp lớp</TableCell>
                <TableCell isHeader className="px-6 py-4 text-right">Thao tác</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10">
                  <td className="px-6 py-4 text-center text-gray-400 font-medium">{index + 1}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{item.code}</td>
                  <td className="px-6 py-4 text-gray-700 dark:text-gray-300 font-medium">{item.name}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{formatDate(item.startDate)}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{formatDate(item.endDate)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(item.status)}`}>
                      {getStatusName(item.status)}
                    </span>
                  </td>
                  {/* Scheduling Actions Group */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center gap-1.5">
                      {/* Teacher Availability Setup */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSemester(item);
                          setIsAvailabilityOpen(true);
                        }}
                        title="Thiết lập ca rảnh GV"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 hover:bg-emerald-50 dark:bg-gray-800 text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors border border-gray-100 dark:border-gray-700"
                      >
                        <UserCheck className="w-4 h-4" />
                      </button>

                      {/* Student Import */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSemester(item);
                          setIsImportOpen(true);
                        }}
                        title="Nhập Excel học viên đăng ký"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 hover:bg-blue-50 dark:bg-gray-800 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors border border-gray-100 dark:border-gray-700"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>

                      {/* Auto Schedule Solver */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSemester(item);
                          setIsAutoScheduleOpen(true);
                        }}
                        disabled={item.status === 2 || item.status === 3}
                        title="Lập lịch tự động (OR-Tools)"
                        className="inline-flex h-9 px-2.5 items-center justify-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold text-xs shadow-theme-xs transition-colors disabled:opacity-50"
                      >
                        <Cpu className="w-3.5 h-3.5" />
                        Xếp lịch
                      </button>
                    </div>
                  </td>
                  {/* General CRUD Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item);
                          setIsFormOpen(true);
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingItem(item);
                          setIsDeleteOpen(true);
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-red-50 text-gray-500 hover:text-rose-600 dark:hover:bg-rose-950/20 dark:text-gray-400 dark:hover:text-rose-400 transition-colors"
                      >
                        <TrashBinIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modals */}
      <SemesterFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingItem(null);
        }}
        editingItem={editingItem}
        onSubmitSuccess={(msg) => {
          showToast(msg);
          triggerRefresh();
        }}
      />

      {activeSemester && (
        <>
          <TeacherAvailabilityModal
            isOpen={isAvailabilityOpen}
            onClose={() => {
              setIsAvailabilityOpen(false);
              setActiveSemester(null);
            }}
            semesterId={activeSemester.id}
            semesterName={activeSemester.name}
            showToast={showToast}
          />

          <StudentImportModal
            isOpen={isImportOpen}
            onClose={() => {
              setIsImportOpen(false);
              setActiveSemester(null);
            }}
            semesterId={activeSemester.id}
            semesterName={activeSemester.name}
            showToast={showToast}
            onImportSuccess={() => triggerRefresh()}
          />

          <AutoScheduleModal
            isOpen={isAutoScheduleOpen}
            onClose={() => {
              setIsAutoScheduleOpen(false);
              setActiveSemester(null);
            }}
            semesterId={activeSemester.id}
            semesterName={activeSemester.name}
            showToast={showToast}
            onSuccess={() => triggerRefresh()}
          />
        </>
      )}

      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingItem(null);
        }}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        itemName={deletingItem?.name || ""}
      />
    </div>
  );
}

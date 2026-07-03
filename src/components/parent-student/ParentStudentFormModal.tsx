"use client";
import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import {
  ParentStudentItem,
  ParentStudentSaveDto,
} from "@/services/parentStudent.api";

import { studentApi, StudentItem } from "@/services/student.api";

interface ParentStudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  studentId?: number;             // ID học sinh hiện tại (bắt buộc)
  editingItem: ParentStudentItem | null;
  formError: string | null;
  isSubmitting: boolean;
  onSubmit: (dto: ParentStudentSaveDto) => void;
}

const RELATIONSHIP_OPTIONS = ["Cha", "Mẹ", "Anh", "Chị", "Ông", "Bà", "Khác"];

export function ParentStudentFormModal({
  isOpen,
  onClose,
  t,
  studentId,
  editingItem,
  formError,
  isSubmitting,
  onSubmit,
}: ParentStudentFormModalProps) {
  const [formData, setFormData] = useState<ParentStudentSaveDto>({
    studentId: studentId || 0,
    name: "",
    parentPhone: "",
    email: "",
    relationship: "",
  });

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // Lấy danh sách học sinh nếu tạo từ màn hình cha (không có studentId cụ thể)
  useEffect(() => {
    if (isOpen && !studentId && !editingItem) {
      const fetchStudents = async () => {
        setIsLoadingStudents(true);
        try {
          const res = await studentApi.getAll(1, 1000);
          if (res.statusCode === 200 && res.data) {
            setStudents(res.data.items || []);
          }
        } catch (error) {
          console.error("Failed to load students", error);
        } finally {
          setIsLoadingStudents(false);
        }
      };
      fetchStudents();
    }
  }, [isOpen, studentId, editingItem]);

  // Reset form khi mở modal
  useEffect(() => {
    if (editingItem && isOpen) {
      setFormData({
        id: editingItem.id,
        studentId: editingItem.studentId,
        name: editingItem.name || "",
        parentPhone: editingItem.parentPhone || "",
        email: editingItem.email || "",
        relationship: editingItem.relationship || "",
      });
    } else if (isOpen) {
      setFormData({
        studentId: studentId || 0,
        name: "",
        parentPhone: "",
        email: "",
        relationship: "",
      });
    }
  }, [editingItem, isOpen, studentId]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isEdit = !!editingItem;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-2xl w-full"
    >
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEdit
              ? t("parentStudent.editTitle")
              : t("parentStudent.createTitle")}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isEdit
              ? t("parentStudent.editDesc")
              : t("parentStudent.createDesc")}
          </p>
          {/* Chú ý về tài khoản tự động */}
          {!isEdit && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3">
              <span className="text-blue-500 mt-0.5">ℹ️</span>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t("parentStudent.autoAccountNote")}
              </p>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Row 0: Chọn Học Sinh (chỉ hiển thị nếu không có studentId và đang tạo mới) */}
          {!studentId && !isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Chọn học sinh
                <span className="text-red-500 ml-1">*</span>
              </label>
              <select
                name="studentId"
                value={formData.studentId || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, studentId: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                required
              >
                <option value="">-- Chọn học sinh --</option>
                {isLoadingStudents ? (
                  <option value="" disabled>Đang tải danh sách...</option>
                ) : (
                  students.map((stu) => (
                    <option key={stu.id} value={stu.id}>
                      {stu.code} - {stu.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Row 1: Mã + Tên */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">


            {/* Họ tên */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("parentStudent.formNameLabel")}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={t("parentStudent.formNamePlaceholder")}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                required
              />
            </div>
          </div>

          {/* Row 2: Email + Điện thoại */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("parentStudent.formEmailLabel")}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={t("parentStudent.formEmailPlaceholder")}
                disabled={isEdit} // Không cho đổi email khi edit
                className={`w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                  isEdit
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
                    : "bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                }`}
                required={!isEdit}
              />
              {isEdit && (
                <p className="mt-1 text-xs text-gray-400">
                  Email không thể thay đổi sau khi tạo
                </p>
              )}
            </div>

            {/* Số điện thoại */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("parentStudent.formPhoneLabel")}
              </label>
              <input
                type="tel"
                name="parentPhone"
                value={formData.parentPhone || ""}
                onChange={handleChange}
                placeholder={t("parentStudent.formPhonePlaceholder")}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          {/* Row 3: Quan hệ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Quan hệ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("parentStudent.formRelationshipLabel")}
              </label>
              <input
                type="text"
                name="relationship"
                value={formData.relationship || ""}
                onChange={handleChange}
                placeholder={t("parentStudent.formRelationshipPlaceholder")}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          {/* Form Error */}
          {formError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
              <p className="text-sm text-red-600 dark:text-red-400">
                {formError}
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition disabled:opacity-50"
            >
              {t("parentStudent.btnCancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  {t("parentStudent.btnSaving")}
                </>
              ) : (
                t("parentStudent.btnSave")
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

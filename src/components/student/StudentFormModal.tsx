"use client";
import React from "react";
import { Modal } from "@/components/ui/modal";
import { StudentItem, StudentSaveDto } from "@/services/student.api";

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  editingItem: StudentItem | null;
  formValues: StudentSaveDto;
  setFormValues: React.Dispatch<React.SetStateAction<StudentSaveDto>>;
  formError: string | null;
  isSubmitting: boolean;
  handleSubmit: (e: React.FormEvent) => void;
}

export function StudentFormModal({
  isOpen,
  onClose,
  t,
  editingItem,
  formValues,
  setFormValues,
  formError,
  isSubmitting,
  handleSubmit,
}: StudentFormModalProps) {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: value === "" ? null : value,
    }));
  };

  const handleGenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormValues((prev) => ({
      ...prev,
      gender: value === "" ? null : value === "true",
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: value === "" ? null : Number(value),
    }));
  };

  // Format date for the input element (YYYY-MM-DD)
  const formatDateForInput = (dateStr?: string | null) => {
    if (!dateStr) return "";
    return dateStr.split("T")[0];
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[700px] p-6 sm:p-8"
    >
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {editingItem
            ? t("student.editTitle", { defaultValue: "Chỉnh sửa thông tin học sinh" })
            : t("student.createTitle", { defaultValue: "Thêm học sinh mới" })}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {editingItem
            ? t("student.editDesc", { defaultValue: "Cập nhật hồ sơ học sinh." })
            : t("student.createDesc", { defaultValue: "Điền thông tin chi tiết để tạo hồ sơ học sinh mới." })}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Code */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("student.formCodeLabel", { defaultValue: "Mã học sinh" })} <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                name="code"
                required
                maxLength={50}
                value={formValues.code || ""}
                onChange={handleChange}
                placeholder={t("student.formCodePlaceholder", { defaultValue: "Mã học sinh..." })}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("student.formNameLabel", { defaultValue: "Họ và tên" })} <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                maxLength={200}
                value={formValues.name || ""}
                onChange={handleChange}
                placeholder={t("student.formNamePlaceholder", { defaultValue: "Họ và tên..." })}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>

            {/* Dob */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("student.formDobLabel", { defaultValue: "Ngày sinh" })}
              </label>
              <input
                type="date"
                name="dob"
                value={formatDateForInput(formValues.dob)}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("student.formGenderLabel", { defaultValue: "Giới tính" })}
              </label>
              <select
                name="gender"
                value={formValues.gender === null ? "" : String(formValues.gender)}
                onChange={handleGenderChange}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 shadow-theme-xs"
              >
                <option value="" className="dark:bg-gray-900">{t("student.formGenderLabel", { defaultValue: "Chọn giới tính" })}</option>
                <option value="true" className="dark:bg-gray-900">{t("student.formGenderMale", { defaultValue: "Nam" })}</option>
                <option value="false" className="dark:bg-gray-900">{t("student.formGenderFemale", { defaultValue: "Nữ" })}</option>
              </select>
            </div>

            {/* Email */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("student.formEmailLabel", { defaultValue: "Email" })}
              </label>
              <input
                type="email"
                name="email"
                maxLength={150}
                value={formValues.email || ""}
                onChange={handleChange}
                placeholder={t("student.formEmailPlaceholder", { defaultValue: "example@email.com" })}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("student.formPhoneLabel", { defaultValue: "Số điện thoại" })}
              </label>
              <input
                type="text"
                name="phone"
                maxLength={20}
                value={formValues.phone || ""}
                onChange={handleChange}
                placeholder={t("student.formPhonePlaceholder", { defaultValue: "Số điện thoại..." })}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>

            {/* School Name */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("student.formSchoolNameLabel", { defaultValue: "Trường học cũ/hiện tại" })}
              </label>
              <input
                type="text"
                name="schoolName"
                maxLength={200}
                value={formValues.schoolName || ""}
                onChange={handleChange}
                placeholder={t("student.formSchoolNamePlaceholder", { defaultValue: "Nhập tên trường học..." })}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>

            {/* Grade Level */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("student.formGradeLevelLabel", { defaultValue: "Khối lớp" })}
              </label>
              <input
                type="number"
                name="gradeLevel"
                min={1}
                max={12}
                value={formValues.gradeLevel === null ? "" : formValues.gradeLevel}
                onChange={handleNumberChange}
                placeholder={t("student.formGradeLevelPlaceholder", { defaultValue: "Nhập khối lớp (1-12)..." })}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>

            {/* Parent Name */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("student.formParentNameLabel", { defaultValue: "Họ tên phụ huynh" })}
              </label>
              <input
                type="text"
                name="parentName"
                maxLength={200}
                value={formValues.parentName || ""}
                onChange={handleChange}
                placeholder={t("student.formParentNamePlaceholder", { defaultValue: "Nhập tên phụ huynh..." })}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>

            {/* Parent Phone */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("student.formParentPhoneLabel", { defaultValue: "SĐT phụ huynh" })}
              </label>
              <input
                type="text"
                name="parentPhone"
                maxLength={20}
                value={formValues.parentPhone || ""}
                onChange={handleChange}
                placeholder={t("student.formParentPhonePlaceholder", { defaultValue: "Nhập SĐT phụ huynh..." })}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("student.formStatusLabel", { defaultValue: "Trạng thái" })}
              </label>
              <select
                name="status"
                value={formValues.status}
                onChange={handleNumberChange}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 shadow-theme-xs"
              >
                <option value={1} className="dark:bg-gray-900">{t("student.formStatusActive", { defaultValue: "Hoạt động" })}</option>
                <option value={0} className="dark:bg-gray-900">{t("student.formStatusInactive", { defaultValue: "Ngưng hoạt động" })}</option>
                <option value={2} className="dark:bg-gray-900">{t("student.formStatusSuspended", { defaultValue: "Bị đình chỉ" })}</option>
                <option value={3} className="dark:bg-gray-900">{t("student.formStatusGraduated", { defaultValue: "Đã tốt nghiệp" })}</option>
              </select>
            </div>

            {/* Avatar URL */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("student.formAvatarLabel", { defaultValue: "Ảnh đại diện (URL)" })}
              </label>
              <input
                type="text"
                name="avatar"
                value={formValues.avatar || ""}
                onChange={handleChange}
                placeholder={t("student.formAvatarPlaceholder", { defaultValue: "URL ảnh đại diện..." })}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("student.colAddress", { defaultValue: "Địa chỉ" })}
            </label>
            <input
              type="text"
              name="address"
              maxLength={500}
              value={formValues.address || ""}
              onChange={handleChange}
              placeholder={t("student.formAddressPlaceholder", { defaultValue: "Nhập địa chỉ..." })}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("student.formDescLabel", { defaultValue: "Ghi chú/Mô tả" })}
            </label>
            <textarea
              name="description"
              value={formValues.description || ""}
              onChange={handleChange}
              placeholder={t("student.formDescPlaceholder", { defaultValue: "Ghi chú bổ sung (không bắt buộc)..." })}
              rows={2}
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
              {t("student.btnCancel", { defaultValue: "Hủy" })}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2.5 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting
                ? t("student.btnSaving", { defaultValue: "Đang lưu..." })
                : editingItem
                ? t("student.btnUpdate", { defaultValue: "Cập nhật" })
                : t("student.btnSave", { defaultValue: "Lưu" })}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

"use client";
import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { TeacherItem, TeacherSaveDto } from "@/services/teacher.api";

interface TeacherFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  editingItem: TeacherItem | null;
  formError: string | null;
  isSubmitting: boolean;
  onSubmit: (dto: TeacherSaveDto) => void;
}

export function TeacherFormModal({
  isOpen,
  onClose,
  t,
  editingItem,
  formError,
  isSubmitting,
  onSubmit,
}: TeacherFormModalProps) {
  const [formData, setFormData] = useState<TeacherSaveDto>({
    code: "",
    name: "",
    email: "",
    phone: "",
    dob: "",
    address: "",
    status: 1, // 1: Active
    description: "",
  });

  useEffect(() => {
    if (editingItem && isOpen) {
      setFormData({
        id: editingItem.id,
        code: editingItem.code || "",
        name: editingItem.name || "",
        email: editingItem.email || "",
        phone: editingItem.phone || "",
        dob: editingItem.dob ? editingItem.dob.split("T")[0] : "",
        address: editingItem.address || "",
        status: editingItem.status ?? 1,
        description: editingItem.description || "",
      });
    } else if (isOpen) {
      setFormData({
        code: "",
        name: "",
        email: "",
        phone: "",
        dob: "",
        address: "",
        status: 1,
        description: "",
      });
    }
  }, [editingItem, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "status" ? parseInt(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[700px] p-6 sm:p-8">
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {editingItem ? t("teacher.editTitle") : t("teacher.createTitle")}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {editingItem ? t("teacher.editDesc") : t("teacher.createDesc")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Code */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("teacher.formCodeLabel")} <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                name="code"
                required
                maxLength={50}
                value={formData.code}
                onChange={handleChange}
                placeholder={t("teacher.formCodePlaceholder")}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("teacher.formNameLabel")} <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                maxLength={200}
                value={formData.name}
                onChange={handleChange}
                placeholder={t("teacher.formNamePlaceholder")}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("teacher.formEmailLabel")}
              </label>
              <input
                type="email"
                name="email"
                maxLength={150}
                value={formData.email || ""}
                onChange={handleChange}
                placeholder={t("teacher.formEmailPlaceholder")}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("teacher.formPhoneLabel")}
              </label>
              <input
                type="text"
                name="phone"
                maxLength={20}
                value={formData.phone || ""}
                onChange={handleChange}
                placeholder={t("teacher.formPhonePlaceholder")}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>

            {/* Dob */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("teacher.formDobLabel")}
              </label>
              <input
                type="date"
                name="dob"
                value={formData.dob || ""}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("teacher.formStatusLabel")}
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
              >
                <option value={1}>{t("teacher.statusActive")}</option>
                <option value={0}>{t("teacher.statusInactive")}</option>
              </select>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("teacher.formAddressLabel")}
            </label>
            <input
              type="text"
              name="address"
              value={formData.address || ""}
              onChange={handleChange}
              placeholder={t("teacher.formAddressPlaceholder")}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("teacher.formDescLabel")}
            </label>
            <textarea
              name="description"
              value={formData.description || ""}
              onChange={handleChange}
              placeholder={t("teacher.formDescPlaceholder")}
              rows={3}
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
              {t("teacher.btnCancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2.5 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting
                ? t("common.btnSaving", { defaultValue: "Đang lưu..." })
                : editingItem
                ? t("teacher.btnSave", { defaultValue: "Lưu" })
                : t("teacher.addTeacher", { defaultValue: "Thêm giáo viên" })}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

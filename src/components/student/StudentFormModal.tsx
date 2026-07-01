"use client";
import React, { useEffect, useState, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { StudentItem, StudentSaveDto, studentApi } from "@/services/student.api";
import { ENV } from "@/config/env";
import { EyeIcon } from "@/icons";
import { CodeHelper } from "@/helpers/CodeHelper";


interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  editingItem: StudentItem | null;
  formError: string | null;
  isSubmitting: boolean;
  onSubmit: (dto: StudentSaveDto) => void;
}

export function StudentFormModal({
  isOpen,
  onClose,
  t,
  editingItem,
  formError,
  isSubmitting,
  onSubmit,
}: StudentFormModalProps) {
  const [formData, setFormData] = useState<StudentSaveDto>({
    code: "",
    name: "",
    dob: null,
    gender: null,
    email: null,
    phone: null,
    address: null,
    status: 1,
    description: null,
    schoolName: null,
    gradeLevel: null,
    parentName: null,
    parentPhone: null,
    avatar: null,
  });

  const [isUploading, setIsUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingItem && isOpen) {
      setFormData({
        id: editingItem.id,
        code: editingItem.code || "",
        name: editingItem.name || "",
        dob: editingItem.dob ? editingItem.dob.split("T")[0] : null,
        gender: editingItem.gender ?? null,
        email: editingItem.email || null,
        phone: editingItem.phone || null,
        address: editingItem.address || null,
        status: editingItem.status ?? 1,
        description: editingItem.description || null,
        schoolName: editingItem.schoolName || null,
        gradeLevel: editingItem.gradeLevel ?? null,
        parentName: editingItem.parentName || null,
        parentPhone: editingItem.parentPhone || null,
        avatar: editingItem.avatar || null,
      });
    } else if (isOpen) {
      setFormData({
        code: CodeHelper.generate("STD"),
        name: "",
        dob: null,
        gender: null,
        email: null,
        phone: null,
        address: null,
        status: 1,
        description: null,
        schoolName: null,
        gradeLevel: null,
        parentName: null,
        parentPhone: null,
        avatar: null,
      });
    }

    // Reset local files
    setAvatarFile(null);
    setAvatarPreview(null);
  }, [editingItem, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === "" ? null : value,
    }));
  };

  const handleGenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      gender: value === "" ? null : value === "true",
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === "" ? null : Number(value),
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalFormData = { ...formData };
    
    try {
      setIsUploading(true);
      if (avatarFile) {
        const res = await studentApi.uploadFile(avatarFile);
        if (res.success && res.data) {
          finalFormData.avatar = res.data;
        } else {
          alert(res.message || "Lỗi tải ảnh đại diện");
          setIsUploading(false);
          return;
        }
      }
      await onSubmit(finalFormData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  // Format date for the input element (YYYY-MM-DD)
  const formatDateForInput = (dateStr?: string | null) => {
    if (!dateStr) return "";
    return dateStr.split("T")[0];
  };

  // Helper to build full image URL
  const getImageUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${ENV.API_BASE_URL}${path}`;
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        className="max-w-[950px] p-6 sm:p-8"
      >
        <div className="flex flex-col gap-4">
          <div>
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
          </div>

          <form onSubmit={handleSubmit} className="mt-2">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Basic Info */}
              <div className="lg:col-span-2 space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-4 border-b pb-2 dark:border-gray-800 text-sm">
                  Thông tin cơ bản
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      value={formData.code || ""}
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
                      value={formData.name || ""}
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
                      value={formatDateForInput(formData.dob)}
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
                      value={formData.gender === null ? "" : String(formData.gender)}
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
                      {t("student.formEmailLabel", { defaultValue: "Email" })} <span className="text-error-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      maxLength={150}
                      value={formData.email || ""}
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
                      value={formData.phone || ""}
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
                      value={formData.schoolName || ""}
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
                      value={formData.gradeLevel === null ? "" : formData.gradeLevel}
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
                      value={formData.parentName || ""}
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
                      value={formData.parentPhone || ""}
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
                      value={formData.status}
                      onChange={handleNumberChange}
                      className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 shadow-theme-xs"
                    >
                      <option value={1} className="dark:bg-gray-900">{t("student.formStatusActive", { defaultValue: "Hoạt động" })}</option>
                      <option value={0} className="dark:bg-gray-900">{t("student.formStatusInactive", { defaultValue: "Ngưng hoạt động" })}</option>
                      <option value={2} className="dark:bg-gray-900">{t("student.formStatusSuspended", { defaultValue: "Bị đình chỉ" })}</option>
                      <option value={3} className="dark:bg-gray-900">{t("student.formStatusGraduated", { defaultValue: "Đã tốt nghiệp" })}</option>
                    </select>
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
                    value={formData.address || ""}
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
                    value={formData.description || ""}
                    onChange={handleChange}
                    placeholder={t("student.formDescPlaceholder", { defaultValue: "Ghi chú bổ sung (không bắt buộc)..." })}
                    rows={2}
                    maxLength={500}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs resize-none"
                  />
                </div>
              </div>

              {/* Right Column: Avatar */}
              <div className="lg:col-span-1 flex flex-col gap-6 border-l border-gray-100 dark:border-gray-800 pl-0 lg:pl-6">
                
                {/* Avatar */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2 border-b pb-2 dark:border-gray-800 text-sm">
                    {t("student.avatarLabel", { defaultValue: "Ảnh đại diện" })}
                  </h4>
                  <div 
                    className="mt-2 flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer group"
                    onClick={handleAvatarClick}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={handleFileChange}
                    />
                    
                    {isUploading ? (
                      <div className="flex flex-col items-center py-6">
                        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="mt-2 text-xs text-gray-500">Đang lưu...</span>
                      </div>
                    ) : avatarPreview || formData.avatar ? (
                      <div className="relative w-full aspect-square overflow-hidden rounded-lg group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={avatarPreview || (getImageUrl(formData.avatar) as string)}
                          alt="Avatar preview"
                          className="object-cover w-full h-full"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setPreviewImage(avatarPreview || getImageUrl(formData.avatar)); }}
                            className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
                            title="Xem ảnh phóng to"
                          >
                            <EyeIcon className="w-5 h-5" />
                          </button>
                          <span className="text-white text-xs font-medium px-3 py-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                            Thay đổi ảnh
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center py-6">
                        <div className="w-10 h-10 mb-2 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-xs font-medium text-brand-600 dark:text-brand-400 mb-1">
                          Tải ảnh lên
                        </p>
                        <p className="text-[10px] text-gray-400 px-2 text-center leading-normal">
                          {t("student.uploadPlaceholder", { defaultValue: "Cho phép các định dạng: *.png, *.jpg và *.jpeg. Kích thước tối đa: 2MB" })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Form-level error */}
            {formError && (
              <p className="text-sm text-error-500 dark:text-error-400 mt-4">{formError}</p>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-6 mt-8 border-t border-gray-200 dark:border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
              >
                {t("student.btnCancel", { defaultValue: "Hủy" })}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUploading}
                className="px-5 py-2.5 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting || isUploading
                  ? t("student.btnSaving", { defaultValue: "Đang lưu..." })
                  : editingItem
                  ? t("student.btnUpdate", { defaultValue: "Cập nhật" })
                  : t("student.btnSave", { defaultValue: "Lưu" })}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Image Preview Modal */}
      {previewImage && (
        <Modal isOpen={!!previewImage} onClose={() => setPreviewImage(null)} className="max-w-4xl p-2 bg-transparent shadow-none">
          <div className="relative flex justify-center items-center w-full h-full min-h-[300px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImage} alt="Preview" className="max-h-[85vh] object-contain rounded-lg" />
            <button 
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-4 -right-4 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

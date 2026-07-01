"use client";
import React, { useEffect, useState, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { TeacherItem, TeacherSaveDto, teacherApi, GradeLevel } from "@/services/teacher.api";
import { env } from "process";
import { EyeIcon, CalenderIcon } from "@/icons";
import { CodeHelper } from "@/helpers/CodeHelper";

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
    gender: null,
    address: "",
    status: 1, // 1: Active
    description: "",
    gradeLevel: null,
    avatar: null,
    certificate: null,
  });

  const [isUploading, setIsUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [certPreview, setCertPreview] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const certInputRef = useRef<HTMLInputElement>(null);
  const dobInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingItem && isOpen) {
      setFormData({
        id: editingItem.id,
        code: editingItem.code || "",
        name: editingItem.name || "",
        email: editingItem.email || "",
        phone: editingItem.phone || "",
        dob: editingItem.dob ? editingItem.dob.split("T")[0] : "",
        gender: editingItem.gender ?? null,
        address: editingItem.address || "",
        status: editingItem.status ?? 1,
        description: editingItem.description || "",
        gradeLevel: editingItem.gradeLevel ?? null,
        avatar: editingItem.avatar || null,
        certificate: editingItem.certificate || null,
      });
    } else if (isOpen) {
      setFormData({
        code: CodeHelper.generate("GV"),
        name: "",
        email: "",
        phone: "",
        dob: "",
        gender: null,
        address: "",
        status: 1,
        description: "",
        gradeLevel: null,
        avatar: null,
        certificate: null,
      });
    }

    // Reset local files
    setAvatarFile(null);
    setCertFile(null);
    setAvatarPreview(null);
    setCertPreview(null);
  }, [editingItem, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData((prev) => {
      let parsedValue: any = value;
      if (name === "status") {
        parsedValue = value ? parseInt(value) : null;
      } else if (name === "gradeLevel") {
        parsedValue = value || null;
      } else if (name === "gender") {
        if (value === "true") parsedValue = true;
        else if (value === "false") parsedValue = false;
        else parsedValue = null;
      }

      return {
        ...prev,
        [name]: parsedValue,
      };
    });
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

  const handleCertChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCertFile(file);
    const url = URL.createObjectURL(file);
    setCertPreview(url);
    if (certInputRef.current) {
      certInputRef.current.value = "";
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleCertClick = () => {
    certInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalFormData = { ...formData };
    
    // Clean up empty strings to null for backend optional fields
    if (finalFormData.dob === "") finalFormData.dob = null;
    if (finalFormData.email === "") finalFormData.email = null;
    if (finalFormData.phone === "") finalFormData.phone = null;
    if (finalFormData.address === "") finalFormData.address = null;
    if (finalFormData.description === "") finalFormData.description = null;
    
    try {
      setIsUploading(true);
      if (avatarFile) {
        const res = await teacherApi.uploadFile(avatarFile);
        if (res.success && res.data) {
          finalFormData.avatar = res.data;
        } else {
          alert(res.message || "Lỗi tải ảnh đại diện");
          setIsUploading(false);
          return;
        }
      }
      if (certFile) {
        const res = await teacherApi.uploadDocument(certFile);
        if (res.success && res.data) {
          finalFormData.certificate = res.data;
        } else {
          alert(res.message || "Lỗi tải chứng chỉ");
          setIsUploading(false);
          return;
        }
      }
      setIsUploading(false);
      onSubmit(finalFormData);
    } catch (err) {
      alert("Lỗi upload file");
      setIsUploading(false);
    }
  };

  // Helper to build full image URL
  const getImageUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://localhost:54353";
    return `${baseUrl}${path}`;
  };

  // Helper to check if file is an image
  const isImage = (path: string | null | undefined) => {
    if (!path) return false;
    return path.match(/\.(jpeg|jpg|gif|png)$/i) != null;
  };

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[750px] p-4">
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingItem ? t("teacher.editTitle") : t("teacher.createTitle")}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {editingItem ? t("teacher.editDesc") : t("teacher.createDesc")}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* Left Column: Basic Info (takes 2/3 space on large screens) */}
            <div className="lg:col-span-2 space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2 border-b pb-1.5 dark:border-gray-800 text-sm">
                Thông tin cơ bản
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2.5">
                {/* Name */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
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
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>

                {/* Code */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("teacher.formCodeLabel")} <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="code"
                    required
                    disabled
                    maxLength={50}
                    value={formData.code}
                    onChange={handleChange}
                    placeholder={t("teacher.formCodePlaceholder")}
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>

                {/* Dob */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("teacher.formDobLabel")}
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      name="dob"
                      ref={dobInputRef}
                      value={formData.dob || ""}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 bg-transparent pl-4 pr-10 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden"
                    />
                    <button 
                      type="button"
                      onClick={() => dobInputRef.current?.showPicker()}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 transition-colors"
                    >
                      <CalenderIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("teacher.formGenderLabel")}
                  </label>
                  <select
                    name="gender"
                    value={formData.gender === true ? "true" : formData.gender === false ? "false" : ""}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value="">{t("teacher.formGenderPlaceholder")}</option>
                    <option value="true">{t("teacher.genderMale")}</option>
                    <option value="false">{t("teacher.genderFemale")}</option>
                  </select>
                </div>

                {/* Email */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("teacher.formEmailLabel")}
                  </label>
                  <input
                    type="email"
                    name="email"
                    maxLength={150}
                    value={formData.email || ""}
                    onChange={handleChange}
                    placeholder={t("teacher.formEmailPlaceholder")}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("teacher.formPhoneLabel")}
                  </label>
                  <input
                    type="text"
                    name="phone"
                    maxLength={20}
                    value={formData.phone || ""}
                    onChange={handleChange}
                    placeholder={t("teacher.formPhonePlaceholder")}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>

                {/* Grade Level */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("teacher.formGradeLevelLabel")}
                  </label>
                  <select
                    name="gradeLevel"
                    value={formData.gradeLevel || ""}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value="">Chọn cấp độ...</option>
                    <option value={GradeLevel.Foundation}>{t("teacher.gradeLevels.Foundation")}</option>
                    <option value={GradeLevel.PreIelts}>{t("teacher.gradeLevels.PreIelts")}</option>
                    <option value={GradeLevel.Ielts4_5}>{t("teacher.gradeLevels.Ielts4_5")}</option>
                    <option value={GradeLevel.Ielts5_6}>{t("teacher.gradeLevels.Ielts5_6")}</option>
                    <option value={GradeLevel.Ielts6_65}>{t("teacher.gradeLevels.Ielts6_65")}</option>
                    <option value={GradeLevel.Ielts65Plus}>{t("teacher.gradeLevels.Ielts65Plus")}</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("teacher.formStatusLabel")} <span className="text-error-500">*</span>
                  </label>
                  <select
                    name="status"
                    required
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value={1}>{t("teacher.statusActive")}</option>
                    <option value={0}>{t("teacher.statusInactive")}</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div className="pt-0.5">
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("teacher.formAddressLabel")}
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address || ""}
                  onChange={handleChange}
                  placeholder={t("teacher.formAddressPlaceholder")}
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>

              {/* Description */}
              <div className="pt-0.5">
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("teacher.formDescLabel")}
                </label>
                <textarea
                  name="description"
                  value={formData.description || ""}
                  onChange={handleChange}
                  placeholder={t("teacher.formDescPlaceholder")}
                  rows={2}
                  maxLength={500}
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 resize-none"
                />
              </div>
            </div>

            {/* Right Column: Avatar & Certificate */}
            <div className="lg:col-span-1 flex flex-col gap-3 border-l border-gray-100 dark:border-gray-800 pl-0 lg:pl-5">
              
              {/* Avatar */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 border-b pb-2 dark:border-gray-800 text-sm">
                  {t("teacher.avatarLabel")}
                </h4>
                <div 
                  className="mt-1.5 flex flex-col items-center justify-center p-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer group h-28"
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
                    <div className="relative w-full h-full overflow-hidden rounded-lg group">
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
                    <div className="flex flex-col items-center text-center py-2">
                      <div className="w-8 h-8 mb-1.5 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-xs font-medium text-brand-600 dark:text-brand-400 mb-1">
                        Tải ảnh lên
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Certificate */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 border-b pb-2 dark:border-gray-800 text-sm">
                  {t("teacher.certificateLabel")}
                </h4>
                <div 
                  className="mt-1.5 flex flex-col items-center justify-center p-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer group h-32"
                  onClick={handleCertClick}
                >
                  <input
                    type="file"
                    ref={certInputRef}
                    className="hidden"
                    accept="image/png, image/jpeg, image/jpg, application/pdf, .doc, .docx"
                    onChange={handleCertChange}
                  />
                  
                  {isUploading ? (
                    <div className="flex flex-col items-center py-6">
                      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="mt-2 text-xs text-gray-500">Đang lưu...</span>
                    </div>
                  ) : certPreview || formData.certificate ? (
                    <div className="relative w-full h-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center group">
                      {(certFile && certFile.type.startsWith('image/')) || (!certFile && isImage(formData.certificate)) ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={certPreview || (getImageUrl(formData.certificate) as string)}
                            alt="Certificate preview"
                            className="object-cover w-full h-full"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                            <button 
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setPreviewImage(certPreview || getImageUrl(formData.certificate)); }}
                              className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
                              title="Xem ảnh phóng to"
                            >
                              <EyeIcon className="w-5 h-5" />
                            </button>
                            <span className="text-white text-xs font-medium px-3 py-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                              Thay đổi
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-col items-center text-center p-4">
                            <svg className="w-12 h-12 text-brand-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 break-all max-w-full">
                              {certFile ? certFile.name : formData.certificate?.split('/').pop()}
                            </p>
                          </div>
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-xs font-medium px-3 py-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors">Thay đổi</span>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center py-2">
                      <div className="w-8 h-8 mb-1.5 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-xs font-medium text-brand-600 dark:text-brand-400 mb-1">
                        Tải chứng chỉ lên
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* Form-level error */}
          {formError && (
            <div className="mt-6 p-4 rounded-lg bg-error-50 dark:bg-error-500/10 border border-error-200 dark:border-error-500/20 text-sm text-error-600 dark:text-error-400">
              {formError}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 mt-5 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
            >
              {t("teacher.btnCancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="px-5 py-2 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting || isUploading
                ? t("common.btnSaving", { defaultValue: "Đang lưu..." })
                : editingItem
                ? t("teacher.btnSave", { defaultValue: "Lưu" })
                : t("teacher.addTeacher", { defaultValue: "Thêm giáo viên" })}
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

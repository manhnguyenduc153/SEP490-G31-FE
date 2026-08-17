"use client";
import React, { useEffect, useState, useRef } from "react";
import { TeacherItem, TeacherSaveDto, teacherApi } from "@/services/teacher.api";
import { EyeIcon, CalenderIcon } from "@/icons";
import { CodeHelper } from "@/helpers/CodeHelper";
import { ENV } from "@/config/env";
import { X } from "lucide-react";
import { z } from "zod";

interface TeacherFormProps {
  onCancel: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  editingItem: TeacherItem | null;
  formError: string | null;
  isSubmitting: boolean;
  onSubmit: (dto: TeacherSaveDto) => void | Promise<void>;
}

type CertificateSelection = { type: "existing" | "pending"; index: number } | null;

export function TeacherForm({
  onCancel,
  t,
  editingItem,
  formError,
  isSubmitting,
  onSubmit,
}: TeacherFormProps) {
  const [formData, setFormData] = useState<TeacherSaveDto>({
    code: "",
    name: "",
    email: "",
    phone: "",
    dob: "",
    gender: null,
    address: "",
    status: 1, // 1: Active
    gradeLevel: null,
    description: "",
    avatar: null,
    certificates: [],
  });

  const [isUploading, setIsUploading] = useState(false);
  const [clientErrors, setClientErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [certFiles, setCertFiles] = useState<File[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [certPreview, setCertPreview] = useState<string | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateSelection>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const certInputRef = useRef<HTMLInputElement>(null);
  const dobInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingItem) {
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
        gradeLevel: editingItem.gradeLevel ?? null,
        description: editingItem.description || "",
        avatar: editingItem.avatar || null,
        certificates: editingItem.certificates || [],
      });
      if (editingItem.avatar) {
        setAvatarPreview(getImageUrl(editingItem.avatar));
      } else {
        setAvatarPreview(null);
      }
      setSelectedCertificate(editingItem.certificates?.length ? { type: "existing", index: 0 } : null);
    } else {
      setFormData({
        code: CodeHelper.generate("GV"),
        name: "",
        email: "",
        phone: "",
        dob: "",
        gender: null,
        address: "",
        status: 1,
        gradeLevel: null,
        description: "",
        avatar: null,
        certificates: [],
      });
      setAvatarPreview(null);
      setSelectedCertificate(null);
    }

    // Reset local files
    setAvatarFile(null);
    setCertFiles([]);
    setCertPreview(null);
    setClientErrors([]);
    setFieldErrors({});
  }, [editingItem]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
    setClientErrors([]);
    
    setFormData((prev) => {
      let parsedValue: string | number | boolean | null = value;
      if (name === "status") {
        parsedValue = value ? parseInt(value) : null;
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
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setCertFiles((current) => {
      const uniqueFiles = files.filter((file) => !current.some((item) =>
        item.name === file.name && item.size === file.size && item.lastModified === file.lastModified));
      const nextFiles = [...current, ...uniqueFiles];
      if (uniqueFiles.length > 0) {
        const selectedIndex = nextFiles.length - 1;
        setSelectedCertificate({ type: "pending", index: selectedIndex });
        setCertPreview(URL.createObjectURL(nextFiles[selectedIndex]));
      }
      return nextFiles;
    });
    if (certInputRef.current) {
      certInputRef.current.value = "";
    }
  };

  const removeExistingCertificate = (index: number) => {
    setFormData((current) => {
      const nextCertificates = (current.certificates || []).filter((_, itemIndex) => itemIndex !== index);
      setSelectedCertificate((selection) => {
        if (selection?.type !== "existing") return selection;
        if (selection.index > index) return { type: "existing", index: selection.index - 1 };
        if (selection.index !== index) return selection;
        if (nextCertificates.length > 0) return { type: "existing", index: Math.min(index, nextCertificates.length - 1) };
        if (certFiles.length > 0) {
          setCertPreview(URL.createObjectURL(certFiles[0]));
          return { type: "pending", index: 0 };
        }
        return null;
      });
      return { ...current, certificates: nextCertificates };
    });
  };

  const removePendingCertificate = (index: number) => {
    setCertFiles((current) => {
      const nextFiles = current.filter((_, itemIndex) => itemIndex !== index);
      setSelectedCertificate((selection) => {
        if (selection?.type !== "pending") return selection;
        if (selection.index > index) return { type: "pending", index: selection.index - 1 };
        if (selection.index !== index) return selection;
        if (nextFiles.length > 0) {
          const nextIndex = Math.min(index, nextFiles.length - 1);
          setCertPreview(URL.createObjectURL(nextFiles[nextIndex]));
          return { type: "pending", index: nextIndex };
        }
        setCertPreview(null);
        return (formData.certificates?.length || 0) > 0 ? { type: "existing", index: 0 } : null;
      });
      return nextFiles;
    });
  };

  const selectExistingCertificate = (index: number) => {
    setSelectedCertificate({ type: "existing", index });
    setCertPreview(null);
  };

  const selectPendingCertificate = (index: number) => {
    const file = certFiles[index];
    if (!file) return;
    setSelectedCertificate({ type: "pending", index });
    setCertPreview(URL.createObjectURL(file));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleCertClick = () => {
    certInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientErrors([]);
    setFieldErrors({});

    const teacherSchema = z.object({
      code: z.string().trim()
        .min(1, t("teacher.validationCodeRequired"))
        .max(50, t("teacher.validationCodeMax")),
      name: z.string().trim()
        .min(1, t("teacher.validationNameRequired"))
        .max(200, t("teacher.validationNameMax")),
      email: z.string().trim()
        .max(150, t("teacher.validationEmailMax"))
        .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), t("teacher.validationEmailInvalid")),
      phone: z.string().trim()
        .max(20, t("teacher.validationPhoneMax"))
        .refine((value) => !value || /^\+?[0-9][0-9\s().-]{6,19}$/.test(value), t("teacher.validationPhoneInvalid")),
      dob: z.string().refine(
        (value) => !value || new Date(`${value}T00:00:00`) <= new Date(),
        t("teacher.validationDobFuture")
      ),
      address: z.string().max(500, t("teacher.validationAddressMax")),
      status: z.number().refine((value) => [0, 1, 2].includes(value), t("teacher.validationStatusInvalid")),
    });

    const validation = teacherSchema.safeParse({
      code: formData.code || "",
      name: formData.name || "",
      email: formData.email || "",
      phone: formData.phone || "",
      dob: formData.dob || "",
      address: formData.address || "",
      status: Number(formData.status),
    });

    if (!validation.success) {
      const nextFieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const field = String(issue.path[0] || "form");
        if (!nextFieldErrors[field]) nextFieldErrors[field] = issue.message;
      });
      setFieldErrors(nextFieldErrors);
      setClientErrors(Object.values(nextFieldErrors));
      return;
    }

    const finalFormData = { ...formData };
    
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
      const certificateUrls = [...(finalFormData.certificates || [])];
      for (const certFile of certFiles) {
        const res = await teacherApi.uploadDocument(certFile);
        if (!res.success || !res.data) {
          alert(res.message || `Lỗi tải chứng chỉ ${certFile.name}`);
          setIsUploading(false);
          return;
        }
        certificateUrls.push(res.data);
      }
      finalFormData.certificates = certificateUrls;
      if (certFiles.length > 0) {
        setFormData((current) => ({ ...current, certificates: certificateUrls }));
        setSelectedCertificate({ type: "existing", index: certificateUrls.length - 1 });
        setCertFiles([]);
        setCertPreview(null);
        if (certInputRef.current) certInputRef.current.value = "";
      }
      await onSubmit(finalFormData);
      setIsUploading(false);
    } catch {
      alert("Lỗi upload file");
      setIsUploading(false);
    }
  };

  // Helper to build full image URL
  const getImageUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${ENV.API_BASE_URL}${path}`;
  };

  // Helper to check if file is an image
  const isImage = (path: string | null | undefined) => {
    if (!path) return false;
    return path.match(/\.(jpeg|jpg|gif|png)$/i) != null;
  };

  const certFile = selectedCertificate?.type === "pending" ? certFiles[selectedCertificate.index] || null : null;
  const existingCertificate = selectedCertificate?.type === "existing"
    ? formData.certificates?.[selectedCertificate.index] || null
    : null;
  const selectedCertificateUrl = certFile ? certPreview : getImageUrl(existingCertificate);
  const inputClassName = (field: string, disabled = false) =>
    `w-full rounded-lg border px-4 py-2 text-sm focus:outline-hidden focus:ring-3 ${
      fieldErrors[field]
        ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-500"
        : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700"
    } ${disabled
      ? "cursor-not-allowed bg-gray-50 text-gray-500 dark:bg-gray-800/50 dark:text-gray-400"
      : "bg-transparent text-gray-800 dark:bg-gray-900 dark:text-white/90"
    }`;
  const renderFieldError = (field: string) => fieldErrors[field] ? (
    <p className="mt-1 text-xs font-medium text-rose-500">{fieldErrors[field]}</p>
  ) : null;

  return (
    <>
    <div className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs p-5 sm:p-6">
      <div className="flex flex-col gap-5">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingItem ? t("teacher.editTitle") : t("teacher.createTitle")}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {editingItem ? t("teacher.editDesc") : t("teacher.createDesc")}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
            
            {/* Left Column: Basic Info (takes 2/3 space on large screens) */}
            <div className="flex h-full flex-col space-y-2 lg:col-span-2">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2 border-b pb-1.5 dark:border-gray-800 text-sm">
                {t("teacher.basicInfo")}
              </h4>

              <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2">
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
                    className={inputClassName("name")}
                    aria-invalid={Boolean(fieldErrors.name)}
                  />
                  {renderFieldError("name")}
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
                    className={inputClassName("code", true)}
                    aria-invalid={Boolean(fieldErrors.code)}
                  />
                  {renderFieldError("code")}
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
                      className={`${inputClassName("dob")} pr-10 py-2.5 [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden`}
                      aria-invalid={Boolean(fieldErrors.dob)}
                    />
                    <button 
                      type="button"
                      onClick={() => dobInputRef.current?.showPicker()}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 transition-colors"
                    >
                      <CalenderIcon className="w-5 h-5" />
                    </button>
                  </div>
                  {renderFieldError("dob")}
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
                    className={inputClassName("email")}
                    aria-invalid={Boolean(fieldErrors.email)}
                  />
                  {renderFieldError("email")}
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
                    className={inputClassName("phone")}
                    aria-invalid={Boolean(fieldErrors.phone)}
                  />
                  {renderFieldError("phone")}
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
                    className={inputClassName("status")}
                    aria-invalid={Boolean(fieldErrors.status)}
                  >
                    <option value={1}>{t("teacher.statusActive")}</option>
                    <option value={0}>{t("teacher.statusInactive")}</option>
                    <option value={2}>{t("teacher.statusOnLeave")}</option>
                  </select>
                  {renderFieldError("status")}
                </div>

                {/* GradeLevel */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("teacher.formGradeLevelLabel", { defaultValue: "Band giảng dạy" })}
                  </label>
                  <select
                    name="gradeLevel"
                    value={formData.gradeLevel ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        gradeLevel: e.target.value === "" ? null : Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value="">{t("teacher.formGradeLevelPlaceholder", { defaultValue: "-- Chọn band giảng dạy --" })}</option>
                    <option value={65}>IELTS 6.5</option>
                    <option value={70}>IELTS 7.0</option>
                    <option value={75}>IELTS 7.5</option>
                    <option value={80}>IELTS 8.0</option>
                    <option value={85}>IELTS 8.5</option>
                    <option value={90}>IELTS 9.0</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div className="pt-1">
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("teacher.formAddressLabel")}
                </label>
                <input
                  type="text"
                  name="address"
                  maxLength={500}
                  value={formData.address || ""}
                  onChange={handleChange}
                  placeholder={t("teacher.formAddressPlaceholder")}
                  className={inputClassName("address")}
                  aria-invalid={Boolean(fieldErrors.address)}
                />
                {renderFieldError("address")}
              </div>

              {/* Description */}
              <div className="flex flex-1 flex-col pt-1">
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("teacher.formDescLabel")}
                </label>
                <textarea
                  name="description"
                  value={formData.description || ""}
                  onChange={handleChange}
                  placeholder={t("teacher.formDescPlaceholder")}
                  rows={6}
                  maxLength={500}
                  className="min-h-[180px] flex-1 resize-none rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
            </div>

            {/* Right Column: Avatar & Certificate */}
            <div className="flex h-full flex-col gap-3 border-l border-gray-100 pl-0 dark:border-gray-800 lg:col-span-1 lg:pl-5">
              
              {/* Avatar */}
              <div className="flex flex-col">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 border-b pb-2 dark:border-gray-800 text-sm">
                  {t("teacher.avatarLabel")}
                </h4>
                <div 
                  className="group mt-1.5 flex h-[280px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-800"
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
                      <span className="mt-2 text-xs text-gray-500">{t("common.btnSaving")}</span>
                    </div>
                  ) : avatarPreview ? (
                    <div className="group relative h-full w-full overflow-hidden rounded-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={avatarPreview}
                        alt={t("teacher.avatarPreviewAlt")}
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setPreviewImage(avatarPreview); }}
                          className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
                          title={t("teacher.viewFullImage")}
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        <span className="text-white text-xs font-medium px-3 py-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                          {t("teacher.changeImage")}
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
                        {t("teacher.uploadImage")}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Certificate */}
              <div className="flex flex-col">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 border-b pb-2 dark:border-gray-800 text-sm">
                  {t("teacher.certificateLabel")}
                </h4>
                <div 
                  className="group mt-1.5 flex h-[280px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-800"
                  onClick={handleCertClick}
                >
                  <input
                    type="file"
                    ref={certInputRef}
                    className="hidden"
                    multiple
                    accept="image/png, image/jpeg, image/jpg, application/pdf, .doc, .docx"
                    onChange={handleCertChange}
                  />
                  
                  {isUploading ? (
                    <div className="flex flex-col items-center py-6">
                      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="mt-2 text-xs text-gray-500">{t("common.btnSaving")}</span>
                    </div>
                  ) : certFile || existingCertificate ? (
                    <div className="group relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                      {(certFile && certFile.type.startsWith('image/')) || (!certFile && isImage(existingCertificate)) ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selectedCertificateUrl as string}
                            alt={t("teacher.certificatePreviewAlt")}
                            className="object-cover w-full h-full"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                            <button 
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setPreviewImage(selectedCertificateUrl); }}
                              className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
                              title={t("teacher.viewFullImage")}
                            >
                              <EyeIcon className="w-5 h-5" />
                            </button>
                            <span className="text-white text-xs font-medium px-3 py-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                              {t("teacher.changeFile")}
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
                              {certFile ? certFile.name : existingCertificate?.split('/').pop()}
                            </p>
                          </div>
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-xs font-medium px-3 py-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors">{t("teacher.changeFile")}</span>
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
                        {t("teacher.uploadCertificates", { defaultValue: "Tải nhiều chứng chỉ lên" })}
                      </p>
                    </div>
                  )}
                </div>

                {((formData.certificates?.length || 0) > 0 || certFiles.length > 0) && (
                  <div className="mt-3">
                    <p className="mb-2 text-[11px] text-gray-500 dark:text-gray-400">{t("teacher.selectCertificatePreview")}</p>
                    <div className="max-h-44 space-y-2 overflow-y-auto">
                    {(formData.certificates || []).map((certificate, index) => (
                      <div key={`${certificate}-${index}`} className={`flex items-center gap-2 rounded-lg border p-2 transition-colors ${selectedCertificate?.type === "existing" && selectedCertificate.index === index ? "border-brand-400 bg-brand-50 ring-1 ring-brand-200 dark:border-brand-500 dark:bg-brand-500/10" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"}`}>
                        <button
                          type="button"
                          onClick={() => selectExistingCertificate(index)}
                          className="min-w-0 flex-1 truncate text-left text-xs font-medium text-gray-700 hover:text-brand-600 dark:text-gray-300 dark:hover:text-brand-400"
                          title={certificate.split('/').pop()}
                        >
                          {certificate.split('/').pop()}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeExistingCertificate(index)}
                          className="rounded p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                          aria-label={t("teacher.removeCertificate", { defaultValue: "Xóa chứng chỉ" })}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    {certFiles.map((file, index) => (
                      <div key={`${file.name}-${file.size}-${file.lastModified}`} className={`flex items-center gap-2 rounded-lg border p-2 transition-colors ${selectedCertificate?.type === "pending" && selectedCertificate.index === index ? "border-brand-500 bg-brand-100 ring-1 ring-brand-300 dark:border-brand-400 dark:bg-brand-500/20" : "border-brand-100 bg-brand-50/60 dark:border-brand-500/20 dark:bg-brand-500/10"}`}>
                        <button type="button" onClick={() => selectPendingCertificate(index)} className="min-w-0 flex-1 truncate text-left text-xs font-medium text-gray-700 hover:text-brand-600 dark:text-gray-300" title={file.name}>
                          {file.name}
                        </button>
                        <span className="text-[10px] font-medium text-brand-600 dark:text-brand-400">
                          {t("teacher.pendingUpload", { defaultValue: "Sẽ tải khi bấm Lưu" })}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePendingCertificate(index)}
                          className="rounded p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                          aria-label={t("teacher.removeCertificate", { defaultValue: "Xóa chứng chỉ" })}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Form-level error */}
          {(clientErrors.length > 0 || formError) && (
            <div className="mt-6 p-4 rounded-lg bg-error-50 dark:bg-error-500/10 border border-error-200 dark:border-error-500/20 text-sm text-error-600 dark:text-error-400">
              {clientErrors.map((error, index) => <div key={`${error}-${index}`}>• {error}</div>)}
              {formError && <div>• {formError}</div>}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 mt-5 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={onCancel}
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
    </div>

    {/* Image Preview overlay */}
    {previewImage && (
      <div
        className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4"
        onClick={() => setPreviewImage(null)}
      >
        <button 
          type="button"
          onClick={() => setPreviewImage(null)}
          className="fixed right-5 top-5 z-[100000] p-2 text-white transition-colors hover:text-gray-200"
          aria-label={t("teacher.closeImagePreview")}
        >
          <X className="h-7 w-7 stroke-[3]" />
        </button>
        <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewImage} alt={t("teacher.imagePreviewAlt")} className="max-h-[85vh] object-contain rounded-lg mx-auto" />
        </div>
      </div>
    )}
    </>
  );
}

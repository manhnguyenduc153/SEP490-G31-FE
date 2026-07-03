"use client";
import React, { useEffect, useState, useRef } from "react";
import { StudentItem, StudentSaveDto, studentApi } from "@/services/student.api";
import { ENV } from "@/config/env";
import { CodeHelper } from "@/helpers/CodeHelper";
import * as XLSX from "xlsx";
import {
  UserCircle,
  ArrowLeft,
  Plus,
  Save,
  FileSpreadsheet,
  Eye,
  X,
} from "lucide-react";

interface StudentFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  editingItem: StudentItem | null;
  onCancel: () => void;
  onSuccess: (message: string) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function StudentForm({
  t,
  editingItem,
  onCancel,
  onSuccess,
  showToast,
}: StudentFormProps) {
  const isEdit = !!editingItem;

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // ── Populate form when editing ──
  useEffect(() => {
    if (editingItem) {
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
      if (editingItem.avatar) {
        setAvatarPreview(getImageUrl(editingItem.avatar));
      } else {
        setAvatarPreview(null);
      }
    } else {
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
      setAvatarFile(null);
      setAvatarPreview(null);
    }
    setFormError(null);
  }, [editingItem]);

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
    setAvatarPreview(URL.createObjectURL(file));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Helper to build full image URL
  const getImageUrl = (path: string | null | undefined): string => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${ENV.API_BASE_URL}${path}`;
  };

  // ── Import Excel ──
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
        if (rows.length > 0) {
          const row = rows[0];
          const name = row["Họ và tên"] || row["Name"];
          const email = row["Email"] || row["email"];
          const phone = row["Số điện thoại"] || row["Phone"];
          const code = row["Mã HS"] || row["Code"];
          const dobStr = String(row["Ngày sinh"] || row["Dob"] || "");
          const genderStr = String(row["Giới tính"] || row["Gender"] || "");
          const address = row["Địa chỉ"] || row["Address"];
          const schoolName = row["Trường học"] || row["School"];
          const gradeLevelStr = row["Khối lớp"] || row["Grade"];
          const parentName = row["Tên phụ huynh"] || row["ParentName"];
          const parentPhone = row["SĐT phụ huynh"] || row["ParentPhone"];
          const description = row["Ghi chú"] || row["Note"];

          let dob: string | null = null;
          if (dobStr) {
            const parts = dobStr.split("/");
            if (parts.length === 3) {
              dob = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
            } else {
              dob = dobStr;
            }
          }

          let gender: boolean | null = null;
          if (genderStr) {
            const g = genderStr.toLowerCase().trim();
            if (g === "nam" || g === "true" || g === "1") gender = true;
            else if (g === "nữ" || g === "female" || g === "false" || g === "0") gender = false;
          }

          let gradeLevel: number | null = null;
          if (gradeLevelStr) {
            const parsed = parseInt(String(gradeLevelStr), 10);
            if (!isNaN(parsed)) gradeLevel = parsed;
          }

          setFormData((prev) => ({
            ...prev,
            code: code ? String(code).trim() : prev.code,
            name: name ? String(name).trim() : prev.name,
            email: email ? String(email).trim() : prev.email,
            phone: phone ? String(phone).trim() : prev.phone,
            dob,
            gender,
            address: address ? String(address).trim() : prev.address,
            schoolName: schoolName ? String(schoolName).trim() : prev.schoolName,
            gradeLevel,
            parentName: parentName ? String(parentName).trim() : prev.parentName,
            parentPhone: parentPhone ? String(parentPhone).trim() : prev.parentPhone,
            description: description ? String(description).trim() : prev.description,
          }));
          showToast(t("student.importExcelSuccess", { defaultValue: "Đã điền thông tin từ file Excel" }), "success");
        }
      } catch {
        showToast(t("student.importExcelError", { defaultValue: "Không thể đọc file Excel" }), "error");
      }
    };
    reader.readAsBinaryString(file);
    if (e.target) e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code?.trim()) {
      const err = t("student.formCodeRequired", { defaultValue: "Mã học sinh không được để trống" });
      setFormError(err);
      showToast(err, "error");
      return;
    }
    if (!formData.name?.trim()) {
      const err = t("student.formNameRequired", { defaultValue: "Họ và tên không được để trống" });
      setFormError(err);
      showToast(err, "error");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    let finalFormData = { ...formData };

    try {
      setIsUploading(true);
      if (avatarFile) {
        const res = await studentApi.uploadFile(avatarFile);
        if (res.success && res.data) {
          finalFormData.avatar = res.data;
        } else {
          const err = res.message || t("student.uploadError", { defaultValue: "Lỗi tải ảnh đại diện" });
          setFormError(err);
          showToast(err, "error");
          setIsSubmitting(false);
          setIsUploading(false);
          return;
        }
      }

      if (isEdit && editingItem) {
        const res = await studentApi.update(editingItem.id, finalFormData);
        if (res.success && res.data) {
          onSuccess(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("student.updateSuccess", { name: res.data.name }));
        } else {
          const err = res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("student.updateError", { defaultValue: "Lỗi khi cập nhật học sinh" });
          setFormError(err);
          showToast(err, "error");
        }
      } else {
        const res = await studentApi.create(finalFormData);
        if (res.success && res.data) {
          onSuccess(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("student.createSuccess", { name: res.data.name }));
        } else {
          const err = res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("student.createError", { defaultValue: "Lỗi khi tạo học sinh" });
          setFormError(err);
          showToast(err, "error");
        }
      }
    } catch {
      const err = t("student.systemError", { defaultValue: "Lỗi hệ thống" });
      setFormError(err);
      showToast(err, "error");
    } finally {
      setIsUploading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full pb-10">
      {/* ── Top Header Card ── */}
      <div className="flex items-center justify-between p-5 sm:p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-brand-500" />
            {isEdit
              ? t("student.editTitle", { defaultValue: "Chỉnh sửa thông tin học sinh" })
              : t("student.createTitle", { defaultValue: "Thêm học sinh mới" })}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {t("sidebar.home", { defaultValue: "Trang Chủ" })} -{" "}
            {t("sidebar.students", { defaultValue: "Học sinh" })} -{" "}
            {isEdit
              ? t("student.editBreadcrumb", { defaultValue: "Chỉnh Sửa" })
              : t("student.createBreadcrumb", { defaultValue: "Tạo Mới" })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Import Excel */}
          <button
            type="button"
            onClick={() => excelInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:hover:bg-emerald-950/40 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {t("student.importExcel", { defaultValue: "Import Excel" })}
          </button>
          <input
            type="file"
            ref={excelInputRef}
            onChange={handleImportExcel}
            accept=".xlsx, .xls"
            style={{ display: "none" }}
          />

          {/* Download template */}
          <a
            href="/student_import_template.xlsx"
            download
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 transition-colors"
          >
            {t("student.downloadTemplate", { defaultValue: "Tải file mẫu (.xlsx)" })}
          </a>

          {/* Back button */}
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-850 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("student.btnCancel", { defaultValue: "Quay lại" })}
          </button>

          {/* Submit button */}
          <button
            type="button"
            onClick={handleSubmit as unknown as React.MouseEventHandler<HTMLButtonElement>}
            disabled={isSubmitting || isUploading}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-theme-xs transition-colors disabled:opacity-60"
          >
            {isEdit ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isSubmitting || isUploading
              ? t("student.btnSaving", { defaultValue: "Đang lưu..." })
              : isEdit
              ? t("student.btnUpdate", { defaultValue: "Lưu thay đổi" })
              : t("student.addStudent", { defaultValue: "Tạo học sinh" })}
          </button>
        </div>
      </div>

      {/* ── Main Form Content ── */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Main column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Card: Thông tin cơ bản */}
            <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-5">
              <h3 className="text-md font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800/80 pb-3">
                {t("student.basicInfo", { defaultValue: "Thông tin cơ bản" })}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Code */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t("student.formCodeLabel", { defaultValue: "Mã học sinh" })} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="code"
                    required
                    maxLength={50}
                    value={formData.code || ""}
                    onChange={handleChange}
                    placeholder={t("student.formCodePlaceholder", { defaultValue: "Mã học sinh..." })}
                    className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                  />
                </div>

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t("student.formNameLabel", { defaultValue: "Họ và tên" })} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    maxLength={200}
                    value={formData.name || ""}
                    onChange={handleChange}
                    placeholder={t("student.formNamePlaceholder", { defaultValue: "Họ và tên..." })}
                    className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t("student.formEmailLabel", { defaultValue: "Email" })} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    maxLength={150}
                    value={formData.email || ""}
                    onChange={handleChange}
                    placeholder={t("student.formEmailPlaceholder", { defaultValue: "example@email.com" })}
                    className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t("student.formPhoneLabel", { defaultValue: "Số điện thoại" })}
                  </label>
                  <input
                    type="text"
                    name="phone"
                    maxLength={20}
                    value={formData.phone || ""}
                    onChange={handleChange}
                    placeholder={t("student.formPhonePlaceholder", { defaultValue: "Số điện thoại..." })}
                    className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                  />
                </div>

                {/* Date of Birth */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t("student.formDobLabel", { defaultValue: "Ngày sinh" })}
                  </label>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob || ""}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                  />
                </div>

                {/* Gender */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t("student.formGenderLabel", { defaultValue: "Giới tính" })}
                  </label>
                  <select
                    name="gender"
                    value={formData.gender === null ? "" : String(formData.gender)}
                    onChange={handleGenderChange}
                    className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                  >
                    <option value="" className="dark:bg-gray-900">{t("student.selectGender", { defaultValue: "Chọn giới tính" })}</option>
                    <option value="true" className="dark:bg-gray-900">{t("student.formGenderMale", { defaultValue: "Nam" })}</option>
                    <option value="false" className="dark:bg-gray-900">{t("student.formGenderFemale", { defaultValue: "Nữ" })}</option>
                  </select>
                </div>

                {/* School */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t("student.formSchoolNameLabel", { defaultValue: "Trường học cũ/hiện tại" })}
                  </label>
                  <input
                    type="text"
                    name="schoolName"
                    maxLength={200}
                    value={formData.schoolName || ""}
                    onChange={handleChange}
                    placeholder={t("student.formSchoolNamePlaceholder", { defaultValue: "Nhập tên trường học..." })}
                    className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                  />
                </div>

                {/* Grade Level */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
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
                    className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t("student.formStatusLabel", { defaultValue: "Trạng thái" })}
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleNumberChange}
                    className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                  >
                    <option value={1} className="dark:bg-gray-900">{t("student.formStatusActive", { defaultValue: "Hoạt động" })}</option>
                    <option value={0} className="dark:bg-gray-900">{t("student.formStatusInactive", { defaultValue: "Ngưng hoạt động" })}</option>
                    <option value={2} className="dark:bg-gray-900">{t("student.formStatusSuspended", { defaultValue: "Bị đình chỉ" })}</option>
                    <option value={3} className="dark:bg-gray-900">{t("student.formStatusGraduated", { defaultValue: "Đã tốt nghiệp" })}</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("student.colAddress", { defaultValue: "Địa chỉ" })}
                </label>
                <input
                  type="text"
                  name="address"
                  maxLength={500}
                  value={formData.address || ""}
                  onChange={handleChange}
                  placeholder={t("student.formAddressPlaceholder", { defaultValue: "Nhập địa chỉ..." })}
                  className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("student.formDescLabel", { defaultValue: "Ghi chú/Mô tả" })}
                </label>
                <textarea
                  name="description"
                  value={formData.description || ""}
                  onChange={handleChange}
                  placeholder={t("student.formDescPlaceholder", { defaultValue: "Ghi chú bổ sung (không bắt buộc)..." })}
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white resize-none"
                />
              </div>
            </div>

            {/* Card: Thông tin phụ huynh */}
            <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-5">
              <h3 className="text-md font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800/80 pb-3">
                {t("student.parentInfo", { defaultValue: "Thông tin phụ huynh" })}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Parent Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t("student.formParentNameLabel", { defaultValue: "Họ tên phụ huynh" })}
                  </label>
                  <input
                    type="text"
                    name="parentName"
                    maxLength={200}
                    value={formData.parentName || ""}
                    onChange={handleChange}
                    placeholder={t("student.formParentNamePlaceholder", { defaultValue: "Nhập tên phụ huynh..." })}
                    className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                  />
                </div>

                {/* Parent Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t("student.formParentPhoneLabel", { defaultValue: "SĐT phụ huynh" })}
                  </label>
                  <input
                    type="text"
                    name="parentPhone"
                    maxLength={20}
                    value={formData.parentPhone || ""}
                    onChange={handleChange}
                    placeholder={t("student.formParentPhonePlaceholder", { defaultValue: "Nhập SĐT phụ huynh..." })}
                    className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right column: Avatar */}
          <div className="lg:col-span-1">
            <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
              <h3 className="text-md font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800/80 pb-3 mb-4">
                {t("student.avatarLabel", { defaultValue: "Ảnh đại diện" })}
              </h3>
              <div
                className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
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
                    <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    <span className="mt-2 text-xs text-gray-500">{t("student.btnSaving")}</span>
                  </div>
                ) : avatarPreview ? (
                  <div className="relative w-full aspect-square overflow-hidden rounded-lg group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="object-cover w-full h-full"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPreviewImage(avatarPreview); }}
                        className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <span className="text-white text-xs font-medium px-3 py-1.5 bg-white/20 rounded-full">
                        {t("student.changeImage", { defaultValue: "Thay đổi ảnh" })}
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
                      {t("student.uploadImage", { defaultValue: "Tải ảnh lên" })}
                    </p>
                    <p className="text-[10px] text-gray-400 px-2 text-center leading-normal">
                      {t("student.uploadPlaceholder")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Form error */}
        {formError && (
          <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl">
            <p className="text-sm text-rose-600 dark:text-rose-400">{formError}</p>
          </div>
        )}
      </form>

      {/* Image Preview overlay */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImage} alt="Preview" className="max-h-[85vh] object-contain rounded-lg mx-auto" />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-4 -right-4 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

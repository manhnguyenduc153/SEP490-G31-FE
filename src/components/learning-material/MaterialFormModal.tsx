"use client";
import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { LearningMaterialItem } from "@/services/learningMaterial.api";
import { courseApi, CourseItem } from "@/services/course.api";
import { classApi, ClassItem } from "@/services/class.api";
import { commonApi } from "@/services/common.api";
import { teacherApi } from "@/services/teacher.api";
import { UploadCloud, FileText, X } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

interface MaterialFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  editingItem: LearningMaterialItem | null;
  formCode: string;
  setFormCode: (val: string) => void;
  formName: string;
  setFormName: (val: string) => void;
  formTitle: string;
  setFormTitle: (val: string) => void;
  formDesc: string;
  setFormDesc: (val: string) => void;
  formClassId: number | null;
  setFormClassId: (val: number | null) => void;
  formCourseId: number | null;
  setFormCourseId: (val: number | null) => void;
  formFileUrl: string;
  setFormFileUrl: (val: string) => void;
  formFileType: string;
  setFormFileType: (val: string) => void;
  formStatus: number;
  setFormStatus: (val: number) => void;
  formError: string | null;
  setFormError: (val: string | null) => void;
  isSubmitting: boolean;
  handleSubmit: (e: React.FormEvent) => void;
}

export function MaterialFormModal({
  isOpen,
  onClose,
  t,
  editingItem,
  formCode,
  setFormCode,
  formName,
  setFormName,
  formTitle,
  setFormTitle,
  formDesc,
  setFormDesc,
  formClassId,
  setFormClassId,
  formCourseId,
  setFormCourseId,
  formFileUrl,
  setFormFileUrl,
  formFileType,
  setFormFileType,
  formStatus,
  setFormStatus,
  formError,
  setFormError,
  isSubmitting,
  handleSubmit,
}: MaterialFormModalProps) {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Load courses and classes for dropdown selections
  useEffect(() => {
    async function loadData() {
      try {
        const [courseRes, classRes] = await Promise.all([
          commonApi.getCourses(1, 100, "", true), // Load active courses
          commonApi.getClasses(1, 100),       // Load classes
        ]);
        if (courseRes.success && courseRes.data) {
          setCourses(courseRes.data.items || []);
        }
        if (classRes.success && classRes.data) {
          setClasses(classRes.data.items || []);
        }
      } catch (err) {
        console.error("Failed to load options for materials form", err);
      }
    }
    if (isOpen) {
      loadData();
      setSelectedFile(null);
    }
  }, [isOpen]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processUpload(files[0]);
    }
  };

  const processUpload = async (file: File) => {
    setUploading(true);
    setFormError(null);
    try {
      const res = await teacherApi.uploadDocument(file);
      if (res.success && res.data) {
        setFormFileUrl(res.data);
        setFormFileType(file.type || file.name.split(".").pop() || "");
        setSelectedFile(file);
      } else {
        setFormError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("learningMaterial.uploadError"));
      }
    } catch {
      setFormError(t("learningMaterial.systemError"));
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFormFileUrl("");
    setFormFileType("");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[650px] p-6 sm:p-8"
    >
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {editingItem
            ? t("learningMaterial.editTitle", { defaultValue: "Chỉnh sửa tài liệu học tập" })
            : t("learningMaterial.createTitle", { defaultValue: "Đăng tải tài liệu mới" })}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {editingItem
            ? t("learningMaterial.editDesc", { defaultValue: "Cập nhật thông tin tài liệu học tập." })
            : t("learningMaterial.createDesc", { defaultValue: "Điền thông tin và tải lên tài liệu mới." })}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Code */}
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("learningMaterial.formCodeLabel", { defaultValue: "Mã tài liệu" })} <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={50}
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder={t("learningMaterial.formCodePlaceholder", { defaultValue: "Nhập mã tài liệu..." })}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("learningMaterial.formNameLabel", { defaultValue: "Tên tài liệu" })} <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={200}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("learningMaterial.formNamePlaceholder", { defaultValue: "Nhập tên tài liệu..." })}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("learningMaterial.formTitleLabel", { defaultValue: "Tiêu đề hiển thị" })}
            </label>
            <input
              type="text"
              maxLength={250}
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder={t("learningMaterial.formTitlePlaceholder", { defaultValue: "Nhập tiêu đề hiển thị..." })}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Course */}
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("learningMaterial.formCourseLabel", { defaultValue: "Khóa học áp dụng" })}
              </label>
              <SearchableSelect
                value={formCourseId || ""}
                onChange={(value) => setFormCourseId(value ? Number(value) : null)}
                options={courses.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
                placeholder={t("learningMaterial.noCourse", { defaultValue: "Tất cả khóa học" })}
                onClear={() => setFormCourseId(null)}
              />
            </div>

            {/* Class */}
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("learningMaterial.formClassLabel", { defaultValue: "Lớp học áp dụng" })}
              </label>
              <SearchableSelect
                value={formClassId || ""}
                onChange={(value) => setFormClassId(value ? Number(value) : null)}
                options={classes.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
                placeholder={t("learningMaterial.noClass", { defaultValue: "Tất cả lớp học" })}
                onClear={() => setFormClassId(null)}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("learningMaterial.formDescLabel", { defaultValue: "Mô tả tài liệu" })}
            </label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder={t("learningMaterial.formDescPlaceholder", { defaultValue: "Nhập mô tả tài liệu (không bắt buộc)..." })}
              rows={2}
              maxLength={1000}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("learningMaterial.formStatusLabel", { defaultValue: "Trạng thái hoạt động" })}
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 shadow-theme-xs"
              >
                <option value={1}>{t("student.formStatusActive", { defaultValue: "Hoạt động" })}</option>
                <option value={0}>{t("student.formStatusInactive", { defaultValue: "Ngưng hoạt động" })}</option>
              </select>
            </div>
          </div>

          {/* File Upload Dropzone */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("learningMaterial.formFileLabel", { defaultValue: "Tệp tin đính kèm" })} <span className="text-error-500">*</span>
            </label>

            {formFileUrl ? (
              <div className="flex items-center justify-between p-3 rounded-lg border border-brand-200 bg-brand-50/50 dark:border-brand-800/30 dark:bg-brand-950/20">
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileText className="w-8 h-8 text-brand-500 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {selectedFile ? selectedFile.name : formFileUrl.split("/").pop()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formFileType || "Document"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="p-1 text-gray-400 hover:text-rose-500 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="relative flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 bg-gray-50 dark:bg-gray-900/50 hover:border-brand-500 dark:hover:border-brand-400 transition-colors group cursor-pointer">
                <input
                  type="file"
                  id="material-file-upload"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                <UploadCloud className="w-10 h-10 text-gray-400 group-hover:text-brand-500 transition-colors mb-2" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {uploading ? t("homework.uploadingFiles", { defaultValue: "Đang tải lên..." }) : t("homework.uploadPlaceholder", { defaultValue: "Kéo thả file vào đây, hoặc click để chọn file" })}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PDF, DOCX, Images, Audio, Video (Max: 50MB)
                </p>
              </div>
            )}
          </div>

          {/* Form-level error */}
          {formError && (
            <p className="text-sm text-error-500 dark:text-error-400">{formError}</p>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              {t("learningMaterial.btnCancel", { defaultValue: "Hủy" })}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || uploading || !formFileUrl}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting
                ? t("learningMaterial.btnSaving", { defaultValue: "Đang lưu..." })
                : editingItem
                ? t("student.btnUpdate", { defaultValue: "Cập nhật" })
                : t("questionCategory.btnSave", { defaultValue: "Tạo mới" })}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

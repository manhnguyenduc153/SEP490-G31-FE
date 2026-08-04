"use client";
import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { LearningMaterialItem } from "@/services/learningMaterial.api";
import { courseApi, CourseItem } from "@/services/course.api";
import { classApi, ClassItem } from "@/services/class.api";
import { commonApi } from "@/services/common.api";
import { teacherApi } from "@/services/teacher.api";
import { UploadCloud, FileText, X, BookOpen, AlertCircle, Loader2, Music, Video, Image as ImageIcon, FileArchive, CheckCircle2 } from "lucide-react";
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
        const rawType = file.type || file.name.split(".").pop() || "";
        setFormFileType(rawType.substring(0, 50));
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

  const getFileIconAndColor = (url: string, type: string) => {
    const ext = (url || "").split(".").pop()?.toLowerCase() || "";
    const typeLower = (type || "").toLowerCase();
    
    if (ext === "pdf" || typeLower.includes("pdf")) {
      return { icon: FileText, color: "text-rose-500 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200 dark:border-rose-800/30", label: "PDF Document" };
    }
    if (["doc", "docx"].includes(ext) || typeLower.includes("word") || typeLower.includes("officedocument.wordprocessing")) {
      return { icon: FileText, color: "text-blue-500 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200 dark:border-blue-800/30", label: "Word Document" };
    }
    if (["xls", "xlsx"].includes(ext) || typeLower.includes("excel") || typeLower.includes("officedocument.spreadsheetml")) {
      return { icon: FileText, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30", label: "Excel Spreadsheet" };
    }
    if (["ppt", "pptx"].includes(ext) || typeLower.includes("presentation") || typeLower.includes("officedocument.presentationml")) {
      return { icon: FileText, color: "text-orange-500 bg-orange-50 dark:bg-orange-950/20 dark:text-orange-400 border-orange-200 dark:border-orange-800/30", label: "PowerPoint Slides" };
    }
    if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext) || typeLower.includes("image/")) {
      return { icon: ImageIcon, color: "text-purple-500 bg-purple-50 dark:bg-purple-950/20 dark:text-purple-400 border-purple-200 dark:border-purple-800/30", label: "Image File" };
    }
    if (["mp3", "wav", "m4a", "ogg", "aac"].includes(ext) || typeLower.includes("audio/")) {
      return { icon: Music, color: "text-amber-500 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200 dark:border-amber-800/30", label: "Audio File" };
    }
    if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext) || typeLower.includes("video/")) {
      return { icon: Video, color: "text-cyan-500 bg-cyan-50 dark:bg-cyan-950/20 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/30", label: "Video File" };
    }
    if (["zip", "rar", "tar", "gz", "7z"].includes(ext) || typeLower.includes("zip") || typeLower.includes("compressed")) {
      return { icon: FileArchive, color: "text-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/30", label: "Archive File" };
    }
    return { icon: FileText, color: "text-gray-500 bg-gray-50 dark:bg-gray-950/20 dark:text-gray-400 border-gray-200 dark:border-gray-800/30", label: "Document File" };
  };

  const { icon: FileIcon, color: iconColorClasses, label: fileLabel } = getFileIconAndColor(formFileUrl, formFileType);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[700px] p-0 rounded-2xl bg-white dark:bg-gray-950 shadow-2xl border border-gray-100 dark:border-gray-800"
    >
      <div className="flex flex-col max-h-[90vh] md:max-h-[85vh] overflow-hidden rounded-2xl">
        {/* Modal Header */}
        <div className="flex items-start gap-4 p-6 sm:p-8 pb-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20 shrink-0">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl dark:bg-blue-950/50 dark:text-blue-400 shrink-0 shadow-theme-xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {editingItem
                ? t("learningMaterial.editTitle", { defaultValue: "Chỉnh sửa tài liệu học tập" })
                : t("learningMaterial.createTitle", { defaultValue: "Đăng tải tài liệu mới" })}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {editingItem
                ? t("learningMaterial.editDesc", { defaultValue: "Cập nhật thông tin tài liệu học tập." })
                : t("learningMaterial.createDesc", { defaultValue: "Điền thông tin và tải lên tài liệu mới." })}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Code */}
            <div>
              <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t("learningMaterial.formCodeLabel", { defaultValue: "Mã tài liệu" })} <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={50}
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder={t("learningMaterial.formCodePlaceholder", { defaultValue: "Nhập mã tài liệu..." })}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-500 shadow-theme-xs transition-all"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t("learningMaterial.formNameLabel", { defaultValue: "Tên tài liệu" })} <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={200}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("learningMaterial.formNamePlaceholder", { defaultValue: "Nhập tên tài liệu..." })}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-500 shadow-theme-xs transition-all"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("learningMaterial.formTitleLabel", { defaultValue: "Tiêu đề hiển thị" })}
            </label>
            <input
              type="text"
              maxLength={250}
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder={t("learningMaterial.formTitlePlaceholder", { defaultValue: "Nhập tiêu đề hiển thị..." })}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-500 shadow-theme-xs transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Course */}
            <div>
              <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
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
              <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
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
            <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("learningMaterial.formDescLabel", { defaultValue: "Mô tả tài liệu" })}
            </label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder={t("learningMaterial.formDescPlaceholder", { defaultValue: "Nhập mô tả tài liệu (không bắt buộc)..." })}
              rows={3}
              maxLength={1000}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-500 shadow-theme-xs resize-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Status */}
            <div>
              <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t("learningMaterial.formStatusLabel", { defaultValue: "Trạng thái hoạt động" })}
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setFormStatus(1)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    formStatus === 1
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                      : "border-gray-200 bg-transparent text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-900"
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${formStatus === 1 ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} />
                  {t("student.formStatusActive", { defaultValue: "Hoạt động" })}
                </button>
                <button
                  type="button"
                  onClick={() => setFormStatus(0)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    formStatus === 0
                      ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400"
                      : "border-gray-200 bg-transparent text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-900"
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${formStatus === 0 ? "bg-rose-500" : "bg-gray-300"}`} />
                  {t("student.formStatusInactive", { defaultValue: "Ngưng hoạt động" })}
                </button>
              </div>
            </div>
          </div>

          {/* File Upload Dropzone */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("learningMaterial.formFileLabel", { defaultValue: "Tệp tin đính kèm" })} <span className="text-rose-500 font-bold">*</span>
            </label>

            {formFileUrl ? (
              <div className={`flex items-center justify-between p-4 rounded-xl border ${iconColorClasses} shadow-theme-xs transition-all`}>
                <div className="flex items-center gap-3.5 overflow-hidden">
                  <div className="p-2.5 bg-white/60 rounded-xl dark:bg-black/20 shrink-0">
                    <FileIcon className="w-6 h-6" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold truncate text-gray-800 dark:text-gray-100 max-w-[400px]">
                      {selectedFile ? selectedFile.name : formFileUrl.split("/").pop()}
                    </p>
                    <p className="text-xs font-medium text-gray-400 mt-0.5">
                      {fileLabel}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <button
                    type="button"
                    onClick={removeFile}
                    className="p-1.5 text-gray-400 hover:text-rose-500 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 bg-gray-50 dark:bg-gray-900/30 hover:border-brand-500 dark:hover:border-brand-400 transition-all group cursor-pointer">
                <input
                  type="file"
                  id="material-file-upload"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                
                {uploading ? (
                  <div className="flex flex-col items-center py-2">
                    <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-3" />
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {t("homework.uploadingFiles", { defaultValue: "Đang tải lên..." })}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 transition-all mb-3">
                      <UploadCloud className="w-8 h-8 text-gray-400 group-hover:text-brand-500 transition-all" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {t("homework.uploadPlaceholder", { defaultValue: "Kéo thả file vào đây, hoặc click để chọn file" })}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 max-w-[420px] leading-relaxed">
                      Chấp nhận tất cả định dạng (PDF, Word, Excel, PowerPoint, ZIP, Ảnh, Video, Audio...) • Tối đa 50MB
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form-level error */}
          {formError && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-rose-100 bg-rose-50/30 text-rose-800 dark:border-rose-950/40 dark:bg-rose-950/10 dark:text-rose-200 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-theme-sm">{t("learningMaterial.uploadErrorTitle", { defaultValue: "Đã xảy ra lỗi khi xử lý" })}</p>
                <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed">{formError}</p>
              </div>
            </div>
          )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 p-6 sm:px-8 py-5 border-t border-gray-100 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-950 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-850 dark:text-gray-300 dark:hover:bg-gray-750 rounded-lg transition-colors border border-transparent"
            >
              {t("learningMaterial.btnCancel", { defaultValue: "Hủy" })}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || uploading || !formFileUrl}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all inline-flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
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

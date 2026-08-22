"use client";
import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { LearningMaterialItem } from "@/services/learningMaterial.api";
import { commonApi } from "@/services/common.api";
import { teacherApi } from "@/services/teacher.api";
import { learningMaterialApi } from "@/services/learningMaterial.api";
import { UploadCloud, FileText, X } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { CodeHelper } from "@/helpers/CodeHelper";
import { useTranslation } from "react-i18next";
import { z } from "zod";

interface MaterialFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: LearningMaterialItem | null;
  onSubmitSuccess: (savedItem: LearningMaterialItem, isEdit: boolean) => void;
}

export function MaterialFormModal({
  isOpen,
  onClose,
  editingItem,
  onSubmitSuccess,
}: MaterialFormModalProps) {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<{ id: number; code: string; name: string }[]>([]);
  const [classes, setClasses] = useState<{ id: number; code: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Form states
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [classId, setClassId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [fileType, setFileType] = useState("");
  const [status, setStatus] = useState(1);

  // Validation states
  const [errors, setErrors] = useState<string[]>([]);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    if (editingItem && isOpen) {
      setCode(editingItem.code || "");
      setName(editingItem.name || "");
      setTitle(editingItem.title || "");
      setDesc(editingItem.description || "");
      setClassId(editingItem.classId || null);
      setCourseId(editingItem.courseId || null);
      setFileUrl(editingItem.fileUrl || "");
      setFileType(editingItem.fileType || "");
      setStatus(editingItem.status);
    } else if (isOpen) {
      setCode(CodeHelper.generate("LM"));
      setName("");
      setTitle("");
      setDesc("");
      setClassId(null);
      setCourseId(null);
      setFileUrl("");
      setFileType("");
      setStatus(1);
    }
    setErrors([]);
    setInvalidFields([]);
  }, [editingItem, isOpen]);

  const clearField = (field: string) => {
    if (invalidFields.includes(field)) {
      setInvalidFields((prev) => prev.filter((f) => f !== field));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processUpload(files[0]);
    }
  };

  const processUpload = async (file: File) => {
    setUploading(true);
    setErrors([]);

    if (file.size > 10 * 1024 * 1024) {
      setErrors([t("backendMessages.ERR_FILE_SIZE_EXCEEDS_10MB", { defaultValue: "Dung lượng tệp vượt quá giới hạn cho phép (tối đa 10MB)." })]);
      setUploading(false);
      return;
    }

    try {
      const res = await teacherApi.uploadDocument(file);
      if (res.success && res.data) {
        setFileUrl(res.data);
        setFileType(file.type || file.name.split(".").pop() || "");
        setSelectedFile(file);
        clearField("fileUrl");
      } else {
        const errMsg = res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("learningMaterial.uploadError", { defaultValue: "Lỗi tải lên tệp tin." });
        setErrors([errMsg]);
      }
    } catch {
      setErrors([t("learningMaterial.systemError", { defaultValue: "Lỗi hệ thống." })]);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFileUrl("");
    setFileType("");
  };

  const inputClass = (field: string) =>
    `w-full rounded-lg border bg-transparent px-4 py-2 text-sm text-gray-800 focus:outline-hidden focus:ring-3 dark:text-white/90 dark:placeholder:text-white/30 shadow-theme-xs ${
      invalidFields.includes(field)
        ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-500"
        : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700"
    }`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const schema = z.object({
      code: z
        .string()
        .trim()
        .min(1, t("learningMaterial.errorEmptyCode", { defaultValue: "Mã tài liệu không được để trống." }))
        .min(5, t("learningMaterial.errorMinLengthCode", { defaultValue: "Mã tài liệu phải có ít nhất 5 ký tự." }))
        .max(50, t("learningMaterial.errorMaxLengthCode", { defaultValue: "Mã tài liệu không được vượt quá 50 ký tự." })),
      name: z
        .string()
        .trim()
        .min(1, t("learningMaterial.errorEmptyName", { defaultValue: "Tên tài liệu không được để trống." }))
        .min(5, t("learningMaterial.errorMinLengthName", { defaultValue: "Tên tài liệu phải có ít nhất 5 ký tự." }))
        .max(200, t("learningMaterial.errorMaxLengthName", { defaultValue: "Tên tài liệu không được vượt quá 200 ký tự." })),
      title: z
        .string()
        .trim()
        .max(250, t("learningMaterial.errorMaxLengthTitle", { defaultValue: "Tiêu đề hiển thị không được vượt quá 250 ký tự." }))
        .optional(),
      desc: z
        .string()
        .trim()
        .max(1000, t("learningMaterial.errorMaxLengthDesc", { defaultValue: "Mô tả không được vượt quá 1000 ký tự." }))
        .optional(),
      fileUrl: z
        .string()
        .min(1, t("learningMaterial.fileRequired", { defaultValue: "Vui lòng tải lên tài liệu đính kèm." })),
    });

    const result = schema.safeParse({ code, name, title, desc, fileUrl });

    if (!result.success) {
      const fieldErrors: string[] = [];
      const fields: string[] = [];
      result.error.issues.forEach((err) => {
        fieldErrors.push(err.message);
        if (err.path.length > 0) fields.push(err.path[0] as string);
      });
      setErrors(fieldErrors);
      setInvalidFields(fields);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);
    setInvalidFields([]);

    const dto = {
      code: code.trim(),
      name: name.trim(),
      title: title.trim() || name.trim(),
      description: desc.trim() || null,
      classId,
      courseId,
      fileUrl,
      fileType,
      status,
    };

    try {
      let res;
      if (editingItem) {
        res = await learningMaterialApi.update(editingItem.id, {
          ...dto,
          id: editingItem.id,
        });
      } else {
        res = await learningMaterialApi.create(dto);
      }

      if (res.success && res.data) {
        onSubmitSuccess(res.data, !!editingItem);
        onClose();
      } else {
        const msg = res.message
          ? t(`backendMessages.${res.message}`, { defaultValue: res.message })
          : t("learningMaterial.saveError", { defaultValue: "Đã xảy ra lỗi khi lưu tài liệu." });
        setErrors([msg]);
        if (res.message === "ERR_CODE_DUPLICATE") setInvalidFields(["code"]);
        else if (res.message === "ERR_NAME_DUPLICATE") setInvalidFields(["name"]);
      }
    } catch {
      setErrors([t("learningMaterial.systemError", { defaultValue: "Lỗi hệ thống." })]);
    } finally {
      setIsSubmitting(false);
    }
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

        <form onSubmit={handleSubmit} className="space-y-4 mt-2" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Code */}
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("learningMaterial.formCodeLabel", { defaultValue: "Mã tài liệu" })} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={50}
                value={code}
                onChange={(e) => { setCode(e.target.value); clearField("code"); }}
                placeholder={t("learningMaterial.formCodePlaceholder", { defaultValue: "Nhập mã tài liệu..." })}
                className={inputClass("code")}
              />
            </div>

            {/* Name */}
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("learningMaterial.formNameLabel", { defaultValue: "Tên tài liệu" })} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={200}
                value={name}
                onChange={(e) => { setName(e.target.value); clearField("name"); }}
                placeholder={t("learningMaterial.formNamePlaceholder", { defaultValue: "Nhập tên tài liệu..." })}
                className={inputClass("name")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("learningMaterial.formTitleLabel", { defaultValue: "Tiêu đề hiển thị" })}
              </label>
              <input
                type="text"
                maxLength={250}
                value={title}
                onChange={(e) => { setTitle(e.target.value); clearField("title"); }}
                placeholder={t("learningMaterial.formTitlePlaceholder", { defaultValue: "Nhập tiêu đề hiển thị..." })}
                className={inputClass("title")}
              />
            </div>

            {/* Status */}
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("learningMaterial.formStatusLabel", { defaultValue: "Trạng thái hoạt động" })}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 shadow-theme-xs"
              >
                <option value={1}>{t("student.formStatusActive", { defaultValue: "Hoạt động" })}</option>
                <option value={0}>{t("student.formStatusInactive", { defaultValue: "Ngưng hoạt động" })}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Course */}
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("learningMaterial.formCourseLabel", { defaultValue: "Khóa học áp dụng" })}
              </label>
              <SearchableSelect
                value={courseId || ""}
                onChange={(value) => setCourseId(value ? Number(value) : null)}
                options={courses.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
                placeholder={t("learningMaterial.noCourse", { defaultValue: "Tất cả khóa học" })}
                onClear={() => setCourseId(null)}
              />
            </div>

            {/* Class */}
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("learningMaterial.formClassLabel", { defaultValue: "Lớp học áp dụng" })}
              </label>
              <SearchableSelect
                value={classId || ""}
                onChange={(value) => setClassId(value ? Number(value) : null)}
                options={classes.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
                placeholder={t("learningMaterial.noClass", { defaultValue: "Tất cả lớp học" })}
                onClear={() => setClassId(null)}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("learningMaterial.formDescLabel", { defaultValue: "Mô tả tài liệu" })}
            </label>
            <textarea
              value={desc}
              onChange={(e) => { setDesc(e.target.value); clearField("desc"); }}
              placeholder={t("learningMaterial.formDescPlaceholder", { defaultValue: "Nhập mô tả tài liệu (không bắt buộc)..." })}
              rows={2}
              maxLength={1000}
              className={`${inputClass("desc")} resize-none`}
            />
          </div>

          {/* File Upload Dropzone */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("learningMaterial.formFileLabel", { defaultValue: "Tệp tin đính kèm" })} <span className="text-rose-500">*</span>
            </label>

            {fileUrl ? (
              <div className={`flex items-center justify-between p-3 rounded-lg border bg-brand-50/50 dark:bg-brand-950/20 ${invalidFields.includes("fileUrl") ? "border-rose-500 dark:border-rose-500" : "border-brand-200 dark:border-brand-800/30"}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileText className="w-8 h-8 text-brand-500 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {selectedFile ? selectedFile.name : fileUrl.split("/").pop()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {fileType || "Document"}
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
              <div className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 bg-gray-50 dark:bg-gray-900/50 hover:border-brand-500 dark:hover:border-brand-400 transition-colors group cursor-pointer ${invalidFields.includes("fileUrl") ? "border-rose-500 dark:border-rose-500" : "border-gray-300 dark:border-gray-700"}`}>
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
                  PDF, DOCX, Images, Audio, Video (Max: 10MB)
                </p>
              </div>
            )}
          </div>

          {/* Error block */}
          {errors.length > 0 && (
            <div className="p-3 text-sm text-rose-500 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-400 rounded-lg space-y-1">
              {errors.map((err, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <span className="shrink-0">•</span>
                  <span>{err}</span>
                </div>
              ))}
            </div>
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
              disabled={isSubmitting || uploading}
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

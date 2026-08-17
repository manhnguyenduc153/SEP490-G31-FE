"use client";

import React, { useCallback, useEffect, useState } from "react";
import { homeworkApi, HomeworkDto, HomeworkSaveDto } from "@/services/homework.api";
import { teacherApi } from "@/services/teacher.api";
import { useDropzone } from "react-dropzone";
import { X, UploadCloud, File, FileAudio, FileText, FileVideo } from "lucide-react";
import { ENV } from "@/config/env";
import { useTranslation } from "react-i18next";
import { z } from "zod";

interface HomeworkFormProps {
  classId: number;
  classTeacherId: number;
  editingItem: HomeworkDto | null;
  onCancel: () => void;
  onSuccess: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

type HomeworkFormState = Omit<HomeworkSaveDto, "totalScore"> & { totalScore: string };

export default function HomeworkForm({ classId, classTeacherId, editingItem, onCancel, onSuccess, showToast }: HomeworkFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<HomeworkFormState>({
    classId,
    teacherId: classTeacherId || 0,
    title: "",
    description: "",
    attachmentUrls: [],
    skill: "General",
    dueDate: "",
    totalScore: "10",
    status: 1,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);

  useEffect(() => {
    if (editingItem) {
      setFormData({
        classId: editingItem.classId,
        teacherId: editingItem.teacherId,
        title: editingItem.title,
        description: editingItem.description || "",
        attachmentUrls: editingItem.attachmentUrls || [],
        skill: editingItem.skill || "General",
        dueDate: editingItem.dueDate ? editingItem.dueDate.substring(0, 16) : "",
        totalScore: "10",
        status: editingItem.status,
      });
    } else {
      setFormData(prev => ({
        ...prev,
        classId,
        teacherId: classTeacherId || 0,
      }));
    }
    setFieldErrors({});
    setFormErrors([]);
  }, [classId, classTeacherId, editingItem]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFieldErrors(prev => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setFormErrors([]);
    setFormData(prev => ({
      ...prev,
      [name]: name === "status" ? Number(value) : value,
    }));
  };

  const RequiredMark = () => <span className="text-red-500">*</span>;

  const inputClassName = (fieldName: string) =>
    `w-full px-4 py-2 border rounded-lg focus:ring focus:ring-brand-500/20 ${
      fieldErrors[fieldName] ? "border-red-500 focus:border-red-500" : ""
    }`;

  const renderError = (fieldName: string) =>
    fieldErrors[fieldName] ? (
      <p className="mt-1 text-xs font-medium text-red-500">{fieldErrors[fieldName]}</p>
    ) : null;

  const validateForm = () => {
    const homeworkSchema = z.object({
      classId: z.number().int().positive(t("homework.validationClassRequired")),
      teacherId: z.number().int().positive(t("homework.validationTeacherRequired")),
      title: z.string().trim()
        .min(1, t("homework.validationTitleRequired"))
        .max(500, t("homework.validationTitleMax")),
      dueDate: z.string().refine(
        (value) => !value || new Date(value).getTime() > Date.now(),
        t("homework.validationDueDateFuture")
      ),
      totalScore: z.string().trim()
        .min(1, t("homework.validationTotalScoreRequired"))
        .refine((value) => !value || Number.isFinite(Number(value)), t("homework.validationTotalScoreRequired"))
        .refine((value) => !value || (Number(value) >= 0 && Number(value) <= 1000), t("homework.validationTotalScoreRange")),
      status: z.number().refine((value) => [0, 1].includes(value), t("homework.validationStatusRequired")),
    });

    const validation = homeworkSchema.safeParse(formData);
    if (validation.success) {
      setFieldErrors({});
      setFormErrors([]);
      return true;
    }

    const errors: Record<string, string> = {};
    validation.error.issues.forEach((issue) => {
      const field = String(issue.path[0] || "form");
      if (!errors[field]) errors[field] = issue.message;
    });
    setFieldErrors(errors);
    setFormErrors(Object.values(errors));
    return false;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploadingFiles(true);
    try {
      const newUrls: string[] = [];
      for (const file of acceptedFiles) {
        const res = await teacherApi.uploadDocument(file);
        if (res.success && res.data) {
          newUrls.push(res.data);
        } else {
          showToast(t("homework.uploadFileError", { name: file.name }), "error");
        }
      }
      setFormData(prev => ({ ...prev, attachmentUrls: [...(prev.attachmentUrls || []), ...newUrls] }));
    } catch (err) {
      console.error(err);
      showToast(t("homework.uploadError"), "error");
    } finally {
      setUploadingFiles(false);
    }
  }, [showToast, t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const removeFile = (index: number) => {
    setFormData(prev => {
      const updated = [...(prev.attachmentUrls || [])];
      updated.splice(index, 1);
      return { ...prev, attachmentUrls: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const payload: HomeworkSaveDto = {
      ...formData,
      title: formData.title.trim(),
      totalScore: 10,
    };
    try {
      if (editingItem) {
        const res = await homeworkApi.updateHomework(editingItem.id, payload);
        if (res.success) {
          showToast(t("homework.updateSuccess"), "success");
          onSuccess();
        } else {
          const message = res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("homework.updateError");
          setFormErrors([message]);
          showToast(message, "error");
        }
      } else {
        const res = await homeworkApi.createHomework(payload);
        if (res.success) {
          showToast(t("homework.createSuccess"), "success");
          onSuccess();
        } else {
          const message = res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("homework.createError");
          setFormErrors([message]);
          showToast(message, "error");
        }
      }
    } catch (err) {
      console.error(err);
      const message = t("homework.systemError");
      setFormErrors([message]);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFileIcon = (url: string) => {
    if (url.match(/\.(mp3|wav|ogg)$/i)) return <FileAudio className="w-5 h-5 text-blue-500" />;
    if (url.match(/\.(mp4|mov|m4v|webm|avi|mkv)$/i)) return <FileVideo className="w-5 h-5 text-purple-500" />;
    if (url.match(/\.(pdf|docx|doc)$/i)) return <FileText className="w-5 h-5 text-red-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const formatUrl = (url: string) => {
    if (url.startsWith("/")) {
      return `${ENV.API_BASE_URL}${url}`;
    }
    return url;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">
          {editingItem ? t("homework.editTitle") : t("homework.createTitle")}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block mb-2 text-sm font-medium">{t("homework.formTitleLabel")} <RequiredMark /></label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={inputClassName("title")}
            required
            maxLength={500}
            aria-invalid={Boolean(fieldErrors.title)}
          />
          {renderError("title")}
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium">{t("homework.formSkillLabel")}</label>
          <select
            name="skill"
            value={formData.skill}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-brand-500/20"
          >
            <option value="General">General</option>
            <option value="Listening">Listening</option>
            <option value="Speaking">Speaking</option>
            <option value="Reading">Reading</option>
            <option value="Writing">Writing</option>
          </select>
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium">{t("homework.colDueDate")}</label>
          <input
            type="datetime-local"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleChange}
            className={inputClassName("dueDate")}
            aria-invalid={Boolean(fieldErrors.dueDate)}
          />
          {renderError("dueDate")}
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium">{t("homework.formStatusLabel")} <RequiredMark /></label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className={inputClassName("status")}
            required
            aria-invalid={Boolean(fieldErrors.status)}
          >
            <option value={1}>{t("homework.statusActive")}</option>
            <option value={0}>{t("homework.statusInactive")}</option>
          </select>
          {renderError("status")}
        </div>

        <div className="md:col-span-2">
          <label className="block mb-2 text-sm font-medium">{t("homework.descriptionTitle")}</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-brand-500/20"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block mb-2 text-sm font-medium">{t("homework.attachmentsLabel")}</label>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-brand-500 bg-brand-50" : "border-gray-300 hover:border-brand-400"
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="w-10 h-10 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              {uploadingFiles ? t("homework.uploading") : t("homework.dropzoneText")}
            </p>
          </div>

          {formData.attachmentUrls && formData.attachmentUrls.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {formData.attachmentUrls.map((url, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 border rounded-lg">
                  <div className="flex items-center gap-3 truncate">
                    {getFileIcon(url)}
                    <a href={formatUrl(url)} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate">
                      {url.split("/").pop()}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {formErrors.length > 0 && (
        <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
          {formErrors.map((error, index) => <div key={`${error}-${index}`}>• {error}</div>)}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          {t("homework.cancel")}
        </button>
        <button
          type="submit"
          disabled={isSubmitting || uploadingFiles}
          className="px-5 py-2.5 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50"
        >
          {isSubmitting ? t("homework.saving") : t("homework.save")}
        </button>
      </div>
    </form>
  );
}

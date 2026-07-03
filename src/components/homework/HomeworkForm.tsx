"use client";

import React, { useState, useEffect, useCallback } from "react";
import { homeworkApi, HomeworkDto, HomeworkSaveDto } from "@/services/homework.api";
import { teacherApi } from "@/services/teacher.api";
import { parseJwt } from "@/services/api";
import { useDropzone } from "react-dropzone";
import { X, UploadCloud, File, FileAudio, FileText } from "lucide-react";
import { ENV } from "@/config/env";

interface HomeworkFormProps {
  classId: number;
  classTeacherId: number;
  editingItem: HomeworkDto | null;
  onCancel: () => void;
  onSuccess: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function HomeworkForm({ classId, classTeacherId, editingItem, onCancel, onSuccess, showToast }: HomeworkFormProps) {
  
  const [formData, setFormData] = useState<HomeworkSaveDto>({
    classId: classId,
    teacherId: classTeacherId || 0,
    title: "",
    description: "",
    attachmentUrls: [],
    skill: "General",
    dueDate: "",
    totalScore: 10,
    status: 1
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

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
        totalScore: editingItem.totalScore,
        status: editingItem.status
      });
    }
  }, [editingItem]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "totalScore" || name === "status" ? Number(value) : value
    }));
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploadingFiles(true);
    try {
      const newUrls: string[] = [];
      for (const file of acceptedFiles) {
        // Upload each file
        const res = await teacherApi.uploadDocument(file);
        if (res.success && res.data) {
          newUrls.push(res.data);
        } else {
          showToast(`Lỗi upload file ${file.name}`, "error");
        }
      }
      setFormData(prev => ({ ...prev, attachmentUrls: [...(prev.attachmentUrls || []), ...newUrls] }));
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi upload file", "error");
    } finally {
      setUploadingFiles(false);
    }
  }, [showToast]);

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
    if (!formData.title.trim()) {
      showToast("Tiêu đề không được để trống", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        const res = await homeworkApi.updateHomework(editingItem.id, formData);
        if (res.success) {
          showToast("Cập nhật bài tập thành công", "success");
          onSuccess();
        } else {
          showToast(res.message || "Lỗi cập nhật", "error");
        }
      } else {
        const res = await homeworkApi.createHomework(formData);
        if (res.success) {
          showToast("Tạo bài tập thành công", "success");
          onSuccess();
        } else {
          showToast(res.message || "Lỗi tạo bài tập", "error");
        }
      }
    } catch (err) {
      console.error(err);
      showToast("Lỗi hệ thống", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFileIcon = (url: string) => {
    if (url.match(/\.(mp3|wav|ogg)$/i)) return <FileAudio className="w-5 h-5 text-blue-500" />;
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">{editingItem ? "Sửa bài tập" : "Tạo bài tập mới"}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block mb-2 text-sm font-medium">Tiêu đề *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-brand-500/20"
            required
          />
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium">Kỹ năng (IELTS)</label>
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
          <label className="block mb-2 text-sm font-medium">Hạn nộp</label>
          <input
            type="datetime-local"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-brand-500/20"
          />
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium">Tổng điểm</label>
          <input
            type="number"
            name="totalScore"
            value={formData.totalScore}
            onChange={handleChange}
            min="0"
            className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-brand-500/20"
          />
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium">Trạng thái</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-brand-500/20"
          >
            <option value={1}>Hiển thị</option>
            <option value={0}>Bản nháp</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block mb-2 text-sm font-medium">Mô tả</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-brand-500/20"
          ></textarea>
        </div>

        <div className="md:col-span-2">
          <label className="block mb-2 text-sm font-medium">Tệp đính kèm (Audio, PDF, Word, v.v...)</label>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-brand-500 bg-brand-50" : "border-gray-300 hover:border-brand-400"
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="w-10 h-10 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              {uploadingFiles ? "Đang upload..." : "Kéo thả file vào đây, hoặc click để chọn file"}
            </p>
          </div>
          
          {formData.attachmentUrls && formData.attachmentUrls.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {formData.attachmentUrls.map((url, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 border rounded-lg">
                  <div className="flex items-center gap-3 truncate">
                    {getFileIcon(url)}
                    <a href={formatUrl(url)} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate">
                      {url.split('/').pop()}
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

      <div className="flex justify-end gap-3 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={isSubmitting || uploadingFiles}
          className="px-5 py-2.5 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50"
        >
          {isSubmitting ? "Đang lưu..." : "Lưu bài tập"}
        </button>
      </div>
    </form>
  );
}

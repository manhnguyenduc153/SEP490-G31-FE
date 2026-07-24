"use client";

import React, { useState, useCallback, useEffect } from "react";
import { homeworkApi, HomeworkDto, HomeworkSubmissionDto, HomeworkSubmissionSaveDto } from "@/services/homework.api";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { useDropzone } from "react-dropzone";
import { UploadCloud, File, FileAudio, FileText, FileVideo, X } from "lucide-react";
import { teacherApi } from "@/services/teacher.api"; // Use for upload API
import { ENV } from "@/config/env";
import AttachmentPreview from "./AttachmentPreview";

interface StudentSubmitFormProps {
  homework: HomeworkDto;
  onBack: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function StudentSubmitForm({ homework, onBack, showToast }: StudentSubmitFormProps) {
  
  const [content, setContent] = useState("");
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  
  const [mySubmission, setMySubmission] = useState<HomeworkSubmissionDto | null>(null);
  const [isLoadingSubmission, setIsLoadingSubmission] = useState(true);

  useEffect(() => {
    const checkSubmission = async () => {
      try {
        const res = await homeworkApi.getMySubmission(homework.id);
        if (res.success && res.data) {
          setMySubmission(res.data);
          setContent(res.data.content || "");
          setAttachmentUrls(res.data.attachmentUrls || []);
        }
      } catch (err) {
        console.error("Error checking submission", err);
      } finally {
        setIsLoadingSubmission(false);
      }
    };
    
    checkSubmission();
  }, [homework.id]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploadingFiles(true);
    try {
      const newUrls: string[] = [];
      for (const file of acceptedFiles) {
        const res = await teacherApi.uploadDocument(file);
        if (res.success && res.data) {
          newUrls.push(res.data);
        } else {
          showToast(`Lỗi upload file ${file.name}`, "error");
        }
      }
      setAttachmentUrls(prev => [...prev, ...newUrls]);
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi upload file", "error");
    } finally {
      setUploadingFiles(false);
    }
  }, [showToast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const removeFile = (index: number) => {
    setAttachmentUrls(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && attachmentUrls.length === 0) {
      showToast("Vui lòng nhập nội dung hoặc đính kèm file", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: HomeworkSubmissionSaveDto = {
        homeworkId: homework.id,
        content,
        attachmentUrls
      };

      const res = await homeworkApi.submitHomework(payload);
      if (res.success) {
        showToast("Nộp bài thành công", "success");
        setMySubmission(res.data);
      } else {
        showToast(res.message || "Lỗi nộp bài", "error");
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

  if (isLoadingSubmission) {
    return <div className="text-center py-10">Đang kiểm tra trạng thái bài nộp...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{homework.title}</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            {homework.description || "Không có mô tả"}
          </p>
          <div className="mt-4 flex gap-4 text-sm">
            <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full font-medium">
              Kỹ năng: {homework.skill || "General"}
            </span>
            <span className="bg-brand-50 text-brand-600 px-3 py-1 rounded-full font-medium">
              Hạn nộp: {homework.dueDate ? new Date(homework.dueDate).toLocaleString("vi-VN") : "Không có"}
            </span>
          </div>

          {homework.attachmentUrls && homework.attachmentUrls.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold mb-2">Đề bài (Tệp đính kèm):</h3>
              <div className="flex flex-col gap-2">
                {homework.attachmentUrls.map((url, idx) => (
                  <a key={idx} href={formatUrl(url)} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-gray-50 border rounded-lg hover:bg-gray-100 transition-colors max-w-sm">
                    {getFileIcon(url)}
                    <span className="text-sm text-blue-600 truncate">{url.split('/').pop()}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        <button onClick={onBack} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
          Trở lại
        </button>
      </div>

      <AttachmentPreview urls={homework.attachmentUrls} title="Đề bài (Tệp đính kèm)" />

      <div className="border-t pt-6 mt-6">
        <h3 className="text-lg font-bold mb-4">Nộp bài của bạn</h3>
        
        {mySubmission && mySubmission.score !== null && mySubmission.score !== undefined ? (
          <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl">
            <h4 className="text-emerald-800 font-bold mb-2">Bài của bạn đã được chấm!</h4>
            <p className="text-emerald-900 font-semibold text-lg">Điểm số: {mySubmission.score} / {homework.totalScore}</p>
            {mySubmission.teacherFeedback && (
              <p className="mt-2 text-emerald-800 italic">Nhận xét: &quot;{mySubmission.teacherFeedback}&quot;</p>
            )}
          </div>
        ) : (
          <PermissionGuard requiredPermission="StudentHomework.Submit">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block mb-2 text-sm font-medium">Nội dung bài làm (hoặc ghi chú)</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-brand-500/20"
                placeholder="Nhập câu trả lời hoặc ghi chú của bạn..."
              ></textarea>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">Đính kèm file bài làm (Word, PDF, Audio ghi âm...)</label>
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
              
              {attachmentUrls && attachmentUrls.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {attachmentUrls.map((url, idx) => (
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

            <div className="flex justify-end pt-4 border-t">
              <button
                type="submit"
                disabled={isSubmitting || uploadingFiles}
                className="px-6 py-3 text-sm font-bold text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50"
              >
                {isSubmitting ? "Đang nộp..." : (mySubmission ? "Cập nhật bài nộp" : "Nộp bài")}
              </button>
            </div>
          </form>
          </PermissionGuard>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X, File, FileAudio, FileText } from "lucide-react";
import { homeworkApi, HomeworkDto, HomeworkSubmissionDto } from "@/services/homework.api";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { ENV } from "@/config/env";

interface HomeworkSubmissionsProps {
  homework: HomeworkDto;
  onBack: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function HomeworkSubmissions({ homework, onBack, showToast }: HomeworkSubmissionsProps) {
  const [submissions, setSubmissions] = useState<HomeworkSubmissionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [gradingSubmissionId, setGradingSubmissionId] = useState<number | null>(null);
  const [score, setScore] = useState<number | "">("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const res = await homeworkApi.getSubmissions(homework.id);
      if (res.success) {
        setSubmissions(res.data);
      }
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi tải danh sách bài nộp", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homework.id]);

  const handleGrade = async (submissionId: number) => {
    if (score === "" || Number(score) < 0 || Number(score) > homework.totalScore) {
      showToast(`Điểm không hợp lệ. Từ 0 đến ${homework.totalScore}`, "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await homeworkApi.gradeSubmission(submissionId, {
        score: Number(score),
        teacherFeedback: feedback
      });

      if (res.success) {
        showToast("Chấm điểm thành công", "success");
        setGradingSubmissionId(null);
        fetchSubmissions();
      } else {
        showToast(res.message || "Lỗi chấm điểm", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Lỗi hệ thống", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startGrading = (sub: HomeworkSubmissionDto) => {
    setGradingSubmissionId(sub.id);
    setScore(sub.score ?? "");
    setFeedback(sub.teacherFeedback || "");
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
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold">Danh sách bài nộp: {homework.title}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Kỹ năng: <span className="font-semibold">{homework.skill || "General"}</span> | Tổng điểm: <span className="font-semibold">{homework.totalScore}</span>
          </p>
        </div>
        <button onClick={onBack} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
          Trở lại
        </button>
      </div>

      <div className="overflow-x-auto border rounded-xl">
        <Table>
          <TableHeader className="bg-gray-50/70 dark:bg-gray-800/40">
            <TableRow>
              <TableCell className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Học sinh</TableCell>
              <TableCell className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian nộp</TableCell>
              <TableCell className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Bài làm (File/Text)</TableCell>
              <TableCell className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Điểm / Nhận xét</TableCell>
              <TableCell className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-sm text-gray-500">Đang tải...</TableCell>
              </TableRow>
            ) : submissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-sm text-gray-500">Chưa có bài nộp nào</TableCell>
              </TableRow>
            ) : (
              submissions.map((sub) => (
                <TableRow key={sub.id} className="hover:bg-gray-50/50">
                  <TableCell className="px-5 py-4 font-medium">
                    {sub.studentName} <br />
                    <span className="text-xs text-gray-500">{sub.studentCode}</span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-600">
                    {new Date(sub.submitTime).toLocaleString("vi-VN")}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <div className="flex flex-col gap-1 max-w-xs">
                      {sub.content && (
                        <div className="text-sm text-gray-600 truncate bg-gray-100 p-2 rounded" title={sub.content}>
                          {sub.content}
                        </div>
                      )}
                      {sub.attachmentUrls && sub.attachmentUrls.length > 0 && (
                        <div className="flex flex-col gap-1 mt-1">
                          {sub.attachmentUrls.map((url, idx) => (
                            <a key={idx} href={formatUrl(url)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline text-xs">
                              {getFileIcon(url)}
                              <span className="truncate max-w-[150px]">{url.split('/').pop()}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    {gradingSubmissionId === sub.id ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="number"
                          placeholder="Điểm"
                          value={score}
                          onChange={(e) => setScore(e.target.value === "" ? "" : Number(e.target.value))}
                          min="0"
                          max={homework.totalScore}
                          className="w-20 px-2 py-1 text-sm border rounded"
                        />
                        <textarea
                          placeholder="Nhận xét"
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          rows={2}
                          className="w-full px-2 py-1 text-sm border rounded"
                        ></textarea>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold">{sub.score !== null && sub.score !== undefined ? `${sub.score}/${homework.totalScore}` : "Chưa chấm"}</span>
                        {sub.teacherFeedback && <span className="text-xs text-gray-500 max-w-xs truncate" title={sub.teacherFeedback}>{sub.teacherFeedback}</span>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right">
                    {gradingSubmissionId === sub.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleGrade(sub.id)} disabled={isSubmitting} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                          <Check className="w-5 h-5" />
                        </button>
                        <button onClick={() => setGradingSubmissionId(null)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startGrading(sub)} className="text-sm font-medium text-brand-600 hover:underline">
                        Chấm điểm
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

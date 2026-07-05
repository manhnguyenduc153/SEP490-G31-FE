"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { examApi, ExamItem } from "@/services/exam.api";
import { StudentExamTaker } from "@/components/exam/StudentExamTaker";

export default function ExamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id ? Number(params.id) : null;

  const [exam, setExam] = useState<ExamItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null); // null = not loaded yet
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Read role first
  useEffect(() => {
    setUserRole(localStorage.getItem("role") || "");
  }, []);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  // Tabs state matching the mockup: Bảng điểm, Tổng quan, Thông số câu, Đề bài (Active), Lời giải
  const [activeTab, setActiveTab] = useState<"questions" | "explanation" | "grades" | "overview" | "stats">("questions");

  // Only load exam via teacher API when user is NOT a student
  useEffect(() => {
    if (userRole === null) return; // wait until role is determined
    if (userRole === "Student") { setLoading(false); return; } // students don't use this path
    if (!id) return;
    async function loadExam() {
      setLoading(true);
      setError(null);
      try {
        const res = await examApi.getById(id!);
        if (res.success && res.data) {
          setExam(res.data);
        } else {
          setError(res.message || "Không thể tải thông tin bài kiểm tra.");
        }
      } catch (err: any) {
        setError(err.message || "Lỗi hệ thống khi tải chi tiết bài kiểm tra.");
      } finally {
        setLoading(false);
      }
    }
    loadExam();
  }, [id, userRole]);

  // ─── Role not yet determined — render nothing to avoid flash ───
  if (userRole === null) return null;

  // ─── STUDENT VIEW ───────────────────────────────────────────────
  if (userRole === "Student") {
    return (
      <div className="space-y-6">
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-[99999] flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl shadow-2xl border border-white/10 dark:border-black/5 animate-bounce">
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        )}
        <StudentExamTaker
          examId={id!}
          onBack={() => router.push("/exams")}
          showToast={showToast}
        />
      </div>
    );
  }

  // ─── TEACHER / ADMIN LOADING ────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        <span className="ml-3 text-sm">Đang tải thông tin đề bài...</span>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="p-6 text-center text-error-500 font-semibold bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl">
        {error || "Không tìm thấy thông tin bài kiểm tra"}
        <div className="mt-4">
          <button
            onClick={() => router.push("/exams")}
            className="px-4 py-2 text-sm text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const handleDownload = () => {
    if (!exam || !exam.questions) return;
    
    // Create a plain text format of the exam questions
    let text = `BÀI KIỂM TRA: ${exam.title.toUpperCase()}\n`;
    text += `Mã bài: ${exam.code}\n`;
    if (exam.description) text += `Mô tả: ${exam.description}\n`;
    text += `Thời gian làm bài: ${exam.duration ? `${exam.duration} phút` : "Tự do"}\n`;
    text += `Tổng điểm: ${exam.totalScore || 10}đ\n`;
    text += `=========================================\n\n`;

    exam.questions.forEach((q, idx) => {
      text += `Câu ${idx + 1}: [${q.code}] (${q.point || 1}đ)\n`;
      text += `${q.content}\n\n`;
      
      const optionLetters = ["A", "B", "C", "D", "E", "F"];
      q.questionAnswers.forEach((ans, oIdx) => {
        const letter = optionLetters[oIdx] || String(oIdx + 1);
        text += `  ${letter}. ${ans.content} ${ans.isCorrect ? " [ĐÁP ÁN ĐÚNG]" : ""}\n`;
      });
      
      if (q.explanation) {
        text += `\nHướng dẫn giải: ${q.explanation}\n`;
      }
      text += `\n-----------------------------------------\n\n`;
    });

    const element = document.createElement("a");
    const file = new Blob([text], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `De_bai_${exam.title.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };


  return (
    <div className="space-y-6">
      {/* Top Header Navigation (Breadcrumb + Title) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/[0.05]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/exams")}
            className="p-2 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 rounded-xl transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold uppercase tracking-wider">
              <span>Bài tập</span>
              <span>/</span>
              <span className="text-gray-500">{exam.className || "Tự do"}</span>
            </div>
            <h2 className="text-xl font-bold text-gray-950 dark:text-white mt-0.5">
              {exam.title}
            </h2>
          </div>
        </div>

        {/* Tab Items on the right matching mockup */}
        <div className="flex items-center bg-gray-100/70 dark:bg-gray-800/40 p-1.5 rounded-xl border border-gray-200/50 dark:border-gray-800/50 self-start sm:self-auto overflow-x-auto max-w-full custom-scrollbar">
          <button
            onClick={() => setActiveTab("grades")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === "grades"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            Bảng điểm
          </button>
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === "overview"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            Tổng quan
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === "stats"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            Thông số câu
          </button>
          <button
            onClick={() => setActiveTab("questions")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === "questions"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            Đề bài
          </button>
          <button
            onClick={() => setActiveTab("explanation")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === "explanation"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            Lời giải
          </button>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Columns: Question views / Tabs representation */}
        <div className="lg:col-span-3 space-y-6">

          {activeTab === "questions" && (
            <div className="space-y-6">
              
              {/* Secondary bar below tab items */}
              <div className="flex justify-between items-center p-4 bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl shadow-theme-xs">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                  Tổng số câu hỏi: <strong className="text-brand-500 font-bold">{exam.questions?.length || 0} câu</strong>
                </span>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-theme-xs rounded-lg h-9"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Tải xuống đề bài
                </button>
              </div>

              {/* Questions list */}
              {(!exam.questions || exam.questions.length === 0) ? (
                <div className="p-8 text-center text-gray-500 bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl">
                  Chưa có câu hỏi nào được gán cho bài kiểm tra này.
                </div>
              ) : (
                exam.questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-6 bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl shadow-theme-xs space-y-4"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-brand-500">
                        Câu {idx + 1}
                      </span>
                      <div className="flex gap-2">
                        <span className="text-[11px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full dark:bg-gray-800 dark:text-gray-400">
                          {q.code}
                        </span>
                        <span className="text-[11px] font-bold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full dark:bg-brand-500/10">
                          {q.point || 1}đ
                        </span>
                      </div>
                    </div>

                    {/* Question Content */}
                    <p className="text-base font-semibold text-gray-900 dark:text-white leading-relaxed">
                      {q.content}
                    </p>

                    {/* Option Choices */}
                    <div className="grid grid-cols-1 gap-3 pt-2">
                      {q.questionAnswers.map((ans, oIdx) => {
                        const optionLetters = ["A", "B", "C", "D", "E", "F"];
                        const letter = optionLetters[oIdx] || String(oIdx + 1);
                        const isCorrect = ans.isCorrect;

                        return (
                          <div
                            key={ans.id}
                            className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                              isCorrect
                                ? "bg-emerald-500/5 border-emerald-500 dark:border-emerald-600"
                                : "border-gray-100 dark:border-gray-800/80 bg-white dark:bg-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Circle Badge letter */}
                              <span
                                className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border ${
                                  isCorrect
                                    ? "bg-emerald-500 text-white border-emerald-500"
                                    : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                                }`}
                              >
                                {letter}
                              </span>
                              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {ans.content}
                              </span>
                            </div>

                            {/* Green checkmark badge on correct option row end */}
                            {isCorrect && (
                              <span className="w-5.5 h-5.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs shadow-emerald-500/10">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "explanation" && (
            <div className="space-y-6">
              {(!exam.questions || exam.questions.length === 0) ? (
                <div className="p-8 text-center text-gray-500 bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl">
                  Chưa có câu hỏi.
                </div>
              ) : (
                exam.questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-6 bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl shadow-theme-xs space-y-4"
                  >
                    <h3 className="text-sm font-bold text-brand-500">Lời giải Câu {idx + 1}</h3>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white font-medium">{q.content}</p>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 text-sm">
                      <p className="font-bold text-xs text-gray-500 uppercase tracking-wider mb-1.5">Hướng dẫn chi tiết</p>
                      {q.explanation || "Không có hướng dẫn giải thích cụ thể cho câu hỏi này."}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "grades" && (
            <div className="p-8 text-center text-gray-500 bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl">
              Chưa có thông tin bảng điểm (Không có lượt nộp bài).
            </div>
          )}

          {activeTab === "overview" && (
            <div className="p-6 bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl space-y-4 text-sm text-gray-700 dark:text-gray-300">
              <h3 className="text-base font-bold text-gray-950 dark:text-white">Tổng quan bài kiểm tra</h3>
              <p>{exam.description || "Không có mô tả chi tiết."}</p>
              <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-white/[0.05] pt-4">
                <div>
                  <p className="text-gray-400">Thời gian làm bài:</p>
                  <p className="font-bold text-gray-800 dark:text-white">{exam.duration ? `${exam.duration} phút` : "Tự do"}</p>
                </div>
                <div>
                  <p className="text-gray-400">Điểm yêu cầu:</p>
                  <p className="font-bold text-gray-800 dark:text-white">{exam.passingScore} / {exam.totalScore}đ</p>
                </div>
                <div>
                  <p className="text-gray-400">Xáo trộn câu hỏi:</p>
                  <p className="font-bold text-gray-800 dark:text-white">{exam.shuffleQuestion ? "Có" : "Không"}</p>
                </div>
                <div>
                  <p className="text-gray-400">Cho xem đáp án:</p>
                  <p className="font-bold text-gray-800 dark:text-white">{exam.showAnswerAfter ? "Có" : "Không"}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "stats" && (
            <div className="p-8 text-center text-gray-500 bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl">
              Chưa có thống số câu hỏi (Cần lượt nộp bài để thống kê).
            </div>
          )}

        </div>

        {/* Right Sidebar: Exam Parameters Info box */}
        <div className="space-y-6">
          <div className="p-5 bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl shadow-theme-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Chi tiết thiết lập
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-gray-50 dark:border-white/[0.02]">
                <span className="text-gray-500">Mã bài kiểm tra:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{exam.code}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-gray-50 dark:border-white/[0.02]">
                <span className="text-gray-500">Lớp được giao:</span>
                <span className="font-semibold text-brand-500">{exam.className || "Không (Lưu kho)"}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-gray-50 dark:border-white/[0.02]">
                <span className="text-gray-500">Thời gian làm bài:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {exam.duration ? `${exam.duration} phút` : "Tự do"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-gray-50 dark:border-white/[0.02]">
                <span className="text-gray-500">Tổng điểm bài:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{exam.totalScore || 10}đ</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-gray-50 dark:border-white/[0.02]">
                <span className="text-gray-500">Điểm tối thiểu đạt:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{exam.passingScore || 5}đ</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-gray-50 dark:border-white/[0.02]">
                <span className="text-gray-500">Số lượt làm bài:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{exam.maxAttempts || 1} lần</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-gray-500">Trạng thái bài:</span>
                <span
                  className={`px-2 py-0.5 font-bold rounded-full text-[10px] ${
                    exam.status === 1
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400"
                  }`}
                >
                  {exam.status === 1 ? "Đã xuất bản" : "Nháp"}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => router.push(`/exams/edit/${exam.id}`)}
                className="w-full py-2.5 text-center text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors shadow-theme-xs"
              >
                Chỉnh sửa bài thi
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { examApi, ExamItem, ExamAttemptDto } from "@/services/exam.api";
import { StudentExamTaker } from "@/components/exam/StudentExamTaker";
import { CheckCircle, XCircle, Clock, Eye, AlertTriangle, BarChart, Award } from "lucide-react";

export default function ExamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const id = params?.id ? Number(params.id) : null;

  const [exam, setExam] = useState<ExamItem | null>(null);
  const [attempts, setAttempts] = useState<ExamAttemptDto[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttemptDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null); // null = not loaded yet
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Custom states for rich attempt review mode
  const [studentSearchKeyword, setStudentSearchKeyword] = useState("");
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [reviewTab, setReviewTab] = useState<"result" | "history">("result");
  const [showExplanations, setShowExplanations] = useState(true);
  const [examViewMode, setExamViewMode] = useState<"student" | "original">("student");

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

  // Tabs state matching the mockup: Tổng quan, Bảng điểm, Thông số câu, Đề bài (Active), Lời giải
  const [activeTab, setActiveTab] = useState<"questions" | "explanation" | "grades" | "overview" | "stats">("questions");

  // Helper to calculate correctness on the frontend (bypassing backend compile sync issues)
  const checkIsCorrect = (q: any, studentAnswerContent: string) => {
    if (!studentAnswerContent) return false;
    
    const correctOptions = q.questionAnswers
      ?.filter((qa: any) => qa.isCorrect)
      .map((qa: any) => qa.content.trim().toLowerCase()) || [];
      
    const correctOptionIds = q.questionAnswers
      ?.filter((qa: any) => qa.isCorrect)
      .map((qa: any) => qa.id.toString()) || [];

    const stdAns = studentAnswerContent.trim().toLowerCase();

    if (q.questionType === 1 || q.questionType === 4) {
      return correctOptions.includes(stdAns) || correctOptionIds.includes(stdAns);
    } else if (q.questionType === 2) {
      const stdAnswers = stdAns.split(",").map(s => s.trim());
      const correctSet = new Set(correctOptions);
      const correctIdSet = new Set(correctOptionIds);
      
      if (stdAnswers.length !== correctSet.size && stdAnswers.length !== correctIdSet.size) {
        return false;
      }
      
      const allMatchText = stdAnswers.every(val => correctSet.has(val));
      const allMatchId = stdAnswers.every(val => correctIdSet.has(val));
      
      return allMatchText || allMatchId;
    }
    return false;
  };

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

  // Only load exam via teacher API when user is NOT a student
  useEffect(() => {
    if (userRole === null) return; // wait until role is determined
    if (userRole === "Student") { setLoading(false); return; } // students don't use this path
    if (!id) return;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [examRes, attemptsRes] = await Promise.all([
          examApi.getById(id!),
          examApi.getAttemptsByExam(id!)
        ]);

        let examData = null;
        if (examRes.success && examRes.data) {
          examData = examRes.data;
          setExam(examRes.data);
        } else {
          setError(examRes.message || "Không thể tải thông tin bài kiểm tra.");
        }

        if (attemptsRes.success && attemptsRes.data) {
          const mappedAttempts = attemptsRes.data.map(att => {
            if (!att.answers) return att;
            const updatedAnswers = att.answers.map(ans => {
              const q = examData?.questions?.find(q => q.id === ans.questionId);
              if (q) {
                return {
                  ...ans,
                  isCorrect: checkIsCorrect(q, ans.answerContent || "")
                };
              }
              return ans;
            });
            return {
              ...att,
              answers: updatedAnswers
            };
          });
          setAttempts(mappedAttempts);
        }
      } catch (err: any) {
        setError(err.message || "Lỗi hệ thống khi tải chi tiết bài kiểm tra.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
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

  // ─── TEACHER ATTEMPT REVIEW MODE ──────────────────────────────────
  if (selectedAttempt && userRole !== "Student" && exam) {
    const attempt = selectedAttempt;
    const questions = exam.questions || [];
    
    // Unique list of students who have attempts
    const studentsWithAttempts = Array.from(
      new Map(
        attempts
          .filter(att => att.studentCode)
          .map(att => [att.studentCode, { name: att.studentName, code: att.studentCode }])
      ).values()
    );

    // Current student's attempts sorted
    const currentStudentAttempts = attempts
      .filter(a => a.studentCode === attempt.studentCode)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    // Stats calculations
    const correctCount = attempt.answers ? attempt.answers.filter(a => a.isCorrect).length : 0;
    const totalQuestions = questions.length;
    const incorrectCount = attempt.answers ? attempt.answers.filter(a => !a.isCorrect && a.answerContent).length : 0;
    const unansweredCount = totalQuestions - correctCount - incorrectCount;

    // Load tab exits and logs from localStorage:
    const attemptId = attempt.id;
    const exitsKey = `tabExits_${attemptId}`;
    const logKey = `examLogs_${attemptId}`;
    
    let tabExitsCount = 0;
    let exitLogs: Array<{ type: string; time: string }> = [];
    
    if (typeof window !== "undefined") {
      tabExitsCount = Number(localStorage.getItem(exitsKey) || "0");
      try {
        const storedLogs = localStorage.getItem(logKey);
        if (storedLogs) {
          exitLogs = JSON.parse(storedLogs);
        }
      } catch {}
    }

    if (exitLogs.length === 0) {
      exitLogs = [
        { type: "start", time: attempt.startTime },
        ...(attempt.submitTime ? [{ type: "submit", time: attempt.submitTime }] : [])
      ];
    }

    // Helper to get option letter label
    const getOptionLabel = (q: any, content: string) => {
      if (!content) return "—";
      const index = q.questionAnswers.findIndex((opt: any) => opt.content.trim().toLowerCase() === content.trim().toLowerCase());
      return index >= 0 ? String.fromCharCode(65 + index) : content;
    };

    // Helper to get correct option letter labels
    const getCorrectOptionLabel = (q: any) => {
      const correctOpts = q.questionAnswers.filter((opt: any) => opt.isCorrect);
      if (correctOpts.length === 0) return "—";
      return correctOpts.map((opt: any) => {
        const index = q.questionAnswers.findIndex((o: any) => o.id === opt.id);
        return String.fromCharCode(65 + index);
      }).join(", ");
    };

    const isPassed = (attempt.score ?? 0) >= (exam.passingScore || 5);

    const handleAttemptChange = (attemptId: number) => {
      const att = attempts.find(a => a.id === attemptId);
      if (att) setSelectedAttempt(att);
    };

    const filteredStudents = studentsWithAttempts.filter(s =>
      s.name.toLowerCase().includes(studentSearchKeyword.toLowerCase()) ||
      s.code.toLowerCase().includes(studentSearchKeyword.toLowerCase())
    );

    return (
      <div className="fixed inset-0 z-[999999] bg-[#f0f2f5] dark:bg-gray-950 flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0 shadow-sm">
          {/* Left: Back button + Student Selection dropdown */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedAttempt(null)}
              className="p-2 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 bg-gray-50 dark:bg-gray-800 rounded-xl transition-colors shrink-0"
              title={t("exams.btnBack")}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>

            {/* Student Selector Combobox */}
            <div className="relative">
              <button
                onClick={() => setStudentDropdownOpen(!studentDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl text-sm font-bold text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 transition-colors"
              >
                <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px] font-bold">
                  {attempt.studentName.charAt(0).toUpperCase()}
                </span>
                <span>{attempt.studentName} ({attempt.studentCode})</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {studentDropdownOpen && (
                <>
                  {/* Backdrop overlay to close dropdown */}
                  <div className="fixed inset-0 z-40" onClick={() => setStudentDropdownOpen(false)} />
                  
                  {/* Dropdown list */}
                  <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl z-50 p-2 flex flex-col max-h-[300px]">
                    {/* Search box */}
                    <div className="px-2 py-1.5 shrink-0">
                      <input
                        type="text"
                        placeholder="Tìm học sinh..."
                        value={studentSearchKeyword}
                        onChange={(e) => setStudentSearchKeyword(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-white rounded-lg focus:border-brand-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Scrollable list */}
                    <div className="flex-1 overflow-y-auto space-y-0.5 custom-scrollbar">
                      {filteredStudents.map(s => {
                        const isCurrent = s.code === attempt.studentCode;
                        return (
                          <button
                            key={s.code}
                            onClick={() => {
                              const studentAttempts = attempts.filter(a => a.studentCode === s.code);
                              if (studentAttempts.length > 0) {
                                const latest = [...studentAttempts].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0];
                                setSelectedAttempt(latest);
                              }
                              setStudentSearchKeyword("");
                              setStudentDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between ${
                              isCurrent
                                ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                                : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                            }`}
                          >
                            <span className="truncate">{s.name}</span>
                            <span className="text-[10px] text-gray-400 shrink-0 font-bold ml-2">({s.code})</span>
                          </button>
                        );
                      })}
                      {filteredStudents.length === 0 && (
                        <p className="text-center text-xs text-gray-400 py-4">Không có học sinh</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>


          {/* Right: Toggle explanations switch + download button + Close */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-550 dark:text-gray-400">{t("exams.tabExplanation")}:</span>
              <button
                onClick={() => setShowExplanations(!showExplanations)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  showExplanations ? "bg-brand-500" : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    showExplanations ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Print button */}
            <button
              onClick={() => window.print()}
              className="p-2 text-gray-500 hover:text-brand-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl transition-colors"
              title="In bài thi"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.89 2.4 9.5 6.72 5.11M17.28 5.11l4.32 4.39-4.32 4.39M14 21l-4-18" />
              </svg>
            </button>

            {/* Download button */}
            <button
              onClick={handleDownload}
              className="p-2 text-gray-500 hover:text-brand-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl transition-colors"
              title={t("exams.downloadExam")}
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </button>

            {/* Close cross button */}
            <button
              onClick={() => setSelectedAttempt(null)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Split Main Content Container */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Pane: Question List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {questions.map((q, idx) => {
              const ans = attempt.answers?.find((a: any) => a.questionId === q.id);
              const studentAnswer = ans?.answerContent || "";
              const isCorrect = ans?.isCorrect;
              const isMultiple = q.questionType === 2;

              // Display mode
              const showStudentResult = examViewMode === "student";

              return (
                <div
                  key={q.id}
                  className={`p-6 bg-white dark:bg-gray-900 border rounded-2xl space-y-4 shadow-theme-xs transition-all duration-205 ${
                    !showStudentResult || !studentAnswer
                      ? "border-gray-200 dark:border-gray-800"
                      : isCorrect
                      ? "border-emerald-500/30 dark:border-emerald-500/20 bg-emerald-500/[0.02]"
                      : "border-red-500/30 dark:border-red-500/20 bg-red-50/30 dark:bg-red-950/5"
                  }`}
                >
                  {/* Question Status Header */}
                  <div className="flex items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      {t("exams.question")} {idx + 1}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-black border border-gray-200/55">
                        {q.point || 1} {t("exams.points")}
                      </span>
                    </h4>

                    {showStudentResult && (
                      <>
                        {!studentAnswer ? (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-550 font-bold uppercase border border-gray-200/20">
                            {t("exams.attemptUnanswered")}
                          </span>
                        ) : isCorrect ? (
                          <span className="inline-flex items-center gap-1 text-[9px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold uppercase border border-emerald-100">
                            {t("exams.statsCorrect")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] px-2.5 py-0.5 rounded-full bg-red-50 text-red-750 font-black uppercase border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50">
                            {t("exams.statsIncorrect")}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Question Content */}
                  <p className="text-sm font-bold text-gray-855 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {q.content}
                  </p>

                  {/* Choices review */}
                  {q.questionType === 3 ? (
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                        {showStudentResult ? t("exams.studentSelectYourAnswer") : t("exams.tabQuestions")}
                      </span>
                      <p className="text-sm bg-gray-50 dark:bg-gray-950 p-3.5 rounded-xl border border-gray-150 dark:border-gray-850 font-semibold whitespace-pre-line text-gray-800 dark:text-gray-200">
                        {showStudentResult ? (studentAnswer || <span className="italic text-gray-400">{t("exams.attemptUnanswered")}</span>) : "—"}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {q.questionAnswers.map((option: any, optIdx: number) => {
                        const optLabel = String.fromCharCode(65 + optIdx);
                        const isStudentSelect = showStudentResult && (isMultiple
                          ? studentAnswer.split(",").map((s: string) => s.trim().toLowerCase()).includes(option.content.toLowerCase())
                          : studentAnswer.toLowerCase() === option.content.toLowerCase());

                        const isCorrectOption = option.isCorrect;

                        // Styling logic
                        let borderStyle = "border-gray-200 dark:border-gray-805 hover:bg-gray-50/50";
                        let pillStyle = "bg-gray-55 dark:bg-gray-850 border-gray-200 dark:border-gray-700 text-gray-655 dark:text-gray-400";
                        let textStyle = "text-gray-800 dark:text-gray-200";
                        
                        if (showStudentResult) {
                          if (isStudentSelect) {
                            if (isCorrectOption) {
                              borderStyle = "border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/5";
                              pillStyle = "bg-emerald-500 border-emerald-500 text-white";
                              textStyle = "text-emerald-700 dark:text-emerald-400 font-bold";
                            } else {
                              borderStyle = "border-red-500 bg-red-50/60 dark:bg-red-950/20";
                              pillStyle = "bg-red-600 border-red-600 text-white";
                              textStyle = "text-red-700 dark:text-red-450 font-bold";
                            }
                          } else if (isCorrectOption) {
                            borderStyle = "border-emerald-500/50 bg-emerald-500/5";
                            pillStyle = "border-emerald-500/50 text-emerald-600 bg-emerald-500/10";
                          }
                        } else {
                          // Original paper view: outline correct option only
                          if (isCorrectOption) {
                            borderStyle = "border-emerald-500 bg-emerald-550/10 dark:bg-emerald-500/5";
                            pillStyle = "bg-emerald-500 border-emerald-500 text-white";
                          }
                        }

                        return (
                          <div
                            key={option.id}
                            className={`p-3.5 rounded-xl border flex items-center gap-3 transition-colors ${borderStyle}`}
                          >
                            <div className={`w-8 h-8 rounded-lg font-black text-xs flex items-center justify-center shrink-0 border ${pillStyle}`}>
                              {optLabel}
                            </div>
                            <span className={`text-sm font-semibold transition-colors ${textStyle}`}>
                              {option.content}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Explanation Box */}
                  {showExplanations && q.explanation && (
                    <div className="p-4 bg-blue-50/10 dark:bg-blue-950/10 rounded-xl border border-blue-100 dark:border-blue-900/35 text-xs text-gray-650 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      <p className="font-bold text-xs text-blue-500 uppercase tracking-wider mb-1.5">{t("exams.explanationTitle")}</p>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Pane: Stats Sidebar */}
          <div className="w-96 shrink-0 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-y-auto p-5 flex flex-col justify-between">
            <div className="space-y-5">
              
              {/* Attempt Selector */}
              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">{t("exams.selectAttempt")}</label>
                <select
                  value={attempt.id}
                  onChange={(e) => handleAttemptChange(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                >
                  {currentStudentAttempts.map((att, idx) => (
                    <option key={att.id} value={att.id}>
                      {t("exams.attemptLabel")} {idx + 1} {att.id === currentStudentAttempts[currentStudentAttempts.length - 1].id ? ` - ${t("exams.latestLabel")}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tab Switch: Kết quả / Lịch sử */}
              <div className="flex bg-gray-55 dark:bg-gray-950 p-1 rounded-xl border border-gray-200/50 dark:border-gray-800/50">
                <button
                  onClick={() => setReviewTab("result")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    reviewTab === "result"
                      ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                      : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                  }`}
                >
                  {t("exams.tabResult")}
                </button>
                <button
                  onClick={() => setReviewTab("history")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    reviewTab === "history"
                      ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                      : "text-gray-500 hover:text-gray-850 dark:hover:text-gray-200"
                  }`}
                >
                  {t("exams.tabHistory")}
                </button>
              </div>

              {reviewTab === "result" ? (
                <div className="space-y-5">
                  {/* Score Box */}
                  <div className="p-5 bg-brand-500 text-white rounded-2xl shadow-theme-xs text-center space-y-1.5">
                    <span className="text-[10px] uppercase font-black tracking-widest block opacity-70">{t("exams.gradeScore")}</span>
                    <span className="text-4xl font-black tracking-tight block">
                      {attempt.score ?? 0} / {exam.totalScore || 10}đ
                    </span>
                    <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/20">
                      {isPassed ? t("exams.attemptPassed") : t("exams.attemptFailed")}
                    </span>
                  </div>

                  {/* Metrics List */}
                  <div className="space-y-2.5 text-xs border-b border-gray-100 dark:border-gray-800 pb-4">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {t("exams.gradeDuration")}
                      </span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {attempt.submitTime ? (
                          `${Math.round((new Date(attempt.submitTime).getTime() - new Date(attempt.startTime).getTime()) / 60000)} phút`
                        ) : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {t("exams.gradeSubmitTime")}
                      </span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {attempt.submitTime ? new Date(attempt.submitTime).toLocaleString("vi-VN") : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        {t("exams.attemptCorrectCount")}
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {correctCount} / {totalQuestions}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5 text-red-500" />
                        {t("exams.attemptIncorrectCount")}
                      </span>
                      <span className="font-bold text-red-600 dark:text-red-400">
                        {incorrectCount} / {totalQuestions}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-gray-400" />
                        {t("exams.attemptUnanswered")}
                      </span>
                      <span className="font-semibold text-gray-655 dark:text-gray-300">
                        {unansweredCount} / {totalQuestions}
                      </span>
                    </div>
                  </div>

                  {/* Compact Answer Sheet Table */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">{t("exams.answerSheet")}</span>
                    <div className="border border-gray-150 dark:border-gray-800 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto custom-scrollbar">
                      <table className="w-full text-[11px] text-left">
                        <thead className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 font-bold uppercase">
                          <tr>
                            <th className="px-3 py-2 text-center w-12">{t("exams.colQuestionNo")}</th>
                            <th className="px-3 py-2 text-center">{t("exams.colSelected")}</th>
                            <th className="px-3 py-2 text-center">{t("exams.colCorrect")}</th>
                            <th className="px-3 py-2 text-center w-14">{t("exams.colPoints")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {questions.map((q, idx) => {
                            const ans = attempt.answers?.find((a: any) => a.questionId === q.id);
                            const studentAns = ans?.answerContent || "";
                            const isAnsCorrect = ans?.isCorrect;
                            const studentLabel = getOptionLabel(q, studentAns);
                            const correctLabel = getCorrectOptionLabel(q);

                            return (
                              <tr key={q.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                                <td className="px-3 py-2 text-center font-bold text-gray-500">{idx + 1}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`px-1.5 py-0.5 rounded-md font-bold ${
                                    !studentAns
                                      ? "text-gray-400"
                                      : isAnsCorrect
                                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                      : "bg-red-50 text-red-750 dark:bg-red-500/10 dark:text-red-400"
                                  }`}>
                                    {studentLabel}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center font-bold text-emerald-600 dark:text-emerald-400">{correctLabel}</td>
                                <td className="px-3 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">
                                  {isAnsCorrect ? (q.point || 1) : 0}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                // History tab contents (Timeline)
                <div className="space-y-4">
                  {/* Overview panel */}
                  <div className="p-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-150 dark:border-white/[0.05] rounded-xl space-y-2 text-xs">
                    <p className="font-bold text-gray-800 dark:text-gray-200">{t("exams.processOverview")}</p>
                    <div className="space-y-1.5 text-gray-550 dark:text-gray-400 font-semibold">
                      <div className="flex justify-between">
                        <span>{t("exams.tabExitsCountLabel")}:</span>
                        <span className="font-bold text-red-650 dark:text-red-400">{tabExitsCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("exams.editsCountLabel")}:</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300 font-bold">0</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mt-2">{t("exams.attemptHistory")}</span>

                  {/* Timeline */}
                  <div className="relative border-l border-gray-100 dark:border-gray-800 pl-4 space-y-4 py-2 ml-1">
                    {exitLogs.map((log, idx) => {
                      let title = "";
                      let dotColor = "bg-gray-400";
                      let bgColor = "bg-gray-100 dark:bg-gray-800";

                      if (log.type === "start") {
                        title = t("exams.startExam");
                        dotColor = "bg-emerald-500";
                        bgColor = "bg-emerald-100 dark:bg-emerald-950/40";
                      } else if (log.type === "exit") {
                        title = t("exams.exitScreen");
                        dotColor = "bg-red-500";
                        bgColor = "bg-red-100 dark:bg-red-950/40";
                      } else if (log.type === "enter") {
                        title = t("exams.enterScreen");
                        dotColor = "bg-blue-500";
                        bgColor = "bg-blue-100 dark:bg-blue-950/40";
                      } else if (log.type === "submit") {
                        title = t("exams.btnSubmit");
                        dotColor = "bg-brand-500";
                        bgColor = "bg-brand-100 dark:bg-brand-950/40";
                      }

                      return (
                        <div key={idx} className="relative">
                          <span className={`absolute -left-6.5 top-1 flex h-4 w-4 items-center justify-center rounded-full ${bgColor}`}>
                            <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                          </span>
                          <span className="block text-[10px] font-bold text-gray-800 dark:text-gray-200">
                            {title}
                          </span>
                          <span className="text-[9px] text-gray-400 block mt-0.5">
                            {log.time ? new Date(log.time).toLocaleString("vi-VN") : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── TEACHER / ADMIN LOADING ────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        <span className="ml-3 text-sm">{t("exams.loadingDetails")}</span>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="p-6 text-center text-error-500 font-semibold bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl">
        {error || t("exams.examNotFound")}
        <div className="mt-4">
          <button
            onClick={() => router.push("/exams")}
            className="px-4 py-2 text-sm text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors"
          >
            {t("exams.btnBack")}
          </button>
        </div>
      </div>
    );
  }


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
              <span>{t("exams.breadcrumbHomework")}</span>
              <span>/</span>
              <span className="text-gray-500">{exam.className || t("exams.unlimited")}</span>
            </div>
            <h2 className="text-xl font-bold text-gray-950 dark:text-white mt-0.5">
              {exam.title}
            </h2>
          </div>
        </div>

        {/* Tab Items on the right matching mockup */}
        <div className="flex items-center bg-gray-100/70 dark:bg-gray-800/40 p-1.5 rounded-xl border border-gray-200/50 dark:border-gray-800/50 self-start sm:self-auto overflow-x-auto max-w-full custom-scrollbar">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === "overview"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            {t("exams.tabOverview")}
          </button>
          <button
            onClick={() => setActiveTab("grades")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === "grades"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            {t("exams.tabGrades")}
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === "stats"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            {t("exams.tabStats")}
          </button>
          <button
            onClick={() => setActiveTab("questions")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === "questions"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            {t("exams.tabQuestions")}
          </button>
          <button
            onClick={() => setActiveTab("explanation")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === "explanation"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            {t("exams.tabExplanation")}
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
                  {t("exams.totalQuestions", { count: exam.questions?.length || 0 })}
                </span>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-theme-xs rounded-lg h-9"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  {t("exams.downloadExam")}
                </button>
              </div>

              {/* Questions list */}
              {(!exam.questions || exam.questions.length === 0) ? (
                <div className="p-8 text-center text-gray-500 bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl">
                  {t("exams.noExamsFound")}
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
                        {t("exams.question")} {idx + 1}
                      </span>
                      <div className="flex gap-2">
                        <span className="text-[11px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full dark:bg-gray-800 dark:text-gray-400">
                          {q.code}
                        </span>
                        <span className="text-[11px] font-bold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full dark:bg-brand-500/10">
                          {q.point || 1} {t("exams.points")}
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
                  {t("exams.noExamsFound")}
                </div>
              ) : (
                exam.questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-6 bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl shadow-theme-xs space-y-4"
                  >
                    <h3 className="text-sm font-bold text-brand-500">{t("exams.tabExplanation")} {t("exams.question")} {idx + 1}</h3>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white font-medium">{q.content}</p>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 text-sm">
                      <p className="font-bold text-xs text-gray-500 uppercase tracking-wider mb-1.5">{t("exams.explanationTitle")}</p>
                      {q.explanation || t("exams.noDescription")}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "grades" && (
            <div className="space-y-4">
              {attempts.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl">
                  {t("exams.noExamsFound")}
                </div>
              ) : (
                <div className="bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl shadow-theme-xs overflow-hidden">
                  <div className="p-5 border-b border-gray-100 dark:border-white/[0.05] flex justify-between items-center bg-gray-50/10">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t("exams.tabGrades")}</h3>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                      {t("exams.gradeAttempts")}: {attempts.length}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/[0.05] text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-4 text-center w-12">#</th>
                          <th className="px-6 py-4">{t("registration.colStudentCode")}</th>
                          <th className="px-6 py-4">{t("registration.colStudent")}</th>
                          <th className="px-6 py-4">{t("exams.gradeSubmitTime")}</th>
                          <th className="px-6 py-4 text-center">{t("exams.attemptCorrectCount")}</th>
                          <th className="px-6 py-4 text-center">{t("exams.gradeScore")}</th>
                          <th className="px-6 py-4 text-center">{t("registration.colStatus")}</th>
                          <th className="px-6 py-4 text-center w-28">{t("questionCategory.colActions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                        {attempts.map((att, idx) => {
                          const correctCount = att.answers ? att.answers.filter(a => a.isCorrect).length : 0;
                          const totalQuestions = exam.questions?.length || 0;
                          const isPassed = att.score !== null && att.score !== undefined && att.score >= (exam.passingScore || 5);

                          return (
                            <tr key={att.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                              <td className="px-6 py-4 text-center text-gray-500 font-medium">{idx + 1}</td>
                              <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{att.studentCode || "—"}</td>
                              <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{att.studentName}</td>
                              <td className="px-6 py-4 text-gray-500 text-xs">
                                {att.submitTime ? new Date(att.submitTime).toLocaleString("vi-VN") : "—"}
                              </td>
                              <td className="px-6 py-4 text-center font-bold text-gray-700 dark:text-gray-300">
                                {att.status === 2 ? `${correctCount} / ${totalQuestions}` : "—"}
                              </td>
                              <td className="px-6 py-4 text-center">
                                {att.status === 2 ? (
                                  <span className={`text-base font-black tracking-tight ${isPassed ? "text-emerald-500" : "text-rose-500"}`}>
                                    {att.score}đ
                                  </span>
                                ) : (
                                  <span className="text-gray-400 font-medium">—</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-center">
                                {att.status === 2 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                                    {t("exams.statusCompleted")}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                                    {t("exams.statusNotStarted")}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-center">
                                {att.status === 2 ? (
                                  <button
                                    onClick={() => setSelectedAttempt(att)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 dark:text-brand-400 dark:bg-brand-500/10 dark:hover:bg-brand-500/20 rounded-lg transition-all"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    {t("exams.gradeDetail")}
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-400 italic">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "overview" && (
            <div className="p-6 bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl space-y-4 text-sm text-gray-700 dark:text-gray-300">
              <h3 className="text-base font-bold text-gray-950 dark:text-white">{t("exams.tabOverview")}</h3>
              <p>{exam.description || t("exams.noDescription")}</p>
              <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-white/[0.05] pt-4">
                <div>
                  <p className="text-gray-400">{t("exams.settingsDuration")}:</p>
                  <p className="font-bold text-gray-800 dark:text-white">{exam.duration ? t("exams.minutesPlural", { count: exam.duration }) : t("exams.unlimited")}</p>
                </div>
                <div>
                  <p className="text-gray-400">{t("exams.settingsPassingScore")}:</p>
                  <p className="font-bold text-gray-800 dark:text-white">{exam.passingScore} / {exam.totalScore}đ</p>
                </div>
                <div>
                  <p className="text-gray-400">Xáo trộn câu hỏi:</p>
                  <p className="font-bold text-gray-800 dark:text-white">{exam.shuffleQuestion ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-gray-400">Cho xem đáp án:</p>
                  <p className="font-bold text-gray-800 dark:text-white">{exam.showAnswerAfter ? "Yes" : "No"}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "stats" && (
            <div className="space-y-6">
              {attempts.filter(a => a.status === 2).length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl">
                  {t("exams.noExamsFound")}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-5 bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl shadow-theme-xs bg-gray-50/10">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{t("exams.tabStats")}</h3>
                    <p className="text-xs text-gray-500">{t("exams.statsSubtitle")}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {exam.questions?.map((q, idx) => {
                      const submittedAttempts = attempts.filter(a => a.status === 2);
                      const totalSubmits = submittedAttempts.length;
                      
                      let correctCount = 0;
                      let answeredCount = 0;

                      submittedAttempts.forEach(att => {
                        const ans = att.answers?.find(a => a.questionId === q.id);
                        if (ans && ans.answerContent) {
                          answeredCount++;
                          if (ans.isCorrect) {
                            correctCount++;
                          }
                        }
                      });

                      const correctRate = totalSubmits > 0 ? Math.round((correctCount / totalSubmits) * 100) : 0;
                      const skipCount = totalSubmits - answeredCount;

                      return (
                        <div key={q.id} className="p-5 bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl shadow-theme-xs space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-brand-500">{t("exams.question")} {idx + 1}</span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10">
                              {t("exams.statsCorrect")}: {correctCount} / {totalSubmits} ({correctRate}%)
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold line-clamp-2 leading-relaxed">
                            {q.content}
                          </p>
                          <div className="space-y-1.5 pt-1.5">
                            <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                              <span>{t("exams.statsCorrectRatio")}</span>
                              <span>{correctRate}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
                              <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${correctRate}%` }} />
                              <div className="bg-rose-500 h-full transition-all duration-300" style={{ width: `${100 - correctRate - (totalSubmits > 0 ? (skipCount / totalSubmits) * 100 : 0)}%` }} />
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-400 pt-0.5">
                              <span className="text-emerald-500 font-semibold">{t("exams.statsCorrect")}: {correctCount}</span>
                              <span className="text-rose-500 font-semibold">{t("exams.statsIncorrect")}: {totalSubmits - correctCount - skipCount}</span>
                              <span className="text-gray-400 font-semibold">{t("exams.statsSkip")}: {skipCount}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Sidebar: Exam Parameters Info box */}
        <div className="space-y-6">
          <div className="p-5 bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl shadow-theme-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              {t("exams.settingsTitle")}
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-gray-50 dark:border-white/[0.02]">
                <span className="text-gray-500">{t("exams.settingsExamCode")}:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{exam.code}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-gray-50 dark:border-white/[0.02]">
                <span className="text-gray-500">{t("exams.settingsClass")}:</span>
                <span className="font-semibold text-brand-500">{exam.className || "None"}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-gray-50 dark:border-white/[0.02]">
                <span className="text-gray-500">{t("exams.settingsDuration")}:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {exam.duration ? t("exams.minutesPlural", { count: exam.duration }) : t("exams.unlimited")}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-gray-50 dark:border-white/[0.02]">
                <span className="text-gray-500">{t("exams.settingsTotalScore")}:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{exam.totalScore || 10}đ</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-gray-50 dark:border-white/[0.02]">
                <span className="text-gray-500">{t("exams.settingsPassingScore")}:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{exam.passingScore || 5}đ</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-gray-50 dark:border-white/[0.02]">
                <span className="text-gray-500">{t("exams.settingsAttempts")}:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{exam.maxAttempts || 1}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-gray-500">{t("exams.settingsStatus")}:</span>
                <span
                  className={`px-2 py-0.5 font-bold rounded-full text-[10px] ${
                    exam.status === 1
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400"
                  }`}
                >
                  {exam.status === 1 ? t("exams.statusPublished") : t("exams.statusDraft")}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => router.push(`/exams/edit/${exam.id}`)}
                className="w-full py-2.5 text-center text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors shadow-theme-xs"
              >
                {t("exams.editExam")}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { examApi, ExamItem, ExamAttemptDto } from "@/services/exam.api";
import { StudentExamTaker } from "@/components/exam/StudentExamTaker";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { CheckCircle, XCircle, Clock, Eye, AlertTriangle, BarChart, Award } from "lucide-react";

import { questionPassageApi, QuestionPassageItem } from "@/services/questionPassage.api";
import { ENV } from "@/config/env";
import { Volume2, BookOpen } from "lucide-react";
import { FillBlankNotesGroup } from "@/components/exam/FillBlankNotesGroup";
import {
  isSameAsPassageContent,
  segmentQuestions,
  getFillBlankCorrectAnswer,
} from "@/utils/examQuestionFormat";

const getFileUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }
  return `${ENV.API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

const getSkillBadgeClass = (skillType?: number) => {
  switch (skillType) {
    case 1: return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800";
    case 2: return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
    case 3: return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
    case 4: return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800";
    default: return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
  }
};

const getSkillName = (skillType?: number, t?: any) => {
  switch (skillType) {
    case 1: return t ? t("exams.skillListening") : "Listening";
    case 2: return t ? t("exams.skillReading") : "Reading";
    case 3: return t ? t("exams.skillSpeaking") : "Speaking";
    case 4: return t ? t("exams.skillWriting") : "Writing";
    default: return "Skill";
  }
};

const isManualGradedExam = (examData?: ExamItem | null) => {
  if (!examData) return false;
  const typeStr = String(examData.type || "").toLowerCase();
  const titleStr = String(examData.title || "").toLowerCase();
  return (
    typeStr.includes("speaking") ||
    typeStr.includes("writing") ||
    titleStr.includes("speaking") ||
    titleStr.includes("writing") ||
    examData.questions?.some((q: any) => q.skillType === 3 || q.skillType === 4 || q.questionType === 3)
  );
};

const isWritingExam = (examData?: ExamItem | null, passages?: QuestionPassageItem[]) => {
  if (!examData) return false;
  const titleStr = String(examData.title || "").toLowerCase();
  if (titleStr.includes("writing") || titleStr.includes("viết")) return true;
  if (examData.questions?.some((q: any) => q.skillType === 4 || q.questionType === 3)) return true;
  if (passages && examData.questions) {
    const writingPassageIds = new Set(passages.filter((p: any) => p.skillType === 4).map((p: any) => p.id));
    if (examData.questions.some((q: any) => writingPassageIds.has(q.passageId))) return true;
  }
  return false;
};

const checkIfPendingGrading = (att?: ExamAttemptDto | null, examData?: ExamItem | null) => {
  if (!att || !examData) return false;
  return isManualGradedExam(examData) && (att.score === null || att.score === undefined || att.score === 0);
};

export default function ExamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const id = params?.id ? Number(params.id) : null;

  const [exam, setExam] = useState<ExamItem | null>(null);
  const [attempts, setAttempts] = useState<ExamAttemptDto[]>([]);
  const [questionPassages, setQuestionPassages] = useState<QuestionPassageItem[]>([]);
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

  // Grading states
  const [gradingAttemptId, setGradingAttemptId] = useState<number | null>(null);
  const [gradeScoreInput, setGradeScoreInput] = useState<string>("");
  const [gradeCommentInput, setGradeCommentInput] = useState<string>("");
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);

  // Read role first
  useEffect(() => {
    setUserRole(localStorage.getItem("role") || "");
  }, []);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
  };

  // Sync grading input when selectedAttempt changes
  useEffect(() => {
    if (selectedAttempt) {
      setGradeScoreInput(selectedAttempt.score !== null && selectedAttempt.score !== undefined ? String(selectedAttempt.score) : "");
      const existingComment = selectedAttempt.teacherComment || selectedAttempt.answers?.find(a => a.teacherComment)?.teacherComment || "";
      setGradeCommentInput(existingComment);
    }
  }, [selectedAttempt]);

  const handleSaveGrade = async (attemptId: number, scoreVal: number, commentVal: string) => {
    if (!id) return;
    setIsSubmittingGrade(true);
    try {
      const res = await examApi.gradeAttempt(attemptId, {
        score: scoreVal,
        teacherComment: commentVal,
      });
      if (res.success && res.data) {
        showToast(t("exams.gradeSuccess"), "success");
        if (selectedAttempt && selectedAttempt.id === attemptId) {
          setSelectedAttempt(res.data);
        }
        const r = await examApi.getAttemptsByExam(id);
        if (r.success && r.data) {
          setAttempts(r.data);
        }
        setGradingAttemptId(null);
      } else {
        showToast(res.message || t("exams.formErrorSaveFailed"), "error");
      }
    } catch (err: any) {
      showToast(err.message || t("exams.formErrorSaveSystem"), "error");
    } finally {
      setIsSubmittingGrade(false);
    }
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

    if (q.questionType === 1 || q.questionType === 4 || q.questionType === 6 || q.questionType === 7) {
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

  const handleBack = () => {
    const role = (localStorage.getItem("role") || "").toLowerCase();
    if (role === "teacher") {
      router.push("/teaching-exams");
    } else if (role === "student") {
      router.push("/my-exams");
    } else {
      router.push("/exams");
    }
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
        const [examRes, attemptsRes, passRes] = await Promise.all([
          examApi.getById(id!),
          examApi.getAttemptsByExam(id!),
          questionPassageApi.getAll(1, 1000)
        ]);

        if (passRes.success && passRes.data) {
          setQuestionPassages(passRes.data.items || []);
        }

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

  // Group exam questions by QuestionPassage
  const groupedPassageMap = React.useMemo(() => {
    if (!exam || !exam.questions || exam.questions.length === 0) {
      return { passageGroups: [], standaloneQs: [] };
    }

    const passageMap = new Map<number, { passage: QuestionPassageItem; questions: any[] }>();
    const assignedQIds = new Set<number>();

    questionPassages.forEach((p) => {
      const matchingQs = (exam?.questions || []).filter(
        (q) => q.passageId === p.id || (q.code && p.code && q.code.startsWith(p.code))
      );

      if (matchingQs.length > 0) {
        passageMap.set(p.id, { passage: p, questions: matchingQs });
        matchingQs.forEach((q) => assignedQIds.add(q.id));
      }
    });

    const standaloneQs = (exam?.questions || []).filter((q) => !assignedQIds.has(q.id));

    return {
      passageGroups: Array.from(passageMap.values()),
      standaloneQs,
    };
  }, [exam, questionPassages]);

  // ─── Role not yet determined — render nothing to avoid flash ───
  if (userRole === null) return null;

  // ─── STUDENT VIEW ───────────────────────────────────────────────
  if (userRole === "Student") {
    return (
      <div className="space-y-6">
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-[99999] flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl shadow-2xl border border-white/10 dark:border-black/5 animate-bounce">
            {toastType === "success" ? (
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
            )}
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        )}
        <StudentExamTaker
          examId={id!}
          onBack={handleBack}
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

    // Load tab exits and logs (try attempt DTO from backend first, fallback to localStorage):
    let tabExitsCount = attempt.tabExitsCount || 0;
    let exitLogs: Array<{ type: string; time: string }> = [];
    
    if (attempt.log) {
      try {
        exitLogs = JSON.parse(attempt.log);
      } catch {}
    }

    if (exitLogs.length === 0 && typeof window !== "undefined") {
      const attemptId = attempt.id;
      const exitsKey = `tabExits_${attemptId}`;
      const logKey = `examLogs_${attemptId}`;
      tabExitsCount = Number(localStorage.getItem(exitsKey) || "0") || tabExitsCount;
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
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-[9999999] flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl shadow-2xl border border-white/10 dark:border-black/5 animate-bounce">
            {toastType === "success" ? (
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
            )}
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        )}
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
            {(() => {
              // Display mode
              const showStudentResult = examViewMode === "student";

              // Renders one question segment (either a grouped Fill-in-Blank notes block, or a
              // regular single-question card) — shared by both the passage-grouped and the
              // standalone-question sections below, so a passage's completion task is only ever
              // grouped with its own sibling questions, never with an unrelated adjacent passage.
              const renderSegment = (seg: ReturnType<typeof segmentQuestions>[number]) => {
                if (seg.kind === "notes") {
                  return (
                    <FillBlankNotesGroup
                      key={`notes-${seg.questions[0].id}`}
                      questions={seg.questions}
                      getGlobalIndex={(qq) => questions.findIndex((x) => x.id === qq.id)}
                      mode={showStudentResult ? "review" : "answerKey"}
                      getBlankValue={(qq) => {
                        if (!showStudentResult) {
                          return { text: getFillBlankCorrectAnswer(qq) };
                        }
                        const a = attempt.answers?.find((ans: any) => ans.questionId === qq.id);
                        const studentAnswer = a?.answerContent || "";
                        return { text: studentAnswer, isAnswered: !!studentAnswer, isCorrect: a?.isCorrect };
                      }}
                    />
                  );
                }
                const q = seg.question;
                const idx = questions.findIndex((x) => x.id === q.id);
                const ans = attempt.answers?.find((a: any) => a.questionId === q.id);
                const studentAnswer = ans?.answerContent || "";
                const isCorrect = ans?.isCorrect;
                const isMultiple = q.questionType === 2;

                return (
                  <React.Fragment key={q.id}>
                {q.instruction && (
                  <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl">
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 whitespace-pre-wrap leading-relaxed">
                      {q.instruction}
                    </p>
                  </div>
                )}
                <div
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
                        ) : isManualGradedExam(exam) ? (
                          checkIfPendingGrading(attempt, exam) ? (
                            <span className="inline-flex items-center gap-1 text-[9px] px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 font-bold uppercase border border-amber-200 dark:border-amber-900/50">
                              <Clock className="w-3 h-3 text-amber-500" />
                              {t("exams.statusPendingGrade")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold uppercase border border-emerald-100">
                              <CheckCircle className="w-3 h-3 text-emerald-500" />
                              {t("exams.statusGraded", { defaultValue: "Đã chấm điểm" })}
                            </span>
                          )
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
                  {showStudentResult && studentAnswer && (studentAnswer.startsWith("/uploads") || studentAnswer.startsWith("http") || studentAnswer.startsWith("data:") || studentAnswer.includes(".mp3") || studentAnswer.includes(".wav") || studentAnswer.includes(".m4a")) ? (
                    <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40 space-y-2">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 font-sans">
                        <Volume2 className="w-4 h-4 text-amber-600" /> {t("exams.audioFileAttached")}
                      </span>
                      <audio controls src={getFileUrl(studentAnswer)} className="w-full h-9 rounded-lg" />
                    </div>
                  ) : (q.questionType === 3 || q.questionType === 6) ? (
                    <div className="space-y-1.5">
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
                </React.Fragment>
                );
              };

              return (
                <>
                  {groupedPassageMap.passageGroups.map(({ passage, questions: groupQs }) => (
                    <div
                      key={passage.id}
                      className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-theme-xs space-y-4"
                    >
                      {/* Passage Top Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2.5">
                          <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full uppercase tracking-wider ${getSkillBadgeClass(passage.skillType)}`}>
                            {getSkillName(passage.skillType, t)}
                          </span>
                          {passage.categoryName && (
                            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                              {passage.categoryName}
                            </span>
                          )}
                          <span className="text-xs font-mono font-bold text-gray-400">
                            ({passage.code})
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-gray-500">
                          ({t("exams.questionsCount", { count: groupQs.length })})
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {passage.title}
                      </h3>

                      {/* Reading Passage Text */}
                      {passage.content && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-950/40 rounded-xl text-gray-800 dark:text-gray-200 text-sm font-serif leading-relaxed whitespace-pre-wrap border border-gray-150 dark:border-gray-800">
                          <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 font-sans">
                            📖 {t("exams.passageContentTitle").toUpperCase()}
                          </span>
                          {passage.content}
                        </div>
                      )}

                      {/* Listening Audio File */}
                      {passage.audioUrl && (
                        <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50 space-y-2">
                          <span className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5 font-sans">
                            <Volume2 className="w-4 h-4" /> {t("exams.listeningAudioTitle")}
                          </span>
                          <audio controls src={getFileUrl(passage.audioUrl)} className="w-full h-9 rounded-lg" />
                        </div>
                      )}

                      {/* Questions under this passage */}
                      <div className="space-y-4 pt-2">
                        {segmentQuestions(groupQs).map(renderSegment)}
                      </div>
                    </div>
                  ))}

                  {/* Standalone questions (no passage) */}
                  {groupedPassageMap.standaloneQs.length > 0 && (
                    <div className="space-y-4">
                      {segmentQuestions(groupedPassageMap.standaloneQs).map(renderSegment)}
                    </div>
                  )}
                </>
              );
            })()}
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
                  {(() => {
                    const isPending = checkIfPendingGrading(attempt, exam);
                    return (
                      <div className={`p-5 text-white rounded-2xl shadow-theme-xs text-center space-y-1.5 ${
                        isPending ? "bg-amber-500" : "bg-brand-500"
                      }`}>
                        <span className="text-[10px] uppercase font-black tracking-widest block opacity-70">{t("exams.gradeScore")}</span>
                        <span className="text-3xl font-black tracking-tight block">
                          {isPending ? `-- / ${exam.totalScore || 10}đ` : `${attempt.score ?? 0} / ${exam.totalScore || 10}đ`}
                        </span>
                        <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/20 uppercase tracking-wider">
                          {isPending
                            ? `⏳ ${t("exams.statusPendingGrade")}`
                            : isPassed
                            ? t("exams.attemptPassed")
                            : t("exams.attemptFailed")}
                        </span>
                      </div>
                    );
                  })()}

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
                    {!isManualGradedExam(exam) && (
                      <>
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
                      </>
                    )}
                  </div>

                  {/* Grading & Feedback Form in Review Modal (manual-graded exams only) */}
                  {isManualGradedExam(exam) && (
                  <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-3">
                    <h5 className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 font-sans">
                      <Award className="w-4 h-4 text-amber-600" />
                      {t("exams.gradeAndFeedbackTitle")}
                    </h5>

                    {(() => {
                      const maxScore = exam.totalScore || 10;
                      const parsedScore = parseFloat(gradeScoreInput);
                      const isScoreEmpty = !gradeScoreInput || gradeScoreInput.trim() === "";
                      const isScoreNaN = !isScoreEmpty && isNaN(parsedScore);
                      const isScoreMinError = !isScoreEmpty && !isScoreNaN && parsedScore < 0;
                      const isScoreMaxError = !isScoreEmpty && !isScoreNaN && parsedScore > maxScore;
                      const isScoreInvalid = isScoreNaN || isScoreMinError || isScoreMaxError;

                      let scoreErrorText = "";
                      if (isScoreNaN) {
                        scoreErrorText = t("exams.toastScoreInvalid") || "Vui lòng nhập điểm hợp lệ!";
                      } else if (isScoreMinError) {
                        scoreErrorText = t("exams.toastScoreMinError") || "Điểm không được nhỏ hơn 0!";
                      } else if (isScoreMaxError) {
                        scoreErrorText = t("exams.toastScoreMaxError", { max: maxScore }) || `Điểm không được vượt quá ${maxScore}đ!`;
                      }

                      return (
                        <>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                              {t("exams.gradeScore")} (0 - {maxScore}đ)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              min={0}
                              max={maxScore}
                              value={gradeScoreInput}
                              onChange={(e) => setGradeScoreInput(e.target.value)}
                              placeholder="Nhập điểm..."
                              className={`w-full px-3 py-2 text-xs font-bold border rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-hidden ${
                                isScoreInvalid
                                  ? "border-rose-500 ring-1 ring-rose-500 focus:border-rose-500"
                                  : "border-gray-200 dark:border-gray-700 focus:border-brand-500"
                              }`}
                            />
                            {isScoreInvalid && (
                              <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1 animate-pulse">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                {scoreErrorText}
                              </p>
                            )}
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                              {t("exams.teacherCommentTitle")}
                            </label>
                            <textarea
                              rows={3}
                              value={gradeCommentInput}
                              onChange={(e) => setGradeCommentInput(e.target.value)}
                              placeholder={t("exams.gradeCommentPlaceholder")}
                              className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg text-gray-800 dark:text-white focus:border-brand-500 focus:outline-hidden"
                            />
                          </div>

                          <button
                            type="button"
                            disabled={isSubmittingGrade || isScoreEmpty || isScoreInvalid}
                            onClick={() => {
                              if (isScoreEmpty) {
                                showToast(t("exams.toastScoreEmpty") || "Vui lòng nhập điểm!", "error");
                                return;
                              }
                              if (isScoreInvalid) {
                                showToast(scoreErrorText, "error");
                                return;
                              }
                              handleSaveGrade(attempt.id, parsedScore, gradeCommentInput);
                            }}
                            className="w-full py-2 px-3 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            {isSubmittingGrade ? "Đang lưu..." : t("exams.btnSaveGrade")}
                          </button>
                        </>
                      );
                    })()}
                  </div>
                  )}

                  {/* Compact Answer Sheet Table (Hidden for Writing exams) */}
                  {!isWritingExam(exam, questionPassages) && (
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
                              const isAudioAns = studentAns && (studentAns.startsWith("/uploads") || studentAns.startsWith("http") || studentAns.startsWith("data:") || studentAns.includes(".mp3") || studentAns.includes(".wav") || studentAns.includes(".m4a"));
                              const studentLabel = isAudioAns ? "🔊 File ghi âm" : getOptionLabel(q, studentAns);
                              const correctLabel = getCorrectOptionLabel(q);

                              return (
                                <tr key={q.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                                  <td className="px-3 py-2 text-center font-bold text-gray-500">{idx + 1}</td>
                                  <td className="px-3 py-2 text-center">
                                    {isAudioAns ? (
                                      <div className="flex flex-col items-center gap-1 py-0.5">
                                        <audio controls src={getFileUrl(studentAns)} className="h-7 w-36 rounded" />
                                      </div>
                                    ) : (
                                      <span className={`px-1.5 py-0.5 rounded-md font-bold ${
                                        !studentAns
                                          ? "text-gray-400"
                                          : isAnsCorrect
                                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                          : "bg-red-50 text-red-750 dark:bg-red-500/10 dark:text-red-400"
                                      }`}>
                                        {studentLabel}
                                      </span>
                                    )}
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
                  )}
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
            onClick={handleBack}
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
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[9999999] flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl shadow-2xl border border-white/10 dark:border-black/5 animate-bounce">
          {toastType === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
          )}
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}
      {/* Top Header Navigation (Breadcrumb + Title) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/[0.05]">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 rounded-xl transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-950 dark:text-white">
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
          {!isManualGradedExam(exam) && (
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
          )}
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
                <div className="space-y-6">
                  {/* Render Question Passages Groups */}
                  {groupedPassageMap.passageGroups.map(({ passage, questions: groupQs }) => (
                    <div
                      key={passage.id}
                      className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-theme-xs space-y-4"
                    >
                      {/* Passage Top Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2.5">
                          <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full uppercase tracking-wider ${getSkillBadgeClass(passage.skillType)}`}>
                            {getSkillName(passage.skillType, t)}
                          </span>
                          {passage.categoryName && (
                            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                              {passage.categoryName}
                            </span>
                          )}
                          <span className="text-xs font-mono font-bold text-gray-400">
                            ({passage.code})
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-gray-500">
                          ({t("exams.questionsCount", { count: groupQs.length })})
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {passage.title}
                      </h3>

                      {/* Reading Passage Text */}
                      {passage.content && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-950/40 rounded-xl text-gray-800 dark:text-gray-200 text-sm font-serif leading-relaxed whitespace-pre-wrap border border-gray-150 dark:border-gray-800">
                          <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 font-sans">
                            📖 {t("exams.passageContentTitle").toUpperCase()}
                          </span>
                          {passage.content}
                        </div>
                      )}

                      {/* Listening Audio File */}
                      {passage.audioUrl && (
                        <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50 space-y-2">
                          <span className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5 font-sans">
                            <Volume2 className="w-4 h-4" /> {t("exams.listeningAudioTitle")}
                          </span>
                          <audio controls src={getFileUrl(passage.audioUrl)} className="w-full h-9 rounded-lg" />
                        </div>
                      )}

                      {/* Questions inside this passage */}
                      <div className="space-y-4 pt-2">
                        {segmentQuestions(groupQs).map((seg) => {
                          if (seg.kind === "notes") {
                            return (
                              <FillBlankNotesGroup
                                key={`notes-${seg.questions[0].id}`}
                                questions={seg.questions}
                                getGlobalIndex={(qq) => (exam.questions || []).findIndex((x) => x.id === qq.id)}
                                mode="answerKey"
                                getBlankValue={(qq) => ({ text: getFillBlankCorrectAnswer(qq) })}
                              />
                            );
                          }
                          const q = seg.question;
                          const globalIdx = (exam.questions || []).findIndex((x) => x.id === q.id);
                          // Writing-task questions typically just repeat the passage prompt verbatim
                          // (no separate question text, no answer options) — showing a near-empty
                          // "Câu X" card under the passage adds nothing, so skip it entirely.
                          if (isSameAsPassageContent(q.content, passage.content) && !q.mediaUrl && (!q.questionAnswers || q.questionAnswers.length === 0)) {
                            return null;
                          }
                          return (
                            <div key={q.id} className="p-4 bg-gray-50/60 dark:bg-gray-950/30 rounded-xl border border-gray-200/80 dark:border-gray-800 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-brand-500">
                                  {t("exams.question")} {globalIdx + 1}
                                </span>
                                <div className="flex gap-2">
                                  <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full dark:bg-gray-800 dark:text-gray-400">
                                    {q.code}
                                  </span>
                                  <span className="text-[11px] font-bold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full dark:bg-brand-500/10">
                                    {q.point || 1} {t("exams.points")}
                                  </span>
                                </div>
                              </div>

                              {!isSameAsPassageContent(q.content, passage.content) && (
                                <p className="text-sm font-semibold text-gray-900 dark:text-white leading-relaxed">
                                  {q.content}
                                </p>
                              )}

                              {/* Question Audio File (if mediaUrl is present on question) */}
                              {q.mediaUrl && (
                                <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50 space-y-1.5 my-2">
                                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5 font-sans">
                                    <Volume2 className="w-3.5 h-3.5" /> {t("exams.questionAudioTitle")}
                                  </span>
                                  <audio controls src={getFileUrl(q.mediaUrl)} className="w-full h-8 rounded-lg" />
                                </div>
                              )}

                              <div className="grid grid-cols-1 gap-2.5 pt-1">
                                {q.questionAnswers.map((ans: any, oIdx: number) => {
                                  const optionLetters = ["A", "B", "C", "D", "E", "F"];
                                  const letter = optionLetters[oIdx] || String(oIdx + 1);
                                  const isCorrect = ans.isCorrect;

                                  return (
                                    <div
                                      key={ans.id}
                                      className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                                        isCorrect
                                          ? "bg-emerald-500/5 border-emerald-500 dark:border-emerald-600"
                                          : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                                      }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <span
                                          className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border ${
                                            isCorrect
                                              ? "bg-emerald-500 text-white border-emerald-500"
                                              : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                                          }`}
                                        >
                                          {letter}
                                        </span>
                                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                          {ans.content}
                                        </span>
                                      </div>

                                      {isCorrect && (
                                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                          </svg>
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Render Standalone Questions if any */}
                  {segmentQuestions(groupedPassageMap.standaloneQs).map((seg) => {
                    if (seg.kind === "notes") {
                      return (
                        <FillBlankNotesGroup
                          key={`notes-${seg.questions[0].id}`}
                          questions={seg.questions}
                          getGlobalIndex={(qq) => (exam.questions || []).findIndex((x) => x.id === qq.id)}
                          mode="answerKey"
                          getBlankValue={(qq) => ({ text: getFillBlankCorrectAnswer(qq) })}
                        />
                      );
                    }
                    const q = seg.question;
                    const globalIdx = (exam.questions || []).findIndex((x) => x.id === q.id);
                    return (
                      <div
                        key={q.id}
                        className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-theme-xs space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-brand-500">
                            {t("exams.question")} {globalIdx + 1}
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

                        <p className="text-base font-semibold text-gray-900 dark:text-white leading-relaxed">
                          {q.content}
                        </p>

                        <div className="grid grid-cols-1 gap-3 pt-2">
                          {q.questionAnswers.map((ans: any, oIdx: number) => {
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
                    );
                  })}
                </div>
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
                                  checkIfPendingGrading(att, exam) ? (
                                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono">
                                      {t("exams.statusPendingGrade")}
                                    </span>
                                  ) : (
                                    <span className={`text-base font-black tracking-tight ${isPassed ? "text-emerald-500" : "text-rose-500"}`}>
                                      {att.score}đ
                                    </span>
                                  )
                                ) : (
                                  <span className="text-gray-400 font-medium">—</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-center">
                                {att.status === 2 ? (
                                  checkIfPendingGrading(att, exam) ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
                                      ⏳ {t("exams.statusPendingGrade")}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                                      {t("exams.statusCompleted")}
                                    </span>
                                  )
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
                  <p className="text-gray-400">{t("exams.settingsShowAnswer")}:</p>
                  <p className="font-bold text-gray-800 dark:text-white">{exam.showAnswerAfter ? t("exams.yesLabel") : t("exams.noLabel")}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "stats" && !isManualGradedExam(exam) && (
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

            <PermissionGuard requiredPermission="Exam.Edit">
              <div className="pt-2">
                <button
                  onClick={() => router.push(`/exams/edit/${exam.id}`)}
                  className="w-full py-2.5 text-center text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors shadow-theme-xs"
                >
                  {t("exams.editExam")}
                </button>
              </div>
            </PermissionGuard>

          </div>
        </div>
      </div>
    </div>
  );
}

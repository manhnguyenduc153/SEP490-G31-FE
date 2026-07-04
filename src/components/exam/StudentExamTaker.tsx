"use client";

import React, { useState, useEffect, useRef } from "react";
import { examApi, ExamItem, ExamAttemptDto, ExamAnswerDto } from "@/services/exam.api";
import {
  Rocket,
  Clock,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  HelpCircle,
  ArrowLeft,
  ChevronRight,
  History,
  Award,
  AlertTriangle,
  FileText
} from "lucide-react";

interface StudentExamTakerProps {
  examId: number;
  onBack: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

// ConfirmModal type
type ConfirmModalState = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
};

export function StudentExamTaker({ examId, onBack, showToast }: StudentExamTakerProps) {
  const [exam, setExam] = useState<ExamItem | null>(null);
  const [attempts, setAttempts] = useState<ExamAttemptDto[]>([]);
  const [currentAttempt, setCurrentAttempt] = useState<ExamAttemptDto | null>(null);
  const [selectedPastAttempt, setSelectedPastAttempt] = useState<ExamAttemptDto | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewState, setViewState] = useState<"ready" | "taking" | "result">("ready");
  
  // Right side panel tab for Results view
  const [resultTab, setResultTab] = useState<"result" | "history">("result");

  // State of chosen answers for the active attempt
  const [chosenAnswers, setChosenAnswers] = useState<Record<number, string>>({});

  // Timer states
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const [elapsedTime, setElapsedTime] = useState<number>(0); // in seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Custom confirm modal
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });
  const closeConfirm = () => setConfirmModal(prev => ({ ...prev, open: false }));

  // Load Exam Details and Past Attempts
  const loadExamAndAttempts = async () => {
    setIsLoading(true);
    try {
      const [examRes, attemptsRes] = await Promise.all([
        examApi.getStudentExamDetail(examId),
        examApi.getStudentAttempts(examId)
      ]);

      if (examRes.success && examRes.data) {
        setExam(examRes.data);
      }
      if (attemptsRes.success && attemptsRes.data) {
        setAttempts(attemptsRes.data);
        
        // If there's an in-progress attempt, we should automatically resume it
        const inProgress = attemptsRes.data.find(a => a.status === 1);
        if (inProgress) {
          setCurrentAttempt(inProgress);
          // Restore student's chosen answers from saved answers if any
          const savedAnswers: Record<number, string> = {};
          inProgress.answers.forEach(ans => {
            if (ans.answerContent) {
              savedAnswers[ans.questionId] = ans.answerContent;
            }
          });
          setChosenAnswers(savedAnswers);
          setViewState("taking");
          startTimer(inProgress.startTime, examRes.data.duration);
        }
      }
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi tải thông tin bài kiểm tra", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExamAndAttempts();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examId]);

  // Timer Logic
  const startTimer = (startTimeStr: string, durationMinutes: number | null | undefined) => {
    if (timerRef.current) clearInterval(timerRef.current);

    const startTime = new Date(startTimeStr).getTime();
    
    timerRef.current = setInterval(() => {
      const now = new Date().getTime();
      const diffSeconds = Math.floor((now - startTime) / 1000);
      setElapsedTime(diffSeconds);

      if (durationMinutes) {
        const totalDurationSeconds = durationMinutes * 60;
        const remaining = totalDurationSeconds - diffSeconds;
        if (remaining <= 0) {
          setTimeLeft(0);
          clearInterval(timerRef.current!);
          // Auto submit when time runs out
          handleAutoSubmit();
        } else {
          setTimeLeft(remaining);
        }
      }
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Start Test Button Handler
  const handleStartTest = async () => {
    if (!exam) return;
    setIsLoading(true);
    try {
      const res = await examApi.startAttempt(exam.id);
      if (res.success && res.data) {
        setCurrentAttempt(res.data);
        setChosenAnswers({});
        setViewState("taking");
        startTimer(res.data.startTime, exam.duration);
        showToast("Bắt đầu làm bài kiểm tra!", "success");
      } else {
        showToast(res.message || "Không thể bắt đầu làm bài", "error");
      }
    } catch {
      showToast("Lỗi hệ thống", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Selection Handler for choices
  const handleSelectChoice = (questionId: number, choiceContent: string, isMultiple: boolean) => {
    if (viewState !== "taking") return;

    setChosenAnswers(prev => {
      const current = prev[questionId] || "";
      if (!isMultiple) {
        return { ...prev, [questionId]: choiceContent };
      } else {
        // Multiple choices - comma separated
        const list = current ? current.split(",").map(s => s.trim()) : [];
        if (list.includes(choiceContent)) {
          const updated = list.filter(item => item !== choiceContent);
          return { ...prev, [questionId]: updated.join(",") };
        } else {
          const updated = [...list, choiceContent];
          return { ...prev, [questionId]: updated.join(",") };
        }
      }
    });
  };

  const handleTextAnswerChange = (questionId: number, text: string) => {
    setChosenAnswers(prev => ({
      ...prev,
      [questionId]: text
    }));
  };

  const handleAutoSubmit = () => {
    showToast("Hết thời gian làm bài! Đang tự động nộp bài...", "error");
    submitTest(true);
  };

  const submitTest = async (isAuto = false) => {
    if (!exam || !currentAttempt) return;
    setIsSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const answersPayload = Object.entries(chosenAnswers).map(([qId, content]) => ({
        questionId: Number(qId),
        answerContent: content
      }));

      const payload = {
        attemptId: currentAttempt.id,
        answers: answersPayload
      };

      const res = await examApi.submitAttempt(exam.id, payload);
      if (res.success && res.data) {
        setSelectedPastAttempt(res.data);
        setViewState("result");
        if (!isAuto) showToast("Nộp bài thi thành công!", "success");
        // Reload history list
        examApi.getStudentAttempts(exam.id).then(r => {
          if (r.success && r.data) setAttempts(r.data);
        });
      } else {
        showToast(res.message || "Lỗi khi nộp bài", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Lỗi hệ thống khi nộp bài", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitClick = () => {
    if (!exam) return;
    const unansweredCount = exam.questions ? exam.questions.filter(q => !chosenAnswers[q.id]).length : 0;
    const msg = unansweredCount > 0
      ? `Bạn còn ${unansweredCount} câu hỏi chưa trả lời. Bạn vẫn muốn nộp bài?`
      : "Bạn có chắc chắn muốn nộp bài?";

    setConfirmModal({
      open: true,
      title: "Xác nhận nộp bài",
      message: msg,
      confirmLabel: "Nộp bài",
      cancelLabel: "Tiếp tục làm",
      onConfirm: () => { closeConfirm(); submitTest(); }
    });
  };

  const handleLeaveClick = () => {
    setConfirmModal({
      open: true,
      title: "Rời khỏi phòng thi",
      message: "Tiến độ bài làm của bạn sẽ được lưu lại. Bạn có chắc chắn muốn rời khỏi phòng thi?",
      confirmLabel: "Rời khỏi",
      cancelLabel: "Ở lại",
      onConfirm: () => {
        closeConfirm();
        if (timerRef.current) clearInterval(timerRef.current);
        loadExamAndAttempts();
        setViewState("ready");
      }
    });
  };

  // Scroll helper
  const scrollToQuestion = (questionId: number) => {
    const el = document.getElementById(`question-${questionId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Statistics calculation for attempts
  const getAttemptStats = (attempt: ExamAttemptDto) => {
    if (!exam || !exam.questions) return { correctCount: 0, incorrectCount: 0, unattemptedCount: 0 };
    
    let correctCount = 0;
    let incorrectCount = 0;
    
    exam.questions.forEach(q => {
      const ans = attempt.answers.find(a => a.questionId === q.id);
      if (!ans || !ans.answerContent) {
        // no answer
      } else {
        if (ans.isCorrect) {
          correctCount++;
        } else {
          incorrectCount++;
        }
      }
    });

    const unattemptedCount = exam.questions.length - correctCount - incorrectCount;
    return { correctCount, incorrectCount, unattemptedCount };
  };

  // Render view helpers
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500 text-sm">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent mb-3"></div>
        Đang tải đề thi...
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-gray-150 text-gray-500">
        Bài kiểm tra không khả dụng.
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 1: Ready Screen ("Bài tập đã sẵn sàng")
  // ──────────────────────────────────────────────────────────────────────────
  if (viewState === "ready") {
    // Check if limits are hit
    const reachedLimit = exam.maxAttempts !== null && exam.maxAttempts !== undefined && attempts.filter(a => a.status === 2).length >= exam.maxAttempts;
    
    return (
      <div className="space-y-6">
        {/* Back header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-gray-600 hover:text-brand-500 hover:bg-gray-50 rounded-lg transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại danh sách
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main summary card */}
          <div className="lg:col-span-2 p-6 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl flex flex-col items-center text-center py-10 shadow-theme-xs">
            <div className="w-18 h-18 rounded-full bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-500 mb-5 animate-bounce">
              <Rocket className="w-9 h-9" />
            </div>

            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
              {exam.title}
            </h2>
            <p className="text-xs text-gray-550 dark:text-gray-400 mt-2 max-w-md">
              {exam.description || "Không có mô tả cho bài kiểm tra này. Vui lòng xem kỹ thời gian làm bài và các câu hỏi trước khi bắt đầu."}
            </p>

            {/* Timings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg mt-8 border-t border-gray-100 dark:border-gray-800 pt-6 text-left">
              <div className="space-y-1 bg-gray-50/50 dark:bg-gray-950/20 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Bắt đầu</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                  {exam.startTime ? new Date(exam.startTime).toLocaleString("vi-VN") : "Bất kỳ lúc nào"}
                </span>
              </div>
              <div className="space-y-1 bg-gray-50/50 dark:bg-gray-950/20 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Hạn chót</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                  {exam.endTime ? new Date(exam.endTime).toLocaleString("vi-VN") : "Không có"}
                </span>
              </div>
              <div className="space-y-1 bg-gray-50/50 dark:bg-gray-950/20 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Thời gian</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                  {exam.duration ? `${exam.duration} phút` : "Tự do"}
                </span>
              </div>
            </div>

            {/* Test action */}
            <div className="mt-8 w-full max-w-md">
              {reachedLimit ? (
                <div className="p-4 bg-amber-50 border border-amber-250 text-amber-800 text-sm font-semibold rounded-xl text-center">
                  Bạn đã làm đủ tối đa {exam.maxAttempts} lượt làm bài cho phép.
                </div>
              ) : (
                <button
                  onClick={handleStartTest}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-md shadow-brand-500/20 transition-all active:scale-[0.98]"
                >
                  Bắt đầu làm bài
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Right sidebar: Lịch sử làm bài */}
          <div className="p-5 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl space-y-4 shadow-theme-xs">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-50 dark:border-gray-800/80 pb-3">
              <History className="w-4 h-4 text-brand-500" />
              Lịch sử làm bài ({attempts.filter(a => a.status === 2).length})
            </h3>

            {attempts.filter(a => a.status === 2).length === 0 ? (
              <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                <Award className="w-8 h-8 text-gray-350 mx-auto mb-2" />
                <p className="text-xs text-gray-400 font-medium">Bạn chưa thực hiện lượt làm bài nào.</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                {attempts.filter(a => a.status === 2).map((att, idx) => (
                  <div
                    key={att.id}
                    onClick={() => {
                      setSelectedPastAttempt(att);
                      setViewState("result");
                    }}
                    className="p-3 bg-gray-50/50 hover:bg-brand-50/30 dark:bg-gray-950/20 border border-gray-150 dark:border-gray-850 hover:border-brand-300 rounded-xl flex items-center justify-between cursor-pointer transition-colors shadow-theme-xs group"
                  >
                    <div>
                      <p className="text-xs font-bold text-gray-800 dark:text-white group-hover:text-brand-500 transition-colors">
                        Lượt làm bài #{idx + 1}
                      </p>
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        {att.submitTime ? new Date(att.submitTime).toLocaleString("vi-VN") : ""}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-brand-650 dark:text-brand-400">
                        {att.score || 0}/{exam.totalScore || 10}
                      </span>
                      <span className="block text-[8px] text-gray-400 uppercase font-black tracking-wider">Điểm</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 2: Active Test Screen (Taking Test)
  // ──────────────────────────────────────────────────────────────────────────
  if (viewState === "taking" && currentAttempt) {
    const questions = exam.questions || [];
    const answeredCount = Object.keys(chosenAnswers).filter(k => chosenAnswers[Number(k)]).length;
    const isLowTime = exam.duration && timeLeft > 0 && timeLeft <= 60;

    return (
      <>
        {/* ── Full-screen exam overlay ─────────────────────────────────── */}
        <div className="fixed inset-0 z-[9999] bg-[#f0f2f5] dark:bg-gray-950 flex flex-col overflow-hidden">

          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold leading-none">{exam.className || "Bài kiểm tra"}</p>
                <h2 className="text-sm font-extrabold text-gray-900 dark:text-white leading-tight">{exam.title}</h2>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-base tabular-nums transition-colors ${
              isLowTime ? "bg-rose-500 text-white animate-pulse" : "bg-brand-500 text-white"
            }`}>
              <Clock className="w-4 h-4 shrink-0" />
              {exam.duration ? formatTime(timeLeft) : formatTime(elapsedTime)}
            </div>
          </div>

          {/* Body: questions left + panel right */}
          <div className="flex flex-1 overflow-hidden">

            {/* Left: scrollable question list */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {questions.map((q, idx) => {
                const chosenValue = chosenAnswers[q.id] || "";
                const isMultiple = q.questionType === 2;

                return (
                  <div
                    key={q.id}
                    id={`question-${q.id}`}
                    className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm space-y-4 scroll-mt-6"
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
                      <h4 className="text-sm font-bold text-brand-600 dark:text-brand-400 flex items-center gap-2">
                        Câu {idx + 1}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/20 text-brand-600 font-black border border-brand-100 dark:border-brand-900/30">
                          {q.point || 1} điểm
                        </span>
                      </h4>
                      {isMultiple && (
                        <span className="text-[9px] px-2 py-0.5 rounded bg-purple-50 text-purple-600 font-bold border border-purple-100">
                          Chọn nhiều đáp án
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-gray-850 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                      {q.content}
                    </p>

                    {q.questionType === 3 ? (
                      <div className="space-y-1.5 mt-3">
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Câu trả lời của bạn</label>
                        <textarea
                          value={chosenValue}
                          onChange={(e) => handleTextAnswerChange(q.id, e.target.value)}
                          placeholder="Nhập câu trả lời của bạn vào đây..."
                          rows={4}
                          className="w-full rounded-xl border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        {q.questionAnswers.map((option, optIdx) => {
                          const optLabel = String.fromCharCode(65 + optIdx);
                          const isSelected = isMultiple
                            ? chosenValue.split(",").map(s => s.trim()).includes(option.content)
                            : chosenValue === option.content;

                          return (
                            <div
                              key={option.id}
                              onClick={() => handleSelectChoice(q.id, option.content, isMultiple)}
                              className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-all duration-200 select-none ${
                                isSelected
                                  ? "bg-brand-50 border-brand-500 dark:bg-brand-950/20 dark:border-brand-500 ring-2 ring-brand-500/10"
                                  : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 hover:border-brand-300"
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg font-black text-xs flex items-center justify-center shrink-0 border transition-colors ${
                                isSelected ? "bg-brand-500 text-white border-brand-500" : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600"
                              }`}>
                                {optLabel}
                              </div>
                              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-tight">{option.content}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {/* spacer */}
              <div className="h-10" />
            </div>

            {/* Right: sticky panel */}
            <div className="w-72 xl:w-80 shrink-0 overflow-y-auto border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
              
              {/* Phiếu trả lời */}
              <div className="p-5 space-y-4 flex-1">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Phiếu trả lời</h3>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-900/30">
                    {answeredCount} / {questions.length}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q, idx) => {
                    const isAnswered = !!chosenAnswers[q.id];
                    return (
                      <button
                        key={q.id}
                        onClick={() => scrollToQuestion(q.id)}
                        title={`Câu ${idx + 1}`}
                        className={`h-9 w-full rounded-xl font-black text-xs border transition-all ${
                          isAnswered
                            ? "bg-brand-500 border-brand-500 text-white shadow-sm"
                            : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand-400"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                {/* Unanswered warning */}
                {answeredCount < questions.length && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span className="text-amber-700 dark:text-amber-400 font-semibold">{questions.length - answeredCount} câu chưa trả lời</span>
                  </div>
                )}
              </div>

              {/* Bottom action buttons */}
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleLeaveClick}
                  className="py-3 text-xs font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Rời khỏi
                </button>
                <button
                  type="button"
                  onClick={handleSubmitClick}
                  disabled={isSubmitting}
                  className="py-3 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-sm shadow-brand-500/20 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Đang nộp..." : "Nộp bài"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Confirm Modal */}
        {confirmModal.open && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeConfirm} />
            <div className="relative z-10 w-full max-w-sm mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Modal header */}
              <div className="px-6 pt-6 pb-4">
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white">{confirmModal.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">{confirmModal.message}</p>
              </div>
              {/* Modal actions */}
              <div className="flex items-center gap-3 px-6 pb-6">
                <button
                  onClick={closeConfirm}
                  className="flex-1 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  {confirmModal.cancelLabel || "Hủy"}
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-sm shadow-brand-500/20 transition-colors"
                >
                  {confirmModal.confirmLabel || "Xác nhận"}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 3: Results Review Screen
  // ──────────────────────────────────────────────────────────────────────────
  if (viewState === "result" && selectedPastAttempt) {
    const attempt = selectedPastAttempt;
    const questions = exam.questions || [];
    const stats = getAttemptStats(attempt);
    
    // Check if answers are allowed to be shown
    const canShowAnswers = exam.showAnswerAfter;

    return (
      <div className="space-y-6">
        {/* Back header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <button
            onClick={() => {
              setSelectedPastAttempt(null);
              setViewState("ready");
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-gray-600 hover:text-brand-500 hover:bg-gray-50 rounded-lg transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Lịch sử làm bài
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Side: Question Review */}
          <div className="lg:col-span-8 space-y-6">
            {questions.map((q, idx) => {
              const attemptAns = attempt.answers.find(a => a.questionId === q.id);
              const studentAnswer = attemptAns?.answerContent || "";
              const isCorrect = attemptAns?.isCorrect;
              const questionPoints = q.point || 1;
              const isMultiple = q.questionType === 2;

              return (
                <div
                  key={q.id}
                  className={`p-6 bg-white dark:bg-gray-900 border rounded-2xl shadow-theme-xs space-y-4 ${
                    !studentAnswer
                      ? "border-gray-200 dark:border-gray-800"
                      : isCorrect
                      ? "border-emerald-250 dark:border-emerald-500/20"
                      : "border-rose-205 dark:border-rose-500/20"
                  }`}
                >
                  {/* Status header */}
                  <div className="flex items-center justify-between gap-3 border-b border-gray-50 pb-3">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      Câu {idx + 1}
                      <span className="text-[10px] px-2 py-0.5 rounded bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-black">
                        {questionPoints} điểm
                      </span>
                    </h4>

                    {/* Correctness label */}
                    {!studentAnswer ? (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-bold uppercase">
                        Chưa trả lời
                      </span>
                    ) : isCorrect ? (
                      <span className="inline-flex items-center gap-1 text-[9px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold uppercase">
                        <CheckCircle className="w-3 h-3" />
                        Đúng
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 font-bold uppercase">
                        <XCircle className="w-3 h-3" />
                        Sai
                      </span>
                    )}
                  </div>

                  {/* Question Content */}
                  <p className="text-sm font-bold text-gray-850 dark:text-gray-250 leading-relaxed whitespace-pre-wrap">
                    {q.content}
                  </p>

                  {/* Options review */}
                  {q.questionType === 3 ? (
                    // Written response text
                    <div className="space-y-1 mt-3">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Bài làm của bạn</span>
                      <p className="text-sm bg-gray-50 dark:bg-gray-950 p-3 rounded-xl border border-gray-150 dark:border-gray-850 font-semibold whitespace-pre-line text-gray-800 dark:text-gray-200">
                        {studentAnswer || <span className="italic text-gray-400">Không có câu trả lời</span>}
                      </p>
                    </div>
                  ) : (
                    // Choice list review
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      {q.questionAnswers.map((option, optIdx) => {
                        const optLabel = String.fromCharCode(65 + optIdx);
                        const isStudentSelect = isMultiple
                          ? studentAnswer.split(",").map(s => s.trim()).includes(option.content)
                          : studentAnswer === option.content;

                        const isCorrectOption = option.isCorrect;

                        // Styling logic
                        let borderStyle = "border-gray-200 dark:border-gray-850 hover:bg-gray-50/50";
                        let pillStyle = "bg-gray-50 border-gray-200 text-gray-600";
                        
                        if (isStudentSelect) {
                          if (isCorrectOption) {
                            borderStyle = "border-emerald-500 bg-emerald-50/10";
                            pillStyle = "bg-emerald-500 border-emerald-500 text-white";
                          } else {
                            borderStyle = "border-rose-500 bg-rose-50/10";
                            pillStyle = "bg-rose-500 border-rose-500 text-white";
                          }
                        } else if (isCorrectOption && canShowAnswers) {
                          // Outline correct answers
                          borderStyle = "border-emerald-500/50 bg-emerald-50/5";
                          pillStyle = "border-emerald-500/50 text-emerald-600 bg-emerald-50/10";
                        }

                        return (
                          <div
                            key={option.id}
                            className={`p-4 rounded-xl border flex items-center gap-3 transition-colors ${borderStyle}`}
                          >
                            <div className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 border ${pillStyle}`}>
                              {optLabel}
                            </div>
                            <span className="text-sm font-semibold text-gray-850 dark:text-gray-200">
                              {option.content}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Explanation if correct answers are visible and explanation is set */}
                  {canShowAnswers && q.explanation && (
                    <div className="p-3 bg-blue-50/20 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-xl mt-4">
                      <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider block mb-1">Lời giải thích</span>
                      <p className="text-xs text-gray-650 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Side Review Panel */}
          <div className="lg:col-span-4 space-y-5 sticky top-24">
            
            {/* score card */}
            <div className="p-5 bg-brand-500 text-white rounded-2xl shadow-theme-xs text-center space-y-1">
              <span className="text-[10px] uppercase font-black tracking-widest block opacity-70">Điểm số</span>
              <span className="text-4xl font-black tracking-tight mt-1 block">
                {attempt.score || 0}/{exam.totalScore || 10}
              </span>
              <span className="text-[10px] font-bold block pt-2 opacity-80 border-t border-white/20 mt-3">
                {attempt.score !== null && attempt.score !== undefined && attempt.score >= (exam.passingScore || 5) ? "ĐÃ ĐẠT" : "CHƯA ĐẠT"}
              </span>
            </div>

            {/* Results metadata/tabs card */}
            <div className="p-5 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-theme-xs space-y-4">
              
              {/* Tab switcher */}
              <div className="flex border-b border-gray-100 dark:border-gray-850 pb-2">
                <button
                  onClick={() => setResultTab("result")}
                  className={`flex-1 pb-1.5 text-xs font-bold text-center border-b-2 transition-all ${
                    resultTab === "result"
                      ? "border-brand-500 text-brand-600 dark:text-brand-450"
                      : "border-transparent text-gray-400 hover:text-gray-500"
                  }`}
                >
                  Kết quả
                </button>
                <button
                  onClick={() => setResultTab("history")}
                  className={`flex-1 pb-1.5 text-xs font-bold text-center border-b-2 transition-all ${
                    resultTab === "history"
                      ? "border-brand-500 text-brand-600 dark:text-brand-450"
                      : "border-transparent text-gray-400 hover:text-gray-500"
                  }`}
                >
                  Lịch sử
                </button>
              </div>

              {resultTab === "result" ? (
                // Results tab contents
                <div className="space-y-4">
                  {/* Detailed Statistics list */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Nộp lúc
                      </span>
                      <span className="text-gray-800 dark:text-gray-200">
                        {attempt.submitTime ? new Date(attempt.submitTime).toLocaleString("vi-VN") : ""}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        Số câu đúng
                      </span>
                      <span className="text-emerald-600 font-bold">
                        {stats.correctCount} câu
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                        Số câu sai
                      </span>
                      <span className="text-rose-600 font-bold">
                        {stats.incorrectCount} câu
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                        Chưa làm
                      </span>
                      <span className="text-gray-650 dark:text-gray-300 font-bold">
                        {stats.unattemptedCount} câu
                      </span>
                    </div>
                  </div>

                  {/* Warning message if answers are hidden */}
                  {!canShowAnswers && (
                    <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl mt-3 text-left">
                      <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-850 dark:text-amber-450 leading-relaxed font-semibold">
                        Giáo viên đã tắt tính năng xem đáp án đúng/sai cho bài kiểm tra này.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // History tab contents (Attempt events timeline)
                <div className="space-y-4">
                  <div className="relative border-l border-gray-100 pl-4 space-y-4 py-2 ml-1">
                    <div className="relative">
                      <span className="absolute -left-6.5 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      <span className="block text-[10px] font-bold text-gray-800 dark:text-gray-200">
                        Bắt đầu làm bài
                      </span>
                      <span className="text-[9px] text-gray-400 block mt-0.5">
                        {new Date(attempt.startTime).toLocaleString("vi-VN")}
                      </span>
                    </div>

                    <div className="relative">
                      <span className="absolute -left-6.5 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-100">
                        <span className="h-2 w-2 rounded-full bg-brand-500" />
                      </span>
                      <span className="block text-[10px] font-bold text-gray-800 dark:text-gray-200">
                        Nộp bài
                      </span>
                      <span className="text-[9px] text-gray-400 block mt-0.5">
                        {attempt.submitTime ? new Date(attempt.submitTime).toLocaleString("vi-VN") : ""}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Close / Return Button */}
              <button
                onClick={() => {
                  setSelectedPastAttempt(null);
                  setViewState("ready");
                }}
                className="w-full text-center py-2.5 text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 dark:text-brand-400 dark:bg-brand-950/20 dark:hover:bg-brand-950/40 rounded-xl transition-colors block border border-brand-100 dark:border-brand-900/30"
              >
                Quay lại trang làm bài
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { examApi, ExamItem, ExamAttemptDto, ExamAnswerDto } from "@/services/exam.api";
import { questionPassageApi, QuestionPassageItem } from "@/services/questionPassage.api";
import { ENV } from "@/config/env";
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
  FileText,
  Volume2
} from "lucide-react";

const getFileUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }
  return `${ENV.API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

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
  const router = useRouter();
  const { t } = useTranslation();
  const [exam, setExam] = useState<ExamItem | null>(null);
  const [attempts, setAttempts] = useState<ExamAttemptDto[]>([]);
  const [currentAttempt, setCurrentAttempt] = useState<ExamAttemptDto | null>(null);
  const [selectedPastAttempt, setSelectedPastAttempt] = useState<ExamAttemptDto | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingAudioQId, setUploadingAudioQId] = useState<number | null>(null);
  const [viewState, setViewState] = useState<"ready" | "taking" | "result">("ready");

  const checkIfPendingGrading = (att?: ExamAttemptDto | null) => {
    if (!att || !exam) return false;
    const typeStr = String(exam.type || "").toLowerCase();
    const titleStr = String(exam.title || "").toLowerCase();
    const isManualGradedExam =
      typeStr.includes("speaking") ||
      typeStr.includes("writing") ||
      titleStr.includes("speaking") ||
      titleStr.includes("writing") ||
      exam.questions?.some((q) => q.skillType === 3 || q.skillType === 4 || q.questionType === 3);

    return isManualGradedExam && (att.score === null || att.score === undefined || att.score === 0);
  };
  
  // Right side panel tab for Results view
  const [resultTab, setResultTab] = useState<"result" | "history">("result");

  // State of chosen answers for the active attempt
  const [chosenAnswers, setChosenAnswers] = useState<Record<number, string>>({});

  // Timer states
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const [elapsedTime, setElapsedTime] = useState<number>(0); // in seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Refs to avoid stale closures in interval / auto submit
  const examRef = useRef(exam);
  const currentAttemptRef = useRef(currentAttempt);
  const chosenAnswersRef = useRef(chosenAnswers);

  useEffect(() => { examRef.current = exam; }, [exam]);
  useEffect(() => { currentAttemptRef.current = currentAttempt; }, [currentAttempt]);
  useEffect(() => { chosenAnswersRef.current = chosenAnswers; }, [chosenAnswers]);

  // Custom confirm modal
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });
  const closeConfirm = () => setConfirmModal(prev => ({ ...prev, open: false }));

  const [questionPassages, setQuestionPassages] = useState<QuestionPassageItem[]>([]);

  // Load Exam Details and Past Attempts
  const loadExamAndAttempts = async () => {
    setIsLoading(true);
    try {
      const [examRes, attemptsRes, passRes] = await Promise.all([
        examApi.getStudentExamDetail(examId),
        examApi.getStudentAttempts(examId),
        questionPassageApi.getAll(1, 1000)
      ]);

      if (examRes.success && examRes.data) {
        examRef.current = examRes.data;
        setExam(examRes.data);
      } else {
        showToast(
          examRes.message
            ? t(`backendMessages.${examRes.message}`, { defaultValue: examRes.message })
            : t("exams.toastLoadingError"),
          "error"
        );
        router.push("/exams");
        return;
      }
      if (passRes.success && passRes.data) {
        setQuestionPassages(passRes.data.items || []);
      }
      if (attemptsRes.success && attemptsRes.data) {
        setAttempts(attemptsRes.data);
        
        // If there's an in-progress attempt, we should automatically resume it
        const inProgress = attemptsRes.data.find(a => a.status === 1);
        if (inProgress) {
          currentAttemptRef.current = inProgress;
          setCurrentAttempt(inProgress);
          // Restore student's chosen answers from saved answers if any
          const savedAnswers: Record<number, string> = {};
          inProgress.answers.forEach(ans => {
            if (ans.answerContent) {
              savedAnswers[ans.questionId] = ans.answerContent;
            }
          });
          chosenAnswersRef.current = savedAnswers;
          setChosenAnswers(savedAnswers);
          setViewState("taking");
          startTimer(inProgress.startTime, examRes.data.duration);
        }
      }
    } catch (err) {
      console.error(err);
      showToast(t("exams.toastLoadingError"), "error");
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

  // Timer Logic
  const startTimer = (startTimeStr: string, durationMinutes: number | null | undefined) => {
    if (timerRef.current) clearInterval(timerRef.current);

    const startTime = new Date(startTimeStr).getTime();

    // Check initial remaining time
    if (durationMinutes) {
      const totalDurationSeconds = durationMinutes * 60;
      const initialDiffSeconds = Math.floor((new Date().getTime() - startTime) / 1000);
      const initialRemaining = totalDurationSeconds - initialDiffSeconds;
      if (initialRemaining <= 0) {
        setTimeLeft(0);
        handleAutoSubmit();
        return;
      }
      setTimeLeft(initialRemaining);
    }

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
        currentAttemptRef.current = res.data;
        setCurrentAttempt(res.data);
        chosenAnswersRef.current = {};
        setChosenAnswers({});
        setViewState("taking");
        startTimer(res.data.startTime, exam.duration);
        showToast(t("exams.startExam"), "success");
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("exams.toastStartAttemptError"), "error");
      }
    } catch {
      showToast(t("exams.toastSystemError"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Tab exit tracking hook
  useEffect(() => {
    if (viewState !== "taking" || !currentAttempt) return;

    const attemptId = currentAttempt.id;
    const logKey = `examLogs_${attemptId}`;
    const exitsKey = `tabExits_${attemptId}`;

    if (!localStorage.getItem(exitsKey)) {
      localStorage.setItem(exitsKey, "0");
    }

    let logs: Array<{ type: string; time: string }> = [];
    try {
      const existing = localStorage.getItem(logKey);
      if (existing) {
        logs = JSON.parse(existing);
      } else {
        logs = [{ type: "start", time: new Date().toISOString() }];
        localStorage.setItem(logKey, JSON.stringify(logs));
      }
    } catch {
      logs = [{ type: "start", time: new Date().toISOString() }];
      localStorage.setItem(logKey, JSON.stringify(logs));
    }

    const handleVisibilityChange = () => {
      const currentLogs = JSON.parse(localStorage.getItem(logKey) || "[]");
      const currentExits = Number(localStorage.getItem(exitsKey) || "0");

      if (document.visibilityState === "hidden") {
        const newExits = currentExits + 1;
        localStorage.setItem(exitsKey, String(newExits));
        
        currentLogs.push({ type: "exit", time: new Date().toISOString() });
        localStorage.setItem(logKey, JSON.stringify(currentLogs));
        console.log("Tab focus lost! Exit count:", newExits);
      } else {
        currentLogs.push({ type: "enter", time: new Date().toISOString() });
        localStorage.setItem(logKey, JSON.stringify(currentLogs));
        console.log("Tab focus restored!");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [viewState, currentAttempt]);


  // Selection Handler for choices
  const handleSelectChoice = (questionId: number, choiceContent: string, isMultiple: boolean) => {
    if (viewState !== "taking") return;

    setChosenAnswers(prev => {
      const current = prev[questionId] || "";
      let updatedAnswers: Record<number, string>;
      if (!isMultiple) {
        updatedAnswers = { ...prev, [questionId]: choiceContent };
      } else {
        // Multiple choices - comma separated
        const list = current ? current.split(",").map(s => s.trim()) : [];
        if (list.includes(choiceContent)) {
          const updated = list.filter(item => item !== choiceContent);
          updatedAnswers = { ...prev, [questionId]: updated.join(",") };
        } else {
          const updated = [...list, choiceContent];
          updatedAnswers = { ...prev, [questionId]: updated.join(",") };
        }
      }
      chosenAnswersRef.current = updatedAnswers;
      return updatedAnswers;
    });
  };

  const handleTextAnswerChange = (questionId: number, text: string) => {
    setChosenAnswers(prev => {
      const updatedAnswers = { ...prev, [questionId]: text };
      chosenAnswersRef.current = updatedAnswers;
      return updatedAnswers;
    });
  };

  const handleAutoSubmit = () => {
    showToast(t("exams.timesUpAlert"), "error");
    submitTest(true);
  };

  const submitTest = async (isAuto = false) => {
    const activeExam = examRef.current || exam;
    const activeAttempt = currentAttemptRef.current || currentAttempt;
    const activeAnswers = chosenAnswersRef.current || chosenAnswers;

    if (!activeExam || !activeAttempt) return;
    setIsSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const answersPayload = Object.entries(activeAnswers).map(([qId, content]) => ({
        questionId: Number(qId),
        answerContent: content
      }));

      const logKey = `examLogs_${activeAttempt.id}`;
      const exitsKey = `tabExits_${activeAttempt.id}`;
      
      const exitsCount = Number(localStorage.getItem(exitsKey) || "0");
      let logs = [];
      try {
        logs = JSON.parse(localStorage.getItem(logKey) || "[]");
      } catch {}
      logs.push({ type: "submit", time: new Date().toISOString() });
      localStorage.setItem(logKey, JSON.stringify(logs));

      const payload = {
        attemptId: activeAttempt.id,
        tabExitsCount: exitsCount,
        log: JSON.stringify(logs),
        answers: answersPayload
      };

      const res = await examApi.submitAttempt(activeExam.id, payload);
      if (res.success && res.data) {

        setSelectedPastAttempt(res.data);
        setViewState("result");
        if (!isAuto) showToast(t("exams.submitSuccess"), "success");
        // Reload history list
        examApi.getStudentAttempts(activeExam.id).then(r => {
          if (r.success && r.data) setAttempts(r.data);
        });
      } else {
        showToast(res.message || t("exams.toastSubmitError"), "error");
      }
    } catch (err) {
      console.error(err);
      showToast(t("exams.toastSubmitError"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitClick = () => {
    if (!exam) return;
    const unansweredCount = exam.questions ? exam.questions.filter(q => !chosenAnswers[q.id]).length : 0;
    const msg = unansweredCount > 0
      ? t("exams.confirmSubmitUnanswered", { count: unansweredCount })
      : t("exams.confirmSubmitPrompt");

    setConfirmModal({
      open: true,
      title: t("exams.confirmSubmit"),
      message: msg,
      confirmLabel: t("exams.btnSubmit"),
      cancelLabel: t("exams.btnBackToExam"),
      onConfirm: () => { closeConfirm(); submitTest(); }
    });
  };

  const handleLeaveClick = () => {
    setConfirmModal({
      open: true,
      title: t("exams.leaveExamRoom"),
      message: t("exams.leaveExamRoomConfirm"),
      confirmLabel: t("exams.btnLeave"),
      cancelLabel: t("exams.btnBackToExam"),
      onConfirm: async () => {
        closeConfirm();
        if (timerRef.current) clearInterval(timerRef.current);
        // Auto-submit whatever answers the student has so far
        if (exam && currentAttempt) {
          try {
            const answersPayload = Object.entries(chosenAnswers).map(([qId, content]) => ({
              questionId: Number(qId),
              answerContent: content
            }));
            const logKey = `examLogs_${currentAttempt.id}`;
            const exitsKey = `tabExits_${currentAttempt.id}`;
            const exitsCount = Number(localStorage.getItem(exitsKey) || "0");
            let logs: any[] = [];
            try { logs = JSON.parse(localStorage.getItem(logKey) || "[]"); } catch {}
            logs.push({ type: "submit", time: new Date().toISOString() });
            localStorage.setItem(logKey, JSON.stringify(logs));
            const payload = {
              attemptId: currentAttempt.id,
              tabExitsCount: exitsCount,
              log: JSON.stringify(logs),
              answers: answersPayload
            };
            const res = await examApi.submitAttempt(exam.id, payload);
            if (res.success && res.data) {
              setSelectedPastAttempt(res.data);
              // Reload attempts list before going back to ready
              try {
                const r = await examApi.getStudentAttempts(exam.id);
                if (r.success && r.data) setAttempts(r.data);
              } catch {}
            }
          } catch (err) {
            console.error("Auto-submit on leave failed:", err);
          }
        }
        setCurrentAttempt(null);
        setChosenAnswers({});
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
        {t("exams.loadingDetails")}
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-gray-150 text-gray-500">
        {t("exams.examNotAvailable")}
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
            {t("exams.btnBack")}
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
              {exam.description || t("exams.noDescription")}
            </p>

            {/* Timings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg mt-8 border-t border-gray-100 dark:border-gray-800 pt-6 text-left">
              <div className="space-y-1 bg-gray-50/50 dark:bg-gray-950/20 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">{t("exams.attemptStart")}</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                  {exam.startTime ? new Date(exam.startTime).toLocaleString("vi-VN") : t("exams.anyTime")}
                </span>
              </div>
              <div className="space-y-1 bg-gray-50/50 dark:bg-gray-950/20 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">{t("exams.deadline")}</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                  {exam.endTime ? new Date(exam.endTime).toLocaleString("vi-VN") : t("exams.noDeadline")}
                </span>
              </div>
              <div className="space-y-1 bg-gray-50/50 dark:bg-gray-950/20 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">{t("exams.duration")}</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                  {exam.duration ? t("exams.minutesPlural", { count: exam.duration }) : t("exams.unlimited")}
                </span>
              </div>
            </div>

            {/* Test action */}
            <div className="mt-8 w-full max-w-md">
              {reachedLimit ? (
                <div className="p-4 bg-amber-50 border border-amber-250 text-amber-800 text-sm font-semibold rounded-xl text-center">
                  {t("exams.attemptsLimitHit", { count: exam.maxAttempts })}
                </div>
              ) : (
                <button
                  onClick={handleStartTest}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-md shadow-brand-500/20 transition-all active:scale-[0.98]"
                >
                  {t("exams.startExam")}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Right sidebar: Lịch sử làm bài */}
          <div className="p-5 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl space-y-4 shadow-theme-xs">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-50 dark:border-gray-800/80 pb-3">
              <History className="w-4 h-4 text-brand-500" />
              {t("exams.attemptHistory")} ({attempts.filter(a => a.status === 2).length})
            </h3>

            {attempts.filter(a => a.status === 2).length === 0 ? (
              <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                <Award className="w-8 h-8 text-gray-350 mx-auto mb-2" />
                <p className="text-xs text-gray-400 font-medium">{t("exams.noExamsFound")}</p>
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
                        {t("exams.attemptHistory")} #{idx + 1}
                      </p>
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        {att.submitTime ? new Date(att.submitTime).toLocaleString("vi-VN") : ""}
                      </span>
                    </div>
                    <div className="text-right">
                      {checkIfPendingGrading(att) ? (
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                          {t("exams.statusPendingGrade")}
                        </span>
                      ) : (
                        <span className={`text-sm font-black ${(att.score ?? 0) >= (exam.passingScore || 5) ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {att.score ?? 0}/{exam.totalScore || 10}
                        </span>
                      )}
                      <span className="block text-[8px] text-gray-400 uppercase font-black tracking-wider">{t("exams.gradeScore")}</span>
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
        <div className="fixed inset-0 z-[999999] bg-[#f0f2f5] dark:bg-gray-950 flex flex-col overflow-hidden">

          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold leading-none">{exam.className || t("exams.breadcrumbHomework")}</p>
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
              {groupedPassageMap.passageGroups.map(({ passage, questions: groupQs }) => (
                <div
                  key={passage.id}
                  className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm space-y-4"
                >
                  {/* Passage Header */}
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                    <div>
                      <span className="text-xs font-mono font-bold text-gray-400">({passage.code})</span>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">{passage.title}</h3>
                    </div>
                    <span className="text-xs font-semibold text-gray-500">({t("exams.questionsCount", { count: groupQs.length })})</span>
                  </div>

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

                  {/* Group Questions */}
                  <div className="space-y-4 pt-2">
                    {groupQs.map((q) => {
                      const globalIdx = questions.findIndex((x) => x.id === q.id);
                      const chosenValue = chosenAnswers[q.id] || "";
                      const isMultiple = q.questionType === 2;
                      const isSpeakingQ = q.skillType === 3 || (passage as any)?.skillType === 3 ||
                        String(exam?.type || "").toLowerCase().includes("speaking") ||
                        String(exam?.title || "").toLowerCase().includes("speaking");

                      return (
                        <div
                          key={q.id}
                          id={`question-${q.id}`}
                          className="p-5 bg-gray-50/50 dark:bg-gray-950/30 border border-gray-200/80 dark:border-gray-800 rounded-xl shadow-xs space-y-3 scroll-mt-6"
                        >
                          <div className="flex items-start justify-between gap-3 border-b border-gray-200/60 dark:border-gray-800 pb-2.5">
                            <h4 className="text-sm font-bold text-brand-600 dark:text-brand-400 flex items-center gap-2">
                              {t("exams.question")} {globalIdx + 1}
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/20 text-brand-600 font-black border border-brand-100 dark:border-brand-900/30">
                                {q.point || 1} {t("exams.points")}
                              </span>
                            </h4>
                            {isMultiple && (
                              <span className="text-[9px] px-2 py-0.5 rounded bg-purple-50 text-purple-600 font-bold border border-purple-100">
                                {t("exams.multipleSelectLabel")}
                              </span>
                            )}
                          </div>

                          <p className="text-sm font-semibold text-gray-855 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                            {q.content}
                          </p>

                          {/* Speaking: always show audio upload regardless of questionType */}
                          {isSpeakingQ && (
                            <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 font-sans">
                                  <Volume2 className="w-4 h-4 text-amber-600" />
                                  {t("exams.uploadSpeakingAudioLabel")}
                                </label>
                                {uploadingAudioQId === q.id && (
                                  <span className="text-xs text-amber-600 animate-pulse font-semibold">
                                    {t("exams.uploadingAudio")}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-col sm:flex-row items-center gap-3">
                                <input
                                  type="file"
                                  accept="audio/*"
                                  id={`speaking-file-${q.id}`}
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setUploadingAudioQId(q.id);
                                      try {
                                        const res = await questionPassageApi.uploadFile(file);
                                        if (res.success && res.data) {
                                          setChosenAnswers(prev => ({ ...prev, [q.id]: res.data }));
                                          showToast(t("exams.audioFileAttached"), "success");
                                        } else {
                                          showToast(res.message || "Không thể tải file audio", "error");
                                        }
                                      } catch (err: any) {
                                        showToast(err.message || "Lỗi upload file", "error");
                                      } finally {
                                        setUploadingAudioQId(null);
                                      }
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`speaking-file-${q.id}`}
                                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors shadow-xs inline-flex items-center gap-2"
                                >
                                  <Volume2 className="w-4 h-4" />
                                  {uploadingAudioQId === q.id ? t("exams.uploadingAudio") : t("exams.selectAudioFileBtn")}
                                </label>
                              </div>

                              {chosenValue && (chosenValue.startsWith("/uploads") || chosenValue.startsWith("http") || chosenValue.startsWith("data:")) && (
                                <div className="space-y-1.5 pt-2 border-t border-amber-200/50">
                                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <CheckCircle className="w-3.5 h-3.5" /> {t("exams.audioFileAttached")}:
                                  </span>
                                  <audio controls src={getFileUrl(chosenValue)} className="w-full h-9 rounded-lg" />
                                </div>
                              )}
                            </div>
                          )}

                          {q.questionType === 3 && !isSpeakingQ ? (
                            <div className="space-y-1.5 mt-3">
                              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">{t("exams.studentSelectYourAnswer")}</label>
                              <textarea
                                value={chosenValue}
                                onChange={(e) => handleTextAnswerChange(q.id, e.target.value)}
                                placeholder={t("exams.studentAnswerPlaceholder")}
                                rows={4}
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                              />
                            </div>
                          ) : !isSpeakingQ ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                              {q.questionAnswers.map((option: any, optIdx: number) => {
                                const optLabel = String.fromCharCode(65 + optIdx);
                                const isSelected = isMultiple
                                  ? chosenValue.split(",").map(s => s.trim()).includes(option.content)
                                  : chosenValue === option.content;

                                return (
                                  <div
                                    key={option.id}
                                    onClick={() => handleSelectChoice(q.id, option.content, isMultiple)}
                                    className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all duration-200 select-none ${
                                      isSelected
                                        ? "bg-brand-50 border-brand-500 dark:bg-brand-950/20 dark:border-brand-500 ring-2 ring-brand-500/10"
                                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 hover:border-brand-300"
                                    }`}
                                  >
                                    <div
                                      className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 transition-colors ${
                                        isSelected
                                          ? "bg-brand-500 text-white"
                                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                      }`}
                                    >
                                      {optLabel}
                                    </div>
                                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                      {option.content}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Render Standalone Questions */}
              {groupedPassageMap.standaloneQs.map((q) => {
                const globalIdx = questions.findIndex((x) => x.id === q.id);
                const chosenValue = chosenAnswers[q.id] || "";
                const isMultiple = q.questionType === 2;
                const isSpeakingQ = q.skillType === 3 ||
                  String(exam?.type || "").toLowerCase().includes("speaking") ||
                  String(exam?.title || "").toLowerCase().includes("speaking");

                return (
                  <div
                    key={q.id}
                    id={`question-${q.id}`}
                    className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm space-y-4 scroll-mt-6"
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
                      <h4 className="text-sm font-bold text-brand-600 dark:text-brand-400 flex items-center gap-2">
                        {t("exams.question")} {globalIdx + 1}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/20 text-brand-600 font-black border border-brand-100 dark:border-brand-900/30">
                          {q.point || 1} {t("exams.points")}
                        </span>
                      </h4>
                      {isMultiple && (
                        <span className="text-[9px] px-2 py-0.5 rounded bg-purple-50 text-purple-600 font-bold border border-purple-100">
                          {t("exams.multipleSelectLabel")}
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-gray-855 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                      {q.content}
                    </p>

                    {/* Speaking: always show audio upload regardless of questionType */}
                    {isSpeakingQ && (
                      <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 font-sans">
                            <Volume2 className="w-4 h-4 text-amber-600" />
                            {t("exams.uploadSpeakingAudioLabel")}
                          </label>
                          {uploadingAudioQId === q.id && (
                            <span className="text-xs text-amber-600 animate-pulse font-semibold">
                              {t("exams.uploadingAudio")}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3">
                          <input
                            type="file"
                            accept="audio/*"
                            id={`speaking-file-${q.id}`}
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setUploadingAudioQId(q.id);
                                try {
                                  const res = await questionPassageApi.uploadFile(file);
                                  if (res.success && res.data) {
                                    setChosenAnswers(prev => ({ ...prev, [q.id]: res.data }));
                                    showToast(t("exams.audioFileAttached"), "success");
                                  } else {
                                    showToast(res.message || "Không thể tải file audio", "error");
                                  }
                                } catch (err: any) {
                                  showToast(err.message || "Lỗi upload file", "error");
                                } finally {
                                  setUploadingAudioQId(null);
                                }
                              }
                            }}
                          />
                          <label
                            htmlFor={`speaking-file-${q.id}`}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors shadow-xs inline-flex items-center gap-2"
                          >
                            <Volume2 className="w-4 h-4" />
                            {uploadingAudioQId === q.id ? t("exams.uploadingAudio") : t("exams.selectAudioFileBtn")}
                          </label>
                        </div>

                        {chosenValue && (chosenValue.startsWith("/uploads") || chosenValue.startsWith("http") || chosenValue.startsWith("data:")) && (
                          <div className="space-y-1.5 pt-2 border-t border-amber-200/50">
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> {t("exams.audioFileAttached")}:
                            </span>
                            <audio controls src={getFileUrl(chosenValue)} className="w-full h-9 rounded-lg" />
                          </div>
                        )}
                      </div>
                    )}

                    {q.questionType === 3 && !isSpeakingQ ? (
                      <div className="space-y-1.5 mt-3">
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">{t("exams.studentSelectYourAnswer")}</label>
                        <textarea
                          value={chosenValue}
                          onChange={(e) => handleTextAnswerChange(q.id, e.target.value)}
                          placeholder={t("exams.studentAnswerPlaceholder")}
                          rows={4}
                          className="w-full rounded-xl border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                        />
                      </div>
                    ) : !isSpeakingQ ? (
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
                    ) : null}
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
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t("exams.answerSheet")}</h3>
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
                        title={`${t("exams.question")} ${idx + 1}`}
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
                    <span className="text-amber-700 dark:text-amber-400 font-semibold">
                      {t("exams.confirmSubmitUnanswered", { count: questions.length - answeredCount })}
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom action buttons */}
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleLeaveClick}
                  className="py-3 text-xs font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-880 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t("exams.btnLeave")}
                </button>
                <button
                  type="button"
                  onClick={handleSubmitClick}
                  disabled={isSubmitting}
                  className="py-3 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-sm shadow-brand-500/20 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? t("exams.submitting") : t("exams.btnSubmit")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {confirmModal.open && (
          <div className="fixed inset-0 z-[9999999] flex items-center justify-center">
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
                  {confirmModal.cancelLabel || t("questionCategory.btnCancel")}
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-sm shadow-brand-500/20 transition-colors"
                >
                  {confirmModal.confirmLabel || t("exams.btnClose")}
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
            {t("exams.attemptHistory")}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Side: Question Review */}
          <div className="lg:col-span-8 space-y-6">
            {groupedPassageMap.passageGroups.map(({ passage, questions: groupQs }) => (
              <div
                key={passage.id}
                className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-theme-xs space-y-4"
              >
                {/* Passage Header */}
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-gray-400">({passage.code})</span>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">{passage.title}</h3>
                  </div>
                  <span className="text-xs font-semibold text-gray-500">({groupQs.length} câu hỏi)</span>
                </div>

                {/* Reading Passage Text */}
                {passage.content && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-950/40 rounded-xl text-gray-800 dark:text-gray-200 text-sm font-serif leading-relaxed whitespace-pre-wrap border border-gray-150 dark:border-gray-800">
                    <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 font-sans">
                      📖 NỘI DUNG ĐOẠN VĂN (READING PASSAGE)
                    </span>
                    {passage.content}
                  </div>
                )}

                {/* Listening Audio File */}
                {passage.audioUrl && (
                  <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50 space-y-2">
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5 font-sans">
                      <Volume2 className="w-4 h-4" /> File âm thanh bài nghe (Listening Audio)
                    </span>
                    <audio controls src={getFileUrl(passage.audioUrl)} className="w-full h-9 rounded-lg" />
                  </div>
                )}

                {/* Questions under this passage */}
                <div className="space-y-4 pt-2">
                  {groupQs.map((q) => {
                    const globalIdx = (exam.questions || []).findIndex((x) => x.id === q.id);
                    const attemptAns = attempt.answers.find((a) => a.questionId === q.id);
                    const studentAnswer = attemptAns?.answerContent || "";
                    const isCorrect = attemptAns?.isCorrect;
                    const questionPoints = q.point || 1;
                    const isMultiple = q.questionType === 2;

                    return (
                      <div
                        key={q.id}
                        className={`p-5 bg-white dark:bg-gray-900 border rounded-xl shadow-xs space-y-3 ${
                          !studentAnswer
                            ? "border-gray-200 dark:border-gray-800"
                            : isCorrect
                            ? "border-emerald-250 dark:border-emerald-500/20"
                            : "border-rose-205 dark:border-rose-500/20"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-2.5">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                            {t("exams.question")} {globalIdx + 1}
                            <span className="text-[10px] px-2 py-0.5 rounded bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-black">
                              {questionPoints} {t("exams.points")}
                            </span>
                          </h4>

                          {!studentAnswer ? (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-bold uppercase">
                              {t("exams.attemptUnanswered")}
                            </span>
                          ) : (checkIfPendingGrading(attempt) || q.questionType === 3 || q.skillType === 3 || q.skillType === 4) ? (
                            <span className="inline-flex items-center gap-1 text-[9px] px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 font-bold uppercase border border-amber-200 dark:border-amber-900/40">
                              <Clock className="w-3 h-3 text-amber-500" />
                              {t("exams.statusPendingGrade")}
                            </span>
                          ) : isCorrect ? (
                            <span className="inline-flex items-center gap-1 text-[9px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold uppercase">
                              <CheckCircle className="w-3 h-3" />
                              {t("exams.statsCorrect")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 font-bold uppercase">
                              <XCircle className="w-3 h-3" />
                              {t("exams.statsIncorrect")}
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-bold text-gray-855 dark:text-gray-250 leading-relaxed whitespace-pre-wrap">
                          {q.content}
                        </p>

                        {studentAnswer && (studentAnswer.startsWith("/uploads") || studentAnswer.startsWith("http") || studentAnswer.startsWith("data:") || studentAnswer.includes(".mp3") || studentAnswer.includes(".wav") || studentAnswer.includes(".m4a")) ? (
                          <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40 space-y-2 mt-3">
                            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 font-sans">
                              <Volume2 className="w-4 h-4 text-amber-600" /> {t("exams.audioFileAttached")}
                            </span>
                            <audio controls src={getFileUrl(studentAnswer)} className="w-full h-9 rounded-lg" />
                          </div>
                        ) : q.questionType === 3 ? (
                          <div className="space-y-1.5 mt-3">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">{t("exams.studentSelectYourAnswer")}</span>
                            <p className="text-sm bg-gray-50 dark:bg-gray-950 p-3 rounded-xl border border-gray-150 dark:border-gray-850 font-semibold whitespace-pre-line text-gray-800 dark:text-gray-200">
                              {studentAnswer || <span className="italic text-gray-400">{t("exams.attemptUnanswered")}</span>}
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                            {q.questionAnswers.map((option: any, optIdx: number) => {
                              const optLabel = String.fromCharCode(65 + optIdx);
                              const isStudentSelect = isMultiple
                                ? studentAnswer.split(",").map((s: string) => s.trim()).includes(option.content)
                                : studentAnswer === option.content;

                              const isCorrectOption = option.isCorrect;

                              let borderStyle = "border-gray-200 dark:border-gray-855 hover:bg-gray-50/50";
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
                                  <span className="text-sm font-semibold text-gray-855 dark:text-gray-200">
                                    {option.content}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {canShowAnswers && q.explanation && (
                          <div className="p-3 bg-blue-50/20 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-xl mt-4">
                            <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider block mb-1">{t("exams.explanationTitle")}</span>
                            <p className="text-xs text-gray-655 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                              {q.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Standalone Questions */}
            {groupedPassageMap.standaloneQs.map((q) => {
              const globalIdx = (exam.questions || []).findIndex((x) => x.id === q.id);
              const attemptAns = attempt.answers.find((a) => a.questionId === q.id);
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
                  <div className="flex items-center justify-between gap-3 border-b border-gray-50 pb-3">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      {t("exams.question")} {globalIdx + 1}
                      <span className="text-[10px] px-2 py-0.5 rounded bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-black">
                        {questionPoints} {t("exams.points")}
                      </span>
                    </h4>

                    {!studentAnswer ? (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-bold uppercase">
                        {t("exams.attemptUnanswered")}
                      </span>
                    ) : isCorrect ? (
                      <span className="inline-flex items-center gap-1 text-[9px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold uppercase">
                        <CheckCircle className="w-3 h-3" />
                        {t("exams.statsCorrect")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 font-bold uppercase">
                        <XCircle className="w-3 h-3" />
                        {t("exams.statsIncorrect")}
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-bold text-gray-855 dark:text-gray-250 leading-relaxed whitespace-pre-wrap">
                    {q.content}
                  </p>

                  {studentAnswer && (studentAnswer.startsWith("/uploads") || studentAnswer.startsWith("http") || studentAnswer.startsWith("data:") || studentAnswer.includes(".mp3") || studentAnswer.includes(".wav") || studentAnswer.includes(".m4a")) ? (
                    <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40 space-y-2 mt-3">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 font-sans">
                        <Volume2 className="w-4 h-4 text-amber-600" /> {t("exams.audioFileAttached")}
                      </span>
                      <audio controls src={getFileUrl(studentAnswer)} className="w-full h-9 rounded-lg" />
                    </div>
                  ) : q.questionType === 3 ? (
                    <div className="space-y-1 mt-3">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">{t("exams.studentSelectYourAnswer")}</span>
                      <p className="text-sm bg-gray-50 dark:bg-gray-950 p-3 rounded-xl border border-gray-150 dark:border-gray-850 font-semibold whitespace-pre-line text-gray-800 dark:text-gray-200">
                        {studentAnswer || <span className="italic text-gray-400">{t("exams.attemptUnanswered")}</span>}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      {q.questionAnswers.map((option, optIdx) => {
                        const optLabel = String.fromCharCode(65 + optIdx);
                        const isStudentSelect = isMultiple
                          ? studentAnswer.split(",").map((s) => s.trim()).includes(option.content)
                          : studentAnswer === option.content;

                        const isCorrectOption = option.isCorrect;

                        let borderStyle = "border-gray-200 dark:border-gray-855 hover:bg-gray-50/50";
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
                            <span className="text-sm font-semibold text-gray-855 dark:text-gray-200">
                              {option.content}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {canShowAnswers && q.explanation && (
                    <div className="p-3 bg-blue-50/20 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-xl mt-4">
                      <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider block mb-1">{t("exams.explanationTitle")}</span>
                      <p className="text-xs text-gray-655 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
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
            {(() => {
              const isPending = checkIfPendingGrading(attempt);
              return (
                <div className={`p-5 text-white rounded-2xl shadow-theme-xs text-center space-y-1 ${
                  isPending ? "bg-amber-500" : "bg-brand-500"
                }`}>
                  <span className="text-[10px] uppercase font-black tracking-widest block opacity-70">{t("exams.gradeScore")}</span>
                  <span className="text-3xl font-black tracking-tight mt-1 block">
                    {isPending ? `-- / ${exam.totalScore || 10}` : `${attempt.score || 0}/${exam.totalScore || 10}`}
                  </span>
                  <span className="text-[10px] font-bold block pt-2 opacity-90 border-t border-white/20 mt-3 uppercase tracking-wider">
                    {isPending
                      ? `⏳ ${t("exams.statusPendingGrade")}`
                      : attempt.score !== null && attempt.score !== undefined && attempt.score >= (exam.passingScore || 5)
                      ? t("exams.attemptPassed")
                      : t("exams.attemptFailed")}
                  </span>
                </div>
              );
            })()}

            {/* Results metadata/tabs card */}
            <div className="p-5 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-theme-xs space-y-4">
              
              {/* Results metadata card */}
              <div className="border-b border-gray-100 dark:border-gray-850 pb-2">
                <span className="text-xs font-bold text-brand-600 dark:text-brand-450 border-b-2 border-brand-500 pb-1.5 inline-block">
                  {t("exams.tabResult")}
                </span>
              </div>

              {/* Results tab contents */}
              <div className="space-y-4">
                {/* Detailed Statistics list */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {t("exams.gradeSubmitTime")}
                    </span>
                    <span className="text-gray-800 dark:text-gray-200 font-bold">
                      {attempt.submitTime ? new Date(attempt.submitTime).toLocaleString("vi-VN") : "—"}
                    </span>
                  </div>

                  {checkIfPendingGrading(attempt) ? (
                    <div className="flex justify-between items-center text-xs font-semibold pt-1 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        {t("registration.colStatus", { defaultValue: "Trạng thái" })}
                      </span>
                      <span className="text-amber-600 dark:text-amber-400 font-bold">
                        {t("exams.statusPendingGrade")}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-gray-500 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          {t("exams.attemptCorrectCount")}
                        </span>
                        <span className="text-emerald-600 font-bold">
                          {stats.correctCount} {t("exams.question").toLowerCase()}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-gray-500 flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          {t("exams.attemptIncorrectCount")}
                        </span>
                        <span className="text-rose-600 font-bold">
                          {stats.incorrectCount} {t("exams.question").toLowerCase()}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-gray-500 flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                          {t("exams.attemptUnanswered")}
                        </span>
                        <span className="text-gray-655 dark:text-gray-300 font-bold">
                          {stats.unattemptedCount} {t("exams.question").toLowerCase()}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Teacher Feedback Box for Student */}
                {(() => {
                  const comment = attempt.teacherComment || attempt.answers?.find((a: any) => a.teacherComment)?.teacherComment;
                  if (!comment) return null;
                  return (
                    <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-1.5 mt-3">
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 font-sans">
                        <Award className="w-4 h-4 text-amber-600" />
                        {t("exams.teacherCommentTitle")}
                      </span>
                      <p className="text-xs text-gray-800 dark:text-gray-200 font-medium whitespace-pre-wrap leading-relaxed">
                        {comment}
                      </p>
                    </div>
                  );
                })()}

                {/* Warning message if answers are hidden */}
                {!canShowAnswers && (
                  <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl mt-3 text-left">
                    <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-850 dark:text-amber-450 leading-relaxed font-semibold">
                      {t("exams.answersHiddenWarning")}
                    </p>
                  </div>
                )}
              </div>

              {/* Close / Return Button */}
              <button
                onClick={() => {
                  setSelectedPastAttempt(null);
                  setViewState("ready");
                }}
                className="w-full text-center py-2.5 text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 dark:text-brand-400 dark:bg-brand-950/20 dark:hover:bg-brand-950/40 rounded-xl transition-colors block border border-brand-100 dark:border-brand-900/30"
              >
                {t("exams.btnBackToExam")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { classApi, ClassItem } from "@/services/class.api";
import { questionApi, QuestionItem } from "@/services/question.api";
import { questionCategoryApi, QuestionCategoryItem } from "@/services/questionCategory.api";
import { questionPassageApi, QuestionPassageItem } from "@/services/questionPassage.api";
import { examApi, ExamSaveDto } from "@/services/exam.api";
import { authApi } from "@/services/auth.api";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { ChevronDown, ChevronUp, BookOpen, Volume2, PenTool, XCircle } from "lucide-react";

import { ENV } from "@/config/env";

const getFileUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }
  return `${ENV.API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

const formatDateDDMMYYYY = (dateString: string | null | undefined): string => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

interface ExamFormProps {
  id?: number; // If provided, edit mode
}

export function ExamForm({ id }: ExamFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const isEdit = !!id;

  // ─── Form States ─────────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classId, setClassId] = useState<number | null>(null);
  const [type, setType] = useState<number>(1); // 1 = Assigned, 2 = Template
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [duration, setDuration] = useState<number>(20);
  const [totalScore, setTotalScore] = useState<number>(10);
  const [passingScore, setPassingScore] = useState<number>(5);
  const [maxAttempts, setMaxAttempts] = useState<number>(1);
  const [allowLateSubmit, setAllowLateSubmit] = useState(false);
  const [shuffleQuestion, setShuffleQuestion] = useState(false);
  const [showAnswerAfter, setShowAnswerAfter] = useState(true);
  const [status, setStatus] = useState<number>(1); // 1 = Published, 2 = Draft

  // Questions selection
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);

  // Async selections
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [categories, setCategories] = useState<QuestionCategoryItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  // The exam's declared skill (top "KỸ NĂNG BÀI THI" selector) — every exam must pick exactly
  // one skill now (no "Tất cả"/mixed option), and the question picker is always locked to it so
  // mismatched-skill questions can neither be shown nor stay selected.
  const [examSkillType, setExamSkillType] = useState<number>(2); // Default to Reading (2)
  const [questionPassages, setQuestionPassages] = useState<QuestionPassageItem[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [expandedPassageIds, setExpandedPassageIds] = useState<number[]>([]);
  const [questionSearch, setQuestionSearch] = useState("");
  const [loadingData, setLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Synchronous re-entrancy guard: `isSubmitting` state only disables the button after React
  // re-renders, leaving a window for a fast double-click to fire handleSubmit twice. A ref is
  // updated immediately, closing that window.
  const isSubmittingRef = React.useRef(false);

  // Helper to format date for datetime-local input
  const formatDateTimeLocal = (dateStr?: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const pad = (num: number) => String(num).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // ClassStatus enum values (mirrors backend Enums.cs)
  const CLASS_STATUS_ACTIVE = 1;

  // Selected class object (for time validation hints)
  const selectedClass = classes.find((c) => c.id === classId) ?? null;

  // Auto-dismiss the error/warning alert, mirroring the success toast used after redirect
  useEffect(() => {
    if (!formError) return;
    const timeout = setTimeout(() => setFormError(null), 3000);
    return () => clearTimeout(timeout);
  }, [formError]);

  // Load dropdown options
  useEffect(() => {
    async function loadOptions() {
      try {
        const isTeacher = authApi.getRole().toLowerCase() === "teacher";
        const [clsRes, qRes, catRes, passRes] = await Promise.all([
          isTeacher ? classApi.getTeacherClasses(1, 1000) : classApi.getAll(1, 1000),
          questionApi.getAll(1, 1000),
          questionCategoryApi.getAll(1, 1000),
          questionPassageApi.getAll(1, 1000),
        ]);

        if (clsRes.success && clsRes.data) {
          setClasses((clsRes.data.items || []).filter((c) => c.status === CLASS_STATUS_ACTIVE));
        }
        if (qRes.success && qRes.data) {
          setQuestions(qRes.data.items || []);
        }
        if (catRes.success && catRes.data) {
          setCategories(catRes.data.items || []);
        }
        if (passRes.success && passRes.data) {
          setQuestionPassages(passRes.data.items || []);
        }
      } catch (err) {
        console.error("Failed to load options", err);
      }
    }
    loadOptions();
  }, []);

  // Load detail if edit mode
  useEffect(() => {
    if (!id) return;
    async function loadDetail() {
      setLoadingData(true);
      setFormError(null);
      try {
        const res = await examApi.getById(id!);
        if (res.success && res.data) {
          const data = res.data;
          setTitle(data.title || "");
          setDescription(data.description || "");
          setClassId(data.classId ?? null);
          setType(data.type ?? 1);
          setStartTime(data.startTime ? formatDateTimeLocal(data.startTime) : "");
          setEndTime(data.endTime ? formatDateTimeLocal(data.endTime) : "");
          setDuration(data.duration ?? 20);
          setTotalScore(data.totalScore ?? 10);
          setPassingScore(data.passingScore ?? 5);
          setMaxAttempts(data.maxAttempts ?? 1);
          setAllowLateSubmit(data.allowLateSubmit ?? false);
          setShuffleQuestion(data.shuffleQuestion ?? false);
          setShowAnswerAfter(data.showAnswerAfter ?? true);
          setStatus(data.status ?? 1);
          setSelectedQuestionIds(data.questionIds || []);
        } else {
          setFormError(res.message || t("exams.formErrorLoadFailed", { defaultValue: "Không thể tải thông tin bài kiểm tra" }));
        }
      } catch (err: any) {
        setFormError(err.message || t("exams.formErrorLoadDetail", { defaultValue: "Lỗi hệ thống khi tải chi tiết bài kiểm tra" }));
      } finally {
        setLoadingData(false);
      }
    }
    loadDetail();
  }, [id, t]);

  // Combine questions from p.questions AND standalone questions matching q.passageId === p.id or code prefix
  const passageChildQuestionsMap = useMemo(() => {
    const map = new Map<number, QuestionItem[]>();
    questionPassages.forEach((p) => {
      const fromPassage = p.questions || [];
      const fromQuestionsList = questions.filter(
        (q) => q.passageId === p.id || (q.code && p.code && q.code.startsWith(p.code))
      );

      const combined: QuestionItem[] = [...fromPassage];
      fromQuestionsList.forEach((q) => {
        if (!combined.some((existing) => existing.id === q.id)) {
          combined.push(q);
        }
      });

      map.set(p.id, combined);
    });
    return map;
  }, [questionPassages, questions]);

  // Filter category dropdown options based on selected class's course
  const filteredCategories = useMemo(() => {
    if (selectedClass && selectedClass.courseId !== null && selectedClass.courseId !== undefined) {
      return categories.filter((c) => c.courseId === selectedClass.courseId);
    }
    return categories;
  }, [categories, selectedClass]);

  // Filter question passages based on category, skill, search, and selected class course
  const filteredPassages = useMemo(() => {
    return questionPassages.filter((p) => {
      const childQs = passageChildQuestionsMap.get(p.id) || p.questions || [];
      // Only include passages that have at least 1 child question
      if (childQs.length === 0) {
        return false;
      }

      // Filter by Class Course if a Class is selected
      if (selectedClass && selectedClass.courseId !== null && selectedClass.courseId !== undefined) {
        const cat = categories.find((c) => c.id === p.categoryId);
        if (cat && cat.courseId !== null && cat.courseId !== undefined && cat.courseId !== selectedClass.courseId) {
          return false;
        }
      }

      if (selectedCategoryId !== null && p.categoryId !== selectedCategoryId) {
        return false;
      }
      if (p.skillType !== examSkillType) {
        return false;
      }
      if (questionSearch.trim()) {
        const term = questionSearch.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(term) || p.code.toLowerCase().includes(term);
        const matchChild = childQs.some(
          (q) =>
            q.name.toLowerCase().includes(term) ||
            q.content.toLowerCase().includes(term) ||
            q.code.toLowerCase().includes(term)
        );
        if (!matchTitle && !matchChild) return false;
      }
      return true;
    });
  }, [questionPassages, selectedCategoryId, examSkillType, questionSearch, passageChildQuestionsMap, selectedClass, categories]);

  // All question IDs mapped to passages
  const passageQuestionIds = useMemo(() => {
    const set = new Set<number>();
    passageChildQuestionsMap.forEach((qList) => {
      qList.forEach((q) => set.add(q.id));
    });
    return set;
  }, [passageChildQuestionsMap]);

  // Standalone questions (questions not part of any loaded passage)
  const standaloneQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (passageQuestionIds.has(q.id)) return false;

      // Filter by Class Course if a Class is selected
      if (selectedClass && selectedClass.courseId !== null && selectedClass.courseId !== undefined) {
        const cat = categories.find((c) => c.id === q.categoryId);
        if (cat && cat.courseId !== null && cat.courseId !== undefined && cat.courseId !== selectedClass.courseId) {
          return false;
        }
      }

      if (selectedCategoryId !== null && q.categoryId !== selectedCategoryId) return false;
      if (q.skillType !== examSkillType) return false;
      if (questionSearch.trim()) {
        const term = questionSearch.toLowerCase();
        return (
          q.name.toLowerCase().includes(term) ||
          q.content.toLowerCase().includes(term) ||
          q.code.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [questions, passageQuestionIds, selectedCategoryId, examSkillType, questionSearch, selectedClass, categories]);

  // Resolves the effective skill of a question for pruning purposes — passage-child questions
  // are classified by their parent passage's skill (mirrors the grouping shown in the picker).
  const getQuestionSkillType = (questionId: number): number | undefined => {
    const q = questions.find((x) => x.id === questionId);
    if (!q) return undefined;
    if (q.passageId) {
      const passage = questionPassages.find((p) => p.id === q.passageId);
      if (passage && passage.skillType !== undefined && passage.skillType !== null) {
        return passage.skillType;
      }
    }
    return q.skillType;
  };

  const handleToggleQuestion = (questionId: number) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(questionId) ? prev.filter((x) => x !== questionId) : [...prev, questionId]
    );
  };

  const handleTogglePassage = (passage: QuestionPassageItem) => {
    const childQs = passageChildQuestionsMap.get(passage.id) || passage.questions || [];
    const childQIds = childQs.map((q) => q.id);
    if (childQIds.length === 0) return;

    const isAllSelected = childQIds.every((qid) => selectedQuestionIds.includes(qid));

    if (isAllSelected) {
      setSelectedQuestionIds((prev) => prev.filter((qid) => !childQIds.includes(qid)));
    } else {
      setSelectedQuestionIds((prev) => Array.from(new Set([...prev, ...childQIds])));
    }
  };

  const toggleExpandPassage = (passageId: number) => {
    setExpandedPassageIds((prev) =>
      prev.includes(passageId) ? prev.filter((pid) => pid !== passageId) : [...prev, passageId]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredQuestionIds: number[] = [];
    filteredPassages.forEach((p) => {
      const childQs = passageChildQuestionsMap.get(p.id) || p.questions || [];
      childQs.forEach((q) => allFilteredQuestionIds.push(q.id));
    });
    standaloneQuestions.forEach((q) => allFilteredQuestionIds.push(q.id));

    const someUnselected = allFilteredQuestionIds.some((qid) => !selectedQuestionIds.includes(qid));

    if (someUnselected) {
      setSelectedQuestionIds((prev) => Array.from(new Set([...prev, ...allFilteredQuestionIds])));
    } else {
      setSelectedQuestionIds((prev) => prev.filter((qid) => !allFilteredQuestionIds.includes(qid)));
    }
  };

  const isAllFilteredSelected = useMemo(() => {
    const allFilteredQuestionIds: number[] = [];
    filteredPassages.forEach((p) => {
      const childQs = passageChildQuestionsMap.get(p.id) || p.questions || [];
      childQs.forEach((q) => allFilteredQuestionIds.push(q.id));
    });
    standaloneQuestions.forEach((q) => allFilteredQuestionIds.push(q.id));

    if (allFilteredQuestionIds.length === 0) return false;
    return allFilteredQuestionIds.every((qid) => selectedQuestionIds.includes(qid));
  }, [filteredPassages, standaloneQuestions, selectedQuestionIds, passageChildQuestionsMap]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    try {
      await submitExamForm();
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const submitExamForm = async () => {
    if (!title.trim()) return;

    // ── Validation ──────────────────────────────────────────────────────────
    if (selectedQuestionIds.length === 0) {
      setFormError(t("exams.formValidationMinQuestion", { defaultValue: "Vui lòng chọn ít nhất 1 câu hỏi cho bài kiểm tra." }));
      return;
    }

    if (duration !== null && duration !== undefined && duration <= 0) {
      setFormError(t("backendMessages.ERR_DURATION_INVALID", { defaultValue: "Thời lượng bài kiểm tra phải lớn hơn 0 phút." }));
      return;
    }

    if (totalScore !== null && totalScore !== undefined && totalScore <= 0) {
      setFormError(t("backendMessages.ERR_SCORE_INVALID", { defaultValue: "Tổng điểm phải lớn hơn 0." }));
      return;
    }

    if (passingScore !== null && passingScore !== undefined && passingScore < 0) {
      setFormError(t("backendMessages.ERR_SCORE_INVALID", { defaultValue: "Điểm đạt không được nhỏ hơn 0." }));
      return;
    }

    if (
      passingScore !== null &&
      passingScore !== undefined &&
      totalScore !== null &&
      totalScore !== undefined &&
      passingScore > totalScore
    ) {
      setFormError(
        t("backendMessages.ERR_SCORE_INVALID", {
          defaultValue: "Điểm đạt không được lớn hơn tổng điểm của bài kiểm tra.",
        })
      );
      return;
    }

    if (selectedClass && selectedClass.courseId !== null && selectedClass.courseId !== undefined) {
      const invalidQIds = selectedQuestionIds.filter((qid) => {
        const q = questions.find((x) => x.id === qid);
        let catId = q?.categoryId;
        if (!catId && q?.passageId) {
          const passage = questionPassages.find((p) => p.id === q.passageId);
          catId = passage?.categoryId;
        }
        const cat = categories.find((c) => c.id === catId);
        if (cat && cat.courseId !== null && cat.courseId !== undefined && cat.courseId !== selectedClass.courseId) {
          return true;
        }
        return false;
      });

      if (invalidQIds.length > 0) {
        setFormError(
          t("exams.errorQuestionCourseMismatch", {
            defaultValue: `Các câu hỏi được chọn không thuộc khóa học của lớp "${selectedClass.name}" (${selectedClass.courseName || "Khóa học khác"}). Vui lòng chọn lại các câu hỏi thuộc đúng khóa học của lớp!`,
          })
        );
        return;
      }
    }

    const isPublished = status === 1;   // 1 = Published, 2 = Draft
    const isAssigned  = type === 1;     // 1 = Assigned to class, 2 = Template/bank

    if (isPublished && isAssigned) {
      if (!classId) {
        setFormError(t("exams.formValidationNeedClass", { defaultValue: "Bài kiểm tra đã xuất bản phải chọn lớp học." }));
        return;
      }
      if (!startTime) {
        setFormError(t("exams.formValidationNeedStartTime", { defaultValue: "Bài kiểm tra đã xuất bản phải chọn thời gian bắt đầu." }));
        return;
      }
    }

    if (startTime && endTime) {
      const examStart = new Date(startTime);
      const examEnd = new Date(endTime);
      if (examEnd <= examStart) {
        setFormError(t("exams.formValidationEndBeforeStart", { defaultValue: "Thời gian kết thúc không được trước hoặc bằng thời gian bắt đầu." }));
        return;
      }

      if (duration) {
        const windowMinutes = (examEnd.getTime() - examStart.getTime()) / 60000;
        if (windowMinutes < duration) {
          setFormError(
            t("exams.formValidationWindowLessThanDuration", {
              duration,
              defaultValue: `Khoảng thời gian làm bài (từ lúc bắt đầu đến lúc kết thúc) không được ít hơn thời lượng bài kiểm tra (${duration} phút).`,
            })
          );
          return;
        }
      }
    }

    if (type === 1 && classId !== null) {
      const cls = classes.find((c) => c.id === classId);
      if (cls) {
        const classStart = cls.startDate ? new Date(cls.startDate) : null;
        const classEnd = cls.endDate ? new Date(cls.endDate) : null;

        if (startTime && classStart && new Date(startTime) < classStart) {
          setFormError(
            t("exams.formValidationStartBeforeClass", {
              date: formatDateDDMMYYYY(cls.startDate),
              defaultValue: `Thời gian bắt đầu bài kiểm tra không được trước ngày bắt đầu của lớp (${formatDateDDMMYYYY(cls.startDate)}).`,
            })
          );
          return;
        }

        if (startTime && classEnd && new Date(startTime) > classEnd) {
          setFormError(
            t("exams.formValidationStartAfterClassEnd", {
              date: formatDateDDMMYYYY(cls.endDate),
              defaultValue: `Thời gian bắt đầu bài kiểm tra không được sau ngày kết thúc của lớp (${formatDateDDMMYYYY(cls.endDate)}).`,
            })
          );
          return;
        }

        if (endTime && classEnd && new Date(endTime) > classEnd) {
          setFormError(
            t("exams.formValidationEndAfterClass", {
              date: formatDateDDMMYYYY(cls.endDate),
              defaultValue: `Thời gian kết thúc bài kiểm tra không được sau ngày kết thúc của lớp (${formatDateDDMMYYYY(cls.endDate)}).`,
            })
          );
          return;
        }
      }
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload: ExamSaveDto = {
        title: title.trim(),
        description: description.trim(),
        classId: type === 1 ? classId : null,
        type,
        startTime: startTime ? new Date(startTime).toISOString() : null,
        endTime: endTime ? new Date(endTime).toISOString() : null,
        duration: duration || null,
        totalScore,
        passingScore,
        maxAttempts,
        allowLateSubmit,
        shuffleQuestion,
        showAnswerAfter,
        status,
        questionIds: selectedQuestionIds,
      };

      let res;
      if (isEdit) {
        res = await examApi.update(id!, payload);
      } else {
        res = await examApi.create(payload);
      }

      if (res.success) {
        sessionStorage.setItem("examToastKey", isEdit ? "successUpdate" : "successCreate");
        sessionStorage.setItem("examToastType", "success");
        router.push("/exams");
      } else {
        setFormError(
          res.message
            ? t(`backendMessages.${res.message}`, { defaultValue: res.message })
            : t("exams.formErrorSaveFailed", { defaultValue: "Lỗi khi lưu bài kiểm tra." })
        );
      }
    } catch (err: any) {
      setFormError(err.message || t("exams.formErrorSaveSystem", { defaultValue: "Lỗi hệ thống khi lưu bài kiểm tra." }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSkillBadgeClass = (skillType: number) => {
    switch (skillType) {
      case 1:
        return "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200/50";
      case 2:
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200/50";
      case 3:
        return "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200/50";
      case 4:
        return "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200/50";
      default:
        return "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const getSkillName = (skillType: number) => {
    switch (skillType) {
      case 1:
        return t("question.skillListening", { defaultValue: "Listening" });
      case 2:
        return t("question.skillReading", { defaultValue: "Reading" });
      case 3:
        return t("question.skillSpeaking", { defaultValue: "Speaking" });
      case 4:
        return t("question.skillWriting", { defaultValue: "Writing" });
      default:
        return t("question.filterSkill", { defaultValue: "Kỹ năng" });
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-sm text-gray-500">{t("exams.formLoadingDetails", { defaultValue: "Đang tải thông tin đề bài..." })}</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {isEdit ? t("exams.formEditTitle", { defaultValue: "Cập nhật bài kiểm tra" }) : t("exams.formCreateTitle", { defaultValue: "Tạo bài kiểm tra mới" })}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {isEdit ? t("exams.formEditSubtitle", { defaultValue: "Cập nhật thông tin và danh sách câu hỏi của bài kiểm tra." }) : t("exams.formCreateSubtitle", { defaultValue: "Tạo bài thi mới, gán cho lớp học hoặc lưu vào thư viện bài mẫu." })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/exams")}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors shadow-theme-xs cursor-pointer"
        >
          &lt; {t("exams.btnBack", { defaultValue: "Quay lại danh sách" })}
        </button>
      </div>

      {formError && (
        <div className="fixed bottom-5 right-5 z-[99999] flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl shadow-2xl border border-white/10 dark:border-black/5 animate-bounce">
          <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span className="text-sm font-medium">{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Basic Settings */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl shadow-theme-xs space-y-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-white/[0.05]">
              {t("exams.formExamInfoSection", { defaultValue: "Thông tin bài kiểm tra" })}
            </h3>

            {/* Type selector */}
            <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800">
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">
                  {t("exams.formSaveToLibrary", { defaultValue: "Lưu vào kho (không gán lớp)" })}
                </p>
                <p className="text-[11px] text-gray-500">
                  {t("exams.formSaveToLibraryDesc", { defaultValue: "Bật để tạo quiz mẫu, có thể assign vào lớp sau" })}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={type === 2}
                  onChange={(e) => setType(e.target.checked ? 2 : 1)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-gray-600 peer-checked:bg-brand-500"></div>
              </label>
            </div>

            {/* Exam Skill Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {t("exams.formExamSkillLabel", { defaultValue: "Kỹ năng bài thi (Exam Skill)" })} <span className="text-error-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: 2, label: t("question.skillReading", { defaultValue: "Reading" }), icon: BookOpen, color: "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800" },
                  { type: 1, label: t("question.skillListening", { defaultValue: "Listening" }), icon: Volume2, color: "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800" },
                  { type: 4, label: t("question.skillWriting", { defaultValue: "Writing" }), icon: PenTool, color: "text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800" },
                ].map((s) => {
                  const Icon = s.icon;
                  const isSelected = examSkillType === s.type;
                  return (
                    <button
                      key={s.type}
                      type="button"
                      onClick={() => {
                        if (examSkillType !== s.type) {
                          setExamSkillType(s.type);
                          // Switching skill locks the picker to it — drop any already-selected
                          // questions from other skills so they don't get silently submitted
                          // while hidden from view.
                          setSelectedQuestionIds((prev) => prev.filter((qid) => getQuestionSkillType(qid) === s.type));
                        }
                      }}
                      className={`px-2.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? `ring-2 ring-brand-500 border-brand-500 ${s.color} shadow-xs`
                          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      {Icon && <Icon className="w-3.5 h-3.5" />}
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {t("exams.formTitleLabel", { defaultValue: "Tiêu đề bài kiểm tra" })} <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("exams.formTitlePlaceholder", { defaultValue: "VD: Bài kiểm tra chương 1 - Đại số" })}
                className="w-full h-11 px-3.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-brand-300 focus:outline-hidden dark:text-white"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {t("exams.formDescLabel", { defaultValue: "Mô tả" })}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder={t("exams.formDescPlaceholder", { defaultValue: "Mô tả chi tiết về bài kiểm tra, nội dung, yêu cầu..." })}
                className="w-full p-3 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-brand-300 focus:outline-hidden dark:text-white"
              />
            </div>

            {/* Target Class (Only if type === 1 Assigned) */}
            {type === 1 && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  {t("exams.formAssignClassLabel", { defaultValue: "Lớp học nhận bài" })}
                  {status === 1 && <span className="text-error-500"> *</span>}
                </label>
                <SearchableSelect
                  options={classes.map((c) => ({
                    value: c.id,
                    label: `${c.name} (${c.code})`,
                  }))}
                  value={classId ?? ""}
                  onChange={(val) => {
                    const newClassId = val ? Number(val) : null;
                    setClassId(newClassId);
                    const newClass = classes.find((c) => c.id === newClassId);
                    if (newClass && newClass.courseId !== null && newClass.courseId !== undefined) {
                      setSelectedQuestionIds((prev) =>
                        prev.filter((qid) => {
                          const q = questions.find((x) => x.id === qid);
                          let catId = q?.categoryId;
                          if (!catId && q?.passageId) {
                            const passage = questionPassages.find((p) => p.id === q.passageId);
                            catId = passage?.categoryId;
                          }
                          const cat = categories.find((c) => c.id === catId);
                          if (!cat || cat.courseId === null || cat.courseId === undefined) return true;
                          return cat.courseId === newClass.courseId;
                        })
                      );
                    }
                  }}
                  placeholder={t("exams.formClassPlaceholder", { defaultValue: "Không chọn lớp (tự do)" })}
                  onClear={() => setClassId(null)}
                />
                {selectedClass && (
                  <div className="mt-1.5 space-y-1">
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                      📅 {t("exams.classDateRangeInfo", { defaultValue: "Lớp hoạt động từ:" })} {formatDateDDMMYYYY(selectedClass.startDate) || "?"} - {formatDateDDMMYYYY(selectedClass.endDate) || "?"}
                    </p>
                    {selectedClass.courseName && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        {t("exams.classCourseFilterHint", { courseName: selectedClass.courseName, defaultValue: `💡 Đang hiển thị danh sách câu hỏi thuộc khóa học: ${selectedClass.courseName}` })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Time & Constraints */}
          <div className="p-6 bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl shadow-theme-xs space-y-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-white/[0.05]">
              {t("exams.formTimeSettingsSection", { defaultValue: "Cài đặt thời gian & Điểm số" })}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  {t("exams.formStartTimeLabel", { defaultValue: "Thời gian bắt đầu" })}
                  {status === 1 && type === 1 && <span className="text-error-500"> *</span>}
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full h-11 px-3 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-brand-300 focus:outline-hidden dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  {t("exams.formEndTimeLabel", { defaultValue: "Thời gian kết thúc" })}
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full h-11 px-3 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-brand-300 focus:outline-hidden dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  {t("exams.formDurationLabel", { defaultValue: "Thời lượng (phút)" })}
                </label>
                <input
                  type="number"
                  min={1}
                  value={duration}
                  onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full h-11 px-3.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-brand-300 focus:outline-hidden dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  {t("exams.formTotalScoreLabel", { defaultValue: "Tổng điểm" })}
                </label>
                <input
                  type="number"
                  min={1}
                  value={totalScore}
                  onChange={(e) => setTotalScore(Math.max(1, parseFloat(e.target.value) || 0))}
                  className="w-full h-11 px-3.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-brand-300 focus:outline-hidden dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  {t("exams.formPassingScoreLabel", { defaultValue: "Điểm đạt" })}
                </label>
                <input
                  type="number"
                  min={0}
                  value={passingScore}
                  onChange={(e) => setPassingScore(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full h-11 px-3.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-brand-300 focus:outline-hidden dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  {t("exams.formMaxAttemptsLabel", { defaultValue: "Số lượt làm bài" })}
                </label>
                <input
                  type="number"
                  min={1}
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full h-11 px-3.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-brand-300 focus:outline-hidden dark:text-white"
                />
              </div>
            </div>

            {/* Checkbox settings */}
            <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-white/[0.05]">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowLateSubmit}
                  onChange={(e) => setAllowLateSubmit(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("exams.formAllowLateSubmit", { defaultValue: "Cho phép nộp muộn sau khi hết hạn" })}
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shuffleQuestion}
                  onChange={(e) => setShuffleQuestion(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("exams.formShuffleQuestion", { defaultValue: "Xáo trộn câu hỏi ngẫu nhiên cho từng học sinh" })}
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAnswerAfter}
                  onChange={(e) => setShowAnswerAfter(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("exams.formShowAnswerAfter", { defaultValue: "Cho xem đáp án đúng sau khi nộp bài" })}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Passage & Question Selection */}
        <div className="lg:col-span-6 space-y-6">
          <div
            className={`p-5 bg-white dark:bg-white/[0.03] rounded-2xl border shadow-theme-xs flex flex-col h-[560px] ${
              selectedQuestionIds.length === 0
                ? "border-error-300 dark:border-error-500/40"
                : "border-gray-100 dark:border-white/[0.05]"
            }`}
          >
            {/* Top Bar: Title & Select All */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/[0.05]">
              <h3
                className={`text-sm font-bold uppercase tracking-wider ${
                  selectedQuestionIds.length === 0
                    ? "text-error-600 dark:text-error-400"
                    : "text-gray-900 dark:text-white"
                }`}
              >
                {t("exams.formSelectQuestion", { defaultValue: "CHỌN CÂU HỎI" })} ({selectedQuestionIds.length})
                {selectedQuestionIds.length === 0 && (
                  <span className="ml-1.5 text-[10px] font-normal normal-case text-error-500">
                    {t("exams.formQuestionMinHint", { defaultValue: "— cần ít nhất 1 câu" })}
                  </span>
                )}
              </h3>
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="text-xs font-bold text-brand-500 hover:text-brand-600 transition-colors cursor-pointer"
              >
                {isAllFilteredSelected ? t("exams.formDeselectAll", { defaultValue: "Bỏ chọn tất cả" }) : t("exams.formSelectAll", { defaultValue: "Chọn tất cả" })}
              </button>
            </div>

            {/* Filters Section: Category, Skill, Search */}
            <div className="py-3 space-y-2.5 border-b border-gray-100 dark:border-white/[0.05]">
              {/* Category Dropdown */}
              <div>
                <select
                  value={selectedCategoryId ?? ""}
                  onChange={(e) => setSelectedCategoryId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-hidden dark:text-white cursor-pointer font-medium"
                >
                  <option value="">{t("question.filterCategoryAll", { defaultValue: "Tất cả danh mục" })}</option>
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.code})
                    </option>
                  ))}
                </select>
              </div>


              {/* Text Search */}
              <input
                type="text"
                value={questionSearch}
                onChange={(e) => setQuestionSearch(e.target.value)}
                placeholder={t("exams.formSearchQuestionPlaceholder", { defaultValue: "Tìm câu hỏi..." })}
                className="w-full h-9 px-3 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-hidden dark:text-white"
              />
            </div>

            {/* Question Passages & Questions Scrollable list */}
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1 pt-3">
              {filteredPassages.length === 0 && standaloneQuestions.length === 0 ? (
                <p className="text-center text-xs text-gray-500 py-10">
                  {t("exams.formNoQuestionsFound", { defaultValue: "Không tìm thấy bộ đề bài / câu hỏi nào." })}
                </p>
              ) : (
                <>
                  {/* Render Question Passages */}
                  {filteredPassages.map((passage) => {
                    const childQuestions = passageChildQuestionsMap.get(passage.id) || passage.questions || [];
                    const childQIds = childQuestions.map((q) => q.id);
                    const isAllSelected =
                      childQIds.length > 0 && childQIds.every((qid) => selectedQuestionIds.includes(qid));
                    const isSomeSelected =
                      childQIds.some((qid) => selectedQuestionIds.includes(qid)) && !isAllSelected;
                    const isExpanded = expandedPassageIds.includes(passage.id);

                    return (
                      <div
                        key={passage.id}
                        className={`rounded-xl border transition-all ${
                          isAllSelected || isSomeSelected
                            ? "bg-brand-50/20 border-brand-400 dark:bg-brand-950/20 dark:border-brand-700"
                            : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300"
                        }`}
                      >
                        {/* Passage Header */}
                        <div className="p-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={isAllSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = isSomeSelected;
                              }}
                              onChange={() => handleTogglePassage(passage)}
                              className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20 shrink-0 cursor-pointer"
                            />

                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider shrink-0 ${getSkillBadgeClass(
                                passage.skillType
                              )}`}
                            >
                              {getSkillName(passage.skillType)}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-bold text-gray-400">{passage.code}</span>
                                {passage.categoryName && (
                                  <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.2 rounded">
                                    {passage.categoryName}
                                  </span>
                                )}
                              </div>
                              <h4
                                onClick={() => toggleExpandPassage(passage.id)}
                                className="text-xs font-bold text-gray-900 dark:text-white truncate cursor-pointer hover:text-brand-500"
                              >
                                {passage.title}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-medium text-gray-500">
                              ({childQuestions.length} câu)
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleExpandPassage(passage.id)}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Passage Content & Child Questions */}
                        {isExpanded && (
                          <div className="p-3 pt-0 border-t border-gray-100 dark:border-gray-800 space-y-3 mt-1">
                            {/* Passage Prompt / Content Preview */}
                            {passage.content && (
                              <div className="p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-xs text-gray-700 dark:text-gray-300 space-y-1">
                                <span className="font-semibold text-gray-500 text-[10px] uppercase tracking-wider block">
                                  📖 Nội dung / Đề bài:
                                </span>
                                <p className="line-clamp-4 font-serif leading-relaxed">{passage.content}</p>
                              </div>
                            )}

                            {/* Audio Preview if present */}
                            {passage.audioUrl && (
                              <div className="p-2 bg-blue-50/60 dark:bg-blue-950/30 rounded-lg space-y-1">
                                <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                                  <Volume2 className="w-3.5 h-3.5" /> File âm thanh:
                                </span>
                                <audio controls src={getFileUrl(passage.audioUrl)} className="w-full h-8" />
                              </div>
                            )}

                            {/* Child Questions List */}
                            <div className="space-y-2 pt-1">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                                Danh sách câu hỏi ({childQuestions.length}):
                              </span>
                              {childQuestions.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">Chưa có câu hỏi nào trong bộ đề này.</p>
                              ) : (
                                childQuestions.map((q) => {
                                  const isQSelected = selectedQuestionIds.includes(q.id);
                                  return (
                                    <div
                                      key={q.id}
                                      onClick={() => handleToggleQuestion(q.id)}
                                      className={`p-2.5 rounded-lg border text-xs transition-all cursor-pointer flex items-start gap-2.5 ${
                                        isQSelected
                                          ? "bg-brand-50/50 border-brand-400 dark:bg-brand-950/20 dark:border-brand-700"
                                          : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-300"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isQSelected}
                                        readOnly
                                        className="h-3.5 w-3.5 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20 shrink-0 mt-0.5"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="font-bold text-gray-500">{q.code}</span>
                                          {examSkillType !== 4 && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-semibold text-gray-600 dark:text-gray-400">
                                              {q.point || 1} điểm
                                            </span>
                                          )}
                                        </div>
                                        <p className="font-medium text-gray-900 dark:text-white line-clamp-2 mt-0.5">
                                          {q.content || q.name}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Render Standalone Questions if any exist */}
                  {standaloneQuestions.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                        Câu hỏi đơn lẻ ({standaloneQuestions.length}):
                      </span>
                      {standaloneQuestions.map((q) => {
                        const isSelected = selectedQuestionIds.includes(q.id);
                        return (
                          <div
                            key={q.id}
                            onClick={() => handleToggleQuestion(q.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex gap-3 ${
                              isSelected
                                ? "bg-brand-500/5 border-brand-500 dark:border-brand-600"
                                : "border-gray-100 hover:border-gray-300 bg-white dark:bg-gray-900 dark:border-gray-800"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20 shrink-0 mt-0.5"
                            />
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-gray-500">{q.code}</p>
                              <p className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-1">
                                {q.name}
                              </p>
                              <p className="text-[11px] text-gray-400 line-clamp-1">{q.content}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Points preview footer — Writing is graded manually by staff per submission,
                not auto-scored per question, so a per-question point split doesn't apply. */}
            {examSkillType !== 4 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/[0.05] flex justify-between items-center text-xs">
                <span className="font-semibold text-gray-500">{t("exams.formPointPerQuestion", { defaultValue: "Điểm mỗi câu (ước tính):" })}</span>
                <span className="font-bold text-brand-500">
                  {selectedQuestionIds.length > 0
                    ? (totalScore / selectedQuestionIds.length).toFixed(2)
                    : 0}
                  {t("exams.formPointUnit", { defaultValue: "đ" })}
                </span>
              </div>
            )}
          </div>

          {/* Guidelines Infobox */}
          <div className="p-5 bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 rounded-2xl space-y-3">
            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-400 flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m11.25 11.25.041-.02a.75.75 0 1 1 1.085 1.086L13.07 13.07a.75.75 0 0 1-1.086-1.086l.041-.02-.026-.008a.75.75 0 0 0-.74.078L9.75 13.5a.75.75 0 0 1-1.085-1.086l1.587-1.587a.75.75 0 0 1 1.085-.02zM12 18.75a6.75 6.75 0 1 0 0-13.5 6.75 6.75 0 0 0 0 13.5z"
                />
              </svg>
              {t("exams.formGuideTitle", { defaultValue: "Hướng dẫn" })}
            </h4>
            <ul className="list-disc pl-4 text-xs text-blue-700 dark:text-blue-300 space-y-1.5">
              <li>{t("exams.formGuide1", { defaultValue: "Bài kiểm tra sẽ gắn cho tất cả học sinh trong lớp nhận bài." })}</li>
              <li>{t("exams.formGuide2", { defaultValue: "Thêm câu hỏi trước hoặc trong khi tạo bài kiểm tra từ ngân hàng." })}</li>
              <li>{t("exams.formGuide3", { defaultValue: "Điểm số của học sinh làm bài được tính toán tự động dựa trên tổng điểm và số câu đúng." })}</li>
              <li>{t("exams.formGuide4", { defaultValue: "Có thể lưu dạng Nháp và xuất bản sau khi hoàn thiện nội dung." })}</li>
            </ul>
          </div>

          {/* Publishing & Save options */}
          <div className="p-5 bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl shadow-theme-xs space-y-4">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-gray-700 dark:text-gray-300">{t("exams.formSaveAs", { defaultValue: "Lưu dưới dạng" })}</span>
              <select
                value={status}
                onChange={(e) => setStatus(Number(e.target.value))}
                className="h-9 px-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-hidden dark:text-white text-xs font-semibold cursor-pointer"
              >
                <option value="1">{t("exams.formStatusPublished", { defaultValue: "Đã xuất bản (Publish)" })}</option>
                <option value="2">{t("exams.formStatusDraft", { defaultValue: "Bản nháp (Draft)" })}</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push("/exams")}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
              >
                {t("exams.formBtnCancel", { defaultValue: "Hủy" })}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 rounded-lg shadow-theme-xs transition-colors cursor-pointer"
              >
                {isSubmitting
                  ? t("exams.formBtnSaving", { defaultValue: "Đang lưu..." })
                  : isEdit
                  ? t("exams.formBtnSaveChanges", { defaultValue: "Lưu thay đổi" })
                  : t("exams.formBtnCreate", { defaultValue: "Tạo bài kiểm tra" })}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

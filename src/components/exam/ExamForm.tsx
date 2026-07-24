"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { classApi, ClassItem } from "@/services/class.api";
import { questionApi, QuestionItem } from "@/services/question.api";
import { examApi, ExamSaveDto } from "@/services/exam.api";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

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
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [questionSearch, setQuestionSearch] = useState("");
  const [loadingData, setLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  // Load dropdown options – only Active classes are allowed to assign exams
  useEffect(() => {
    async function loadOptions() {
      try {
        const clsRes = await classApi.getAll(1, 1000);
        if (clsRes.success && clsRes.data) {
          // Filter to Active classes only for exam assignment
          setClasses((clsRes.data.items || []).filter((c) => c.status === CLASS_STATUS_ACTIVE));
        }
        const qRes = await questionApi.getAll(1, 1000);
        if (qRes.success && qRes.data) {
          setQuestions(qRes.data.items || []);
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
          setFormError(res.message || t("exams.formErrorLoadFailed"));
        }
      } catch (err: any) {
        setFormError(err.message || t("exams.formErrorLoadDetail"));
      } finally {
        setLoadingData(false);
      }
    }
    loadDetail();
  }, [id]);

  // Questions local search
  const filteredQuestions = useMemo(() => {
    if (!questionSearch.trim()) return questions;
    const term = questionSearch.toLowerCase();
    return questions.filter(
      (q) =>
        q.name.toLowerCase().includes(term) ||
        q.content.toLowerCase().includes(term) ||
        q.code.toLowerCase().includes(term)
    );
  }, [questions, questionSearch]);

  const handleToggleQuestion = (questionId: number) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(questionId) ? prev.filter((x) => x !== questionId) : [...prev, questionId]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredQuestions.map((q) => q.id);
    const someUnselected = allFilteredIds.some((qid) => !selectedQuestionIds.includes(qid));

    if (someUnselected) {
      setSelectedQuestionIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    } else {
      setSelectedQuestionIds((prev) => prev.filter((qid) => !allFilteredIds.includes(qid)));
    }
  };

  const isAllFilteredSelected = useMemo(() => {
    if (filteredQuestions.length === 0) return false;
    return filteredQuestions.every((q) => selectedQuestionIds.includes(q.id));
  }, [filteredQuestions, selectedQuestionIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // ── Validation ──────────────────────────────────────────────────────────
    // 1. Must have at least 1 question
    if (selectedQuestionIds.length === 0) {
      setFormError(t("exams.formValidationMinQuestion"));
      return;
    }

    // 2. Published + Assigned: class and start time are mandatory
    //    (Draft or Template can be saved without these)
    const isPublished = status === 1;   // 1 = Published, 2 = Draft
    const isAssigned  = type === 1;     // 1 = Assigned to class, 2 = Template/bank

    if (isPublished && isAssigned) {
      if (!classId) {
        setFormError(t("exams.formValidationNeedClass"));
        return;
      }
      if (!startTime) {
        setFormError(t("exams.formValidationNeedStartTime"));
        return;
      }
    }

    // 3. Validate end time vs start time
    if (startTime && endTime) {
      const examStart = new Date(startTime);
      const examEnd = new Date(endTime);
      if (examEnd <= examStart) {
        setFormError(t("exams.formValidationEndBeforeStart"));
        return;
      }
    }

    // 4. If assigned to a class and classId is set, validate time range against class dates
    if (type === 1 && classId !== null) {
      const cls = classes.find((c) => c.id === classId);
      if (cls) {
        const classStart = cls.startDate ? new Date(cls.startDate) : null;
        const classEnd = cls.endDate ? new Date(cls.endDate) : null;
        const examStart = startTime ? new Date(startTime) : null;
        const examEnd = endTime ? new Date(endTime) : null;

        if (classStart && examStart && examStart < classStart) {
          setFormError(t("exams.formValidationStartBeforeClass", { date: formatDateDDMMYYYY(cls.startDate) }));
          return;
        }
        if (classEnd && examEnd && examEnd > classEnd) {
          setFormError(t("exams.formValidationEndAfterClass", { date: formatDateDDMMYYYY(cls.endDate) }));
          return;
        }
        if (classEnd && examStart && examStart > classEnd) {
          setFormError(t("exams.formValidationStartAfterClassEnd", { date: formatDateDDMMYYYY(cls.endDate) }));
          return;
        }
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    setIsSubmitting(true);
    setFormError(null);

    const dto: ExamSaveDto = {
      id,
      title: title.trim(),
      description: description.trim() || undefined,
      classId: type === 1 ? classId : null,
      scheduleId: null,
      type,
      startTime: startTime ? new Date(startTime).toISOString() : null,
      endTime: endTime ? new Date(endTime).toISOString() : null,
      duration: duration || null,
      totalScore: totalScore || null,
      passingScore: passingScore || null,
      maxAttempts: maxAttempts || null,
      allowLateSubmit,
      shuffleQuestion,
      showAnswerAfter,
      status,
      questionIds: selectedQuestionIds,
    };

    try {
      const res = isEdit ? await examApi.update(id!, dto) : await examApi.create(dto);
      if (res.success) {
        sessionStorage.setItem("examToastMessage", isEdit ? t("exams.formSuccessEdit") : t("exams.formSuccessCreate"));
        sessionStorage.setItem("examToastType", "success");
        router.push("/exams");
      } else {
        setFormError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("exams.formErrorSave"));
      }
    } catch (err: any) {
      setFormError(err.message || t("exams.formErrorSystem"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-gray-500">
        {t("exams.formLoading")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-950 dark:text-white">
            {isEdit ? t("exams.formEditTitle") : t("exams.formCreateTitle")}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {t("exams.formBreadcrumbHome")} - {t("exams.formBreadcrumbExams")} - {isEdit ? t("exams.formBreadcrumbEdit") : t("exams.formBreadcrumbCreate")}
          </p>
        </div>
        <button
          onClick={() => router.push("/exams")}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-theme-xs rounded-lg h-11"
        >
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          {t("exams.formBackBtn")}
        </button>
      </div>

      {formError && (
        <div className="p-3.5 bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400 text-sm rounded-lg border border-error-100 dark:border-error-500/20">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns (Inputs and settings) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Basic Info */}
          <div className="p-6 bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/[0.05] shadow-theme-xs space-y-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {t("exams.formSectionBasicInfo")}
            </h3>
            
            {/* Template Toggle */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/[0.05]">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{t("exams.formTemplateLabel")}</p>
                <p className="text-xs text-gray-500">{t("exams.formTemplateHint")}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={type === 2}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setType(isChecked ? 2 : 1);
                    if (isChecked) setClassId(null);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
              </label>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t("exams.formTitleLabel")} <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("exams.formTitlePlaceholder")}
                className="w-full h-11 px-3.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-brand-300 dark:focus:border-brand-800 focus:outline-hidden dark:text-white"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t("exams.formDescLabel")}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("exams.formDescPlaceholder")}
                className="w-full min-h-[120px] p-3.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-brand-300 dark:focus:border-brand-800 focus:outline-hidden dark:text-white"
              />
            </div>

            {/* Class selection if NOT template */}
            {type === 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t("exams.formClassLabel")}
                  <span className="ml-1.5 text-[10px] font-normal text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-1.5 py-0.5 rounded-md">
                    {t("exams.formClassActiveOnly")}
                  </span>
                </label>
                <SearchableSelect
                  value={classId || ""}
                  onChange={(value) => setClassId(value ? Number(value) : null)}
                  options={classes.map((cls) => ({ value: cls.id, label: cls.name }))}
                  placeholder={t("exams.formClassPlaceholder")}
                  onClear={() => setClassId(null)}
                />
                {selectedClass && (selectedClass.startDate || selectedClass.endDate) && (
                  <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 shrink-0 text-brand-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                    </svg>
                    {t("exams.formClassDateRange")}
                    {selectedClass.startDate && (
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {formatDateDDMMYYYY(selectedClass.startDate)}
                      </span>
                    )}
                    {selectedClass.startDate && selectedClass.endDate && <span>–</span>}
                    {selectedClass.endDate && (
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {formatDateDDMMYYYY(selectedClass.endDate)}
                      </span>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Card 2: Date Settings */}
          <div className="p-6 bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/[0.05] shadow-theme-xs space-y-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {t("exams.formSectionTimeSettings")}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t("exams.formStartTime")}
                </label>
                <input
                  type="datetime-local"
                  lang="en-GB"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full h-11 px-3.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-brand-300 focus:outline-hidden dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t("exams.formEndTime")}
                </label>
                <input
                  type="datetime-local"
                  lang="en-GB"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full h-11 px-3.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-brand-300 focus:outline-hidden dark:text-white"
                />
              </div>
            </div>

            {/* Exam properties grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  {t("exams.formDurationLabel")}
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
                  {t("exams.formTotalScoreLabel")}
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
                  {t("exams.formPassingScoreLabel")}
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
                  {t("exams.formMaxAttemptsLabel")}
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
                  {t("exams.formAllowLateSubmit")}
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
                  {t("exams.formShuffleQuestion")}
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
                  {t("exams.formShowAnswerAfter")}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Question Selection and Guidelines */}
        <div className="space-y-6">
          {/* Question Bank select grid */}
          <div className={`p-5 bg-white dark:bg-white/[0.03] rounded-2xl border shadow-theme-xs flex flex-col h-[400px] ${
            selectedQuestionIds.length === 0
              ? "border-error-300 dark:border-error-500/40"
              : "border-gray-100 dark:border-white/[0.05]"
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/[0.05]">
              <h3 className={`text-sm font-bold uppercase tracking-wider ${
                selectedQuestionIds.length === 0
                  ? "text-error-600 dark:text-error-400"
                  : "text-gray-900 dark:text-white"
              }`}>
                {t("exams.formSelectQuestion")} ({selectedQuestionIds.length})
                {selectedQuestionIds.length === 0 && (
                  <span className="ml-1.5 text-[10px] font-normal normal-case text-error-500">{t("exams.formQuestionMinHint")}</span>
                )}
              </h3>
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="text-xs font-bold text-brand-500 hover:text-brand-600 transition-colors"
              >
                {isAllFilteredSelected ? t("exams.formDeselectAll") : t("exams.formSelectAll")}
              </button>
            </div>

            {/* Questions Search */}
            <div className="my-3">
              <input
                type="text"
                value={questionSearch}
                onChange={(e) => setQuestionSearch(e.target.value)}
                placeholder={t("exams.formSearchQuestionPlaceholder")}
                className="w-full h-10 px-3 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-hidden dark:text-white"
              />
            </div>

            {/* Questions Scrollable list */}
            <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
              {filteredQuestions.length === 0 ? (
                <p className="text-center text-xs text-gray-500 py-10">{t("exams.formNoQuestionsFound")}</p>
              ) : (
                filteredQuestions.map((q) => {
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
                        <p className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-1">{q.name}</p>
                        <p className="text-[11px] text-gray-400 line-clamp-1">{q.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Points preview footer */}
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/[0.05] flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-500">{t("exams.formPointPerQuestion")}</span>
              <span className="font-bold text-brand-500">
                {selectedQuestionIds.length > 0
                  ? (totalScore / selectedQuestionIds.length).toFixed(2)
                  : 0}
                {t("exams.formPointUnit")}
              </span>
            </div>
          </div>

          {/* Guidelines Infobox */}
          <div className="p-5 bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 rounded-2xl space-y-3">
            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-400 flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 1 1 1.085 1.086L13.07 13.07a.75.75 0 0 1-1.086-1.086l.041-.02-.026-.008a.75.75 0 0 0-.74.078L9.75 13.5a.75.75 0 0 1-1.085-1.086l1.587-1.587a.75.75 0 0 1 1.085-.02zM12 18.75a6.75 6.75 0 1 0 0-13.5 6.75 6.75 0 0 0 0 13.5z" />
              </svg>
              {t("exams.formGuideTitle")}
            </h4>
            <ul className="list-disc pl-4 text-xs text-blue-700 dark:text-blue-300 space-y-1.5">
              <li>{t("exams.formGuide1")}</li>
              <li>{t("exams.formGuide2")}</li>
              <li>{t("exams.formGuide3")}</li>
              <li>{t("exams.formGuide4")}</li>
            </ul>
          </div>

          {/* Publishing & Save options */}
          <div className="p-5 bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl shadow-theme-xs space-y-4">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-gray-700 dark:text-gray-300">{t("exams.formSaveAs")}</span>
              <select
                value={status}
                onChange={(e) => setStatus(Number(e.target.value))}
                className="h-9 px-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-hidden dark:text-white text-xs font-semibold"
              >
                <option value="1">{t("exams.formStatusPublished")}</option>
                <option value="2">{t("exams.formStatusDraft")}</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push("/exams")}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {t("exams.formBtnCancel")}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 rounded-lg shadow-theme-xs transition-colors"
              >
                {isSubmitting ? t("exams.formBtnSaving") : isEdit ? t("exams.formBtnSaveChanges") : t("exams.formBtnCreate")}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

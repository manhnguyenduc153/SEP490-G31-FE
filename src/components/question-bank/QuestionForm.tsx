"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { questionCategoryApi, QuestionCategoryItem } from "@/services/questionCategory.api";
import { questionPassageApi, QuestionPassageSaveDto } from "@/services/questionPassage.api";
import { questionApi, QuestionSaveDto, QuestionAnswerDto } from "@/services/question.api";
import { CodeHelper } from "@/helpers/CodeHelper";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Volume2, BookOpen, PenTool, Mic, Save, ArrowLeft, HelpCircle, CheckSquare, Upload, Image as ImageIcon, XCircle } from "lucide-react";

import { ENV } from "@/config/env";

interface QuestionFormProps {
  id?: number; // If provided, we are in Edit mode
}

const getFileUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }
  return `${ENV.API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

export function QuestionForm({ id }: QuestionFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const isEdit = !!id;

  // ── Passage States ──
  const [passageCode, setPassageCode] = useState("");
  const [passageTitle, setPassageTitle] = useState("");
  const [passageContent, setPassageContent] = useState("");
  const [passageAudioUrl, setPassageAudioUrl] = useState("");
  const [passageAttachmentUrl, setPassageAttachmentUrl] = useState("");
  // Backend SkillType Enum: 1 = Listening, 2 = Reading, 3 = Speaking, 4 = Writing
  const [skillType, setSkillType] = useState<number>(2);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  // ── Child Questions List ──
  const [childQuestions, setChildQuestions] = useState<QuestionSaveDto[]>([
    {
      code: "Q_1",
      name: "Question 1",
      content: "",
      questionType: 1, // 1 = Single Choice
      difficultyLevel: 2, // Medium
      point: 1,
      explanation: "",
      answers: [
        { content: "Option A", isCorrect: true },
        { content: "Option B", isCorrect: false },
        { content: "Option C", isCorrect: false },
        { content: "Option D", isCorrect: false },
      ],
    },
  ]);

  // ── Options / Category loading ──
  const [categories, setCategories] = useState<QuestionCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Synchronous re-entrancy guard: `isSubmitting` state only disables the button after React
  // re-renders, leaving a window for a fast double-click to fire handleSubmit twice. A ref is
  // updated immediately, closing that window.
  const isSubmittingRef = React.useRef(false);

  // Auto-dismiss the error toast, mirroring ExamForm's behavior.
  useEffect(() => {
    if (!formError) return;
    const timeout = setTimeout(() => setFormError(null), 3000);
    return () => clearTimeout(timeout);
  }, [formError]);

  // ── Upload Audio Handler ──
  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAudio(true);
    try {
      const res = await questionPassageApi.uploadFile(file);
      if (res.success && res.data) {
        setPassageAudioUrl(res.data);
      } else {
        setFormError(res.message || t("questionPassage.uploadError"));
      }
    } catch {
      setFormError(t("questionPassage.uploadError"));
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const res = await questionPassageApi.uploadImage(file);
      if (res.success && res.data) {
        setPassageAttachmentUrl(res.data);
      } else {
        setFormError(res.message || t("questionPassage.uploadImageError"));
      }
    } catch {
      setFormError(t("questionPassage.uploadImageError"));
    } finally {
      setIsUploadingImage(false);
    }
  };

  // ── Load Categories ──
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await questionCategoryApi.getAll(1, 100);
        if (res.success && res.data) {
          setCategories(res.data.items || []);
          if (!isEdit && res.data.items && res.data.items.length > 0) {
            setSelectedCategory(res.data.items[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    }
    loadCategories();
  }, [isEdit]);

  // ── Load Detail for Edit ──
  useEffect(() => {
    if (!id) {
      setPassageCode(CodeHelper.generate("QP"));
      return;
    }

    async function loadDetail() {
      setIsLoading(true);
      try {
        // 1. Try loading as QuestionPassage first
        const res = await questionPassageApi.getById(id!);
        if (res.success && res.data) {
          const data = res.data;
          setPassageCode(data.code);
          setPassageTitle(data.title);
          setPassageContent(data.content ?? "");
          setPassageAudioUrl(data.audioUrl ?? "");
          setPassageAttachmentUrl(data.attachmentUrl ?? "");
          setSkillType(data.skillType ?? 2);
          setSelectedCategory(data.categoryId ?? null);

          if (data.questions && data.questions.length > 0) {
            setChildQuestions(
              data.questions.map((q, idx) => ({
                id: q.id,
                code: q.code || `Q_${idx + 1}`,
                name: q.name || `Question ${idx + 1}`,
                content: q.content,
                instruction: q.instruction ?? "",
                questionType: q.questionType,
                difficultyLevel: q.difficultyLevel,
                point: q.point ?? 1,
                explanation: q.explanation ?? "",
                mediaUrl: q.mediaUrl ?? "",
                answers: (q.answers || q.questionAnswers || []).map((a) => ({
                  id: a.id,
                  content: a.content,
                  isCorrect: a.isCorrect,
                })),
              }))
            );
          }
          return;
        }

        // 2. Fallback: Try loading as standalone Question if QuestionPassage not found
        const qRes = await questionApi.getById(id!);
        if (qRes.success && qRes.data) {
          const qData = qRes.data;
          setPassageCode(qData.code || CodeHelper.generate("QP"));
          setPassageTitle(qData.name || qData.content);
          setPassageContent(qData.content ?? "");
          setPassageAudioUrl(qData.mediaUrl ?? "");
          setSkillType(qData.skillType ?? 2);
          setSelectedCategory(qData.categoryId ?? null);
          setChildQuestions([
            {
              id: qData.id,
              code: qData.code,
              name: qData.name,
              content: qData.content,
              instruction: qData.instruction ?? "",
              questionType: qData.questionType,
              difficultyLevel: qData.difficultyLevel,
              point: qData.point ?? 1,
              explanation: qData.explanation ?? "",
              mediaUrl: qData.mediaUrl ?? "",
              answers: (qData.answers || qData.questionAnswers || []).map((a) => ({
                id: a.id,
                content: a.content,
                isCorrect: a.isCorrect,
              })),
            },
          ]);
          return;
        }

        setFormError(t("questionPassage.errLoadDetail"));
      } catch {
        setFormError(t("questionPassage.errNetwork"));
      } finally {
        setIsLoading(false);
      }
    }
    loadDetail();
  }, [id, t]);

  // ── Add/Remove Question ──
  const handleAddQuestion = () => {
    const defaultQType = 1;
    setChildQuestions((prev) => [
      ...prev,
      {
        code: `Q_${prev.length + 1}`,
        name: `Question ${prev.length + 1}`,
        content: "",
        questionType: defaultQType,
        difficultyLevel: 2,
        point: 1,
        explanation: "",
        answers: [
          { content: `${t("questionPassage.answerPlaceholder", { label: "A" })}`, isCorrect: true },
          { content: `${t("questionPassage.answerPlaceholder", { label: "B" })}`, isCorrect: false },
        ],
      },
    ]);
  };

  const handleRemoveQuestion = (qIndex: number) => {
    if (childQuestions.length <= 1) {
      setFormError(t("questionPassage.errChildEmpty"));
      return;
    }
    setChildQuestions((prev) => prev.filter((_, idx) => idx !== qIndex));
  };

  // ── Update Question Property ──
  const handleUpdateQuestion = (qIndex: number, field: keyof QuestionSaveDto, value: any) => {
    setChildQuestions((prev) =>
      prev.map((q, idx) => (idx === qIndex ? { ...q, [field]: value } : q))
    );
  };

  // Switching into True/False/Not Given, Fill-in-Blank or Paragraph Matching needs a
  // fundamentally different answer-list shape, so seed a sensible default for those.
  const handleChangeQuestionType = (qIndex: number, newType: number) => {
    setChildQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIndex) return q;
        let answers = q.answers;
        if (newType === 4) {
          answers = [
            { content: "True", isCorrect: false },
            { content: "False", isCorrect: false },
            { content: "Not Given", isCorrect: false },
          ];
        } else if (newType === 6) {
          answers = [{ content: "", isCorrect: true }];
        } else if (newType === 7) {
          answers = ["A", "B", "C", "D", "E"].map((label) => ({ content: label, isCorrect: false }));
        }
        return { ...q, questionType: newType, answers };
      })
    );
  };

  // ── Answer Actions for Child Question ──
  // Types 1 (SingleChoice) and 4 (TrueFalse/NotGiven) only ever allow one correct option
  // at a time (ParagraphMatching's correct answer is set via its own dropdown, not this toggle).
  const isSingleCorrectType = (questionType: number) => questionType === 1 || questionType === 4;

  const handleAddAnswer = (qIndex: number) => {
    setChildQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIndex) return q;
        const currentAns = q.answers || [];
        const label = String.fromCharCode(65 + currentAns.length);
        const isFillInBlank = q.questionType === 6;
        const isParagraphMatching = q.questionType === 7;
        return {
          ...q,
          answers: [
            ...currentAns,
            isFillInBlank
              ? { content: "", isCorrect: true }
              : { content: isParagraphMatching ? label : t("questionPassage.answerPlaceholder", { label }), isCorrect: false },
          ],
        };
      })
    );
  };

  const handleRemoveAnswer = (qIndex: number, aIndex: number) => {
    setChildQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIndex) return q;
        const currentAns = q.answers || [];
        const minAllowed = q.questionType === 6 ? 1 : 2;
        if (currentAns.length <= minAllowed) {
          setFormError(minAllowed === 1 ? t("questionPassage.errMinOneAcceptedAnswer") : t("question.valMinAnswers"));
          return q;
        }
        let remaining = currentAns.filter((_, ai) => ai !== aIndex);
        // Keep paragraph letters contiguous (A, B, C…) after removing one from the middle.
        if (q.questionType === 7) {
          remaining = remaining.map((a, i) => ({ ...a, content: String.fromCharCode(65 + i) }));
        }
        return {
          ...q,
          answers: remaining,
        };
      })
    );
  };

  // Paragraph Matching: pick the single correct paragraph letter via dropdown.
  const handleSetParagraphCorrect = (qIndex: number, letter: string) => {
    setChildQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIndex) return q;
        return {
          ...q,
          answers: (q.answers || []).map((a) => ({ ...a, isCorrect: a.content === letter })),
        };
      })
    );
  };

  const handleUpdateAnswerText = (qIndex: number, aIndex: number, text: string) => {
    setChildQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIndex) return q;
        const currentAns = q.answers || [];
        return {
          ...q,
          answers: currentAns.map((a, ai) => (ai === aIndex ? { ...a, content: text } : a)),
        };
      })
    );
  };

  const handleToggleAnswerCorrect = (qIndex: number, aIndex: number) => {
    setChildQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIndex) return q;
        const currentAns = q.answers || [];
        const isSingleChoice = isSingleCorrectType(q.questionType);

        return {
          ...q,
          answers: currentAns.map((a, ai) => {
            if (ai === aIndex) return { ...a, isCorrect: !a.isCorrect };
            if (isSingleChoice) return { ...a, isCorrect: false };
            return a;
          }),
        };
      })
    );
  };

  // ── Submit Form ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setFormError(null);

    if (!passageTitle.trim()) {
      setFormError(t("questionPassage.errTitleEmpty"));
      isSubmittingRef.current = false;
      return;
    }

    let questionsToSubmit: QuestionSaveDto[] = [];

    // Backend SkillType Enum: 1 = Listening, 2 = Reading, 3 = Speaking, 4 = Writing
    if (skillType === 1 || skillType === 2) {
      if (childQuestions.length === 0) {
        setFormError(t("questionPassage.errChildEmpty"));
        isSubmittingRef.current = false;
        return;
      }

      // Validate child questions for Listening & Reading
      let validationFailed = false;
      for (let i = 0; i < childQuestions.length; i++) {
        const q = childQuestions[i];
        if (!q.content.trim()) {
          setFormError(t("questionPassage.errQuestionContentEmpty", { index: i + 1 }));
          validationFailed = true;
          break;
        }
        const needsAnswers = q.questionType === 1 || q.questionType === 2 || q.questionType === 4 || q.questionType === 6 || q.questionType === 7;
        if (needsAnswers && (!q.answers || q.answers.length === 0)) {
          setFormError(t("questionPassage.errAnswersEmpty", { index: i + 1 }));
          validationFailed = true;
          break;
        }
        // Fill-in-Blank has no "correct" toggle — every listed answer is an accepted variant.
        if (needsAnswers && q.questionType !== 6 && !q.answers?.some((a) => a.isCorrect)) {
          setFormError(t("questionPassage.errNoCorrectAnswer", { index: i + 1 }));
          validationFailed = true;
          break;
        }
      }
      if (validationFailed) {
        isSubmittingRef.current = false;
        return;
      }
      questionsToSubmit = childQuestions;
    } else {
      // Speaking (skillType = 3) or Writing (skillType = 4)
      // In BE QuestionType: 3 = Essay (Text), 5 = AudioRecord (Ghi âm)
      questionsToSubmit = [
        {
          code: `${passageCode}_Q1`,
          name: passageTitle,
          content: passageContent || passageTitle,
          questionType: skillType === 3 ? 5 : 3, // 5 = Audio Record (Speaking), 3 = Essay Text (Writing)
          skillType: skillType,
          difficultyLevel: 2,
          point: 1,
          answers: [],
        },
      ];
    }

    setIsSubmitting(true);
    try {
      const payload: QuestionPassageSaveDto = {
        id: id || 0,
        code: passageCode.trim(),
        title: passageTitle.trim(),
        content: passageContent.trim(),
        audioUrl: passageAudioUrl.trim(),
        attachmentUrl: passageAttachmentUrl.trim(),
        skillType: skillType,
        categoryId: selectedCategory,
        questions: questionsToSubmit,
      };

      let res;
      if (isEdit) {
        res = await questionPassageApi.update(id!, payload);
      } else {
        res = await questionPassageApi.create(payload);
      }

      if (res.success) {
        sessionStorage.setItem("questionToastMessage", isEdit ? t("questionPassage.updateSuccess") : t("questionPassage.createSuccess"));
        sessionStorage.setItem("questionToastType", "success");
        router.push("/question-bank");
      } else {
        setFormError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("questionPassage.errSaveFail"));
      }
    } catch {
      setFormError(t("questionPassage.errNetwork"));
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const getSkillName = () => {
    switch (skillType) {
      case 1: return t("questionPassage.skillListening");
      case 2: return t("questionPassage.skillReading");
      case 3: return t("questionPassage.skillSpeaking");
      case 4: return t("questionPassage.skillWriting");
      default: return t("questionPassage.skillReading");
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-16 space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/question-bank")}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {isEdit ? t("questionPassage.titleEdit") : t("questionPassage.titleCreate")}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {t("questionPassage.descHeader")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/question-bank")}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 transition-colors"
          >
            {t("questionPassage.btnCancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-theme-xs transition-colors cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? t("questionPassage.btnSaving") : isEdit ? t("questionPassage.btnUpdate") : t("questionPassage.btnSave")}
          </button>
        </div>
      </div>

      {formError && (
        <div className="fixed bottom-5 right-5 z-[999999] flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl shadow-2xl border border-white/10 dark:border-black/5 animate-bounce">
          <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span className="text-sm font-medium">{formError}</span>
        </div>
      )}

      {/* Step 1: Selection & Settings */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-brand-500" />
          {t("questionPassage.step1Title")}
        </h2>

        {/* Skill Selection Tabs (BE Enum: 1=Listening, 2=Reading, 3=Speaking, 4=Writing) */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {t("questionPassage.skillLabel")} <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { type: 2, name: t("questionPassage.skillReading"), icon: BookOpen },
              { type: 1, name: t("questionPassage.skillListening"), icon: Volume2 },
              { type: 3, name: t("questionPassage.skillSpeaking"), icon: Mic },
              { type: 4, name: t("questionPassage.skillWriting"), icon: PenTool },
            ]
              .filter((s) => !isEdit || s.type === skillType)
              .map((s) => {
                const Icon = s.icon;
                const isSelected = skillType === s.type;
                return (
                  <button
                    key={s.type}
                    type="button"
                    disabled={isEdit}
                    onClick={() => !isEdit && setSkillType(s.type)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 font-medium transition-all ${
                      isSelected
                        ? "border-brand-500 bg-brand-50/40 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 shadow-sm"
                        : "border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700"
                    } ${isEdit ? "cursor-default" : ""}`}
                  >
                    <Icon className={`w-6 h-6 mb-2 ${isSelected ? "text-brand-500" : "text-gray-400"}`} />
                    <span className="text-sm font-semibold">{s.name}</span>
                  </button>
                );
              })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("questionPassage.categoryLabel")} <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedCategory ?? ""}
              onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-xl border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="" className="dark:bg-gray-900">{t("questionPassage.categorySelectPlaceholder")}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id} className="dark:bg-gray-900">
                  {cat.name} ({cat.code})
                </option>
              ))}
            </select>
          </div>

          {/* Passage Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("questionPassage.codeLabel")} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={passageCode}
              onChange={(e) => setPassageCode(e.target.value)}
              placeholder={t("questionPassage.codePlaceholder")}
              className="w-full rounded-xl border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Step 2: Passage / Prompt Details */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          {skillType === 1 && <Volume2 className="w-5 h-5 text-blue-500" />}
          {skillType === 2 && <BookOpen className="w-5 h-5 text-emerald-500" />}
          {skillType === 4 && <PenTool className="w-5 h-5 text-purple-500" />}
          {skillType === 3 && <Mic className="w-5 h-5 text-amber-500" />}
          {t("questionPassage.step2Title", { skillName: getSkillName() })}
        </h2>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("questionPassage.passageTitleLabel")} <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={passageTitle}
            onChange={(e) => setPassageTitle(e.target.value)}
            placeholder={
              skillType === 2
                ? t("questionPassage.passageTitlePlaceholderReading")
                : skillType === 1
                ? t("questionPassage.passageTitlePlaceholderListening")
                : t("questionPassage.passageTitlePlaceholderWriting")
            }
            className="w-full rounded-xl border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white font-medium"
          />
        </div>

        {/* Skill Specific Input Fields */}
        {skillType === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("questionPassage.passageAudioUrlLabel")}
              </label>

              <div className="space-y-3">
                {/* File Upload Button */}
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300 rounded-xl cursor-pointer text-sm font-medium border border-brand-200 dark:border-brand-800 transition-colors shadow-xs">
                    <Upload className="w-4 h-4" />
                    {isUploadingAudio ? t("questionPassage.uploadingAudio") : t("questionPassage.uploadAudioBtn")}
                    <input
                      type="file"
                      accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac"
                      className="hidden"
                      onChange={handleAudioFileUpload}
                      disabled={isUploadingAudio}
                    />
                  </label>
                  <span className="text-xs text-gray-400 font-medium">
                    {t("questionPassage.uploadOrPaste")}
                  </span>
                </div>

                {/* Audio URL Input */}
                <input
                  type="text"
                  value={passageAudioUrl}
                  onChange={(e) => setPassageAudioUrl(e.target.value)}
                  placeholder="https://example.com/audio/section1.mp3"
                  className="w-full rounded-xl border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />

                {/* Audio Player Preview */}
                {passageAudioUrl && (
                  <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900 space-y-1.5">
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                      🎧 {t("questionPassage.audioPreviewLabel")}
                    </span>
                    <audio controls src={getFileUrl(passageAudioUrl)} className="w-full h-10 rounded-lg" />
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("questionPassage.passageTranscriptLabel")}
              </label>
              <textarea
                value={passageContent}
                onChange={(e) => setPassageContent(e.target.value)}
                rows={4}
                placeholder={t("questionPassage.passageTranscriptPlaceholder")}
                className="w-full rounded-xl border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white resize-none"
              />
            </div>
          </div>
        )}

        {skillType === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("questionPassage.passageReadingContentLabel")} <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={passageContent}
                onChange={(e) => setPassageContent(e.target.value)}
                rows={8}
                placeholder={t("questionPassage.passageReadingContentPlaceholder")}
                className="w-full rounded-xl border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white font-serif leading-relaxed"
              />
            </div>

            <PassageImageUpload
              t={t}
              imageUrl={passageAttachmentUrl}
              onImageUrlChange={setPassageAttachmentUrl}
              isUploading={isUploadingImage}
              onFileSelected={handleImageFileUpload}
              getFileUrl={getFileUrl}
            />
          </div>
        )}

        {skillType === 4 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("questionPassage.passageWritingPromptLabel")} <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={passageContent}
                onChange={(e) => setPassageContent(e.target.value)}
                rows={5}
                placeholder={t("questionPassage.passageWritingPromptPlaceholder")}
                className="w-full rounded-xl border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <PassageImageUpload
              t={t}
              imageUrl={passageAttachmentUrl}
              onImageUrlChange={setPassageAttachmentUrl}
              isUploading={isUploadingImage}
              onFileSelected={handleImageFileUpload}
              getFileUrl={getFileUrl}
            />

            <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-xl text-xs text-purple-700 dark:text-purple-300">
              {t("questionPassage.passageWritingNote")}
            </div>
          </div>
        )}

        {skillType === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("questionPassage.passageSpeakingPromptLabel")} <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={passageContent}
                onChange={(e) => setPassageContent(e.target.value)}
                rows={4}
                placeholder={t("questionPassage.passageSpeakingPromptPlaceholder")}
                className="w-full rounded-xl border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("questionPassage.passageSpeakingAudioLabel")}
              </label>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 rounded-xl cursor-pointer text-sm font-medium border border-amber-200 dark:border-amber-800 transition-colors shadow-xs">
                    <Upload className="w-4 h-4" />
                    {isUploadingAudio ? t("questionPassage.uploadingAudio") : t("questionPassage.uploadAudioBtn")}
                    <input
                      type="file"
                      accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac"
                      className="hidden"
                      onChange={handleAudioFileUpload}
                      disabled={isUploadingAudio}
                    />
                  </label>
                  <span className="text-xs text-gray-400 font-medium">
                    {t("questionPassage.uploadOrPaste")}
                  </span>
                </div>

                <input
                  type="text"
                  value={passageAudioUrl}
                  onChange={(e) => setPassageAudioUrl(e.target.value)}
                  placeholder="https://example.com/audio/speaking-prompt.mp3"
                  className="w-full rounded-xl border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />

                {passageAudioUrl && (
                  <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900 space-y-1.5">
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      🎧 {t("questionPassage.audioPreviewLabel")}
                    </span>
                    <audio controls src={getFileUrl(passageAudioUrl)} className="w-full h-10 rounded-lg" />
                  </div>
                )}
              </div>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-700 dark:text-amber-300">
              {t("questionPassage.passageSpeakingNote")}
            </div>
          </div>
        )}
      </div>

      {/* Step 3: Child Questions List (Only for Listening & Reading skills) */}
      {(skillType === 1 || skillType === 2) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-brand-500" />
              {t("questionPassage.step3Title", { count: childQuestions.length })}
            </h2>
            <button
              type="button"
              onClick={handleAddQuestion}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors dark:bg-brand-950/40 dark:text-brand-300"
            >
              <Plus className="w-4 h-4" />
              {t("questionPassage.btnAddChildQuestion")}
            </button>
          </div>

          {childQuestions.map((q, qIdx) => (
            <div
              key={qIdx}
              className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 relative"
            >
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold">
                    {qIdx + 1}
                  </span>
                  {t("questionPassage.childQuestionTitle", { index: qIdx + 1 })}
                </span>

                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(qIdx)}
                  className="p-1.5 text-gray-400 hover:text-rose-500 transition-colors"
                  title={t("question.deleteTooltip")}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Group Instruction (optional) — shown once above this question, e.g. for the first
                  question of a paragraph-matching or gap-fill group. Leave blank for other questions
                  in the same group. */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("questionPassage.colGroupInstruction")}
                </label>
                <textarea
                  value={q.instruction ?? ""}
                  onChange={(e) => handleUpdateQuestion(qIdx, "instruction", e.target.value)}
                  placeholder={t("questionPassage.colGroupInstructionPlaceholder")}
                  rows={2}
                  className="w-full rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white resize-y"
                />
                <p className="mt-1 text-[11px] text-gray-400">{t("questionPassage.colGroupInstructionHint")}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Question Content */}
                <div className="md:col-span-8">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {q.questionType === 7 ? t("questionPassage.colQuestionContentParagraphLabel") : t("questionPassage.colQuestionContent")}{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  {q.questionType === 6 ? (
                    <textarea
                      required
                      value={q.content}
                      onChange={(e) => handleUpdateQuestion(qIdx, "content", e.target.value)}
                      placeholder={t("questionPassage.colQuestionContentBlankPlaceholder")}
                      rows={2}
                      className="w-full rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white resize-y"
                    />
                  ) : (
                    <input
                      type="text"
                      required
                      value={q.content}
                      onChange={(e) => handleUpdateQuestion(qIdx, "content", e.target.value)}
                      placeholder={
                        q.questionType === 7
                          ? t("questionPassage.colQuestionContentParagraphPlaceholder")
                          : "e.g. What is the main idea of paragraph 1?"
                      }
                      className="w-full rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                  )}
                  {q.questionType === 7 && (
                    <p className="mt-1 text-[11px] text-gray-400">{t("questionPassage.colQuestionContentParagraphHint")}</p>
                  )}
                  {q.questionType === 6 && (
                    <p className="mt-1 text-[11px] text-gray-400">{t("questionPassage.colQuestionContentBlankHint")}</p>
                  )}
                </div>

                {/* Question Type */}
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("questionPassage.colQuestionType")}
                  </label>
                  <select
                    value={q.questionType}
                    onChange={(e) => handleChangeQuestionType(qIdx, Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value={1} className="dark:bg-gray-900">{t("questionPassage.typeSingleChoice")}</option>
                    <option value={2} className="dark:bg-gray-900">{t("questionPassage.typeMultipleChoice")}</option>
                    <option value={3} className="dark:bg-gray-900">{t("questionPassage.typeEssayText")}</option>
                    <option value={4} className="dark:bg-gray-900">{t("questionPassage.typeTrueFalse")}</option>
                    <option value={6} className="dark:bg-gray-900">{t("questionPassage.typeFillInBlank")}</option>
                    <option value={7} className="dark:bg-gray-900">{t("questionPassage.typeParagraphMatching")}</option>
                  </select>
                </div>
              </div>

              {/* Answer Options for Choice / True-False Questions */}
              {(q.questionType === 1 || q.questionType === 2 || q.questionType === 4) && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t("questionPassage.answersTitle")}
                    </label>
                    <div className="flex items-center gap-3">
                      {q.questionType === 4 && (
                        <button
                          type="button"
                          onClick={() => handleChangeQuestionType(qIdx, 4)}
                          className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                        >
                          {t("questionPassage.btnUseTfngTemplate")}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleAddAnswer(qIdx)}
                        className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                      >
                        {t("questionPassage.btnAddAnswer")}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {(q.answers || []).map((ans, aIdx) => (
                      <div key={aIdx} className="flex items-center gap-3">
                        <input
                          type={q.questionType === 2 ? "checkbox" : "radio"}
                          checked={ans.isCorrect}
                          onChange={() => handleToggleAnswerCorrect(qIdx, aIdx)}
                          className="w-4 h-4 text-brand-500 rounded focus:ring-brand-500 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-gray-500 w-6">
                          {String.fromCharCode(65 + aIdx)}.
                        </span>
                        <input
                          type="text"
                          value={ans.content}
                          onChange={(e) => handleUpdateAnswerText(qIdx, aIdx, e.target.value)}
                          placeholder={t("questionPassage.answerPlaceholder", { label: String.fromCharCode(65 + aIdx) })}
                          className="flex-1 rounded-xl border border-gray-300 bg-transparent px-3 py-1.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveAnswer(qIdx, aIdx)}
                          className="p-1 text-gray-400 hover:text-rose-500"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Paragraph Letters + Correct Paragraph Dropdown for Paragraph Matching Questions */}
              {q.questionType === 7 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t("questionPassage.paragraphLettersTitle")}
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAddAnswer(qIdx)}
                      className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                    >
                      {t("questionPassage.btnAddParagraph")}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(q.answers || []).map((ans, aIdx) => (
                      <span
                        key={aIdx}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300"
                      >
                        {ans.content}
                        <button
                          type="button"
                          onClick={() => handleRemoveAnswer(qIdx, aIdx)}
                          className="text-gray-400 hover:text-rose-500"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t("questionPassage.correctParagraphLabel")}
                    </label>
                    <select
                      value={(q.answers || []).find((a) => a.isCorrect)?.content ?? ""}
                      onChange={(e) => handleSetParagraphCorrect(qIdx, e.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    >
                      <option value="" disabled className="dark:bg-gray-900">
                        {t("questionPassage.selectCorrectParagraphPlaceholder")}
                      </option>
                      {(q.answers || []).map((ans, aIdx) => (
                        <option key={aIdx} value={ans.content} className="dark:bg-gray-900">
                          {ans.content}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Accepted Answers for Fill-in-the-Blank Questions */}
              {q.questionType === 6 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t("questionPassage.acceptedAnswersTitle")}
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAddAnswer(qIdx)}
                      className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                    >
                      {t("questionPassage.btnAddAcceptedAnswer")}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(q.answers || []).map((ans, aIdx) => (
                      <div key={aIdx} className="flex items-center gap-3">
                        <input
                          type="text"
                          value={ans.content}
                          onChange={(e) => handleUpdateAnswerText(qIdx, aIdx, e.target.value)}
                          placeholder={t("questionPassage.acceptedAnswerPlaceholder", { index: aIdx + 1 })}
                          className="flex-1 rounded-xl border border-gray-300 bg-transparent px-3 py-1.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveAnswer(qIdx, aIdx)}
                          className="p-1 text-gray-400 hover:text-rose-500"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Explanation */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("questionPassage.colExplanation")}
                </label>
                <textarea
                  value={q.explanation ?? ""}
                  onChange={(e) => handleUpdateQuestion(qIdx, "explanation", e.target.value)}
                  rows={2}
                  placeholder={t("questionPassage.colExplanationPlaceholder")}
                  className="w-full rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white resize-none"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Optional illustration image for the passage/prompt itself (Reading & Writing only —
// not shown for child questions or student answers).
function PassageImageUpload({
  t,
  imageUrl,
  onImageUrlChange,
  isUploading,
  onFileSelected,
  getFileUrl,
}: {
  t: (key: string, opts?: Record<string, unknown>) => string;
  imageUrl: string;
  onImageUrlChange: (value: string) => void;
  isUploading: boolean;
  onFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  getFileUrl: (url?: string) => string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {t("questionPassage.passageImageLabel")}
      </label>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl cursor-pointer text-sm font-medium border border-emerald-200 dark:border-emerald-800 transition-colors shadow-xs">
            <ImageIcon className="w-4 h-4" />
            {isUploading ? t("questionPassage.uploadingImage") : t("questionPassage.uploadImageBtn")}
            <input
              type="file"
              accept="image/png,image/jpeg,.jpg,.jpeg,.png"
              className="hidden"
              onChange={onFileSelected}
              disabled={isUploading}
            />
          </label>
          <span className="text-xs text-gray-400 font-medium">{t("questionPassage.uploadOrPaste")}</span>
        </div>

        <input
          type="text"
          value={imageUrl}
          onChange={(e) => onImageUrlChange(e.target.value)}
          placeholder="https://example.com/images/passage-diagram.png"
          className="w-full rounded-xl border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />

        {imageUrl && (
          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900 space-y-2">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              🖼️ {t("questionPassage.imagePreviewLabel")}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={getFileUrl(imageUrl)} alt="" className="max-h-64 rounded-lg border border-emerald-100 dark:border-emerald-900/50" />
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { questionApi, QuestionAnswerDto } from "@/services/question.api";
import { questionCategoryApi, QuestionCategoryItem } from "@/services/questionCategory.api";
import { CodeHelper } from "@/helpers/CodeHelper";
import { useTranslation } from "react-i18next";
import { TrashBinIcon } from "@/icons";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

interface QuestionFormProps {
  id?: number; // If provided, we are in Edit mode
}

export function QuestionForm({ id }: QuestionFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const isEdit = !!id;

  // ── Form States ──
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState(""); // Title
  const [formContent, setFormContent] = useState("");
  const [formType, setFormType] = useState<number>(1); // 1 = Chọn một, 2 = Chọn nhiều, 3 = Nhập text, 4 = Đúng/Sai
  const [formPoint, setFormPoint] = useState<number>(1);
  const [formDifficulty, setFormDifficulty] = useState<number>(2); // 2 = Trung bình
  const [formExplanation, setFormExplanation] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [formAnswers, setFormAnswers] = useState<QuestionAnswerDto[]>([
    { content: "Đáp án A", isCorrect: true },
    { content: "Đáp án B", isCorrect: false },
  ]);

  // ── Loading / Error states ──
  const [categories, setCategories] = useState<QuestionCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  // ── Load Question Detail for Edit ──
  useEffect(() => {
    if (!id) {
      setFormCode(CodeHelper.generate("Q"));
      return;
    }

    async function loadDetail() {
      setIsLoading(true);
      try {
        const res = await questionApi.getById(id!);
        if (res.success && res.data) {
          const data = res.data;
          setFormCode(data.code);
          setFormName(data.name);
          setFormContent(data.content);
          setFormType(data.questionType);
          setFormPoint(data.point ?? 1);
          setFormDifficulty(data.difficultyLevel);
          setFormExplanation(data.explanation ?? "");
          setSelectedCategory(data.categoryId ?? null);
          
          if (data.questionAnswers && data.questionAnswers.length > 0) {
            setFormAnswers(data.questionAnswers.map(a => ({
              id: a.id,
              content: a.content,
              isCorrect: a.isCorrect
            })));
          }
        } else {
          setFormError("Không thể tải thông tin câu hỏi.");
        }
      } catch {
        setFormError("Lỗi hệ thống khi tải chi tiết câu hỏi.");
      } finally {
        setIsLoading(false);
      }
    }

    loadDetail();
  }, [id]);

  // ── Handle change in Question Type ──
  const handleTypeChange = (type: number) => {
    setFormType(type);
    if (type === 4) {
      // Đúng / Sai
      setFormAnswers([
        { content: "Đúng", isCorrect: true },
        { content: "Sai", isCorrect: false }
      ]);
    } else if (type === 3) {
      // Nhập text
      setFormAnswers([]);
    } else {
      // Chọn một / Chọn nhiều
      setFormAnswers([
        { content: "", isCorrect: true },
        { content: "", isCorrect: false },
      ]);
    }
  };

  // ── Answer option actions ──
  const addAnswerOption = () => {
    if (formAnswers.length >= 6) return;
    setFormAnswers([...formAnswers, { content: "", isCorrect: false }]);
  };

  const removeAnswerOption = (index: number) => {
    if (formAnswers.length <= 2) return;
    const newAnswers = [...formAnswers];
    newAnswers.splice(index, 1);
    
    // Ensure at least one option is correct if we removed the correct one
    if (formAnswers[index].isCorrect) {
      newAnswers[0].isCorrect = true;
    }
    setFormAnswers(newAnswers);
  };

  const updateAnswerText = (index: number, val: string) => {
    const newAnswers = [...formAnswers];
    newAnswers[index].content = val;
    setFormAnswers(newAnswers);
  };

  const setCorrectAnswer = (index: number) => {
    const newAnswers = [...formAnswers];
    if (formType === 1 || formType === 4) {
      // Single choice or True/False: only one is correct
      newAnswers.forEach((ans, i) => {
        ans.isCorrect = i === index;
      });
    } else if (formType === 2) {
      // Multiple choice: toggle check
      newAnswers[index].isCorrect = !newAnswers[index].isCorrect;
    }
    setFormAnswers(newAnswers);
  };

  // ── Submit logic ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError("Tiêu đề câu hỏi không được để trống.");
      return;
    }
    if (!formContent.trim()) {
      setFormError("Nội dung câu hỏi không được để trống.");
      return;
    }

    if (formType !== 3) {
      if (formAnswers.length < 2) {
        setFormError("Phải điền tối thiểu 2 đáp án.");
        return;
      }
      if (formAnswers.length > 0 && formAnswers.some(a => !a.content.trim())) {
        setFormError("Nội dung các đáp án không được để trống.");
        return;
      }
      if (!formAnswers.some(a => a.isCorrect)) {
        setFormError("Vui lòng chọn ít nhất một đáp án đúng.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        code: formCode,
        name: formName.trim(),
        content: formContent.trim(),
        questionType: formType,
        difficultyLevel: formDifficulty,
        explanation: formExplanation.trim() || null,
        categoryId: selectedCategory,
        point: formPoint,
        questionAnswers: formAnswers.map(a => ({
          id: a.id,
          content: a.content.trim(),
          isCorrect: a.isCorrect
        }))
      };

      let res;
      if (isEdit) {
        res = await questionApi.update(id!, payload);
      } else {
        res = await questionApi.create(payload);
      }

      if (res.success) {
        sessionStorage.setItem("questionToastMessage", isEdit ? "Cập nhật câu hỏi thành công!" : "Tạo câu hỏi thành công!");
        sessionStorage.setItem("questionToastType", "success");
        router.push("/question-bank");
      } else {
        setFormError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : "Lỗi khi lưu câu hỏi.");
      }
    } catch (err) {
      setFormError("Lỗi kết nối mạng, vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <div className="h-8 w-8 rounded-full border-4 border-brand-500 border-t-transparent animate-spin mb-4" />
        <span className="text-sm font-medium text-gray-500">Đang tải thông tin câu hỏi...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6">
      {/* Left panel - Main info */}
      <div className="flex-1 space-y-6">
        {/* Card wrapper */}
        <div className="p-6 bg-white dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/[0.05] space-y-6">
          <h3 className="text-base font-bold text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-white/[0.05]">
            Thông tin câu hỏi
          </h3>

          {/* Title */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Tiêu đề câu hỏi <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="VD: [Listening Q1] Câu hỏi trắc nghiệm tiếng Anh"
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Nội dung câu hỏi <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Nhập nội dung câu hỏi hiển thị cho học sinh..."
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs resize-y"
            />
          </div>

          {/* Type Select */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Loại câu hỏi <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { type: 1, label: "Chọn một" },
                { type: 2, label: "Chọn nhiều" },
                { type: 3, label: "Nhập text" },
                { type: 4, label: "Đúng / Sai" }
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleTypeChange(item.type)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-all ${
                    formType === item.type
                      ? "bg-brand-500 text-white border-brand-500 shadow-md"
                      : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Point and Difficulty */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Điểm số <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.25}
                required
                value={formPoint}
                onChange={(e) => setFormPoint(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 shadow-theme-xs"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Độ khó <span className="text-rose-500">*</span>
              </label>
              <select
                value={formDifficulty}
                onChange={(e) => setFormDifficulty(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden dark:border-gray-700 dark:text-white/90 shadow-theme-xs"
              >
                <option value="1">Dễ</option>
                <option value="2">Trung bình</option>
                <option value="3">Khó</option>
              </select>
            </div>
          </div>

          {/* Options / Answers Section */}
          {formType !== 3 && (
            <div className="space-y-4 pt-3 border-t border-gray-100 dark:border-white/[0.05]">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-900 dark:text-white">
                  Danh sách đáp án <span className="text-rose-500">*</span>
                </label>
                {(formType === 1 || formType === 2) && formAnswers.length < 6 && (
                  <button
                    type="button"
                    onClick={addAnswerOption}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20 rounded-lg hover:bg-brand-100/80 transition-colors"
                  >
                    + Thêm đáp án
                  </button>
                )}
              </div>

              {/* Guide notice */}
              <p className="text-xs text-gray-400">
                {formType === 1 && "⚠️ Chọn ô tròn bên phải để đánh dấu đáp án đúng duy nhất."}
                {formType === 2 && "⚠️ Chọn các checkbox bên phải để đánh dấu các đáp án đúng."}
                {formType === 4 && "⚠️ Chọn ô tròn bên phải để chỉ ra mệnh đề này là Đúng hay Sai."}
              </p>

              <div className="space-y-3">
                {formAnswers.map((answer, index) => {
                  const optionLabel = String.fromCharCode(65 + index); // A, B, C, D...
                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        answer.isCorrect
                          ? "bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20"
                          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                      }`}
                    >
                      {/* Label badge */}
                      <span
                        className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${
                          answer.isCorrect
                            ? "bg-emerald-500 text-white"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {optionLabel}
                      </span>

                      {/* Content input */}
                      <input
                        type="text"
                        required
                        disabled={formType === 4} // Fixed for True/False
                        value={answer.content}
                        onChange={(e) => updateAnswerText(index, e.target.value)}
                        placeholder={`Nhập nội dung cho đáp án ${optionLabel}...`}
                        className="flex-1 bg-transparent border-0 px-2 py-1 text-sm text-gray-800 dark:text-white focus:outline-hidden focus:ring-0 placeholder:text-gray-400"
                      />

                      {/* Correct indicator checkbox/radio */}
                      <div className="flex items-center gap-2 pr-1">
                        {formType === 1 || formType === 4 ? (
                          <input
                            type="radio"
                            name="correct-answer-radio"
                            checked={answer.isCorrect}
                            onChange={() => setCorrectAnswer(index)}
                            className="w-5 h-5 text-emerald-500 border-gray-300 focus:ring-emerald-500/20 focus:ring-offset-0 focus:outline-hidden"
                          />
                        ) : (
                          <input
                            type="checkbox"
                            checked={answer.isCorrect}
                            onChange={() => setCorrectAnswer(index)}
                            className="w-5 h-5 text-emerald-500 rounded border-gray-300 focus:ring-emerald-500/20 focus:ring-offset-0 focus:outline-hidden"
                          />
                        )}

                        {/* Delete button (minimum 2 options) */}
                        {formType !== 4 && formAnswers.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeAnswerOption(index)}
                            className="p-1 text-gray-400 hover:text-rose-500 transition-colors ml-2"
                            title="Xóa lựa chọn này"
                          >
                            <TrashBinIcon className="w-4.5 h-4.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Explanation */}
          <div className="pt-3 border-t border-gray-100 dark:border-white/[0.05]">
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Giải thích đáp án <span className="text-gray-400 font-normal">(Tùy chọn)</span>
            </label>
            <textarea
              rows={3}
              value={formExplanation}
              onChange={(e) => setFormExplanation(e.target.value)}
              placeholder="Giải thích lý do đáp án này đúng để giúp học sinh ôn tập tốt hơn..."
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs resize-y"
            />
          </div>

          {/* Code */}
          <div className="pt-3 border-t border-gray-100 dark:border-white/[0.05] grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Mã câu hỏi <span className="text-gray-400 font-normal">(Tự động phát sinh nếu trống)</span>
              </label>
              <input
                type="text"
                maxLength={50}
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="VD: Q_MATH101"
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 shadow-theme-xs"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/question-bank")}
            className="px-5 py-2.5 text-sm font-medium text-gray-750 bg-white dark:bg-gray-800 dark:text-gray-300 border border-gray-350 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-theme-xs"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg shadow-theme-xs transition-colors"
          >
            {isSubmitting ? "Đang xử lý..." : isEdit ? "Cập nhật câu hỏi" : "Tạo câu hỏi"}
          </button>
        </div>

        {formError && (
          <div className="p-4 bg-rose-50 dark:bg-rose-550/10 text-rose-600 dark:text-rose-400 text-sm font-semibold rounded-lg border border-rose-100 dark:border-rose-550/20">
            ⚠ {formError}
          </div>
        )}
      </div>

      {/* Right panel - Sidebars & Guides */}
      <div className="w-full lg:w-80 shrink-0 space-y-6">
        {/* Category card */}
        <div className="p-6 bg-white dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/[0.05] space-y-4">
          <label className="block text-sm font-bold text-gray-900 dark:text-white">
            Danh mục câu hỏi
          </label>
          <SearchableSelect
            options={categories.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
            value={selectedCategory || ""}
            onChange={(val) => setSelectedCategory(val ? Number(val) : null)}
            placeholder="Không thuộc danh mục"
            onClear={() => setSelectedCategory(null)}
          />
        </div>

        {/* Guide box */}
        <div className="p-6 bg-blue-50/40 dark:bg-blue-950/10 rounded-xl border border-blue-100/50 dark:border-blue-500/10 space-y-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300 shadow-theme-xs">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Hướng dẫn tạo câu hỏi</span>
          </div>
          <ul className="space-y-3.5 text-xs">
            <li>
              <strong>Chọn một:</strong> Cho phép tạo danh sách đáp án dạng radio. Học sinh chọn 1 đáp án chính xác nhất.
            </li>
            <li>
              <strong>Chọn nhiều:</strong> Cho phép học sinh tích chọn nhiều đáp án đúng khác nhau.
            </li>
            <li>
              <strong>Nhập text:</strong> Dạng câu hỏi tự luận. Giáo viên sẽ chấm điểm thủ công sau khi học sinh nộp bài.
            </li>
            <li>
              <strong>Đúng / Sai:</strong> Chỉ gồm 2 lựa chọn Đúng hoặc Sai mặc định. Đánh dấu kết quả đúng chính xác.
            </li>
            <li className="pt-2 border-t border-blue-200/30 dark:border-blue-500/10 font-medium text-blue-600 dark:text-blue-400">
              💡 Hãy kiểm tra kỹ đáp án đúng trước khi tạo để tránh sai lệch kết quả thi!
            </li>
          </ul>
        </div>
      </div>
    </form>
  );
}

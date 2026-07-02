"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { classApi, ClassItem } from "@/services/class.api";
import { questionApi, QuestionItem } from "@/services/question.api";
import { examApi, ExamSaveDto } from "@/services/exam.api";

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

  // Load dropdown options
  useEffect(() => {
    async function loadOptions() {
      try {
        const clsRes = await classApi.getAll(1, 1000);
        if (clsRes.success && clsRes.data) {
          setClasses(clsRes.data.items || []);
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
          setFormError(res.message || "Failed to load exam details");
        }
      } catch (err: any) {
        setFormError(err.message || "Lỗi hệ thống khi tải chi tiết");
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
        router.push("/exams");
      } else {
        setFormError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : "Lỗi khi lưu thông tin bài kiểm tra.");
      }
    } catch (err: any) {
      setFormError(err.message || "Lỗi hệ thống");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-950 dark:text-white">
            {isEdit ? "Cập nhật bài kiểm tra" : "Tạo bài kiểm tra mới"}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Trang chủ - Bài kiểm tra - {isEdit ? "Cập nhật" : "Tạo mới"}
          </p>
        </div>
        <button
          onClick={() => router.push("/exams")}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-theme-xs rounded-lg h-11"
        >
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Quay lại
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
              Thông tin bài kiểm tra
            </h3>
            
            {/* Template Toggle */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/[0.05]">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Lưu vào kho (không gắn lớp)</p>
                <p className="text-xs text-gray-500">Bật để tạo quiz mẫu, có thể assign vào lớp sau</p>
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
                Tiêu đề bài kiểm tra <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Bài kiểm tra chương 1 - Đại số"
                className="w-full h-11 px-3.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-brand-300 dark:focus:border-brand-800 focus:outline-hidden dark:text-white"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Mô tả
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả chi tiết về bài kiểm tra, nội dung, yêu cầu..."
                className="w-full min-h-[120px] p-3.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-brand-300 dark:focus:border-brand-800 focus:outline-hidden dark:text-white"
              />
            </div>

            {/* Class selection if NOT template */}
            {type === 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Lớp học nhận bài
                </label>
                <select
                  value={classId || ""}
                  onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full h-11 px-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-brand-300 focus:outline-hidden dark:text-white text-sm"
                >
                  <option value="">Không chọn lớp (tự do)</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Card 2: Date Settings */}
          <div className="p-6 bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/[0.05] shadow-theme-xs space-y-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Cài đặt thời gian
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Thời gian bắt đầu
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full h-11 px-3.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-brand-300 focus:outline-hidden dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Thời gian kết thúc
                </label>
                <input
                  type="datetime-local"
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
                  Thời lượng (phút)
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
                  Tổng điểm
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
                  Điểm đạt
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
                  Số lượt làm bài
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
                  Cho phép nộp muộn sau khi hết hạn
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
                  Xáo trộn câu hỏi ngẫu nhiên cho từng học sinh
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
                  Cho xem đáp án đúng sau khi nộp bài
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Question Selection and Guidelines */}
        <div className="space-y-6">
          {/* Question Bank select grid */}
          <div className="p-5 bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/[0.05] shadow-theme-xs flex flex-col h-[400px]">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/[0.05]">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Chọn câu hỏi ({selectedQuestionIds.length})
              </h3>
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="text-xs font-bold text-brand-500 hover:text-brand-600 transition-colors"
              >
                {isAllFilteredSelected ? "Bỏ chọn hết" : "Chọn tất cả"}
              </button>
            </div>

            {/* Questions Search */}
            <div className="my-3">
              <input
                type="text"
                value={questionSearch}
                onChange={(e) => setQuestionSearch(e.target.value)}
                placeholder="Tìm câu hỏi..."
                className="w-full h-10 px-3 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-hidden dark:text-white"
              />
            </div>

            {/* Questions Scrollable list */}
            <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
              {filteredQuestions.length === 0 ? (
                <p className="text-center text-xs text-gray-500 py-10">Không tìm thấy câu hỏi.</p>
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
              <span className="font-semibold text-gray-500">Điểm mỗi câu:</span>
              <span className="font-bold text-brand-500">
                {selectedQuestionIds.length > 0
                  ? (totalScore / selectedQuestionIds.length).toFixed(2)
                  : 0}
                đ
              </span>
            </div>
          </div>

          {/* Guidelines Infobox */}
          <div className="p-5 bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 rounded-2xl space-y-3">
            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-400 flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 1 1 1.085 1.086L13.07 13.07a.75.75 0 0 1-1.086-1.086l.041-.02-.026-.008a.75.75 0 0 0-.74.078L9.75 13.5a.75.75 0 0 1-1.085-1.086l1.587-1.587a.75.75 0 0 1 1.085-.02zM12 18.75a6.75 6.75 0 1 0 0-13.5 6.75 6.75 0 0 0 0 13.5z" />
              </svg>
              Hướng dẫn
            </h4>
            <ul className="list-disc pl-4 text-xs text-blue-700 dark:text-blue-300 space-y-1.5">
              <li>Bài kiểm tra sẽ gắn cho tất cả học sinh trong lớp nhận bài.</li>
              <li>Thêm câu hỏi trước hoặc trong khi tạo bài kiểm tra từ ngân hàng.</li>
              <li>Điểm số của học sinh làm bài được tính toán tự động dựa trên tổng điểm và số câu đúng.</li>
              <li>Có thể lưu dạng Nháp và xuất bản sau khi hoàn thiện nội dung.</li>
            </ul>
          </div>

          {/* Publishing & Save options */}
          <div className="p-5 bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-2xl shadow-theme-xs space-y-4">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-gray-700 dark:text-gray-300">Lưu dưới dạng</span>
              <select
                value={status}
                onChange={(e) => setStatus(Number(e.target.value))}
                className="h-9 px-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-hidden dark:text-white text-xs font-semibold"
              >
                <option value="1">Đã xuất bản (Publish)</option>
                <option value="2">Bản nháp (Draft)</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push("/exams")}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 rounded-lg shadow-theme-xs transition-colors"
              >
                {isSubmitting ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Tạo bài kiểm tra"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

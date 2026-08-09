"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PaginationWithIcon from "@/components/ui/pagination/PaginationWithTextWitIcon";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import { QuestionViewModal } from "./QuestionViewModal";
import { questionPassageApi, QuestionPassageItem } from "@/services/questionPassage.api";
import { questionApi, QuestionItem } from "@/services/question.api";
import { QuestionCategoryItem } from "@/services/questionCategory.api";
import { commonApi } from "@/services/common.api";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { useTranslation } from "react-i18next";
import { CheckCircle, XCircle, Search, Edit, Trash2, Eye, Plus, BookOpen, Volume2, PenTool, Mic } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

export default function QuestionTable() {
  const { t } = useTranslation();
  const router = useRouter();

  // ── States ──
  const [passages, setPassages] = useState<QuestionPassageItem[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [categories, setCategories] = useState<QuestionCategoryItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Filters ──
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [selectedSkill, setSelectedSkill] = useState<number | undefined>(undefined);

  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  // ── Toast ──
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // ── Modal states ──
  const [selectedPassageForView, setSelectedPassageForView] = useState<QuestionPassageItem | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<QuestionPassageItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // ── Toast logic ──
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
  };

  // ── Read sessionStorage toast (after redirect from QuestionForm) ──
  useEffect(() => {
    const msg = sessionStorage.getItem("questionToastMessage");
    const type = sessionStorage.getItem("questionToastType") as "success" | "error" | null;
    if (msg) {
      showToast(msg, type || "success");
      sessionStorage.removeItem("questionToastMessage");
      sessionStorage.removeItem("questionToastType");
    }
  }, []);

  // ── Search Debounce ──
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ── Load Categories for Filter Dropdown ──
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await commonApi.getQuestionCategories(1, 1000);
        if (res.success && res.data) {
          setCategories(res.data.items || []);
        }
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    }
    loadCategories();
  }, []);

  // ── Fetch Question Passages & Questions ──
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const [passRes, qRes] = await Promise.all([
          questionPassageApi.getAll(1, 1000, debouncedSearchTerm, selectedSkill, selectedCategory),
          questionApi.getAll(1, 10000),
        ]);

        if (!mounted) return;

        if (qRes.success && qRes.data) {
          setQuestions(qRes.data.items || []);
        }

        if (passRes.success && passRes.data) {
          const passList = passRes.data.items || [];
          setPassages(passList);
          setTotalRecords(passList.length);
          setTotalPages(Math.ceil(passList.length / itemsPerPage));
        } else {
          setError(passRes.message ? t(`backendMessages.${passRes.message}`, { defaultValue: passRes.message }) : "Lỗi hệ thống khi tải danh sách bộ đề bài.");
        }
      } catch (err) {
        if (mounted) setError("Không thể kết nối đến máy chủ.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [currentPage, itemsPerPage, debouncedSearchTerm, selectedCategory, selectedSkill, refreshKey, t]);

  // Map passages to their combined child questions
  const passageChildQuestionsMap = useMemo(() => {
    const map = new Map<number, QuestionItem[]>();
    passages.forEach((p) => {
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
  }, [passages, questions]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedCategory(undefined);
    setSelectedSkill(undefined);
    setCurrentPage(1);
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

  // Delete handler
  const openDeleteModal = (passage: QuestionPassageItem) => {
    setDeleteTarget(passage);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await questionPassageApi.delete(deleteTarget.id);
      if (res.success) {
        showToast(
          res.message
            ? t(`backendMessages.${res.message}`, { defaultValue: "Xóa bộ đề bài thành công!" })
            : "Xóa bộ đề bài thành công!"
        );
        setIsDeleteModalOpen(false);
        setDeleteTarget(null);
        triggerRefresh();
      } else {
        const errorKey = res.message || "ERR_DELETE_FAILED";
        const translatedError = t(`backendMessages.${errorKey}`, {
          defaultValue: errorKey === "ERR_PASSAGE_IN_USE"
            ? "Bộ đề bài này (hoặc các câu hỏi con) đang được sử dụng trong bài kiểm tra, không thể xóa!"
            : errorKey,
        });
        showToast(translatedError, "error");
      }
    } catch {
      showToast("Lỗi hệ thống khi xóa bộ đề bài.", "error");
    }
  };

  // View handler
  const handleView = (passage: QuestionPassageItem) => {
    setSelectedPassageForView(passage);
    setIsViewModalOpen(true);
  };

  // Paginated list
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPassages = passages.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-xs">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[99999] flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl shadow-2xl border border-white/10 dark:border-black/5 animate-bounce">
          {toastType === "success" ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" /> : <XCircle className="w-5 h-5 text-rose-500 shrink-0" />}
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Card Header */}
      <div className="flex flex-col gap-4 px-5 sm:px-6 py-5 border-b border-gray-100 dark:border-gray-850 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {t("questionBank.title", { defaultValue: "Ngân hàng câu hỏi & Bộ đề bài" })}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Quản lý các bộ đề bài (Reading, Listening, Writing) và các câu hỏi con đi kèm.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          <PermissionGuard requiredPermission="QuestionManagement.Create">
            <Link
              href="/question-bank/create"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-theme-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t("questionPassage.titleCreate", { defaultValue: "Tạo Đề bài & Bộ câu hỏi mới" })}
            </Link>
          </PermissionGuard>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 sm:p-5 border-b border-gray-150 dark:border-gray-800 bg-gray-50/20 dark:bg-gray-900/10">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between w-full">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full sm:max-w-3xl">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("question.filterSearchPlaceholder", { defaultValue: "Tìm kiếm bộ đề bài..." })}
                className="h-11 w-full pl-10 pr-4 py-2 text-sm bg-transparent border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder-gray-400"
              />
              <span className="absolute left-3 top-3.5 text-gray-400">
                <Search className="w-4 h-4" />
              </span>
            </div>

            {/* Category Dropdown Filter */}
            <div className="w-full sm:w-60">
              <SearchableSelect
                options={categories.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.code})`,
                }))}
                value={selectedCategory ?? ""}
                onChange={(val) => setSelectedCategory(val ? Number(val) : undefined)}
                placeholder={t("question.filterCategoryAll", { defaultValue: "Tất cả danh mục" })}
                onClear={() => setSelectedCategory(undefined)}
              />
            </div>

            {/* Skill Filter Dropdown */}
            <select
              value={selectedSkill ?? ""}
              onChange={(e) => setSelectedSkill(e.target.value ? Number(e.target.value) : undefined)}
              className="h-11 px-3 text-sm bg-transparent border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer font-medium w-full sm:w-44"
            >
              <option value="" className="dark:bg-gray-900">{t("question.filterSkillAll", { defaultValue: "Tất cả kỹ năng" })}</option>
              <option value="2" className="dark:bg-gray-900">{t("question.skillReading", { defaultValue: "Reading" })}</option>
              <option value="1" className="dark:bg-gray-900">{t("question.skillListening", { defaultValue: "Listening" })}</option>
              <option value="4" className="dark:bg-gray-900">{t("question.skillWriting", { defaultValue: "Writing" })}</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex items-center justify-center px-4 h-11 text-sm font-medium text-gray-700 bg-white border border-gray-355 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-theme-xs shrink-0 w-full sm:w-auto"
          >
            {t("question.btnClear", { defaultValue: "Xóa bộ lọc" })}
          </button>
        </div>
      </div>

      {/* Table view */}
      <div className="max-w-full overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
              <TableRow>
                <TableCell isHeader className="px-6 py-4 border-r border-gray-100 dark:border-white/[0.05] text-center w-12">
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">#</p>
                </TableCell>
                <TableCell isHeader className="px-6 py-4 border-r border-gray-100 dark:border-white/[0.05] text-left">
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">
                    {t("question.colQuestion", { defaultValue: "Tên Đề bài / Bộ câu hỏi" })}
                  </p>
                </TableCell>
                <TableCell isHeader className="px-6 py-4 border-r border-gray-100 dark:border-white/[0.05] text-center w-36">
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">
                    {t("question.colSkill", { defaultValue: "Kỹ năng" })}
                  </p>
                </TableCell>
                <TableCell isHeader className="px-6 py-4 border-r border-gray-100 dark:border-white/[0.05] text-center w-36">
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">
                    {t("question.colType", { defaultValue: "Số câu hỏi" })}
                  </p>
                </TableCell>
                <TableCell isHeader className="px-6 py-4 border-r border-gray-100 dark:border-white/[0.05] text-left w-48">
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">
                    {t("questionPassage.categoryLabel", { defaultValue: "Danh mục" })}
                  </p>
                </TableCell>
                <TableCell isHeader className="px-6 py-4 text-center w-32">
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">
                    {t("question.colActions", { defaultValue: "Thao tác" })}
                  </p>
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <TableRow key={idx} className="animate-pulse">
                    <TableCell className="px-6 py-4 border-r border-gray-100 dark:border-white/[0.05]"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-8 mx-auto" /></TableCell>
                    <TableCell className="px-6 py-4 border-r border-gray-100 dark:border-white/[0.05]"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-80" /></TableCell>
                    <TableCell className="px-6 py-4 border-r border-gray-100 dark:border-white/[0.05]"><div className="h-6 bg-gray-200 dark:bg-white/10 rounded-full w-20 mx-auto" /></TableCell>
                    <TableCell className="px-6 py-4 border-r border-gray-100 dark:border-white/[0.05]"><div className="h-6 bg-gray-200 dark:bg-white/10 rounded-full w-16 mx-auto" /></TableCell>
                    <TableCell className="px-6 py-4 border-r border-gray-100 dark:border-white/[0.05]"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-24" /></TableCell>
                    <TableCell className="px-6 py-4"><div className="h-8 bg-gray-200 dark:bg-white/10 rounded w-24 mx-auto" /></TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={6} className="px-6 py-10 text-center text-rose-500 font-medium">
                    {error}
                  </TableCell>
                </TableRow>
              ) : paginatedPassages.length > 0 ? (
                paginatedPassages.map((passage, index) => {
                  const childQs = passageChildQuestionsMap.get(passage.id) || passage.questions || [];
                  return (
                    <TableRow key={passage.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                      <TableCell className="px-6 py-4 border-r border-gray-100 dark:border-white/[0.05] text-center text-gray-500 whitespace-nowrap text-xs">
                        {startIndex + index + 1}
                      </TableCell>
                      <TableCell className="px-6 py-4 border-r border-gray-100 dark:border-white/[0.05]">
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                            <span>{passage.title}</span>
                            <span className="text-xs font-mono font-medium text-gray-400">({passage.code})</span>
                          </div>
                          {passage.content && (
                            <div className="text-gray-500 text-xs mt-1 line-clamp-1 font-serif">
                              {passage.content}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="px-6 py-4 border-r border-gray-100 dark:border-white/[0.05] text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${getSkillBadgeClass(passage.skillType)}`}>
                          {getSkillName(passage.skillType)}
                        </span>
                      </TableCell>

                      <TableCell className="px-6 py-4 border-r border-gray-100 dark:border-white/[0.05] text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                          {t("questionPassage.childQuestionCount", { count: childQs.length, defaultValue: `${childQs.length} ${childQs.length === 1 ? "question" : "questions"}` })}
                        </span>
                      </TableCell>

                      <TableCell className="px-6 py-4 border-r border-gray-100 dark:border-white/[0.05] text-left whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">
                        {passage.categoryName ? (
                          <span className="font-semibold text-gray-700 dark:text-gray-200">{passage.categoryName}</span>
                        ) : (
                          <span className="text-gray-400 italic">—</span>
                        )}
                      </TableCell>

                      <TableCell className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            title={t("question.viewTooltip", { defaultValue: "Xem chi tiết" })}
                            onClick={() => handleView(passage)}
                            className="p-1.5 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <PermissionGuard requiredPermission="QuestionManagement.Update">
                            <button
                              type="button"
                              title={t("question.editTooltip", { defaultValue: "Chỉnh sửa" })}
                              onClick={() => router.push(`/question-bank/edit/${passage.id}`)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-955/30 rounded-md transition-colors cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </PermissionGuard>

                          <PermissionGuard requiredPermission="QuestionManagement.Delete">
                            <button
                              type="button"
                              title={t("question.deleteTooltip", { defaultValue: "Xóa" })}
                              onClick={() => openDeleteModal(passage)}
                              className="p-1.5 text-error-600 hover:text-error-800 dark:text-error-400 dark:hover:text-error-300 hover:bg-error-50 dark:hover:bg-error-955/30 rounded-md transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </PermissionGuard>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium text-sm">
                    {t("question.noQuestions", { defaultValue: "Không tìm thấy bộ đề bài nào." })}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-gray-150 dark:border-gray-800">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{t("common.showing", { defaultValue: "Hiển thị" })}</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 px-2 text-sm bg-transparent border border-gray-300 rounded-md dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-brand-500 cursor-pointer"
              >
                <option value={5} className="dark:bg-gray-900">5</option>
                <option value={10} className="dark:bg-gray-900">10</option>
                <option value={20} className="dark:bg-gray-900">20</option>
                <option value={50} className="dark:bg-gray-900">50</option>
              </select>
              <span>{t("common.entriesPerPage", { defaultValue: "mục mỗi trang" })}</span>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("questionBank.showing", {
                start: passages.length === 0 ? 0 : startIndex + 1,
                end: Math.min(startIndex + itemsPerPage, passages.length),
                total: passages.length,
                defaultValue: `Hiển thị ${passages.length === 0 ? 0 : startIndex + 1} đến ${Math.min(startIndex + itemsPerPage, passages.length)} trong tổng số ${passages.length} mục`,
              })}
            </p>
          </div>
          {totalPages > 1 && (
            <PaginationWithIcon
              totalPages={totalPages}
              initialPage={currentPage}
              onPageChange={(p) => setCurrentPage(p)}
            />
          )}
        </div>

      {/* View Modal */}
      {selectedPassageForView && (
        <QuestionViewModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedPassageForView(null);
          }}
          passage={selectedPassageForView}
          childQuestions={passageChildQuestionsMap.get(selectedPassageForView.id) || selectedPassageForView.questions || []}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        isDeleting={false}
        itemName={deleteTarget?.title}
      />
    </div>
  );
}

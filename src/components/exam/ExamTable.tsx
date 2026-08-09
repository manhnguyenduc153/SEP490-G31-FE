"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PencilIcon, TrashBinIcon } from "@/icons";
import PaginationWithIcon from "@/components/tables/DataTables/TableOne/PaginationWithIcon";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import { examApi, ExamItem } from "@/services/exam.api";
import { ClassItem } from "@/services/class.api";
import { commonApi } from "@/services/common.api";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { CheckCircle, XCircle, Search, Edit, Trash2, Eye } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

export function ExamTable() {
  const { t } = useTranslation();
  const router = useRouter();

  // ─── Data States ─────────────────────────────────────────────────────────────
  const [items, setItems] = useState<ExamItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Filters & Search ────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Tabs: "in-use" (Assigned Exams, type = 1) vs "library" (Templates, type = 2)
  const [activeTab, setActiveTab] = useState<"in-use" | "library">("in-use");

  // Dropdown options and filter states
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [filterClass, setFilterClass] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<number | null>(null);

  // Refresh trigger
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState<ExamItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Toast Helper ───────────────────────────────────────────────────────────
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  // ─── Read sessionStorage toast (after redirect from ExamForm) ───────────────
  useEffect(() => {
    const key = sessionStorage.getItem("examToastKey");
    const msg = sessionStorage.getItem("examToastMessage");
    const type = sessionStorage.getItem("examToastType") as "success" | "error" | null;
    if (key) {
      showToast(t(`exams.${key}`), type || "success");
      sessionStorage.removeItem("examToastKey");
      sessionStorage.removeItem("examToastType");
    } else if (msg) {
      showToast(msg, type || "success");
      sessionStorage.removeItem("examToastMessage");
      sessionStorage.removeItem("examToastType");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Debounce Search ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // ─── Fetch Dropdowns ────────────────────────────────────────────────────────
  useEffect(() => {
    commonApi.getClasses(1, 1000).then((res) => {
      if (res.success && res.data) {
        setClasses(res.data.items || []);
      }
    });
  }, []);

  // ─── Fetch Data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadExams = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const typeFilter = activeTab === "in-use" ? 1 : 2;
        const res = await examApi.getAll(currentPage, itemsPerPage, {
          keyword: debouncedSearchTerm,
          classId: activeTab === "in-use" ? filterClass : null,
          status: filterStatus,
          type: typeFilter,
        });

        if (res.success && res.data) {
          setItems(res.data.items || []);
          setTotalRecords(res.data.totalRecords || 0);
          setTotalPages(res.data.totalPages || 0);
        } else {
          setError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("exam.systemError", { defaultValue: "Lỗi hệ thống khi tải bài kiểm tra." }));
        }
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    };
    loadExams();
  }, [currentPage, itemsPerPage, debouncedSearchTerm, filterClass, filterStatus, activeTab, refreshKey]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setFilterClass(null);
    setFilterStatus(null);
    setCurrentPage(1);
    triggerRefresh();
  };

  // ─── Action Handlers ────────────────────────────────────────────────────────
  const handleCopy = async (item: ExamItem) => {
    try {
      const res = await examApi.copy(item.id);
      if (res.success) {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: t("exams.successCopy") }) : t("exams.successCopy"));
        triggerRefresh();
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: t("exams.errorCopy") }) : t("exams.errorCopy"), "error");
      }
    } catch {
      showToast(t("exams.systemErrorCopy"), "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await examApi.delete(deleteTarget.id);
      if (res.success) {
        showToast(
          res.message
            ? t(`backendMessages.${res.message}`, { defaultValue: t("exams.successDelete") })
            : t("exams.successDelete")
        );
        setDeleteTarget(null);
        triggerRefresh();
      } else {
        const errorKey = res.message || "ERR_DELETE_FAILED";
        const translatedError = t(`backendMessages.${errorKey}`, {
          defaultValue: errorKey === "ERR_EXAM_IN_USE"
            ? t("backendMessages.ERR_EXAM_IN_USE")
            : errorKey,
        });
        showToast(translatedError, "error");
      }
    } catch {
      showToast(t("exams.systemErrorDelete"), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Format creation datetime
  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return t("exam.justNow", { defaultValue: "vừa xong" });
    if (diffMins < 60) return t("exam.minsAgo", { mins: diffMins, defaultValue: `${diffMins} phút trước` });
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return t("exam.hoursAgo", { hours: diffHours, defaultValue: `${diffHours} giờ trước` });
    return date.toLocaleDateString("vi-VN");
  };

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-visible">
      {/* Toast Notification */}
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

      {/* Header with Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {t("exam.pageTitle", { defaultValue: "Quản lý bài kiểm tra" })}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t("exam.pageSubtitle", { defaultValue: "Xem danh sách bài kiểm tra đang dùng hoặc quản lý thư viện bài mẫu." })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/question-bank"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-theme-xs rounded-lg cursor-pointer h-11"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
            {t("exam.questionBank")}
          </Link>

          <PermissionGuard requiredPermission="Exam.Create">
            <button
              onClick={() => router.push("/exams/create")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-theme-xs transition-colors h-11"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {t("exam.addExam")}
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* Tab Filter */}
      <div className="flex flex-wrap items-center gap-2 px-5 sm:px-6 pt-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
        <button
          onClick={() => {
            setActiveTab("in-use");
            setCurrentPage(1);
          }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "in-use"
              ? "border-brand-500 text-brand-500 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
          </svg>
          {t("exam.tabInUse")}
        </button>
        <button
          onClick={() => {
            setActiveTab("library");
            setCurrentPage(1);
          }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "library"
              ? "border-brand-500 text-brand-500 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
          {t("exam.tabLibrary")}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="p-4 sm:p-5 border-b border-gray-150 dark:border-gray-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 w-full items-end">
          {/* Text Search */}
          <div className={`relative ${activeTab === "in-use" ? "md:col-span-4" : "md:col-span-7"}`}>
            <label className="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("exam.filterKeyword", { defaultValue: "Tìm kiếm" })}
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={t("exam.filterKeywordPlaceholder", { defaultValue: "Tìm kiếm bài kiểm tra..." })}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-transparent border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400 h-11"
              />
              <span className="absolute left-3 top-3.5 text-gray-400">
                <Search className="w-4 h-4" />
              </span>
            </div>
          </div>

          {/* Class Filter (only shown in in-use tab) */}
          {activeTab === "in-use" && (
            <div className="md:col-span-3">
              <label className="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                {t("exam.filterClass", { defaultValue: "Lớp học" })}
              </label>
              <SearchableSelect
                options={classes.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
                value={filterClass || ""}
                onChange={(val) => {
                  setFilterClass(val ? Number(val) : null);
                  setCurrentPage(1);
                }}
                placeholder={t("exam.filterClassAll", { defaultValue: "Tất cả lớp học" })}
                onClear={() => {
                  setFilterClass(null);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}

          {/* Status Filter */}
          <div className="md:col-span-3">
            <label className="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("exam.filterStatus", { defaultValue: "Trạng thái" })}
            </label>
            <select
              value={filterStatus || ""}
              onChange={(e) => {
                setFilterStatus(e.target.value ? Number(e.target.value) : null);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-sm bg-transparent border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all h-11 cursor-pointer"
            >
              <option value="" className="dark:bg-gray-900">{t("exam.filterStatusAll", { defaultValue: "Tất cả trạng thái" })}</option>
              <option value="1" className="dark:bg-gray-900">{t("exam.filterStatusPublished", { defaultValue: "Đã xuất bản" })}</option>
              <option value="2" className="dark:bg-gray-900">{t("exam.filterStatusDraft", { defaultValue: "Bản nháp" })}</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-center justify-end h-11 md:col-span-2">
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center justify-center px-4 h-11 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors cursor-pointer w-full md:w-auto shadow-theme-xs"
            >
              {t("exam.btnClear", { defaultValue: "Xóa bộ lọc" })}
            </button>
          </div>
        </div>
      </div>

      {/* Grid Table view */}
      <div className="max-w-full overflow-visible custom-scrollbar">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
            <TableRow>
              <TableCell isHeader className="px-6 py-4 text-left font-semibold text-gray-800 dark:text-gray-200 text-theme-sm">
                {t("exam.colTitle")}
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-left font-semibold text-gray-800 dark:text-gray-200 text-theme-sm">
                {t("exam.colAssign")}
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 dark:text-gray-200 w-28 text-theme-sm">
                {t("exam.colQuestions")}
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 dark:text-gray-200 w-20 text-theme-sm">
                {t("exam.colPoint")}
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 dark:text-gray-200 w-32 text-theme-sm">
                {t("exam.colDuration")}
              </TableCell>
              {activeTab === "in-use" && (
                <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 dark:text-gray-200 w-36 text-theme-sm">
                  {t("exam.colStatus")}
                </TableCell>
              )}
              <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 dark:text-gray-200 w-28 text-theme-sm">
                {t("exam.colSubmissions")}
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 dark:text-gray-200 w-36 text-theme-sm">
                {t("exam.colActions")}
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {isLoading ? (
              Array.from({ length: itemsPerPage }).map((_, idx) => (
                <TableRow key={idx} className="animate-pulse">
                  <TableCell className="px-6 py-5"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-48" /></TableCell>
                  <TableCell className="px-6 py-5"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-32" /></TableCell>
                  <TableCell className="px-6 py-5"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-10 mx-auto" /></TableCell>
                  <TableCell className="px-6 py-5"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-8 mx-auto" /></TableCell>
                  <TableCell className="px-6 py-5"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-16 mx-auto" /></TableCell>
                  {activeTab === "in-use" && (
                    <TableCell className="px-6 py-5"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-24 mx-auto" /></TableCell>
                  )}
                  <TableCell className="px-6 py-5"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-8 mx-auto" /></TableCell>
                  <TableCell className="px-6 py-5">
                    <div className="flex justify-center gap-2">
                      <div className="h-8 w-8 bg-gray-200 dark:bg-white/10 rounded" />
                      <div className="h-8 w-8 bg-gray-200 dark:bg-white/10 rounded" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={activeTab === "in-use" ? 8 : 7}
                  className="px-6 py-10 text-center text-error-500 dark:text-error-400 font-medium"
                >
                  {error}
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={activeTab === "in-use" ? 8 : 7}
                  className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                >
                  {t("exam.noResults")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors"
                >
                  {/* Title & Timeago */}
                  <TableCell className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    <div className="space-y-1">
                      <p 
                        onClick={() => router.push(`/exams/${item.id}`)}
                        className="font-semibold text-gray-950 dark:text-white hover:text-brand-500 transition-colors cursor-pointer"
                      >
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-400 font-medium">
                        {item.code} • {formatTimeAgo(item.createdAt)}
                      </p>
                    </div>
                  </TableCell>

                  {/* Class assignment */}
                  <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {item.className ? (
                      <span className="text-brand-500 font-semibold hover:underline">
                        {t("exam.targetClass", { name: item.className })}
                      </span>
                    ) : (
                      <span className="text-gray-400">{t("exam.targetLibrary")}</span>
                    )}
                  </TableCell>

                  {/* Question Count */}
                  <TableCell className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-semibold rounded-full bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                      {item.questionCount}
                    </span>
                  </TableCell>

                  {/* Total Score */}
                  <TableCell className="px-6 py-4 text-center text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {item.totalScore || 10}
                  </TableCell>

                  {/* Duration */}
                  <TableCell className="px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-300">
                    {item.duration ? t("exam.durationLimit", { mins: item.duration }) : t("exam.durationUnlimited")}
                  </TableCell>

                  {/* Status Badge */}
                  {activeTab === "in-use" && (
                    <TableCell className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${
                          item.status === 1
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.status === 1 ? "bg-emerald-500" : "bg-yellow-500"
                          }`}
                        />
                        {item.status === 1 ? t("exam.statusPublished") : t("exam.statusDraft")}
                      </span>
                    </TableCell>
                  )}

                  {/* Submission Count */}
                  <TableCell className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-6.5 h-6.5 text-xs font-bold rounded-full bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">
                      {item.submissionCount}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="px-6 py-4 text-center">
                    <div className="flex justify-center items-center gap-2">
                      {/* View Details */}
                      <button
                        type="button"
                        onClick={() => router.push(`/exams/${item.id}`)}
                        title={t("exam.viewTooltip")}
                        className="p-1.5 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Edit */}
                      <PermissionGuard requiredPermission="Exam.Edit">
                        <button
                          type="button"
                          onClick={() => router.push(`/exams/edit/${item.id}`)}
                          title={t("exam.editTooltip")}
                          className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </PermissionGuard>

                      {/* Duplicate/Copy */}
                      <PermissionGuard requiredPermission="Exam.Create">
                        <button
                          type="button"
                          onClick={() => handleCopy(item)}
                          title={t("exam.copyTooltip")}
                          className="p-2 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 transition-colors rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376A8.965 8.965 0 0 0 12 12.75a8.965 8.965 0 0 0-3.75 3.375m7.5 1.125H18a2.25 2.25 0 0 0 2.25-2.25V5.25A2.25 2.25 0 0 0 18 3H12a2.25 2.25 0 0 0-2.25 2.25v.75m0 3.75H6.75m0 0a2.25 2.25 0 0 0-2.25 2.25v7.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V12" />
                          </svg>
                        </button>
                      </PermissionGuard>

                      {/* Delete */}
                      <PermissionGuard requiredPermission="Exam.Delete">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          title={t("exam.deleteTooltip")}
                          className="p-1.5 text-error-600 hover:text-error-800 dark:text-error-400 dark:hover:text-error-300 hover:bg-error-50 dark:hover:bg-error-950/30 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between px-6 py-5 bg-gray-50/50 dark:bg-white/[0.01] border-t border-gray-100 dark:border-gray-800/40">
        <div className="flex flex-wrap items-center gap-4 pb-3 xl:pb-0 justify-center xl:justify-start">
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <span>{t("exam.show")}</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-8 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-2 text-sm text-gray-700 dark:text-gray-355 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer font-medium"
            >
              <option value="5" className="dark:bg-gray-900">5</option>
              <option value="10" className="dark:bg-gray-900">10</option>
              <option value="20" className="dark:bg-gray-900">20</option>
              <option value="50" className="dark:bg-gray-900">50</option>
            </select>
            <span>{t("exam.entriesPerPage")}</span>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t("exam.showing", {
              start: totalRecords === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1,
              end: Math.min(currentPage * itemsPerPage, totalRecords),
              total: totalRecords,
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        itemName={deleteTarget?.title || ""}
      />
    </div>
  );
}

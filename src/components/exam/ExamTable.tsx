"use client";
import React, { useState, useEffect, useMemo } from "react";
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
import { PencilIcon, TrashBinIcon, EyeIcon } from "@/icons";
import PaginationWithIcon from "@/components/tables/DataTables/TableOne/PaginationWithIcon";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import { examApi, ExamItem, ExamSaveDto } from "@/services/exam.api";
import { classApi, ClassItem } from "@/services/class.api";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { Modal } from "@/components/ui/modal";
import { CheckCircle, XCircle } from "lucide-react";

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
  const [filterTarget, setFilterTarget] = useState<string>(""); // Lớp / Khóa học

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
    const msg = sessionStorage.getItem("examToastMessage");
    const type = sessionStorage.getItem("examToastType") as "success" | "error" | null;
    if (msg) {
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
    }, 4000);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // ─── Fetch Dropdowns ────────────────────────────────────────────────────────
  useEffect(() => {
    classApi.getAll(1, 1000).then((res) => {
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

  // ─── Filters Handlers ───────────────────────────────────────────────────────
  const handleApplyFilters = () => {
    setCurrentPage(1);
    triggerRefresh();
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setFilterClass(null);
    setFilterStatus(null);
    setFilterTarget("");
    setCurrentPage(1);
    triggerRefresh();
  };

  // ─── Action Handlers ────────────────────────────────────────────────────────
  const handleCopy = async (item: ExamItem) => {
    try {
      const res = await examApi.copy(item.id);
      if (res.success) {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : "Sao chép bài kiểm tra thành công!");
        triggerRefresh();
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : "Lỗi khi sao chép", "error");
      }
    } catch {
      showToast("Lỗi hệ thống khi sao chép bài kiểm tra", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await examApi.delete(deleteTarget.id);
      if (res.success) {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : "Xóa bài kiểm tra thành công!");
        setDeleteTarget(null);
        triggerRefresh();
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : "Lỗi khi xóa bài kiểm tra", "error");
      }
    } catch {
      showToast("Lỗi hệ thống khi thực hiện xóa", "error");
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
    <div className="overflow-hidden bg-white dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/[0.05]">
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

      {/* Header section with Title and Create Button */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-white/[0.05] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-gray-50/20">
        <div>
          <h2 className="text-lg font-bold text-gray-950 dark:text-white">
            {t("exam.pageTitle", { defaultValue: "Quản lý bài kiểm tra" })}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {t("exam.pageSubtitle", { defaultValue: "Xem danh sách bài kiểm tra đang dùng hoặc quản lý thư viện bài mẫu." })}
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Link
            href="/question-bank"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-750 bg-white border border-gray-300 dark:text-gray-355 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-theme-xs rounded-lg"
          >
            <svg className="w-4.5 h-4.5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
            {t("exam.questionBank")}
          </Link>

          <PermissionGuard requiredPermission="Exam.Create">
            <button
              onClick={() => router.push("/exams/create")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 transition-colors shadow-theme-xs"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {t("exam.addExam")}
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-white/[0.05] px-6 bg-gray-50/10">
        <button
          onClick={() => {
            setActiveTab("in-use");
            setCurrentPage(1);
          }}
          className={`py-3.5 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "in-use"
              ? "border-brand-500 text-brand-500"
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
          className={`py-3.5 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "library"
              ? "border-brand-500 text-brand-500"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
          {t("exam.tabLibrary")}
        </button>
      </div>

      <div className="p-6 border-b border-gray-100 dark:border-white/[0.05] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50/10">
        {/* Search */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("exam.filterKeyword")}</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("exam.filterKeywordPlaceholder")}
            className="w-full h-10 px-3.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-brand-300 dark:focus:border-brand-800 focus:outline-hidden dark:text-white"
          />
        </div>

        {/* Class Filter (only shown in in-use tab) */}
        {activeTab === "in-use" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("exam.filterClass")}</label>
            <select
              value={filterClass || ""}
              onChange={(e) => setFilterClass(e.target.value ? Number(e.target.value) : null)}
              className="w-full h-10 px-3.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-brand-300 focus:outline-hidden dark:text-white"
            >
              <option value="">{t("exam.filterClassAll")}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Target Assign Filter (Mục tiêu giao: Lớp/Khóa học) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("exam.filterTarget")}</label>
          <select
            value={filterTarget}
            onChange={(e) => setFilterTarget(e.target.value)}
            className="w-full h-10 px-3.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-brand-300 focus:outline-hidden dark:text-white"
          >
            <option value="">{t("exam.filterTargetAll")}</option>
            <option value="class">{t("exam.filterTargetClass")}</option>
            <option value="course">{t("exam.filterTargetCourse")}</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("exam.filterStatus")}</label>
          <select
            value={filterStatus || ""}
            onChange={(e) => setFilterStatus(e.target.value ? Number(e.target.value) : null)}
            className="w-full h-10 px-3.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-brand-300 focus:outline-hidden dark:text-white"
          >
            <option value="">{t("exam.filterStatusAll")}</option>
            <option value="1">{t("exam.filterStatusPublished")}</option>
            <option value="2">{t("exam.filterStatusDraft")}</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/10">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {t("exam.examListCount", { count: totalRecords })}
        </span>
        <div className="flex gap-2.5">
          <button
            onClick={handleApplyFilters}
            className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-theme-xs transition-colors"
          >
            {t("exam.btnFilter")}
          </button>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
          >
            {t("exam.btnClear")}
          </button>
        </div>
      </div>

      {/* Grid Table view */}
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
            <TableRow>
              <TableCell isHeader className="px-6 py-4 text-left font-semibold text-gray-800 dark:text-gray-200">
                {t("exam.colTitle")}
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-left font-semibold text-gray-800 dark:text-gray-200">
                {t("exam.colAssign")}
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 dark:text-gray-200 w-28">
                {t("exam.colQuestions")}
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 dark:text-gray-200 w-20">
                {t("exam.colPoint")}
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 dark:text-gray-200 w-32">
                {t("exam.colDuration")}
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 dark:text-gray-200 w-36">
                {t("exam.colStatus")}
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 dark:text-gray-200 w-28">
                {t("exam.colSubmissions")}
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 dark:text-gray-200 w-36">
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
                  <TableCell className="px-6 py-5"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-24 mx-auto" /></TableCell>
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
                  colSpan={8}
                  className="px-6 py-10 text-center text-error-500 dark:text-error-400 font-medium"
                >
                  {error}
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
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
                        onClick={() => router.push(`/exams/${item.id}`)}
                        title={t("exam.viewTooltip")}
                        className="p-2 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 transition-colors rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>

                      {/* Edit */}
                      <PermissionGuard requiredPermission="Exam.Edit">
                        <button
                          onClick={() => router.push(`/exams/edit/${item.id}`)}
                          title={t("exam.editTooltip")}
                          className="p-2 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 transition-colors rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      </PermissionGuard>

                      {/* Duplicate/Copy */}
                      <PermissionGuard requiredPermission="Exam.Create">
                        <button
                          onClick={() => handleCopy(item)}
                          title={t("exam.copyTooltip")}
                          className="p-2 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 transition-colors rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                        >
                          {/* Copy/Duplicate Icon */}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376A8.965 8.965 0 0 0 12 12.75a8.965 8.965 0 0 0-3.75 3.375m7.5 1.125H18a2.25 2.25 0 0 0 2.25-2.25V5.25A2.25 2.25 0 0 0 18 3H12a2.25 2.25 0 0 0-2.25 2.25v.75m0 3.75H6.75m0 0a2.25 2.25 0 0 0-2.25 2.25v7.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V12" />
                          </svg>
                        </button>
                      </PermissionGuard>

                      {/* Delete */}
                      <PermissionGuard requiredPermission="Exam.Delete">
                        <button
                          onClick={() => setDeleteTarget(item)}
                          title={t("exam.deleteTooltip")}
                          className="p-2 text-gray-500 hover:text-error-500 dark:text-gray-400 dark:hover:text-error-400 transition-colors rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                        >
                          <TrashBinIcon className="w-4 h-4" />
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

      {/* Pagination component */}
      {totalPages > 1 && (
        <div className="border-t border-gray-100 dark:border-white/[0.05] p-5 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("student.showing", { start: Math.min(totalRecords, (currentPage - 1) * itemsPerPage + 1), end: Math.min(totalRecords, currentPage * itemsPerPage), total: totalRecords })}
          </p>
          <PaginationWithIcon
            initialPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}





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

"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PaginationWithIcon from "@/components/tables/DataTables/TableOne/PaginationWithIcon";
import { examApi, ExamItem } from "@/services/exam.api";
import { ClassItem } from "@/services/class.api";
import { commonApi } from "@/services/common.api";
import { CheckCircle, XCircle, Search, Eye } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

export function TeacherExamTable() {
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
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Dropdown options and filter states
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [filterClass, setFilterClass] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<number | null>(null);

  // Refresh trigger
  const [refreshKey, setRefreshKey] = useState(0);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

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
        const res = await examApi.getTeacherExams({
          pageNumber: currentPage,
          pageSize: itemsPerPage,
          keyword: debouncedSearchTerm || undefined,
          classId: filterClass,
          status: filterStatus,
        });

        if (res.success && res.data) {
          setItems(res.data.items || []);
          setTotalRecords(res.data.totalRecords || 0);
          setTotalPages(res.data.totalPages || 0);
        } else {
          setError(
            res.message
              ? t(`backendMessages.${res.message}`, { defaultValue: res.message })
              : t("exam.systemError", { defaultValue: "Lỗi hệ thống khi tải bài kiểm tra." })
          );
        }
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    };
    loadExams();
  }, [currentPage, itemsPerPage, debouncedSearchTerm, filterClass, filterStatus, refreshKey]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setFilterClass(null);
    setFilterStatus(null);
    setCurrentPage(1);
    setRefreshKey((k) => k + 1);
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {t("teachingExam.pageTitle", { defaultValue: "Bài kiểm tra lớp giảng dạy" })}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t("teachingExam.pageSubtitle", { defaultValue: "Danh sách bài kiểm tra được giao cho các lớp bạn đang giảng dạy." })}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 sm:p-5 border-b border-gray-150 dark:border-gray-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 w-full items-end">
          {/* Text Search */}
          <div className="relative md:col-span-4">
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

          {/* Class Filter */}
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
              <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 dark:text-gray-200 w-36 text-theme-sm">
                {t("exam.colStatus")}
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 dark:text-gray-200 w-28 text-theme-sm">
                {t("exam.colSubmissions")}
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 dark:text-gray-200 w-24 text-theme-sm">
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
                    <div className="flex justify-center">
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
                  {t("teachingExam.noResults", { defaultValue: "Không có bài kiểm tra nào cho lớp bạn đang dạy." })}
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

                  {/* Actions - view only */}
                  <TableCell className="px-6 py-4 text-center">
                    <div className="flex justify-center items-center gap-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/exams/${item.id}`)}
                        title={t("exam.viewTooltip")}
                        className="p-1.5 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
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
    </div>
  );
}

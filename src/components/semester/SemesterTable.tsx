"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, UserCheck, Cpu, Plus, Edit, Trash2, Search, SlidersHorizontal, Users } from "lucide-react";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import { SemesterFormModal } from "./SemesterFormModal";
import { TeacherAvailabilityModal } from "./TeacherAvailabilityModal";
import { AutoScheduleModal } from "./AutoScheduleModal";
import { SemesterRegistrationsViewModal } from "./SemesterRegistrationsViewModal";
import { semesterApi, SemesterItem } from "@/services/semester.api";
import DatePicker from "@/components/form/date-picker";
import PaginationWithIcon from "@/components/tables/DataTables/TableOne/PaginationWithIcon";
import { useTranslation } from "react-i18next";
import { authApi } from "@/services/auth.api";
import { AngleDownIcon, AngleUpIcon } from "@/icons";

export default function SemesterTable() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<SemesterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Sort ──
  type SortKey = "code" | "name" | "startDate";
  type SortOrder = "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    setPermissions(authApi.getPermissions());
  }, []);

  const hasPermission = (perm: string) => {
    return permissions.includes(perm);
  };

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDateFrom, setStartDateFrom] = useState<Date | null>(null);
  const [endDateTo, setEndDateTo] = useState<Date | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterResetKey, setFilterResetKey] = useState(0);

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SemesterItem | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<SemesterItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [activeSemester, setActiveSemester] = useState<SemesterItem | null>(null);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);
  const [isAutoScheduleOpen, setIsAutoScheduleOpen] = useState(false);
  const [isRegistrationsOpen, setIsRegistrationsOpen] = useState(false);

  // Toast
  const [toasts, setToasts] = useState<{ id: number; message: string; type: "success" | "error" }[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    if (!msg) return;
    const messages = msg
      .split(/\r?\n/)
      .map((m) => m.trim())
      .filter(Boolean);

    messages.forEach((message, index) => {
      const id = Date.now() + index;
      setToasts((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    });
  };

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, startDateFrom, endDateTo]);

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  // Fetch Semester list
  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await semesterApi.getAll();
        if (!mounted) return;
        if (res.success && res.data) {
          setItems(res.data || []);
        } else {
          setError(res.message ? t(`backendMessages.${res.message}`) : t("semester.loadListError", { defaultValue: "Không thể tải danh sách học kỳ." }));
        }
      } catch (err: any) {
        if (mounted) setError(err.message || t("backendMessages.ERR_SYSTEM_ERROR", { defaultValue: "Lỗi hệ thống." }));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      const res = await semesterApi.delete(deletingItem.id);
      if (res.success) {
        showToast(res.message ? t(`backendMessages.${res.message}`) : t("semester.deleteSuccess"));
        triggerRefresh();
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`) : t("semester.deleteError"), "error");
      }
    } catch (err: any) {
      showToast(t("backendMessages.ERR_SYSTEM_ERROR"), "error");
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
      setDeletingItem(null);
    }
  };

  const getStatusBadgeClass = (status: number) => {
    switch (status) {
      case 0: // Draft
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700";
      case 1: // Active
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900";
      case 2: // Completed
        return "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200 dark:border-blue-900";
      case 3: // Closed
        return "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-200 dark:border-rose-900";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusName = (status: number) => {
    switch (status) {
      case 0: return t("semester.formStatusDraft", { defaultValue: "Nháp" });
      case 1: return t("semester.formStatusActive", { defaultValue: "Đang hoạt động" });
      case 2: return t("semester.formStatusCompleted", { defaultValue: "Đã hoàn thành" });
      case 3: return t("semester.formStatusClosed", { defaultValue: "Đã đóng" });
      default: return t("semester.unknownStatus", { defaultValue: "Không rõ" });
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString(i18n.language.startsWith("vi") ? "vi-VN" : "en-US");
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (searchTerm.trim()) {
        const keyword = searchTerm.toLowerCase();
        const codeMatch = item.code?.toLowerCase().includes(keyword);
        const nameMatch = item.name?.toLowerCase().includes(keyword);
        if (!codeMatch && !nameMatch) return false;
      }

      if (statusFilter !== "all") {
        if (item.status !== Number(statusFilter)) return false;
      }

      if (startDateFrom) {
        const itemStart = new Date(item.startDate);
        const fromDate = new Date(startDateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (itemStart < fromDate) return false;
      }

      if (endDateTo) {
        const itemEnd = new Date(item.endDate);
        const toDate = new Date(endDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (itemEnd > toDate) return false;
      }

      return true;
    });
  }, [items, searchTerm, statusFilter, startDateFrom, endDateTo]);

  // ── Sort data ──
  const sortedData = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";

      if (sortKey === "startDate") {
        av = new Date(a.startDate).getTime();
        bv = new Date(b.startDate).getTime();
        return sortOrder === "asc" ? av - bv : bv - av;
      } else {
        av = String(a[sortKey] ?? "");
        bv = String(b[sortKey] ?? "");
        return sortOrder === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
    });
  }, [filteredItems, sortKey, sortOrder]);

  // ── Pagination helpers ──
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = useMemo(() => {
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, startIndex, itemsPerPage]);
  const endIndex = Math.min(startIndex + paginatedItems.length, filteredItems.length);
  const totalRecords = filteredItems.length;
  const totalPages = Math.ceil(totalRecords / itemsPerPage);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-xs">
      {/* Toast Container */}
      {mounted && typeof document !== "undefined" && createPortal(
        <div className="fixed bottom-5 right-5 z-[999999] flex flex-col gap-2 max-w-md w-full sm:w-auto">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl shadow-2xl border border-white/10 dark:border-black/5"
            >
              {toast.type === "success" ? (
                <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
          ))}
        </div>,
        document.body
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 px-5 sm:px-6 py-5 border-b border-gray-100 dark:border-gray-800/80 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t("semester.title")}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t("semester.subtitle")}
          </p>
        </div>
        {hasPermission("Semester.Create") && (
          <button
            onClick={() => {
              setEditingItem(null);
              setIsFormOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-theme-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            {t("semester.btnAddSemester")}
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 w-full items-end">
          {/* Search Input */}
          <div className="relative md:col-span-5">
            <label className="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("semester.filterKeyword", { defaultValue: "Tìm kiếm" })}
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={t("semester.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-transparent border border-gray-350 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400 dark:placeholder:text-white/30 h-11"
              />
              <span className="absolute left-3 top-3.5 text-gray-400">
                <Search className="w-4 h-4" />
              </span>
            </div>
          </div>

          {/* Start Date From */}
          <div className="md:col-span-2">
            <label className="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("semester.dateFrom")}
            </label>
            <DatePicker
              key={`start-${filterResetKey}`}
              id="filterStartDate"
              placeholder={t("semester.dateFrom")}
              dateFormat="d/m/Y"
              staticOption={false}
              defaultDate={startDateFrom || undefined}
              onChange={(dates) => {
                setStartDateFrom(dates && dates.length > 0 ? dates[0] : null);
              }}
            />
          </div>

          {/* End Date To */}
          <div className="md:col-span-2">
            <label className="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("semester.dateTo")}
            </label>
            <DatePicker
              key={`end-${filterResetKey}`}
              id="filterEndDate"
              placeholder={t("semester.dateTo")}
              dateFormat="d/m/Y"
              staticOption={false}
              defaultDate={endDateTo || undefined}
              onChange={(dates) => {
                setEndDateTo(dates && dates.length > 0 ? dates[0] : null);
              }}
            />
          </div>

          {/* Reset Filters button if any filters are active */}
          {/* Reset Filters button */}
          <div className="flex items-center justify-end h-11 md:col-span-3">
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setStartDateFrom(null);
                setEndDateTo(null);
                setFilterResetKey((k) => k + 1);
              }}
              className="inline-flex items-center justify-center px-4 h-11 text-sm font-medium text-gray-700 bg-white border border-gray-350 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors cursor-pointer w-full md:w-auto shadow-theme-xs"
            >
              {t("semester.btnClearFilters")}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
              <TableRow>
                <TableCell isHeader className="px-6 py-4 text-center w-12">#</TableCell>
                <TableCell isHeader className="px-6 py-4 text-left">{t("semester.colCode")}</TableCell>
                <TableCell isHeader className="px-6 py-4 text-left">{t("semester.colName")}</TableCell>
                <TableCell isHeader className="px-6 py-4 text-left">{t("semester.colTime", { defaultValue: "Thời gian" })}</TableCell>
                <TableCell isHeader className="px-6 py-4 text-center">{t("semester.colActions")}</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {Array.from({ length: itemsPerPage }).map((_, idx) => (
                <TableRow key={idx} className="animate-pulse">
                  <TableCell className="px-6 py-4 text-center w-12"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-8 mx-auto" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-16" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-32" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-24" /></TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-1.5">
                      <div className="h-8 w-8 bg-gray-200 dark:bg-white/10 rounded-md" />
                      <div className="h-8 w-8 bg-gray-200 dark:bg-white/10 rounded-md" />
                      <div className="h-8 w-16 bg-gray-200 dark:bg-white/10 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-sm text-rose-500 font-medium">{error}</div>
      ) : items.length === 0 ? (
        <div className="p-16 text-center text-sm text-gray-500 dark:text-gray-400">
          {t("semester.noResults", { defaultValue: "Không tìm thấy học kỳ nào trong hệ thống. Vui lòng bấm nút thêm mới." })}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-16 text-center text-sm text-gray-500 dark:text-gray-400">
          {t("semester.noResults")}
        </div>
      ) : (
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
              <TableRow>
                <TableCell isHeader className="px-6 py-4 text-center w-12">
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">#</p>
                </TableCell>
                <TableCell isHeader className="px-6 py-4 text-left">
                  <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => handleSort("code")}>
                    <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">{t("semester.colCode")}</p>
                    <button className="flex flex-col gap-0.5 ml-2">
                      <AngleUpIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "code" && sortOrder === "asc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                      <AngleDownIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "code" && sortOrder === "desc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                    </button>
                  </div>
                </TableCell>
                <TableCell isHeader className="px-6 py-4 text-left">
                  <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => handleSort("name")}>
                    <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">{t("semester.colName")}</p>
                    <button className="flex flex-col gap-0.5 ml-2">
                      <AngleUpIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "name" && sortOrder === "asc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                      <AngleDownIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "name" && sortOrder === "desc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                    </button>
                  </div>
                </TableCell>
                <TableCell isHeader className="px-6 py-4 text-left">
                  <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => handleSort("startDate")}>
                    <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">{t("semester.colTime", { defaultValue: "Thời gian" })}</p>
                    <button className="flex flex-col gap-0.5 ml-2">
                      <AngleUpIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "startDate" && sortOrder === "asc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                      <AngleDownIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "startDate" && sortOrder === "desc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                    </button>
                  </div>
                </TableCell>
                <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 text-theme-sm dark:text-gray-200">
                  {t("semester.colActions")}
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {paginatedItems.map((item, index) => (
                <TableRow key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                  <TableCell className="px-6 py-4 text-center text-gray-500 dark:text-gray-400 whitespace-nowrap w-12 text-theme-sm">
                    {startIndex + index + 1}
                  </TableCell>
                  <TableCell className="px-6 py-4 font-semibold text-gray-900 dark:text-white whitespace-nowrap text-theme-sm">
                    {item.code}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-gray-750 dark:text-gray-300 font-medium whitespace-nowrap text-theme-sm">
                    <div className="flex items-center gap-2">
                      <span>{item.name}</span>
                      <span className="text-[10px] bg-gray-100 text-gray-600 dark:bg-gray-800/80 dark:text-gray-400 px-1.5 py-0.5 rounded-md font-semibold">
                        {item.classCount ?? 0} {t("dashboardPage.classUnit", { defaultValue: "lớp" })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap text-theme-sm">
                    {formatDate(item.startDate)} - {formatDate(item.endDate)}
                  </TableCell>
                  {/* Unified Actions Group */}
                  <TableCell className="px-6 py-4 text-center whitespace-nowrap text-theme-sm">
                    <div className="flex justify-center items-center gap-1.5">
                      {/* Teacher Availability Setup */}
                      {hasPermission("Semester.Edit") && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSemester(item);
                            setIsAvailabilityOpen(true);
                          }}
                          title={t("semester.actionAvailability")}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 border border-gray-150 dark:border-gray-800 transition-colors"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* View Student Registrations */}
                      {hasPermission("StudentRegistration.View") && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSemester(item);
                            setIsRegistrationsOpen(true);
                          }}
                          title={t("semester.actionViewStudents")}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-brand-50 dark:hover:bg-brand-955/30 text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 border border-gray-150 dark:border-gray-800 transition-colors"
                        >
                          <Users className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Auto Schedule Solver */}
                      {hasPermission("Semester.Scheduling") && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSemester(item);
                            setIsAutoScheduleOpen(true);
                          }}
                          disabled={item.status === 2 || item.status === 3}
                          title={t("semester.actionAutoSchedule")}
                          className="inline-flex h-8 px-2.5 items-center justify-center gap-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-theme-xs transition-colors disabled:opacity-50"
                        >
                          <Cpu className="w-3.5 h-3.5" />
                          {t("semester.actionAutoSchedule")}
                        </button>
                      )}

                      {/* Divider */}
                      {(hasPermission("Semester.Edit") || hasPermission("Semester.Delete")) && (
                        <div className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-1" />
                      )}

                      {/* Edit */}
                      {hasPermission("Semester.Edit") && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(item);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition-colors"
                          title={t("semester.actionEdit")}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}

                      {/* Delete */}
                      {hasPermission("Semester.Delete") && (
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingItem(item);
                            setIsDeleteOpen(true);
                          }}
                          className="p-1.5 text-error-600 hover:text-error-800 dark:text-error-400 dark:hover:text-error-300 hover:bg-error-50 dark:hover:bg-error-950/30 rounded-md transition-colors"
                          title={t("semester.actionDelete")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination Footer */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between px-6 py-5 bg-gray-50/50 dark:bg-white/[0.01] border-t border-gray-100 dark:border-gray-800/40">
        <div className="flex flex-wrap items-center gap-4 pb-3 xl:pb-0 justify-center xl:justify-start">
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <span>{t("semester.show")}</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-8 rounded-lg border border-gray-350 dark:border-gray-700 bg-transparent px-2 text-sm text-gray-700 dark:text-gray-350 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer font-medium"
            >
              <option value="5" className="dark:bg-gray-900">5</option>
              <option value="10" className="dark:bg-gray-900">10</option>
              <option value="20" className="dark:bg-gray-900">20</option>
              <option value="50" className="dark:bg-gray-900">50</option>
            </select>
            <span>{t("semester.entries")}</span>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t("semester.showing", {
              start: totalRecords === 0 ? 0 : startIndex + 1,
              end: endIndex,
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

      {/* Modals */}
      <SemesterFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingItem(null);
        }}
        editingItem={editingItem}
        onSubmitSuccess={(msg) => {
          showToast(msg);
          triggerRefresh();
        }}
      />

      {activeSemester && (
        <>
          <TeacherAvailabilityModal
            isOpen={isAvailabilityOpen}
            onClose={() => {
              setIsAvailabilityOpen(false);
              setActiveSemester(null);
            }}
            semesterId={activeSemester.id}
            semesterName={activeSemester.name}
            showToast={showToast}
          />

          <AutoScheduleModal
            isOpen={isAutoScheduleOpen}
            onClose={() => {
              setIsAutoScheduleOpen(false);
              setActiveSemester(null);
            }}
            semesterId={activeSemester.id}
            semesterName={activeSemester.name}
            showToast={showToast}
            onSuccess={() => triggerRefresh()}
          />

          <SemesterRegistrationsViewModal
            isOpen={isRegistrationsOpen}
            onClose={() => {
              setIsRegistrationsOpen(false);
              setActiveSemester(null);
            }}
            semesterId={activeSemester.id}
            semesterName={activeSemester.name}
          />
        </>
      )}

      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingItem(null);
        }}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        itemName={deletingItem?.name || ""}
      />
    </div>
  );
}

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, Calendar, BookOpen, CheckSquare, Edit, Trash2 } from "lucide-react";
import { semesterApi, SemesterItem, StudentRegistrationDto } from "@/services/semester.api";
import { courseApi, CourseItem } from "@/services/course.api";
import { StudentRegistrationModal } from "./StudentRegistrationModal";
import PaginationWithIcon from "@/components/tables/DataTables/TableOne/PaginationWithIcon";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/modal";
import { authApi } from "@/services/auth.api";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { AngleDownIcon, AngleUpIcon } from "@/icons";

export default function StudentRegistrationTable() {
  const { t } = useTranslation();
  const [semesters, setSemesters] = useState<SemesterItem[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(null);
  
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<number | null>(null);

  const [permissions, setPermissions] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const role = authApi.getRole().toLowerCase();
    setIsAdmin(role === "admin");
    setPermissions(authApi.getPermissions());
  }, []);

  const hasPermission = (perm: string) => {
    return isAdmin || permissions.includes(perm);
  };

  const [registrations, setRegistrations] = useState<StudentRegistrationDto[]>([]);
  
  // Paging state
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Loading States
  const [isLoadingSemesters, setIsLoadingSemesters] = useState(true);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingList, setIsLoadingList] = useState(false);

  // Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Sort ──
  type SortKey = "studentCode" | "studentName" | "courseName" | "status" | "createdAt" | "id";
  type SortOrder = "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const sortedData = useMemo(() => {
    return [...registrations].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";

      if (sortKey === "status") {
        av = a.status;
        bv = b.status;
        return sortOrder === "asc" ? av - bv : bv - av;
      } else if (sortKey === "id") {
        av = a.id;
        bv = b.id;
        return sortOrder === "asc" ? av - bv : bv - av;
      } else if (sortKey === "createdAt") {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return sortOrder === "asc" ? at - bt : bt - at;
      } else {
        av = String(a[sortKey] ?? "");
        bv = String(b[sortKey] ?? "");
        return sortOrder === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
    });
  }, [registrations, sortKey, sortOrder]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [registrationToEdit, setRegistrationToEdit] = useState<StudentRegistrationDto | null>(null);

  // Delete Confirm Modal State
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteConfirmStudentName, setDeleteConfirmStudentName] = useState<string>("");
  const [deleteConfirmCourseName, setDeleteConfirmCourseName] = useState<string>("");

  // Bulk Delete States
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Clear selections when registrations change
  useEffect(() => {
    setSelectedIds([]);
  }, [registrations]);

  const deletableRegistrations = useMemo(() => {
    return registrations.filter((r) => r.status !== 1);
  }, [registrations]);

  const isAllSelected = useMemo(() => {
    return deletableRegistrations.length > 0 && deletableRegistrations.every((r) => selectedIds.includes(r.id));
  }, [deletableRegistrations, selectedIds]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = [...selectedIds];
      deletableRegistrations.forEach((r) => {
        if (!newSelected.includes(r.id)) {
          newSelected.push(r.id);
        }
      });
      setSelectedIds(newSelected);
    } else {
      setSelectedIds(selectedIds.filter((id) => !deletableRegistrations.some((r) => r.id === id)));
    }
  };

  const executeBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      const res = await semesterApi.deleteStudentRegistrations(selectedIds);
      if (res.success) {
        showToast(t("registration.toastBulkDeleteSuccess", { defaultValue: "Xóa các đăng ký học viên thành công!" }));
        setSelectedIds([]);
        triggerRefresh();
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`) : t("registration.toastBulkDeleteError", { defaultValue: "Lỗi khi xóa các đăng ký học viên." }), "error");
      }
    } catch (err: any) {
      showToast(err.message || t("registration.toastSystemError"), "error");
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
    }
  };

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

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  const handleDelete = (id: number, studentName: string, courseName: string) => {
    setDeleteConfirmId(id);
    setDeleteConfirmStudentName(studentName);
    setDeleteConfirmCourseName(courseName);
  };

  const executeDelete = async (id: number) => {
    try {
      const res = await semesterApi.deleteStudentRegistration(id);
      if (res.success) {
        showToast(t("registration.toastDeleteSuccess", { defaultValue: "Xóa đăng ký thành công!" }));
        triggerRefresh();
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`) : t("registration.toastDeleteError", { defaultValue: "Lỗi khi xóa đăng ký." }), "error");
      }
    } catch (err: any) {
       showToast(err.message || t("registration.toastSystemError"), "error");
    }
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPageIndex(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load Semesters
  useEffect(() => {
    async function loadSemesters() {
      setIsLoadingSemesters(true);
      try {
        const res = await semesterApi.getAll();
        if (res.success && res.data) {
          const list = res.data || [];
          setSemesters(list);
        }
      } catch (err: any) {
        console.error("Lỗi tải học kỳ:", err);
      } finally {
        setIsLoadingSemesters(false);
      }
    }
    loadSemesters();
  }, []);

  // Load Courses (for filtering)
  useEffect(() => {
    async function loadCourses() {
      setIsLoadingCourses(true);
      try {
        const res = await courseApi.getAll(1, 1000, "", true);
        if (res.success && res.data) {
          setCourses(res.data.items || []);
        }
      } catch (err: any) {
        console.error("Lỗi tải khóa học:", err);
      } finally {
        setIsLoadingCourses(false);
      }
    }
    loadCourses();
  }, []);

  // Load Registrations for Selected Semester & Filters
  useEffect(() => {
    let mounted = true;
    async function loadRegistrations() {
      setIsLoadingList(true);
      setError(null);
      try {
        const res = await semesterApi.getStudentRegistrations(
          selectedSemesterId,
          debouncedSearchTerm,
          selectedCourseId,
          selectedStatus,
          pageIndex,
          pageSize
        );
        if (!mounted) return;
        if (res.success && res.data) {
          // Response is paginated: StudentRegistrationPagingResponse
          setRegistrations(res.data.items || []);
          setTotalRecords(res.data.totalRecords || 0);
          setTotalPages(res.data.totalPages || 0);
        } else {
          setError(res.message ? t(`backendMessages.${res.message}`) : t("registration.noResults", { defaultValue: "Không thể tải danh sách đăng ký." }));
          setRegistrations([]);
          setTotalRecords(0);
          setTotalPages(0);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || t("registration.toastSystemError"));
          setRegistrations([]);
          setTotalRecords(0);
          setTotalPages(0);
        }
      } finally {
        if (mounted) setIsLoadingList(false);
      }
    }
    loadRegistrations();

    return () => {
      mounted = false;
    };
  }, [selectedSemesterId, debouncedSearchTerm, selectedCourseId, selectedStatus, pageIndex, pageSize, refreshKey]);

  const getStatusBadgeClass = (status: number) => {
    switch (status) {
      case 1:
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-900";
      case 2:
        return "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-250 dark:border-rose-900";
      default: // 0 - Pending
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-250 dark:border-amber-900";
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 1: return t("registration.statusScheduled");
      case 2: return t("registration.statusCancelled");
      default: return t("registration.statusPending");
    }
  };

  const selectedSemester = semesters.find((s) => s.id === selectedSemesterId);
  const semesterName = selectedSemester ? selectedSemester.name : "";

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-155 dark:border-gray-800 rounded-2xl shadow-xs">
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

      {/* Card Header */}
      <div className="flex flex-col gap-4 px-5 sm:px-6 py-5 border-b border-gray-100 dark:border-gray-800/80 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t("registration.title")}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t("registration.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          {selectedIds.length > 0 && hasPermission("StudentRegistration.Delete") && (
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-theme-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              {t("registration.btnBulkDelete")} ({selectedIds.length})
            </button>
          )}
          {hasPermission("StudentRegistration.Create") && (
            <button
              onClick={() => {
                setIsModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-theme-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t("registration.addRegistration")}
            </button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 sm:p-5 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between border-b border-gray-50 dark:border-gray-800/40 bg-gray-50/20 dark:bg-gray-900/10">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Text Search */}
          <div className="relative w-full sm:max-w-xs">
            <input
              type="text"
              placeholder={t("registration.placeholderSearch")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 w-full pl-10 pr-4 py-2 text-sm bg-transparent border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder-gray-400"
            />
            <span className="absolute left-3 top-3.5 text-gray-400">
              <Search className="w-4 h-4" />
            </span>
          </div>
 
          {/* Semester Selector */}
          <div className="w-full sm:w-[180px]">
            <SearchableSelect
              disabled={isLoadingSemesters}
              value={selectedSemesterId || ""}
              onChange={(value) => {
                setSelectedSemesterId(value ? Number(value) : null);
                setPageIndex(1);
              }}
              options={semesters.map((s) => ({ value: s.id, label: s.name }))}
              placeholder={t("registration.selectSemester")}
              onClear={() => {
                setSelectedSemesterId(null);
                setPageIndex(1);
              }}
            />
          </div>
 
          {/* Course Selector */}
          <div className="w-full sm:w-[220px]">
            <SearchableSelect
              disabled={isLoadingCourses}
              value={selectedCourseId ?? ""}
              onChange={(value) => {
                setSelectedCourseId(value ? Number(value) : null);
                setPageIndex(1);
              }}
              options={courses.map((c) => ({ value: c.id, label: c.name }))}
              placeholder={t("registration.selectCourse")}
              onClear={() => {
                setSelectedCourseId(null);
                setPageIndex(1);
              }}
            />
          </div>
 
          {/* Status Selector */}
          <div className="w-full sm:w-[160px]">
            <SearchableSelect
              value={selectedStatus !== null ? selectedStatus : ""}
              onChange={(value) => {
                setSelectedStatus(value !== "" ? Number(value) : null);
                setPageIndex(1);
              }}
              options={[
                { value: 0, label: t("registration.statusPending") },
                { value: 1, label: t("registration.statusScheduled") },
                { value: 2, label: t("registration.statusCancelled") },
              ]}
              placeholder={t("registration.selectStatus")}
              onClear={() => {
                setSelectedStatus(null);
                setPageIndex(1);
              }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setSearchTerm("");
            setSelectedCourseId(null);
            setSelectedStatus(null);
            setPageIndex(1);
          }}
          className="inline-flex items-center justify-center px-4 h-11 text-sm font-medium text-gray-700 bg-white border border-gray-355 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors cursor-pointer w-full md:w-auto shadow-theme-xs shrink-0 self-stretch md:self-auto"
        >
          {t("registration.btnResetFilters")}
        </button>
      </div>

      {/* Table Data */}
      {semesters.length === 0 && !isLoadingSemesters ? (
        <div className="p-16 text-center text-sm text-gray-500 dark:text-gray-400">
          {t("registration.noSemesters")}
        </div>
      ) : isLoadingList ? (
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
              <TableRow>
                <TableCell isHeader className="px-6 py-4 text-center w-12">
                  <input type="checkbox" disabled checked={false} readOnly className="rounded border-gray-300 opacity-50" />
                </TableCell>
                <TableCell isHeader className="px-6 py-4 text-center w-12">#</TableCell>
                <TableCell isHeader className="px-6 py-4 text-left">{t("registration.colStudentCode")}</TableCell>
                <TableCell isHeader className="px-6 py-4 text-left">{t("registration.colStudent")}</TableCell>
                <TableCell isHeader className="px-6 py-4 text-left">{t("registration.colContact")}</TableCell>
                <TableCell isHeader className="px-6 py-4 text-left">{t("registration.colCourse")}</TableCell>
                <TableCell isHeader className="px-6 py-4 text-left">{t("registration.colPreferredSlots")}</TableCell>
                <TableCell isHeader className="px-6 py-4 text-left">{t("registration.colEnrollType")}</TableCell>
                <TableCell isHeader className="px-6 py-4 text-left">{t("registration.colCreatedAt")}</TableCell>
                <TableCell isHeader className="px-6 py-4 text-left">{t("registration.colStatus")}</TableCell>
                <TableCell isHeader className="px-6 py-4 text-center">{t("registration.colActions", { defaultValue: "Thao tác" })}</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {Array.from({ length: pageSize }).map((_, idx) => (
                <TableRow key={idx} className="animate-pulse">
                  <TableCell className="px-6 py-4 text-center w-12"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-4 mx-auto" /></TableCell>
                  <TableCell className="px-6 py-4 text-center w-12"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-8 mx-auto" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-16" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-28" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-32" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-24" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-20" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-16" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-24" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-16" /></TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-1.5">
                      <div className="h-8 w-8 bg-gray-200 dark:bg-white/10 rounded-md" />
                      <div className="h-8 w-8 bg-gray-200 dark:bg-white/10 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-sm text-rose-500 font-medium">{error}</div>
      ) : registrations.length === 0 ? (
        <div className="p-16 text-center text-sm text-gray-500 dark:text-gray-400">
          {searchTerm || selectedCourseId || selectedStatus !== null ? t("registration.noResults") : t("registration.noRegistered")}
        </div>
      ) : (
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
              <TableRow>
                <TableCell isHeader className="px-6 py-4 text-center w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </TableCell>
                <TableCell isHeader className="px-6 py-4 text-center w-12">
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">#</p>
                </TableCell>
                <TableCell isHeader className="px-6 py-4 text-left">
                  <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => handleSort("studentCode")}>
                    <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">{t("registration.colStudentCode")}</p>
                    <button className="flex flex-col gap-0.5 ml-2">
                      <AngleUpIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "studentCode" && sortOrder === "asc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                      <AngleDownIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "studentCode" && sortOrder === "desc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                    </button>
                  </div>
                </TableCell>
                <TableCell isHeader className="px-6 py-4 text-left">
                  <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => handleSort("studentName")}>
                    <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">{t("registration.colStudent")}</p>
                    <button className="flex flex-col gap-0.5 ml-2">
                      <AngleUpIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "studentName" && sortOrder === "asc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                      <AngleDownIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "studentName" && sortOrder === "desc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                    </button>
                  </div>
                </TableCell>
                <TableCell isHeader className="px-6 py-4 text-left">
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">{t("registration.colContact")}</p>
                </TableCell>
                <TableCell isHeader className="px-6 py-4 text-left">
                  <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => handleSort("courseName")}>
                    <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">{t("registration.colCourse")}</p>
                    <button className="flex flex-col gap-0.5 ml-2">
                      <AngleUpIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "courseName" && sortOrder === "asc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                      <AngleDownIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "courseName" && sortOrder === "desc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                    </button>
                  </div>
                </TableCell>
                <TableCell isHeader className="px-6 py-4 text-left">
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">{t("registration.colPreferredSlots")}</p>
                </TableCell>
                <TableCell isHeader className="px-6 py-4 text-left">
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">
                    {t("registration.colEnrollType")}
                  </p>
                </TableCell>
                <TableCell isHeader className="px-6 py-4 text-left">
                  <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => handleSort("createdAt")}>
                    <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">{t("registration.colCreatedAt")}</p>
                    <button className="flex flex-col gap-0.5 ml-2">
                      <AngleUpIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "createdAt" && sortOrder === "asc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                      <AngleDownIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "createdAt" && sortOrder === "desc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                    </button>
                  </div>
                </TableCell>
                <TableCell isHeader className="px-6 py-4 text-left">
                  <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => handleSort("status")}>
                    <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">{t("registration.colStatus")}</p>
                    <button className="flex flex-col gap-0.5 ml-2">
                      <AngleUpIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "status" && sortOrder === "asc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                      <AngleDownIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "status" && sortOrder === "desc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                    </button>
                  </div>
                </TableCell>
                <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 text-theme-sm dark:text-gray-200">
                  {t("registration.colActions", { defaultValue: "Thao tác" })}
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {sortedData.map((item, index) => (
                <TableRow key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                  <TableCell className="px-6 py-4 text-center w-12 text-theme-sm">
                    <input
                      type="checkbox"
                      disabled={item.status === 1}
                      checked={selectedIds.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds([...selectedIds, item.id]);
                        } else {
                          setSelectedIds(selectedIds.filter((id) => id !== item.id));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center text-gray-500 dark:text-gray-400 whitespace-nowrap w-12 text-theme-sm">
                    {(pageIndex - 1) * pageSize + index + 1}
                  </TableCell>
                  <TableCell className="px-6 py-4 font-semibold text-gray-900 dark:text-white whitespace-nowrap text-theme-sm">
                    {item.studentCode || <span className="text-gray-400 italic font-normal">—</span>}
                  </TableCell>
                  <TableCell className="px-6 py-4 font-semibold text-gray-900 dark:text-white whitespace-nowrap text-theme-sm">
                    {item.studentName}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-theme-sm whitespace-nowrap">
                    <div className="text-gray-800 dark:text-gray-200">{item.studentEmail}</div>
                    <div className="text-gray-400 mt-0.5">{item.studentPhone || "—"}</div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-gray-750 dark:text-gray-300 font-medium whitespace-nowrap text-theme-sm">
                    {item.courseName || t("semester.courseIdText", { id: item.courseId })}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-theme-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1 text-xs max-w-[200px]">
                      {(() => {
                        const elements: React.ReactNode[] = [];
                        if (item.preferredSlotIndex !== null && item.preferredSlotIndex !== undefined) {
                          elements.push(
                            <span key="slot" className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 rounded font-semibold border border-blue-100 dark:border-blue-900/30">
                              Ca {item.preferredSlotIndex + 1}
                            </span>
                          );
                        }
                        if (item.preferredDaysOfWeek !== null && item.preferredDaysOfWeek !== undefined && item.preferredDaysOfWeek > 0) {
                          const names: string[] = [];
                          const mask = item.preferredDaysOfWeek;
                          if ((mask & 2) !== 0) names.push("T2");
                          if ((mask & 4) !== 0) names.push("T3");
                          if ((mask & 8) !== 0) names.push("T4");
                          if ((mask & 16) !== 0) names.push("T5");
                          if ((mask & 32) !== 0) names.push("T6");
                          if ((mask & 64) !== 0) names.push("T7");
                          if ((mask & 1) !== 0) names.push("CN");
                          elements.push(
                            <span key="days" className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                              {names.join(", ")}
                            </span>
                          );
                        }
                        if (elements.length > 0) return elements;

                        const hasSlotFormat = item.preferredSlots?.some((s) => s.startsWith("Slot:"));
                        if (hasSlotFormat) {
                          const getDayName = (dayVal: number) => {
                            switch (dayVal) {
                              case 1: return "T2";
                                case 2: return "T3";
                                case 3: return "T4";
                                case 4: return "T5";
                                case 5: return "T6";
                                case 6: return "T7";
                                case 0: return "CN";
                                default: return "";
                            }
                          };
                          
                          const sortedSlots = [...(item.preferredSlots || [])].sort((a, b) => {
                            const parse = (str: string) => {
                              const parts = str.split(":");
                              return {
                                slot: parseInt(parts[1]) || 0,
                                day: parseInt(parts[2]) || 0,
                              };
                            };
                            const pa = parse(a);
                            const pb = parse(b);
                            if (pa.day !== pb.day) return pa.day - pb.day;
                            return pa.slot - pb.slot;
                          });

                          return sortedSlots.map((s) => {
                            const parts = s.split(":");
                            const sIdx = parseInt(parts[1]) ?? 0;
                            const dVal = parseInt(parts[2]) ?? 0;
                            return (
                              <span key={s} className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 rounded font-semibold border border-blue-100 dark:border-blue-900/30">
                                Ca {sIdx + 1} - {getDayName(dVal)}
                              </span>
                            );
                          });
                        }

                        if (item.preferredSlots && item.preferredSlots.length > 0) {
                          return item.preferredSlots.map((slot) => (
                            <span key={slot} className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                              {slot === "Morning" ? t("registration.slotMorning") : slot === "Afternoon" ? t("registration.slotAfternoon") : t("registration.slotEvening")}
                            </span>
                          ));
                        }

                        return <span className="text-gray-400 italic">{t("registration.slotDefault")}</span>;
                      })()}
                    </div>
                  </TableCell>
                   <TableCell className="px-6 py-4 whitespace-nowrap text-theme-sm">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                      item.enrollType === 1
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                        : "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
                    }`}>
                      {item.enrollType === 1 ? t("registration.enrollTypeOnline") : t("registration.enrollTypeOffline")}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-theme-sm text-gray-600 dark:text-gray-400">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString("vi-VN", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }) : "—"}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-theme-sm">
                    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(item.status)}`}>
                      {getStatusText(item.status)}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center whitespace-nowrap text-theme-sm">
                    <div className="flex items-center justify-center gap-2">
                      {hasPermission("StudentRegistration.Edit") && (
                        <button
                          disabled={item.status === 1}
                          onClick={() => {
                            if (item.status === 1) return;
                            setRegistrationToEdit(item);
                            setIsModalOpen(true);
                          }}
                          className={`p-1.5 rounded-md transition-colors ${
                            item.status === 1
                              ? "text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50"
                              : "text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer"
                          }`}
                          title={item.status === 1 ? "Không thể chỉnh sửa đăng ký đã xếp lớp" : t("common.edit", { defaultValue: "Sửa" })}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {hasPermission("StudentRegistration.Delete") && (
                        <button
                          disabled={item.status === 1}
                          onClick={() => {
                            if (item.status === 1) return;
                            handleDelete(item.id, item.studentName || "", item.courseName || "");
                          }}
                          className={`p-1.5 rounded-md transition-colors ${
                            item.status === 1
                              ? "text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50"
                              : "text-error-600 hover:text-error-800 dark:text-error-400 dark:hover:text-error-300 hover:bg-error-50 dark:hover:bg-error-950/30 cursor-pointer"
                          }`}
                          title={item.status === 1 ? "Không thể xóa đăng ký đã xếp lớp" : t("common.delete", { defaultValue: "Xóa" })}
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
      {registrations.length > 0 && (
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between px-6 py-5 bg-gray-50/50 dark:bg-white/[0.01] border-t border-gray-100 dark:border-gray-800/40">
          <div className="flex flex-wrap items-center gap-4 pb-3 xl:pb-0 justify-center xl:justify-start">
            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <span>{t("registration.showing")}</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPageIndex(1);
                }}
                className="h-8 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-2 text-sm text-gray-700 dark:text-gray-350 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer font-medium"
              >
                <option value="5" className="dark:bg-gray-900">5</option>
                <option value="10" className="dark:bg-gray-900">10</option>
                <option value="20" className="dark:bg-gray-900">20</option>
                <option value="50" className="dark:bg-gray-900">50</option>
              </select>
              <span>{t("registration.entriesPerPage")}</span>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("registration.showingEntries", {
                start: totalRecords === 0 ? 0 : (pageIndex - 1) * pageSize + 1,
                end: Math.min(pageIndex * pageSize, totalRecords),
                total: totalRecords
              })}
            </p>
          </div>
          {totalPages > 1 && (
            <PaginationWithIcon
              totalPages={totalPages}
              initialPage={pageIndex}
              onPageChange={(p) => setPageIndex(p)}
            />
          )}
        </div>
      )}

      {/* Modal */}
      <StudentRegistrationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setRegistrationToEdit(null);
        }}
        defaultSemesterId={selectedSemesterId}
        showToast={showToast}
        onSuccess={() => triggerRefresh()}
        registrationToEdit={registrationToEdit}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        showCloseButton={false}
        className="max-w-[450px] p-6 lg:p-8"
      >
        <div className="flex flex-col items-center text-center">
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 rounded-2xl text-rose-500 mb-4 border border-rose-100 dark:border-rose-900/30">
            <Trash2 className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-gray-900 dark:text-white">
            {t("registration.confirmDeleteTitle", { defaultValue: "Xác nhận xóa đăng ký" })}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
            {t("registration.confirmDeleteText", {
              courseName: deleteConfirmCourseName,
              studentName: deleteConfirmStudentName,
              defaultValue: `Bạn có chắc chắn muốn xóa đăng ký học khóa ${deleteConfirmCourseName} của học sinh ${deleteConfirmStudentName} không?`
            })}
          </p>
          <div className="flex items-center justify-center gap-3 mt-6 w-full pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setDeleteConfirmId(null)}
              type="button"
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-850 dark:border-gray-700 dark:hover:bg-gray-750 transition-colors w-1/2"
            >
              {t("common.cancel", { defaultValue: "Hủy" })}
            </button>
            <button
              onClick={() => {
                if (deleteConfirmId !== null) {
                   executeDelete(deleteConfirmId);
                }
                setDeleteConfirmId(null);
              }}
              type="button"
              className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm w-1/2 flex items-center justify-center gap-1.5"
            >
              {t("common.delete", { defaultValue: "Xóa" })}
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        showCloseButton={false}
        className="max-w-[450px] p-6 lg:p-8"
      >
        <div className="flex flex-col items-center text-center">
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 rounded-2xl text-rose-500 mb-4 border border-rose-100 dark:border-rose-900/30">
            <Trash2 className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-gray-900 dark:text-white">
            {t("registration.confirmBulkDeleteTitle", { defaultValue: "Xác nhận xóa nhiều đăng ký" })}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
            {t("registration.confirmBulkDeleteText", {
              count: selectedIds.length,
              defaultValue: `Bạn có chắc chắn muốn xóa ${selectedIds.length} đăng ký học viên đã chọn không? Hành động này không thể hoàn tác.`
            })}
          </p>
          <div className="flex items-center justify-center gap-3 mt-6 w-full pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              disabled={isBulkDeleting}
              onClick={() => setShowBulkDeleteConfirm(false)}
              type="button"
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-850 dark:border-gray-700 dark:hover:bg-gray-750 transition-colors w-1/2 disabled:opacity-50"
            >
              {t("common.cancel", { defaultValue: "Hủy" })}
            </button>
            <button
              disabled={isBulkDeleting}
              onClick={executeBulkDelete}
              type="button"
              className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm w-1/2 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isBulkDeleting ? t("common.deleting", { defaultValue: "Đang xóa..." }) : t("common.delete", { defaultValue: "Xóa" })}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

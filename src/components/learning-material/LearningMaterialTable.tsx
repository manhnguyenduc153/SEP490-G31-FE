"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AngleDownIcon, AngleUpIcon } from "@/icons";
import PaginationWithIcon from "@/components/tables/DataTables/TableOne/PaginationWithIcon";
import { MaterialFormModal } from "./MaterialFormModal";
import { MaterialViewModal } from "./MaterialViewModal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import DatePicker from "@/components/form/date-picker";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import {
  learningMaterialApi,
  LearningMaterialItem,
} from "@/services/learningMaterial.api";
import { courseApi, CourseItem } from "@/services/course.api";
import { classApi, ClassItem } from "@/services/class.api";
import { commonApi } from "@/services/common.api";
import { teacherApi } from "@/services/teacher.api";
import { authApi } from "@/services/auth.api";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { useTranslation } from "react-i18next";
import { FileText, Plus, Search, Filter, BookOpen, Layers, CheckCircle, HelpCircle, HardDrive, ListFilter, Eye, Download, Edit, Trash2, ChevronDown } from "lucide-react";
import { CodeHelper } from "@/helpers/CodeHelper";
import { downloadFileFromUrl } from "@/utils";
import { ENV } from "@/config/env";

type SortKey = "code" | "name" | "title" | "createdAt" | "id";
type SortOrder = "asc" | "desc";
type TabMode = "all" | "class" | "library";

export default function LearningMaterialTable() {
  const { t } = useTranslation();

  // Dynamic Metadata
  useEffect(() => {
    document.title = `${t("learningMaterial.title", { defaultValue: "Tài liệu học tập" })} | School Management System`;
  }, [t]);

  // Tab mode matching mock: "Giáo án theo lớp" vs "Kho Giáo án"
  const [tabMode, setTabMode] = useState<TabMode>("all");

  // Data states
  const [items, setItems] = useState<LearningMaterialItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    documents: 0,
  });

  // Pagination / search / sort / filters
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  
  // Advanced filters from Mock
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  
  // Date filters from Mock
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [filterResetKey, setFilterResetKey] = useState(0);

  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  // User identity resolving
  const [currentTeacherId, setCurrentTeacherId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState("");

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Create / Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LearningMaterialItem | null>(null);

  // View modal
  const [viewingItem, setViewingItem] = useState<LearningMaterialItem | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<LearningMaterialItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast auto-hide
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
  };

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Resolve current user info
  useEffect(() => {
    const role = authApi.getRole();
    setUserRole(role);

    async function resolveTeacher() {
      const username = localStorage.getItem("username");
      if (role.toLowerCase() === "teacher" && username) {
        try {
          const res = await teacherApi.getAll(1, 100, username);
          if (res.success && res.data && res.data.items) {
            const matched = res.data.items.find((t) => t.email === username);
            if (matched) {
              setCurrentTeacherId(matched.id);
            }
          }
        } catch (e) {
          console.error("Failed to resolve current teacher profile", e);
        }
      }
    }
    resolveTeacher();
  }, []);

  // Fetch filter options (classes and courses)
  useEffect(() => {
    async function loadFilters() {
      try {
        const [courseRes, classRes] = await Promise.all([
          commonApi.getCourses(1, 100, "", true),
          commonApi.getClasses(1, 100),
        ]);
        if (courseRes.success && courseRes.data) {
          setCourses(courseRes.data.items || []);
        }
        if (classRes.success && classRes.data) {
          setClasses(classRes.data.items || []);
        }
      } catch (err) {
        console.error("Failed to load active filters", err);
      }
    }
    loadFilters();
  }, []);

  // Fetch learning materials & calculate stats
  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        // Query param maps
        const statusVal = selectedStatus === "active" ? 1 : selectedStatus === "inactive" ? 0 : null;

        // In Mock tab:
        // "Tài liệu theo lớp" (class) -> only load materials with classId != null
        // "Kho tài liệu" (library) -> only load materials with classId == null (general repository)
        const isClassOnly = tabMode === "class";
        const isLibraryOnly = tabMode === "library";

        // Call backend API with advanced filters
        const res = await learningMaterialApi.getAll(
          currentPage,
          itemsPerPage,
          debouncedSearchTerm,
          selectedClassId,
          selectedCourseId
        );

        if (!mounted) return;
        if (res.success && res.data) {
          let filteredItems = res.data.items || [];

          // Apply Client-Side Filter for tabs/status/dates to match visual mock strictly
          if (isClassOnly) {
            filteredItems = filteredItems.filter(x => x.classId !== null);
          } else if (isLibraryOnly) {
            filteredItems = filteredItems.filter(x => x.classId === null);
          }

          if (statusVal !== null) {
            filteredItems = filteredItems.filter(x => x.status === statusVal);
          }

          if (fromDate) {
            const fromTime = fromDate.getTime();
            filteredItems = filteredItems.filter(x => new Date(x.createdAt).getTime() >= fromTime);
          }
          if (toDate) {
            const toTime = new Date(toDate);
            toTime.setHours(23, 59, 59, 999);
            filteredItems = filteredItems.filter(x => new Date(x.createdAt).getTime() <= toTime.getTime());
          }

          setItems(filteredItems);
          setTotalRecords(filteredItems.length);
          setTotalPages(Math.ceil(filteredItems.length / itemsPerPage) || 1);

          // Calculate visual stats for cards
          const activeCount = filteredItems.filter(x => x.status === 1).length;
          const inactiveCount = filteredItems.filter(x => x.status === 0).length;
          const docCount = filteredItems.filter(x => 
            x.fileUrl?.endsWith(".pdf") || 
            x.fileUrl?.endsWith(".docx") || 
            x.fileUrl?.endsWith(".doc") || 
            x.fileType?.includes("pdf") || 
            x.fileType?.includes("word") || 
            x.fileType?.includes("document")
          ).length;

          setStats({
            total: filteredItems.length,
            active: activeCount,
            inactive: inactiveCount,
            documents: docCount,
          });
        } else {
          setError(
            res.message
              ? t(`backendMessages.${res.message}`, { defaultValue: res.message })
              : t("learningMaterial.systemError")
          );
        }
      } catch {
        if (mounted) setError(t("learningMaterial.systemError"));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [
    currentPage, 
    itemsPerPage, 
    debouncedSearchTerm, 
    selectedClassId, 
    selectedCourseId, 
    selectedStatus,
    fromDate,
    toDate,
    tabMode,
    refreshKey, 
    t
  ]);

  // Sort logic
  const sortedData = useMemo(() => {
    return [...items].sort((a, b) => {
      if (sortKey === "createdAt") {
        const av = new Date(a.createdAt).getTime();
        const bv = new Date(b.createdAt).getTime();
        return sortOrder === "asc" ? av - bv : bv - av;
      } else if (sortKey === "id") {
        const av = a.id;
        const bv = b.id;
        return sortOrder === "asc" ? av - bv : bv - av;
      }
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      return sortOrder === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [items, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setSelectedClassId(null);
    setSelectedCourseId(null);
    setSelectedStatus("all");
    setFromDate(null);
    setToDate(null);
    setFilterResetKey((k) => k + 1);
    setCurrentPage(1);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: LearningMaterialItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const openViewModal = async (item: LearningMaterialItem) => {
    setViewingItem(item);
    setIsLoadingDetail(true);
    setIsViewModalOpen(true);
    try {
      const res = await learningMaterialApi.getById(item.id);
      if (res.success && res.data) {
        setViewingItem(res.data);
      } else {
        showToast(
          res.message
            ? t(`backendMessages.${res.message}`, { defaultValue: res.message })
            : t("learningMaterial.systemError"),
          "error"
        );
      }
    } catch {
      showToast(t("learningMaterial.systemError"), "error");
    } finally {
      setIsLoadingDetail(false);
    }
  };



  const openDeleteModal = (item: LearningMaterialItem) => {
    setDeleteTarget(item);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await learningMaterialApi.delete(deleteTarget.id);
      if (res.success) {
        showToast(t("learningMaterial.deleteSuccess", { name: deleteTarget.name }));
        setIsDeleteModalOpen(false);
        setDeleteTarget(null);
        triggerRefresh();
      } else {
        showToast(
          res.message
            ? t(`backendMessages.${res.message}`, { defaultValue: res.message })
            : t("learningMaterial.deleteError"),
          "error"
        );
      }
    } catch {
      showToast(t("learningMaterial.systemError"), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const checkEditPermission = (item: LearningMaterialItem) => {
    const role = userRole.toLowerCase();
    if (role === "admin") return true;

    if (authApi.hasPermission("LearningMaterial.Edit")) {
      if (role === "teacher" && currentTeacherId !== null) {
        return item.uploadedBy === currentTeacherId;
      }
      return true;
    }
    return false;
  };

  const checkDeletePermission = (item: LearningMaterialItem) => {
    const role = userRole.toLowerCase();
    if (role === "admin") return true;

    if (authApi.hasPermission("LearningMaterial.Delete")) {
      if (role === "teacher" && currentTeacherId !== null) {
        return item.uploadedBy === currentTeacherId;
      }
      return true;
    }
    return false;
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + items.length, totalRecords);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[99999] flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl shadow-2xl border border-white/10 dark:border-black/5 animate-bounce">
          {toastType === "success" ? (
            <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* ── 1. TOP CARDS (Giáo án theo lớp vs Kho giáo án) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Tài liệu theo lớp */}
        <div
          onClick={() => {
            setTabMode("class");
            setCurrentPage(1);
          }}
          className={`flex items-center gap-4 p-5 rounded-2xl border cursor-pointer transition-all duration-200 shadow-xs ${
            tabMode === "class"
              ? "bg-brand-50 border-brand-200 dark:bg-brand-950/20 dark:border-brand-850"
              : "bg-white border-gray-100 hover:border-gray-250 dark:bg-white/[0.03] dark:border-white/[0.05]"
          }`}
        >
          <div className={`p-3 rounded-xl ${tabMode === "class" ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-500 dark:bg-white/5"}`}>
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {t("learningMaterial.tabClass", { defaultValue: "Tài liệu theo lớp" })}
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">
              {t("learningMaterial.tabClassDesc", { defaultValue: "Tài liệu được phân bổ cụ thể cho từng lớp học" })}
            </p>
          </div>
        </div>

        {/* Card 2: Kho tài liệu */}
        <div
          onClick={() => {
            setTabMode("library");
            setCurrentPage(1);
          }}
          className={`flex items-center gap-4 p-5 rounded-2xl border cursor-pointer transition-all duration-200 shadow-xs ${
            tabMode === "library"
              ? "bg-brand-50 border-brand-200 dark:bg-brand-950/20 dark:border-brand-850"
              : "bg-white border-gray-100 hover:border-gray-250 dark:bg-white/[0.03] dark:border-white/[0.05]"
          }`}
        >
          <div className={`p-3 rounded-xl ${tabMode === "library" ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-500 dark:bg-white/5"}`}>
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {t("learningMaterial.tabLibrary", { defaultValue: "Kho tài liệu chung" })}
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">
              {t("learningMaterial.tabLibraryDesc", { defaultValue: "Kho lưu trữ tài liệu mẫu và tài liệu dùng chung" })}
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. MAIN TABLE & CONTROLS CONTAINER ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-155 dark:border-gray-800 rounded-2xl shadow-xs">
        {/* Header Title & Upload Button */}
        <div className="flex flex-col gap-4 px-5 sm:px-6 py-5 border-b border-gray-100 dark:border-gray-800/80 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {t("learningMaterial.cardTitle", { defaultValue: "Phân Phối Tài Liệu" })}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t("learningMaterial.cardDesc", { defaultValue: "Quản lý việc phân bổ tài liệu học tập, giáo án và học liệu cho lớp học." })}
            </p>
          </div>

          <PermissionGuard requiredPermission="LearningMaterial.Create">
            <button
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-theme-xs transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              {t("learningMaterial.addMaterial", { defaultValue: "Tải tài liệu lên" })}
            </button>
          </PermissionGuard>
        </div>

        {/* ── FILTERS ROW (matching mock layout) ── */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Find material */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("learningMaterial.searchPlaceholder", { defaultValue: "Tìm kiếm tài liệu..." })}
                className="w-full h-11 rounded-lg border border-gray-300 bg-transparent py-2.5 pl-9 pr-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div className="w-full sm:w-52">
              <SearchableSelect
                value={selectedClassId || ""}
                onChange={(val) => {
                  setSelectedClassId(val ? Number(val) : null);
                  setCurrentPage(1);
                }}
                options={classes.map((c) => ({ value: c.id, label: c.name }))}
                placeholder={t("learningMaterial.filterClassAll", { defaultValue: "Lớp học (Tất cả)" })}
                onClear={() => {
                  setSelectedClassId(null);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Status Dropdown */}
            <div className="relative w-full sm:w-44">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-11 py-2.5 pl-3 pr-8 text-sm text-gray-800 bg-transparent border border-gray-300 rounded-lg appearance-none dark:border-gray-700 dark:bg-gray-900 dark:text-white cursor-pointer"
              >
                <option value="all">{t("learningMaterial.filterStatusAll", { defaultValue: "Trạng thái (Tất cả)" })}</option>
                <option value="active">{t("student.formStatusActive", { defaultValue: "Hoạt động" })}</option>
                <option value="inactive">{t("student.formStatusInactive", { defaultValue: "Ngưng hoạt động" })}</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>

            {/* From Date */}
            <div className="w-full sm:w-44">
              <DatePicker
                key={`from-${filterResetKey}`}
                id="filterFromDate"
                placeholder={t("learningMaterial.dateFrom", { defaultValue: "Từ ngày" })}
                dateFormat="d/m/Y"
                staticOption={false}
                defaultDate={fromDate || undefined}
                onChange={(dates) => {
                  setFromDate(dates && dates.length > 0 ? dates[0] : null);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* To Date */}
            <div className="w-full sm:w-44">
              <DatePicker
                key={`to-${filterResetKey}`}
                id="filterToDate"
                placeholder={t("learningMaterial.dateTo", { defaultValue: "Đến ngày" })}
                dateFormat="d/m/Y"
                staticOption={false}
                defaultDate={toDate || undefined}
                onChange={(dates) => {
                  setToDate(dates && dates.length > 0 ? dates[0] : null);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-end shrink-0 lg:ml-auto w-full lg:w-auto">
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 h-11 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors w-full lg:w-auto flex items-center justify-center cursor-pointer shadow-theme-xs"
            >
              {t("learningMaterial.btnReset", { defaultValue: "Xóa bộ lọc" })}
            </button>
          </div>
        </div>

        {/* ── TABLE VIEW ── */}
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/70 dark:bg-white/[0.02]">
              <TableRow>
                <TableCell isHeader className="px-6 py-4 text-center w-12 border-r border-gray-100 dark:border-white/[0.05]">
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">#</p>
                </TableCell>

                <TableCell isHeader className="px-6 py-4 text-left border-r border-gray-100 dark:border-white/[0.05]">
                  <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => handleSort("code")}>
                    <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">
                      {t("learningMaterial.formCodeLabel", { defaultValue: "Mã tài liệu" })}
                    </p>
                    <button className="flex flex-col gap-0.5 ml-2">
                      <AngleUpIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "code" && sortOrder === "asc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                      <AngleDownIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "code" && sortOrder === "desc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                    </button>
                  </div>
                </TableCell>
                
                <TableCell isHeader className="px-6 py-4 text-left border-r border-gray-100 dark:border-white/[0.05]">
                  <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => handleSort("title")}>
                    <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">
                      {t("learningMaterial.colMaterial", { defaultValue: "Tài liệu" })}
                    </p>
                    <button className="flex flex-col gap-0.5 ml-2">
                      <AngleUpIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "title" && sortOrder === "asc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                      <AngleDownIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "title" && sortOrder === "desc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                    </button>
                  </div>
                </TableCell>

                <TableCell isHeader className="px-6 py-4 text-left border-r border-gray-100 dark:border-white/[0.05]">
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">
                    {t("learningMaterial.colCourse", { defaultValue: "Khóa học" })}
                  </p>
                </TableCell>

                <TableCell isHeader className="px-6 py-4 text-left border-r border-gray-100 dark:border-white/[0.05]">
                  <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => handleSort("createdAt")}>
                    <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">
                      {t("question.colCreatedAt", { defaultValue: "Ngày tạo" })}
                    </p>
                    <button className="flex flex-col gap-0.5 ml-2">
                      <AngleUpIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "createdAt" && sortOrder === "asc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                      <AngleDownIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "createdAt" && sortOrder === "desc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                    </button>
                  </div>
                </TableCell>

                <TableCell isHeader className="px-6 py-4 text-left border-r border-gray-100 dark:border-white/[0.05]">
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">
                    {t("student.colStatus", { defaultValue: "Trạng thái" })}
                  </p>
                </TableCell>

                <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 text-theme-sm dark:text-gray-200">
                  {t("learningMaterial.colActions", { defaultValue: "Thao tác" })}
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <TableRow key={idx} className="animate-pulse">
                    <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-8 mx-auto" /></TableCell>
                    <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-24" /></TableCell>
                    <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-48" /></TableCell>
                    <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-28" /></TableCell>
                    <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-24" /></TableCell>
                    <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-16" /></TableCell>
                    <TableCell className="px-6 py-4"><div className="h-8 bg-gray-200 dark:bg-white/10 rounded w-32 mx-auto" /></TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={7} className="px-6 py-12 text-center text-rose-500 font-medium bg-rose-50/10 dark:bg-rose-950/5">
                    {error}
                  </TableCell>
                </TableRow>
              ) : sortedData.length > 0 ? (
                sortedData.map((item, index) => {
                  const ext = item.fileUrl?.split(".").pop()?.toUpperCase() || "TỆP";
                  return (
                    <TableRow key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                      {/* Index */}
                      <TableCell className="px-6 py-4 text-center text-gray-500 dark:text-gray-400 whitespace-nowrap w-12 text-sm">
                        {startIndex + index + 1}
                      </TableCell>

                      {/* Code */}
                      <TableCell className="px-6 py-4 font-mono text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {item.code}
                      </TableCell>

                      {/* Title */}
                      <TableCell className="px-6 py-4 font-medium text-gray-900 dark:text-white max-w-[240px]">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg dark:bg-blue-950/20 dark:text-blue-400 shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="overflow-hidden">
                            <p className="truncate font-semibold text-gray-900 dark:text-white text-sm" title={item.title || item.name}>
                              {item.title || item.name}
                            </p>
                            <p className="text-xs text-gray-400 truncate mt-0.5">
                              {ext} • {item.description || t("learningMaterial.noDescription", { defaultValue: "Không có mô tả" })}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Course */}
                      <TableCell className="px-6 py-4 text-gray-800 dark:text-gray-200 text-sm whitespace-nowrap">
                        {item.courseName || (
                          <span className="text-gray-400 italic text-sm">
                            {t("learningMaterial.noCourseAssigned", { defaultValue: "Không gán khóa học" })}
                          </span>
                        )}
                      </TableCell>

                      {/* Date created */}
                      <TableCell className="px-6 py-4 text-gray-700 dark:text-gray-300 text-sm whitespace-nowrap">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString("vi-VN") : "-"}
                      </TableCell>

                      {/* Status badge */}
                      <TableCell className="px-6 py-4 whitespace-nowrap">
                        {item.status === 1 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {t("student.formStatusActive", { defaultValue: "Hoạt động" })}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            {t("student.formStatusInactive", { defaultValue: "Ngưng hoạt động" })}
                          </span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Details / Preview (Eye Button) */}
                          <button
                            title={t("learningMaterial.previewTooltip", { defaultValue: "Xem trước & Chi tiết" })}
                            onClick={() => openViewModal(item)}
                            className="p-2 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/30 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Download button */}
                          {item.fileUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                const fullUrl = item.fileUrl!.startsWith("http") ? item.fileUrl! : `${ENV.API_BASE_URL}${item.fileUrl}`;
                                const ext = item.fileUrl!.split(".").pop()?.toLowerCase() || "";
                                downloadFileFromUrl(fullUrl, `${item.title || item.name || "tai_lieu"}.${ext || "file"}`);
                              }}
                              title={t("learningMaterial.downloadTooltip", { defaultValue: "Tải về" })}
                              className="p-2 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg dark:bg-blue-950/20 dark:text-blue-400 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit (Admin/Staff, or Owner Teacher) */}
                          {checkEditPermission(item) && (
                            <PermissionGuard requiredPermission="LearningMaterial.Edit">
                              <button
                                title={t("questionCategory.editTooltip", { defaultValue: "Chỉnh sửa" })}
                                onClick={() => openEditModal(item)}
                                className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            </PermissionGuard>
                          )}

                          {/* Delete (Admin/Staff, or Owner Teacher) */}
                          {checkDeletePermission(item) && (
                            <PermissionGuard requiredPermission="LearningMaterial.Delete">
                              <button
                                title={t("questionCategory.deleteTooltip", { defaultValue: "Xóa" })}
                                onClick={() => openDeleteModal(item)}
                                className="p-1.5 text-error-600 hover:text-error-800 dark:text-error-400 dark:hover:text-error-300 hover:bg-error-50 dark:hover:bg-error-950/30 rounded-md transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </PermissionGuard>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="px-6 py-12 text-center text-gray-400 dark:text-gray-600 font-medium">
                    {t("learningMaterial.noResultsFiltered", { defaultValue: "Không tìm thấy tài liệu học tập nào thỏa mãn điều kiện lọc." })}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination control */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between px-6 py-5 bg-gray-50/50 dark:bg-white/[0.01] border-t border-gray-100 dark:border-white/[0.05]">
          <div className="pb-3 xl:pb-0 flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t("questionCategory.show")}</span>
              <select
                className="py-1 px-2.5 text-sm text-gray-800 bg-transparent border border-gray-300 rounded-lg dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                {[5, 10, 15, 20].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-500 dark:text-gray-400">{t("questionCategory.entries")}</span>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("questionCategory.showing", {
                start: totalRecords === 0 ? 0 : startIndex + 1,
                end: endIndex,
                total: totalRecords,
                defaultValue: `Hiển thị ${totalRecords === 0 ? 0 : startIndex + 1} đến ${endIndex} trong tổng số ${totalRecords} mục`,
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

      {/* Create / Edit Modal */}
      <MaterialFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingItem={editingItem}
        onSubmitSuccess={(savedItem, isEdit) => {
          if (isEdit) {
            showToast(t("learningMaterial.updateSuccess", { name: savedItem.name }));
          } else {
            showToast(t("learningMaterial.createSuccess", { name: savedItem.name }));
            setCurrentPage(1);
            setSearchTerm("");
            setDebouncedSearchTerm("");
          }
          triggerRefresh();
        }}
      />

      {/* View Detail Modal */}
      <MaterialViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        t={t}
        item={viewingItem}
        isLoadingDetail={isLoadingDetail}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        itemName={deleteTarget?.title || deleteTarget?.name}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}

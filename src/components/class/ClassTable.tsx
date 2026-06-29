"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, SlidersHorizontal, List, LayoutGrid, Eye, Pencil, Trash2, CalendarDays } from "lucide-react";
import PaginationWithIcon from "@/components/tables/DataTables/TableOne/PaginationWithIcon";
import { ClassViewModal } from "./ClassViewModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import { classApi, ClassItem } from "@/services/class.api";
import { teacherApi, TeacherItem } from "@/services/teacher.api";
import { courseApi, CourseItem } from "@/services/course.api";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { useTranslation } from "react-i18next";

type TabType = "all" | "active" | "planning" | "completed";

interface ClassTableProps {
  refreshKey?: number;
  onAddClick: () => void;
  onEditClick: (item: ClassItem) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function ClassTable({ refreshKey: externalRefreshKey, onAddClick, onEditClick, showToast }: ClassTableProps) {
  const { t } = useTranslation();

  // ── Dynamic Metadata ──
  useEffect(() => {
    document.title = `${t("class.title")} | School Management System`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", t("class.description"));
    }
  }, [t]);

  // ── Data states ──
  const [items, setItems] = useState<ClassItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Dropdown options for filters ──
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);

  // ── Tab stats ──
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [countAll, setCountAll] = useState(0);
  const [countActive, setCountActive] = useState(0);
  const [countPlanning, setCountPlanning] = useState(0);
  const [countCompleted, setCountCompleted] = useState(0);

  // ── Pagination / search ──
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey((k) => k + 1);



  // ── Form error (retained for view detail modal) ──
  const [formError, setFormError] = useState<string | null>(null);

  // Trigger refresh when external refresh key changes
  useEffect(() => {
    if (externalRefreshKey !== undefined) {
      triggerRefresh();
    }
  }, [externalRefreshKey]);

  // ── View modal ──
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingItemDetail, setViewingItemDetail] = useState<any>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // ── Delete confirm modal ──
  const [deleteTarget, setDeleteTarget] = useState<ClassItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Batch selection states ──
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);

  const handleToggleSelectAll = () => {
    if (items.length === 0) return;
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(item => item.id));
    }
  };

  const handleToggleSelectRow = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const getFriendlyAutoScheduleError = (msg: string) => {
    if (msg.startsWith("ERR_CLASS_NO_STUDENTS_")) {
      const code = msg.replace("ERR_CLASS_NO_STUDENTS_", "");
      return `Lớp ${code} chưa có học sinh nào. Vui lòng gán học sinh vào lớp trước khi xếp lịch!`;
    }
    if (msg.startsWith("ERR_CLASS_NO_COURSE_")) {
      const code = msg.replace("ERR_CLASS_NO_COURSE_", "");
      return `Lớp ${code} chưa được gán khóa học. Vui lòng cập nhật lớp trước!`;
    }
    return t(`backendMessages.${msg}`, { defaultValue: msg });
  };

  const handleAutoSchedule = async () => {
    if (selectedIds.length === 0) return;
    setIsScheduling(true);
    try {
      const res = await classApi.autoSchedule(selectedIds);
      if (res.success) {
        showToast(t("class.autoScheduleSuccess", { defaultValue: "Xếp lịch tự động thành công!" }));
        setSelectedIds([]);
        triggerRefresh();
      } else {
        const errMsg = res.message ? getFriendlyAutoScheduleError(res.message) : t("class.autoScheduleError", { defaultValue: "Xếp lịch tự động thất bại!" });
        showToast(errMsg, "error");
      }
    } catch {
      showToast(t("class.systemError"), "error");
    } finally {
      setIsScheduling(false);
    }
  };



  // ── Debounce search ──
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ── Load filter options ──
  useEffect(() => {
    async function loadOptions() {
      try {
        const [cRes, tRes] = await Promise.all([
          courseApi.getAll(1, 100, "", true),
          teacherApi.getAll(1, 100),
        ]);
        if (cRes.success && cRes.data) setCourses(cRes.data.items || []);
        if (tRes.success && tRes.data) setTeachers(tRes.data.items || []);
      } catch (err) {
        console.error("Failed to load filter options", err);
      }
    }
    loadOptions();
  }, []);

  // ── Fetch counts & main data ──
  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      setSelectedIds([]);
      try {
        // Build search parameters
        // For counts, we query the main list with different statuses
        const mainRes = await classApi.getAll(currentPage, itemsPerPage, debouncedSearchTerm, selectedCourse, selectedTeacher);

        if (!mounted) return;

        if (mainRes.success && mainRes.data) {
          // Filtering logic by tab at frontend to ensure counts and lists align easily
          // Status: Planning = 0, Active = 1, Completed = 2, Cancelled = 3
          let allFiltered = mainRes.data.items || [];
          
          // Let's fetch all items to calculate counts correctly
          const allItemsRes = await classApi.getAll(1, 1000, debouncedSearchTerm, selectedCourse, selectedTeacher);
          if (allItemsRes.success && allItemsRes.data) {
            const allList = allItemsRes.data.items || [];
            setCountAll(allList.length);
            setCountActive(allList.filter(c => c.status === 1).length);
            setCountPlanning(allList.filter(c => c.status === 0).length);
            setCountCompleted(allList.filter(c => c.status === 2).length);

            // Filter main list items by activeTab
            let displayList = allList;
            if (activeTab === "active") displayList = allList.filter(c => c.status === 1);
            else if (activeTab === "planning") displayList = allList.filter(c => c.status === 0);
            else if (activeTab === "completed") displayList = allList.filter(c => c.status === 2);

            const total = displayList.length;
            setTotalRecords(total);
            setTotalPages(Math.ceil(total / itemsPerPage));

            // Apply manual paging on the filtered array
            const startIndex = (currentPage - 1) * itemsPerPage;
            setItems(displayList.slice(startIndex, startIndex + itemsPerPage));
          } else {
            const errMsg = allItemsRes.message ? t(`backendMessages.${allItemsRes.message}`, { defaultValue: allItemsRes.message }) : t("class.systemError");
            setError(errMsg);
            showToast(errMsg, "error");
          }
        } else {
          const errMsg = mainRes.message ? t(`backendMessages.${mainRes.message}`, { defaultValue: mainRes.message }) : t("class.systemError");
          setError(errMsg);
          showToast(errMsg, "error");
        }
      } catch {
        if (mounted) {
          setError(t("class.systemError"));
          showToast(t("class.systemError"), "error");
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, debouncedSearchTerm, selectedCourse, selectedTeacher, activeTab, refreshKey]);

  // ── Open create ──
  const openCreateModal = () => {
    onAddClick();
  };

  // ── Open edit ──
  const openEditModal = (item: ClassItem) => {
    onEditClick(item);
  };

  // ── Open view modal ──
  const openViewModal = async (item: ClassItem) => {
    setViewingItemDetail(null);
    setFormError(null);
    setIsLoadingDetail(true);
    setIsViewModalOpen(true);

    try {
      const res = await classApi.getById(item.id);
      if (res.success && res.data) {
        setViewingItemDetail(res.data);
      } else {
        const errMsg = res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("class.systemError");
        setFormError(errMsg);
        showToast(errMsg, "error");
      }
    } catch {
      setFormError(t("class.systemError"));
      showToast(t("class.systemError"), "error");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // ── Delete Class ──
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await classApi.delete(deleteTarget.id);
      if (res.success) {
        showToast(t("class.deleteSuccess", { name: deleteTarget.name }));
        setIsDeleteModalOpen(false);
        triggerRefresh();
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("class.deleteError"), "error");
      }
    } catch {
      showToast(t("class.systemError"), "error");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const openDeleteModal = (item: ClassItem) => {
    setDeleteTarget(item);
    setIsDeleteModalOpen(true);
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: // Planning / Sắp mở
        return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-500 border border-amber-200/50 dark:border-amber-500/20";
      case 1: // Active / Đang học
        return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500 border border-emerald-200/50 dark:border-emerald-500/20";
      case 2: // Completed / Hoàn thành
        return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-500 border border-blue-200/50 dark:border-blue-500/20";
      case 3: // Cancelled / Đã hủy
        return "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-500 border border-rose-200/50 dark:border-rose-500/20";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return t("class.statusPlanning", { defaultValue: "Sắp mở" });
      case 1: return t("class.statusActive", { defaultValue: "Đang học" });
      case 2: return t("class.statusCompleted", { defaultValue: "Hoàn thành" });
      case 3: return t("class.statusCancelled", { defaultValue: "Đã hủy" });
      default: return "";
    }
  };

  const getUrgencyTag = (startDateStr: string | null | undefined, status: number) => {
    if (status !== 0 || !startDateStr) return null;
    const startDate = new Date(startDateStr);
    const today = new Date();
    const diffTime = startDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0 && diffDays <= 7) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500 text-white animate-pulse">
          {t("class.statusUrgent", { defaultValue: `Sắp đến hạn (${diffDays} ngày)` })}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-hidden">

      {/* Header with Title & Add Class Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("class.title")}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("class.description")}
          </p>
        </div>
        <PermissionGuard requiredPermission="Class.Create">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-theme-xs transition-colors"
          >
            + {t("class.addClass")}
          </button>
        </PermissionGuard>
      </div>

      {/* Tab Filter */}
      <div className="flex flex-wrap items-center gap-2 px-5 sm:px-6 pt-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
        <button
          onClick={() => { setActiveTab("all"); setCurrentPage(1); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === "all"
              ? "border-brand-500 text-brand-500 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {t("class.tabAll", { defaultValue: "Tất cả" })} <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold">{countAll}</span>
        </button>
        <button
          onClick={() => { setActiveTab("active"); setCurrentPage(1); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === "active"
              ? "border-brand-500 text-brand-500 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {t("class.tabActive", { defaultValue: "Đang học" })} <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold">{countActive}</span>
        </button>
        <button
          onClick={() => { setActiveTab("planning"); setCurrentPage(1); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === "planning"
              ? "border-brand-500 text-brand-500 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {t("class.tabPlanning", { defaultValue: "Sắp mở" })} <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold">{countPlanning}</span>
        </button>
        <button
          onClick={() => { setActiveTab("completed"); setCurrentPage(1); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === "completed"
              ? "border-brand-500 text-brand-500 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {t("class.tabCompleted", { defaultValue: "Hoàn thành" })} <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold">{countCompleted}</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 sm:p-5 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full max-w-sm">
          <input
            type="text"
            placeholder={t("class.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">
            <Search className="w-4 h-4" />
          </span>
        </div>

        <div className="flex w-full md:w-auto items-center justify-end gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border transition-all ${
              showFilters || selectedCourse || selectedTeacher
                ? "bg-brand-50 border-brand-200 text-brand-600 dark:bg-brand-500/10 dark:border-brand-500/20 dark:text-brand-400"
                : "bg-white border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {t("class.filterBtn", { defaultValue: "Bộ lọc" })}
          </button>

          {/* View toggle (static grid/list mock icons) */}
          <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg p-0.5 bg-gray-50 dark:bg-gray-800">
            <button className="p-1.5 rounded bg-white dark:bg-gray-700 shadow-sm text-gray-700 dark:text-white">
              <List className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded filters panel */}
      {showFilters && (
        <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-100 dark:border-gray-800 animate-fadeIn">
          <div>
            <label className="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("class.formCourseLabel")}
            </label>
            <select
              value={selectedCourse || ""}
              onChange={(e) => { setSelectedCourse(e.target.value ? Number(e.target.value) : null); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-hidden"
            >
              <option value="">{t("class.filterCourseAll", { defaultValue: "Tất cả khóa học" })}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("class.formTeacherLabel")}
            </label>
            <select
              value={selectedTeacher || ""}
              onChange={(e) => { setSelectedTeacher(e.target.value ? Number(e.target.value) : null); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-hidden"
            >
              <option value="">{t("class.filterTeacherAll", { defaultValue: "Tất cả giáo viên" })}</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50/70 dark:bg-gray-800/40">
            <TableRow>
              <TableCell className="w-[5%] px-5 sm:px-6 py-3">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selectedIds.length === items.length}
                  onChange={handleToggleSelectAll}
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                />
              </TableCell>
              <TableCell className="w-[12%] px-5 sm:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                {t("class.colCode")}
              </TableCell>
              <TableCell className="w-[30%] px-5 sm:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                {t("class.colName")}
              </TableCell>
              <TableCell className="w-[20%] px-5 sm:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                {t("class.colTeacher")}
              </TableCell>
              <TableCell className="w-[15%] px-5 sm:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                {t("class.colCourse")}
              </TableCell>
              <TableCell className="w-[13%] px-5 sm:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                {t("class.colDescription")}
              </TableCell>
              <TableCell className="w-[10%] px-5 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                {t("class.colActions")}
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-brand-500 border-t-transparent mr-2"></div>
                  {t("class.loadingDetail")}
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-sm text-error-500 dark:text-error-400">
                  {error}
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">
                  {t("class.noResults")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                  <TableCell className="px-5 sm:px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => handleToggleSelectRow(item.id)}
                      className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                    />
                  </TableCell>
                  {/* Code & Status */}
                  <TableCell className="px-5 sm:px-6 py-4 font-medium text-gray-900 dark:text-white">
                    <div className="flex flex-col gap-1.5 items-start">
                      <span className="text-sm font-semibold">{item.code}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                    </div>
                  </TableCell>

                  {/* Name, Urgency & Date Range */}
                  <TableCell className="px-5 sm:px-6 py-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white hover:text-brand-500 dark:hover:text-brand-400 cursor-pointer" onClick={() => openViewModal(item)}>
                        {item.name}
                      </span>
                      <div className="flex flex-wrap gap-1.5 items-center mt-1">
                        {getUrgencyTag(item.startDate, item.status)}
                        {item.startDate && item.endDate ? (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(item.startDate).toLocaleDateString("vi-VN")} - {new Date(item.endDate).toLocaleDateString("vi-VN")}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 text-[11px] font-semibold">
                          👤 {item.studentCount} {t("class.colStudents").toLowerCase()}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Teacher Name Only */}
                  <TableCell className="px-5 sm:px-6 py-4">
                    {item.teacherName ? (
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                        {item.teacherName}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">{t("class.noTeacher")}</span>
                    )}
                  </TableCell>

                  {/* Course / Phân loại */}
                  <TableCell className="px-5 sm:px-6 py-4">
                    {item.courseName ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 text-xs font-medium">
                        {item.courseName}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">{t("class.noCourse")}</span>
                    )}
                  </TableCell>

                  {/* Note / Description */}
                  <TableCell className="px-5 sm:px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                    <div className="max-w-[150px] truncate" title={item.description || ""}>
                      {item.description || t("class.noDescription")}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="px-5 sm:px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openViewModal(item)}
                        title={t("class.viewTooltip", { defaultValue: "Xem chi tiết" })}
                        className="p-1 text-gray-400 hover:text-brand-500 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <PermissionGuard requiredPermission="Class.Edit">
                        <button
                          onClick={() => openEditModal(item)}
                          title={t("class.editTooltip")}
                          className="p-1 text-gray-400 hover:text-amber-500 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard requiredPermission="Class.Delete">
                        <button
                          onClick={() => openDeleteModal(item)}
                          title={t("class.deleteTooltip")}
                          className="p-1 text-gray-400 hover:text-rose-500 transition-colors"
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
      {!isLoading && !error && totalPages > 1 && (
        <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t("class.showing", {
              start: (currentPage - 1) * itemsPerPage + 1,
              end: Math.min(currentPage * itemsPerPage, totalRecords),
              total: totalRecords,
            })}
          </span>
          <PaginationWithIcon
            key={currentPage}
            initialPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => setCurrentPage(p)}
          />
        </div>
      )}



      {/* View Detail Modal */}
      {isViewModalOpen && (
        <ClassViewModal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          t={t}
          itemDetail={viewingItemDetail}
          isLoading={isLoadingDetail}
          formError={formError}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deleteTarget && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          itemName={deleteTarget.name}
          isDeleting={isDeleting}
        />
      )}

      {/* Batch Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-4 px-6 py-3 bg-gray-900 text-white rounded-xl shadow-2xl border border-gray-800 animate-slideUp">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {t("class.selectedCount", { count: selectedIds.length, defaultValue: `Đã chọn ${selectedIds.length} lớp` })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors"
            >
              {t("class.deselectBtn", { defaultValue: "Bỏ chọn" })}
            </button>
            <button
              onClick={handleAutoSchedule}
              disabled={isScheduling}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg disabled:opacity-50 transition-colors"
            >
              {isScheduling ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                  {t("class.schedulingBtn", { defaultValue: "Đang xếp..." })}
                </>
              ) : (
                <>
                  <CalendarDays className="w-3.5 h-3.5" />
                  {t("class.autoScheduleBtn", { defaultValue: "Xếp lịch tự động" })}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

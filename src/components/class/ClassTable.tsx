"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Eye, Edit, Trash2, CalendarDays } from "lucide-react";
import PaginationWithIcon from "@/components/tables/DataTables/TableOne/PaginationWithIcon";
import { classApi, ClassItem } from "@/services/class.api";
import AutoScheduleModal from "./AutoScheduleModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import { teacherApi, TeacherItem } from "@/services/teacher.api";
import { courseApi, CourseItem } from "@/services/course.api";
import { semesterApi, SemesterItem } from "@/services/semester.api";
import { commonApi } from "@/services/common.api";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { useTranslation } from "react-i18next";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { AngleDownIcon, AngleUpIcon } from "@/icons";

type TabType = "all" | "active" | "planning" | "completed";

interface ClassTableProps {
  refreshKey?: number;
  onAddClick: () => void;
  onEditClick: (item: ClassItem) => void;
  onViewClick: (item: ClassItem) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function ClassTable({ refreshKey: externalRefreshKey, onAddClick, onEditClick, onViewClick, showToast }: ClassTableProps) {
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
  const [semesters, setSemesters] = useState<SemesterItem[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<number | null>(null); // null = Tất cả, 0 = Offline, 1 = Online

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

  // ── Sort ──
  type SortKey = "code" | "name" | "teacherName" | "courseName" | "semesterName" | "status" | "id";
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
    return [...items].sort((a, b) => {
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
      } else {
        av = String(a[sortKey] ?? "");
        bv = String(b[sortKey] ?? "");
        return sortOrder === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
    });
  }, [items, sortKey, sortOrder]);



  // Trigger refresh when external refresh key changes
  useEffect(() => {
    if (externalRefreshKey !== undefined) {
      triggerRefresh();
    }
  }, [externalRefreshKey]);

  // ── Delete confirm modal ──
  const [deleteTarget, setDeleteTarget] = useState<ClassItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Batch selection states ──
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const handleToggleSelectAll = () => {
    const deletableItems = items.filter(item => item.status === 0 || item.status === 3);
    if (deletableItems.length === 0) return;
    
    const allSelectedOnPage = deletableItems.every(item => selectedIds.includes(item.id));
    if (allSelectedOnPage) {
      setSelectedIds(prev => prev.filter(id => !deletableItems.some(item => item.id === id)));
    } else {
      setSelectedIds(prev => {
        const newIds = [...prev];
        deletableItems.forEach(item => {
          if (!newIds.includes(item.id)) {
            newIds.push(item.id);
          }
        });
        return newIds;
      });
    }
  };

  const handleToggleSelectRow = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const deletePromises = selectedIds.map(id => classApi.delete(id));
      const results = await Promise.all(deletePromises);
      
      const failedCount = results.filter(r => !r.success).length;
      if (failedCount === 0) {
        showToast(t("class.bulkDeleteSuccess", { count: selectedIds.length, defaultValue: `Xóa thành công ${selectedIds.length} lớp học.` }));
        setSelectedIds([]);
        triggerRefresh();
      } else {
        showToast(t("class.bulkDeleteError", { failedCount, defaultValue: `Có ${failedCount} lớp học xóa thất bại.` }), "error");
        triggerRefresh();
      }
    } catch {
      showToast(t("class.systemError", { defaultValue: "Đã xảy ra lỗi hệ thống." }), "error");
    } finally {
      setIsBulkDeleting(false);
      setIsBulkDeleteModalOpen(false);
    }
  };

  const getFriendlyAutoScheduleError = (msg: string) => {
    if (msg.startsWith("ERR_CLASS_NO_STUDENTS_")) {
      const code = msg.replace("ERR_CLASS_NO_STUDENTS_", "");
      return t("class.errClassNoStudents", { code });
    }
    if (msg.startsWith("ERR_CLASS_NO_COURSE_")) {
      const code = msg.replace("ERR_CLASS_NO_COURSE_", "");
      return t("class.errClassNoCourse", { code });
    }
    if (msg.startsWith("ERR_CLASS_STUDENTS_EXCEED_ROOM_CAPACITY_")) {
      const code = msg.replace("ERR_CLASS_STUDENTS_EXCEED_ROOM_CAPACITY_", "");
      return t("class.errClassExceedCapacity", { code });
    }
    return t(`backendMessages.${msg}`, { defaultValue: msg });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAutoSchedule = async (constraints: any) => {
    if (selectedIds.length === 0) return;
    setIsScheduling(true);
    try {
      const res = await classApi.autoSchedule(selectedIds, constraints);
      if (res.success) {
        showToast(t("class.autoScheduleSuccess", { defaultValue: "Xếp lịch tự động thành công!" }));
        setSelectedIds([]);
        setIsScheduleModalOpen(false);
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
        const [cRes, tRes, sRes] = await Promise.all([
          commonApi.getCourses(1, 100, "", true),
          teacherApi.getAll(1, 100),
          commonApi.getSemesters(),
        ]);
        if (cRes.success && cRes.data) setCourses(cRes.data.items || []);
        if (tRes.success && tRes.data) setTeachers(tRes.data.items || []);
        if (sRes.success && sRes.data) setSemesters(sRes.data || []);
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
        const mainRes = await classApi.getAll(currentPage, itemsPerPage, debouncedSearchTerm, selectedCourse, selectedTeacher, selectedType);

        if (!mounted) return;

        if (mainRes.success && mainRes.data) {
          // Filtering logic by tab at frontend to ensure counts and lists align easily
          // Status: Planning = 0, Active = 1, Completed = 2, Cancelled = 3
          
          // Let's fetch all items to calculate counts correctly
          const allItemsRes = await classApi.getAll(1, 1000, debouncedSearchTerm, selectedCourse, selectedTeacher, selectedType);
          if (allItemsRes.success && allItemsRes.data) {
            let allList = allItemsRes.data.items || [];
            if (selectedSemester !== null) {
              allList = allList.filter(c => c.semesterId === selectedSemester);
            }
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
  }, [currentPage, itemsPerPage, debouncedSearchTerm, selectedCourse, selectedTeacher, selectedSemester, selectedType, activeTab, refreshKey]);

  // ── Open create ──
  const openCreateModal = () => {
    onAddClick();
  };

  // ── Open edit ──
  const openEditModal = (item: ClassItem) => {
    onEditClick(item);
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
      case 1: return t("class.statusActive", { defaultValue: "Đang diễn ra" });
      case 2: return t("class.statusCompleted", { defaultValue: "Đã hoàn thành" });
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
          {t("class.statusUrgent", { days: diffDays })}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">

      {/* Header with Title & Add Class Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {t("class.title")}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
          {t("class.tabActive", { defaultValue: "Đang diễn ra" })} <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold">{countActive}</span>
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
          {t("class.tabCompleted", { defaultValue: "Đã hoàn thành" })} <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold">{countCompleted}</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 sm:p-5 border-b border-gray-150 dark:border-gray-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 w-full items-end">
          {/* Text Search */}
          <div className="relative md:col-span-2">
            <label className="block mb-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
              {t("class.searchLabel", { defaultValue: "Tìm kiếm" })}
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={t("class.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-transparent border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400 h-11"
              />
              <span className="absolute left-3 top-3.5 text-gray-400">
                <Search className="w-4 h-4" />
              </span>
            </div>
          </div>

          {/* Semester Selector */}
          <div className="md:col-span-2">
            <label className="block mb-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
              {t("class.formSemesterLabel", { defaultValue: "Học kỳ" })}
            </label>
            <SearchableSelect
              value={selectedSemester || ""}
              onChange={(value) => { setSelectedSemester(value ? Number(value) : null); setCurrentPage(1); }}
              options={semesters.map((s) => ({ value: s.id, label: s.name }))}
              placeholder={t("class.filterSemesterAll", { defaultValue: "Tất cả học kỳ" })}
              onClear={() => { setSelectedSemester(null); setCurrentPage(1); }}
            />
          </div>

          {/* Course Selector */}
          <div className="md:col-span-2">
            <label className="block mb-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
              {t("class.formCourseLabel")}
            </label>
            <SearchableSelect
              value={selectedCourse || ""}
              onChange={(value) => { setSelectedCourse(value ? Number(value) : null); setCurrentPage(1); }}
              options={courses.map((c) => ({ value: c.id, label: c.name }))}
              placeholder={t("class.filterCourseAll", { defaultValue: "Tất cả khóa học" })}
              onClear={() => { setSelectedCourse(null); setCurrentPage(1); }}
            />
          </div>

          {/* Teacher Selector */}
          <div className="md:col-span-2">
            <label className="block mb-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
              {t("class.formTeacherLabel")}
            </label>
            <SearchableSelect
              value={selectedTeacher || ""}
              onChange={(value) => { setSelectedTeacher(value ? Number(value) : null); setCurrentPage(1); }}
              options={teachers.map((t) => ({ value: t.id, label: t.name }))}
              placeholder={t("class.filterTeacherAll", { defaultValue: "Tất cả giáo viên" })}
              onClear={() => { setSelectedTeacher(null); setCurrentPage(1); }}
            />
          </div>

          {/* Type Selector (Offline/Online) */}
          <div className="md:col-span-2">
            <label className="block mb-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
              {t("class.formTypeLabel", { defaultValue: "Loại lớp học" })}
            </label>
            <SearchableSelect
              value={selectedType !== null ? selectedType : ""}
              onChange={(value) => { setSelectedType(value !== "" ? Number(value) : null); setCurrentPage(1); }}
              options={[
                { value: 0, label: t("registration.enrollTypeOffline", { defaultValue: "Offline" }) },
                { value: 1, label: t("registration.enrollTypeOnline", { defaultValue: "Online" }) }
              ]}
              placeholder={t("class.filterTypeAll", { defaultValue: "Tất cả loại lớp" })}
              onClear={() => { setSelectedType(null); setCurrentPage(1); }}
            />
          </div>

          {/* Clear Filters Button */}
          <div className="md:col-span-2 flex items-end h-11">
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSelectedCourse(null);
                setSelectedTeacher(null);
                setSelectedSemester(null);
                setSelectedType(null);
                setCurrentPage(1);
              }}
              className="inline-flex items-center justify-center px-4 h-11 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-350 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors cursor-pointer w-full shadow-theme-xs"
            >
              {t("class.clearFiltersBtn", { defaultValue: "Xóa bộ lọc" })}
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
            <TableRow>
              <TableCell isHeader className="px-4 py-4 text-center w-12">
                <input
                  type="checkbox"
                  checked={items.filter(item => item.status === 0 || item.status === 3).length > 0 && items.filter(item => item.status === 0 || item.status === 3).every(item => selectedIds.includes(item.id))}
                  onChange={handleToggleSelectAll}
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 h-4 w-4 cursor-pointer"
                />
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-center w-12">
                <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">#</p>
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-left">
                <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => handleSort("code")}>
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">{t("class.colCode")}</p>
                  <button className="flex flex-col gap-0.5 ml-2">
                    <AngleUpIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "code" && sortOrder === "asc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                    <AngleDownIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "code" && sortOrder === "desc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                  </button>
                </div>
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-left">
                <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => handleSort("name")}>
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">{t("class.colName")}</p>
                  <button className="flex flex-col gap-0.5 ml-2">
                    <AngleUpIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "name" && sortOrder === "asc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                    <AngleDownIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "name" && sortOrder === "desc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                  </button>
                </div>
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-left">
                <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => handleSort("teacherName")}>
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">{t("class.colTeacher")}</p>
                  <button className="flex flex-col gap-0.5 ml-2">
                    <AngleUpIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "teacherName" && sortOrder === "asc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                    <AngleDownIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "teacherName" && sortOrder === "desc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                  </button>
                </div>
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-left">
                <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => handleSort("courseName")}>
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">{t("class.colCourse")}</p>
                  <button className="flex flex-col gap-0.5 ml-2">
                    <AngleUpIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "courseName" && sortOrder === "asc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                    <AngleDownIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "courseName" && sortOrder === "desc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                  </button>
                </div>
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-left">
                <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => handleSort("semesterName")}>
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">{t("class.colSemester")}</p>
                  <button className="flex flex-col gap-0.5 ml-2">
                    <AngleUpIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "semesterName" && sortOrder === "asc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                    <AngleDownIcon className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${sortKey === "semesterName" && sortOrder === "desc" ? "text-brand-500 dark:text-brand-400" : ""}`} />
                  </button>
                </div>
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-left">
                <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">{t("class.colDescription")}</p>
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 text-theme-sm dark:text-gray-200">
                {t("class.colActions")}
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {isLoading ? (
              Array.from({ length: itemsPerPage }).map((_, idx) => (
                <TableRow key={idx} className="animate-pulse">
                  <TableCell className="px-4 py-4 text-center w-12"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-4 mx-auto" /></TableCell>
                  <TableCell className="px-6 py-4 text-center w-12"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-8 mx-auto" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-16" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-32" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-24" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-28" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-20" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-20" /></TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-1.5">
                      <div className="h-8 w-8 bg-gray-200 dark:bg-white/10 rounded-md" />
                      <div className="h-8 w-8 bg-gray-200 dark:bg-white/10 rounded-md" />
                      <div className="h-8 w-8 bg-gray-200 dark:bg-white/10 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-sm text-rose-500 font-medium">
                  {error}
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">
                  {t("class.noResults")}
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((item, index) => (
                <TableRow key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                  {/* Checkbox Column */}
                  <TableCell className="px-4 py-4 text-center w-12 whitespace-nowrap">
                    {item.status === 0 || item.status === 3 ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => handleToggleSelectRow(item.id)}
                        className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 h-4 w-4 cursor-pointer"
                      />
                    ) : (
                      <input
                        type="checkbox"
                        disabled
                        className="rounded border-gray-200 text-gray-300 h-4 w-4 opacity-50 cursor-not-allowed"
                      />
                    )}
                  </TableCell>
                  {/* Sequence Number */}
                  <TableCell className="px-6 py-4 text-center text-gray-500 dark:text-gray-400 whitespace-nowrap w-12 text-theme-sm font-medium">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </TableCell>
                  {/* Code & Status */}
                  <TableCell className="px-6 py-4 font-semibold text-gray-900 dark:text-white whitespace-nowrap text-theme-sm">
                    <div className="flex flex-col gap-1.5 items-start">
                      <span className="text-sm font-semibold">{item.code}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        item.type === 1
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                          : "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
                      }`}>
                        {item.type === 1 ? "Online" : "Offline"}
                      </span>
                    </div>
                  </TableCell>

                  {/* Name, Urgency & Date Range */}
                  <TableCell className="px-6 py-4 text-gray-750 dark:text-gray-300 font-medium whitespace-nowrap text-theme-sm">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white hover:text-brand-500 dark:hover:text-brand-400 cursor-pointer" onClick={() => onViewClick(item)}>
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
                  <TableCell className="px-6 py-4 text-gray-750 dark:text-gray-300 font-medium whitespace-nowrap text-theme-sm">
                    {item.teacherName ? (
                      <span className="text-sm text-gray-750 dark:text-gray-300 font-medium">
                        {item.teacherName}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">{t("class.noTeacher")}</span>
                    )}
                  </TableCell>

                  {/* Course / Phân loại */}
                  <TableCell className="px-6 py-4 whitespace-nowrap text-theme-sm">
                    {item.courseName ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 text-xs font-medium">
                        {item.courseName}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">{t("class.noCourse")}</span>
                    )}
                  </TableCell>

                  {/* Semester */}
                  <TableCell className="px-6 py-4 whitespace-nowrap text-theme-sm">
                    {item.semesterName ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-955/20 dark:text-amber-400 text-xs font-medium">
                        {item.semesterName}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">-</span>
                    )}
                  </TableCell>

                  {/* Note / Description */}
                  <TableCell className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap text-theme-sm">
                    <div className="max-w-[150px] truncate" title={item.description || ""}>
                      {item.description || t("class.noDescription")}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="px-6 py-4 text-center whitespace-nowrap text-theme-sm">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onViewClick(item)}
                        title={t("class.viewTooltip", { defaultValue: "Xem chi tiết" })}
                        className="p-1.5 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <PermissionGuard requiredPermission="Class.Edit">
                        <button
                          onClick={() => openEditModal(item)}
                          title={t("class.editTooltip")}
                          className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard requiredPermission="Class.Delete">
                        <button
                          onClick={() => (item.status === 0 || item.status === 3) && openDeleteModal(item)}
                          disabled={item.status !== 0 && item.status !== 3}
                          title={
                            item.status !== 0 && item.status !== 3
                              ? t("class.cannotDeleteStarted", { defaultValue: "Lớp học đã bắt đầu hoặc hoàn thành, không thể xóa" })
                              : t("class.deleteTooltip")
                          }
                          className="p-1.5 text-error-600 hover:text-error-800 dark:text-error-400 dark:hover:text-error-300 hover:bg-error-50 dark:hover:bg-error-950/30 rounded-md transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
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
            <span>{t("class.show")}</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-8 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-2 text-sm text-gray-700 dark:text-gray-350 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer font-medium"
            >
              <option value="5" className="dark:bg-gray-900">5</option>
              <option value="10" className="dark:bg-gray-900">10</option>
              <option value="20" className="dark:bg-gray-900">20</option>
              <option value="50" className="dark:bg-gray-900">50</option>
            </select>
            <span>{t("class.entriesPerPage")}</span>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t("class.showing", {
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
      {isDeleteModalOpen && deleteTarget && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          itemName={deleteTarget.name}
          isDeleting={isDeleting}
        />
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <DeleteConfirmModal
          isOpen={isBulkDeleteModalOpen}
          onClose={() => setIsBulkDeleteModalOpen(false)}
          onConfirm={handleBulkDeleteConfirm}
          itemName={t("class.selectedClassesCount", { count: selectedIds.length, defaultValue: `${selectedIds.length} lớp học đã chọn` })}
          isDeleting={isBulkDeleting}
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
            
            <PermissionGuard requiredPermission="Class.Delete">
              <button
                onClick={() => setIsBulkDeleteModalOpen(true)}
                disabled={isBulkDeleting}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50 transition-colors"
              >
                {isBulkDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                    {t("class.deletingBtn", { defaultValue: "Đang xóa..." })}
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    {t("class.bulkDeleteBtn", { defaultValue: "Xóa đã chọn" })}
                  </>
                )}
              </button>
            </PermissionGuard>


          </div>
        </div>
      )}

      {/* Auto Schedule Constraints Modal */}
      {isScheduleModalOpen && (
        <AutoScheduleModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          onSubmit={handleAutoSchedule}
          selectedClasses={items.filter(c => selectedIds.includes(c.id))}
          isSubmitting={isScheduling}
          t={t}
          showToast={showToast}
        />
      )}
    </div>
  );
}

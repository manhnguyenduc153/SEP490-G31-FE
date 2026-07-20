"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Eye } from "lucide-react";
import PaginationWithIcon from "@/components/tables/DataTables/TableOne/PaginationWithIcon";
import { classApi, ClassItem } from "@/services/class.api";
import { courseApi, CourseItem } from "@/services/course.api";
import { semesterApi, SemesterItem } from "@/services/semester.api";
import { commonApi } from "@/services/common.api";
import { useTranslation } from "react-i18next";

type TabType = "all" | "active" | "planning" | "completed";

interface TeacherClassTableProps {
  refreshKey?: number;
  onViewClick: (item: ClassItem) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function TeacherClassTable({ refreshKey: externalRefreshKey, onViewClick, showToast }: TeacherClassTableProps) {
  const { t } = useTranslation();

  // Dynamic Page Title
  useEffect(() => {
    document.title = `${t("sidebar.teachingClasses", { defaultValue: "Lớp giảng dạy" })} | School Management System`;
  }, [t]);

  // Data states
  const [items, setItems] = useState<ClassItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dropdowns for filters
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [semesters, setSemesters] = useState<SemesterItem[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);

  // Tab stats
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [countAll, setCountAll] = useState(0);
  const [countActive, setCountActive] = useState(0);
  const [countPlanning, setCountPlanning] = useState(0);
  const [countCompleted, setCountCompleted] = useState(0);

  // Pagination & search
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  // Trigger refresh when external refresh key changes
  useEffect(() => {
    if (externalRefreshKey !== undefined) {
      triggerRefresh();
    }
  }, [externalRefreshKey]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load filter options
  useEffect(() => {
    async function loadOptions() {
      try {
        const [cRes, sRes] = await Promise.all([
          commonApi.getCourses(1, 100, "", true),
          commonApi.getSemesters(),
        ]);
        if (cRes.success && cRes.data) setCourses(cRes.data.items || []);
        if (sRes.success && sRes.data) setSemesters(sRes.data || []);
      } catch (err) {
        console.error("Failed to load filter options in teacher class table", err);
      }
    }
    loadOptions();
  }, []);

  // Fetch counts & main data
  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const mainRes = await classApi.getTeacherClasses(currentPage, itemsPerPage, debouncedSearchTerm, selectedCourse);

        if (!mounted) return;

        if (mainRes.success && mainRes.data) {
          // Fetch all items for local counts and tabs alignment
          const allItemsRes = await classApi.getTeacherClasses(1, 1000, debouncedSearchTerm, selectedCourse);
          if (allItemsRes.success && allItemsRes.data) {
            let allList = allItemsRes.data.items || [];
            if (selectedSemester !== null) {
              allList = allList.filter(c => c.semesterId === selectedSemester);
            }
            setCountAll(allList.length);
            setCountActive(allList.filter(c => c.status === 1).length);
            setCountPlanning(allList.filter(c => c.status === 0).length);
            setCountCompleted(allList.filter(c => c.status === 2).length);

            // Filter list by activeTab
            let displayList = allList;
            if (activeTab === "active") displayList = allList.filter(c => c.status === 1);
            else if (activeTab === "planning") displayList = allList.filter(c => c.status === 0);
            else if (activeTab === "completed") displayList = allList.filter(c => c.status === 2);

            const total = displayList.length;
            setTotalRecords(total);
            setTotalPages(Math.ceil(total / itemsPerPage));

            // Apply pagination on final list
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
  }, [currentPage, itemsPerPage, debouncedSearchTerm, selectedCourse, selectedSemester, activeTab, refreshKey]);

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0:
        return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-500 border border-amber-200/50 dark:border-amber-500/20";
      case 1:
        return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500 border border-emerald-200/50 dark:border-emerald-500/20";
      case 2:
        return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-500 border border-blue-200/50 dark:border-blue-500/20";
      case 3:
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

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-hidden">
      
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t("sidebar.teachingClasses", { defaultValue: "Lớp giảng dạy" })}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t("class.teachingDesc", { defaultValue: "Xem và quản lý các lớp học bạn được phân công phụ trách giảng dạy." })}
        </p>
      </div>

      {/* Tabs */}
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
          <div className="relative md:col-span-4">
            <label className="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
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
          <div className="md:col-span-3">
            <label className="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("class.formSemesterLabel", { defaultValue: "Học kỳ" })}
            </label>
            <select
              value={selectedSemester || ""}
              onChange={(e) => { setSelectedSemester(e.target.value ? Number(e.target.value) : null); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-sm bg-transparent border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all h-11 cursor-pointer"
            >
              <option value="" className="dark:bg-gray-900">{t("class.filterSemesterAll", { defaultValue: "Tất cả học kỳ" })}</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.id} className="dark:bg-gray-900">{s.name}</option>
              ))}
            </select>
          </div>

          {/* Course Selector */}
          <div className="md:col-span-3">
            <label className="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("class.formCourseLabel")}
            </label>
            <select
              value={selectedCourse || ""}
              onChange={(e) => { setSelectedCourse(e.target.value ? Number(e.target.value) : null); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-sm bg-transparent border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all h-11 cursor-pointer"
            >
              <option value="" className="dark:bg-gray-900">{t("class.filterCourseAll", { defaultValue: "Tất cả khóa học" })}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id} className="dark:bg-gray-900">{c.name}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-center justify-end h-11 md:col-span-2">
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSelectedCourse(null);
                setSelectedSemester(null);
                setCurrentPage(1);
              }}
              className="inline-flex items-center justify-center px-4 h-11 text-sm font-medium text-gray-700 bg-white border border-gray-355 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors cursor-pointer w-full shadow-theme-xs"
            >
              {t("class.clearFiltersBtn", { defaultValue: "Xóa bộ lọc" })}
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50/70 dark:bg-gray-800/40">
            <TableRow>
              <TableCell className="w-[5%] px-5 sm:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                #
              </TableCell>
              <TableCell className="w-[15%] px-5 sm:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                {t("class.colCode")}
              </TableCell>
              <TableCell className="w-[30%] px-5 sm:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                {t("class.colName")}
              </TableCell>
              <TableCell className="w-[20%] px-5 sm:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                {t("class.colCourse")}
              </TableCell>
              <TableCell className="w-[15%] px-5 sm:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                {t("class.colSemester")}
              </TableCell>
              <TableCell className="w-[15%] px-5 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                {t("class.colActions")}
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-brand-500 border-t-transparent mr-2"></div>
                  {t("class.loadingDetail")}
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-sm text-error-500 dark:text-error-400">
                  {error}
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">
                  {t("class.noResults")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, index) => (
                <TableRow key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                  <TableCell className="px-5 sm:px-6 py-4 text-sm font-semibold text-gray-500 dark:text-gray-400">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </TableCell>
                  
                  <TableCell className="px-5 sm:px-6 py-4 font-medium text-gray-900 dark:text-white">
                    <div className="flex flex-col gap-1.5 items-start">
                      <span className="text-sm font-semibold">{item.code}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="px-5 sm:px-6 py-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white hover:text-brand-500 dark:hover:text-brand-400 cursor-pointer" onClick={() => onViewClick(item)}>
                        {item.name}
                      </span>
                      <div className="flex flex-wrap gap-1.5 items-center mt-1">
                        {item.startDate && item.endDate ? (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(item.startDate).toLocaleDateString("vi-VN")} - {new Date(item.endDate).toLocaleDateString("vi-VN")}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 text-[11px] font-semibold">
                          👤 {item.studentCount} {t("class.colStudents", { defaultValue: "học viên" }).toLowerCase()}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="px-5 sm:px-6 py-4">
                    {item.courseName ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 text-xs font-medium">
                        {item.courseName}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">{t("class.noCourse")}</span>
                    )}
                  </TableCell>

                  <TableCell className="px-5 sm:px-6 py-4">
                    {item.semesterName ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 text-xs font-medium">
                        {item.semesterName}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </TableCell>

                  <TableCell className="px-5 sm:px-6 py-4 text-right">
                    <button
                      onClick={() => onViewClick(item)}
                      title={t("class.viewTooltip", { defaultValue: "Xem chi tiết" })}
                      className="p-1 text-gray-400 hover:text-brand-500 transition-colors inline-flex items-center gap-1.5 text-xs font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{t("class.viewTooltip", { defaultValue: "Xem chi tiết" })}</span>
                    </button>
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
    </div>
  );
}

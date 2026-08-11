"use client";

import { useState, useEffect } from "react";
import { Search, Calendar, User, BookOpen } from "lucide-react";
import PaginationWithIcon from "@/components/tables/DataTables/TableOne/PaginationWithIcon";
import { classApi, ClassItem } from "@/services/class.api";
import { courseApi, CourseItem } from "@/services/course.api";
import { semesterApi, SemesterItem } from "@/services/semester.api";
import { commonApi } from "@/services/common.api";
import { useTranslation } from "react-i18next";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

type TabType = "all" | "active" | "planning" | "completed";

interface StudentClassGridProps {
  refreshKey?: number;
  onViewClick: (item: ClassItem) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function StudentClassGrid({ refreshKey: externalRefreshKey, onViewClick, showToast }: StudentClassGridProps) {
  const { t } = useTranslation();

  // Dynamic Page Title
  useEffect(() => {
    document.title = `${t("sidebar.myClasses", { defaultValue: "Lớp học" })} | School Management System`;
  }, [t]);

  // Data states
  const [items, setItems] = useState<ClassItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter options
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
  const [itemsPerPage, setItemsPerPage] = useState(6); // 6 cards per page fits grid nicely
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
        console.error("Failed to load filter options in student class list", err);
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
        const mainRes = await classApi.getStudentClasses(currentPage, itemsPerPage, debouncedSearchTerm, selectedCourse);

        if (!mounted) return;

        if (mainRes.success && mainRes.data) {
          // Fetch all items for local counts and tabs alignment
          const allItemsRes = await classApi.getStudentClasses(1, 1000, debouncedSearchTerm, selectedCourse);
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
      case 1: return t("class.statusActive", { defaultValue: "Đang học" });
      case 2: return t("class.statusCompleted", { defaultValue: "Đã hoàn thành" });
      case 3: return t("class.statusCancelled", { defaultValue: "Đã hủy" });
      default: return "";
    }
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Search and Filters Panel */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-xs">
        
        {/* Title */}
        <div className="pb-4 border-b border-gray-100 dark:border-gray-800 mb-5">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand-500" />
            {t("sidebar.myClasses", { defaultValue: "Lớp học" })}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t("class.studentDesc", { defaultValue: "Xem thông tin, tài liệu học tập, bài tập về nhà và bảng điểm các lớp học bạn đang tham gia." })}
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-2 pb-4 mb-4 border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={() => { setActiveTab("all"); setCurrentPage(1); }}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "all"
                ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
            }`}
          >
            {t("class.tabAll", { defaultValue: "Tất cả" })} ({countAll})
          </button>
          <button
            onClick={() => { setActiveTab("active"); setCurrentPage(1); }}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "active"
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-450"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
            }`}
          >
            {t("class.tabActive", { defaultValue: "Đang học" })} ({countActive})
          </button>
          <button
            onClick={() => { setActiveTab("planning"); setCurrentPage(1); }}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "planning"
                ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-450"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
            }`}
          >
            {t("class.tabPlanning", { defaultValue: "Sắp mở" })} ({countPlanning})
          </button>
          <button
            onClick={() => { setActiveTab("completed"); setCurrentPage(1); }}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "completed"
                ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-450"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
            }`}
          >
            {t("class.tabCompleted", { defaultValue: "Đã hoàn thành" })} ({countCompleted})
          </button>
        </div>

        {/* Input Filters */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 w-full">
          {/* Left Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-end flex-1 max-w-3xl">
            {/* Text Search */}
            <div className="relative w-full sm:w-72">
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
            <div className="w-full sm:w-48">
              <label className="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
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
            <div className="w-full sm:w-56">
              <label className="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
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
          </div>

          {/* Right action button */}
          <div className="shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSelectedCourse(null);
                setSelectedSemester(null);
                setCurrentPage(1);
              }}
              className="inline-flex items-center justify-center px-4 h-11 text-sm font-medium text-gray-700 bg-white border border-gray-355 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors cursor-pointer w-full sm:w-32 shadow-theme-xs"
            >
              {t("class.clearFiltersBtn", { defaultValue: "Xóa bộ lọc" })}
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Cards */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs text-gray-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent mb-3"></div>
          {t("class.loadingDetail")}
        </div>
      ) : error ? (
        <div className="p-10 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 text-center text-rose-500">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="p-16 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-center text-gray-500 dark:text-gray-400">
          {t("class.noResults")}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-150 dark:border-gray-850 hover:border-brand-500 dark:hover:border-brand-400 shadow-xs hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col justify-between"
            >
              {/* Card Top / Details */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-brand-500 uppercase tracking-wider bg-brand-50 dark:bg-brand-500/10 px-2.5 py-1 rounded-md">
                    {item.courseName || t("sidebar.courses")}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(item.status)}`}>
                    {getStatusText(item.status)}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3
                    onClick={() => onViewClick(item)}
                    className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-brand-500 transition-colors cursor-pointer line-clamp-1"
                  >
                    {item.name}
                  </h3>
                  <p className="text-xs font-semibold text-gray-400">{item.code}</p>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800/65">
                  {/* Semester */}
                  {item.semesterName && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                      <span>{item.semesterName}</span>
                    </div>
                  )}

                  {/* Date range */}
                  {item.startDate && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>
                        {new Date(item.startDate).toLocaleDateString("vi-VN")} - {item.endDate ? new Date(item.endDate).toLocaleDateString("vi-VN") : "..."}
                      </span>
                    </div>
                  )}

                  {/* Teacher info */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 pt-1">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      {t("class.colTeacher")}: <strong className="font-semibold text-gray-700 dark:text-gray-300">{item.teacherName || t("class.noTeacher")}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Action Button */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-850/30 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {item.expectedLessons ? `${item.expectedLessons} buổi` : ""}
                </span>
                <button
                  onClick={() => onViewClick(item)}
                  className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-brand-500 bg-brand-50 hover:bg-brand-500 hover:text-white rounded-lg transition-all duration-300 shadow-theme-xs cursor-pointer"
                >
                  {t("class.enterClassBtn", { defaultValue: "Vào lớp học" })} →
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex justify-center md:justify-end mt-4">
          <PaginationWithIcon
            totalPages={totalPages}
            initialPage={currentPage}
            onPageChange={(p) => setCurrentPage(p)}
          />
        </div>
      )}

    </div>
  );
}

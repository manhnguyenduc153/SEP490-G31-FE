"use client";

import React, { useState, useEffect } from "react";
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

export default function StudentRegistrationTable() {
  const { t } = useTranslation();
  const [semesters, setSemesters] = useState<SemesterItem[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(null);
  
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<number | null>(null);

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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [registrationToEdit, setRegistrationToEdit] = useState<StudentRegistrationDto | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
  };

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  const handleDelete = async (id: number) => {
    if (window.confirm(t("registration.confirmDelete", { defaultValue: "Bạn có chắc chắn muốn xóa đăng ký này không?" }))) {
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
          if (list.length > 0) {
            // Default to first active semester or just first semester
            const activeSem = list.find((s) => s.status === 1) || list[0];
            setSelectedSemesterId(activeSem.id);
          }
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
    if (selectedSemesterId === null) return;

    let mounted = true;
    async function loadRegistrations() {
      setIsLoadingList(true);
      setError(null);
      try {
        const res = await semesterApi.getStudentRegistrations(
          selectedSemesterId!,
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
    <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-xs overflow-hidden">
      {/* Toast */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-[99999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg text-sm font-medium text-white transition-all duration-300 ${
            toastType === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {toastType === "success" ? (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toastMessage}
        </div>
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
          <button
            onClick={() => {
              if (selectedSemesterId === null) {
                showToast(t("registration.toastSelectSemester"), "error");
                return;
              }
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-theme-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t("registration.addRegistration")}
          </button>
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
          <select
            disabled={isLoadingSemesters}
            value={selectedSemesterId || ""}
            onChange={(e) => {
              setSelectedSemesterId(e.target.value ? Number(e.target.value) : null);
              setPageIndex(1);
            }}
            className="h-11 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2 text-sm text-gray-855 focus:border-brand-500 focus:outline-hidden dark:bg-gray-900 dark:text-white/90 min-w-[150px] cursor-pointer"
          >
            <option value="" className="dark:bg-gray-900">{t("registration.selectSemester")}</option>
            {semesters.map((s) => (
              <option key={s.id} value={s.id} className="dark:bg-gray-900">
                {s.name}
              </option>
            ))}
          </select>
 
          {/* Course Selector */}
          <select
            disabled={isLoadingCourses}
            value={selectedCourseId ?? ""}
            onChange={(e) => {
              setSelectedCourseId(e.target.value ? Number(e.target.value) : null);
              setPageIndex(1);
            }}
            className="h-11 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2 text-sm text-gray-855 focus:border-brand-500 focus:outline-hidden dark:bg-gray-900 dark:text-white/90 min-w-[180px] max-w-[240px] cursor-pointer"
          >
            <option value="" className="dark:bg-gray-900">{t("registration.selectCourse")}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id} className="dark:bg-gray-900">
                {c.name}
              </option>
            ))}
          </select>
 
          {/* Status Selector */}
          <select
            value={selectedStatus ?? ""}
            onChange={(e) => {
              setSelectedStatus(e.target.value !== "" ? Number(e.target.value) : null);
              setPageIndex(1);
            }}
            className="h-11 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2 text-sm text-gray-855 focus:border-brand-500 focus:outline-hidden dark:bg-gray-900 dark:text-white/90 min-w-[150px] cursor-pointer"
          >
            <option value="" className="dark:bg-gray-900">{t("registration.selectStatus")}</option>
            <option value="0" className="dark:bg-gray-900">{t("registration.statusPending")}</option>
            <option value="1" className="dark:bg-gray-900">{t("registration.statusScheduled")}</option>
            <option value="2" className="dark:bg-gray-900">{t("registration.statusCancelled")}</option>
          </select>
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
      {selectedSemesterId === null ? (
        <div className="p-16 text-center text-sm text-gray-500 dark:text-gray-400">
          {t("registration.noSemesters")}
        </div>
      ) : isLoadingList ? (
        <div className="flex justify-center items-center py-20 text-sm text-gray-500 dark:text-gray-400">
          <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-brand-500 border-t-transparent mr-2"></div>
          {t("registration.loadingList")}
        </div>
      ) : error ? (
        <div className="p-8 text-center text-sm text-rose-500">{error}</div>
      ) : registrations.length === 0 ? (
        <div className="p-16 text-center text-sm text-gray-500 dark:text-gray-400">
          {searchTerm || selectedCourseId || selectedStatus !== null ? t("registration.noResults") : t("registration.noRegistered")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/70 dark:bg-gray-800/40">
              <TableRow>
                <TableCell className="w-[5%] px-5 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">{t("registration.colId")}</TableCell>
                <TableCell className="w-[10%] px-5 sm:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">{t("registration.colStudentCode")}</TableCell>
                <TableCell className="w-[20%] px-5 sm:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">{t("registration.colStudent")}</TableCell>
                <TableCell className="w-[15%] px-5 sm:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">{t("registration.colContact")}</TableCell>
                <TableCell className="w-[15%] px-5 sm:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">{t("registration.colCourse")}</TableCell>
                <TableCell className="w-[13%] px-5 sm:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">{t("registration.colPreferredSlots")}</TableCell>
                <TableCell className="w-[10%] px-5 sm:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">{t("registration.colStatus")}</TableCell>
                <TableCell className="w-[12%] px-5 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">{t("registration.colActions", { defaultValue: "Thao tác" })}</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {registrations.map((item, index) => (
                <TableRow key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                  <TableCell className="px-5 sm:px-6 py-4 text-center text-gray-400 font-medium">
                    {(pageIndex - 1) * pageSize + index + 1}
                  </TableCell>
                  <TableCell className="px-5 sm:px-6 py-4 font-semibold text-gray-900 dark:text-white">
                    {item.studentCode || <span className="text-gray-400 italic font-normal">—</span>}
                  </TableCell>
                  <TableCell className="px-5 sm:px-6 py-4 font-semibold text-gray-900 dark:text-white">
                    {item.studentName}
                  </TableCell>
                  <TableCell className="px-5 sm:px-6 py-4 text-xs">
                    <div className="text-gray-800 dark:text-gray-200">{item.studentEmail}</div>
                    <div className="text-gray-400 mt-0.5">{item.studentPhone || "—"}</div>
                  </TableCell>
                  <TableCell className="px-5 sm:px-6 py-4 text-gray-700 dark:text-gray-300 font-medium">
                    {item.courseName || t("semester.courseIdText", { id: item.courseId })}
                  </TableCell>
                  <TableCell className="px-5 sm:px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <div className="flex flex-wrap gap-1">
                      {item.preferredSlots && item.preferredSlots.length > 0 ? (
                        item.preferredSlots.map((slot) => (
                          <span key={slot} className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                            {slot === "Morning" ? t("registration.slotMorning") : slot === "Afternoon" ? t("registration.slotAfternoon") : t("registration.slotEvening")}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 italic">{t("registration.slotDefault")}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-5 sm:px-6 py-4">
                    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(item.status)}`}>
                      {getStatusText(item.status)}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 sm:px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        disabled={item.status === 1}
                        onClick={() => {
                          setRegistrationToEdit(item);
                          setIsModalOpen(true);
                        }}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-brand-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-brand-450 dark:hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500 dark:disabled:hover:text-gray-400"
                        title={item.status === 1 ? t("registration.cannotEditScheduled", { defaultValue: "Không thể sửa đăng ký đã xếp lớp" }) : t("common.edit", { defaultValue: "Sửa" })}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        disabled={item.status === 1}
                        onClick={() => handleDelete(item.id)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-rose-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-rose-450 dark:hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500 dark:disabled:hover:text-gray-400"
                        title={item.status === 1 ? t("registration.cannotDeleteScheduled", { defaultValue: "Không thể xóa đăng ký đã xếp lớp" }) : t("common.delete", { defaultValue: "Xóa" })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination Footer */}
      {selectedSemesterId !== null && (
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
    </div>
  );
}

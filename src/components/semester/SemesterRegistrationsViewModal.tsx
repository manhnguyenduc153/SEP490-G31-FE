"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { semesterApi, StudentRegistrationDto } from "@/services/semester.api";
import { X, Users, Search, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "react-i18next";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  semesterId: number;
  semesterName: string;
}

export function SemesterRegistrationsViewModal({ isOpen, onClose, semesterId, semesterName }: Props) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [registrations, setRegistrations] = useState<StudentRegistrationDto[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageIndex, setPageIndex] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const PAGE_SIZE = 15;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset states when search term or semester changes
  useEffect(() => {
    if (!isOpen) return;
    setRegistrations([]);
    setPageIndex(1);
    setHasMore(true);
  }, [semesterId, debouncedSearch, isOpen]);

  // Fetch registrations
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    
    async function fetchRegs() {
      setIsLoading(true);
      try {
        const res = await semesterApi.getStudentRegistrations(
          semesterId,
          debouncedSearch,
          null, // courseId
          null, // status
          pageIndex,
          PAGE_SIZE
        );
        if (active && res.success && res.data) {
          const newItems = res.data.items || [];
          setRegistrations(prev => {
            const existingIds = new Set(prev.map(i => i.id));
            const filteredNew = newItems.filter(i => !existingIds.has(i.id));
            return pageIndex === 1 ? newItems : [...prev, ...filteredNew];
          });
          setTotalRecords(res.data.totalRecords || 0);
          setHasMore(newItems.length === PAGE_SIZE && (pageIndex * PAGE_SIZE < (res.data.totalRecords || 0)));
        }
      } catch (err) {
        console.error("Lỗi tải học viên đăng ký:", err);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    fetchRegs();
    return () => {
      active = false;
    };
  }, [semesterId, debouncedSearch, pageIndex, isOpen]);

  // Handle scroll for lazy loading
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isLoading || !hasMore) return;
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    if (isAtBottom) {
      setPageIndex(prev => prev + 1);
    }
  };

  if (!isOpen) return null;
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-850">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-500" />
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">{t("semester.registrationsTitle")} - {semesterName}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t("semester.registrationsDesc")}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-255 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats & Search */}
        <div className="p-5 bg-gray-50/30 dark:bg-gray-900/10 border-b border-gray-100 dark:border-gray-855 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 bg-brand-50 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-900 px-4 py-2.5 rounded-xl">
            <Users className="w-5 h-5 text-brand-500" />
            <div>
              <span className="text-xs text-brand-600 dark:text-brand-400 font-medium">{t("semester.registrationsTotal")}:</span>
              <span className="text-sm font-bold text-brand-700 dark:text-brand-300 ml-1.5">
                {totalRecords} {t("semester.studentLabel", { defaultValue: "học viên" })}
              </span>
            </div>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <input
              type="text"
              placeholder={t("semester.registrationsSearch")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full pl-9 pr-4 py-2 text-sm bg-transparent border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder-gray-400"
            />
            <span className="absolute left-3 top-3 text-gray-400">
              <Search className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* List Table container with scroll listener */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar" onScroll={handleScroll}>
          {registrations.length === 0 && !isLoading ? (
            <div className="text-center py-16 text-sm text-gray-500 dark:text-gray-400 italic">
              {t("semester.registrationsNoResults")}
            </div>
          ) : (
            <div className="border border-gray-150 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-850 sticky top-0 z-10 shadow-xs">
                  <TableRow>
                    <TableCell className="w-[6%] py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">{t("semester.colId")}</TableCell>
                    <TableCell className="w-[15%] py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">{t("semester.registrationsColStudentCode")}</TableCell>
                    <TableCell className="w-[20%] py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">{t("semester.registrationsColStudentName")}</TableCell>
                    <TableCell className="w-[22%] py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">{t("semester.registrationsColContact")}</TableCell>
                    <TableCell className="w-[20%] py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">{t("semester.registrationsColCourse")}</TableCell>
                    <TableCell className="w-[17%] py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">{t("registration.colCreatedAt", { defaultValue: "Ngày đăng ký" })}</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-150 dark:divide-gray-800">
                  {registrations.map((item, index) => (
                    <TableRow key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <TableCell className="py-3.5 text-center text-sm font-semibold text-gray-400">
                        {index + 1}
                      </TableCell>
                      <TableCell className="py-3.5 text-sm font-semibold text-gray-900 dark:text-white">
                        {item.studentCode || <span className="text-gray-400 italic font-normal">—</span>}
                      </TableCell>
                      <TableCell className="py-3.5 text-sm font-semibold text-gray-900 dark:text-white">
                        {item.studentName}
                      </TableCell>
                      <TableCell className="py-3.5 text-xs text-gray-500 dark:text-gray-400">
                        <div className="font-medium text-gray-800 dark:text-gray-200">{item.studentEmail}</div>
                        <div className="mt-0.5">{item.studentPhone || "—"}</div>
                      </TableCell>
                      <TableCell className="py-3.5 text-sm text-gray-750 dark:text-gray-300 font-medium">
                        {item.courseName || t("semester.courseIdText", { id: item.courseId, defaultValue: `Khóa ID: ${item.courseId}` })}
                      </TableCell>
                      <TableCell className="py-3.5 text-xs text-gray-500 dark:text-gray-400">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString("vi-VN", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        }) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Loading spinner for next page load */}
          {isLoading && (
            <div className="flex justify-center items-center py-6 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin text-brand-500 mr-2" />
              {t("semester.registrationsLoading")}
            </div>
          )}

          {/* End of list text */}
          {!hasMore && registrations.length > 0 && (
            <div className="text-center py-6 text-xs text-gray-400 dark:text-gray-500 font-medium">
              {t("semester.registrationsAllLoaded", { total: totalRecords })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

"use client";
import React, { useState } from "react";
import { LowAttendanceAlert } from "@/services/dashboard.api";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  data: LowAttendanceAlert[] | null;
  loading?: boolean;
}

export default function LowAttendanceAlerts({ data, loading }: Props) {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  if (loading || !data) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 animate-pulse">
        <div className="h-5 w-48 bg-gray-200 rounded dark:bg-gray-700 mb-4" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
          {t("dashboardPage.lowAttendanceTitle")}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
          {t("dashboardPage.lowAttendanceEmpty")}
        </p>
      </div>
    );
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(data.length / itemsPerPage);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("dashboardPage.lowAttendanceTitle")}
          </h3>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto">
        <table className="min-w-full align-middle text-sm text-left">
          <thead>
            <tr className="border-b border-gray-100 dark:border-white/10">
              <th className="py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">
                {t("dashboardPage.colStudentName")}
              </th>
              <th className="py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                {t("dashboardPage.colClass")}
              </th>
              <th className="py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-center">
                {t("dashboardPage.colAttendanceRate")}
              </th>
              <th className="py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-center">
                {t("dashboardPage.colConsecutiveAbsences")}
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((alert) => (
              <tr
                key={`${alert.studentId}-${alert.className}`}
                className="border-b border-gray-100 dark:border-white/10"
              >
                <td className="py-3 pr-4">
                  <div className="font-medium text-gray-800 dark:text-white/90">
                    {alert.studentName}
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                  {alert.className}
                </td>
                <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-center font-medium">
                  <span className={alert.attendanceRate < 80 ? "text-error-500" : "text-gray-800 dark:text-white"}>
                    {alert.attendanceRate}%
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-center font-medium">
                  <span className={alert.consecutiveAbsences >= 3 ? "text-error-500" : "text-warning-500"}>
                    {alert.consecutiveAbsences}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-4 dark:border-white/10 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("registration.showingEntries", {
                  start: startIndex + 1,
                  end: Math.min(startIndex + itemsPerPage, data.length),
                  total: data.length,
                  defaultValue: `Hiển thị ${startIndex + 1} đến ${Math.min(startIndex + itemsPerPage, data.length)} trong tổng số ${data.length} mục`
                })}
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md gap-1" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.03] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`relative inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                        currentPage === pageNum
                          ? "bg-brand-500 text-white"
                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.03] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

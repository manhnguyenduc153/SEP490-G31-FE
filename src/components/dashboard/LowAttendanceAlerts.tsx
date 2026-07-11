"use client";
import React from "react";
import Badge from "../ui/badge/Badge";
import Link from "next/link";
import { LowAttendanceAlert } from "@/services/dashboard.api";
import { useTranslation } from "react-i18next";

interface Props {
  data: LowAttendanceAlert[] | null;
  loading?: boolean;
}

export default function LowAttendanceAlerts({ data, loading }: Props) {
  const { t } = useTranslation();

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

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("dashboardPage.lowAttendanceTitle")}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="#"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            {t("dashboardPage.viewDetails")}
          </Link>
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
              <th className="py-3 pl-4 font-medium text-gray-500 text-right dark:text-gray-400">
                {t("dashboardPage.colContact")}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((alert) => (
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
                <td className="py-3 pl-4 text-right">
                  <Link
                    href="#"
                    className="text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 text-sm font-medium"
                  >
                    {t("dashboardPage.actionViewStudent")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

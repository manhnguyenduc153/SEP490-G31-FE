"use client";
import React from "react";
import { RecentRegistration } from "@/services/dashboard.api";
import { useTranslation } from "react-i18next";

interface Props {
  data: RecentRegistration[] | null;
  loading?: boolean;
}

export default function RecentRegistrations({ data, loading }: Props) {
  const { t } = useTranslation();

  if (loading || !data) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 animate-pulse h-full flex flex-col justify-between">
        <div className="h-5 w-56 bg-gray-200 rounded dark:bg-gray-700 mb-4" />
        <div className="space-y-3 flex-1 flex flex-col justify-between">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 h-full flex flex-col justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
          {t("dashboardPage.recentRegistrationsTitle", { defaultValue: "Học viên đăng ký mới nhất" })}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center flex-1 flex items-center justify-center">
          {t("dashboardPage.recentRegistrationsEmpty")}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 h-full flex flex-col justify-between">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("dashboardPage.recentRegistrationsTitle", { defaultValue: "Học viên đăng ký mới nhất" })}
          </h3>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto flex-1 flex flex-col justify-between">
        <table className="min-w-full align-middle text-sm text-left">
          <thead>
            <tr className="border-b border-gray-100 dark:border-white/10">
              <th className="py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">
                {t("dashboardPage.colStudentName")}
              </th>
              <th className="py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                {t("dashboardPage.colCourse")}
              </th>
              <th className="py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                {t("dashboardPage.colEnrollType", { defaultValue: "Hình thức học" })}
              </th>
              <th className="py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                {t("dashboardPage.colRegistrationDate")}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 5).map((registration) => {
              const regDate = registration.registrationDate ? new Date(registration.registrationDate) : null;
              const isValidDate = regDate && !isNaN(regDate.getTime()) && regDate.getFullYear() > 2000;
              return (
                <tr
                  key={registration.id}
                  className="border-b border-gray-100 dark:border-white/10"
                >
                  <td className="py-3 pr-4">
                    <div className="font-medium text-gray-800 dark:text-white/90">
                      {registration.studentName}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                    {registration.courseName}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                      registration.enrollType === 1
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                        : "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
                    }`}>
                      {registration.enrollType === 1
                        ? t("dashboardPage.enrollTypeOnline", { defaultValue: "Online" })
                        : t("dashboardPage.enrollTypeOffline", { defaultValue: "Offline" })}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                    {isValidDate ? regDate.toLocaleDateString("vi-VN") : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


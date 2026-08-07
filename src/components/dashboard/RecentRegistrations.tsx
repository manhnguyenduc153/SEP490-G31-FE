"use client";
import React from "react";
import Badge from "../ui/badge/Badge";
import Link from "next/link";
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
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 animate-pulse">
        <div className="h-5 w-56 bg-gray-200 rounded dark:bg-gray-700 mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
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
          {t("dashboardPage.recentRegistrationsTitle")}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
          {t("dashboardPage.recentRegistrationsEmpty")}
        </p>
      </div>
    );
  }

  const getLocalizedSlot = (slot: string) => {
    switch (slot.trim().toLowerCase()) {
      case "morning":
        return t("registration.slotMorning", { defaultValue: "Sáng" });
      case "afternoon":
        return t("registration.slotAfternoon", { defaultValue: "Chiều" });
      case "evening":
        return t("registration.slotEvening", { defaultValue: "Tối" });
      default:
        return slot;
    }
  };

  const getLocalizedSlots = (slotsString: string) => {
    if (!slotsString) return t("registration.slotDefault", { defaultValue: "Mặc định" });
    return slotsString
      .split(",")
      .map((s) => getLocalizedSlot(s))
      .join(", ");
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("dashboardPage.recentRegistrationsTitle")}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="#"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            {t("dashboardPage.viewAll")}
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
                {t("dashboardPage.colCourse")}
              </th>
              <th className="py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                {t("dashboardPage.colPreferredSlots")}
              </th>
              <th className="py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
                {t("dashboardPage.colRegistrationDate")}
              </th>
              <th className="py-3 pl-4 font-medium text-gray-500 text-right dark:text-gray-400">
                {t("dashboardPage.colActions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 5).map((registration) => (
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
                <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                  {getLocalizedSlots(registration.preferredSlots)}
                </td>
                <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                  {new Date(registration.registrationDate).toLocaleDateString("vi-VN")}
                </td>
                <td className="py-3 pl-4 text-right">
                  <Link
                    href="#"
                    className="text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 text-sm font-medium"
                  >
                    {t("dashboardPage.actionAssign")}
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

"use client";
import React from "react";
import Badge from "../ui/badge/Badge";
import { GroupIcon, BoxIconLine, ListIcon, PageIcon } from "@/icons";
import { DashboardMetrics } from "@/services/dashboard.api";
import { useTranslation } from "react-i18next";

interface Props {
  metrics: DashboardMetrics | null;
  loading?: boolean;
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 animate-pulse">
      <div className="w-12 h-12 bg-gray-200 rounded-xl dark:bg-gray-700" />
      <div className="mt-5 space-y-2">
        <div className="h-4 w-24 bg-gray-200 rounded dark:bg-gray-700" />
        <div className="h-7 w-16 bg-gray-200 rounded dark:bg-gray-700" />
      </div>
    </div>
  );
}

export const ManagerMetrics = ({ metrics, loading }: Props) => {
  const { t } = useTranslation();

  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
      {/* Total Students */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <GroupIcon className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t("dashboardPage.totalStudents")}
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {metrics.totalStudents}
            </h4>
          </div>
        </div>
      </div>

      {/* Total Classes */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <ListIcon className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t("dashboardPage.totalClasses")}
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {metrics.totalClasses}
            </h4>
          </div>
        </div>
      </div>

      {/* Average Attendance Rate */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <BoxIconLine className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t("dashboardPage.averageAttendanceRate")}
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {metrics.averageAttendanceRate}%
            </h4>
          </div>
          <Badge color={metrics.averageAttendanceRate >= 80 ? "success" : "warning"}>
            {metrics.averageAttendanceRate >= 80 ? t("dashboardPage.good") : t("dashboardPage.needsImprovement")}
          </Badge>
        </div>
      </div>

      {/* Pending Registrations */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <PageIcon className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t("dashboardPage.pendingRegistrations")}
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {metrics.pendingRegistrations}
            </h4>
          </div>
          {metrics.pendingRegistrations > 0 && (
            <Badge color="warning">
              {t("dashboardPage.needsProcessing")}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

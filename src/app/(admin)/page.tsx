"use client";
import { useDashboard } from "@/hooks/useDashboard";
import { ManagerMetrics } from "@/components/dashboard/ManagerMetrics";
import React from "react";
import ClassStatusChart from "@/components/dashboard/ClassStatusChart";
import EnrollmentChart from "@/components/dashboard/EnrollmentChart";
import PopularCoursesChart from "@/components/dashboard/PopularCoursesChart";
import RecentRegistrations from "@/components/dashboard/RecentRegistrations";
import LowAttendanceAlerts from "@/components/dashboard/LowAttendanceAlerts";
import { useTranslation } from "react-i18next";

export default function Dashboard() {
  const { data, loading, error, refetch } = useDashboard();
  const { t } = useTranslation();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-2xl border border-error-200 bg-error-50 p-8 dark:border-error-800 dark:bg-error-900/20 text-center max-w-md">
          <h3 className="text-lg font-semibold text-error-600 dark:text-error-400 mb-2">
            {t("dashboardPage.loadError")}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {error}
          </p>
          <button
            onClick={refetch}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            {t("dashboardPage.retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12">
        <ManagerMetrics metrics={data?.metrics ?? null} loading={loading} />
      </div>

      <div className="col-span-12 xl:col-span-7">
        <EnrollmentChart data={data?.monthlyEnrollments ?? null} loading={loading} />
      </div>

      <div className="col-span-12 xl:col-span-5">
        <ClassStatusChart data={data?.classStatusDistribution ?? null} loading={loading} />
      </div>

      <div className="col-span-12 xl:col-span-5">
        <PopularCoursesChart data={data?.coursePopularity ?? null} loading={loading} />
      </div>

      <div className="col-span-12 xl:col-span-7 space-y-6">
        <LowAttendanceAlerts data={data?.lowAttendanceAlerts ?? null} loading={loading} />
        <RecentRegistrations data={data?.recentRegistrations ?? null} loading={loading} />
      </div>
    </div>
  );
}

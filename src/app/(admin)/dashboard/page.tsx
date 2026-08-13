"use client";
import { useDashboard } from "@/hooks/useDashboard";
import { ManagerMetrics } from "@/components/dashboard/ManagerMetrics";
import React from "react";
import ClassStatusChart from "@/components/dashboard/ClassStatusChart";
import EnrollmentChart from "@/components/dashboard/EnrollmentChart";
import PopularCoursesChart from "@/components/dashboard/PopularCoursesChart";
import RecentRegistrations from "@/components/dashboard/RecentRegistrations";
import LowAttendanceAlerts from "@/components/dashboard/LowAttendanceAlerts";
import TeacherWorkloadChart from "@/components/dashboard/TeacherWorkloadChart";
import ExamGradeDistributionChart from "@/components/dashboard/ExamGradeDistributionChart";
import GradingProgressCard from "@/components/dashboard/GradingProgressCard";
import { useTranslation } from "react-i18next";
import { authApi } from "@/services/auth.api";
import { Sun, Sunrise, Moon, Compass, HelpCircle, Activity, Calendar } from "lucide-react";

export default function Dashboard() {
  const { data, loading, error, refetch } = useDashboard();
  const { t } = useTranslation();

  // Check if user has permission to view dashboard
  const userPermissions = authApi.getPermissions();
  const hasDashboardPermission = userPermissions.includes("Dashboard");

  if (!hasDashboardPermission) {
    const getGreeting = () => {
      return t("dashboardPage.welcomeTitle", { defaultValue: "Xin chào" });
    };

    const getGreetingIcon = () => {
      const hours = new Date().getHours();
      if (hours < 12) {
        return <Sunrise className="w-8 h-8 text-amber-500" />;
      }
      if (hours < 18) {
        return <Sun className="w-8 h-8 text-amber-500" />;
      }
      return <Moon className="w-8 h-8 text-indigo-400" />;
    };

    const username = typeof window !== "undefined" ? localStorage.getItem("username") || "" : "";
    const role = typeof window !== "undefined" ? localStorage.getItem("role") || "" : "";

    return (
      <div className="space-y-6">
        {/* Welcome Header Section */}
        <div className="border border-gray-250 dark:border-gray-800 bg-white dark:bg-gray-900/50 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg shrink-0">
              {getGreetingIcon()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1.5">
                {getGreeting()},{username ? ` ${username}` : ""}!
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("dashboardPage.welcomeQuote", { defaultValue: "Chúc bạn một ngày làm việc và học tập hiệu quả!" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300">
            <Compass className="w-3.5 h-3.5 text-brand-500" />
            <span>{role || "Thành viên"}</span>
          </div>
        </div>

        {/* Informational Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Main Info Card */}
          <div className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-500" />
              <span>{t("dashboardPage.welcomeTitle", { defaultValue: "Xin chào" })}</span>
            </h2>
            <p className="text-sm text-gray-650 dark:text-gray-400 leading-relaxed">
              {t("dashboardPage.welcomeMessage", {
                defaultValue: "Chào mừng bạn quay trở lại với IELTsmart! Hãy sử dụng menu bên trái để truy cập các tính năng của hệ thống."
              })}
            </p>
            <div className="pt-4 border-t border-gray-100 dark:border-gray-850 text-xs text-gray-400 dark:text-gray-500 flex items-center justify-between">
              <span>{t("dashboardPage.systemStatusLabel", { defaultValue: "Trạng thái hệ thống" })}</span>
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-450 font-medium">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                <span>{t("dashboardPage.systemStable", { defaultValue: "Ổn định" })}</span>
              </div>
            </div>
          </div>

          {/* Quick Info & Tips */}
          <div className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              <span>{t("dashboardPage.tipsTitle", { defaultValue: "Gợi ý hôm nay" })}</span>
            </h2>
            <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                <span>{t("dashboardPage.tip1", { defaultValue: "Kiểm tra lịch dạy và học của bạn ở mục Lịch học." })}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                <span>{t("dashboardPage.tip2", { defaultValue: "Bạn có thể chuyển đổi ngôn ngữ Anh/Việt tại thanh tiêu đề trên cùng." })}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

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
      {/* 1. Key Metrics Overview */}
      <div className="col-span-12">
        <ManagerMetrics metrics={data?.metrics ?? null} loading={loading} />
      </div>

      {/* 2. Operational Utilization Row */}
      <div className="col-span-12">
        <TeacherWorkloadChart data={data?.teacherWorkload ?? null} loading={loading} />
      </div>

      {/* 3. Academic Quality & Grading Progress Row */}
      <div className="col-span-12 xl:col-span-7">
        <ExamGradeDistributionChart data={data?.examGradeDistribution ?? null} loading={loading} />
      </div>

      <div className="col-span-12 xl:col-span-5">
        <GradingProgressCard data={data?.gradingProgress ?? null} loading={loading} />
      </div>

      {/* 4. Enrollment & Class Statistics Row */}
      <div className="col-span-12 xl:col-span-7">
        <EnrollmentChart data={data?.monthlyEnrollments ?? null} loading={loading} />
      </div>

      <div className="col-span-12 xl:col-span-5">
        <ClassStatusChart data={data?.classStatusDistribution ?? null} loading={loading} />
      </div>

      {/* 5. Course Popularity, Attendance Alerts, and Recent Registrations */}
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

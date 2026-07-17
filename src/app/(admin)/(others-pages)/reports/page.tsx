"use client";
import React, { useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AttendanceReport from "@/components/reports/AttendanceReport";
import ExamReport from "@/components/reports/ExamReport";
import ClassGradeReport from "@/components/reports/ClassGradeReport";
import { ClipboardCheck, GraduationCap, BookOpen } from "lucide-react";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"attendance" | "exam" | "grade">("grade");

  return (
    <div className="flex flex-col gap-6 w-full max-w-full animate-fadeIn">
      <PageBreadcrumb pageTitle="Báo cáo & Thống kê" />

      {/* Custom Tabs Navigation */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-px overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab("grade")}
          className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold transition-all relative whitespace-nowrap
            ${activeTab === "grade" 
              ? "text-brand-600 dark:text-brand-400" 
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }
          `}
        >
          <BookOpen className="w-4 h-4" />
          Bảng điểm tổng hợp
          {activeTab === "grade" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-t-full shadow-[0_0_8px_rgba(var(--color-brand-500)/0.5)]"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold transition-all relative whitespace-nowrap
            ${activeTab === "attendance" 
              ? "text-brand-600 dark:text-brand-400" 
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }
          `}
        >
          <ClipboardCheck className="w-4 h-4" />
          Bảng điểm danh
          {activeTab === "attendance" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-t-full shadow-[0_0_8px_rgba(var(--color-brand-500)/0.5)]"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab("exam")}
          className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold transition-all relative whitespace-nowrap
            ${activeTab === "exam" 
              ? "text-brand-600 dark:text-brand-400" 
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }
          `}
        >
          <GraduationCap className="w-4 h-4" />
          Kết quả thi
          {activeTab === "exam" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-t-full shadow-[0_0_8px_rgba(var(--color-brand-500)/0.5)]"></div>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-2">
        {activeTab === "grade" && <ClassGradeReport />}
        {activeTab === "attendance" && <AttendanceReport />}
        {activeTab === "exam" && <ExamReport />}
      </div>
    </div>
  );
}

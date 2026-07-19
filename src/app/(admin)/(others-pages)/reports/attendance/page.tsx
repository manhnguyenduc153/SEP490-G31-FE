import React from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AttendanceReport from "@/components/reports/AttendanceReport";

export default function AttendanceReportPage() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-full animate-fadeIn">
      <PageBreadcrumb pageTitle="Bảng điểm danh" />
      <div className="mt-2">
        <AttendanceReport />
      </div>
    </div>
  );
}

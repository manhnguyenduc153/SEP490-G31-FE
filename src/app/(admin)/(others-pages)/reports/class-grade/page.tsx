import React from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ClassGradeReport from "@/components/reports/ClassGradeReport";

export default function ClassGradeReportPage() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-full animate-fadeIn">
      <PageBreadcrumb pageTitle="Bảng điểm tổng hợp" />
      <div className="mt-2">
        <ClassGradeReport />
      </div>
    </div>
  );
}

import { ExamTable } from "@/components/exam/ExamTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Exams | School Management System",
  description: "Quản lý danh sách bài kiểm tra.",
};

export default function ExamsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="sidebar.exams" />
      <div className="space-y-6">
        <ExamTable />
      </div>
    </div>
  );
}

import QuestionCategoryTable from "@/components/question-category/QuestionCategoryTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Question Category | School Management System",
  description: "Quản lý danh mục câu hỏi trong hệ thống ngân hàng câu hỏi.",
};

export default function QuestionCategoryPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Danh mục câu hỏi" />
      <div className="space-y-6">
        <QuestionCategoryTable />
      </div>
    </div>
  );
}

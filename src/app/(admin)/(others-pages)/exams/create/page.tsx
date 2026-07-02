import { ExamForm } from "@/components/exam/ExamForm";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Tạo bài kiểm tra mới | School Management System",
  description: "Tạo bài kiểm tra mới.",
};

export default function CreateExamPage() {
  return (
    <div className="space-y-6">
      <ExamForm />
    </div>
  );
}

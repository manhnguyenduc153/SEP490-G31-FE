import QuestionTable from "@/components/question-bank/QuestionTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Ngân hàng câu hỏi | School Management System",
  description: "Quản lý câu hỏi trong hệ thống ngân hàng câu hỏi.",
};

export default function QuestionBankPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Ngân hàng câu hỏi" />
      <div className="space-y-6">
        <QuestionTable />
      </div>
    </div>
  );
}

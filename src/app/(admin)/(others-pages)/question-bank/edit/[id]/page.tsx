import { QuestionForm } from "@/components/question-bank/QuestionForm";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Chỉnh sửa câu hỏi | School Management System",
  description: "Cập nhật thông tin câu hỏi trong ngân hàng câu hỏi.",
};

interface EditQuestionPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditQuestionPage({ params }: EditQuestionPageProps) {
  const resolvedParams = await params;
  const questionId = Number(resolvedParams.id);

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="question.editTitle" />
      <QuestionForm id={questionId} />
    </div>
  );
}

import { QuestionForm } from "@/components/question-bank/QuestionForm";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Tạo câu hỏi mới | School Management System",
  description: "Khởi tạo câu hỏi mới trong ngân hàng câu hỏi.",
};

export default function CreateQuestionPage() {
  return (
    <div>
      <QuestionForm />
    </div>
  );
}

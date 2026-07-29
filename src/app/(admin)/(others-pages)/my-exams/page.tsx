import { StudentExamListPage } from "@/components/exam/StudentExamListPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bài kiểm tra của tôi | School Management System",
  description: "Danh sách bài kiểm tra dành cho học sinh.",
};

export default function MyExamsPage() {
  return <StudentExamListPage />;
}

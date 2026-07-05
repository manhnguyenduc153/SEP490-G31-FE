import ParentStudentTable from "@/components/parent-student/ParentStudentTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Phụ huynh | School Management System",
  description: "Quản lý danh sách phụ huynh của học sinh.",
};

/**
 * Trang quản lý phụ huynh (standalone).
 * Có thể nhúng ParentStudentTable trực tiếp vào trang chi tiết học sinh
 * bằng cách truyền prop studentId.
 *
 * Ví dụ dùng trong trang detail học sinh:
 *   <ParentStudentTable studentId={student.id} studentName={student.name} />
 */
export default function ParentStudentPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="parentStudent.title" />
      <div className="space-y-6">
        {/*
          Lưu ý: Trang này hiển thị tất cả phụ huynh.
          Khi dùng trong trang chi tiết học sinh, truyền studentId cụ thể:
            <ParentStudentTable studentId={5} studentName="Nguyễn Văn A" />
        */}
        <ParentStudentTable />
      </div>
    </div>
  );
}

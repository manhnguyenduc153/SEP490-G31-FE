import StudentTable from "@/components/student/StudentTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Students | School Management System",
  description: "Quản lý danh sách học sinh.",
};

export default function StudentsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="sidebar.students" />
      <div className="space-y-6">
        <StudentTable />
      </div>
    </div>
  );
}

import CourseTable from "@/components/course/CourseTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Courses | School Management System",
  description: "Quản lý danh sách khóa học trong hệ thống.",
};

export default function CoursesPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="course.title" />
      <div className="space-y-6">
        <CourseTable />
      </div>
    </div>
  );
}

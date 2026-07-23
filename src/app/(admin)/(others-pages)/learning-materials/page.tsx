import LearningMaterialTable from "@/components/learning-material/LearningMaterialTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Learning Materials | School Management System",
  description: "Quản lý và tải lên các tài liệu học tập dành cho lớp học và khóa học.",
};

export default function LearningMaterialsPage() {
  return (
    <div className="space-y-6">
      <LearningMaterialTable />
    </div>
  );
}

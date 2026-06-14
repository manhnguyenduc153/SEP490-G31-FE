"use client";
import React from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import TeacherTable from "@/components/teacher/TeacherTable";
import { PermissionGuard } from "@/components/auth/PermissionGuard";

export default function TeacherPage() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-full">
      <PageBreadcrumb pageTitle="teacher.title" />
      
      <PermissionGuard requiredPermission="Teacher.View">
        <TeacherTable />
      </PermissionGuard>
    </div>
  );
}

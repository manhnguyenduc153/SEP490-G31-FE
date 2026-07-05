"use client";

import React from "react";
import HomeworkPage from "@/components/homework/HomeworkPage";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { PermissionGuard } from "@/components/auth/PermissionGuard";

export default function Homework() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Homework" />
      <PermissionGuard requiredPermission="Homework.View">
        <HomeworkPage />
      </PermissionGuard>
    </div>
  );
}

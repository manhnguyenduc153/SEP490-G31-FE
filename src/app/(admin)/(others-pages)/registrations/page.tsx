"use client";

import React from "react";
import StudentRegistrationTable from "@/components/registration/StudentRegistrationTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useTranslation } from "react-i18next";
import { PermissionGuard } from "@/components/auth/PermissionGuard";

export default function RegistrationsPage() {
  const { t } = useTranslation();
  return (
    <PermissionGuard requiredPermission="StudentRegistration.View" fallback={<div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 text-center text-sm text-rose-500 font-medium">Bạn không có quyền truy cập chức năng này.</div>}>
      <div>
        <div className="space-y-6">
          <StudentRegistrationTable />
        </div>
      </div>
    </PermissionGuard>
  );
}

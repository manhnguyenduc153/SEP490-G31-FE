"use client";

import React from "react";
import StudentRegistrationTable from "@/components/registration/StudentRegistrationTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useTranslation } from "react-i18next";

export default function RegistrationsPage() {
  const { t } = useTranslation();
  return (
    <div>
      <PageBreadcrumb pageTitle={t("registration.title")} />
      <div className="space-y-6">
        <StudentRegistrationTable />
      </div>
    </div>
  );
}

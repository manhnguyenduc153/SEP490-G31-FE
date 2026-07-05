"use client";

import React from "react";
import SemesterTable from "@/components/semester/SemesterTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useTranslation } from "react-i18next";

export default function SemestersPage() {
  const { t } = useTranslation();
  return (
    <div>
      <PageBreadcrumb pageTitle={t("sidebar.semesters")} />
      <div className="space-y-6">
        <SemesterTable />
      </div>
    </div>
  );
}

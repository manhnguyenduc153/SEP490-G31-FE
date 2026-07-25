"use client";

import React from "react";
import { StudentExamList } from "./StudentExamList";
import { useTranslation } from "react-i18next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

export function StudentExamListPage() {
  const { t } = useTranslation();

  return (
    <div>
      <PageBreadcrumb pageTitle="sidebar.myExams" />
      <div className="space-y-6">
        <StudentExamList t={t} />
      </div>
    </div>
  );
}

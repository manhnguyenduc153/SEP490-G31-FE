"use client";

import React from "react";
import SemesterTable from "@/components/semester/SemesterTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

export default function SemestersPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Niên khóa & Học kỳ" />
      <div className="space-y-6">
        <SemesterTable />
      </div>
    </div>
  );
}

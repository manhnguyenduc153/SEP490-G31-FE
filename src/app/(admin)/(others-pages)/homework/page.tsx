"use client";

import React from "react";
import HomeworkPage from "@/components/homework/HomeworkPage";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

export default function Homework() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Homework" />
      <HomeworkPage />
    </div>
  );
}

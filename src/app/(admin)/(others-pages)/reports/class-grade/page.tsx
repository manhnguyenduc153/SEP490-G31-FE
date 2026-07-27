import React from "react";
import ClassGradeReport from "@/components/reports/ClassGradeReport";

export default function ClassGradeReportPage() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-full animate-fadeIn">
      <div className="mt-2">
        <ClassGradeReport />
      </div>
    </div>
  );
}

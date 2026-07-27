import React from "react";
import ExamReport from "@/components/reports/ExamReport";

export default function ExamReportPage() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-full animate-fadeIn">
      <div className="mt-2">
        <ExamReport />
      </div>
    </div>
  );
}

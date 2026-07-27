import React from "react";
import AttendanceReport from "@/components/reports/AttendanceReport";

export default function AttendanceReportPage() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-full animate-fadeIn">
      <div className="mt-2">
        <AttendanceReport />
      </div>
    </div>
  );
}

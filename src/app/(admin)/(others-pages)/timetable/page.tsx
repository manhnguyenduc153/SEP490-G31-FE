import PersonalScheduleCalendar from "@/components/schedules/PersonalScheduleCalendar";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Thời Khóa Biểu Học Sinh | Hệ Thống Quản Lý Lớp Học",
  description: "Trang hiển thị thời khóa biểu cá nhân dành cho học sinh.",
};

export default function page() {
  return (
    <div className="w-full">
      <PageBreadcrumb pageTitle="Thời Khóa Biểu" />
      <PersonalScheduleCalendar type="student" />
    </div>
  );
}

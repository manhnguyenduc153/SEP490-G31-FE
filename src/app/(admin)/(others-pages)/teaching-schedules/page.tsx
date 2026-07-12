import PersonalScheduleCalendar from "@/components/schedules/PersonalScheduleCalendar";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Lịch Dạy Giáo Viên | Hệ Thống Quản Lý Lớp Học",
  description: "Trang hiển thị lịch dạy cá nhân dành cho giáo viên.",
};

export default function page() {
  return (
    <div className="w-full">
      <PersonalScheduleCalendar type="teacher" />
    </div>
  );
}

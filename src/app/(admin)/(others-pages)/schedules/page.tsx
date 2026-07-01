import ClassScheduleCalendar from "@/components/schedules/ClassScheduleCalendar";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Lịch Học | Hệ Thống Quản Lý Lớp Học",
  description: "Trang hiển thị lịch học của các lớp học dưới dạng lịch biểu tuần, tháng.",
};

export default function page() {
  return (
    <div className="w-full">
      <PageBreadcrumb pageTitle="Lịch Học" />
      <ClassScheduleCalendar />
    </div>
  );
}

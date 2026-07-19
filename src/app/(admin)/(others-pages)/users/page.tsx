import UserTable from "@/components/users/UserTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Users | School Management System",
  description: "Quản lý danh sách người dùng trong hệ thống.",
};

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <UserTable />
    </div>
  );
}

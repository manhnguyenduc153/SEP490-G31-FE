import RolesTable from "@/components/roles/RolesTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Roles Management | TailAdmin - Next.js Dashboard Template",
  description: "Manage system roles and permissions using advanced data table layout.",
};

export default function RolesPage() {
  return (
    <div>
      <div className="space-y-6">
        <RolesTable />
      </div>
    </div>
  );
}

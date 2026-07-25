"use client";

import React from "react";
import HomeworkPage from "@/components/homework/HomeworkPage";
import { PermissionGuard } from "@/components/auth/PermissionGuard";

export default function Homework() {
  return (
    <div>
      <PermissionGuard requiredPermission="HomeworkManagement.View">
        <HomeworkPage />
      </PermissionGuard>
    </div>
  );
}

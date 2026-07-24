"use client";

import HomeworkPage from "@/components/homework/HomeworkPage";
import { PermissionGuard } from "@/components/auth/PermissionGuard";

export default function MyHomeworkPage() {
  return (
    <PermissionGuard requiredPermission="StudentHomework.View">
      <HomeworkPage studentMode />
    </PermissionGuard>
  );
}

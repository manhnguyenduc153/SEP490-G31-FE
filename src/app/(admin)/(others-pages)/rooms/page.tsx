"use client";
import React from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import RoomTable from "@/components/room/RoomTable";
import { PermissionGuard } from "@/components/auth/PermissionGuard";

export default function RoomPage() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-full">
      <PageBreadcrumb pageTitle="room.title" />

      <PermissionGuard requiredPermission="Room.View">
        <RoomTable />
      </PermissionGuard>
    </div>
  );
}

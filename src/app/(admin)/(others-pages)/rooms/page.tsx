"use client";
import React from "react";
import RoomTable from "@/components/room/RoomTable";
import { PermissionGuard } from "@/components/auth/PermissionGuard";

export default function RoomPage() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-full">
      <PermissionGuard requiredPermission="Room.View">
        <RoomTable />
      </PermissionGuard>
    </div>
  );
}


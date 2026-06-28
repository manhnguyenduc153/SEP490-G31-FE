"use client";
import React, { useEffect, useState } from "react";
import { authApi } from "@/services/auth.api";

interface PermissionGuardProps {
  requiredPermission?: string; // If undefined, always show
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  requiredPermission,
  children,
  fallback = null,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (!requiredPermission) {
      setHasPermission(true);
      return;
    }

    const role = authApi.getRole().toLowerCase();
    if (role === "admin") {
      setHasPermission(true);
      return;
    }

    const userPermissions = authApi.getPermissions();
    setHasPermission(userPermissions.includes(requiredPermission));
  }, [requiredPermission]);

  if (!isMounted) return null; // Prevent hydration mismatch

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

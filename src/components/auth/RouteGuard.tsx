"use client";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authApi } from "@/services/auth.api";

// Mapping từ URL route sang Permission tương ứng
const routePermissions: Record<string, string | string[]> = {
  "/courses": "Course",
  "/classes": "Class",
  "/teachers": "Teacher",
  "/students": "Student",
  "/rooms": "Room",
  "/schedules": "ClassSchedule",
  "/exams": ["Exam.View", "Exam.TeacherView"],
  "/my-exams": "Exam.StudentView",
  "/assignments": "Activity",
  "/question-bank": "Question",
  "/question-category": "QuestionCategory",
  "/scores": "StudentGrade.ViewSettings",
  "/my-scores": "StudentResult.View",
  "/learning-materials": "LearningMaterial",
  "/attendance": "Attendance",
  "/homework": "HomeworkManagement.View",
  "/my-homework": "StudentHomework.View",
  "/users": "User",
  "/roles": "Role",
  "/child-profile": "ParentStudent",
};

export const RouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // 1. Lấy permission tương ứng với route hiện tại
    const requiredPermission = routePermissions[pathname];
    
    // Nếu route không yêu cầu permission đặc biệt -> cho phép truy cập
    if (!requiredPermission) {
      setIsAuthorized(true);
      return;
    }

    // 2. Kiểm tra xem user có permission đó không
    const userPermissions = authApi.getPermissions();
    const userRole = authApi.getRole().toLowerCase();

    const hasRequired = Array.isArray(requiredPermission)
      ? requiredPermission.some((p) => userPermissions.includes(p))
      : userPermissions.includes(requiredPermission);

    if (userRole === "admin" || hasRequired) {
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
      router.replace("/error-403");
    }
  }, [pathname, router]);

  if (isAuthorized === null || !isAuthorized) {
    return null; // Đang check quyền hoặc đã redirect, không render content
  }

  return <>{children}</>;
};

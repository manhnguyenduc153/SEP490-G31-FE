"use client";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authApi } from "@/services/auth.api";

// Mapping từ URL route sang Permission tương ứng
const routePermissions: Record<string, string | string[]> = {
  "/semesters": "Semester.View",
  "/courses": "Course.View",
  "/registrations": "StudentRegistration.View",
  "/classes": "Class.View",
  "/my-classes": "Class.StudentView",
  "/teaching-classes": "Class.TeacherView",
  "/teachers": "Teacher.View",
  "/students": "Student.View",
  "/rooms": "Room.View",
  "/schedules": "ClassSchedule.View",
  "/teaching-schedules": "ClassSchedule.TeacherView",
  "/timetable": "ClassSchedule.StudentView",
  "/exams": ["ExamSchedule.View", "ExamStudent.View"],
  "/assignments": "Activity.View",
  "/question-bank": "Question.View",
  "/question-category": "QuestionCategory.View",
  "/scores": "StudentGrade.View",
  "/my-scores": "StudentGrade.StudentView",
  "/learning-materials": "LearningMaterial.View",
  "/attendance": "Attendance.StudentView",
  "/homework": "Homework.View",
  "/users": "User.View",
  "/roles": "Role.View",
  "/parent-student": "ParentStudent.View",
  "/child-profile": "ParentStudent.View",
  "/child-progress": "ParentStudent.View",
  "/child-schedules": "ParentStudent.View",
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

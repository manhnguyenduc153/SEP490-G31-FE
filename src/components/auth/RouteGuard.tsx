"use client";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authApi } from "@/services/auth.api";

// Mapping từ URL route sang Permission tương ứng
const routePermissions: Record<string, string | string[]> = {
  // Academic Operations
  "/semesters": ["Semester", "Semester.View"],
  "/courses": ["Course", "Course.View"],
  "/registrations": ["StudentRegistration", "StudentRegistration.View"],
  "/classes": ["Class", "Class.View"],
  "/teaching-classes": "TeachingClass",
  "/teaching-exams": "TeachingExam",
  "/teachers": ["Teacher", "Teacher.View"],
  "/students": ["Student", "Student.View"],
  "/rooms": ["Room", "Room.View"],

  // Schedule
  "/schedules": ["Schedule", "ClassSchedule"],
  "/teaching-schedules": "TeachingSchedule",
  "/timetable": "Timetable",

  // Assessments
  "/exams": ["Exam", "Exam.View"],
  "/homework": ["HomeworkManagement", "HomeworkManagement.View"],
  "/question-bank": ["Question", "Question.View"],
  "/question-category": ["QuestionCategory", "QuestionCategory.View"],
  "/scores": "StudentGrade.ViewSettings",

  // Learning
  "/my-classes": "MyClass",
  "/learning-materials": ["LearningMaterial", "LearningMaterial.View"],
  "/my-homework": ["StudentHomework", "StudentHomework.View"],
  "/attendance": ["Attendance", "Attendance.View"],
  "/my-exams": "StudentExam",
  "/my-scores": "MyGrade",
  "/student-progress": "StudentProgress",

  // Administration
  "/users": ["User", "User.View"],
  "/roles": ["Role", "Role.View"],

  // Reports
  "/reports/class-grade": "ClassGradeReport",
  "/reports/attendance": "AttendanceReport",
  "/reports/exam": "ExamReport",

  // Parent Services
  "/parent-student": ["ParentStudent", "ParentStudent.View"],
  "/child-progress": "ChildProgress",
  "/child-schedules": "ChildSchedule",
};

export const RouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // 1. Tìm route khớp nhất (khớp hoàn toàn hoặc khớp prefix theo dạng path/subpath)
    const matchedKey = Object.keys(routePermissions)
      .sort((a, b) => b.length - a.length) // Ưu tiên các path dài hơn, chi tiết hơn
      .find((key) => pathname === key || pathname.startsWith(key + "/"));

    const requiredPermission = matchedKey ? routePermissions[matchedKey] : undefined;
    
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

    if (
      userRole === "admin" || 
      userRole === "academic staff" || 
      userRole === "ban chuyên chuyên môn" || // Tương ứng với cấu hình trong PermissionGuard
      userRole === "ban vận hành" ||
      hasRequired
    ) {
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

import { api, ApiResponse } from "./api";
import { ENDPOINTS } from "@/constants/endpoints";

// ─── DTOs (match backend DashboardDataDto) ───────────────────────────────────

export interface DashboardMetrics {
  totalStudents: number;
  totalClasses: number;
  averageAttendanceRate: number;
  pendingRegistrations: number;
}

export interface MonthlyEnrollment {
  year: number;
  month: number;
  monthLabel: string;
  count: number;
}

export interface CoursePopularity {
  courseName: string;
  studentCount: number;
  percentage: number;
}

export interface ClassStatusDistribution {
  statusName: string;
  count: number;
}

export interface RecentRegistration {
  id: number;
  studentName: string;
  courseName: string;
  preferredSlots: string;
  registrationDate: string;
}

export interface LowAttendanceAlert {
  studentId: number;
  studentName: string;
  className: string;
  attendanceRate: number;
  consecutiveAbsences: number;
  status: "Warning" | "Critical";
}

export interface DashboardData {
  metrics: DashboardMetrics;
  monthlyEnrollments: MonthlyEnrollment[];
  coursePopularity: CoursePopularity[];
  classStatusDistribution: ClassStatusDistribution[];
  recentRegistrations: RecentRegistration[];
  lowAttendanceAlerts: LowAttendanceAlert[];
}

// ─── API Call ────────────────────────────────────────────────────────────────

export async function getDashboardData(): Promise<ApiResponse<DashboardData>> {
  return api.get<DashboardData>(ENDPOINTS.DASHBOARD.GET_DATA);
}

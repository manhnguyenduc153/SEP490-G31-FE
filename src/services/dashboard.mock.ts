export interface DashboardMetrics {
  totalStudents: number;
  totalClasses: number;
  averageAttendanceRate: number; // in percentage
  pendingRegistrations: number;
}

export interface EnrollmentData {
  month: string;
  students: number;
}

export interface CoursePopularity {
  courseName: string;
  percentage: number;
}

export interface ClassStatusData {
  status: "Scheduled" | "Ongoing" | "Completed";
  count: number;
}

export interface RecentRegistration {
  id: string;
  studentName: string;
  courseName: string;
  desiredSchedule: string;
  registrationDate: string;
  status: "Pending";
}

export interface LowAttendanceAlert {
  id: string;
  studentName: string;
  className: string;
  attendanceRate: number; // in percentage
  consecutiveAbsences: number;
  status: "Warning" | "Critical";
}

export const mockDashboardMetrics: DashboardMetrics = {
  totalStudents: 1254,
  totalClasses: 45,
  averageAttendanceRate: 92.5,
  pendingRegistrations: 18,
};

export const mockEnrollmentData: EnrollmentData[] = [
  { month: "Jan", students: 120 },
  { month: "Feb", students: 135 },
  { month: "Mar", students: 110 },
  { month: "Apr", students: 150 },
  { month: "May", students: 180 },
  { month: "Jun", students: 210 },
  { month: "Jul", students: 250 },
  { month: "Aug", students: 240 },
  { month: "Sep", students: 190 },
  { month: "Oct", students: 220 },
  { month: "Nov", students: 170 },
  { month: "Dec", students: 195 },
];

export const mockCoursePopularity: CoursePopularity[] = [
  { courseName: "IELTS 5.0", percentage: 25 },
  { courseName: "IELTS 6.0", percentage: 35 },
  { courseName: "IELTS 6.5", percentage: 25 },
  { courseName: "IELTS 7.0+", percentage: 15 },
];

export const mockClassStatusData: ClassStatusData[] = [
  { status: "Scheduled", count: 8 },
  { status: "Ongoing", count: 25 },
  { status: "Completed", count: 12 },
];

export const mockRecentRegistrations: RecentRegistration[] = [
  {
    id: "REG001",
    studentName: "Nguyễn Văn A",
    courseName: "IELTS 6.5",
    desiredSchedule: "Tối 2-4-6",
    registrationDate: "2023-10-25",
    status: "Pending",
  },
  {
    id: "REG002",
    studentName: "Trần Thị B",
    courseName: "IELTS 5.0",
    desiredSchedule: "Sáng 3-5-7",
    registrationDate: "2023-10-25",
    status: "Pending",
  },
  {
    id: "REG003",
    studentName: "Lê Văn C",
    courseName: "IELTS 7.0+",
    desiredSchedule: "Tối 3-5-7",
    registrationDate: "2023-10-24",
    status: "Pending",
  },
  {
    id: "REG004",
    studentName: "Phạm Thị D",
    courseName: "IELTS 6.0",
    desiredSchedule: "Cuối tuần",
    registrationDate: "2023-10-23",
    status: "Pending",
  },
  {
    id: "REG005",
    studentName: "Hoàng Văn E",
    courseName: "IELTS 6.5",
    desiredSchedule: "Sáng 2-4-6",
    registrationDate: "2023-10-22",
    status: "Pending",
  },
];

export const mockLowAttendanceAlerts: LowAttendanceAlert[] = [
  {
    id: "STU101",
    studentName: "Vũ Hải Đăng",
    className: "IELTS65-K10",
    attendanceRate: 75,
    consecutiveAbsences: 3,
    status: "Critical",
  },
  {
    id: "STU102",
    studentName: "Nguyễn Mai Anh",
    className: "IELTS50-K12",
    attendanceRate: 78,
    consecutiveAbsences: 1,
    status: "Warning",
  },
  {
    id: "STU103",
    studentName: "Lê Bảo Trung",
    className: "IELTS60-K08",
    attendanceRate: 70,
    consecutiveAbsences: 4,
    status: "Critical",
  },
  {
    id: "STU104",
    studentName: "Trịnh Minh Phương",
    className: "IELTS65-K11",
    attendanceRate: 79,
    consecutiveAbsences: 2,
    status: "Warning",
  },
];

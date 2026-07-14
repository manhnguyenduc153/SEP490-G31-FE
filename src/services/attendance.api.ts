import { api, ApiResponse } from "./api";

export interface AttendanceStudentDto {
  id: number;
  scheduleId?: number | null;
  studentId?: number | null;
  studentCode?: string | null;
  studentName?: string | null;
  status: number;
  statusName?: string | null;
  checkInTime?: string | null;
  description?: string | null;
}

export interface AttendanceBulkSaveDto {
  scheduleId: number;
  attendances: {
    studentId: number;
    status: number;
    description?: string | null;
  }[];
}

export interface AttendanceReportDto {
  sessions: {
    scheduleId: number;
    lessonNo: number;
    date?: string | null;
  }[];
  students: {
    studentId: number;
    studentCode?: string | null;
    studentName?: string | null;
    attendances: {
      scheduleId: number;
      status: number;
      description?: string | null;
    }[];
  }[];
}

export interface MyAttendanceClassDto {
  classId: number;
  classCode?: string | null;
  className?: string | null;
  courseName?: string | null;
  teacherName?: string | null;
  attendedSessions: number;
  totalSessions: number;
  attendanceRate: number;
}

export interface MyAttendanceSessionDto {
  scheduleId: number;
  lessonNo: number;
  date?: string | null;
  status: number;
  statusName?: string | null;
  description?: string | null;
}

export const attendanceApi = {
  async getByScheduleId(scheduleId: number): Promise<ApiResponse<AttendanceStudentDto[]>> {
    return api.get<AttendanceStudentDto[]>(`/api/Attendance/schedule/${scheduleId}`);
  },

  async bulkSave(dto: AttendanceBulkSaveDto): Promise<ApiResponse<boolean>> {
    return api.post<boolean>("/api/Attendance/bulk-save", dto);
  },

  async getReportByClassId(classId: number): Promise<ApiResponse<AttendanceReportDto>> {
    return api.get<AttendanceReportDto>(`/api/Attendance/class/${classId}/report`);
  },

  async getMyAttendance(): Promise<ApiResponse<MyAttendanceClassDto[]>> {
    return api.get<MyAttendanceClassDto[]>("/api/Attendance/my");
  },

  async getMyAttendanceDetails(classId: number): Promise<ApiResponse<MyAttendanceSessionDto[]>> {
    return api.get<MyAttendanceSessionDto[]>(`/api/Attendance/my/class/${classId}`);
  },
};

import { ApiResponse, api } from "./api";

export interface ClassAttendanceHeaderDto {
  scheduleId: number;
  lessonNo: number;
  date?: string;
}

export interface ClassAttendanceStatusDto {
  scheduleId: number;
  status: number; // 1: Present, 0: Absent, 2: Late, 3: Excused, -1: Not taken
  description?: string;
}

export interface ClassAttendanceStudentRowDto {
  studentId: number;
  studentCode?: string;
  studentName?: string;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendanceRate: number;
  attendances: ClassAttendanceStatusDto[];
}

export interface ClassAttendanceSheetDto {
  classId: number;
  classCode?: string;
  className?: string;
  totalSessions: number;
  completedSessions: number;
  averageAttendanceRate: number;
  sessions: ClassAttendanceHeaderDto[];
  students: ClassAttendanceStudentRowDto[];
}

export const reportApi = {
  async getClassAttendanceSheet(classId: number): Promise<ApiResponse<ClassAttendanceSheetDto>> {
    return api.get<ClassAttendanceSheetDto>(`/api/Report/AttendanceSheet/${classId}`);
  },

  async getExamResultAnalysis(examId: number): Promise<ApiResponse<ExamResultReportDto>> {
    return api.get<ExamResultReportDto>(`/api/Report/ExamResult/${examId}`);
  },

  async getClassGradeReport(classId: number): Promise<ApiResponse<ClassGradeReportDto>> {
    return api.get<ClassGradeReportDto>(`/api/Report/ClassGrades/${classId}`);
  }
};

export interface StudentExamResultDto {
  studentId: number;
  studentCode: string;
  studentName: string;
  attemptCount: number;
  finalScore?: number | null;
  isPassed: boolean;
  submittedAt?: string | null;
}

export interface ExamResultReportDto {
  examId: number;
  examTitle: string;
  totalScore: number;
  passingScore: number;
  totalStudents: number;
  participatedStudents: number;
  passedStudents: number;
  failedStudents: number;
  averageScore: number;
  passRate: number;
  studentResults: StudentExamResultDto[];
}

export interface GradeComponentDto {
  id: number;
  courseId: number;
  code: string;
  name: string;
  weight: number;
  sortOrder: number;
  isSystem: boolean;
}

export interface StudentGradeRowDto {
  studentId: number;
  studentCode: string;
  studentName: string;
  componentScores: Record<number, number | null>;
  finalScore?: number | null;
  isPassed: boolean;
}

export interface ClassGradeReportDto {
  classId: number;
  classCode: string;
  className: string;
  components: GradeComponentDto[];
  students: StudentGradeRowDto[];
}

import { api, ApiResponse } from "./api";
import { ENDPOINTS } from "@/constants/endpoints";

export interface ClassScheduleItem {
  id: number;
  classId?: number | null;
  classCode?: string | null;
  className?: string | null;
  lessonNo?: number | null;
  scheduleDate?: string | null;
  slotId?: number | null;
  slotName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  roomId?: number | null;
  roomName?: string | null;
  teacherId?: number | null;
  teacherName?: string | null;
  teacherAvatar?: string | null;
  status: number;
  note?: string | null;
  classStatus?: number | null;
  attendanceStatus?: number | null;
}

export interface ClassItem {
  id: number;
  code: string;
  name: string;
  status: number;
  statusName?: string;
  type: number; // 0 = Offline, 1 = Online
  typeName?: string; // "Offline" | "Online"
  url?: string | null;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  courseId?: number | null;
  courseName?: string | null;
  teacherId?: number | null;
  teacherName?: string | null;
  teacherAvatar?: string | null;
  scheduleDisplay?: string | null;
  studentCount: number;
  autoRefund?: boolean | null;
  expectedLessons?: number | null;
  weeklySchedulesJson?: string | null;
  schedules?: ClassScheduleItem[];
  studentClasses?: {
    id: number;
    studentId: number;
    enrollType?: number | null; // 0 = Offline, 1 = Online
    enrollTypeName?: string | null;
    student?: {
      id: number;
      code: string;
      name: string;
      email?: string | null;
      phone?: string | null;
      avatar?: string | null;
    } | null;
  }[];
  semesterId?: number | null;
  semesterName?: string | null;
}

export interface ClassPagingResponse {
  pageIndex: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  items: ClassItem[];
}

export interface ClassSaveDto {
  id?: number;
  code: string;
  name: string;
  status: number;
  type: number; // 0 = Offline, 1 = Online
  url?: string | null;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  courseId?: number | null;
  teacherId?: number | null;
  scheduleDisplay?: string | null;
  students: { studentId: number; enrollType: number }[];
  autoRefund?: boolean | null;
  expectedLessons?: number | null;
  semesterId?: number | null;
  weeklySchedules?: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    roomId: number | null;
  }[];
  newStudents?: {
    name: string;
    email: string;
    phone?: string | null;
  }[];
  newTeacherEmail?: string | null;
  newTeacherName?: string | null;
  newCourseName?: string | null;
}

export interface ScheduleVersionListItem {
  id: number;
  name: string;
  createdAt: string;
  createdBy?: string | null;
  classCount: number;
  isAutoSaved: boolean;
}

export interface AutoScheduleConstraintDto {
  sessionsPerWeek: number;
  timePreferences: string[];
  allowWeekend: boolean;
  teacherIds?: number[];
  roomIds?: number[];
}

// ── Schedule reliability report (returned alongside the semester auto-schedule draft) ──────
// "reasonCode" maps to backendMessages.unscheduledReasons.<code> for localization.
export interface UnscheduledStudent {
  studentId: number;
  studentName: string;
  courseId: number;
  courseName: string;
  reasonCode: string;
}

export interface ScheduleCoverage {
  totalRequested: number;
  totalScheduled: number;
  scheduledRatePercent: number;
  unscheduledStudents: UnscheduledStudent[];
}

export interface HardConstraintCheck {
  name: string;
  violationCount: number;
  violationDetails: string[];
}

export interface SoftMetric {
  name: string;
  displayValue: string;
  status: "Good" | "Warning" | "Bad" | string;
  details: string[];
}

export interface ClassSizeExtreme {
  classCode: string;
  className: string;
  size: number;
}

export interface ScheduleDescriptiveStats {
  classesByGradeBand: Record<string, number>;
  teachersByGradeBandInUse: Record<string, number>;
  avgClassSize: number;
  largestClass?: ClassSizeExtreme | null;
  smallestClass?: ClassSizeExtreme | null;
  avgRoomCapacity?: number | null;
  avgRoomFillRatePercent?: number | null;
}

export interface ScheduleReliabilityReport {
  solverStatus: string;
  isProvenOptimal: boolean;
  coverage: ScheduleCoverage;
  hardConstraintChecks: HardConstraintCheck[];
  softMetrics: SoftMetric[];
  descriptiveStats: ScheduleDescriptiveStats;
}

// "code" maps to backendMessages.infeasibilityReasons.<code>; "params" are interpolation values for it.
export interface InfeasibilityReason {
  code: string;
  params: Record<string, string>;
}

export interface AutoScheduleSemesterResult {
  classes: ClassItem[];
  reliability: ScheduleReliabilityReport;
  infeasibilityReasons?: InfeasibilityReason[] | null;
}

export const classApi = {
  async getAll(
    pageIndex: number,
    pageSize: number,
    keyword: string = "",
    courseId?: number | null,
    teacherId?: number | null,
    type?: number | null
  ): Promise<ApiResponse<ClassPagingResponse>> {
    const params: Record<string, string> = {
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
    };
    if (keyword) params.keyword = keyword;
    if (courseId) params.courseId = String(courseId);
    if (teacherId) params.teacherId = String(teacherId);
    if (type !== undefined && type !== null) params.type = String(type);

    const query = new URLSearchParams(params).toString();
    return api.get<ClassPagingResponse>(`${ENDPOINTS.CLASS.GET_ALL}?${query}`);
  },

  async getTeacherClasses(
    pageIndex: number,
    pageSize: number,
    keyword: string = "",
    courseId?: number | null
  ): Promise<ApiResponse<ClassPagingResponse>> {
    const params: Record<string, string> = {
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
    };
    if (keyword) params.keyword = keyword;
    if (courseId) params.courseId = String(courseId);

    const query = new URLSearchParams(params).toString();
    return api.get<ClassPagingResponse>(`/api/Class/teaching-classes?${query}`);
  },

  async getStudentClasses(
    pageIndex: number,
    pageSize: number,
    keyword: string = "",
    courseId?: number | null
  ): Promise<ApiResponse<ClassPagingResponse>> {
    const params: Record<string, string> = {
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
    };
    if (keyword) params.keyword = keyword;
    if (courseId) params.courseId = String(courseId);

    const query = new URLSearchParams(params).toString();
    return api.get<ClassPagingResponse>(`/api/Class/my-classes?${query}`);
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getById(id: number): Promise<ApiResponse<any>> {
    return api.get<any>(ENDPOINTS.CLASS.GET_BY_ID(id));
  },

  async create(dto: ClassSaveDto): Promise<ApiResponse<ClassItem>> {
    return api.post<ClassItem>(ENDPOINTS.CLASS.CREATE, dto);
  },

  async update(id: number, dto: ClassSaveDto): Promise<ApiResponse<ClassItem>> {
    return api.put<ClassItem>(ENDPOINTS.CLASS.UPDATE(id), dto);
  },

  async delete(id: number): Promise<ApiResponse<boolean>> {
    return api.delete<boolean>(ENDPOINTS.CLASS.DELETE(id));
  },

  async deactive(id: number): Promise<ApiResponse<boolean>> {
    return api.post<boolean>(ENDPOINTS.CLASS.DEACTIVE(id), {});
  },

  async getTeacherSchedules(): Promise<ApiResponse<ClassScheduleItem[]>> {
    return api.get<ClassScheduleItem[]>("/api/Class/TeacherSchedules");
  },

  async getStudentSchedules(): Promise<ApiResponse<ClassScheduleItem[]>> {
    return api.get<ClassScheduleItem[]>("/api/Class/StudentSchedules");
  },
  
  async getChildSchedules(studentId: number): Promise<ApiResponse<ClassScheduleItem[]>> {
    return api.get<ClassScheduleItem[]>(`/api/Class/ChildSchedules?studentId=${studentId}`);
  },
  
  async getClassSchedules(): Promise<ApiResponse<ClassScheduleItem[]>> {
    return api.get<ClassScheduleItem[]>("/api/Class/Schedules");
  },

  async checkConflict(dto: ClassSaveDto): Promise<ApiResponse<{ hasConflict: boolean; conflicts: any[] }>> {
    return api.post<{ hasConflict: boolean; conflicts: any[] }>("/api/Class/check-conflict", dto);
  },

  async autoSchedule(classIds: number[], constraints: AutoScheduleConstraintDto): Promise<ApiResponse<ClassItem[]>> {
    return api.post<ClassItem[]>("/api/Class/auto-schedule", { classIds, constraints });
  },

  async autoScheduleSemester(dto: {
    semesterId: number;
    maxClassSize: number;
    minClassSize: number;
    constraints: AutoScheduleConstraintDto;
  }): Promise<ApiResponse<AutoScheduleSemesterResult>> {
    return api.post<AutoScheduleSemesterResult>(ENDPOINTS.SEMESTER.AUTO_SCHEDULE_SEMESTER, dto);
  },

  async saveScheduleDraft(dto: {
    semesterId: number;
    classes: {
      code: string;
      name: string;
      courseId: number;
      teacherId: number;
      enrollType: number;
      expectedLessons: number;
      weeklySchedules: { dayOfWeek: number; startTime: string; endTime: string; roomId: number | null }[];
      students: { studentId: number; enrollType: number }[];
    }[];
  }): Promise<ApiResponse<ClassItem[]>> {
    return api.post<ClassItem[]>(ENDPOINTS.SEMESTER.SAVE_SCHEDULE_DRAFT, dto);
  },

  async saveScheduleVersion(semesterId: number, name: string): Promise<ApiResponse<ScheduleVersionListItem>> {
    return api.post<ScheduleVersionListItem>(ENDPOINTS.SEMESTER.SAVE_SCHEDULE_VERSION(semesterId), { name });
  },

  async getScheduleVersions(semesterId: number): Promise<ApiResponse<ScheduleVersionListItem[]>> {
    return api.get<ScheduleVersionListItem[]>(ENDPOINTS.SEMESTER.GET_SCHEDULE_VERSIONS(semesterId));
  },

  async deleteScheduleVersion(versionId: number): Promise<ApiResponse<boolean>> {
    return api.delete<boolean>(ENDPOINTS.SEMESTER.DELETE_SCHEDULE_VERSION(versionId));
  },

  async getScheduleVersionPreview(versionId: number): Promise<ApiResponse<ClassItem[]>> {
    return api.get<ClassItem[]>(ENDPOINTS.SEMESTER.GET_SCHEDULE_VERSION_PREVIEW(versionId));
  },

  async rollbackSemesterSchedule(semesterId: number, versionId: number): Promise<ApiResponse<ClassItem[]>> {
    return api.post<ClassItem[]>(ENDPOINTS.SEMESTER.ROLLBACK_SCHEDULE_DRAFT(semesterId, versionId), {});
  },
};

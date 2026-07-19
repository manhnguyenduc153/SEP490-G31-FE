import { api, ApiResponse } from "./api";
import { ENDPOINTS } from "@/constants/endpoints";

export interface SemesterItem {
  id: number;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: number; // 0: Draft, 1: Active, 2: Completed, 3: Closed
  statusName?: string;
  classCount?: number;
  hasSchedules?: boolean;
}

export interface SemesterSaveDto {
  id?: number;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: number;
}

export interface TeacherAvailabilitySlotDto {
  dayOfWeek: number;
  slotIndex: number;
}

export interface TeacherAvailabilitySaveDto {
  teacherId: number;
  semesterId: number;
  slots: TeacherAvailabilitySlotDto[];
}

export interface StudentRegistrationDto {
  id: number;
  studentId: number;
  semesterId: number;
  studentCode?: string | null;
  studentName: string;
  studentEmail: string;
  studentPhone?: string | null;
  courseId: number;
  courseName?: string | null;
  preferredSlotsJson?: string | null;
  preferredSlots?: string[];
  status: number;
}

export interface StudentRegistrationSaveDto {
  semesterId: number;
  studentCode?: string | null;
  studentName: string;
  studentEmail: string;
  studentPhone?: string | null;
  /** CourseId = 0 means backend will auto-resolve by courseName */
  courseId: number;
  /** Used when courseId = 0 to auto-find or create the course */
  courseName?: string | null;
  preferredSlots: string[];
  status?: number;
}

export interface StudentRegistrationPagingResponse {
  pageIndex: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  items: StudentRegistrationDto[];
}

export interface AutoScheduleSemesterRequestDto {
  semesterId: number;
  maxClassSize: number;
  minClassSize: number;
  constraints: {
    sessionsPerWeek: number;
    timePreferences: string[];
    allowConsecutiveDays: boolean;
    allowWeekend: boolean;
  };
}

export const semesterApi = {
  async getAll(): Promise<ApiResponse<SemesterItem[]>> {
    return api.get<SemesterItem[]>(ENDPOINTS.SEMESTER.GET_ALL);
  },

  async getById(id: number): Promise<ApiResponse<SemesterItem>> {
    return api.get<SemesterItem>(ENDPOINTS.SEMESTER.GET_BY_ID(id));
  },

  async create(dto: SemesterSaveDto): Promise<ApiResponse<SemesterItem>> {
    return api.post<SemesterItem>(ENDPOINTS.SEMESTER.CREATE, dto);
  },

  async update(id: number, dto: SemesterSaveDto): Promise<ApiResponse<SemesterItem>> {
    return api.put<SemesterItem>(ENDPOINTS.SEMESTER.UPDATE(id), dto);
  },

  async delete(id: number): Promise<ApiResponse<boolean>> {
    return api.delete<boolean>(ENDPOINTS.SEMESTER.DELETE(id));
  },

  async getTeacherAvailability(semesterId: number, teacherId: number): Promise<ApiResponse<TeacherAvailabilitySlotDto[]>> {
    return api.get<TeacherAvailabilitySlotDto[]>(`/api/Semester/${semesterId}/teacher/${teacherId}/availability`);
  },

  async checkTeacherHasSchedules(semesterId: number, teacherId: number): Promise<ApiResponse<boolean>> {
    return api.get<boolean>(`/api/Semester/${semesterId}/teacher/${teacherId}/has-schedules`);
  },

  async saveTeacherAvailability(dto: TeacherAvailabilitySaveDto): Promise<ApiResponse<boolean>> {
    return api.post<boolean>(ENDPOINTS.SEMESTER.SAVE_TEACHER_AVAILABILITY, dto);
  },

  async getStudentRegistrations(
    semesterId: number | null | undefined,
    keyword: string = "",
    courseId?: number | null,
    status?: number | null,
    pageIndex: number = 1,
    pageSize: number = 10
  ): Promise<ApiResponse<StudentRegistrationPagingResponse>> {
    const semId = semesterId ? semesterId : 0;
    const params: Record<string, string> = {
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
    };
    if (keyword) params.keyword = keyword;
    if (courseId !== undefined && courseId !== null) params.courseId = String(courseId);
    if (status !== undefined && status !== null) params.status = String(status);

    const query = new URLSearchParams(params).toString();
    return api.get<StudentRegistrationPagingResponse>(
      `/api/Semester/${semId}/registrations?${query}`
    );
  },

  async importStudentRegistrations(dtos: StudentRegistrationSaveDto[]): Promise<ApiResponse<StudentRegistrationDto[]>> {
    return api.post<StudentRegistrationDto[]>(ENDPOINTS.SEMESTER.IMPORT_STUDENTS, dtos);
  },

  async createStudentRegistration(dto: StudentRegistrationSaveDto): Promise<ApiResponse<StudentRegistrationDto>> {
    return api.post<StudentRegistrationDto>(ENDPOINTS.SEMESTER.CREATE_REGISTRATION, dto);
  },

  async updateStudentRegistration(id: number, dto: StudentRegistrationSaveDto): Promise<ApiResponse<StudentRegistrationDto>> {
    return api.put<StudentRegistrationDto>(ENDPOINTS.SEMESTER.UPDATE_REGISTRATION(id), dto);
  },

  async deleteStudentRegistration(id: number): Promise<ApiResponse<boolean>> {
    return api.delete<boolean>(ENDPOINTS.SEMESTER.DELETE_REGISTRATION(id));
  },

  async autoScheduleSemester(dto: AutoScheduleSemesterRequestDto): Promise<ApiResponse<any>> {
    return api.post<any>(ENDPOINTS.SEMESTER.AUTO_SCHEDULE_SEMESTER, dto);
  },
};

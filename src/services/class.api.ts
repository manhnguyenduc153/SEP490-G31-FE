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
}

export interface ClassItem {
  id: number;
  code: string;
  name: string;
  status: number;
  statusName?: string;
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
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  courseId?: number | null;
  teacherId?: number | null;
  scheduleDisplay?: string | null;
  studentIds: number[];
  autoRefund?: boolean | null;
  expectedLessons?: number | null;
  weeklySchedules?: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    roomId: number | null;
  }[];
}

export const classApi = {
  async getAll(
    pageIndex: number,
    pageSize: number,
    keyword: string = "",
    courseId?: number | null,
    teacherId?: number | null
  ): Promise<ApiResponse<ClassPagingResponse>> {
    const params: Record<string, string> = {
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
    };
    if (keyword) params.keyword = keyword;
    if (courseId) params.courseId = String(courseId);
    if (teacherId) params.teacherId = String(teacherId);

    const query = new URLSearchParams(params).toString();
    return api.get<ClassPagingResponse>(`${ENDPOINTS.CLASS.GET_ALL}?${query}`);
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
};

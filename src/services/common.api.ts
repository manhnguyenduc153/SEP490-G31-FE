import { api, ApiResponse } from "./api";
import { ENDPOINTS } from "@/constants/endpoints";
import { SemesterItem } from "./semester.api";
import { CoursePagingResponse } from "./course.api";
import { ClassPagingResponse } from "./class.api";
import { QuestionCategoryPagingResponse } from "./questionCategory.api";
import { RoomItem } from "./room.api";

export const commonApi = {
  async getSemesters(): Promise<ApiResponse<SemesterItem[]>> {
    return api.get<SemesterItem[]>(ENDPOINTS.COMMON.SEMESTERS);
  },

  async getCourses(
    pageIndex: number,
    pageSize: number,
    keyword: string = "",
    status?: boolean | null
  ): Promise<ApiResponse<CoursePagingResponse>> {
    const params: Record<string, string> = {
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
    };
    if (keyword) {
      params.keyword = keyword;
    }
    if (status !== undefined && status !== null) {
      params.status = String(status);
    }
    const query = new URLSearchParams(params).toString();
    return api.get<CoursePagingResponse>(
      `${ENDPOINTS.COMMON.COURSES}?${query}`
    );
  },

  async getClasses(
    pageIndex: number,
    pageSize: number,
    keyword: string = ""
  ): Promise<ApiResponse<ClassPagingResponse>> {
    const query = new URLSearchParams({
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
      ...(keyword ? { keyword } : {}),
    }).toString();
    return api.get<ClassPagingResponse>(
      `${ENDPOINTS.COMMON.CLASSES}?${query}`
    );
  },

  async getAccessibleClasses(
    pageIndex: number,
    pageSize: number,
    keyword: string = ""
  ): Promise<ApiResponse<ClassPagingResponse>> {
    const query = new URLSearchParams({
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
      ...(keyword ? { keyword } : {}),
    }).toString();
    return api.get<ClassPagingResponse>(
      `${ENDPOINTS.COMMON.ACCESSIBLE_CLASSES}?${query}`
    );
  },

  async getQuestionCategories(
    pageIndex: number,
    pageSize: number,
    keyword: string = ""
  ): Promise<ApiResponse<QuestionCategoryPagingResponse>> {
    const query = new URLSearchParams({
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
      ...(keyword ? { keyword } : {}),
    }).toString();
    return api.get<QuestionCategoryPagingResponse>(
      `${ENDPOINTS.COMMON.QUESTION_CATEGORIES}?${query}`
    );
  },

  async getTeachers(
    pageIndex: number,
    pageSize: number,
    keyword: string = "",
    teacherStatus?: number | null
  ): Promise<ApiResponse<any>> {
    const params: Record<string, string> = {
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
    };
    if (keyword) params.keyword = keyword;
    if (teacherStatus !== undefined && teacherStatus !== null) params.teacherStatus = String(teacherStatus);
    const query = new URLSearchParams(params).toString();
    return api.get<any>(`${ENDPOINTS.COMMON.TEACHERS}?${query}`);
  },

  async getRooms(
    pageIndex: number,
    pageSize: number,
    keyword: string = "",
    status?: boolean | null
  ): Promise<ApiResponse<any>> {
    const params: Record<string, string> = {
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
    };
    if (keyword) params.keyword = keyword;
    if (status !== undefined && status !== null) params.status = String(status);
    const query = new URLSearchParams(params).toString();
    return api.get<any>(`${ENDPOINTS.COMMON.ROOMS}?${query}`);
  },

  async getAvailableTeachers(params: AvailableTeacherParams): Promise<ApiResponse<AvailableTeacherItem[]>> {
    const queryParams: Record<string, string> = {};
    if (params.courseId) queryParams.courseId = String(params.courseId);
    if (params.semesterId) queryParams.semesterId = String(params.semesterId);
    if (params.dayOfWeek !== undefined && params.dayOfWeek !== null) queryParams.dayOfWeek = String(params.dayOfWeek);
    if (params.slotIndex !== undefined && params.slotIndex !== null) queryParams.slotIndex = String(params.slotIndex);
    if (params.date) queryParams.date = params.date;
    if (params.startDate) queryParams.startDate = params.startDate;
    if (params.endDate) queryParams.endDate = params.endDate;
    if (params.excludeScheduleId) queryParams.excludeScheduleId = String(params.excludeScheduleId);
    if (params.excludeClassId) queryParams.excludeClassId = String(params.excludeClassId);
    if (params.weeklySchedulesJson) queryParams.weeklySchedulesJson = params.weeklySchedulesJson;

    const query = new URLSearchParams(queryParams).toString();
    return api.get<AvailableTeacherItem[]>(`${ENDPOINTS.COMMON.AVAILABLE_TEACHERS}?${query}`);
  },

  async getAvailableRooms(params: AvailableRoomParams): Promise<ApiResponse<RoomItem[]>> {
    const queryParams: Record<string, string> = {};
    if (params.minCapacity !== undefined && params.minCapacity !== null) queryParams.minCapacity = String(params.minCapacity);
    if (params.classId) queryParams.classId = String(params.classId);
    if (params.date) queryParams.date = params.date;
    if (params.slotIndex !== undefined && params.slotIndex !== null) queryParams.slotIndex = String(params.slotIndex);
    if (params.startDate) queryParams.startDate = params.startDate;
    if (params.endDate) queryParams.endDate = params.endDate;
    if (params.dayOfWeek !== undefined && params.dayOfWeek !== null) queryParams.dayOfWeek = String(params.dayOfWeek);
    if (params.excludeScheduleId) queryParams.excludeScheduleId = String(params.excludeScheduleId);
    if (params.excludeClassId) queryParams.excludeClassId = String(params.excludeClassId);
    if (params.weeklySchedulesJson) queryParams.weeklySchedulesJson = params.weeklySchedulesJson;

    const query = new URLSearchParams(queryParams).toString();
    return api.get<RoomItem[]>(`${ENDPOINTS.COMMON.AVAILABLE_ROOMS}?${query}`);
  },

  async updateScheduleSlot(id: number, dto: UpdateScheduleSlotDto): Promise<ApiResponse<any>> {
    return api.put<any>(ENDPOINTS.COMMON.UPDATE_SCHEDULE_SLOT(id), dto);
  },
};

export interface AvailableTeacherItem {
  id: number;
  code: string;
  name: string;
  dob?: string | null;
  gender?: boolean | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  status?: number;
  description?: string | null;
  gradeLevel?: number | null;
  gradeLevelName?: string | null;
  avatar?: string | null;
  certificates?: string[];
  hasAccount?: boolean;
}

export interface AvailableTeacherParams {
  courseId?: number | null;
  semesterId?: number | null;
  dayOfWeek?: number | null;
  slotIndex?: number | null;
  date?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  excludeScheduleId?: number | null;
  excludeClassId?: number | null;
  weeklySchedulesJson?: string | null;
}

export interface AvailableRoomParams {
  minCapacity?: number | null;
  classId?: number | null;
  date?: string | null;
  slotIndex?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  dayOfWeek?: number | null;
  excludeScheduleId?: number | null;
  excludeClassId?: number | null;
  weeklySchedulesJson?: string | null;
}

export interface UpdateScheduleSlotDto {
  roomId?: number | null;
  teacherId?: number | null;
  note?: string | null;
}


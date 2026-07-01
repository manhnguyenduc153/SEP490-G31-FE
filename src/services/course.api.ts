import { api, ApiResponse } from "./api";
import { ENDPOINTS } from "@/constants/endpoints";

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface CourseItem {
  id: number;
  code: string;
  name: string;
  status: number; // 0: Inactive, 1: Active
  duration?: number | null;
  price?: number | null;
  description?: string | null;
}

export interface CoursePagingResponse {
  pageIndex: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  items: CourseItem[];
}

export interface CourseSaveDto {
  id?: number;
  code: string;
  name: string;
  status: number;
  duration?: number | null;
  price?: number | null;
  description?: string | null;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const courseApi = {
  async getAll(
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
      `${ENDPOINTS.COURSE.GET_ALL}?${query}`
    );
  },

  async getById(id: number): Promise<ApiResponse<CourseItem>> {
    return api.get<CourseItem>(ENDPOINTS.COURSE.GET_BY_ID(id));
  },

  async create(dto: CourseSaveDto): Promise<ApiResponse<CourseItem>> {
    return api.post<CourseItem>(ENDPOINTS.COURSE.CREATE, dto);
  },

  async update(id: number, dto: CourseSaveDto): Promise<ApiResponse<CourseItem>> {
    return api.put<CourseItem>(ENDPOINTS.COURSE.UPDATE(id), dto);
  },

  async delete(id: number): Promise<ApiResponse<boolean>> {
    return api.delete<boolean>(ENDPOINTS.COURSE.DELETE(id));
  },

  async deactive(id: number): Promise<ApiResponse<boolean>> {
    return api.post<boolean>(ENDPOINTS.COURSE.DEACTIVE(id), {});
  },
};

import { api, ApiResponse } from "./api";
import { ENDPOINTS } from "@/constants/endpoints";

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface TeacherItem {
  id: number;
  code: string;
  name: string;
  dob?: string | null;
  gender?: boolean | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  status: number;
  description?: string | null;
  gradeLevel?: number | null;
  avatar?: string | null;
  certificate?: string | null;
}

export interface TeacherPagingResponse {
  pageIndex: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  items: TeacherItem[];
}

export interface TeacherSaveDto {
  id?: number;
  code: string;
  name: string;
  dob?: string | null;
  gender?: boolean | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  status: number;
  description?: string | null;
  gradeLevel?: number | null;
  avatar?: string | null;
  certificate?: string | null;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const teacherApi = {
  async getAll(
    pageIndex: number,
    pageSize: number,
    keyword: string = ""
  ): Promise<ApiResponse<TeacherPagingResponse>> {
    const query = new URLSearchParams({
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
      ...(keyword ? { keyword } : {}),
    }).toString();
    return api.get<TeacherPagingResponse>(
      `${ENDPOINTS.TEACHER.GET_ALL}?${query}`
    );
  },

  async getById(id: number): Promise<ApiResponse<TeacherItem>> {
    return api.get<TeacherItem>(ENDPOINTS.TEACHER.GET_BY_ID(id));
  },

  async create(dto: TeacherSaveDto): Promise<ApiResponse<TeacherItem>> {
    return api.post<TeacherItem>(ENDPOINTS.TEACHER.CREATE, dto);
  },

  async update(id: number, dto: TeacherSaveDto): Promise<ApiResponse<TeacherItem>> {
    return api.put<TeacherItem>(ENDPOINTS.TEACHER.UPDATE(id), dto);
  },

  async delete(id: number): Promise<ApiResponse<boolean>> {
    return api.delete<boolean>(ENDPOINTS.TEACHER.DELETE(id));
  },

  async deactive(id: number): Promise<ApiResponse<boolean>> {
    return api.post<boolean>(ENDPOINTS.TEACHER.DEACTIVE(id), {});
  },
};

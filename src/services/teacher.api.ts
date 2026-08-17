import { api, ApiResponse } from "./api";
import { ENDPOINTS } from "@/constants/endpoints";
import { ENV } from "@/config/env";

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
  gradeLevelName?: string | null;
  avatar?: string | null;
  certificates: string[];
  hasAccount?: boolean;
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
  certificates?: string[];
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const teacherApi = {
  async getAll(
    pageIndex: number,
    pageSize: number,
    keyword: string = "",
    teacherStatus: number | null = null,
    gender: boolean | null = null
  ): Promise<ApiResponse<TeacherPagingResponse>> {
    const query = new URLSearchParams({
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
      ...(keyword ? { keyword } : {}),
      ...(teacherStatus !== null ? { teacherStatus: String(teacherStatus) } : {}),
      ...(gender !== null ? { gender: String(gender) } : {}),
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

  async uploadFile(file: File): Promise<ApiResponse<string>> {
    const formData = new FormData();
    formData.append("file", file);
    
    const response = await fetch(`${ENV.API_BASE_URL}/api/upload/image`, {
      method: "POST",
      body: formData,
    });
    return response.json();
  },

  async uploadDocument(file: File): Promise<ApiResponse<string>> {
    const formData = new FormData();
    formData.append("file", file);
    
    const response = await fetch(`${ENV.API_BASE_URL}/api/upload/document`, {
      method: "POST",
      body: formData,
    });
    return response.json();
  },

  async import(dtos: TeacherSaveDto[]): Promise<ApiResponse<TeacherItem[]>> {
    return api.post<TeacherItem[]>("/api/Teacher/import", dtos);
  },

  async provisionAccounts(teacherIds: number[]): Promise<ApiResponse<boolean>> {
    return api.post<boolean>(ENDPOINTS.TEACHER.PROVISION_ACCOUNTS, teacherIds);
  },
};

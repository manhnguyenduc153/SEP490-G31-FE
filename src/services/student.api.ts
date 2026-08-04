import { api, ApiResponse } from "./api";
import { ENDPOINTS } from "@/constants/endpoints";
import { ENV } from "@/config/env";


// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface StudentItem {
  id: number;
  code: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  dob?: string | null;
  gender?: boolean | null;
  address?: string | null;
  status: number;
  statusName: string;
  description?: string | null;
  schoolName?: string | null;
  gradeLevel?: number | null;
  parentName?: string | null;
  parentPhone?: string | null;
  avatar?: string | null;
  hasAccount?: boolean;
}

export interface StudentPagingResponse {
  pageIndex: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  items: StudentItem[];
}

export interface StudentSaveDto {
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
  schoolName?: string | null;
  gradeLevel?: number | null;
  parentName?: string | null;
  parentPhone?: string | null;
  avatar?: string | null;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const studentApi = {
  async getAll(
    pageIndex: number,
    pageSize: number,
    keyword: string = "",
    studentStatus?: number | null,
    gradeLevel?: number | null,
    gender?: boolean | null
  ): Promise<ApiResponse<StudentPagingResponse>> {
    const params: Record<string, string> = {
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
    };
    if (keyword) params.keyword = keyword;
    if (studentStatus !== undefined && studentStatus !== null) {
      params.studentStatus = String(studentStatus);
    }
    if (gradeLevel !== undefined && gradeLevel !== null) {
      params.gradeLevel = String(gradeLevel);
    }
    if (gender !== undefined && gender !== null) {
      params.gender = String(gender);
    }

    const query = new URLSearchParams(params).toString();
    return api.get<StudentPagingResponse>(
      `${ENDPOINTS.STUDENT.GET_ALL}?${query}`
    );
  },

  async getById(id: number): Promise<ApiResponse<StudentItem>> {
    return api.get<StudentItem>(ENDPOINTS.STUDENT.GET_BY_ID(id));
  },

  async create(dto: StudentSaveDto): Promise<ApiResponse<StudentItem>> {
    return api.post<StudentItem>(ENDPOINTS.STUDENT.CREATE, dto);
  },

  async update(id: number, dto: StudentSaveDto): Promise<ApiResponse<StudentItem>> {
    return api.put<StudentItem>(ENDPOINTS.STUDENT.UPDATE(id), dto);
  },

  async delete(id: number): Promise<ApiResponse<boolean>> {
    return api.delete<boolean>(ENDPOINTS.STUDENT.DELETE(id));
  },

  async deactive(id: number): Promise<ApiResponse<boolean>> {
    return api.post<boolean>(ENDPOINTS.STUDENT.DEACTIVE(id), {});
  },

  async checkEmails(emails: string[]): Promise<ApiResponse<Record<string, number>>> {
    return api.post<Record<string, number>>("/api/Student/check-emails", emails);
  },

  async uploadFile(file: File): Promise<ApiResponse<string>> {
    const formData = new FormData();
    formData.append("file", file);
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const response = await fetch(`${ENV.API_BASE_URL}/api/upload/image`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    return response.json();
  },

  async import(dtos: StudentSaveDto[]): Promise<ApiResponse<StudentItem[]>> {
    return api.post<StudentItem[]>("/api/Student/import", dtos);
  },

  async provisionAccounts(studentIds: number[]): Promise<ApiResponse<boolean>> {
    return api.post<boolean>(ENDPOINTS.STUDENT.PROVISION_ACCOUNTS, studentIds);
  },
};

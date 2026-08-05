import { api, ApiResponse } from "./api";
import { ENV } from "@/config/env";
import { QuestionItem, QuestionSaveDto } from "./question.api";

export interface QuestionPassageItem {
  id: number;
  code: string;
  title: string;
  content?: string | null;
  audioUrl?: string | null;
  attachmentUrl?: string | null;
  skillType: number;
  skillTypeName?: string;
  categoryId?: number | null;
  categoryName?: string | null;
  questions?: QuestionItem[];
}

export interface QuestionPassagePagingResponse {
  pageIndex: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  items: QuestionPassageItem[];
}

export interface QuestionPassageSaveDto {
  id?: number;
  code?: string;
  title: string;
  content?: string | null;
  audioUrl?: string | null;
  attachmentUrl?: string | null;
  skillType: number;
  categoryId?: number | null;
  questions?: QuestionSaveDto[];
}

export const questionPassageApi = {
  async getAll(
    pageIndex: number,
    pageSize: number,
    keyword: string = "",
    skillType?: number,
    categoryId?: number
  ): Promise<ApiResponse<QuestionPassagePagingResponse>> {
    const query = new URLSearchParams({
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
      ...(keyword ? { keyword } : {}),
      ...(skillType ? { skillType: String(skillType) } : {}),
      ...(categoryId ? { categoryId: String(categoryId) } : {}),
    }).toString();
    return api.get<QuestionPassagePagingResponse>(
      `/api/QuestionPassage?${query}`
    );
  },

  async getById(id: number): Promise<ApiResponse<QuestionPassageItem>> {
    return api.get<QuestionPassageItem>(`/api/QuestionPassage/${id}`);
  },

  async create(
    dto: QuestionPassageSaveDto
  ): Promise<ApiResponse<QuestionPassageItem>> {
    return api.post<QuestionPassageItem>(`/api/QuestionPassage`, dto);
  },

  async update(
    id: number,
    dto: QuestionPassageSaveDto
  ): Promise<ApiResponse<QuestionPassageItem>> {
    return api.put<QuestionPassageItem>(`/api/QuestionPassage/${id}`, dto);
  },

  async delete(id: number): Promise<ApiResponse<boolean>> {
    return api.delete<boolean>(`/api/QuestionPassage/${id}`);
  },

  async uploadFile(file: File): Promise<ApiResponse<string>> {
    const formData = new FormData();
    formData.append("file", file);
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const response = await fetch(`${ENV.API_BASE_URL}/api/upload/document`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    return response.json();
  },

  async uploadImage(file: File): Promise<ApiResponse<string>> {
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
};

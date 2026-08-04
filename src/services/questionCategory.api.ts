import { api, ApiResponse } from "./api";
import { ENDPOINTS } from "@/constants/endpoints";

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface QuestionCategoryItem {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  courseId?: number | null;
  courseName?: string | null;
  courseCode?: string | null;
}

export interface QuestionCategoryPagingResponse {
  pageIndex: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  items: QuestionCategoryItem[];
}

export interface QuestionCategorySaveDto {
  id?: number;
  code: string;
  name: string;
  description?: string | null;
  courseId?: number | null;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const questionCategoryApi = {
  async getAll(
    pageIndex: number,
    pageSize: number,
    keyword: string = "",
    courseId?: number
  ): Promise<ApiResponse<QuestionCategoryPagingResponse>> {
    const query = new URLSearchParams({
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
      ...(keyword ? { keyword } : {}),
      ...(courseId ? { courseId: String(courseId) } : {}),
    }).toString();
    return api.get<QuestionCategoryPagingResponse>(
      `${ENDPOINTS.QUESTION_CATEGORY.GET_ALL}?${query}`
    );
  },

  async getById(id: number): Promise<ApiResponse<QuestionCategoryItem>> {
    return api.get<QuestionCategoryItem>(ENDPOINTS.QUESTION_CATEGORY.GET_BY_ID(id));
  },

  async create(
    dto: QuestionCategorySaveDto
  ): Promise<ApiResponse<QuestionCategoryItem>> {
    return api.post<QuestionCategoryItem>(ENDPOINTS.QUESTION_CATEGORY.CREATE, dto);
  },

  async update(
    id: number,
    dto: QuestionCategorySaveDto
  ): Promise<ApiResponse<QuestionCategoryItem>> {
    return api.put<QuestionCategoryItem>(ENDPOINTS.QUESTION_CATEGORY.UPDATE(id), dto);
  },

  async delete(id: number): Promise<ApiResponse<boolean>> {
    return api.delete<boolean>(ENDPOINTS.QUESTION_CATEGORY.DELETE(id));
  },

  async deactive(id: number): Promise<ApiResponse<boolean>> {
    return api.post<boolean>(ENDPOINTS.QUESTION_CATEGORY.DEACTIVE(id), {});
  },
};

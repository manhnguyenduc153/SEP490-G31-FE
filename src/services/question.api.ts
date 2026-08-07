import { api, ApiResponse } from "./api";
import { ENDPOINTS } from "@/constants/endpoints";
import type { QuestionPassageItem } from "./questionPassage.api";

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface QuestionAnswerDto {
  id?: number;
  content: string;
  isCorrect: boolean;
}

export interface QuestionItem {
  id: number;
  code: string;
  name: string; // Title
  content: string;
  questionType: number;
  questionTypeName: string;
  skillType?: number;
  skillTypeName?: string;
  difficultyLevel: number;
  difficultyLevelName: string;
  explanation?: string | null;
  mediaUrl?: string | null;
  status: number;
  categoryId?: number | null;
  categoryName?: string | null;
  passageId?: number | null;
  // Read-only passage/prompt/recording snapshot embedded by the exam student-detail endpoint,
  // so exam takers can see it without needing the admin-only QuestionPassage.View permission.
  passage?: QuestionPassageItem | null;
  point?: number | null;
  createdAt: string;
  createdBy?: string | null;
  questionAnswers: QuestionAnswerDto[];
  answers?: QuestionAnswerDto[];
}

export interface QuestionPagingResponse {
  pageIndex: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  items: QuestionItem[];
}

export interface QuestionSaveDto {
  id?: number;
  code?: string;
  name?: string; // Title
  content: string;
  questionType: number;
  skillType?: number;
  difficultyLevel: number;
  explanation?: string | null;
  mediaUrl?: string | null;
  categoryId?: number | null;
  point?: number | null;
  questionAnswers?: QuestionAnswerDto[];
  answers?: QuestionAnswerDto[];
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const questionApi = {
  async getAll(
    pageIndex: number,
    pageSize: number,
    params: {
      keyword?: string;
      categoryId?: number;
      difficultyLevel?: number;
      questionType?: number;
      skillType?: number;
    } = {}
  ): Promise<ApiResponse<QuestionPagingResponse>> {
    const queryParams: Record<string, string> = {
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
    };

    if (params.keyword) queryParams.keyword = params.keyword;
    if (params.categoryId) queryParams.categoryId = String(params.categoryId);
    if (params.difficultyLevel) queryParams.difficultyLevel = String(params.difficultyLevel);
    if (params.questionType) queryParams.questionType = String(params.questionType);
    if (params.skillType) queryParams.skillType = String(params.skillType);

    const query = new URLSearchParams(queryParams).toString();
    return api.get<QuestionPagingResponse>(
      `${ENDPOINTS.QUESTION.GET_ALL}?${query}`
    );
  },

  async getById(id: number): Promise<ApiResponse<QuestionItem>> {
    return api.get<QuestionItem>(ENDPOINTS.QUESTION.GET_BY_ID(id));
  },

  async create(dto: QuestionSaveDto): Promise<ApiResponse<QuestionItem>> {
    return api.post<QuestionItem>(ENDPOINTS.QUESTION.CREATE, dto);
  },

  async update(id: number, dto: QuestionSaveDto): Promise<ApiResponse<QuestionItem>> {
    return api.put<QuestionItem>(ENDPOINTS.QUESTION.UPDATE(id), dto);
  },

  async delete(id: number): Promise<ApiResponse<boolean>> {
    return api.delete<boolean>(ENDPOINTS.QUESTION.DELETE(id));
  },

  async deactive(id: number): Promise<ApiResponse<boolean>> {
    return api.post<boolean>(ENDPOINTS.QUESTION.DEACTIVE(id), {});
  },

  async import(dtos: QuestionSaveDto[]): Promise<ApiResponse<QuestionItem[]>> {
    return api.post<QuestionItem[]>("/api/Question/import", dtos);
  },
};

import { api, ApiResponse } from "./api";
import { ENDPOINTS } from "@/constants/endpoints";
import { SemesterItem } from "./semester.api";
import { CoursePagingResponse } from "./course.api";
import { ClassPagingResponse } from "./class.api";
import { QuestionCategoryPagingResponse } from "./questionCategory.api";

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
};

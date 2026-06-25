import { api, ApiResponse } from "./api";
import { ENDPOINTS } from "@/constants/endpoints";

export interface StudentItem {
  id: number;
  code: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface StudentPagingResponse {
  pageIndex: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  items: StudentItem[];
}

export const studentApi = {
  async getAll(
    pageIndex: number,
    pageSize: number,
    keyword: string = ""
  ): Promise<ApiResponse<StudentPagingResponse>> {
    const params: Record<string, string> = {
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
    };
    if (keyword) params.keyword = keyword;

    const query = new URLSearchParams(params).toString();
    return api.get<StudentPagingResponse>(`${ENDPOINTS.STUDENT.GET_ALL}?${query}`);
  },
};

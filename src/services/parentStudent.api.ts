import { api, ApiResponse } from "./api";
import { ENDPOINTS } from "@/constants/endpoints";

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface ChildItem {
  studentId: number;
  studentName?: string | null;
  relationship?: string | null;
}

export interface ParentStudentItem {
  id: number;
  code: string;
  name: string;          // Tên phụ huynh
  parentPhone?: string | null;
  email?: string | null;
  relationship?: string | null; // Mối quan hệ chung của phụ huynh
  status: number;
  userId?: string | null;
  createdAt?: string | null;
  createdBy?: string | null;
  children: ChildItem[];
}

export interface ParentStudentPagingResponse {
  pageIndex: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  items: ParentStudentItem[];
}

export interface ParentStudentSaveDto {
  id?: number;
  code?: string;
  name: string;
  parentPhone?: string | null;
  email: string;
  relationship?: string | null; // Mối quan hệ chung của phụ huynh
  status?: number;
  studentIds: number[];
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const parentStudentApi = {
  /**
   * Lấy danh sách phụ huynh (có thể lọc theo studentId)
   */
  async getAll(
    pageIndex: number,
    pageSize: number,
    keyword: string = "",
    studentId?: number | null,
    status?: boolean | null
  ): Promise<ApiResponse<ParentStudentPagingResponse>> {
    const params: Record<string, string> = {
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
    };
    if (keyword) params.keyword = keyword;
    if (studentId != null) params.studentId = String(studentId);
    if (status != null) params.status = String(status);

    const query = new URLSearchParams(params).toString();
    return api.get<ParentStudentPagingResponse>(
      `${ENDPOINTS.PARENT_STUDENT.GET_ALL}?${query}`
    );
  },

  async getById(id: number): Promise<ApiResponse<ParentStudentItem>> {
    return api.get<ParentStudentItem>(ENDPOINTS.PARENT_STUDENT.GET_BY_ID(id));
  },

  /**
   * Tạo phụ huynh mới → backend tự động tạo IdentityUser với role "Parent"
   * Password mặc định: 123456
   */
  async create(
    dto: ParentStudentSaveDto
  ): Promise<ApiResponse<ParentStudentItem>> {
    return api.post<ParentStudentItem>(ENDPOINTS.PARENT_STUDENT.CREATE, dto);
  },

  async update(
    id: number,
    dto: ParentStudentSaveDto
  ): Promise<ApiResponse<ParentStudentItem>> {
    return api.put<ParentStudentItem>(ENDPOINTS.PARENT_STUDENT.UPDATE(id), dto);
  },

  /**
   * Xóa mềm phụ huynh + lock tài khoản IdentityUser tương ứng
   */
  async delete(id: number): Promise<ApiResponse<boolean>> {
    return api.delete<boolean>(ENDPOINTS.PARENT_STUDENT.DELETE(id));
  },

  async deactive(id: number): Promise<ApiResponse<boolean>> {
    return api.post<boolean>(ENDPOINTS.PARENT_STUDENT.DEACTIVE(id), {});
  },
};

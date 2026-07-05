import { api, ApiResponse } from "./api";
import { ENDPOINTS } from "@/constants/endpoints";

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface LearningMaterialItem {
  id: number;
  code: string;
  name: string;
  classId?: number | null;
  className?: string | null;
  scheduleId?: number | null;
  scheduleName?: string | null;
  uploadedBy?: number | null;
  teacherName?: string | null;
  courseId?: number | null;
  courseName?: string | null;
  title?: string | null;
  description?: string | null;
  fileUrl?: string | null;
  fileType?: string | null;
  status: number;
  createdAt: string;
  createdBy?: string | null;
}

export interface LearningMaterialPagingResponse {
  pageIndex: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  items: LearningMaterialItem[];
}

export interface LearningMaterialSaveDto {
  id?: number;
  code: string;
  name: string;
  classId?: number | null;
  scheduleId?: number | null;
  courseId?: number | null;
  title?: string | null;
  description?: string | null;
  fileUrl?: string | null;
  fileType?: string | null;
  status: number;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const learningMaterialApi = {
  async getAll(
    pageIndex: number,
    pageSize: number,
    keyword: string = "",
    classId?: number | null,
    courseId?: number | null,
    scheduleId?: number | null,
    uploadedBy?: number | null
  ): Promise<ApiResponse<LearningMaterialPagingResponse>> {
    const params: Record<string, string> = {
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
    };

    if (keyword) params.keyword = keyword;
    if (classId) params.classId = String(classId);
    if (courseId) params.courseId = String(courseId);
    if (scheduleId) params.scheduleId = String(scheduleId);
    if (uploadedBy) params.uploadedBy = String(uploadedBy);

    const query = new URLSearchParams(params).toString();
    return api.get<LearningMaterialPagingResponse>(
      `${ENDPOINTS.LEARNING_MATERIAL.GET_ALL}?${query}`
    );
  },

  async getById(id: number): Promise<ApiResponse<LearningMaterialItem>> {
    return api.get<LearningMaterialItem>(ENDPOINTS.LEARNING_MATERIAL.GET_BY_ID(id));
  },

  async create(dto: LearningMaterialSaveDto): Promise<ApiResponse<LearningMaterialItem>> {
    return api.post<LearningMaterialItem>(ENDPOINTS.LEARNING_MATERIAL.CREATE, dto);
  },

  async update(id: number, dto: LearningMaterialSaveDto): Promise<ApiResponse<LearningMaterialItem>> {
    return api.put<LearningMaterialItem>(ENDPOINTS.LEARNING_MATERIAL.UPDATE(id), dto);
  },

  async delete(id: number): Promise<ApiResponse<boolean>> {
    return api.delete<boolean>(ENDPOINTS.LEARNING_MATERIAL.DELETE(id));
  },

  async deactive(id: number): Promise<ApiResponse<boolean>> {
    return api.post<boolean>(ENDPOINTS.LEARNING_MATERIAL.DEACTIVE(id), {});
  },
};

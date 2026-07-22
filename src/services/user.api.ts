import { api, ApiResponse } from "./api";
import { ENDPOINTS } from "@/constants/endpoints";

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface UserItem {
  id: string;
  username: string;
  email: string;
  phone: string;
  roles: string[];
  status: number; // 1: Active, 0: Inactive
}

export interface UserPagingResponse {
  pageIndex: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  items: UserItem[];
}

export interface UserCreateDto {
  username: string;
  email: string;
  phone: string;
  roleName: string;
}

export interface UserUpdateDto {
  id: string;
  email: string;
  phone: string;
  roleName?: string;
}

export const userApi = {
  async getProfile() {
    return api.get<UserProfile>(ENDPOINTS.USER.PROFILE);
  },

  async getAll(
    pageIndex: number,
    pageSize: number,
    keyword: string = "",
    roleName: string = ""
  ): Promise<ApiResponse<UserPagingResponse>> {
    const params: Record<string, string> = {
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
    };
    if (keyword) params.keyword = keyword;
    if (roleName && roleName !== "all") params.roleName = roleName;

    const query = new URLSearchParams(params).toString();
    return api.get<UserPagingResponse>(`${ENDPOINTS.USER.GET_ALL}?${query}`);
  },

  async getById(id: string): Promise<ApiResponse<UserItem>> {
    return api.get<UserItem>(ENDPOINTS.USER.GET_BY_ID(id));
  },

  async create(dto: UserCreateDto): Promise<ApiResponse<UserItem>> {
    return api.post<UserItem>(ENDPOINTS.USER.CREATE, dto);
  },

  async update(id: string, dto: UserUpdateDto): Promise<ApiResponse<UserItem>> {
    return api.put<UserItem>(ENDPOINTS.USER.UPDATE(id), dto);
  },

  async delete(id: string): Promise<ApiResponse<boolean>> {
    return api.delete<boolean>(ENDPOINTS.USER.DELETE(id));
  },

  async deactive(id: string): Promise<ApiResponse<boolean>> {
    return api.post<boolean>(ENDPOINTS.USER.DEACTIVE(id), {});
  },
};

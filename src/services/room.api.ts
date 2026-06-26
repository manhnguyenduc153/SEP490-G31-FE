import { api, ApiResponse } from "./api";
import { ENDPOINTS } from "@/constants/endpoints";

export interface RoomItem {
  id: number;
  code: string;
  name: string;
  capacity?: number | null;
  status?: number;
}

export interface RoomPagingResponse {
  pageIndex: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  items: RoomItem[];
}

export const roomApi = {
  async getAll(
    pageIndex: number,
    pageSize: number,
    keyword: string = ""
  ): Promise<ApiResponse<RoomPagingResponse>> {
    const params: Record<string, string> = {
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
    };
    if (keyword) params.keyword = keyword;

    const query = new URLSearchParams(params).toString();
    return api.get<RoomPagingResponse>(`${ENDPOINTS.ROOM.GET_ALL}?${query}`);
  },
};

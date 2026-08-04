import { api, ApiResponse } from "./api";
import { ENDPOINTS } from "@/constants/endpoints";
import { ENV } from "@/config/env";

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum RoomType {
  Theory = 1,
  Practice = 2,
}

export enum RoomStatus {
  Active = 1,
  Inactive = 2,
  Maintenance = 3,
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface RoomItem {
  id: number;
  code: string;
  name: string;
  capacity?: number | null;
  status: number;
  statusName?: string | null;
  building?: string | null;
  floor?: string | null;
}

export interface RoomPagingResponse {
  pageIndex: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  items: RoomItem[];
}

export interface RoomSaveDto {
  id?: number;
  code: string;
  name: string;
  capacity?: number | null;
  status: number;
  building?: string | null;
  floor?: string | null;
}

export interface RoomStatsDto {
  totalRooms: number;
  availableRooms: number;
  inUseRooms: number;
  maintenanceRooms: number;
}

export interface RoomScheduleItem {
  scheduleId: number;
  scheduleType: string;
  className?: string | null;
  slotName?: string | null;
  slotTime?: string | null;
  scheduleDate?: string | null;
  status: number;
  statusName?: string | null;
  note?: string | null;
}

export interface RoomSchedulePagingResponse {
  pageIndex: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  items: RoomScheduleItem[];
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const roomApi = {
  async getAll(
    pageIndex: number,
    pageSize: number,
    keyword: string = "",
    status?: boolean | null,
    building?: string | null,
    minCapacity?: number | null
  ): Promise<ApiResponse<RoomPagingResponse>> {
    const params: Record<string, string> = {
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
    };
    if (keyword) params.keyword = keyword;
    if (status !== undefined && status !== null) params.status = String(status);
    if (building) params.building = building;
    if (minCapacity != null) params.minCapacity = String(minCapacity);

    const query = new URLSearchParams(params).toString();
    return api.get<RoomPagingResponse>(`${ENDPOINTS.ROOM.GET_ALL}?${query}`);
  },

  async getById(id: number): Promise<ApiResponse<RoomItem>> {
    return api.get<RoomItem>(ENDPOINTS.ROOM.GET_BY_ID(id));
  },

  async getStats(): Promise<ApiResponse<RoomStatsDto>> {
    return api.get<RoomStatsDto>(ENDPOINTS.ROOM.GET_STATS);
  },

  async getSchedule(
    roomId: number,
    pageIndex: number,
    pageSize: number
  ): Promise<ApiResponse<RoomSchedulePagingResponse>> {
    const query = new URLSearchParams({
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
    }).toString();
    return api.get<RoomSchedulePagingResponse>(
      `${ENDPOINTS.ROOM.GET_SCHEDULE(roomId)}?${query}`
    );
  },

  async create(dto: RoomSaveDto): Promise<ApiResponse<RoomItem>> {
    return api.post<RoomItem>(ENDPOINTS.ROOM.CREATE, dto);
  },

  async update(id: number, dto: RoomSaveDto): Promise<ApiResponse<RoomItem>> {
    return api.put<RoomItem>(ENDPOINTS.ROOM.UPDATE(id), dto);
  },

  async delete(id: number): Promise<ApiResponse<boolean>> {
    return api.delete<boolean>(ENDPOINTS.ROOM.DELETE(id));
  },

  async deactive(id: number): Promise<ApiResponse<boolean>> {
    return api.post<boolean>(ENDPOINTS.ROOM.DEACTIVE(id), {});
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

import { api } from "./api";

export interface NotificationDto {
  id: number;
  title: string;
  content: string;
  status: number; // 0 = Unread, 1 = Read
  classId?: number;
  targetType?: number;
  targetId?: number;
  sentBy?: number;
  sentAt: string;
  code?: string;
  name?: string;
}

export const notificationApi = {
  async getMyNotifications() {
    const res = await api.get<NotificationDto[]>("/api/Notification");
    return res;
  },

  async markAsRead(id: number) {
    const res = await api.post<boolean>(`/api/Notification/${id}/read`, {});
    return res;
  },

  async markAllAsRead() {
    const res = await api.post<boolean>("/api/Notification/mark-all-read", {});
    return res;
  }
};

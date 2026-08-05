"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as signalR from "@microsoft/signalr";
import { ENV } from "@/config/env";
import { notificationApi, NotificationDto } from "@/services/notification.api";
import { usePathname } from "next/navigation";

interface NotificationContextProps {
  notifications: NotificationDto[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const pathname = usePathname();

  const unreadCount = notifications.filter((n) => n.status === 0).length;

  const refreshNotifications = async () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    if (!token) {
      setNotifications([]);
      return;
    }

    // Don't fetch notifications if on auth pages
    const path = window.location.pathname;
    if (path.includes("/signin") || path.includes("/signup") || path.includes("/reset-password")) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      const res = await notificationApi.getMyNotifications();
      if (res.success && Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch {
      // Silently ignore - token may be invalid/expired
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: 1 } : n))
    );
    try {
      await notificationApi.markAsRead(id);
    } catch (err) {
      console.error(`Failed to mark notification ${id} as read:`, err);
      // Revert if failed
      refreshNotifications();
    }
  };

  const markAllAsRead = async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, status: 1 })));
    try {
      await notificationApi.markAllAsRead();
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      refreshNotifications();
    } finally {
      setLoading(false);
    }
  };

  const [tokenState, setTokenState] = useState<string | null>(null);

  // Sync token from localStorage on mount and pathname changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentToken = localStorage.getItem("token");
      if (currentToken !== tokenState) {
        setTokenState(currentToken);
      }
    }
  }, [pathname, tokenState]);

  // 1. Initial Load and Poll/Setup on token change
  useEffect(() => {
    refreshNotifications();
  }, [tokenState]);

  // 2. Setup SignalR Connection
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Don't connect on auth pages
    const path = window.location.pathname;
    if (path.includes("/signin") || path.includes("/signup") || path.includes("/reset-password")) {
      return;
    }

    if (!tokenState) {
      if (connection) {
        connection.stop();
        setConnection(null);
      }
      return;
    }

    // Đi qua rewrite proxy của Vercel: /hubs/* → EC2 backend /hubs/*
    // (Tránh dùng EC2 IP trực tiếp để không bị chặn bởi tường lửa mạng trường)
    const hubUrl = `/hubs/notification?access_token=${tokenState}`;

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        // Vercel Serverless không hỗ trợ WebSockets, vì vậy ta bắt buộc dùng LongPolling (và ServerSentEvents nếu proxy hỗ trợ)
        // Các transport này hoạt động qua các HTTP request thông thường nên đi qua Reverse Proxy của Vercel bình thường.
        transport:
          signalR.HttpTransportType.ServerSentEvents |
          signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .build();

    newConnection.on("ReceiveNotification", (notification: any) => {
      // Convert to NotificationDto structure
      const newNotif: NotificationDto = {
        id: notification.id,
        title: notification.title,
        content: notification.content,
        status: notification.status ?? 0,
        classId: notification.classId,
        sentAt: notification.sentAt || new Date().toISOString(),
      };

      setNotifications((prev) => [newNotif, ...prev]);

      // Play audio notification or show browser notification if allowed
      if (Notification.permission === "granted") {
        new Notification(newNotif.title, { body: newNotif.content });
      }
    });

    newConnection
      .start()
      .then(() => {
        setConnection(newConnection);
      })
      .catch(() => {
        // Silently ignore - token may be invalid
      });

    // Request browser notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      newConnection.stop();
    };
  }, [tokenState]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
};

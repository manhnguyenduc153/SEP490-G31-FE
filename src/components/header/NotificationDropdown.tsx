"use client";
import React, { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { useNotification } from "@/context/NotificationContext";
import { useTranslation } from "react-i18next";
import { getLocalizedNotification } from "@/utils/notificationHelper";
import Badge from "../ui/badge/Badge";

export default function NotificationDropdown() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();

  const getStatusBadge = (status: string) => {
    const low = status.toLowerCase();
    let color: "warning" | "success" | "info" | "error" | "light" = "light";
    let label = status;

    if (low.includes("planning") || low.includes("sắp mở")) {
      color = "warning";
      label = t("class.statusPlanning", { defaultValue: "Sắp mở" });
    } else if (low.includes("active") || low.includes("đang diễn ra")) {
      color = "success";
      label = t("class.statusActive", { defaultValue: "Đang diễn ra" });
    } else if (low.includes("completed") || low.includes("hoàn thành")) {
      color = "info";
      label = t("class.statusCompleted", { defaultValue: "Hoàn thành" });
    } else if (low.includes("cancelled") || low.includes("đã hủy")) {
      color = "error";
      label = t("class.statusCancelled", { defaultValue: "Đã hủy" });
    }

    return (
      <span className="inline-flex mx-1 align-middle">
        <Badge color={color} size="sm">{label}</Badge>
      </span>
    );
  };

  const getStatusText = (status: string) => {
    const low = status.toLowerCase();
    if (low.includes("planning") || low.includes("sắp mở")) return t("class.statusPlanning", { defaultValue: "Sắp mở" });
    if (low.includes("active") || low.includes("đang diễn ra")) return t("class.statusActive", { defaultValue: "Đang diễn ra" });
    if (low.includes("completed") || low.includes("hoàn thành")) return t("class.statusCompleted", { defaultValue: "Hoàn thành" });
    if (low.includes("cancelled") || low.includes("đã hủy")) return t("class.statusCancelled", { defaultValue: "Đã hủy" });
    return status;
  };

  const renderNotificationContent = (rawContent: string, localizedFallback: string) => {
    const isEn = i18n.language === "en";

    // 1. Class Status Changed
    const matchStatus = 
      rawContent.match(/Lớp học (.*?) \(([^)]+)\) đã đổi trạng thái từ '?(.*?)'? sang '?(.*?)'?\./i) ||
      rawContent.match(/Lớp học (.*?) ([\w-]+) đã đổi trạng thái từ '?(.*?)'? sang '?(.*?)'?\./i);

    if (matchStatus) {
      const className = matchStatus[1];
      const classCode = matchStatus[2];
      const oldStatus = matchStatus[3];
      const newStatus = matchStatus[4];

      if (isEn) {
        return (
          <span>
            Class <span className="font-semibold text-gray-700 dark:text-gray-300">{className} {classCode}</span> status changed from {getStatusBadge(oldStatus)} to {getStatusBadge(newStatus)}.
          </span>
        );
      } else {
        return (
          <span>
            Lớp học <span className="font-semibold text-gray-700 dark:text-gray-300">{className} {classCode}</span> đã đổi trạng thái từ {getStatusBadge(oldStatus)} sang {getStatusBadge(newStatus)}.
          </span>
        );
      }
    }

    // 1.5 Upcoming Class
    const matchScheduled = 
      rawContent.match(/Lớp (.*?) \(([^)]+)\) đã được lên lịch\./i) ||
      rawContent.match(/Lớp (.*?) ([\w-]+) đã được lên lịch\./i);

    if (matchScheduled) {
      const className = matchScheduled[1];
      const classCode = matchScheduled[2];

      if (isEn) {
        return (
          <span>
            Class <span className="font-semibold text-gray-700 dark:text-gray-300">{className} {classCode}</span> has been scheduled.
          </span>
        );
      } else {
        return (
          <span>
            Lớp <span className="font-semibold text-gray-700 dark:text-gray-300">{className} {classCode}</span> đã được lên lịch.
          </span>
        );
      }
    }

    // 2. Class Created
    const matchCreated = 
      rawContent.match(/Lớp học (.*?) \(([^)]+)\) đã được tạo mới\./i) ||
      rawContent.match(/Lớp học (.*?) ([\w-]+) đã được tạo mới\./i);

    if (matchCreated) {
      const className = matchCreated[1];
      const classCode = matchCreated[2];

      if (isEn) {
        return (
          <span>
            Class <span className="font-semibold text-gray-700 dark:text-gray-300">{className} {classCode}</span> has been created.
          </span>
        );
      } else {
        return (
          <span>
            Lớp học <span className="font-semibold text-gray-700 dark:text-gray-300">{className} {classCode}</span> đã được tạo mới.
          </span>
        );
      }
    }

    // 3. Students Added
    const matchStudent = 
      rawContent.match(/Bạn đã được đăng ký vào lớp học (.*?) \(([^)]+)\)\./i) ||
      rawContent.match(/Bạn đã được đăng ký vào lớp học (.*?) ([\w-]+)\./i);

    if (matchStudent) {
      const className = matchStudent[1];
      const classCode = matchStudent[2];

      if (isEn) {
        return (
          <span>
            You have been registered into class <span className="font-semibold text-gray-700 dark:text-gray-300">{className} {classCode}</span>.
          </span>
        );
      } else {
        return (
          <span>
            Bạn đã được đăng ký vào lớp học <span className="font-semibold text-gray-700 dark:text-gray-300">{className} {classCode}</span>.
          </span>
        );
      }
    }

    // 4. Teacher Assigned
    const matchTeacher = 
      rawContent.match(/Bạn đã được phân công giảng dạy lớp học (.*?) \(([^)]+)\)\./i) ||
      rawContent.match(/Bạn đã được phân công giảng dạy lớp học (.*?) ([\w-]+)\./i);

    if (matchTeacher) {
      const className = matchTeacher[1];
      const classCode = matchTeacher[2];

      if (isEn) {
        return (
          <span>
            You have been assigned to teach class <span className="font-semibold text-gray-700 dark:text-gray-300">{className} {classCode}</span>.
          </span>
        );
      } else {
        return (
          <span>
            Bạn đã được phân công giảng dạy lớp học <span className="font-semibold text-gray-700 dark:text-gray-300">{className} {classCode}</span>.
          </span>
        );
      }
    }

    // 5. Exam Created
    const matchExam = rawContent.match(/Bạn có bài kiểm tra mới: '?(.*?)'? trong lớp (.*?)\./i);
    if (matchExam) {
      const examTitle = matchExam[1];
      const className = matchExam[2];

      if (isEn) {
        return (
          <span>
            You have a new exam: <span className="font-semibold text-gray-700 dark:text-gray-300">'{examTitle}'</span> in class <span className="font-semibold text-gray-700 dark:text-gray-300">{className}</span>.
          </span>
        );
      } else {
        return (
          <span>
            Bạn có bài kiểm tra mới: <span className="font-semibold text-gray-700 dark:text-gray-300">'{examTitle}'</span> trong lớp <span className="font-semibold text-gray-700 dark:text-gray-300">{className}</span>.
          </span>
        );
      }
    }

    // 6. Homework Created
    const matchHomework = rawContent.match(/Bạn có bài tập về nhà mới: '?(.*?)'? trong lớp (.*?)\./i);
    if (matchHomework) {
      const homeworkTitle = matchHomework[1];
      const className = matchHomework[2];

      if (isEn) {
        return (
          <span>
            You have a new homework assignment: <span className="font-semibold text-gray-700 dark:text-gray-300">'{homeworkTitle}'</span> in class <span className="font-semibold text-gray-700 dark:text-gray-300">{className}</span>.
          </span>
        );
      } else {
        return (
          <span>
            Bạn có bài tập về nhà mới: <span className="font-semibold text-gray-700 dark:text-gray-300">'{homeworkTitle}'</span> trong lớp <span className="font-semibold text-gray-700 dark:text-gray-300">{className}</span>.
          </span>
        );
      }
    }

    return localizedFallback;
  };

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleClick = () => {
    toggleDropdown();
  };

  const timeAgo = (dateString: string) => {
    // Ensure the date is parsed as UTC by appending 'Z' if missing
    const utcString = dateString.endsWith("Z") || dateString.includes("+") ? dateString : dateString + "Z";
    const diffMs = new Date().getTime() - new Date(utcString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày trước`;
  };

  return (
    <div className="relative">
      <button
        className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={handleClick}
      >
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0.5 z-10 h-4.5 w-4.5 flex items-center justify-center rounded-full bg-error-500 text-[10px] font-bold text-white border border-white dark:border-gray-900">
            {unreadCount}
          </span>
        )}
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {t("notification.dropdownTitle", { defaultValue: "Thông báo" })} ({unreadCount})
          </h5>
          <button
            onClick={toggleDropdown}
            className="text-gray-500 transition dropdown-toggle dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg
              className="fill-current"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar grow">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mb-2 text-gray-400"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="text-sm">{t("notification.noNotifications", { defaultValue: "Không có thông báo nào" })}</span>
            </div>
          ) : (
            notifications.map((notif) => {
              const { title, content } = getLocalizedNotification(notif.title, notif.content, t);
              return (
                <li
                  key={notif.id}
                  className={`transition-colors ${
                    notif.status === 0
                      ? "bg-blue-50/50 dark:bg-white/[0.02]"
                      : "hover:bg-gray-50 dark:hover:bg-white/[0.01]"
                  }`}
                >
                  <DropdownItem
                    onItemClick={async () => {
                      if (notif.status === 0) {
                        await markAsRead(notif.id);
                      }
                      closeDropdown();
                    }}
                    className="flex gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 dark:border-gray-800"
                  >
                    <span className="relative flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 z-1 max-w-10 shrink-0">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                      {notif.status === 0 && (
                        <span className="absolute bottom-0 right-0 z-10 h-2.5 w-2.5 rounded-full border-[1.5px] border-white bg-blue-500 dark:border-gray-900 animate-pulse"></span>
                      )}
                    </span>

                    <span className="block text-left w-full">
                      <span className={`block mb-0.5 text-theme-sm text-gray-800 dark:text-white/90 ${notif.status === 0 ? "font-bold" : "font-medium"}`}>
                        {title}
                      </span>
                      <span className="block mb-1.5 text-theme-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        {renderNotificationContent(notif.content || "", content)}
                      </span>

                      <span className="flex items-center gap-1.5 text-gray-500 text-[10px] dark:text-gray-400">
                        <span>{t("notification.system", { defaultValue: "Hệ thống" })}</span>
                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        <span>{timeAgo(notif.sentAt)}</span>
                      </span>
                    </span>
                  </DropdownItem>
                </li>
              );
            })
          )}
        </ul>
        {unreadCount > 0 && (
          <button
            onClick={async () => {
              await markAllAsRead();
            }}
            className="block w-full px-4 py-2 mt-3 text-sm font-medium text-center text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
          >
            {t("notification.markAllAsRead", { defaultValue: "Đánh dấu tất cả đã đọc" })}
          </button>
        )}
      </Dropdown>
    </div>
  );
}

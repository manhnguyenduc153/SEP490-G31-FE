"use client";

import React from "react";
import { Info, CalendarRange } from "lucide-react";

interface ClassDetailInfoTabProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itemDetail: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parsedSchedules: any[];
  getRoomName: (roomId: number | null) => string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Thứ 2" },
  { value: 2, label: "Thứ 3" },
  { value: 3, label: "Thứ 4" },
  { value: 4, label: "Thứ 5" },
  { value: 5, label: "Thứ 6" },
  { value: 6, label: "Thứ 7" },
  { value: 0, label: "Chủ Nhật" },
];

export default function ClassDetailInfoTab({
  itemDetail,
  parsedSchedules,
  getRoomName,
  t,
}: ClassDetailInfoTabProps) {
  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return t("class.statusPlanning", { defaultValue: "Sắp mở" });
      case 1: return t("class.statusActive", { defaultValue: "Đang diễn ra" });
      case 2: return t("class.statusCompleted", { defaultValue: "Đã hoàn thành" });
      case 3: return t("class.statusCancelled", { defaultValue: "Đã hủy" });
      default: return "";
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-500 border border-amber-200/50 dark:border-amber-500/20";
      case 1: return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500 border border-emerald-200/50 dark:border-emerald-500/20";
      case 2: return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-500 border border-blue-200/50 dark:border-blue-500/20";
      case 3: return "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-500 border border-rose-200/50 dark:border-rose-500/20";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch animate-fadeIn">
      {/* General info (8 cols) */}
      <div className="lg:col-span-8">
        <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-5 h-full">
          <h3 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-50 dark:border-gray-800/80 pb-3">
            <Info className="w-4.5 h-4.5 text-brand-500" />
            {t("class.generalInfo", { defaultValue: "Thông tin chung" })}
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
            <div>
              <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                {t("class.colCode")}
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5 block">
                {itemDetail.code}
              </span>
            </div>

            <div>
              <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                {t("class.formStatusLabel")}
              </span>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(itemDetail.status)}`}>
                  {getStatusText(itemDetail.status)}
                </span>
              </div>
            </div>

            <div>
              <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                {t("class.colType", { defaultValue: "Loại lớp" })}
              </span>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                  itemDetail.type === 1
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500 border border-emerald-200/50 dark:border-emerald-500/20"
                    : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-500 border border-blue-200/50 dark:border-blue-500/20"
                }`}>
                  {itemDetail.type === 1 ? "Online" : "Offline"}
                </span>
              </div>
            </div>

            {itemDetail.url && (
              <div>
                <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  {t("class.colClassUrl", { defaultValue: "Link lớp học" })}
                </span>
                <a
                  href={itemDetail.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-600 dark:text-brand-400 hover:underline mt-0.5 block truncate"
                >
                  {itemDetail.url}
                </a>
              </div>
            )}

            <div className="sm:col-span-2">
              <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                {t("class.colName")}
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5 block">
                {itemDetail.name}
              </span>
            </div>

            <div>
              <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                {t("class.formStartDateLabel")}
              </span>
              <span className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 block font-medium">
                {itemDetail.startDate ? new Date(itemDetail.startDate).toLocaleDateString("vi-VN") : "-"}
              </span>
            </div>

            <div>
              <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                {t("class.formEndDateLabel")}
              </span>
              <span className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 block font-medium">
                {itemDetail.endDate ? new Date(itemDetail.endDate).toLocaleDateString("vi-VN") : "-"}
              </span>
            </div>

            <div>
              <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                {t("class.colCourse")}
              </span>
              <span className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 block">
                {itemDetail.courseName || t("class.noCourse")}
              </span>
            </div>

            <div>
              <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                {t("class.colTeacher")}
              </span>
              <span className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 block font-medium">
                {itemDetail.teacherName || t("class.noTeacher")}
              </span>
            </div>

            <div>
              <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                {t("class.colSemester")}
              </span>
              <span className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 block font-medium">
                {itemDetail.semesterName || "-"}
              </span>
            </div>

            {itemDetail.description && (
              <div className="sm:col-span-2">
                <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  {t("class.formDescLabel")}
                </span>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 block whitespace-pre-line bg-gray-50 dark:bg-gray-955 p-3 rounded-lg border border-gray-150 dark:border-gray-800">
                  {itemDetail.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule info (4 cols) */}
      <div className="lg:col-span-4">
        <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-4 h-full flex flex-col">
          <h3 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-50 dark:border-gray-800/80 pb-3">
            <CalendarRange className="w-4.5 h-4.5 text-brand-500" />
            {t("class.weeklyScheduleLabel")}
          </h3>
          <div className="grid grid-cols-1 gap-2.5 flex-1">
            {DAYS_OF_WEEK.map((dayObj) => {
              const day = dayObj.value;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const sched = parsedSchedules.find((s: any) => {
                const sDay = s.dayOfWeek !== undefined ? s.dayOfWeek : (s.DayOfWeek !== undefined ? s.DayOfWeek : -1);
                return sDay === day;
              });
              const isActive = !!sched;
              const startTime = sched ? (sched.startTime ?? sched.StartTime) : "";
              const endTime = sched ? (sched.endTime ?? sched.EndTime) : "";
              const roomId = sched ? (sched.roomId !== undefined ? sched.roomId : sched.RoomId) : null;
              const roomName = getRoomName(roomId);

              return (
                <div
                  key={day}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all duration-200 ${
                    isActive
                      ? "bg-brand-50/30 border-brand-500 dark:bg-brand-950/20 dark:border-brand-500 shadow-xs"
                      : "bg-gray-100/30 border-gray-200 dark:bg-gray-900/30 dark:border-gray-850 opacity-40"
                  }`}
                >
                  <span className={`text-xs font-bold w-20 shrink-0 text-left ${isActive ? "text-brand-600 dark:text-brand-400" : "text-gray-500"}`}>
                    {t(`semester.days.${dayObj.value}`)}
                  </span>
                  {isActive ? (
                    <div className="text-right">
                      <span className="block text-xs font-bold text-gray-850 dark:text-gray-105 leading-tight">
                        {startTime} - {endTime}
                      </span>
                      <span className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                        {roomName || t("class.scheduleEmptySlot")}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                      {t("class.scheduleEmptySlot")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

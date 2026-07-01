"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { roomApi } from "@/services/room.api";
import { Info, CalendarRange } from "lucide-react";

interface ClassViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  itemDetail: any;
  isLoading: boolean;
  formError: string | null;
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

export function ClassViewModal({
  isOpen,
  onClose,
  t,
  itemDetail,
  isLoading,
  formError,
}: ClassViewModalProps) {
  const [rooms, setRooms] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      roomApi.getAll(1, 100)
        .then((res) => {
          if (res.success && res.data) {
            setRooms(res.data.items || []);
          }
        })
        .catch((err) => console.error("Failed to load rooms in view modal", err));
    }
  }, [isOpen]);

  const getRoomName = (roomId: number | null) => {
    if (!roomId) return "";
    const r = rooms.find((room) => room.id === roomId);
    return r ? r.name : `Phòng ${roomId}`;
  };

  const parsedSchedules = useMemo(() => {
    if (!itemDetail?.weeklySchedulesJson) return [];
    try {
      const parsed = JSON.parse(itemDetail.weeklySchedulesJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error("Failed to parse weeklySchedulesJson", err);
      return [];
    }
  }, [itemDetail?.weeklySchedulesJson]);

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return t("class.statusPlanning", { defaultValue: "Sắp mở" });
      case 1: return t("class.statusActive", { defaultValue: "Đang học" });
      case 2: return t("class.statusCompleted", { defaultValue: "Hoàn thành" });
      case 3: return t("class.statusCancelled", { defaultValue: "Đã hủy" });
      default: return "";
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-500";
      case 1: return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500";
      case 2: return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-500";
      case 3: return "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-500";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[1280px] w-[95vw] p-6 sm:p-8"
    >
      <div className="flex flex-col gap-5 max-h-[85vh] overflow-y-auto pr-2 animate-fadeIn">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("class.viewTitle")}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("class.viewDesc")}
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-500 dark:text-gray-400 text-sm">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-brand-500 border-t-transparent mb-3"></div>
            {t("class.loadingDetail")}
          </div>
        ) : formError ? (
          <p className="text-sm text-error-500 dark:text-error-400 py-4 text-center">{formError}</p>
        ) : !itemDetail ? (
          <p className="text-sm text-gray-400 py-4 text-center">Không tìm thấy thông tin chi tiết.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-2 items-start">
            {/* Left Column: General Info & Schedule (8 columns) */}
            <div className="md:col-span-8 space-y-6">
              <div className="p-5 bg-gray-50/30 dark:bg-gray-950/40 rounded-2xl border border-gray-100 dark:border-gray-800/80 space-y-5">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
                  <Info className="w-4 h-4 text-brand-500" />
                  Thông tin chung
                </h4>
                
                <div className="grid grid-cols-2 gap-y-4 gap-x-6">
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
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold mt-1 ${getStatusColor(itemDetail.status)}`}>
                      {getStatusText(itemDetail.status)}
                    </span>
                  </div>

                  <div className="col-span-2">
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

                  {itemDetail.description && (
                    <div className="col-span-2">
                      <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                        {t("class.formDescLabel")}
                      </span>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 block whitespace-pre-line bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-gray-150 dark:border-gray-800">
                        {itemDetail.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 7 Days Schedule Grid */}
              <div className="p-5 bg-gray-50/30 dark:bg-gray-950/40 rounded-2xl border border-gray-100 dark:border-gray-800/80 space-y-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
                  <CalendarRange className="w-4 h-4 text-brand-500" />
                  Lịch học hàng tuần
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                  {DAYS_OF_WEEK.map((dayObj) => {
                    const day = dayObj.value;
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
                        className={`p-3 rounded-xl border text-center flex flex-col justify-between min-h-[100px] transition-all duration-200 ${
                          isActive
                            ? "bg-brand-50/30 border-brand-500 dark:bg-brand-950/20 dark:border-brand-500 shadow-xs"
                            : "bg-gray-100/30 border-gray-200 dark:bg-gray-900/30 dark:border-gray-850 opacity-40"
                        }`}
                      >
                        <span className={`text-xs font-bold ${isActive ? "text-brand-600 dark:text-brand-400" : "text-gray-500"}`}>
                          {dayObj.label}
                        </span>
                        {isActive ? (
                          <div className="space-y-1 mt-2">
                            <span className="block text-xs font-bold text-gray-850 dark:text-gray-100 leading-tight">
                              {startTime} - {endTime}
                            </span>
                            <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">
                              {roomName || "Trống"}
                            </span>
                          </div>
                        ) : (
                          <span className="block text-xs text-gray-400 dark:text-gray-500 italic mt-3">
                            Trống
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Students Card List (4 columns) */}
            <div className="md:col-span-4 space-y-4">
              <div className="p-5 bg-gray-50/30 dark:bg-gray-950/40 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                  <span>{t("class.formStudentsLabel")}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {itemDetail.studentClasses?.length || 0} {t("class.colStudents").toLowerCase()}
                  </span>
                </h4>

                {!itemDetail.studentClasses || itemDetail.studentClasses.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8 italic border border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900">
                    Chưa có học sinh nào được gán vào lớp học này.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-[500px] overflow-y-auto pr-1">
                    {itemDetail.studentClasses.map((sc: any) => (
                      <div
                        key={sc.id || sc.studentId}
                        className="p-3 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl flex items-center gap-3 shadow-theme-xs hover:border-brand-300 dark:hover:border-brand-500 transition-colors"
                      >
                        {/* Avatar Circle */}
                        <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {sc.student?.name ? sc.student.name.charAt(0).toUpperCase() : "?"}
                        </div>
                        
                        {/* Student Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                              {sc.student?.name}
                            </span>
                            <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 shrink-0">
                              {sc.student?.code}
                            </span>
                          </div>
                          <span className="block text-[10px] text-gray-500 dark:text-gray-400 truncate">
                            {sc.student?.email || "Không có email"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cancel button */}
        <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-800/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
}

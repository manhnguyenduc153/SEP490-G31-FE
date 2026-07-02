"use client";

import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventClickArg, EventContentArg } from "@fullcalendar/core";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import { classApi, ClassItem, ClassScheduleItem } from "@/services/class.api";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  extendedProps: {
    lessonNo: number;
    roomName: string;
    teacherName: string;
    teacherAvatar: string | null;
    startTime: string;
    endTime: string;
    status: number;
    note: string | null;
    scheduleDate: string;
    classCode?: string | null;
    className?: string | null;
  };
}

export default function ClassScheduleCalendar() {
  const { isOpen, openModal, closeModal } = useModal();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [classDetail, setClassDetail] = useState<ClassItem | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal detail state
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent["extendedProps"] | null>(null);

  // Fetch all classes for combobox
  useEffect(() => {
    async function loadClasses() {
      try {
        const res = await classApi.getAll(1, 1000);
        if (res.success && res.data) {
          setClasses(res.data.items || []);
        }
      } catch (err) {
        console.error("Failed to load classes", err);
      }
    }
    loadClasses();
  }, []);

  // Fetch schedule of selected class or all classes
  useEffect(() => {
    async function loadClassSchedules() {
      setLoading(true);
      try {
        if (selectedClassId === null) {
          // Fetch schedules of all classes
          const res = await classApi.getClassSchedules();
          if (res.success && res.data) {
            setClassDetail(null);
            const mappedEvents = res.data.map((s: ClassScheduleItem) => {
              const datePart = s.scheduleDate ? s.scheduleDate.split("T")[0] : "";
              const startISO = `${datePart}T${s.startTime || "08:00"}:00`;
              const endISO = `${datePart}T${s.endTime || "09:30"}:00`;

              return {
                id: String(s.id),
                title: `${s.classCode || "N/A"} - Buổi ${s.lessonNo} - Phòng ${s.roomName || "N/A"}`,
                start: startISO,
                end: endISO,
                extendedProps: {
                  lessonNo: s.lessonNo || 0,
                  roomName: s.roomName || "N/A",
                  teacherName: s.teacherName || "Chưa phân công",
                  teacherAvatar: s.teacherAvatar || null,
                  startTime: s.startTime || "08:00",
                  endTime: s.endTime || "09:30",
                  status: s.status,
                  note: s.note || "",
                  scheduleDate: datePart,
                  classCode: s.classCode || "N/A",
                  className: s.className || "N/A",
                },
              };
            });
            setEvents(mappedEvents);
          }
        } else {
          // Fetch schedule of a specific class
          const res = await classApi.getById(selectedClassId);
          if (res.success && res.data) {
            const detail = res.data;
            setClassDetail(detail);

            const mappedEvents = (detail.schedules || []).map((s: ClassScheduleItem) => {
              const datePart = s.scheduleDate ? s.scheduleDate.split("T")[0] : "";
              const startISO = `${datePart}T${s.startTime || "08:00"}:00`;
              const endISO = `${datePart}T${s.endTime || "09:30"}:00`;

              return {
                id: String(s.id),
                title: `Buổi ${s.lessonNo} - Phòng ${s.roomName || "N/A"}`,
                start: startISO,
                end: endISO,
                extendedProps: {
                  lessonNo: s.lessonNo || 0,
                  roomName: s.roomName || "N/A",
                  teacherName: s.teacherName || detail.teacherName || "Chưa phân công",
                  teacherAvatar: s.teacherAvatar || detail.teacherAvatar || null,
                  startTime: s.startTime || "08:00",
                  endTime: s.endTime || "09:30",
                  status: s.status,
                  note: s.note || "",
                  scheduleDate: datePart,
                  classCode: detail.code || "N/A",
                  className: detail.name || "N/A",
                },
              };
            });
            setEvents(mappedEvents);
          }
        }
      } catch (err) {
        console.error("Failed to load class schedules", err);
      } finally {
        setLoading(false);
      }
    }

    loadClassSchedules();
  }, [selectedClassId]);

  const handleEventClick = (clickInfo: EventClickArg) => {
    const eventProps = clickInfo.event.extendedProps as CalendarEvent["extendedProps"];
    setSelectedEvent(eventProps);
    openModal();
  };

  const getStatusConfig = (status: number) => {
    switch (status) {
      case 0:
        return { text: "Chưa diễn ra", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800" };
      case 1:
        return { text: "Đang học", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800" };
      case 2:
        return { text: "Đã hoàn thành", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800" };
      case 3:
        return { text: "Đã hủy", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800" };
      default:
        return { text: "Không xác định", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800" };
    }
  };

  // Custom cell rendering for calendar event
  const renderClassEventContent = (eventInfo: EventContentArg) => {
    const props = eventInfo.event.extendedProps as CalendarEvent["extendedProps"];
    return (
      <div className="flex flex-col p-1.5 bg-brand-50/80 dark:bg-brand-950/20 text-brand-900 dark:text-brand-300 rounded-lg border border-brand-100 dark:border-brand-900/50 w-full overflow-hidden text-[11px] shadow-2xs leading-tight transition-all duration-200 hover:bg-brand-100/90 dark:hover:bg-brand-900/30 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-lg hover:shadow-brand-500/15">
        <div className="flex items-center gap-1 font-bold">
          <span className="bg-brand-500 text-white rounded-md px-1 py-0.2 text-[9px]">B{props.lessonNo}</span>
          <span className="truncate">{props.startTime} - {props.endTime}</span>
        </div>
        {selectedClassId === null && (
          <div className="truncate mt-1 font-semibold text-brand-700 dark:text-brand-400">
            Lớp: {props.classCode}
          </div>
        )}
        <div className="truncate mt-1 text-gray-700 dark:text-gray-200 font-medium">
          Phòng: {props.roomName}
        </div>
        <div className="truncate text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
          <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="truncate">{props.teacherName}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search Filter Box */}
      <div className="p-5 sm:p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex flex-col gap-1.5 w-full md:max-w-md">
          <label className="text-sm font-semibold text-gray-750 dark:text-gray-300">
            Lớp học:
          </label>
          <select
            value={selectedClassId === null ? "all" : String(selectedClassId)}
            onChange={(e) => setSelectedClassId(e.target.value === "all" ? null : Number(e.target.value))}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="all">Tất cả các lớp</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.code} - {cls.name} ({cls.scheduleDisplay || "Chưa cấu hình lịch"})
              </option>
            ))}
          </select>
        </div>

        {classDetail && (
          <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex-1 md:max-w-md">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Giáo viên chủ nhiệm</span>
                <span className="text-gray-800 dark:text-gray-200 font-medium">{classDetail.teacherName || "Chưa phân công"}</span>
              </div>
              <div>
                <span className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Tổng số buổi</span>
                <span className="text-gray-800 dark:text-gray-200 font-medium">{classDetail.expectedLessons} buổi</span>
              </div>
              <div className="col-span-2">
                <span className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Thời gian khóa học</span>
                <span className="text-gray-800 dark:text-gray-200 font-medium">
                  {classDetail.startDate ? classDetail.startDate.split("T")[0] : "N/A"} ~ {classDetail.endDate ? classDetail.endDate.split("T")[0] : "N/A"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Calendar View */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
          </div>
        ) : (
          <div className="schedules-calendar-main">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale="vi"
              slotMinTime="06:00:00"
              slotMaxTime="24:00:00"
              buttonText={{
                today: "Hôm nay",
                month: "Tháng",
                week: "Tuần",
              }}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek",
              }}
              events={events}
              selectable={false}
              eventClick={handleEventClick}
              eventContent={renderClassEventContent}
              height="auto"
            />
          </div>
        )}
      </div>

      {/* Session Details Modal */}
      <Modal isOpen={isOpen} onClose={closeModal} showCloseButton={false} className="max-w-[500px] p-6 lg:p-8">
        {selectedEvent && (
          <div className="flex flex-col">
            <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
              <div className="flex items-center justify-between gap-3">
                <h5 className="font-bold text-gray-900 dark:text-white text-lg sm:text-xl">
                  Chi Tiết Buổi Học {selectedEvent.lessonNo}
                </h5>
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusConfig(selectedEvent.status).color}`}>
                  {getStatusConfig(selectedEvent.status).text}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Lớp: <strong className="text-gray-700 dark:text-gray-200">{selectedEvent.classCode} - {selectedEvent.className}</strong>
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <span className="block text-xs text-gray-400 font-semibold uppercase">Ngày học</span>
                  <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                    {selectedEvent.scheduleDate}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <span className="block text-xs text-gray-400 font-semibold uppercase">Khung giờ</span>
                  <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                    {selectedEvent.startTime} - {selectedEvent.endTime}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <span className="block text-xs text-gray-400 font-semibold uppercase">Phòng học</span>
                  <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                    {selectedEvent.roomName}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div>
                    <span className="block text-xs text-gray-400 font-semibold uppercase">Giáo viên giảng dạy</span>
                    <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                      {selectedEvent.teacherName}
                    </span>
                  </div>
                </div>
              </div>

              {selectedEvent.note && (
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <span className="block text-xs text-gray-400 font-semibold uppercase">Ghi chú</span>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 whitespace-pre-wrap bg-gray-50 dark:bg-gray-850 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                      {selectedEvent.note}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={closeModal}
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-750 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

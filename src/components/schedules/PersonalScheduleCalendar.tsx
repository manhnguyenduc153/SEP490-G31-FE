"use client";

import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventClickArg, EventContentArg } from "@fullcalendar/core";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import { classApi, ClassScheduleItem } from "@/services/class.api";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  extendedProps: {
    id: number;
    classId: number | null;
    classCode: string | null;
    className: string | null;
    lessonNo: number;
    roomName: string;
    teacherName: string;
    teacherAvatar: string | null;
    startTime: string;
    endTime: string;
    status: number;
    note: string | null;
    scheduleDate: string;
  };
}

interface PersonalScheduleCalendarProps {
  type: "teacher" | "student";
}

export default function PersonalScheduleCalendar({ type }: PersonalScheduleCalendarProps) {
  const { isOpen, openModal, closeModal } = useModal();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent["extendedProps"] | null>(null);

  useEffect(() => {
    async function loadSchedules() {
      setLoading(true);
      try {
        const res = type === "teacher" 
          ? await classApi.getTeacherSchedules() 
          : await classApi.getStudentSchedules();

        if (res.success && res.data) {
          const mappedEvents = (res.data || []).map((s: ClassScheduleItem) => {
            const datePart = s.scheduleDate ? s.scheduleDate.split("T")[0] : "";
            const startISO = `${datePart}T${s.startTime || "08:00"}:00`;
            const endISO = `${datePart}T${s.endTime || "09:30"}:00`;

            return {
              id: String(s.id),
              title: `Buổi ${s.lessonNo} - ${s.classCode} - P.${s.roomName || "N/A"}`,
              start: startISO,
              end: endISO,
              extendedProps: {
                id: s.id,
                classId: s.classId || null,
                classCode: s.classCode || "",
                className: s.className || "",
                lessonNo: s.lessonNo || 0,
                roomName: s.roomName || "N/A",
                teacherName: s.teacherName || "Chưa phân công",
                teacherAvatar: s.teacherAvatar || null,
                startTime: s.startTime || "08:00",
                endTime: s.endTime || "09:30",
                status: s.status,
                note: s.note || "",
                scheduleDate: datePart,
              },
            };
          });
          setEvents(mappedEvents);
        }
      } catch (err) {
        console.error("Failed to load schedules", err);
      } finally {
        setLoading(false);
      }
    }
    loadSchedules();
  }, [type]);

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

  const renderClassEventContent = (eventInfo: EventContentArg) => {
    const props = eventInfo.event.extendedProps as CalendarEvent["extendedProps"];
    return (
      <div className="flex flex-col p-1.5 bg-brand-50/80 dark:bg-brand-950/20 text-brand-900 dark:text-brand-300 rounded-lg border border-brand-100 dark:border-brand-900/50 w-full overflow-hidden text-[11px] shadow-2xs leading-tight">
        <div className="flex items-center gap-1 font-bold">
          <span className="bg-brand-500 text-white rounded-md px-1 py-0.2 text-[9px]">B{props.lessonNo}</span>
          <span className="truncate">{props.startTime} - {props.endTime}</span>
        </div>
        <div className="truncate mt-1 text-gray-700 dark:text-gray-200 font-semibold text-[11px]">
          Lớp: {props.classCode}
        </div>
        <div className="truncate mt-0.5 text-gray-600 dark:text-gray-300 font-medium">
          Phòng: {props.roomName}
        </div>
        {type === "student" && (
          <div className="truncate text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
            <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="truncate">{props.teacherName}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
          </div>
        ) : events.length > 0 ? (
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
        ) : (
          <div className="py-16 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">Không có lịch học/dạy</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {type === "teacher" 
                ? "Tài khoản giáo viên của bạn hiện chưa được phân công lớp học nào."
                : "Tài khoản học sinh của bạn hiện chưa đăng ký lớp học nào."}
            </p>
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
                  <span className="block text-xs text-gray-400 font-semibold uppercase">Ngày diễn ra</span>
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
                <div>
                  <span className="block text-xs text-gray-400 font-semibold uppercase">Giáo viên giảng dạy</span>
                  <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                    {selectedEvent.teacherName}
                  </span>
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

"use client";

import React, { useState, useEffect, useRef } from "react";
import { classApi, ClassItem } from "@/services/class.api";
import { courseApi, CourseItem } from "@/services/course.api";
import { teacherApi, TeacherItem } from "@/services/teacher.api";
import { studentApi, StudentItem } from "@/services/student.api";
import { roomApi, RoomItem } from "@/services/room.api";
import { CodeHelper } from "@/helpers/CodeHelper";

interface ClassFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  editingItem: ClassItem | null;
  onCancel: () => void;
  onSuccess: (message: string) => void;
}

interface DayConfig {
  selected: boolean;
  startTime: string;
  endTime: string;
  roomId: number | null;
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

const SUGGESTIONS = [
  { label: "08:00-09:30", start: "08:00", end: "09:30" },
  { label: "14:00-15:30", start: "14:00", end: "15:30" },
  { label: "17:30-19:00", start: "17:30", end: "19:00" },
  { label: "18:00-19:30", start: "18:00", end: "19:30" },
  { label: "19:30-21:00", start: "19:30", end: "21:00" },
];

export default function ClassForm({ t, editingItem, onCancel, onSuccess }: ClassFormProps) {
  const startDateInputRef = useRef<HTMLInputElement>(null);
  // Form states
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formCourseId, setFormCourseId] = useState<number | null>(null);
  const [formTeacherId, setFormTeacherId] = useState<number | null>(null);
  const [formExpectedLessons, setFormExpectedLessons] = useState<number>(30);
  const [formDesc, setFormDesc] = useState("");
  const [formStudentIds, setFormStudentIds] = useState<number[]>([]);
  const [formStatus, setFormStatus] = useState<number>(0);
  const [formAutoRefund, setFormAutoRefund] = useState(false);

  // Filter dropdown states
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  
  // Weekly Schedules state
  const [dayConfigs, setDayConfigs] = useState<Record<number, DayConfig>>({
    1: { selected: true, startTime: "17:30", endTime: "19:00", roomId: null },
    2: { selected: false, startTime: "17:30", endTime: "19:00", roomId: null },
    3: { selected: false, startTime: "17:30", endTime: "19:00", roomId: null },
    4: { selected: false, startTime: "17:30", endTime: "19:00", roomId: null },
    5: { selected: false, startTime: "17:30", endTime: "19:00", roomId: null },
    6: { selected: false, startTime: "17:30", endTime: "19:00", roomId: null },
    0: { selected: false, startTime: "17:30", endTime: "19:00", roomId: null },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Dropdown search for students
  const [studentSearchText, setStudentSearchText] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<StudentItem[]>([]);
  const [searchResults, setSearchResults] = useState<StudentItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load dropdown options
  useEffect(() => {
    async function loadOptions() {
      try {
        const [cRes, tRes, rRes] = await Promise.all([
          courseApi.getAll(1, 100, "", true),
          teacherApi.getAll(1, 100),
          roomApi.getAll(1, 100),
        ]);
        if (cRes.success && cRes.data) setCourses(cRes.data.items || []);
        if (tRes.success && tRes.data) setTeachers(tRes.data.items || []);
        if (rRes.success && rRes.data) setRooms(rRes.data.items || []);
      } catch (err) {
        console.error("Failed to load options", err);
      }
    }
    loadOptions();
  }, []);

  // Handle student search query dynamically
  useEffect(() => {
    if (!showDropdown) return;

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await studentApi.getAll(1, 15, studentSearchText);
        if (res.success && res.data) {
          setSearchResults(res.data.items || []);
        }
      } catch (err) {
        console.error("Search students error", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [studentSearchText, showDropdown]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize values when editing
  useEffect(() => {
    if (editingItem) {
      setFormName(editingItem.name);
      setFormCode(editingItem.code);
      setFormStartDate(editingItem.startDate ? editingItem.startDate.split("T")[0] : "");
      setFormEndDate(editingItem.endDate ? editingItem.endDate.split("T")[0] : "");
      setFormCourseId(editingItem.courseId ?? null);
      setFormTeacherId(editingItem.teacherId ?? null);
      setFormDesc(editingItem.description ?? "");
      setFormStatus(editingItem.status);
      setFormAutoRefund(editingItem.autoRefund ?? false);
      setFormExpectedLessons(editingItem.expectedLessons ?? 30);

      // Load full class details (including students and schedules)
      async function loadClassDetail() {
        try {
          const res = await classApi.getById(editingItem!.id);
          if (res.success && res.data) {
            const detail = res.data;
            const studentIds = (detail.studentClasses || []).map((sc: any) => sc.studentId);
            setFormStudentIds(studentIds);

            // Populate selectedStudents list
            const loadedStudents = (detail.studentClasses || []).map((sc: any) => ({
              id: sc.student?.id || sc.studentId,
              code: sc.student?.code || "",
              name: sc.student?.name || "",
              email: sc.student?.email || "",
              avatar: sc.student?.avatar || null,
              status: sc.student?.status ?? 1,
              statusName: sc.student?.statusName || "Active"
            }));
            setSelectedStudents(loadedStudents);

            if (detail.expectedLessons !== undefined && detail.expectedLessons !== null) {
              setFormExpectedLessons(detail.expectedLessons);
            }
            if (detail.autoRefund !== undefined && detail.autoRefund !== null) {
              setFormAutoRefund(detail.autoRefund);
            }
            if (detail.startDate) {
              setFormStartDate(detail.startDate.split("T")[0]);
            }
            if (detail.endDate) {
              setFormEndDate(detail.endDate.split("T")[0]);
            }

            // Load weekly schedule config from JSON if exists
            if (detail.weeklySchedulesJson) {
              try {
                const parsedSchedules = JSON.parse(detail.weeklySchedulesJson);
                const loadedConfigs: Record<number, DayConfig> = {
                  1: { selected: false, startTime: "17:30", endTime: "19:00", roomId: null },
                  2: { selected: false, startTime: "17:30", endTime: "19:00", roomId: null },
                  3: { selected: false, startTime: "17:30", endTime: "19:00", roomId: null },
                  4: { selected: false, startTime: "17:30", endTime: "19:00", roomId: null },
                  5: { selected: false, startTime: "17:30", endTime: "19:00", roomId: null },
                  6: { selected: false, startTime: "17:30", endTime: "19:00", roomId: null },
                  0: { selected: false, startTime: "17:30", endTime: "19:00", roomId: null },
                };
                
                if (Array.isArray(parsedSchedules)) {
                  parsedSchedules.forEach((s: any) => {
                    const day = s.dayOfWeek !== undefined ? s.dayOfWeek : (s.DayOfWeek !== undefined ? s.DayOfWeek : 1);
                    loadedConfigs[day] = {
                      selected: true,
                      startTime: s.startTime ?? s.StartTime ?? "17:30",
                      endTime: s.endTime ?? s.EndTime ?? "19:00",
                      roomId: s.roomId !== undefined ? s.roomId : (s.RoomId !== undefined ? s.RoomId : null),
                    };
                  });
                }
                
                setDayConfigs(loadedConfigs);
              } catch (err) {
                console.error("Failed to parse weekly schedule JSON", err);
              }
            }
          }
        } catch (err) {
          console.error("Failed to load class details", err);
        }
      }
      loadClassDetail();
    } else {
      // Create mode defaults
      setFormName("");
      setFormCode(CodeHelper.generate("LH"));
      setFormStartDate("");
      setFormEndDate("");
      setFormCourseId(null);
      setFormTeacherId(null);
      setFormDesc("");
      setFormStatus(0);
      setFormAutoRefund(false);
      setFormExpectedLessons(30);
      setFormStudentIds([]);
      setSelectedStudents([]);
      setDayConfigs({
        1: { selected: true, startTime: "17:30", endTime: "19:00", roomId: null },
        2: { selected: false, startTime: "17:30", endTime: "19:00", roomId: null },
        3: { selected: false, startTime: "17:30", endTime: "19:00", roomId: null },
        4: { selected: false, startTime: "17:30", endTime: "19:00", roomId: null },
        5: { selected: false, startTime: "17:30", endTime: "19:00", roomId: null },
        6: { selected: false, startTime: "17:30", endTime: "19:00", roomId: null },
        0: { selected: false, startTime: "17:30", endTime: "19:00", roomId: null },
      });
    }
  }, [editingItem]);

  const updateDayConfig = (day: number, field: keyof DayConfig, value: any) => {
    setDayConfigs((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const toggleDaySelected = (day: number) => {
    setDayConfigs((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        selected: !prev[day].selected,
      },
    }));
  };

  const handleSelectStudent = (student: StudentItem) => {
    if (!formStudentIds.includes(student.id)) {
      setFormStudentIds((prev) => [...prev, student.id]);
      setSelectedStudents((prev) => [...prev, student]);
    }
    setStudentSearchText("");
    setShowDropdown(false);
  };

  const handleRemoveStudent = (studentId: number) => {
    setFormStudentIds((prev) => prev.filter((id) => id !== studentId));
    setSelectedStudents((prev) => prev.filter((s) => s.id !== studentId));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("Tên lớp học không được để trống");
      return;
    }

    if (!formStartDate) {
      setFormError("Ngày bắt đầu không được để trống");
      return;
    }

    if (!formExpectedLessons || formExpectedLessons <= 0) {
      setFormError("Số buổi dự kiến phải lớn hơn 0");
      return;
    }

    const selectedSchedules = Object.entries(dayConfigs)
      .filter(([_, config]) => config.selected);

    if (selectedSchedules.length === 0) {
      setFormError("Vui lòng cấu hình ít nhất 1 buổi học trong lịch học hàng tuần");
      return;
    }

    const finalCode = formCode.trim();

    if (!finalCode) {
      setFormError("Mã lớp học không được để trống");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        code: finalCode,
        name: formName.trim(),
        description: formDesc.trim() || null,
        startDate: formStartDate || null,
        endDate: formEndDate || null,
        courseId: formCourseId,
        teacherId: formTeacherId,
        status: formStatus,
        autoRefund: formAutoRefund,
        expectedLessons: formExpectedLessons,
        studentIds: formStudentIds,
        weeklySchedules: selectedSchedules.map(([dayStr, config]) => ({
          dayOfWeek: Number(dayStr),
          startTime: config.startTime,
          endTime: config.endTime,
          roomId: config.roomId,
        })),
      };

      if (editingItem) {
        const res = await classApi.update(editingItem.id, {
          ...payload,
          id: editingItem.id,
        });
        if (res.success && res.data) {
          onSuccess(t("class.updateSuccess", { name: res.data.name }));
        } else {
          setFormError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("class.updateError"));
        }
      } else {
        const res = await classApi.create(payload);
        if (res.success && res.data) {
          onSuccess(t("class.createSuccess", { name: res.data.name }));
        } else {
          setFormError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("class.createError"));
        }
      }
    } catch (err) {
      setFormError(t("class.systemError"));
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="space-y-6 w-full pb-10">
      {/* Top Header Card */}
      <div className="flex items-center justify-between p-5 sm:p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5 text-brand-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            {editingItem ? "Chỉnh Sửa Lớp Học" : "Tạo Lớp Học Mới"}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Trang Chủ - Quản Lý Lớp Học - {editingItem ? "Chỉnh Sửa" : "Tạo Mới"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-850 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors"
          >
            &lt; Quay lại
          </button>
          <button
            onClick={handleSubmitForm}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-theme-xs transition-colors disabled:opacity-60"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {editingItem ? "Lưu thay đổi" : "Tạo lớp học"}
          </button>
        </div>
      </div>

      {formError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm font-semibold text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400">
          ⚠️ {formError}
        </div>
      )}

      {/* Main Form Content */}
      <div className="space-y-6 w-full">
          
          {/* Card: Thông tin cơ bản */}
          <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-5">
            <h3 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-50 dark:border-gray-800/80 pb-3">
              📅 Thông tin cơ bản
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Tên lớp học */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Tên lớp học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nhập tên lớp học"
                  className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>

              {/* Mã lớp học */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Mã lớp học
                </label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="Mã lớp học"
                  className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-850 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                />
              </div>

              {/* Nhóm Ngày bắt đầu, Ngày kết thúc, Số buổi dự kiến trên cùng 1 dòng */}
              <div className="col-span-1 sm:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Ngày bắt đầu */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Ngày bắt đầu <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      ref={startDateInputRef}
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-transparent pl-3 pr-10 py-2 text-sm text-gray-850 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => startDateInputRef.current?.showPicker()}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-brand-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 text-gray-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Ngày kết thúc */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Ngày kết thúc (dự kiến)
                  </label>
                  <input
                    type="date"
                    disabled
                    value={formEndDate}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-950 disabled:bg-gray-50 dark:disabled:bg-gray-950/40 disabled:text-gray-400 dark:disabled:text-gray-600 px-3 py-2 text-sm text-gray-800 dark:border-gray-800"
                  />
                  <span className="text-[10px] text-gray-400 block">
                    ℹ️ Tự tính dựa trên lịch &amp; số buổi
                  </span>
                </div>

                {/* Số buổi dự kiến */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Số buổi dự kiến <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={formExpectedLessons}
                    onChange={(e) => setFormExpectedLessons(Number(e.target.value))}
                    placeholder="VD: 30"
                    className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-850 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                  />
                  <span className="text-[10px] text-gray-400 block">
                    Tổng số buổi học dự kiến
                  </span>
                </div>
              </div>

              {/* Giáo viên chính */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Giáo viên chính
                </label>
                <select
                  value={formTeacherId || ""}
                  onChange={(e) => setFormTeacherId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-850 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                >
                  <option value="">Chọn giáo viên</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Khóa học */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Khóa học
                </label>
                <select
                  value={formCourseId || ""}
                  onChange={(e) => setFormCourseId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-850 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                >
                  <option value="">Chọn khóa học</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>


              {/* Chọn học sinh */}
              <div className="col-span-1 sm:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Chọn học sinh (Có thể thêm sau)
                </label>
                
                {/* Search Combobox Container */}
                <div ref={dropdownRef} className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Tìm kiếm và chọn học sinh theo mã hoặc tên..."
                      value={studentSearchText}
                      onFocus={() => setShowDropdown(true)}
                      onChange={(e) => setStudentSearchText(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white dark:border-gray-800 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                    />
                    <span className="absolute left-3 top-2.5 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 text-gray-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                    </span>
                  </div>

                  {showDropdown && (
                    <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg animate-fadeIn pr-1">
                      {isSearching ? (
                        <div className="flex items-center justify-center py-4 text-xs text-gray-500 dark:text-gray-400">
                          <div className="inline-block animate-spin rounded-full h-4.5 w-4.5 border-2 border-brand-500 border-t-transparent mr-2"></div>
                          Đang tìm kiếm...
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="py-3 px-4 text-xs text-gray-400 italic">
                          Không tìm thấy học sinh nào
                        </div>
                      ) : (
                        <div className="py-1">
                          {searchResults.map((student) => {
                            const isAlreadySelected = formStudentIds.includes(student.id);
                            return (
                              <button
                                key={student.id}
                                type="button"
                                disabled={isAlreadySelected}
                                onClick={() => handleSelectStudent(student)}
                                className={`w-full text-left px-4 py-2.5 text-xs flex items-center justify-between border-b border-gray-50 dark:border-gray-900/60 last:border-0 transition-colors ${
                                  isAlreadySelected
                                    ? "bg-gray-50 text-gray-400 dark:bg-gray-900/40 dark:text-gray-600 cursor-not-allowed"
                                    : "hover:bg-brand-50/50 dark:hover:bg-brand-950/20 text-gray-700 dark:text-gray-300"
                                }`}
                              >
                                <span className="font-semibold text-xs">
                                  {student.name} <span className="text-[10px] font-normal text-gray-400 dark:text-gray-500 ml-1">({student.code})</span>
                                </span>
                                {isAlreadySelected && (
                                  <span className="text-[10px] bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 px-1.5 py-0.5 rounded font-bold">
                                    Đã chọn
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Students Cards Region */}
                {selectedStudents.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block">
                      Đã chọn {selectedStudents.length} học sinh:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto pr-1 py-1">
                      {selectedStudents.map((student) => (
                        <div
                          key={student.id}
                          className="relative p-2.5 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl flex items-center gap-2.5 shadow-theme-xs hover:border-rose-300 dark:hover:border-rose-500/40 transition-colors animate-fadeIn"
                        >
                          {/* Avatar Circle */}
                          <div className="w-7 h-7 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xs shrink-0">
                            {student.name ? student.name.charAt(0).toUpperCase() : "?"}
                          </div>
                          
                          {/* Student Details */}
                          <div className="min-w-0 flex-1 pr-6">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                                {student.name}
                              </span>
                              <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 shrink-0">
                                {student.code}
                              </span>
                            </div>
                            <span className="block text-[10px] text-gray-500 dark:text-gray-400 truncate">
                              {student.email || "Không có email"}
                            </span>
                          </div>

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveStudent(student.id)}
                            className="absolute right-1.5 top-1.5 text-gray-400 hover:text-rose-500 dark:text-gray-500 dark:hover:text-rose-450 transition-colors p-1"
                            title="Xóa học sinh"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3 h-3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mô tả lớp học */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Mô tả lớp học
              </label>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Mô tả chi tiết về lớp học..."
                rows={3}
                className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white resize-none"
              />
            </div>
          </div>

          {/* Card: Lịch học hàng tuần */}
          <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-4">
            <div>
              <h3 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-1">
                🟢 Lịch học hàng tuần
              </h3>
              <p className="text-xs text-gray-500">
                Chọn các ngày trong tuần học và cấu hình thời gian, phòng học tương ứng.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
              {DAYS_OF_WEEK.map((dayObj) => {
                const day = dayObj.value;
                const config = dayConfigs[day];
                const isSelected = config?.selected ?? false;
                
                return (
                  <div
                    key={day}
                    className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between space-y-3.5 ${
                      isSelected
                        ? "bg-brand-50/20 border-brand-500 dark:bg-brand-950/10 dark:border-brand-500 shadow-xs"
                        : "bg-gray-50/30 border-gray-200 dark:bg-gray-950/40 dark:border-gray-850 opacity-60 hover:opacity-80"
                    }`}
                  >
                    {/* Header: Checkbox + Day Label */}
                    <label className="flex items-center gap-2 cursor-pointer select-none pb-1 border-b border-gray-100 dark:border-gray-800/60">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleDaySelected(day)}
                        className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                      />
                      <span className={`text-sm font-bold ${
                        isSelected ? "text-brand-700 dark:text-brand-400" : "text-gray-600 dark:text-gray-400"
                      }`}>
                        {dayObj.label}
                      </span>
                    </label>

                    {/* Start Time */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Bắt đầu
                      </span>
                      <input
                        type="time"
                        disabled={!isSelected}
                        value={config?.startTime ?? "17:30"}
                        onChange={(e) => updateDayConfig(day, "startTime", e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-205 dark:border-gray-800 rounded-md bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 disabled:bg-gray-50 dark:disabled:bg-gray-950/60 disabled:text-gray-400"
                      />
                    </div>

                    {/* End Time */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Kết thúc
                      </span>
                      <input
                        type="time"
                        disabled={!isSelected}
                        value={config?.endTime ?? "19:00"}
                        onChange={(e) => updateDayConfig(day, "endTime", e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-205 dark:border-gray-800 rounded-md bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 disabled:bg-gray-50 dark:disabled:bg-gray-950/60 disabled:text-gray-400"
                      />
                    </div>

                    {/* Room */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Phòng học
                      </span>
                      <select
                        disabled={!isSelected}
                        value={config?.roomId || ""}
                        onChange={(e) => updateDayConfig(day, "roomId", e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-2 py-1 text-xs border border-gray-205 dark:border-gray-800 rounded-md bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 disabled:bg-gray-50 dark:disabled:bg-gray-950/60 disabled:text-gray-400"
                      >
                        <option value="">-- Trống --</option>
                        {rooms.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Suggestions */}
                    <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800/60">
                      <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">
                        Gợi ý ca:
                      </span>
                      <div className="flex flex-col gap-1 w-full">
                        {SUGGESTIONS.map((sug) => (
                          <button
                            key={sug.label}
                            type="button"
                            disabled={!isSelected}
                            onClick={() => {
                              updateDayConfig(day, "startTime", sug.start);
                              updateDayConfig(day, "endTime", sug.end);
                            }}
                            className="w-full text-center py-1.5 text-[11px] font-medium rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-brand-500 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/20 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                          >
                            {sug.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

      </div>

      {/* Bottom Footer Actions Card */}
      <div className="flex items-center justify-between p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
        <span className="text-xs text-gray-400">
          2026© ClassHub | classhubedu@gmail.com
        </span>

        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-250 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSubmitForm}
            type="button"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 shadow-theme-xs disabled:opacity-60 transition-colors"
          >
            {isSubmitting ? "Đang lưu..." : editingItem ? "Lưu thay đổi" : "Tạo lớp học"}
          </button>
        </div>
      </div>
    </div>
  );
}

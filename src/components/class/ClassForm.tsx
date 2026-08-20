"use client";

import React, { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { classApi, ClassItem, SpecificSessionScheduleDto, StudentPreferenceWarning } from "@/services/class.api";
import { courseApi, CourseItem } from "@/services/course.api";
import { teacherApi, TeacherItem } from "@/services/teacher.api";
import { studentApi, StudentItem } from "@/services/student.api";
import { roomApi, RoomItem } from "@/services/room.api";
import { semesterApi, SemesterItem } from "@/services/semester.api";
import { commonApi } from "@/services/common.api";
import { CodeHelper } from "@/helpers/CodeHelper";
import * as XLSX from "xlsx";
import { Calendar, FileSpreadsheet, Plus, Search, X, ArrowLeft, BookOpen, Info, UserPlus, BookPlus, CalendarDays, AlertCircle, Download, Layers, Repeat, Clock, Trash2, RefreshCw, CheckCircle2 } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { SoftConflictModal } from "@/components/schedules/SoftConflictModal";

interface ClassFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  editingItem: ClassItem | null;
  onCancel: () => void;
  onSuccess: (message: string) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

const getClassSchema = (t: any) =>
  z
    .object({
      name: z.string().trim().min(1, t("class.errNameEmpty")),
      code: z.string().trim().min(1, t("class.errCodeEmpty")),
      semesterId: z.any().refine(val => typeof val === "number" && val > 0, { message: t("class.errSemesterEmpty") }),
      teacherId: z.any().refine(val => typeof val === "number" && val > 0, { message: t("class.errTeacherEmpty") }),
      courseId: z.any().refine(val => typeof val === "number" && val > 0, { message: t("class.errCourseEmpty") }),
      startDate: z.string().nullable().or(z.literal("")),
      expectedLessons: z.number().nullable(),
    })
    .refine(
      (data) => {
        if (!data.semesterId && (!data.startDate || data.startDate.trim() === "")) {
          return false;
        }
        return true;
      },
      {
        message: t("class.errStartDateEmpty"),
        path: ["startDate"],
      }
    )
    .refine(
      (data) => {
        if (!data.semesterId && (!data.expectedLessons || data.expectedLessons <= 0)) {
          return false;
        }
        return true;
      },
      {
        message: t("class.errExpectedLessonsInvalid"),
        path: ["expectedLessons"],
      }
    );

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

// Fixed time slots — must match FixedTimeSlot.All in the backend (ScheduleOptimizationService.cs)
const FIXED_SLOTS = [
  { index: 0, label: "Ca 1 (07:30 - 09:30)", start: "07:30", end: "09:30" },
  { index: 1, label: "Ca 2 (10:00 - 12:00)", start: "10:00", end: "12:00" },
  { index: 2, label: "Ca 3 (13:30 - 15:30)", start: "13:30", end: "15:30" },
  { index: 3, label: "Ca 4 (16:00 - 18:00)", start: "16:00", end: "18:00" },
  { index: 4, label: "Ca 5 (18:30 - 20:30)", start: "18:30", end: "20:30" },
];

export default function ClassForm({ t, editingItem, onCancel, onSuccess, showToast }: ClassFormProps) {
  const isStarted = editingItem ? editingItem.status !== 0 : false;
  const startDateInputRef = useRef<HTMLInputElement>(null);
  
  const getFriendlyErrorMessage = (msg: string) => {
    if (msg === "ERR_TEACHER_GRADE_LEVEL_INSUFFICIENT") {
      return t("class.errTeacherGradeLevel", { defaultValue: "Giáo viên không đủ điều kiện giảng dạy khóa học này (Band IELTS chưa đạt yêu cầu)." });
    }
    if (msg === "ERR_TEACHER_UNAVAILABLE") {
      return t("class.errTeacherUnavailable");
    }
    if (msg.startsWith("ERR_TEACHER_CONFLICT_")) {
      const classCode = msg.replace("ERR_TEACHER_CONFLICT_", "");
      return t("class.errTeacherConflict", { classCode });
    }
    if (msg.startsWith("ERR_ROOM_CONFLICT_")) {
      const classCode = msg.replace("ERR_ROOM_CONFLICT_", "");
      return t("class.errRoomConflict", { classCode });
    }
    if (msg.startsWith("ERR_ROOM_CAPACITY_EXCEEDED_")) {
      const roomName = msg.replace("ERR_ROOM_CAPACITY_EXCEEDED_", "");
      return t("class.errRoomCapacityExceeded", { roomName });
    }
    if (msg.startsWith("ERR_STUDENT_CONFLICT_")) {
      const parts = msg.replace("ERR_STUDENT_CONFLICT_", "").split("__");
      const count = parseInt(parts[0]) || 0;
      const emailsStr = parts[1] || "";
      const emailsList = emailsStr.split(",").filter(Boolean);
      setConflictingEmails(emailsList);
      return t("class.errStudentConflict", { count });
    }
    return t(`backendMessages.${msg}`, { defaultValue: msg });
  };

  // Form states
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formCourseId, setFormCourseId] = useState<number | null>(null);
  const [formTeacherId, setFormTeacherId] = useState<number | null>(null);
  const [formSemesterId, setFormSemesterId] = useState<number | null>(null);
  const [formExpectedLessons, setFormExpectedLessons] = useState<number>(30);
  const [formDesc, setFormDesc] = useState("");
  const [formStudentIds, setFormStudentIds] = useState<number[]>([]);
  // Map studentId -> enrollType (0=Offline, 1=Online)
  const [formStudentEnrollTypes, setFormStudentEnrollTypes] = useState<Record<number, number>>({});
  const [formStatus, setFormStatus] = useState<number>(0);
  const [formAutoRefund, setFormAutoRefund] = useState(false);
  const [formType, setFormType] = useState<number>(0); // 0=Offline, 1=Online
  const [formUrl, setFormUrl] = useState<string>("");

  // Schedule Configuration Mode: 0 = Weekly, 1 = SpecificSessions (Monthly / Custom)
  const [scheduleConfigMode, setScheduleConfigMode] = useState<number>(0);
  const [specificSchedules, setSpecificSchedules] = useState<SpecificSessionScheduleDto[]>([]);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("ALL");

  // Soft conflict modal states
  const [showSoftConflictModal, setShowSoftConflictModal] = useState(false);
  const [softWarnings, setSoftWarnings] = useState<StudentPreferenceWarning[]>([]);

  // Filter dropdown states
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [semesters, setSemesters] = useState<SemesterItem[]>([]);
  
  // Weekly Schedules state
  const DEFAULT_SLOT = FIXED_SLOTS[4]; // Ca 5 (18:30-20:30) as default
  const [dayConfigs, setDayConfigs] = useState<Record<number, DayConfig>>({
    1: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
    2: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
    3: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
    4: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
    5: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
    6: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
    0: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) => {
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  };

  // Conflict warning states
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);

  // Dropdown search for students
  const [studentSearchText, setStudentSearchText] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<StudentItem[]>([]);
  const [searchResults, setSearchResults] = useState<StudentItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [formNewStudents, setFormNewStudents] = useState<{ name: string; email: string; phone?: string }[]>([]);
  const [formNewTeacherEmail, setFormNewTeacherEmail] = useState<string | null>(null);
  const [formNewTeacherName, setFormNewTeacherName] = useState<string | null>(null);
  const [formNewCourseName, setFormNewCourseName] = useState<string | null>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [conflictingEmails, setConflictingEmails] = useState<string[]>([]);

  // Clear conflicting emails when the student list is modified
  useEffect(() => {
    setConflictingEmails([]);
  }, [formStudentIds, formNewStudents]);

  // Load dropdown options
  useEffect(() => {
    async function loadOptions() {
      try {
        const [cRes, tRes, rRes, sRes] = await Promise.all([
          commonApi.getCourses(1, 100, "", true),
          commonApi.getAvailableTeachers({}),
          commonApi.getRooms(1, 100, "", true),
          commonApi.getSemesters(),
        ]);
        if (cRes.success && cRes.data) setCourses(cRes.data.items || []);
        if (tRes.success && tRes.data) setTeachers(tRes.data || []);
        if (rRes.success && rRes.data) setRooms(rRes.data.items || []);
        if (sRes.success && sRes.data) setSemesters(sRes.data || []);
      } catch (err) {
        console.error("Failed to load options", err);
      }
    }
    loadOptions();
  }, []);

  // Dynamically load available teachers filtered by Course (required band), Semester & Weekly schedule
  useEffect(() => {
    let active = true;
    const weeklySchedules = Object.entries(dayConfigs)
      .filter(([_, config]) => config.selected)
      .map(([dayStr, config]) => ({
        dayOfWeek: Number(dayStr),
        startTime: config.startTime,
        endTime: config.endTime,
        roomId: config.roomId,
      }));

    const timer = setTimeout(async () => {
      try {
        const res = await commonApi.getAvailableTeachers({
          courseId: formCourseId ?? undefined,
          semesterId: formSemesterId ?? undefined,
          startDate: formStartDate || undefined,
          endDate: formEndDate || undefined,
          excludeClassId: editingItem?.id,
          weeklySchedulesJson: weeklySchedules.length > 0 ? JSON.stringify(weeklySchedules) : undefined,
        });
        if (active && res.success && res.data) {
          setTeachers(res.data);
        }
      } catch (err) {
        console.error("Failed to load available teachers", err);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [formCourseId, formSemesterId, formStartDate, formEndDate, dayConfigs, editingItem]);

  // Handle student search query dynamically
  useEffect(() => {
    if (!showDropdown) return;

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (formSemesterId && formCourseId) {
          const res = await semesterApi.getStudentRegistrations(
            formSemesterId,
            studentSearchText,
            formCourseId,
            0, // Status 0 = Pending (Chưa xếp lớp)
            1,
            1000
          );
          if (res.success && res.data) {
            const mappedStudents: StudentItem[] = (res.data.items || []).map((reg) => ({
              id: reg.studentId,
              code: reg.studentCode || "",
              name: reg.studentName,
              email: reg.studentEmail,
              phone: reg.studentPhone || "",
              status: reg.status,
              statusName: "",
            }));
            setSearchResults(mappedStudents);
          } else {
            setSearchResults([]);
          }
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error("Search students error", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [studentSearchText, showDropdown, formSemesterId, formCourseId]);

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

  // Generate session list from weekly pattern
  const generateSessionsFromWeeklyPattern = () => {
    const selectedDays = Object.entries(dayConfigs)
      .filter(([_, config]) => config.selected)
      .map(([dayStr, config]) => ({
        dayOfWeek: Number(dayStr),
        startTime: config.startTime,
        endTime: config.endTime,
        roomId: config.roomId,
      }));

    if (selectedDays.length === 0 || !formStartDate) {
      return [];
    }

    const sessions: SpecificSessionScheduleDto[] = [];
    const curr = new Date(formStartDate);
    const endDate = formEndDate ? new Date(formEndDate) : null;
    let lessonNo = 1;
    const maxLessons = formSemesterId ? 200 : (formExpectedLessons || 30);

    while ((endDate ? curr <= endDate : lessonNo <= maxLessons)) {
      const dayOfWeek = curr.getDay();
      const match = selectedDays.find((d) => d.dayOfWeek === dayOfWeek);
      if (match) {
        const yyyy = curr.getFullYear();
        const mm = String(curr.getMonth() + 1).padStart(2, "0");
        const dd = String(curr.getDate()).padStart(2, "0");
        const dateStr = `${yyyy}-${mm}-${dd}`;

        sessions.push({
          lessonNo,
          scheduleDate: dateStr,
          startTime: match.startTime,
          endTime: match.endTime,
          roomId: match.roomId,
          teacherId: formTeacherId,
        });
        lessonNo++;
      }
      curr.setDate(curr.getDate() + 1);
      if (sessions.length >= 120) break;
    }

    return sessions;
  };

  const studentIdsKey = formStudentIds.join(",");
  const dayConfigsKey = JSON.stringify(dayConfigs);
  const specificSchedulesKey = JSON.stringify(specificSchedules);

  // Cached student registrations for instant client-side conflict checking
  const [studentRegistrationsMap, setStudentRegistrationsMap] = useState<Record<number, {
    preferredDaysOfWeek?: number | null;
    preferredSlotIndex?: number | null;
    studentName?: string;
    studentEmail?: string;
  }>>({});

  useEffect(() => {
    if (!formSemesterId || !formCourseId || formStudentIds.length === 0) {
      return;
    }
    let active = true;
    async function fetchRegistrations() {
      try {
        const res = await semesterApi.getStudentRegistrations(formSemesterId!, "", formCourseId!, undefined, 1, 1000);
        if (active && res.success && res.data && res.data.items) {
          const map: Record<number, any> = {};
          res.data.items.forEach((item) => {
            map[item.studentId] = {
              preferredDaysOfWeek: item.preferredDaysOfWeek,
              preferredSlotIndex: item.preferredSlotIndex,
              studentName: item.studentName,
              studentEmail: item.studentEmail,
            };
          });
          setStudentRegistrationsMap(map);
        }
      } catch (err) {
        console.error("Failed to load student registration preferences", err);
      }
    }
    fetchRegistrations();
    return () => {
      active = false;
    };
  }, [formSemesterId, formCourseId, studentIdsKey]);

  // Instant synchronous soft warning calculation
  const instantSoftWarnings = React.useMemo(() => {
    if (!formStudentIds.length || Object.keys(studentRegistrationsMap).length === 0) {
      return [];
    }

    const DAY_NAMES = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    const warnings: StudentPreferenceWarning[] = [];

    if (scheduleConfigMode === 1) {
      // Check each specific session
      const validSessions = specificSchedules.filter((s) => s.scheduleDate);
      if (validSessions.length === 0) return [];

      for (const sId of formStudentIds) {
        const reg = studentRegistrationsMap[sId];
        if (!reg) continue;

        let hasMismatch = false;
        for (const session of validSessions) {
          const d = new Date(session.scheduleDate);
          if (isNaN(d.getTime())) continue;
          const dayOfWeek = d.getDay();
          const slot = FIXED_SLOTS.find((s) => s.start === (session.startTime || DEFAULT_SLOT.start));
          const slotIdx = slot ? slot.index : -1;

          if (reg.preferredDaysOfWeek !== undefined && reg.preferredDaysOfWeek !== null && reg.preferredDaysOfWeek > 0) {
            if ((reg.preferredDaysOfWeek & (1 << dayOfWeek)) === 0) {
              hasMismatch = true;
              break;
            }
          }
          if (reg.preferredSlotIndex !== undefined && reg.preferredSlotIndex !== null && slotIdx >= 0) {
            if (reg.preferredSlotIndex !== slotIdx) {
              hasMismatch = true;
              break;
            }
          }
        }

        if (hasMismatch) {
          const prefDaysList: string[] = [];
          if (reg.preferredDaysOfWeek) {
            for (let d = 0; d < 7; d++) {
              if ((reg.preferredDaysOfWeek & (1 << d)) !== 0) prefDaysList.push(DAY_NAMES[d]);
            }
          }
          const prefSlotObj = reg.preferredSlotIndex !== null && reg.preferredSlotIndex !== undefined ? FIXED_SLOTS[reg.preferredSlotIndex] : null;

          warnings.push({
            studentId: sId,
            studentName: reg.studentName || `Học sinh #${sId}`,
            studentEmail: reg.studentEmail,
            preferredDays: prefDaysList.length ? prefDaysList.join(", ") : "Bất kỳ",
            preferredSlot: prefSlotObj ? prefSlotObj.label : "Bất kỳ",
          });
        }
      }
    } else {
      // Check weekly pattern
      const selectedDays = Object.entries(dayConfigs)
        .filter(([_, config]) => config.selected)
        .map(([dayStr, config]) => ({
          dayOfWeek: Number(dayStr),
          startTime: config.startTime,
          endTime: config.endTime,
        }));

      if (selectedDays.length === 0) return [];

      for (const sId of formStudentIds) {
        const reg = studentRegistrationsMap[sId];
        if (!reg) continue;

        let hasMismatch = false;
        for (const d of selectedDays) {
          const slot = FIXED_SLOTS.find((s) => s.start === (d.startTime || DEFAULT_SLOT.start));
          const slotIdx = slot ? slot.index : -1;

          if (reg.preferredDaysOfWeek !== undefined && reg.preferredDaysOfWeek !== null && reg.preferredDaysOfWeek > 0) {
            if ((reg.preferredDaysOfWeek & (1 << d.dayOfWeek)) === 0) {
              hasMismatch = true;
              break;
            }
          }
          if (reg.preferredSlotIndex !== undefined && reg.preferredSlotIndex !== null && slotIdx >= 0) {
            if (reg.preferredSlotIndex !== slotIdx) {
              hasMismatch = true;
              break;
            }
          }
        }

        if (hasMismatch) {
          const prefDaysList: string[] = [];
          if (reg.preferredDaysOfWeek) {
            for (let d = 0; d < 7; d++) {
              if ((reg.preferredDaysOfWeek & (1 << d)) !== 0) prefDaysList.push(DAY_NAMES[d]);
            }
          }
          const prefSlotObj = reg.preferredSlotIndex !== null && reg.preferredSlotIndex !== undefined ? FIXED_SLOTS[reg.preferredSlotIndex] : null;

          warnings.push({
            studentId: sId,
            studentName: reg.studentName || `Học sinh #${sId}`,
            studentEmail: reg.studentEmail,
            preferredDays: prefDaysList.length ? prefDaysList.join(", ") : "Bất kỳ",
            preferredSlot: prefSlotObj ? prefSlotObj.label : "Bất kỳ",
          });
        }
      }
    }

    return warnings;
  }, [formStudentIds, studentRegistrationsMap, scheduleConfigMode, specificSchedules, dayConfigs]);

  // Combined real-time soft warnings (instant client-side or verified from backend)
  const displaySoftWarnings = softWarnings.length > 0 ? softWarnings : instantSoftWarnings;

  // Background conflict checking hook (100ms debounce)
  useEffect(() => {
    let active = true;
    async function performConflictCheck() {
      const selectedSchedules = Object.entries(dayConfigs)
        .filter(([_, config]) => config.selected);

      if (scheduleConfigMode === 0 && (!formStartDate || !formExpectedLessons || selectedSchedules.length === 0)) {
        setConflicts([]);
        setSoftWarnings([]);
        return;
      }
      if (scheduleConfigMode === 1 && specificSchedules.length === 0) {
        setConflicts([]);
        setSoftWarnings([]);
        return;
      }

      setIsCheckingConflict(true);
      try {
        const payload = {
          id: editingItem ? editingItem.id : 0,
          code: formCode || "TEMP",
          name: formName || "TEMP",
          status: formStatus,
          type: formType,
          startDate: formStartDate || (specificSchedules[0]?.scheduleDate || null),
          expectedLessons: formExpectedLessons,
          teacherId: formTeacherId,
          semesterId: formSemesterId,
          courseId: formCourseId,
          students: formStudentIds.map((id) => ({
            studentId: id,
            enrollType: formStudentEnrollTypes[id] ?? formType,
          })),
          scheduleConfigMode,
          specificSchedules: scheduleConfigMode === 1 ? specificSchedules : [],
          weeklySchedules: scheduleConfigMode === 0 ? selectedSchedules.map(([dayStr, config]) => ({
            dayOfWeek: Number(dayStr),
            startTime: config.startTime,
            endTime: config.endTime,
            roomId: config.roomId,
          })) : [],
        };

        const res = await classApi.checkConflict(payload);
        if (!active) return;
        if (res.success && res.data) {
          setConflicts(res.data.conflicts || []);
          setSoftWarnings((res.data as any).softWarnings || []);
        } else {
          setConflicts([]);
          setSoftWarnings([]);
        }
      } catch (err) {
        console.error("Conflict check failed", err);
      } finally {
        if (active) setIsCheckingConflict(false);
      }
    }

    const timer = setTimeout(() => {
      performConflictCheck();
    }, 100); // 100ms debounce for instant responsive feel

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [formStartDate, formExpectedLessons, formTeacherId, formSemesterId, formCourseId, studentIdsKey, dayConfigsKey, scheduleConfigMode, specificSchedulesKey, editingItem]);

  // Initialize values when editing
  useEffect(() => {
    if (editingItem) {
      setFormName(editingItem.name);
      setFormCode(editingItem.code);
      setFormStartDate(editingItem.startDate ? editingItem.startDate.split("T")[0] : "");
      setFormEndDate(editingItem.endDate ? editingItem.endDate.split("T")[0] : "");
      setFormCourseId(editingItem.courseId ?? null);
      setFormTeacherId(editingItem.teacherId ?? null);
      setFormSemesterId(editingItem.semesterId ?? null);
      setFormDesc(editingItem.description ?? "");
      setFormStatus(editingItem.status);
      setFormAutoRefund(editingItem.autoRefund ?? false);
      setFormExpectedLessons(editingItem.expectedLessons ?? 30);
      setFormType(editingItem.type ?? 0);
      setFormUrl(editingItem.url ?? "");

      // Load full class details (including students and schedules)
      async function loadClassDetail() {
        try {
          const res = await classApi.getById(editingItem!.id);
          if (res.success && res.data) {
            const detail = res.data;
            const studentIds = (detail.studentClasses || []).map((sc: any) => sc.studentId);
            setFormStudentIds(studentIds);
            // Load enrollType per student
            const enrollTypesMap: Record<number, number> = {};
            (detail.studentClasses || []).forEach((sc: any) => {
              enrollTypesMap[sc.studentId] = sc.enrollType ?? 0;
            });
            setFormStudentEnrollTypes(enrollTypesMap);

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
            if (detail.semesterId !== undefined && detail.semesterId !== null) {
              setFormSemesterId(detail.semesterId);
            }

            // Load specific session schedules if exists
            if (detail.schedules && detail.schedules.length > 0) {
              const loadedSpecific = detail.schedules.map((s: any) => ({
                id: s.id,
                lessonNo: s.lessonNo,
                scheduleDate: s.scheduleDate ? s.scheduleDate.split("T")[0] : "",
                slotId: s.slotId,
                startTime: s.startTime,
                endTime: s.endTime,
                roomId: s.roomId,
                teacherId: s.teacherId,
              }));
              setSpecificSchedules(loadedSpecific);
              setScheduleConfigMode(1);
            }

            // Load weekly schedule config from JSON if exists
            if (detail.weeklySchedulesJson) {
              try {
                const parsedSchedules = JSON.parse(detail.weeklySchedulesJson);
                const loadedConfigs: Record<number, DayConfig> = {
                  1: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
                  2: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
                  3: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
                  4: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
                  5: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
                  6: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
                  0: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
                };
                
                if (Array.isArray(parsedSchedules)) {
                  parsedSchedules.forEach((s: any) => {
                    const day = s.dayOfWeek !== undefined ? s.dayOfWeek : (s.DayOfWeek !== undefined ? s.DayOfWeek : 1);
                    loadedConfigs[day] = {
                      selected: true,
                      startTime: s.startTime ?? s.StartTime ?? DEFAULT_SLOT.start,
                      endTime: s.endTime ?? s.EndTime ?? DEFAULT_SLOT.end,
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
      setFormSemesterId(null);
      setFormDesc("");
      setFormStatus(0);
      setFormAutoRefund(false);
      setFormExpectedLessons(30);
      setFormType(0);
      setFormUrl("");
      setFormStudentIds([]);
      setFormStudentEnrollTypes({});
      setSelectedStudents([]);
      setFormNewStudents([]);
      setFormNewTeacherEmail(null);
      setFormNewTeacherName(null);
      setFormNewCourseName(null);
      setDayConfigs({
        1: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
        2: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
        3: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
        4: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
        5: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
        6: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
        0: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
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
      // Default enrollType = class type
      setFormStudentEnrollTypes((prev) => ({ ...prev, [student.id]: formType }));
    }
    setStudentSearchText("");
    setShowDropdown(false);
  };

  const handleRemoveStudent = (studentId: number) => {
    setFormStudentIds((prev) => prev.filter((id) => id !== studentId));
    setSelectedStudents((prev) => prev.filter((s) => s.id !== studentId));
    setFormStudentEnrollTypes((prev) => {
      const updated = { ...prev };
      delete updated[studentId];
      return updated;
    });
  };

  const handleStudentEnrollTypeChange = (studentId: number, enrollType: number) => {
    setFormStudentEnrollTypes((prev) => ({ ...prev, [studentId]: enrollType }));
  };

  const handleRemoveNewStudent = (email: string) => {
    setFormNewStudents((prev) => prev.filter((s) => s.email !== email));
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];

        const getValue = (cellRef: string) => {
          const cell = ws[cellRef];
          return cell ? String(cell.v).trim() : "";
        };

        const nameVal = getValue("B2");
        const codeVal = getValue("B3");
        const startDateVal = getValue("B4");
        const expectedLessonsVal = getValue("B5");
        const weeklySchedulesVal = getValue("B6");
        const courseNameVal = getValue("B7");
        const teacherEmailVal = getValue("B8");
        const teacherNameVal = getValue("B9");

        if (nameVal) setFormName(nameVal);
        if (codeVal) setFormCode(codeVal);
        if (startDateVal) {
          const parts = startDateVal.split("/");
          if (parts.length === 3) {
            const formatted = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
            setFormStartDate(formatted);
          } else {
            setFormStartDate(startDateVal);
          }
        }
        if (expectedLessonsVal) {
          const lessonsNum = parseInt(expectedLessonsVal, 10);
          if (!isNaN(lessonsNum)) {
            setFormExpectedLessons(lessonsNum);
          }
        }

        // Parse Weekly Schedules
        if (weeklySchedulesVal) {
          const schedules = weeklySchedulesVal.split(",");
          const newConfigs: Record<number, DayConfig> = {
            1: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
            2: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
            3: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
            4: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
            5: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
            6: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
            0: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
          };

          schedules.forEach((sch) => {
            const match = sch.match(/(T\d|CN)\s*\((.*?)-(.*?)\)/i);
            if (match) {
              const dayStr = match[1].toUpperCase();
              const start = match[2].trim();
              const end = match[3].trim();

              let dayOfWeek = 1;
              if (dayStr === "T2") dayOfWeek = 1;
              else if (dayStr === "T3") dayOfWeek = 2;
              else if (dayStr === "T4") dayOfWeek = 3;
              else if (dayStr === "T5") dayOfWeek = 4;
              else if (dayStr === "T6") dayOfWeek = 5;
              else if (dayStr === "T7") dayOfWeek = 6;
              else if (dayStr === "CN" || dayStr === "T8") dayOfWeek = 0;

              newConfigs[dayOfWeek] = {
                selected: true,
                startTime: start,
                endTime: end,
                roomId: null,
              };
            }
          });

          setDayConfigs(newConfigs);
        }

        // Parse Course
        if (courseNameVal && courses.length > 0) {
          const matchedCourse = courses.find(
            (c) => c.name.toLowerCase().trim() === courseNameVal.toLowerCase().trim() ||
                   c.name.toLowerCase().includes(courseNameVal.toLowerCase())
          );
          if (matchedCourse) {
            setFormCourseId(matchedCourse.id);
            setFormNewCourseName(null);
          } else {
            setFormCourseId(null);
            setFormNewCourseName(courseNameVal);
          }
        } else if (courseNameVal) {
          setFormCourseId(null);
          setFormNewCourseName(courseNameVal);
        }

        // Parse Teacher
        if (teacherEmailVal && teachers.length > 0) {
          const matchedTeacher = teachers.find(
            (t) => t.email?.toLowerCase().trim() === teacherEmailVal.toLowerCase().trim()
          );
          if (matchedTeacher) {
            setFormTeacherId(matchedTeacher.id);
            setFormNewTeacherEmail(null);
            setFormNewTeacherName(null);
          } else {
            setFormTeacherId(null);
            setFormNewTeacherEmail(teacherEmailVal);
            setFormNewTeacherName(teacherNameVal || "Giáo viên mới");
          }
        } else if (teacherEmailVal) {
          setFormTeacherId(null);
          setFormNewTeacherEmail(teacherEmailVal);
          setFormNewTeacherName(teacherNameVal || "Giáo viên mới");
        }

        // Parse Student List from Row 13 (index 12)
        const studentsData: { name: string; email: string; phone: string }[] = [];
        let r = 12;
        while (true) {
          const stt = ws[XLSX.utils.encode_cell({ r, c: 0 })];
          const name = ws[XLSX.utils.encode_cell({ r, c: 1 })];
          const email = ws[XLSX.utils.encode_cell({ r, c: 2 })];
          const phone = ws[XLSX.utils.encode_cell({ r, c: 3 })];

          if (!name && !email && !stt) {
            break;
          }

          const nameVal = name ? String(name.v).trim() : "";
          const emailVal = email ? String(email.v).trim() : "";
          const phoneVal = phone ? String(phone.v).trim() : "";

          if (nameVal && emailVal) {
            studentsData.push({ name: nameVal, email: emailVal, phone: phoneVal });
          }
          r++;
        }

        if (studentsData.length > 0) {
          const emailsToCheck = studentsData.map((s) => s.email);
          const checkRes = await studentApi.checkEmails(emailsToCheck);

          if (checkRes.success && checkRes.data) {
            const existingDict = checkRes.data;
            const idsToAdd: number[] = [];
            const loadedStudents: StudentItem[] = [...selectedStudents];
            const newStudentsList: { name: string; email: string; phone?: string }[] = [];

            for (const s of studentsData) {
              const emailLower = s.email.toLowerCase();
              if (existingDict[emailLower]) {
                const id = existingDict[emailLower];
                idsToAdd.push(id);
                
                if (!loadedStudents.some((ls) => ls.id === id)) {
                  loadedStudents.push({
                    id,
                    code: `HS_${id}`,
                    name: s.name,
                    email: s.email,
                    phone: s.phone || null,
                    status: 1,
                    statusName: "Active",
                  });
                }
              } else {
                newStudentsList.push({
                  name: s.name,
                  email: s.email,
                  phone: s.phone || undefined,
                });
              }
            }

            setFormStudentIds((prev) => {
              const merged = [...prev];
              idsToAdd.forEach((id) => {
                if (!merged.includes(id)) merged.push(id);
              });
              return merged;
            });
            setSelectedStudents(loadedStudents);
            setFormNewStudents(newStudentsList);
          }
        }
      } catch (err) {
        console.error("Parse Excel file error", err);
        const errMsg = t("class.errExcelParse");
        setFormError(errMsg);
        showToast(errMsg, "error");
      }
    };
    reader.readAsBinaryString(file);

    if (e.target) e.target.value = "";
  };

  const handleSubmitForm = async (e?: React.FormEvent, forceOverride = false) => {
    if (e) e.preventDefault();
    
    setErrors({});
    const schema = getClassSchema(t);
    const validationResult = schema.safeParse({
      name: formName,
      code: formCode,
      semesterId: formSemesterId,
      teacherId: formTeacherId,
      courseId: formCourseId,
      startDate: formStartDate || (specificSchedules[0]?.scheduleDate || ""),
      expectedLessons: formExpectedLessons,
    });

    if (!validationResult.success) {
      const newErrors: Record<string, string> = {};
      validationResult.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        newErrors[path] = issue.message;
      });
      setErrors(newErrors);
      return;
    }

    const selectedSchedules = Object.entries(dayConfigs)
      .filter(([_, config]) => config.selected);

    if (scheduleConfigMode === 0 && selectedSchedules.length === 0) {
      const msg = t("class.errWeeklyScheduleEmpty", { defaultValue: "Vui lòng chọn ít nhất 1 ngày học trong tuần" });
      setFormError(msg);
      showToast(msg, "error");
      return;
    }

    if (scheduleConfigMode === 1 && specificSchedules.length === 0) {
      const msg = t("class.noSessions");
      setFormError(msg);
      showToast(msg, "error");
      return;
    }

    const finalCode = formCode.trim();

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        code: finalCode,
        name: formName.trim(),
        type: formType,
        url: formUrl.trim() || null,
        description: formDesc.trim() || null,
        startDate: formStartDate || (specificSchedules[0]?.scheduleDate || null),
        endDate: formEndDate || null,
        courseId: formCourseId,
        teacherId: formTeacherId,
        semesterId: formSemesterId,
        status: formStatus,
        autoRefund: formAutoRefund,
        expectedLessons: formSemesterId ? null : formExpectedLessons,
        students: formStudentIds.map((id) => ({
          studentId: id,
          enrollType: formStudentEnrollTypes[id] ?? formType,
        })),
        newStudents: formNewStudents,
        newTeacherEmail: formNewTeacherEmail,
        newTeacherName: formNewTeacherName,
        newCourseName: formNewCourseName,
        scheduleConfigMode,
        forceOverride,
        specificSchedules: scheduleConfigMode === 1 ? specificSchedules : [],
        weeklySchedules: selectedSchedules.map(([dayStr, config]) => ({
          dayOfWeek: Number(dayStr),
          startTime: config.startTime,
          endTime: config.endTime,
          roomId: config.roomId,
        })),
      };

      let res;
      if (editingItem) {
        res = await classApi.update(editingItem.id, {
          ...payload,
          id: editingItem.id,
        });
      } else {
        res = await classApi.create(payload);
      }

      if (res.success && res.data) {
        onSuccess(editingItem ? t("class.updateSuccess", { name: res.data.name }) : t("class.createSuccess", { name: res.data.name }));
      } else {
        if (res.message && res.message.startsWith("WARNING_STUDENT_PREFERENCES_VIOLATED__")) {
          const jsonStr = res.message.replace("WARNING_STUDENT_PREFERENCES_VIOLATED__", "");
          try {
            const parsedWarnings = JSON.parse(jsonStr);
            setSoftWarnings(parsedWarnings);
            setShowSoftConflictModal(true);
            return;
          } catch (parseErr) {
            console.error("Failed to parse soft warnings", parseErr);
          }
        }

        const errMsg = res.message ? getFriendlyErrorMessage(res.message) : (editingItem ? t("class.updateError") : t("class.createError"));
        setFormError(errMsg);
        showToast(errMsg, "error");
      }
    } catch (err) {
      setFormError(t("class.systemError"));
      showToast(t("class.systemError"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableMonths = React.useMemo(() => {
    const months = new Set<string>();
    specificSchedules.forEach((s) => {
      if (s.scheduleDate && s.scheduleDate.length >= 7) {
        months.add(s.scheduleDate.substring(0, 7));
      }
    });
    return Array.from(months).sort();
  }, [specificSchedules]);

  const filteredSpecificSchedules = React.useMemo(() => {
    if (selectedMonthFilter === "ALL") return specificSchedules;
    return specificSchedules.filter((s) => s.scheduleDate.startsWith(selectedMonthFilter));
  }, [specificSchedules, selectedMonthFilter]);

  const handleAddSession = () => {
    let nextDate = formStartDate || new Date().toISOString().split("T")[0];
    if (specificSchedules.length > 0) {
      const last = specificSchedules[specificSchedules.length - 1];
      if (last.scheduleDate) {
        const d = new Date(last.scheduleDate);
        d.setDate(d.getDate() + 2);
        nextDate = d.toISOString().split("T")[0];
      }
    }

    const newSession: SpecificSessionScheduleDto = {
      lessonNo: specificSchedules.length + 1,
      scheduleDate: nextDate,
      startTime: DEFAULT_SLOT.start,
      endTime: DEFAULT_SLOT.end,
      roomId: rooms[0]?.id ?? null,
      teacherId: formTeacherId,
    };
    setSpecificSchedules([...specificSchedules, newSession]);
  };

  const handleRemoveSession = (index: number) => {
    const updated = specificSchedules.filter((_, idx) => idx !== index).map((s, idx) => ({
      ...s,
      lessonNo: idx + 1,
    }));
    setSpecificSchedules(updated);
  };

  const handleUpdateSession = (index: number, field: keyof SpecificSessionScheduleDto, val: any) => {
    setSpecificSchedules((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  return (
    <div className="space-y-6 w-full pb-10">
      <div className="flex items-center justify-between p-5 sm:p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand-500" />
            {editingItem ? t("class.editTitle") : t("class.createTitle")}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {t("class.breadcrumbPath")}{editingItem ? t("class.editBreadcrumb") : t("class.createBreadcrumb")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-250 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 transition-colors"
          >
            {t("class.btnBack")}
          </button>
          <button
            onClick={() => handleSubmitForm()}
            type="button"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 shadow-theme-xs disabled:opacity-60 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {editingItem ? t("class.btnUpdateClass") : t("class.btnCreateClass")}
          </button>
        </div>
      </div>

      <div className="space-y-6 w-full">
          <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-5">
            <h3 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-50 dark:border-gray-800/80 pb-3">
              <Info className="w-4.5 h-4.5 text-brand-500" />
              {t("class.basicInfo")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5 col-span-1 sm:col-span-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("class.colSemester")} <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  value={formSemesterId || ""}
                  disabled={isStarted}
                  isError={!!errors.semesterId}
                  onChange={(value) => {
                    const id = value ? Number(value) : null;
                    setFormSemesterId(id);
                    clearError("semesterId");
                    const matchedSem = semesters.find((s) => s.id === id);
                    if (matchedSem) {
                      setFormStartDate(matchedSem.startDate ? matchedSem.startDate.split("T")[0] : "");
                      setFormEndDate(matchedSem.endDate ? matchedSem.endDate.split("T")[0] : "");
                      clearError("startDate");
                    } else {
                      setFormStartDate("");
                      setFormEndDate("");
                    }
                  }}
                  options={semesters.map((s) => ({
                    value: s.id,
                    label: `${s.name} (${s.code}) - ${s.classCount ?? 0} lớp`,
                  }))}
                  placeholder={t("class.selectSemesterPlaceholder")}
                />
                {errors.semesterId && (
                  <p className="text-xs text-red-500 font-medium mt-1 animate-fadeIn">{errors.semesterId}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("class.formNameLabel")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isStarted}
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    clearError("name");
                  }}
                  placeholder={t("class.formNamePlaceholder")}
                  className={`w-full rounded-lg border bg-transparent px-3 py-2 text-sm focus:outline-hidden dark:bg-gray-955 dark:text-white ${
                    errors.name
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-200 focus:border-brand-500 dark:border-gray-800"
                  } ${
                    isStarted ? "bg-gray-50/60 dark:bg-gray-950/45 text-gray-400 cursor-not-allowed" : "text-gray-805"
                  }`}
                />
                {errors.name && (
                  <p className="text-xs text-red-500 font-medium mt-1 animate-fadeIn">{errors.name}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("class.formCodeLabel")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  disabled={isStarted}
                  value={formCode}
                  onChange={(e) => {
                    setFormCode(e.target.value);
                    clearError("code");
                  }}
                  placeholder={t("class.formCodePlaceholder")}
                  className={`w-full rounded-lg border bg-transparent px-3 py-2 text-sm focus:outline-hidden dark:bg-gray-955 dark:text-white ${
                    errors.code
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-200 focus:border-brand-500 dark:border-gray-800"
                  } ${
                    isStarted ? "bg-gray-50/60 dark:bg-gray-955/45 text-gray-400 cursor-not-allowed" : "text-gray-855"
                  }`}
                />
                {errors.code && (
                  <p className="text-xs text-red-500 font-medium mt-1 animate-fadeIn">{errors.code}</p>
                )}
              </div>
              <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t("class.formStartDateLabel")} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      ref={startDateInputRef}
                      value={formStartDate}
                      disabled={isStarted || !!formSemesterId}
                      onChange={(e) => {
                        setFormStartDate(e.target.value);
                        clearError("startDate");
                      }}
                      className={`w-full rounded-lg border bg-transparent disabled:bg-gray-50/60 dark:disabled:bg-gray-955 pl-3 pr-10 py-2 text-sm focus:outline-hidden dark:bg-gray-955 dark:text-white ${
                        errors.startDate
                          ? "border-red-500 focus:border-red-500"
                          : "border-gray-200 focus:border-brand-500 dark:border-gray-800"
                      } ${
                        isStarted ? "cursor-not-allowed text-gray-400" : "text-gray-855"
                      }`}
                    />
                    {!isStarted && !formSemesterId && (
                      <button
                        type="button"
                        onClick={() => startDateInputRef.current?.showPicker()}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-brand-500 transition-colors"
                      >
                        <Calendar className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                  {errors.startDate && (
                    <p className="text-xs text-red-500 font-medium mt-1 animate-fadeIn">{errors.startDate}</p>
                  )}
                  {formSemesterId && (
                    <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
                      <Info className="w-3 h-3 text-gray-400 shrink-0" />
                      <span>{t("class.startDateHelpSemester")}</span>
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t("class.formEndDateLabel")}{formSemesterId ? "" : t("class.formEndDateExpectedSuffix")}
                  </label>
                  <input
                    type="date"
                    disabled
                    value={formEndDate}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-955 disabled:bg-gray-50 dark:disabled:bg-gray-955/40 disabled:text-gray-400 dark:disabled:text-gray-650 px-3 py-2 text-sm text-gray-855 dark:border-gray-800"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("class.formTeacherLabel")} <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  value={formTeacherId || ""}
                  isError={!!errors.teacherId}
                  onChange={(value) => {
                    setFormTeacherId(value ? Number(value) : null);
                    clearError("teacherId");
                    setFormNewTeacherEmail(null);
                    setFormNewTeacherName(null);
                  }}
                  options={(() => {
                    const opts = teachers.map((t: any) => ({
                      value: t.id,
                      label: `${t.name}${t.code ? ` (${t.code})` : ""}${t.gradeLevelName ? ` · Band ${t.gradeLevelName}` : ""}`,
                    }));
                    if (formTeacherId && !teachers.some((t: any) => t.id === formTeacherId) && editingItem) {
                      opts.unshift({
                        value: formTeacherId,
                        label: `${editingItem.teacherName || "Giáo viên hiện tại"} (Hiện tại)`,
                      });
                    }
                    return opts;
                  })()}
                  placeholder={t("class.formTeacherPlaceholder")}
                />
                {errors.teacherId && (
                  <p className="text-xs text-red-500 font-medium mt-1 animate-fadeIn">{errors.teacherId}</p>
                )}
                {formNewTeacherEmail && (
                  <div className="mt-1.5 p-2 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-150 dark:border-emerald-900/30 rounded-lg flex items-center justify-between gap-2">
                    <span className="text-[11px] text-emerald-800 dark:text-emerald-450 font-medium flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-450 shrink-0" />
                      <span>{t("class.newTeacherDetected")}<strong>{formNewTeacherName}</strong> ({formNewTeacherEmail}){t("class.newTeacherAutoCreate")}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormNewTeacherEmail(null);
                        setFormNewTeacherName(null);
                      }}
                      className="text-gray-400 hover:text-rose-500 transition-colors shrink-0"
                      title={t("class.cancelNewTeacher")}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("class.formCourseLabel")} <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  value={formCourseId || ""}
                  disabled={isStarted}
                  isError={!!errors.courseId}
                  onChange={(value) => {
                    setFormCourseId(value ? Number(value) : null);
                    clearError("courseId");
                    setFormNewCourseName(null);
                  }}
                  options={courses.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  placeholder={t("class.formCoursePlaceholder")}
                />
                {errors.courseId && (
                  <p className="text-xs text-red-500 font-medium mt-1 animate-fadeIn">{errors.courseId}</p>
                )}
                {formNewCourseName && (
                  <div className="mt-1.5 p-2 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-150 dark:border-emerald-900/30 rounded-lg flex items-center justify-between gap-2">
                    <span className="text-[11px] text-emerald-800 dark:text-emerald-450 font-medium flex items-center gap-1.5">
                      <BookPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-450 shrink-0" />
                      <span>{t("class.newCourseDetected")}<strong>{formNewCourseName}</strong>{t("class.newCourseAutoCreate")}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormNewCourseName(null);
                      }}
                      className="text-gray-400 hover:text-rose-500 transition-colors shrink-0"
                      title={t("class.cancelNewCourse")}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="col-span-1 sm:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t("class.formTypeLabel")} <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    {[{ value: 0, label: "Offline", color: "brand" }, { value: 1, label: "Online", color: "emerald" }].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={isStarted}
                        onClick={() => setFormType(opt.value)}
                        className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg border transition-all ${
                          formType === opt.value
                            ? opt.value === 1
                              ? "bg-emerald-50 border-emerald-400 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-600 dark:text-emerald-400"
                              : "bg-brand-50 border-brand-400 text-brand-700 dark:bg-brand-950/20 dark:border-brand-600 dark:text-brand-400"
                            : "bg-white border-gray-200 text-gray-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400 hover:border-gray-300"
                        } ${isStarted ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {formType === 1 && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                      <Info className="w-3 h-3 shrink-0" />
                      {t("class.onlineNoCapacityLimit", { defaultValue: "Lớp Online không bị giới hạn bởi sức chứa phòng học" })}
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t("class.formUrlLabel")}
                    <span className="ml-1 text-[9px] text-gray-400 font-normal">(Google Meet, Zoom, ...)</span>
                  </label>
                  <input
                    type="url"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-955 dark:text-white text-gray-805 placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t("class.formStatusLabel")}
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-955 dark:text-white text-gray-805"
                  >
                    <option value={0} className="dark:bg-gray-950">{t("class.statusPlanning")}</option>
                    <option value={1} className="dark:bg-gray-950">{t("class.statusActive")}</option>
                    <option value={2} className="dark:bg-gray-950">{t("class.statusCompleted")}</option>
                    <option value={3} className="dark:bg-gray-950">{t("class.statusCancelled")}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {t("class.formDescLabel")}
              </label>
              <textarea
                value={formDesc}
                disabled={isStarted}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder={t("class.formDescPlaceholder")}
                rows={3}
                className={`w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white resize-none ${
                  isStarted ? "bg-gray-50/60 dark:bg-gray-950/45 text-gray-400 cursor-not-allowed" : "text-gray-800"
                }`}
              />
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h3 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CalendarDays className="w-4.5 h-4.5 text-brand-500" />
                  {t("class.weeklyScheduleLabel")}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {scheduleConfigMode === 0 
                    ? t("class.weeklyScheduleHelp", { defaultValue: "Chọn các thứ trong tuần và ca học để lặp lại cho cả kỳ." })
                    : t("class.customScheduleHelp", { defaultValue: "Xem và tùy biến chi tiết ngày, ca học, phòng học, giáo viên cho từng buổi học cụ thể." })}
                </p>
              </div>

              <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
                <button
                  type="button"
                  disabled={isStarted}
                  onClick={() => setScheduleConfigMode(0)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    scheduleConfigMode === 0
                      ? "bg-white dark:bg-gray-900 text-brand-600 dark:text-brand-400 shadow-xs"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  } ${isStarted ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <Repeat className="w-3.5 h-3.5" />
                  {t("class.modeWeekly")}
                </button>
                <button
                  type="button"
                  disabled={isStarted}
                  onClick={() => {
                    if (specificSchedules.length === 0) {
                      const generated = generateSessionsFromWeeklyPattern();
                      setSpecificSchedules(generated);
                    }
                    setScheduleConfigMode(1);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    scheduleConfigMode === 1
                      ? "bg-white dark:bg-gray-900 text-brand-600 dark:text-brand-400 shadow-xs"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  } ${isStarted ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  {t("class.modeCustomSessions")}
                  {specificSchedules.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400 rounded-full text-[10px]">
                      {specificSchedules.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {scheduleConfigMode === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 animate-fadeIn">
                {DAYS_OF_WEEK.map((dayObj) => {
                  const day = dayObj.value;
                  const config = dayConfigs[day];
                  const isSelected = config?.selected ?? false;
                  
                  const isDayConflicting = (() => {
                    if (!isSelected) return false;
                    const slot = FIXED_SLOTS.find((s) => s.start === (config?.startTime ?? DEFAULT_SLOT.start));
                    const slotIdx = slot ? slot.index : -1;

                    return formStudentIds.some((sId) => {
                      const reg = studentRegistrationsMap[sId];
                      if (!reg) return false;
                      if (reg.preferredDaysOfWeek !== undefined && reg.preferredDaysOfWeek !== null && reg.preferredDaysOfWeek > 0) {
                        if ((reg.preferredDaysOfWeek & (1 << day)) === 0) return true;
                      }
                      if (reg.preferredSlotIndex !== undefined && reg.preferredSlotIndex !== null && slotIdx >= 0) {
                        if (reg.preferredSlotIndex !== slotIdx) return true;
                      }
                      return false;
                    });
                  })();

                  return (
                    <div
                      key={day}
                      className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between space-y-3.5 ${
                        isSelected
                          ? isDayConflicting
                            ? "bg-amber-50/40 border-amber-400 dark:bg-amber-950/20 dark:border-amber-500 shadow-xs"
                            : "bg-brand-50/20 border-brand-500 dark:bg-brand-950/10 dark:border-brand-500 shadow-xs"
                          : "bg-gray-50/30 border-gray-200 dark:bg-gray-955 dark:border-gray-850 opacity-60 hover:opacity-80"
                      }`}
                    >
                      <label className={`flex items-center justify-between select-none pb-1 border-b border-gray-100 dark:border-gray-800/60 ${
                        isStarted ? "cursor-not-allowed" : "cursor-pointer"
                      }`}>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isStarted}
                            onChange={() => toggleDaySelected(day)}
                            className={`rounded text-brand-600 focus:ring-brand-500 w-4 h-4 ${
                              isStarted ? "cursor-not-allowed" : "cursor-pointer"
                            }`}
                          />
                          <span className={`text-sm font-bold ${
                            isSelected 
                              ? isDayConflicting ? "text-amber-800 dark:text-amber-300" : "text-brand-700 dark:text-brand-400" 
                              : "text-gray-600 dark:text-gray-400"
                          }`}>
                            {dayObj.value === 1 ? t("common.mon") : 
                             dayObj.value === 2 ? t("common.tue") : 
                             dayObj.value === 3 ? t("common.wed") : 
                             dayObj.value === 4 ? t("common.thu") : 
                             dayObj.value === 5 ? t("common.fri") : 
                             dayObj.value === 6 ? t("common.sat") : 
                             t("common.sun")}
                          </span>
                        </div>
                        {isDayConflicting && (
                          <span title={t("class.studentPrefConflictTooltip", { defaultValue: "Lệch nguyện vọng học sinh" })}>
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          </span>
                        )}
                      </label>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                          {t("class.formSlotLabel")}
                        </span>
                        <select
                          disabled={!isSelected || isStarted}
                          value={config?.startTime ?? DEFAULT_SLOT.start}
                          onChange={(e) => {
                            const slot = FIXED_SLOTS.find(s => s.start === e.target.value);
                            if (slot) {
                              updateDayConfig(day, "startTime", slot.start);
                              updateDayConfig(day, "endTime", slot.end);
                            }
                          }}
                          className={`w-full px-2 py-1 text-xs border rounded-md text-gray-800 dark:text-gray-200 disabled:bg-gray-50 dark:disabled:bg-gray-950/60 disabled:text-gray-400 ${
                            isDayConflicting
                              ? "border-amber-400 bg-amber-50/60 dark:border-amber-600 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 focus:border-amber-500"
                              : "border-gray-205 dark:border-gray-800 bg-white dark:bg-gray-900"
                          }`}
                        >
                          {FIXED_SLOTS.map((slot) => (
                            <option key={slot.index} value={slot.start}>
                              {t(`classSchedules.ca${slot.index + 1}`)} ({slot.start} - {slot.end})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                          {t("class.formRoomLabel")}
                        </span>
                        <SearchableSelect
                          size="sm"
                          disabled={!isSelected || isStarted || formType === 1}
                          value={config?.roomId || ""}
                          onChange={(val) => updateDayConfig(day, "roomId", val ? Number(val) : null)}
                          options={[
                            { value: "", label: formType === 1 ? t("class.onlineNoRoomTag", { defaultValue: "(Lớp Online)" }) : t("class.selectRoomEmpty") },
                            ...rooms.map((r) => ({
                              value: r.id,
                              label: `${r.name} - ${r.capacity ? t("class.seats", { count: r.capacity }) : t("class.unlimitedSeats")}`,
                            }))
                          ]}
                          placeholder={formType === 1 ? t("class.onlineNoRoomTag", { defaultValue: "(Lớp Online)" }) : t("class.selectRoomEmpty")}
                          searchPlaceholder={t("class.searchRoomPlaceholder", { defaultValue: "Tìm phòng học..." })}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {scheduleConfigMode === 1 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/70 dark:border-gray-700/70">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 mr-1">{t("class.filterMonthLabel", { defaultValue: "Lọc tháng:" })}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedMonthFilter("ALL")}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                        selectedMonthFilter === "ALL"
                          ? "bg-brand-500 text-white border-brand-500 shadow-xs"
                          : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {t("class.filterAllMonths")} ({specificSchedules.length})
                    </button>
                    {availableMonths.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSelectedMonthFilter(m)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                          selectedMonthFilter === m
                            ? "bg-brand-500 text-white border-brand-500 shadow-xs"
                            : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {m} ({specificSchedules.filter((s) => s.scheduleDate.startsWith(m)).length})
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isStarted}
                      onClick={() => {
                        const generated = generateSessionsFromWeeklyPattern();
                        setSpecificSchedules(generated);
                        showToast(t("class.syncFromWeeklySuccess", { defaultValue: `Đã đồng bộ ${generated.length} buổi học từ lịch tuần!` }), "success");
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-250 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-brand-500" />
                      {t("class.syncFromWeekly")}
                    </button>
                    <button
                      type="button"
                      disabled={isStarted}
                      onClick={handleAddSession}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-500 hover:bg-brand-600 text-white shadow-xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {t("class.addSession")}
                    </button>
                  </div>
                </div>

                {filteredSpecificSchedules.length === 0 ? (
                  <div className="py-10 text-center text-xs text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-950/20">
                    <p>{t("class.noSessions")}</p>
                    <button
                      type="button"
                      onClick={() => {
                        const generated = generateSessionsFromWeeklyPattern();
                        setSpecificSchedules(generated);
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition shadow-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {t("class.syncFromWeekly")}
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-150 dark:border-gray-800 rounded-xl shadow-xs">
                    <table className="w-full text-left text-xs text-gray-700 dark:text-gray-300">
                      <thead className="bg-gray-50 dark:bg-gray-800/80 text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b border-gray-150 dark:border-gray-800">
                        <tr>
                          <th className="px-3.5 py-2.5 w-14 text-center">#</th>
                          <th className="px-3.5 py-2.5 min-w-[150px]">{t("class.scheduleDate")}</th>
                          <th className="px-3.5 py-2.5 min-w-[200px]">{t("class.scheduleSlot")}</th>
                          <th className="px-3.5 py-2.5 min-w-[170px]">{t("class.scheduleRoom")}</th>
                          <th className="px-3.5 py-2.5 min-w-[190px]">{t("class.scheduleTeacher")}</th>
                          <th className="px-3 py-2.5 w-12 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 bg-white dark:bg-gray-900">
                        {filteredSpecificSchedules.map((session, idx) => {
                          const realIndex = specificSchedules.indexOf(session);
                          const sessionDate = session.scheduleDate ? new Date(session.scheduleDate) : null;
                          const dayOfWeekName = sessionDate && !isNaN(sessionDate.getTime()) 
                            ? (sessionDate.getDay() === 0 ? t("common.sun") :
                               sessionDate.getDay() === 1 ? t("common.mon") :
                               sessionDate.getDay() === 2 ? t("common.tue") :
                               sessionDate.getDay() === 3 ? t("common.wed") :
                               sessionDate.getDay() === 4 ? t("common.thu") :
                               sessionDate.getDay() === 5 ? t("common.fri") :
                               t("common.sat")) 
                            : "";

                          const isSessionConflicting = (() => {
                            if (!session.scheduleDate) return false;
                            const d = new Date(session.scheduleDate);
                            if (isNaN(d.getTime())) return false;
                            const dayOfWeek = d.getDay();
                            const slot = FIXED_SLOTS.find((s) => s.start === (session.startTime || DEFAULT_SLOT.start));
                            const slotIdx = slot ? slot.index : -1;

                            return formStudentIds.some((sId) => {
                              const reg = studentRegistrationsMap[sId];
                              if (!reg) return false;
                              if (reg.preferredDaysOfWeek !== undefined && reg.preferredDaysOfWeek !== null && reg.preferredDaysOfWeek > 0) {
                                if ((reg.preferredDaysOfWeek & (1 << dayOfWeek)) === 0) return true;
                              }
                              if (reg.preferredSlotIndex !== undefined && reg.preferredSlotIndex !== null && slotIdx >= 0) {
                                if (reg.preferredSlotIndex !== slotIdx) return true;
                              }
                              return false;
                            });
                          })();

                          return (
                            <tr key={idx} className={`transition-colors ${
                              isSessionConflicting
                                ? "bg-amber-50/35 dark:bg-amber-950/15 hover:bg-amber-50/60 dark:hover:bg-amber-950/25"
                                : "hover:bg-gray-50/70 dark:hover:bg-gray-800/40"
                            }`}>
                              <td className="px-3.5 py-2 text-center font-bold text-gray-500 dark:text-gray-400">
                                <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-[11px]">
                                  {session.lessonNo}
                                </span>
                              </td>
                              <td className="px-3.5 py-2">
                                <div className="flex items-center gap-2">
                                  <div className="relative flex items-center">
                                    <input
                                      type="date"
                                      disabled={isStarted}
                                      value={session.scheduleDate}
                                      onChange={(e) => handleUpdateSession(realIndex, "scheduleDate", e.target.value)}
                                      className={`pl-8 pr-2.5 py-1.5 text-xs font-medium rounded-lg transition shadow-2xs cursor-pointer ${
                                        isSessionConflicting
                                          ? "border border-amber-400 bg-amber-50/70 dark:border-amber-600 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                          : "border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                      }`}
                                    />
                                    <Calendar className={`w-3.5 h-3.5 pointer-events-none absolute left-2.5 ${
                                      isSessionConflicting ? "text-amber-500" : "text-brand-500"
                                    }`} />
                                  </div>
                                  {dayOfWeekName && (
                                    <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md shrink-0 border ${
                                      isSessionConflicting
                                        ? "bg-amber-100/80 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                                        : "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-350 border-brand-200/60 dark:border-brand-800/40"
                                    }`}>
                                      {dayOfWeekName}
                                    </span>
                                  )}
                                  {isSessionConflicting && (
                                    <span className="p-0.5 text-amber-500 dark:text-amber-400 shrink-0" title={t("class.sessionPrefConflictTooltip", { defaultValue: "Buổi này lệch ngày/ca học đã đăng ký của học sinh" })}>
                                      <AlertCircle className="w-4 h-4" />
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3.5 py-2">
                                <select
                                  disabled={isStarted}
                                  value={session.startTime || DEFAULT_SLOT.start}
                                  onChange={(e) => {
                                    const matchedSlot = FIXED_SLOTS.find((s) => s.start === e.target.value);
                                    if (matchedSlot) {
                                      handleUpdateSession(realIndex, "startTime", matchedSlot.start);
                                      handleUpdateSession(realIndex, "endTime", matchedSlot.end);
                                    }
                                  }}
                                  className={`w-full px-2.5 py-1.5 text-xs font-medium rounded-lg focus:outline-hidden ${
                                    isSessionConflicting
                                      ? "border border-amber-400 bg-amber-50/70 dark:border-amber-600 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 focus:border-amber-500"
                                      : "border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:border-brand-500"
                                  }`}
                                >
                                  {FIXED_SLOTS.map((slot) => (
                                    <option key={slot.index} value={slot.start} className="dark:bg-gray-900">
                                      {t(`classSchedules.ca${slot.index + 1}`)} ({slot.start} - {slot.end})
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3.5 py-2 min-w-[175px]">
                                <SearchableSelect
                                  size="sm"
                                  disabled={isStarted || formType === 1}
                                  value={session.roomId || ""}
                                  onChange={(val) => handleUpdateSession(realIndex, "roomId", val ? Number(val) : null)}
                                  options={[
                                    { value: "", label: formType === 1 ? t("class.onlineNoRoomTag", { defaultValue: "(Lớp Online)" }) : t("class.selectRoomEmpty") },
                                    ...rooms.map((r) => ({
                                      value: r.id,
                                      label: `${r.name} - ${r.capacity ? t("class.seats", { count: r.capacity }) : t("class.unlimitedSeats")}`,
                                    }))
                                  ]}
                                  placeholder={formType === 1 ? t("class.onlineNoRoomTag", { defaultValue: "(Lớp Online)" }) : t("class.selectRoomEmpty")}
                                  searchPlaceholder={t("class.searchRoomPlaceholder", { defaultValue: "Tìm phòng học..." })}
                                />
                              </td>
                              <td className="px-3.5 py-2 min-w-[195px]">
                                <SearchableSelect
                                  size="sm"
                                  disabled={isStarted}
                                  value={session.teacherId || ""}
                                  onChange={(val) => handleUpdateSession(realIndex, "teacherId", val ? Number(val) : null)}
                                  options={[
                                    { value: "", label: t("class.defaultTeacher") },
                                    ...teachers.map((tItem: any) => ({
                                      value: tItem.id,
                                      label: `${tItem.name}${tItem.gradeLevelName ? ` · Band ${tItem.gradeLevelName}` : ""}`,
                                    }))
                                  ]}
                                  placeholder={t("class.defaultTeacher")}
                                  searchPlaceholder={t("class.searchTeacherPlaceholder", { defaultValue: "Tìm giáo viên..." })}
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  disabled={isStarted}
                                  onClick={() => handleRemoveSession(realIndex)}
                                  className="text-gray-400 hover:text-rose-500 dark:text-gray-500 dark:hover:text-rose-400 transition p-1 rounded-md"
                                  title={t("class.deleteSession")}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {specificSchedules.length > 0 && (
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1 px-1">
                    <span>
                      {t("class.totalScheduledSessions", {
                        count: specificSchedules.length,
                        defaultValue: `Tổng số buổi đã lên lịch: ${specificSchedules.length} buổi`,
                      })}
                    </span>
                    {specificSchedules[0] && specificSchedules[specificSchedules.length - 1] && (
                      <span>
                        {t("class.timeframeRange", {
                          start: specificSchedules[0].scheduleDate,
                          end: specificSchedules[specificSchedules.length - 1].scheduleDate,
                          defaultValue: `Khung thời gian: ${specificSchedules[0].scheduleDate} đến ${specificSchedules[specificSchedules.length - 1].scheduleDate}`,
                        })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
      </div>

      {/* Cảnh báo trùng lịch cứng (Hard Conflict) */}
      {conflicts.length > 0 && (
        <div className="mx-6 mt-4 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-xl space-y-2 animate-fadeIn">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-400 font-semibold text-xs">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{t("class.conflictsDetectedAlert")}</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-[11px] text-rose-700 dark:text-rose-450">
            {conflicts.map((c, index) => {
              const formattedDate = c.date ? new Date(c.date).toLocaleDateString("vi-VN") : "";
              if (c.type === "Teacher") {
                return (
                  <li key={index} dangerouslySetInnerHTML={{
                    __html: t("class.conflictTeacherMsg", {
                      teacherName: `<strong>${c.teacherName}</strong>`,
                      conflictClassCode: `<strong>${c.conflictClassCode}</strong>`,
                      date: `<strong>${formattedDate}</strong>`,
                      startTime: c.startTime,
                      endTime: c.endTime
                    })
                  }} />
                );
              } else if (c.type === "TeacherAvailability") {
                return (
                  <li key={index} dangerouslySetInnerHTML={{
                    __html: t("class.conflictTeacherAvailabilityMsg", {
                      teacherName: `<strong>${c.teacherName}</strong>`,
                      date: `<strong>${formattedDate}</strong>`,
                      startTime: c.startTime,
                      endTime: c.endTime
                    })
                  }} />
                );
              } else if (c.type === "Student") {
                return (
                  <li key={index}>
                    Học sinh <strong>{c.conflictClassName}</strong> bị trùng lịch học với lớp <strong>{c.conflictClassCode}</strong> vào ngày <strong>{formattedDate}</strong> ({c.startTime} - {c.endTime})
                  </li>
                );
              } else {
                return (
                  <li key={index} dangerouslySetInnerHTML={{
                    __html: t("class.conflictRoomMsg", {
                      roomName: `<strong>${c.roomName}</strong>`,
                      conflictClassCode: `<strong>${c.conflictClassCode}</strong>`,
                      date: `<strong>${formattedDate}</strong>`,
                      startTime: c.startTime,
                      endTime: c.endTime
                    })
                  }} />
                );
              }
            })}
          </ul>
        </div>
      )}

      {/* Cảnh báo nguyện vọng học sinh (Soft Conflict) hiển thị ngay lập tức khi onChange */}
      {displaySoftWarnings.length > 0 && (
        <div className="mx-6 mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700/60 rounded-xl space-y-2.5 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-350 font-bold text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                Cảnh báo nguyện vọng học sinh (Expected Lessons): Có {displaySoftWarnings.length} học sinh không khớp ngày/ca học đã chọn
              </span>
            </div>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              (Hệ thống vẫn cho phép lưu nếu bạn xác nhận tiếp tục)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
            {displaySoftWarnings.map((w, idx) => (
              <div key={idx} className="p-2.5 bg-white dark:bg-gray-900 border border-amber-200/80 dark:border-amber-800/50 rounded-lg text-xs space-y-1 shadow-xs">
                <div className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {w.studentName || "Học sinh"} {w.studentEmail ? <span className="text-[11px] text-gray-400 font-normal">({w.studentEmail})</span> : ""}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 space-y-0.5">
                  <div>Nguyện vọng ngày: <strong className="text-amber-700 dark:text-amber-400">{w.preferredDays || "Bất kỳ"}</strong></div>
                  <div>Nguyện vọng ca: <strong className="text-amber-700 dark:text-amber-400">{w.preferredSlot || "Bất kỳ"}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-250 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 transition-colors"
          >
            {t("class.btnCancelDiscard")}
          </button>
          <button
            onClick={() => handleSubmitForm()}
            type="button"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 shadow-theme-xs disabled:opacity-60 transition-colors"
          >
            {isSubmitting ? t("class.btnSaving") : editingItem ? t("class.btnUpdateClass") : t("class.btnCreateClass")}
          </button>
        </div>
      </div>

      <SoftConflictModal
        isOpen={showSoftConflictModal}
        onClose={() => setShowSoftConflictModal(false)}
        onConfirm={() => {
          setShowSoftConflictModal(false);
          handleSubmitForm(undefined, true);
        }}
        warnings={displaySoftWarnings}
        targetDate={formStartDate || (specificSchedules[0]?.scheduleDate || "")}
        targetSlotLabel={scheduleConfigMode === 1 ? t("class.modeCustomSessions", { defaultValue: "Lịch theo từng buổi" }) : t("class.classScheduleLabel", { defaultValue: "Lịch học của lớp" })}
        loading={isSubmitting}
      />
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { classApi, ClassItem } from "@/services/class.api";
import { courseApi, CourseItem } from "@/services/course.api";
import { teacherApi, TeacherItem } from "@/services/teacher.api";
import { studentApi, StudentItem } from "@/services/student.api";
import { roomApi, RoomItem } from "@/services/room.api";
import { semesterApi, SemesterItem } from "@/services/semester.api";
import { commonApi } from "@/services/common.api";
import { CodeHelper } from "@/helpers/CodeHelper";
import * as XLSX from "xlsx";
import { Calendar, FileSpreadsheet, Plus, Search, X, ArrowLeft, BookOpen, Info, UserPlus, BookPlus, CalendarDays, AlertCircle, Download } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

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

  // Filter dropdown states
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
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
          teacherApi.getAll(1, 100),
          roomApi.getAll(1, 100),
          commonApi.getSemesters(),
        ]);
        if (cRes.success && cRes.data) setCourses(cRes.data.items || []);
        if (tRes.success && tRes.data) setTeachers(tRes.data.items || []);
        if (rRes.success && rRes.data) setRooms(rRes.data.items || []);
        if (sRes.success && sRes.data) setSemesters(sRes.data || []);
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

  // Background conflict checking hook
  useEffect(() => {
    let active = true;
    async function performConflictCheck() {
      const selectedSchedules = Object.entries(dayConfigs)
        .filter(([_, config]) => config.selected);

      if (!formStartDate || !formExpectedLessons || selectedSchedules.length === 0) {
        setConflicts([]);
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
          startDate: formStartDate,
          expectedLessons: formExpectedLessons,
          teacherId: formTeacherId,
          students: [],
          weeklySchedules: selectedSchedules.map(([dayStr, config]) => ({
            dayOfWeek: Number(dayStr),
            startTime: config.startTime,
            endTime: config.endTime,
            roomId: config.roomId,
          })),
        };

        const res = await classApi.checkConflict(payload);
        if (!active) return;
        if (res.success && res.data) {
          setConflicts(res.data.conflicts || []);
        } else {
          setConflicts([]);
        }
      } catch (err) {
        console.error("Conflict check failed", err);
      } finally {
        if (active) setIsCheckingConflict(false);
      }
    }

    const timer = setTimeout(() => {
      performConflictCheck();
    }, 600); // 600ms debounce

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [formStartDate, formExpectedLessons, formTeacherId, dayConfigs, editingItem]);

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

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setErrors({});
    const schema = getClassSchema(t);
    const validationResult = schema.safeParse({
      name: formName,
      code: formCode,
      semesterId: formSemesterId,
      teacherId: formTeacherId,
      courseId: formCourseId,
      startDate: formStartDate,
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
        startDate: formStartDate || null,
        endDate: formEndDate || null,
        courseId: formCourseId,
        teacherId: formTeacherId,
        semesterId: formSemesterId,
        status: formStatus,
        autoRefund: formAutoRefund,
        expectedLessons: formSemesterId ? null : formExpectedLessons,
        students: formStudentIds.map((id) => ({
          studentId: id,
          enrollType: formType,
        })),
        newStudents: formNewStudents,
        newTeacherEmail: formNewTeacherEmail,
        newTeacherName: formNewTeacherName,
        newCourseName: formNewCourseName,
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
          const errMsg = res.message ? getFriendlyErrorMessage(res.message) : t("class.updateError");
          setFormError(errMsg);
          showToast(errMsg, "error");
        }
      } else {
        const res = await classApi.create(payload);
        if (res.success && res.data) {
          onSuccess(t("class.createSuccess", { name: res.data.name }));
        } else {
          const errMsg = res.message ? getFriendlyErrorMessage(res.message) : t("class.createError");
          setFormError(errMsg);
          showToast(errMsg, "error");
        }
      }
    } catch (err) {
      setFormError(t("class.systemError"));
      showToast(t("class.systemError"), "error");
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
            <BookOpen className="w-5 h-5 text-brand-500" />
            {editingItem ? t("class.editTitle") : t("class.createTitle")}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {t("class.breadcrumbPath")}{editingItem ? t("class.editBreadcrumb") : t("class.createBreadcrumb")}
          </p>
        </div>

        <div className="flex items-center gap-3">
           {/* Temporarily hidden Import Excel & Download Template buttons
           <button
             type="button"
             disabled={isStarted}
             onClick={() => excelInputRef.current?.click()}
             className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
               isStarted
                 ? "text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-600"
                 : "text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:hover:bg-emerald-950/40"
             }`}
           >
             <FileSpreadsheet className="w-4.5 h-4.5" />
             {t("class.importExcel")}
           </button>
           <a
             href={isStarted ? undefined : "/class_import_template.xlsx"}
             onClick={(e) => isStarted && e.preventDefault()}
             download
             className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
               isStarted
                 ? "text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-600 pointer-events-none"
                 : "text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-850 dark:border-gray-700 dark:hover:bg-gray-800"
             }`}
           >
             <Download className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
             {t("class.downloadTemplate")}
           </a>
           */}
          <input
            type="file"
            ref={excelInputRef}
            onChange={handleImportExcel}
            accept=".xlsx, .xls"
            style={{ display: "none" }}
          />

          <button
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-850 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("class.btnBack")}
          </button>
          <button
            onClick={handleSubmitForm}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-theme-xs transition-colors disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            {editingItem ? t("class.btnUpdateClass") : t("class.btnCreateClass")}
          </button>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="space-y-6 w-full">
          {/* Card: Thông tin cơ bản */}
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

              {/* Tên lớp học */}
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

              {/* Mã lớp học */}
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

              {/* Nhóm Ngày bắt đầu, Ngày kết thúc trên cùng 1 dòng */}
              <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Ngày bắt đầu */}
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

                {/* Ngày kết thúc */}
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
                  options={teachers.map((t) => ({
                    value: t.id,
                    label: t.name,
                  }))}
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

              {/* Khóa học */}
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

              {/* Loại lớp học, URL & Trạng thái */}
              <div className="col-span-1 sm:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Loại lớp học: Offline / Online */}
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
                      Lớp Online không bị giới hạn bởi sức chứa phòng học
                    </span>
                  )}
                </div>

                {/* URL lớp học */}
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

                {/* Trạng thái lớp học */}
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

              {/* Chọn học sinh */}
              <div className="col-span-1 sm:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("class.formStudentsSelectLabel")}
                </label>
                
                {/* Search Combobox Container */}
                <div ref={dropdownRef} className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t("class.searchStudentsPlaceholder")}
                      value={studentSearchText}
                      onFocus={() => setShowDropdown(true)}
                      onChange={(e) => setStudentSearchText(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white dark:border-gray-800 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                    />
                    <span className="absolute left-3 top-2.5 text-gray-400">
                      <Search className="w-4 h-4 text-gray-400" />
                    </span>
                  </div>

                  {showDropdown && (
                    <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-white dark:bg-gray-955 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg animate-fadeIn pr-1">
                      {isSearching ? (
                        <div className="flex items-center justify-center py-4 text-xs text-gray-500 dark:text-gray-400">
                          <div className="inline-block animate-spin rounded-full h-4.5 w-4.5 border-2 border-brand-500 border-t-transparent mr-2"></div>
                          {t("class.searchingStudents")}
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="py-3 px-4 text-xs text-gray-400 italic">
                          {(!formSemesterId || !formCourseId)
                            ? t("class.selectSemesterAndCourseFirst", { defaultValue: "Vui lòng chọn Học kỳ và Khóa học trước" })
                            : t("class.noStudentsFound")}
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
                                    {t("class.studentAlreadySelectedBadge")}
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
                       {t("class.selectedCountStudents", { count: selectedStudents.length })}
                     </span>
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto pr-1 py-1">
                       {selectedStudents.map((student) => (
                         <div
                           key={student.id}
                           className={`relative p-2.5 border rounded-xl flex flex-col gap-1.5 shadow-theme-xs transition-colors duration-300 animate-fadeIn ${
                             conflictingEmails.includes(student.email || "")
                               ? "bg-white dark:bg-gray-900 border-red-300 dark:border-red-500/50"
                               : "bg-white dark:bg-gray-900 border-gray-150 dark:border-gray-800 hover:border-rose-300 dark:hover:border-rose-500/40"
                           }`}
                         >
                           <div className="flex items-center gap-2.5">
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
                                 {student.email || t("class.noEmail")}
                               </span>
                             </div>

                             {/* Remove Button */}
                             <button
                               type="button"
                               onClick={() => handleRemoveStudent(student.id)}
                               className="absolute right-1.5 top-1.5 text-gray-400 hover:text-rose-500 dark:text-gray-500 dark:hover:text-rose-450 transition-colors p-1"
                               title={t("class.removeStudentTooltip")}
                             >
                               <X className="w-3 h-3" />
                             </button>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                )}

                {/* New Students Imported Cards Region */}
                {formNewStudents.length > 0 && (
                   <div className="mt-3 space-y-2 animate-fadeIn">
                     <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-450 block flex items-center gap-1">
                       <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                       {t("class.newStudentsExcelDetected", { count: formNewStudents.length })}
                     </span>
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto pr-1 py-1">
                       {formNewStudents.map((student) => (
                         <div
                           key={student.email}
                           className={`relative p-2.5 border rounded-xl flex items-center gap-2.5 shadow-theme-xs transition-colors duration-300 ${
                             conflictingEmails.includes(student.email)
                               ? "bg-emerald-50/20 dark:bg-emerald-950/10 border-red-300 dark:border-red-500/50"
                               : "bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-150 dark:border-emerald-900/30 hover:border-rose-300 dark:hover:border-rose-500/40"
                           }`}
                         >
                           <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-450 flex items-center justify-center font-bold text-xs shrink-0">
                             {student.name ? student.name.charAt(0).toUpperCase() : "?"}
                           </div>
                           
                           <div className="min-w-0 flex-1 pr-6">
                             <div className="flex items-center justify-between gap-1">
                               <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                                 {student.name}
                               </span>
                               <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-450 shrink-0">
                                 {t("class.badgeNew")}
                               </span>
                             </div>
                             <span className="block text-[10px] text-gray-500 dark:text-gray-400 truncate">
                               {student.email}
                             </span>
                           </div>

                           <button
                             type="button"
                             onClick={() => handleRemoveNewStudent(student.email)}
                             className="absolute right-1.5 top-1.5 text-gray-400 hover:text-rose-500 dark:text-gray-500 dark:hover:text-rose-450 transition-colors p-1"
                             title={t("class.removeStudentTooltip")}
                           >
                             <X className="w-3 h-3" />
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

          {/* Card: Lịch học hàng tuần */}
          <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-4">
            <div>
              <h3 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-1">
                <CalendarDays className="w-4.5 h-4.5 text-brand-500" />
                {t("class.weeklyScheduleLabel")}
              </h3>
              <p className="text-xs text-gray-500">
                {t("class.weeklyScheduleHelp")}
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
                        : "bg-gray-50/30 border-gray-200 dark:bg-gray-955 dark:border-gray-850 opacity-60 hover:opacity-80"
                    }`}
                  >
                    {/* Header: Checkbox + Day Label */}
                    <label className={`flex items-center gap-2 select-none pb-1 border-b border-gray-100 dark:border-gray-800/60 ${
                      isStarted ? "cursor-not-allowed" : "cursor-pointer"
                    }`}>
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
                        isSelected ? "text-brand-700 dark:text-brand-400" : "text-gray-600 dark:text-gray-400"
                      }`}>
                        {dayObj.value === 1 ? t("common.mon") : 
                         dayObj.value === 2 ? t("common.tue") : 
                         dayObj.value === 3 ? t("common.wed") : 
                         dayObj.value === 4 ? t("common.thu") : 
                         dayObj.value === 5 ? t("common.fri") : 
                         dayObj.value === 6 ? t("common.sat") : 
                         t("common.sun")}
                      </span>
                    </label>

                    {/* Time Slot (fixed dropdown) */}
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
                        className="w-full px-2 py-1 text-xs border border-gray-205 dark:border-gray-800 rounded-md bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 disabled:bg-gray-50 dark:disabled:bg-gray-950/60 disabled:text-gray-400"
                      >
                        {FIXED_SLOTS.map((slot) => (
                          <option key={slot.index} value={slot.start}>
                            {t(`classSchedules.ca${slot.index + 1}`)} ({slot.start} - {slot.end})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Room */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        {t("class.formRoomLabel")}
                      </span>
                      <select
                        disabled={!isSelected || isStarted}
                        value={config?.roomId || ""}
                        onChange={(e) => updateDayConfig(day, "roomId", e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-2 py-1 text-xs border border-gray-205 dark:border-gray-800 rounded-md bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 disabled:bg-gray-50 dark:disabled:bg-gray-955/60 disabled:text-gray-400"
                      >
                        <option value="">{t("class.selectRoomEmpty")}</option>
                        {rooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} - {r.capacity ? t("class.seats", { count: r.capacity }) : t("class.unlimitedSeats")}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

      </div>

      {/* Cảnh báo trùng lịch */}
      {conflicts.length > 0 && (
        <div className="mx-6 mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl space-y-2 animate-fadeIn">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-semibold text-xs">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{t("class.conflictsDetectedAlert")}</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-[11px] text-amber-700 dark:text-amber-450">
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
            onClick={handleSubmitForm}
            type="button"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 shadow-theme-xs disabled:opacity-60 transition-colors"
          >
            {isSubmitting ? t("class.btnSaving") : editingItem ? t("class.btnUpdateClass") : t("class.btnCreateClass")}
          </button>
        </div>
      </div>
    </div>
  );
}

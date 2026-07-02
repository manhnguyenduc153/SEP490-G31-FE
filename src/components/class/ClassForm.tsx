"use client";

import React, { useState, useEffect, useRef } from "react";
import { classApi, ClassItem } from "@/services/class.api";
import { courseApi, CourseItem } from "@/services/course.api";
import { teacherApi, TeacherItem } from "@/services/teacher.api";
import { studentApi, StudentItem } from "@/services/student.api";
import { roomApi, RoomItem } from "@/services/room.api";
import { CodeHelper } from "@/helpers/CodeHelper";
import * as XLSX from "xlsx";
import { Calendar, FileSpreadsheet, Plus, Search, X, ArrowLeft, BookOpen, Info, UserPlus, BookPlus, CalendarDays, AlertCircle } from "lucide-react";

interface ClassFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  editingItem: ClassItem | null;
  onCancel: () => void;
  onSuccess: (message: string) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
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

// Fixed time slots — must match FixedTimeSlot.All in the backend (ScheduleOptimizationService.cs)
const FIXED_SLOTS = [
  { index: 0, label: "Ca 1 (07:30 - 09:30)", start: "07:30", end: "09:30" },
  { index: 1, label: "Ca 2 (10:00 - 12:00)", start: "10:00", end: "12:00" },
  { index: 2, label: "Ca 3 (13:00 - 15:00)", start: "13:00", end: "15:00" },
  { index: 3, label: "Ca 4 (16:00 - 18:00)", start: "16:00", end: "18:00" },
  { index: 4, label: "Ca 5 (19:00 - 21:00)", start: "19:00", end: "21:00" },
];

export default function ClassForm({ t, editingItem, onCancel, onSuccess, showToast }: ClassFormProps) {
  const startDateInputRef = useRef<HTMLInputElement>(null);
  
  const getFriendlyErrorMessage = (msg: string) => {
    if (msg.startsWith("ERR_TEACHER_CONFLICT_")) {
      const classCode = msg.replace("ERR_TEACHER_CONFLICT_", "");
      return `Giáo viên bị trùng lịch dạy với lớp ${classCode}. Vui lòng kiểm tra lại!`;
    }
    if (msg.startsWith("ERR_ROOM_CONFLICT_")) {
      const classCode = msg.replace("ERR_ROOM_CONFLICT_", "");
      return `Phòng học bị trùng lịch với lớp ${classCode}. Vui lòng kiểm tra lại!`;
    }
    if (msg.startsWith("ERR_ROOM_CAPACITY_EXCEEDED_")) {
      const roomName = msg.replace("ERR_ROOM_CAPACITY_EXCEEDED_", "");
      return `Số lượng học sinh vượt quá sức chứa của phòng ${roomName}!`;
    }
    if (msg.startsWith("ERR_STUDENT_CONFLICT_")) {
      const parts = msg.replace("ERR_STUDENT_CONFLICT_", "").split("__");
      const count = parseInt(parts[0]) || 0;
      const emailsStr = parts[1] || "";
      const emailsList = emailsStr.split(",").filter(Boolean);
      setConflictingEmails(emailsList);
      return `Có ${count} học sinh đã có lịch học trùng với lớp khác trong thời gian này. Vui lòng kiểm tra lại các học sinh được highlight viền đỏ!`;
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
  const DEFAULT_SLOT = FIXED_SLOTS[4]; // Ca 5 (19:00-21:00) as default
  const [dayConfigs, setDayConfigs] = useState<Record<number, DayConfig>>({
    1: { selected: true,  startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
    2: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
    3: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
    4: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
    5: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
    6: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
    0: { selected: false, startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
          startDate: formStartDate,
          expectedLessons: formExpectedLessons,
          teacherId: formTeacherId,
          studentIds: [],
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
  }, [formStartDate, formExpectedLessons, formTeacherId, dayConfigs]);

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
      setFormDesc("");
      setFormStatus(0);
      setFormAutoRefund(false);
      setFormExpectedLessons(30);
      setFormStudentIds([]);
      setSelectedStudents([]);
      setFormNewStudents([]);
      setFormNewTeacherEmail(null);
      setFormNewTeacherName(null);
      setFormNewCourseName(null);
      setDayConfigs({
        1: { selected: true,  startTime: DEFAULT_SLOT.start, endTime: DEFAULT_SLOT.end, roomId: null },
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
    }
    setStudentSearchText("");
    setShowDropdown(false);
  };

  const handleRemoveStudent = (studentId: number) => {
    setFormStudentIds((prev) => prev.filter((id) => id !== studentId));
    setSelectedStudents((prev) => prev.filter((s) => s.id !== studentId));
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
        const errMsg = "Không thể đọc file Excel. Vui lòng kiểm tra định dạng.";
        setFormError(errMsg);
        showToast(errMsg, "error");
      }
    };
    reader.readAsBinaryString(file);

    if (e.target) e.target.value = "";
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      const errMsg = "Tên lớp học không được để trống";
      setFormError(errMsg);
      showToast(errMsg, "error");
      return;
    }

    if (!formStartDate) {
      const errMsg = "Ngày bắt đầu không được để trống";
      setFormError(errMsg);
      showToast(errMsg, "error");
      return;
    }

    if (!formExpectedLessons || formExpectedLessons <= 0) {
      const errMsg = "Số buổi dự kiến phải lớn hơn 0";
      setFormError(errMsg);
      showToast(errMsg, "error");
      return;
    }

    const selectedSchedules = Object.entries(dayConfigs)
      .filter(([_, config]) => config.selected);

    const finalCode = formCode.trim();

    if (!finalCode) {
      const errMsg = "Mã lớp học không được để trống";
      setFormError(errMsg);
      showToast(errMsg, "error");
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
            {editingItem ? "Chỉnh Sửa Lớp Học" : "Tạo Lớp Học Mới"}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Trang Chủ - Quản Lý Lớp Học - {editingItem ? "Chỉnh Sửa" : "Tạo Mới"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => excelInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:hover:bg-emerald-950/40 transition-colors"
          >
            <FileSpreadsheet className="w-4.5 h-4.5" />
            Import Excel
          </button>
          <a
            href="/class_import_template.xlsx"
            download
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 transition-colors"
          >
            Tải file mẫu (.xlsx)
          </a>
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
            Quay lại
          </button>
          <button
            onClick={handleSubmitForm}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-theme-xs transition-colors disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            {editingItem ? "Lưu thay đổi" : "Tạo lớp học"}
          </button>
        </div>
      </div>



      {/* Main Form Content */}
      <div className="space-y-6 w-full">
          
          {/* Card: Thông tin cơ bản */}
          <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-5">
            <h3 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-50 dark:border-gray-800/80 pb-3">
              <Info className="w-4.5 h-4.5 text-brand-500" />
              Thông tin cơ bản
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
                  Mã lớp học <span className="text-rose-500">*</span>
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
                      <Calendar className="w-4 h-4 text-gray-400" />
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
                  <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
                    <Info className="w-3 h-3 text-gray-400 shrink-0" />
                    <span>Tự tính dựa trên lịch &amp; số buổi</span>
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
                  onChange={(e) => {
                    setFormTeacherId(e.target.value ? Number(e.target.value) : null);
                    setFormNewTeacherEmail(null);
                    setFormNewTeacherName(null);
                  }}
                  className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-850 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                >
                  <option value="">Chọn giáo viên</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
                {formNewTeacherEmail && (
                  <div className="mt-1.5 p-2 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-150 dark:border-emerald-900/30 rounded-lg flex items-center justify-between gap-2">
                    <span className="text-[11px] text-emerald-800 dark:text-emerald-450 font-medium flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-450 shrink-0" />
                      <span>Giáo viên mới: <strong>{formNewTeacherName}</strong> ({formNewTeacherEmail}) - Sẽ tự động tạo tài khoản.</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormNewTeacherEmail(null);
                        setFormNewTeacherName(null);
                      }}
                      className="text-gray-400 hover:text-rose-500 transition-colors shrink-0"
                      title="Hủy giáo viên mới"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Khóa học */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Khóa học
                </label>
                <select
                  value={formCourseId || ""}
                  onChange={(e) => {
                    setFormCourseId(e.target.value ? Number(e.target.value) : null);
                    setFormNewCourseName(null);
                  }}
                  className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-850 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                >
                  <option value="">Chọn khóa học</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {formNewCourseName && (
                  <div className="mt-1.5 p-2 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-150 dark:border-emerald-900/30 rounded-lg flex items-center justify-between gap-2">
                    <span className="text-[11px] text-emerald-800 dark:text-emerald-450 font-medium flex items-center gap-1.5">
                      <BookPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-450 shrink-0" />
                      <span>Khóa học mới: <strong>{formNewCourseName}</strong> - Sẽ tự động tạo khóa học mới khi lưu.</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormNewCourseName(null);
                      }}
                      className="text-gray-400 hover:text-rose-500 transition-colors shrink-0"
                      title="Hủy khóa học mới"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
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
                      <Search className="w-4 h-4 text-gray-400" />
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
                          className={`relative p-2.5 border rounded-xl flex items-center gap-2.5 shadow-theme-xs transition-colors duration-300 animate-fadeIn ${
                            conflictingEmails.includes(student.email || "")
                              ? "bg-white dark:bg-gray-900 border-red-300 dark:border-red-500/50"
                              : "bg-white dark:bg-gray-900 border-gray-150 dark:border-gray-800 hover:border-rose-300 dark:hover:border-rose-500/40"
                          }`}
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
                            <X className="w-3 h-3" />
                          </button>
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
                      Học sinh mới phát hiện trong Excel ({formNewStudents.length} học sinh) - sẽ tự động tạo tài khoản:
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
                          <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                            {student.name ? student.name.charAt(0).toUpperCase() : "?"}
                          </div>
                          
                          <div className="min-w-0 flex-1 pr-6">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                                {student.name}
                              </span>
                              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-450 shrink-0">
                                [Mới]
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
                            title="Xóa học sinh"
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
                <CalendarDays className="w-4.5 h-4.5 text-brand-500" />
                Lịch học hàng tuần
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

                    {/* Time Slot (fixed dropdown) */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Ca học
                      </span>
                      <select
                        disabled={!isSelected}
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
                          <option key={slot.index} value={slot.start}>{slot.label}</option>
                        ))}
                      </select>
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
            <span>Phát hiện trùng lịch học!</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-[11px] text-amber-700 dark:text-amber-450">
            {conflicts.map((c, index) => {
              const formattedDate = c.date ? new Date(c.date).toLocaleDateString("vi-VN") : "";
              if (c.type === "Teacher") {
                return (
                  <li key={index}>
                    Giáo viên <strong>{c.teacherName}</strong> bận dạy lớp <strong>{c.conflictClassCode}</strong> vào ngày <strong>{formattedDate}</strong> ({c.startTime} - {c.endTime}).
                  </li>
                );
              } else {
                return (
                  <li key={index}>
                    Phòng học <strong>{c.roomName}</strong> bận cho lớp <strong>{c.conflictClassCode}</strong> vào ngày <strong>{formattedDate}</strong> ({c.startTime} - {c.endTime}).
                  </li>
                );
              }
            })}
          </ul>
        </div>
      )}

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

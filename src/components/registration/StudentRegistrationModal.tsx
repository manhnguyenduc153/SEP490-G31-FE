"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import * as XLSX from "xlsx";
import { z } from "zod";
import { studentApi, StudentItem } from "@/services/student.api";
import { courseApi, CourseItem } from "@/services/course.api";
import { semesterApi, StudentRegistrationSaveDto, StudentRegistrationDto, SemesterItem } from "@/services/semester.api";
import { CheckCircle2, AlertTriangle, XCircle, FileSpreadsheet, PlusCircle, Check, Ban } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

interface StudentRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSemesterId: number | null;
  showToast: (msg: string, type?: "success" | "error") => void;
  onSuccess: () => void;
  registrationToEdit?: StudentRegistrationDto | null;
}

const DAYS = [
  { name: "Thứ 2", value: 1, key: "Mon" },
  { name: "Thứ 3", value: 2, key: "Tue" },
  { name: "Thứ 4", value: 3, key: "Wed" },
  { name: "Thứ 5", value: 4, key: "Thu" },
  { name: "Thứ 6", value: 5, key: "Fri" },
  { name: "Thứ 7", value: 6, key: "Sat" },
  { name: "Chủ Nhật", value: 0, key: "Sun" },
];

const SLOTS = [
  { index: 0, name: "Ca 1 (Sáng)", time: "07:30 - 09:30" },
  { index: 1, name: "Ca 2 (Sáng)", time: "10:00 - 12:00" },
  { index: 2, name: "Ca 3 (Chiều)", time: "13:30 - 15:30" },
  { index: 3, name: "Ca 4 (Chiều)", time: "16:00 - 18:00" },
  { index: 4, name: "Ca 5 (Tối)", time: "18:30 - 20:30" },
];

interface PreviewRow {
  studentName: string;
  studentEmail: string;
  studentPhone?: string | null;
  rawCourseName: string;
  courseId: number;
  courseResolved: boolean;
  preferredSlotIndex: number;
  preferredDaysOfWeek: number;
  preferredSlots?: string[];
  enrollType: number; // 0 = Offline, 1 = Online
  hasError: boolean;
  isAlreadyRegistered: boolean;
  errorMsg?: string;
}

export function StudentRegistrationModal({
  isOpen,
  onClose,
  defaultSemesterId,
  showToast,
  onSuccess,
  registrationToEdit,
}: StudentRegistrationModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"excel" | "manual">("excel");

  // Lookup options
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [semesters, setSemesters] = useState<SemesterItem[]>([]);
  const [modalSemesterId, setModalSemesterId] = useState<number | "">("");
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  // Manual Form States
  const [formStudentId, setFormStudentId] = useState<number | "">("");
  const [formCourseId, setFormCourseId] = useState<number | "">("");
  const [formSlotIndex, setFormSlotIndex] = useState<number | "">("");
  const [formDays, setFormDays] = useState<number[]>([]); // no default value
  const [formStatus, setFormStatus] = useState<number>(0);
  const [formEnrollType, setFormEnrollType] = useState<number>(0); // 0 = Offline, 1 = Online
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Manual form validation state
  const [manualErrors, setManualErrors] = useState<string[]>([]);
  const [manualInvalidFields, setManualInvalidFields] = useState<string[]>([]);

  // Excel Import States
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [existingRegistrations, setExistingRegistrations] = useState<StudentRegistrationDto[]>([]);

  // Load select options on open
  useEffect(() => {
    if (!isOpen) return;

    async function loadOptions() {
      setIsLoadingOptions(true);
      try {
        // Fetch all students (limit to 1000 for dropdown)
        const studentRes = await studentApi.getAll(1, 1000, "", 1); // Only active students
        if (studentRes.success && studentRes.data) {
          setStudents(studentRes.data.items || []);
        }

        // Fetch all courses
        const courseRes = await courseApi.getAll(1, 500, "", true);
        if (courseRes.success && courseRes.data) {
          setCourses(courseRes.data.items || []);
        }

        // Fetch all semesters
        const semRes = await semesterApi.getAll();
        if (semRes.success && semRes.data) {
          setSemesters(semRes.data || []);
        }
      } catch (err) {
        console.error("Lỗi khi tải danh sách tùy chọn:", err);
      } finally {
        setIsLoadingOptions(false);
      }
    }

    loadOptions();
    setPreviewRows([]);

    if (registrationToEdit) {
      setFormStudentId(registrationToEdit.studentId);
      setFormCourseId(registrationToEdit.courseId);
      setFormStatus(registrationToEdit.status ?? 0);
      setFormEnrollType(registrationToEdit.enrollType ?? 0);
      setActiveTab("manual");
      setModalSemesterId(registrationToEdit.semesterId);

      setFormSlotIndex(registrationToEdit.preferredSlotIndex ?? 4);
      
      const days: number[] = [];
      const mask = registrationToEdit.preferredDaysOfWeek ?? 62;
      if ((mask & 2) !== 0) days.push(1);
      if ((mask & 4) !== 0) days.push(2);
      if ((mask & 8) !== 0) days.push(3);
      if ((mask & 16) !== 0) days.push(4);
      if ((mask & 32) !== 0) days.push(5);
      if ((mask & 64) !== 0) days.push(6);
      if ((mask & 1) !== 0) days.push(0);
      setFormDays(days);
    } else {
      setFormStudentId("");
      setFormCourseId("");
      setFormSlotIndex("");
      setFormDays([]);
      setFormStatus(0);
      setFormEnrollType(0);
      setActiveTab("excel");
      setModalSemesterId(defaultSemesterId || "");
    }
    setManualErrors([]);
    setManualInvalidFields([]);
  }, [isOpen, defaultSemesterId, registrationToEdit]);

  // Load existing registrations whenever selected semester changes to check duplicates
  useEffect(() => {
    if (!isOpen || !modalSemesterId) {
      setExistingRegistrations([]);
      return;
    }

    async function fetchSemesterRegistrations() {
      try {
        const regRes = await semesterApi.getStudentRegistrations(Number(modalSemesterId), "", null, null, 1, 1000);
        if (regRes.success && regRes.data) {
          setExistingRegistrations(regRes.data.items || []);
        }
      } catch (err) {
        console.error("Lỗi khi tải danh sách đăng ký học kỳ:", err);
      }
    }

    fetchSemesterRegistrations();
  }, [modalSemesterId, isOpen]);

  // Excel Template Generator
  const handleDownloadTemplate = () => {
    const selectedSem = semesters.find((s) => s.id === modalSemesterId);
    const semName = selectedSem ? selectedSem.name : t("registration.excelSemesterFallback", { defaultValue: "Hoc_Ky" });
    const headers = [
      [
        t("registration.excelColName"),
        t("registration.excelColEmail"),
        t("registration.excelColPhone"),
        t("registration.excelColCourse"),
        "Ca mong muốn",
        "Ngày học mong muốn",
        "Loại lớp (Online/Offline)"
      ],
      ["Nguyen Van A", "vana@gmail.com", "0912345678", "IELTS 5.0 - 6.0", "Ca 1", "Thứ 2, Thứ 4", "Offline"],
      ["Tran Thi B", "thib@gmail.com", "0987654321", "IELTS 5.0 - 6.0", "Ca 5", "Thứ 3, Thứ 5", "Online"],
      ["Le Van C", "vanc@gmail.com", "0934567890", "IELTS 5.0 - 6.0", "Ca 2", "Thứ 2, Thứ 4, Thứ 6", "Offline"],
      ["Pham Van D", "vand@gmail.com", "0945678901", "IELTS 4.0 - 5.0", "Ca 3", "Thứ 7, Chủ Nhật", "Online"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${t("registration.modalTemplateFilename")}_${semName.replace(/\s+/g, "_")}.xlsx`);
  };

  // Helper parser for Excel slot strings
  const parsePreferredSlotsFromExcel = (slotsStr: string | undefined, daysStr: string | undefined): string[] => {
    const sStr = (slotsStr || "").toString().trim().toLowerCase();
    const dStr = (daysStr || "").toString().trim().toLowerCase();

    // 1. Parse Slot Index (0 to 4)
    let slotIdx = 4; // default Ca 5
    if (sStr.includes("ca 1") || sStr.includes("ca1") || sStr.includes("sáng 1")) slotIdx = 0;
    else if (sStr.includes("ca 2") || sStr.includes("ca2") || sStr.includes("sáng 2")) slotIdx = 1;
    else if (sStr.includes("ca 3") || sStr.includes("ca3") || sStr.includes("chiều 1")) slotIdx = 2;
    else if (sStr.includes("ca 4") || sStr.includes("ca4") || sStr.includes("chiều 2")) slotIdx = 3;
    else if (sStr.includes("ca 5") || sStr.includes("ca5") || sStr.includes("tối")) slotIdx = 4;
    else {
      const match = sStr.match(/\b([1-5])\b/);
      if (match) slotIdx = parseInt(match[1]) - 1;
    }

    // 2. Parse Days (0 = CN, 1 = T2, 2 = T3, 3 = T4, 4 = T5, 5 = T6, 6 = T7)
    const parsedDays: number[] = [];
    if (!dStr) {
      parsedDays.push(1, 2, 3, 4, 5); // default Mon-Fri
    } else {
      const dayParts = dStr.split(/[;,/]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
      dayParts.forEach((p) => {
        let dVal: number | null = null;
        if (p.includes("chủ") || p.includes("chu") || p.includes("cn") || p.includes("sun")) dVal = 0;
        else if (p.includes("hai") || p.includes("t2") || p.includes("mon") || p.includes("thứ 2") || p.includes("thu 2") || p === "2") dVal = 1;
        else if (p.includes("ba") || p.includes("t3") || p.includes("tue") || p.includes("thứ 3") || p.includes("thu 3") || p === "3") dVal = 2;
        else if (p.includes("tư") || p.includes("tu") || p.includes("t4") || p.includes("wed") || p.includes("thứ 4") || p.includes("thu 4") || p === "4") dVal = 3;
        else if (p.includes("năm") || p.includes("nam") || p.includes("t5") || p.includes("thu 5") || p.includes("thứ 5") || p === "5") dVal = 4;
        else if (p.includes("sáu") || p.includes("sau") || p.includes("t6") || p.includes("fri") || p.includes("thứ 6") || p.includes("thu 6") || p === "6") dVal = 5;
        else if (p.includes("bảy") || p.includes("bay") || p.includes("t7") || p.includes("sat") || p.includes("thứ 7") || p.includes("thu 7") || p === "7") dVal = 6;

        if (dVal !== null && !parsedDays.includes(dVal)) {
          parsedDays.push(dVal);
        }
      });
    }

    if (parsedDays.length === 0) {
      parsedDays.push(1, 2, 3, 4, 5);
    }

    return parsedDays.map((d) => `Slot:${slotIdx}:${d}`);
  };

  const getDaysNameFromMask = (mask: number): string => {
    const names: string[] = [];
    if ((mask & 2) !== 0) names.push("T2");
    if ((mask & 4) !== 0) names.push("T3");
    if ((mask & 8) !== 0) names.push("T4");
    if ((mask & 16) !== 0) names.push("T5");
    if ((mask & 32) !== 0) names.push("T6");
    if ((mask & 64) !== 0) names.push("T7");
    if ((mask & 1) !== 0) names.push("CN");
    return names.join(", ");
  };

  // File Upload Handler (Excel parsing)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);

        if (rows.length === 0) {
          showToast(t("registration.toastExcelEmpty"), "error");
          setIsParsing(false);
          return;
        }

        const parsed: PreviewRow[] = [];
        rows.forEach((row: any) => {
          const rawName = row["Họ Tên"] || row["HọTên"] || row["Name"] || row["studentName"] || row["student_name"] || "";
          const rawEmail = row["Email"] || row["email"] || row["studentEmail"] || "";
          const rawPhone = row["Số điện thoại"] || row["SĐT"] || row["Phone"] || row["phone"] || row["studentPhone"] || "";
          const rawCourse = row["Khóa học"] || row["Khóa"] || row["Course"] || row["course"] || row["courseName"] || "";
          const rawSlot = row["Slot"] || row["Ca mong muốn"] || row["Ca học"] || row["PreferredSlots"] || row["slots"] || "";
          const rawDays = row["DayOfWeek"] || row["Ngày học mong muốn"] || row["Ngày học"] || row["PreferredDays"] || "";
          const rawEnrollType = row["Loại lớp"] || row["Loại lớp (Online/Offline)"] || row["EnrollType"] || row["type"] || "";
 
          const hasError = !rawName.toString().trim() || !rawEmail.toString().trim();
          const preferredSlots = parsePreferredSlotsFromExcel(rawSlot, rawDays);
          
          let preferredSlotIdx = 4;
          let preferredDaysMsk = 62;
          if (preferredSlots.length > 0) {
            const firstParts = preferredSlots[0].split(":");
            preferredSlotIdx = parseInt(firstParts[1]) ?? 4;
            let mask = 0;
            preferredSlots.forEach((s) => {
              const parts = s.split(":");
              const dVal = parseInt(parts[2]);
              mask |= (1 << dVal);
            });
            preferredDaysMsk = mask;
          }
          
          let parsedEnrollType = 0; // default to Offline (0)
          if (rawEnrollType) {
            const normalizedType = rawEnrollType.toString().trim().toLowerCase();
            if (normalizedType.includes("online") || normalizedType === "1") {
              parsedEnrollType = 1;
            }
          }

          // Find course in local list
          const matchedCourse = courses.find(
            (c) => c.name?.toLowerCase() === rawCourse.toString().trim().toLowerCase()
          );

          // Check duplicate check: same email and same course (either by ID or by name)
          const isRegistered = existingRegistrations.some(
            (ex) =>
              ex.studentEmail.toLowerCase() === rawEmail.toString().trim().toLowerCase() &&
              (matchedCourse
                ? ex.courseId === matchedCourse.id
                : ex.courseName?.toLowerCase() === rawCourse.toString().trim().toLowerCase())
          );

          parsed.push({
            studentName: rawName.toString().trim(),
            studentEmail: rawEmail.toString().trim(),
            studentPhone: rawPhone ? rawPhone.toString().trim() : null,
            rawCourseName: rawCourse.toString().trim(),
            courseId: matchedCourse ? matchedCourse.id : 0,
            courseResolved: !!matchedCourse,
            preferredSlotIndex: preferredSlotIdx,
            preferredDaysOfWeek: preferredDaysMsk,
            preferredSlots,
            enrollType: parsedEnrollType,
            hasError,
            isAlreadyRegistered: isRegistered,
            errorMsg: hasError
              ? t("semester.importErrorMissingInfo")
              : isRegistered
              ? t("semester.importAlreadyRegisteredTooltip")
              : undefined,
          });
        });

        setPreviewRows(parsed);
      } catch (err) {
        showToast("Lỗi phân tích file Excel.", "error");
      } finally {
        setIsParsing(false);
      }
    };

    reader.readAsBinaryString(file);
    e.target.value = ""; // Clear file input
  };

  // Submit Excel Registration list
  const handleConfirmImportExcel = async () => {
    if (!modalSemesterId) {
      showToast(t("registration.toastSelectSemesterExcel"), "error");
      return;
    }
    const validRows = previewRows.filter((r) => !r.hasError && !r.isAlreadyRegistered);
    if (validRows.length === 0) {
      showToast(t("registration.toastNoValidRecords"), "error");
      return;
    }

    setIsImporting(true);
    try {
      const payload: StudentRegistrationSaveDto[] = validRows.map((r) => ({
        semesterId: Number(modalSemesterId),
        studentName: r.studentName,
        studentEmail: r.studentEmail,
        studentPhone: r.studentPhone,
        courseId: r.courseId,
        courseName: r.courseId === 0 ? r.rawCourseName : null,
        preferredSlotIndex: r.preferredSlotIndex,
        preferredDaysOfWeek: r.preferredDaysOfWeek,
        preferredSlots: r.preferredSlots || [],
        status: 0,
        enrollType: r.enrollType,
      }));

      const res = await semesterApi.importStudentRegistrations(payload);
      if (res.success) {
        showToast(t("registration.toastImportSuccess", { count: validRows.length }));
        onSuccess();
        onClose();
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`) : t("registration.toastImportError"), "error");
      }
    } catch (err: any) {
      showToast(err.message || t("registration.toastSystemError"), "error");
    } finally {
      setIsImporting(false);
    }
  };

  // Submit Manual Form

  // Submit Manual Form
  const handleConfirmManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const registrationSchema = z.object({
      semesterId: z.union([z.number(), z.literal("")]).refine(
        (v) => v !== "",
        t("registration.errorSelectSemester", { defaultValue: "Vui lòng chọn học kỳ." })
      ),
      studentId: z.union([z.number(), z.literal("")]).refine(
        (v) => v !== "",
        t("registration.errorSelectStudent", { defaultValue: "Vui lòng chọn học viên." })
      ),
      courseId: z.union([z.number(), z.literal("")]).refine(
        (v) => v !== "",
        t("registration.errorSelectCourse", { defaultValue: "Vui lòng chọn khóa học." })
      ),
      slotIndex: z.union([z.number(), z.literal("")]).refine(
        (v) => v !== "",
        "Vui lòng chọn ca học mong muốn."
      ),
      hasDays: z.boolean().refine((val) => val === true, {
        message: "Vui lòng chọn ít nhất một ngày học trong tuần.",
      }),
    });

    const result = registrationSchema.safeParse({
      semesterId: modalSemesterId,
      studentId: registrationToEdit ? registrationToEdit.studentId : formStudentId,
      courseId: formCourseId,
      slotIndex: formSlotIndex,
      hasDays: formDays.length > 0,
    });

    if (!result.success) {
      const fieldErrors: string[] = [];
      const fields: string[] = [];
      result.error.issues.forEach((err) => {
        fieldErrors.push(err.message);
        if (err.path.length > 0) {
          fields.push(err.path[0] === "hasDays" ? "days" : (err.path[0] as string));
        }
      });
      setManualErrors(fieldErrors);
      setManualInvalidFields(fields);
      return;
    }

    const selectedStudent = students.find((s) => s.id === formStudentId);

    // Check duplicate registration
    const emailToCheck = registrationToEdit ? registrationToEdit.studentEmail : selectedStudent?.email;
    const courseIdToCheck = Number(formCourseId);
    const isDuplicate = existingRegistrations.some(
      (r) =>
        r.studentEmail.toLowerCase() === emailToCheck?.toLowerCase() &&
        r.courseId === courseIdToCheck &&
        (!registrationToEdit || r.id !== registrationToEdit.id)
    );

    if (isDuplicate) {
      setManualErrors([t("registration.toastDuplicateError", { defaultValue: "Học viên này đã được đăng ký cho khóa học này trong học kỳ hiện tại!" })]);
      setManualInvalidFields(["courseId", "studentId"]);
      return;
    }

    // Helper functions for slot & mask conversion
    const calculateDaysMask = (days: number[]): number => {
      let mask = 0;
      days.forEach((d) => {
        mask |= (1 << d);
      });
      return mask;
    };

    const getPreferredSlotsFromIndexAndDays = (slotIdx: number, days: number[]): string[] => {
      return days.map((d) => `Slot:${slotIdx}:${d}`);
    };

    setManualErrors([]);
    setManualInvalidFields([]);
    setIsSubmittingManual(true);
    try {
      const payload: StudentRegistrationSaveDto = {
        semesterId: Number(modalSemesterId),
        studentCode: registrationToEdit ? registrationToEdit.studentCode : selectedStudent?.code,
        studentName: registrationToEdit ? registrationToEdit.studentName : selectedStudent?.name || "",
        studentEmail: registrationToEdit ? registrationToEdit.studentEmail : selectedStudent?.email || "",
        studentPhone: registrationToEdit ? registrationToEdit.studentPhone : selectedStudent?.phone,
        courseId: Number(formCourseId),
        preferredSlotIndex: Number(formSlotIndex),
        preferredDaysOfWeek: calculateDaysMask(formDays),
        preferredSlots: getPreferredSlotsFromIndexAndDays(Number(formSlotIndex), formDays),
        status: Number(formStatus),
        enrollType: formEnrollType,
      };

      let res;
      if (registrationToEdit) {
        res = await semesterApi.updateStudentRegistration(registrationToEdit.id, payload);
      } else {
        res = await semesterApi.createStudentRegistration(payload);
      }

      if (res.success) {
        showToast(
          registrationToEdit
            ? t("registration.toastUpdateSuccess", { defaultValue: "Cập nhật đăng ký thành công!" })
            : t("registration.toastRegisterSuccess", { name: payload.studentName })
        );
        onSuccess();
        onClose();
      } else {
        setManualErrors([
          res.message
            ? t(`backendMessages.${res.message}`, { defaultValue: res.message })
            : registrationToEdit
            ? t("registration.toastUpdateError", { defaultValue: "Lỗi cập nhật đăng ký." })
            : t("registration.toastRegisterError")
        ]);
      }
    } catch (err: any) {
      setManualErrors([err.message || t("registration.toastSystemError")]);
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const newImportRows = previewRows.filter((r) => !r.hasError && !r.isAlreadyRegistered);
  const errorRows = previewRows.filter((r) => r.hasError);
  const alreadyRegisteredRows = previewRows.filter((r) => r.isAlreadyRegistered);

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false} className="max-w-[1300px] w-full p-6 sm:p-8">
      <div className="flex flex-col gap-5">
        {/* Header Title */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {registrationToEdit
                ? t("registration.modalEditTitle", { defaultValue: "Cập nhật đăng ký" })
                : t("registration.modalCreateTitle")}
            </h3>
            <div className="flex items-center gap-2 mt-2 w-full max-w-xs">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0">{t("registration.modalSemesterLabel")}</span>
              <SearchableSelect
                disabled={!!registrationToEdit}
                value={modalSemesterId}
                onChange={(value) => {
                  setModalSemesterId(value ? Number(value) : "");
                  setPreviewRows([]);
                  if (manualInvalidFields.includes("semesterId")) {
                    setManualInvalidFields(prev => prev.filter(f => f !== "semesterId"));
                  }
                }}
                options={semesters.map((s) => ({ value: s.id, label: s.name }))}
                placeholder={t("registration.modalSemesterSelect")}
                isError={manualInvalidFields.includes("semesterId")}
              />
            </div>
          </div>

          {/* Navigation Tabs */}
          {!registrationToEdit && (
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg self-start md:self-auto">
              <button
                onClick={() => setActiveTab("excel")}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === "excel"
                    ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                {t("registration.modalTabExcel")}
              </button>
              <button
                onClick={() => setActiveTab("manual")}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === "manual"
                    ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                {t("registration.modalTabManual")}
              </button>
            </div>
          )}
        </div>

        {/* Tab 1: EXCEL IMPORT VIEW */}
        {activeTab === "excel" && (
          <div className="flex flex-col gap-4">
            {!modalSemesterId ? (
              <div className="p-8 text-center text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl font-medium">
                {t("registration.modalSelectSemesterFirst")}
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-150 dark:border-gray-800">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("registration.modalStep1")}</span>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  {t("registration.modalDownloadTemplate")}
                </button>
              </div>

              <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("registration.modalStep2")}</span>
                <label className="flex items-center justify-center px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-theme-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-gray-400" />
                  {t("registration.modalUploadFile")}
                  <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>

            {isParsing && (
              <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-3"></div>
                <span className="text-sm text-gray-500">{t("registration.modalParsingExcel")}</span>
              </div>
            )}

            {!isParsing && previewRows.length > 0 && (
              <div className="flex flex-col gap-3">
                {/* Summary chips */}
                <div className="flex flex-wrap gap-2 items-center text-xs">
                  <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full font-semibold">
                    {t("registration.modalPreviewSummary", { count: previewRows.length })}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900 rounded-full font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    {t("registration.modalPreviewAdd", { count: newImportRows.length })}
                  </span>
                  {alreadyRegisteredRows.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-250 dark:border-amber-900 rounded-full font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      {t("registration.modalPreviewSkip", { count: alreadyRegisteredRows.length })}
                    </span>
                  )}
                  {errorRows.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-full font-semibold">
                      <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      {t("registration.modalPreviewError", { count: errorRows.length })}
                    </span>
                  )}
                </div>

                <div className="max-h-[380px] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800 custom-scrollbar">
                  <table className="w-full border-collapse text-sm text-left">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                        <th className="py-2.5 px-3.5 font-semibold min-w-[150px]">{t("registration.modalColName")}</th>
                        <th className="py-2.5 px-3.5 font-semibold min-w-[200px]">{t("registration.modalColEmail")}</th>
                        <th className="py-2.5 px-3.5 font-semibold min-w-[140px]">{t("registration.modalColCourse")}</th>
                        <th className="py-2.5 px-3.5 font-semibold min-w-[80px]">Ca học</th>
                        <th className="py-2.5 px-3.5 font-semibold min-w-[120px]">Ngày học</th>
                        <th className="py-2.5 px-3.5 font-semibold min-w-[90px]">Loại lớp</th>
                        <th className="py-2.5 px-3.5 font-semibold text-right min-w-[120px]">{t("registration.modalColStatus")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((r, idx) => (
                        <tr
                          key={idx}
                          className={`border-b border-gray-100 dark:border-gray-800/80 ${
                            r.hasError 
                              ? "bg-rose-50/30 dark:bg-rose-950/10 text-gray-400" 
                              : r.isAlreadyRegistered 
                              ? "bg-amber-50/20 dark:bg-amber-950/5 text-gray-400" 
                              : "hover:bg-gray-50/50 dark:hover:bg-gray-800/20"
                          }`}
                        >
                          <td className={`py-2 px-3.5 font-medium ${r.isAlreadyRegistered ? "line-through opacity-70" : "text-gray-800 dark:text-gray-200"}`}>{r.studentName}</td>
                          <td className={`py-2 px-3.5 text-xs ${r.isAlreadyRegistered ? "line-through opacity-70" : ""}`}>{r.studentEmail}</td>
                          <td className={`py-2 px-3.5 ${r.isAlreadyRegistered ? "line-through opacity-70" : ""}`}>{r.rawCourseName}</td>
                          <td className="py-2 px-3.5 text-xs">
                            <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 rounded font-semibold">
                              Ca {r.preferredSlotIndex + 1}
                            </span>
                          </td>
                          <td className="py-2 px-3.5 text-xs font-semibold">
                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded whitespace-nowrap">
                              {getDaysNameFromMask(r.preferredDaysOfWeek)}
                            </span>
                          </td>
                          <td className="py-2 px-3.5 text-xs">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                              r.enrollType === 1
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                                : "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
                            }`}>
                              {r.enrollType === 1 ? "Online" : "Offline"}
                            </span>
                          </td>
                          <td className="py-2 px-3.5 text-right">
                            {r.hasError ? (
                              <span title={r.errorMsg} className="text-xs font-semibold px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900 cursor-help">
                                {t("registration.modalStatusError")}
                              </span>
                            ) : r.isAlreadyRegistered ? (
                              <span title={r.errorMsg} className="text-xs font-semibold px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-full dark:bg-amber-950/10 dark:text-amber-400 dark:border-amber-900 cursor-help">
                                {t("registration.modalStatusRegistered")}
                              </span>
                            ) : (
                              <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900">
                                {t("registration.modalStatusValid")}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
              </>
            )}
            <div className="flex justify-end gap-3 mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-all"
              >
                {t("registration.modalBtnClose")}
              </button>
              {previewRows.length > 0 && (
                <button
                  type="button"
                  disabled={isImporting || newImportRows.length === 0}
                  onClick={handleConfirmImportExcel}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-theme-xs disabled:opacity-50 transition-all"
                >
                  <Check className="w-4 h-4" />
                  {t("registration.modalBtnSaveExcel", { count: newImportRows.length })}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: MANUAL FORM REGISTRATION */}
        {activeTab === "manual" && (
          <form onSubmit={handleConfirmManualSubmit} className="flex flex-col gap-5">
            {!modalSemesterId ? (
              <div className="p-8 text-center text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl font-medium">
                {t("registration.modalManualSelectSemesterFirst")}
              </div>
            ) : isLoadingOptions ? (
              <div className="flex justify-center items-center py-20 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-brand-500 border-t-transparent mr-2"></div>
                {t("registration.modalManualLoading")}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                {/* Select Student */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t("registration.modalManualSelectStudent")} <span className="text-rose-500">*</span>
                  </label>
                  {registrationToEdit ? (
                    <div className="w-full rounded-lg border border-gray-250 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 px-3 py-2.5 text-sm text-gray-855 dark:text-white font-semibold">
                      {registrationToEdit.studentName} ({registrationToEdit.studentCode || "—"} - {registrationToEdit.studentEmail})
                    </div>
                  ) : (
                    <SearchableSelect
                      value={formStudentId}
                      onChange={(value) => {
                        setFormStudentId(value ? Number(value) : "");
                        if (manualInvalidFields.includes("studentId")) {
                          setManualInvalidFields(prev => prev.filter(f => f !== "studentId"));
                        }
                      }}
                      options={students.map((s) => ({
                        value: s.id,
                        label: `${s.name} (${s.code} - ${s.email || "No email"})`
                      }))}
                      placeholder={t("registration.modalManualSelectStudentPlaceholder")}
                      isError={manualInvalidFields.includes("studentId")}
                    />
                  )}
                </div>

                {/* Select Course */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t("registration.modalManualSelectCourse")} <span className="text-rose-500">*</span>
                  </label>
                  <SearchableSelect
                    value={formCourseId}
                    onChange={(value) => {
                      setFormCourseId(value ? Number(value) : "");
                      if (manualInvalidFields.includes("courseId")) {
                        setManualInvalidFields(prev => prev.filter(f => f !== "courseId"));
                      }
                    }}
                    options={courses.map((c) => ({
                      value: c.id,
                      label: c.name
                    }))}
                    placeholder={t("registration.modalManualSelectCoursePlaceholder")}
                    isError={manualInvalidFields.includes("courseId")}
                  />
                </div>

                {/* Select Enroll Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Hình thức học <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    {[{ value: 0, label: "Offline" }, { value: 1, label: "Online" }].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormEnrollType(opt.value)}
                        className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg border transition-all ${
                          formEnrollType === opt.value
                            ? opt.value === 1
                              ? "bg-emerald-50 border-emerald-400 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-600 dark:text-emerald-400"
                              : "bg-brand-50 border-brand-400 text-brand-700 dark:bg-brand-950/20 dark:border-brand-600 dark:text-brand-400"
                            : "bg-white border-gray-200 text-gray-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400 hover:border-gray-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ca học mong muốn */}
                <div className={`space-y-1.5 border rounded-xl p-4 bg-gray-50 dark:bg-gray-900/20 ${
                  manualInvalidFields.includes("slotIndex")
                    ? "border-rose-500 dark:border-rose-500"
                    : "border-gray-200 dark:border-gray-800"
                }`}>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Ca học mong muốn <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {SLOTS.map((s) => (
                      <button
                        key={s.index}
                        type="button"
                        onClick={() => {
                          setFormSlotIndex(s.index);
                          if (manualInvalidFields.includes("slotIndex")) {
                            setManualInvalidFields((prev) => prev.filter((f) => f !== "slotIndex"));
                          }
                        }}
                        className={`py-2 px-1 text-center text-xs font-semibold rounded-lg border transition-all ${
                          formSlotIndex === s.index
                            ? "bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-950/20 dark:border-blue-600 dark:text-blue-400"
                            : "bg-white border-gray-200 text-gray-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400 hover:border-gray-300"
                        }`}
                      >
                        <div>{s.name.split(" ")[0]} {s.name.split(" ")[1] || ""}</div>
                        <div className="text-[9px] font-normal opacity-70 mt-0.5">{s.time}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ngày học mong muốn */}
                <div className={`space-y-1.5 border rounded-xl p-4 bg-gray-50 dark:bg-gray-900/20 ${
                  manualInvalidFields.includes("days")
                    ? "border-rose-500 dark:border-rose-500"
                    : "border-gray-200 dark:border-gray-800"
                }`}>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-2">
                    Ngày học mong muốn <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {DAYS.map((d) => {
                      const isSelected = formDays.includes(d.value);
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setFormDays(formDays.filter((day) => day !== d.value));
                            } else {
                              setFormDays([...formDays, d.value]);
                            }
                            if (manualInvalidFields.includes("days")) {
                              setManualInvalidFields((prev) => prev.filter((f) => f !== "days"));
                            }
                          }}
                          className={`py-2 px-1 text-center text-xs font-semibold rounded-lg border transition-all ${
                            isSelected
                              ? "bg-emerald-50 border-emerald-400 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-600 dark:text-emerald-400"
                              : "bg-white border-gray-200 text-gray-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400 hover:border-gray-300"
                          }`}
                        >
                          {d.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Select Status (Only in Edit Mode) */}
                {registrationToEdit && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {t("registration.modalManualSelectStatus", { defaultValue: "Trạng thái đăng ký" })} <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={formStatus}
                      onChange={(e) => setFormStatus(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-250 bg-transparent px-3 py-2.5 text-sm text-gray-855 focus:border-brand-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-955 dark:text-white cursor-pointer"
                    >
                      <option value="0">{t("registration.statusPending")}</option>
                      <option value="1">{t("registration.statusScheduled")}</option>
                      <option value="2">{t("registration.statusCancelled")}</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              {manualErrors.length > 0 && (
                <div className="p-3 text-sm text-rose-500 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-400 rounded-lg space-y-1">
                  {manualErrors.map((err, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <span className="shrink-0">•</span>
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-all"
              >
                {t("registration.modalBtnClose")}
              </button>
              <button
                type="submit"
                disabled={isSubmittingManual || isLoadingOptions}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-theme-xs disabled:opacity-50 transition-all"
              >
                {isSubmittingManual && (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                )}
                {registrationToEdit 
                  ? t("registration.modalManualBtnUpdate", { defaultValue: "Cập nhật" })
                  : t("registration.modalManualBtnSubmit")}
              </button>
            </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

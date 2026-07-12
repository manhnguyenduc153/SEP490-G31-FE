"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import * as XLSX from "xlsx";
import { studentApi, StudentItem } from "@/services/student.api";
import { courseApi, CourseItem } from "@/services/course.api";
import { semesterApi, StudentRegistrationSaveDto, StudentRegistrationDto, SemesterItem } from "@/services/semester.api";
import { CheckCircle2, AlertTriangle, XCircle, FileSpreadsheet, PlusCircle, Check, Sun, Sunset, Moon, Search } from "lucide-react";
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

interface PreviewRow {
  studentName: string;
  studentEmail: string;
  studentPhone?: string | null;
  rawCourseName: string;
  courseId: number;
  courseResolved: boolean;
  preferredSlots: string[];
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
  const [formSlots, setFormSlots] = useState({
    Morning: false,
    Afternoon: false,
    Evening: false,
  });
  const [formStatus, setFormStatus] = useState<number>(0);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

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
      setFormSlots({
        Morning: registrationToEdit.preferredSlots?.includes("Morning") || false,
        Afternoon: registrationToEdit.preferredSlots?.includes("Afternoon") || false,
        Evening: registrationToEdit.preferredSlots?.includes("Evening") || false,
      });
      setFormStatus(registrationToEdit.status ?? 0);
      setActiveTab("manual");
      setModalSemesterId(registrationToEdit.semesterId);
    } else {
      setFormStudentId("");
      setFormCourseId("");
      setFormSlots({ Morning: false, Afternoon: false, Evening: false });
      setFormStatus(0);
      setActiveTab("excel");
      setModalSemesterId(defaultSemesterId || "");
    }
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
        t("registration.excelColPreferredSlots")
      ],
      ["Nguyen Van A", "vana@gmail.com", "0912345678", "IELTS 5.0 - 6.0", t("registration.slotMorning") + ", " + t("registration.slotAfternoon")],
      ["Tran Thi B", "thib@gmail.com", "0987654321", "IELTS 5.0 - 6.0", t("registration.slotEvening")],
      ["Le Van C", "vanc@gmail.com", "0934567890", "IELTS 5.0 - 6.0", t("registration.slotMorning")],
      ["Pham Van D", "vand@gmail.com", "0945678901", "IELTS 4.0 - 5.0", t("registration.slotAfternoon")],
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${t("registration.modalTemplateFilename")}_${semName.replace(/\s+/g, "_")}.xlsx`);
  };

  // Helper parser for Excel slot strings
  const parsePreferredSlots = (slotsStr: string | undefined): string[] => {
    if (!slotsStr) return ["Morning"];
    const rawSlots = String(slotsStr).split(/[,,;\/]/).map((s) => s.trim().toLowerCase());
    const result: string[] = [];
    rawSlots.forEach((s) => {
      if (s.includes("sáng") || s.includes("morning") || s.includes("sang") || s.includes("1") || s.includes("2"))
        result.push("Morning");
      if (s.includes("chiều") || s.includes("afternoon") || s.includes("chieu") || s.includes("3") || s.includes("4"))
        result.push("Afternoon");
      if (s.includes("tối") || s.includes("evening") || s.includes("toi") || s.includes("night") || s.includes("5"))
        result.push("Evening");
    });
    return result.length > 0 ? [...new Set(result)] : ["Morning"];
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
          const rawSlots = row["Ca mong muốn"] || row["Ca học"] || row["PreferredSlots"] || row["slots"] || "";

          const hasError = !rawName.toString().trim() || !rawEmail.toString().trim();
          const preferred = parsePreferredSlots(rawSlots);

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
            preferredSlots: preferred,
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
        preferredSlots: r.preferredSlots,
        status: 0,
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
  const handleConfirmManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalSemesterId) {
      showToast(t("registration.toastSelectSemesterExcel"), "error");
      return;
    }
    if (!formStudentId) {
      showToast(t("registration.toastSelectStudent"), "error");
      return;
    }
    if (!formCourseId) {
      showToast(t("registration.toastSelectCourse"), "error");
      return;
    }

    const selectedStudent = students.find((s) => s.id === formStudentId);
    if (!selectedStudent && !registrationToEdit) return;

    const slots = Object.entries(formSlots)
      .filter(([_, isChecked]) => isChecked)
      .map(([slotKey]) => slotKey);

    if (slots.length === 0) {
      showToast(t("registration.toastSelectSlot"), "error");
      return;
    }

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
      showToast(t("registration.toastDuplicateError", { defaultValue: "Học viên này đã được đăng ký cho khóa học này trong học kỳ hiện tại!" }), "error");
      return;
    }

    setIsSubmittingManual(true);
    try {
      const payload: StudentRegistrationSaveDto = {
        semesterId: Number(modalSemesterId),
        studentCode: registrationToEdit ? registrationToEdit.studentCode : selectedStudent?.code,
        studentName: registrationToEdit ? registrationToEdit.studentName : selectedStudent?.name || "",
        studentEmail: registrationToEdit ? registrationToEdit.studentEmail : selectedStudent?.email || "",
        studentPhone: registrationToEdit ? registrationToEdit.studentPhone : selectedStudent?.phone,
        courseId: Number(formCourseId),
        preferredSlots: slots,
        status: Number(formStatus),
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
        showToast(
          res.message
            ? t(`backendMessages.${res.message}`, { defaultValue: "Học viên này đã được đăng ký cho khóa học trong học kỳ này!" })
            : registrationToEdit
            ? t("registration.toastUpdateError", { defaultValue: "Lỗi cập nhật đăng ký." })
            : t("registration.toastRegisterError"),
          "error"
        );
      }
    } catch (err: any) {
      showToast(err.message || t("registration.toastSystemError"), "error");
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const newImportRows = previewRows.filter((r) => !r.hasError && !r.isAlreadyRegistered);
  const errorRows = previewRows.filter((r) => r.hasError);
  const alreadyRegisteredRows = previewRows.filter((r) => r.isAlreadyRegistered);

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false} className="max-w-[960px] p-6 sm:p-8">
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
                }}
                options={semesters.map((s) => ({ value: s.id, label: s.name }))}
                placeholder={t("registration.modalSemesterSelect")}
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

                <div className="max-h-[300px] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800 custom-scrollbar">
                  <table className="w-full border-collapse text-sm text-left">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                        <th className="py-2.5 px-3 font-semibold">{t("registration.modalColName")}</th>
                        <th className="py-2.5 px-3 font-semibold">{t("registration.modalColEmail")}</th>
                        <th className="py-2.5 px-3 font-semibold">{t("registration.modalColCourse")}</th>
                        <th className="py-2.5 px-3 font-semibold">{t("registration.modalColSlots")}</th>
                        <th className="py-2.5 px-3 font-semibold text-right">{t("registration.modalColStatus")}</th>
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
                          <td className={`py-2 px-3 font-medium ${r.isAlreadyRegistered ? "line-through opacity-70" : "text-gray-800 dark:text-gray-200"}`}>{r.studentName}</td>
                          <td className={`py-2 px-3 text-xs ${r.isAlreadyRegistered ? "line-through opacity-70" : ""}`}>{r.studentEmail}</td>
                          <td className={`py-2 px-3 ${r.isAlreadyRegistered ? "line-through opacity-70" : ""}`}>{r.rawCourseName}</td>
                          <td className="py-2 px-3 text-xs">
                            {r.preferredSlots.map((s) => (s === "Morning" ? t("registration.slotMorning") : s === "Afternoon" ? t("registration.slotAfternoon") : t("registration.slotEvening"))).join(", ")}
                          </td>
                          <td className="py-2 px-3 text-right">
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
                      onChange={(value) => setFormStudentId(value ? Number(value) : "")}
                      options={students.map((s) => ({
                        value: s.id,
                        label: `${s.name} (${s.code} - ${s.email || "No email"})`
                      }))}
                      placeholder={t("registration.modalManualSelectStudentPlaceholder")}
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
                    onChange={(value) => setFormCourseId(value ? Number(value) : "")}
                    options={courses.map((c) => ({
                      value: c.id,
                      label: c.name
                    }))}
                    placeholder={t("registration.modalManualSelectCoursePlaceholder")}
                  />
                </div>

                {/* Preferred Slots */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                    {t("registration.modalManualSlots")} <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-4 items-center bg-gray-50 dark:bg-gray-955/40 border border-gray-250 dark:border-gray-800 px-4 py-3 rounded-lg">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formSlots.Morning}
                        onChange={(e) => setFormSlots((prev) => ({ ...prev, Morning: e.target.checked }))}
                        className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                      />
                      <span>{t("registration.slotMorning")}</span>
                    </label>

                    <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formSlots.Afternoon}
                        onChange={(e) => setFormSlots((prev) => ({ ...prev, Afternoon: e.target.checked }))}
                        className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                      />
                      <span>{t("registration.slotAfternoon")}</span>
                    </label>

                    <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formSlots.Evening}
                        onChange={(e) => setFormSlots((prev) => ({ ...prev, Evening: e.target.checked }))}
                        className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                      />
                      <span>{t("registration.slotEvening")}</span>
                    </label>
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

            <div className="flex justify-end gap-3 mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
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
          </form>
        )}
      </div>
    </Modal>
  );
}

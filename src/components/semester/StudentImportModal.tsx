"use client";
import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import * as XLSX from "xlsx";
import { courseApi, CourseItem } from "@/services/course.api";
import { semesterApi, StudentRegistrationSaveDto, StudentRegistrationDto } from "@/services/semester.api";
import { CheckCircle2, AlertTriangle, XCircle, Search, Sun, Sunset, Moon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface StudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesterId: number;
  semesterName: string;
  showToast: (msg: string, type?: "success" | "error") => void;
  onImportSuccess: () => void;
}

interface PreviewRow {
  studentName: string;
  studentEmail: string;
  studentPhone?: string | null;
  rawCourseName: string;
  courseId: number;              // 0 = not found → will be auto-created by BE
  courseResolved: boolean;       // true = matched existing course in system
  preferredSlotIndex: number;
  preferredDaysOfWeek: number;
  preferredSlots?: string[];
  enrollType?: number;           // 0 = Offline, 1 = Online
  hasError: boolean;
  isAlreadyRegistered: boolean;  // true = already exists in current semester registrations
  errorMsg?: string;
}

export function StudentImportModal({
  isOpen,
  onClose,
  semesterId,
  semesterName,
  showToast,
  onImportSuccess,
}: StudentImportModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"list" | "import">("list");
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [existingRegistrations, setExistingRegistrations] = useState<StudentRegistrationDto[]>([]);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load courses and current registrations
  const fetchRegistrations = async () => {
    setIsLoadingList(true);
    try {
      const res = await semesterApi.getStudentRegistrations(semesterId, "", null, null, 1, 1000);
      if (res.success && res.data) {
        setExistingRegistrations(res.data.items || []);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách học sinh: ", err);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    async function initData() {
      // Fetch courses
      try {
        const res = await courseApi.getAll(1, 300, "", true);
        if (res.success && res.data) setCourses(res.data.items || []);
      } catch (err) {
        console.error(err);
      }
      
      // Fetch registrations
      await fetchRegistrations();
    }

    initData();
    setPreviewRows([]);
    setActiveTab("list");
    setSearchQuery("");
  }, [isOpen, semesterId]);

  const handleDownloadTemplate = () => {
    const headers = [
      ["Họ Tên", "Email", "Số điện thoại", "Khóa học", "Ca mong muốn", "Ngày học mong muốn"],
      // 6 học viên đăng ký IELTS 5.0 - 6.0 (đủ điều kiện tạo 1 lớp >= 5 học viên)
      ["Nguyễn Văn A", "vana@gmail.com", "0912345678", "IELTS 5.0 - 6.0", "Ca 1", "Thứ 2, Thứ 4"],
      ["Trần Thị B", "thib@gmail.com", "0987654321", "IELTS 5.0 - 6.0", "Ca 5", "Thứ 3, Thứ 5"],
      ["Lê Văn C", "vanc@gmail.com", "0934567890", "IELTS 5.0 - 6.0", "Ca 2", "Thứ 2, Thứ 4, Thứ 6"],
      ["Phạm Văn D", "vand@gmail.com", "0945678901", "IELTS 5.0 - 6.0", "Ca 3", "Thứ 2, Thứ 4, Thứ 6"],
      ["Hoàng Thị E", "thie@gmail.com", "0956789012", "IELTS 5.0 - 6.0", "Ca 5", "Thứ 3, Thứ 5"],
      ["Vũ Văn F", "vanf@gmail.com", "0967890123", "IELTS 5.0 - 6.0", "Ca 1", "Thứ 2, Thứ 4"],
      
      // 6 học viên đăng ký IELTS 4.0 - 5.0 (đủ điều kiện tạo 1 lớp >= 5 học viên)
      ["Đặng Văn G", "vang@gmail.com", "0978901234", "IELTS 4.0 - 5.0", "Ca 3", "Thứ 3, Thứ 5"],
      ["Bùi Thị H", "thih@gmail.com", "0989012345", "IELTS 4.0 - 5.0", "Ca 5", "Thứ 3, Thứ 5"],
      ["Đỗ Văn I", "vani@gmail.com", "0990123456", "IELTS 4.0 - 5.0", "Ca 1", "Thứ 2, Thứ 4, Thứ 6"],
      ["Hồ Văn K", "vank@gmail.com", "0901234567", "IELTS 4.0 - 5.0", "Ca 5", "Thứ 3, Thứ 5"],
      ["Ngô Thị L", "thil@gmail.com", "0911234567", "IELTS 4.0 - 5.0", "Ca 1", "Thứ 7, Chủ Nhật"],
      ["Lý Văn M", "vanm@gmail.com", "0922234567", "IELTS 4.0 - 5.0", "Ca 3", "Thứ 2, Thứ 4"],
      ["Phan Văn P", "vanp@gmail.com", "0955554567", "IELTS 6.0 - 7.0", "Ca 2", "Thứ 2, Thứ 4"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `Template_Dang_Ky_Hoc_Vien_${semesterName.replace(/\s+/g, "_")}.xlsx`);
  };

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
          showToast(t("semester.importErrorExcelEmpty"), "error");
          setIsParsing(false);
          return;
        }

        const parsed: PreviewRow[] = [];

        rows.forEach((row: any) => {
          const name = row["Họ Tên"] || row["HọTên"] || row["Name"] || row["studentName"] || row["student_name"];
          const email = row["Email"] || row["email"] || row["studentEmail"];
          const phone = row["Số điện thoại"] || row["SĐT"] || row["Phone"] || row["phone"] || row["studentPhone"];
          const courseStr = row["Khóa học"] || row["Khóa"] || row["Course"] || row["course"] || row["courseName"];
          const slotStr = row["Slot"] || row["Ca mong muốn"] || row["Ca học"] || row["PreferredSlots"] || row["slots"] || "";
          const daysStr = row["DayOfWeek"] || row["Ngày học mong muốn"] || row["Ngày học"] || "";

          // Validate row
          if (!name || !email) {
            parsed.push({
              studentName: name ? String(name).trim() : "(Không có tên)",
              studentEmail: email ? String(email).trim() : "(Không có email)",
              rawCourseName: courseStr ? String(courseStr).trim() : "",
              courseId: 0,
              courseResolved: false,
              preferredSlotIndex: 4,
              preferredDaysOfWeek: 62,
              hasError: true,
              isAlreadyRegistered: false,
              errorMsg: t("semester.importErrorMissingInfo"),
            });
            return;
          }

          const rawCourseName = courseStr ? String(courseStr).trim() : "";
          const studentEmailTrimmed = String(email).trim().toLowerCase();
          const rawEnrollType = row["Loại lớp (Online/Offline)"] || row["Loại lớp"] || row["EnrollType"] || row["Type"] || "";
          const parsedEnrollType = String(rawEnrollType).toLowerCase().includes("online") ? 1 : 0;

          // Try to match existing course
          let matchedCourse: CourseItem | undefined;
          if (rawCourseName) {
            const lower = rawCourseName.toLowerCase();
            matchedCourse = courses.find(
              (c) => c.name.toLowerCase() === lower || c.code.toLowerCase() === lower
            );
          }

          // Check if already registered in current semester for this specific course
          const isAlready = existingRegistrations.some((reg) => {
            const emailMatch = reg.studentEmail.toLowerCase() === studentEmailTrimmed;
            const courseMatch = matchedCourse 
              ? reg.courseId === matchedCourse.id 
              : reg.courseName?.toLowerCase() === rawCourseName.toLowerCase();
            return emailMatch && courseMatch;
          });

          const preferredSlots = parsePreferredSlotsFromExcel(slotStr, daysStr);
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

          parsed.push({
            studentName: String(name).trim(),
            studentEmail: String(email).trim(),
            studentPhone: phone ? String(phone).trim() : null,
            rawCourseName,
            courseId: matchedCourse ? matchedCourse.id : 0,
            courseResolved: !!matchedCourse,
            preferredSlotIndex: preferredSlotIdx,
            preferredDaysOfWeek: preferredDaysMsk,
            preferredSlots,
            enrollType: parsedEnrollType,
            hasError: false,
            isAlreadyRegistered: isAlready,
          });
        });

        setPreviewRows(parsed);
      } catch (err: any) {
        showToast(t("semester.importErrorExcel") + err.message, "error");
      } finally {
        setIsParsing(false);
        e.target.value = "";
      }
    };

    reader.readAsBinaryString(file);
  };

  const validRows = previewRows.filter((r) => !r.hasError);
  // Only import rows that are valid AND not already registered
  const newImportRows = validRows.filter((r) => !r.isAlreadyRegistered);
  const alreadyRegisteredCount = validRows.filter((r) => r.isAlreadyRegistered).length;
  const errorRows = previewRows.filter((r) => r.hasError);
  const autoCreateRows = newImportRows.filter((r) => !r.courseResolved && r.rawCourseName);

  const handleImport = async () => {
    if (newImportRows.length === 0) {
      showToast(t("semester.importNoNewStudents"), "error");
      return;
    }

    setIsImporting(true);
    const dtos: StudentRegistrationSaveDto[] = newImportRows.map((r) => ({
      semesterId,
      studentName: r.studentName,
      studentEmail: r.studentEmail,
      studentPhone: r.studentPhone,
      courseId: r.courseId,
      courseName: r.courseResolved ? null : r.rawCourseName,
      preferredSlotIndex: r.preferredSlotIndex,
      preferredDaysOfWeek: r.preferredDaysOfWeek,
      preferredSlots: r.preferredSlots || [],
      enrollType: r.enrollType !== undefined ? r.enrollType : 0,
    }));

    try {
      const res = await semesterApi.importStudentRegistrations(dtos);
      if (res.success) {
        const addedCount = res.data?.length || dtos.length;
        if (autoCreateRows.length > 0) {
          showToast(
            t("semester.importSuccessWithCourses", { count: addedCount, courseCount: autoCreateRows.length }),
            "success"
          );
        } else {
          showToast(
            t("semester.importSuccess", { count: addedCount }),
            "success"
          );
        }
        onImportSuccess();
        // Refresh local registration list and switch back to view list
        await fetchRegistrations();
        setActiveTab("list");
        setPreviewRows([]);
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`) : t("semester.importError"), "error");
      }
    } catch (err: any) {
      showToast(err?.message || t("semester.importErrorNetwork"), "error");
    } finally {
      setIsImporting(false);
    }
  };

  // Filter existing registrations for list view
  const filteredRegistrations = existingRegistrations.filter((r) => {
    const query = searchQuery.toLowerCase();
    return (
      r.studentName.toLowerCase().includes(query) ||
      r.studentEmail.toLowerCase().includes(query) ||
      (r.courseName || "").toLowerCase().includes(query) ||
      (r.studentPhone || "").toLowerCase().includes(query)
    );
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false} className="max-w-[1300px] w-full p-6 sm:p-8">
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {t("semester.importTitle")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("sidebar.semesters", { defaultValue: "Học kỳ" })}: <span className="font-semibold text-gray-700 dark:text-gray-200">{semesterName}</span>
            </p>
          </div>
          
          {/* Tabs */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg self-start md:self-auto">
            <button
              onClick={() => setActiveTab("list")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === "list"
                  ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {t("semester.importTabRegistered", { count: existingRegistrations.length })}
            </button>
            <button
              onClick={() => setActiveTab("import")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === "import"
                  ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {t("semester.importTabExcel")}
            </button>
          </div>
        </div>

        {/* Tab CONTENT: 1. LIST VIEW */}
        {activeTab === "list" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                  <Search className="w-4 h-4 text-gray-400" />
                </span>
                <input
                  type="text"
                  placeholder={t("semester.importSearchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {isLoadingList ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                <span className="text-sm text-gray-500">{t("semester.importLoadingList")}</span>
              </div>
            ) : filteredRegistrations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/20 dark:bg-gray-900/10">
                <svg className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  {searchQuery ? t("semester.importNoResults") : t("semester.importNoRegistered")}
                  <br />
                  {!searchQuery && (
                    <button
                      onClick={() => setActiveTab("import")}
                      className="mt-2 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {t("semester.importRegisteredClickImport")}
                    </button>
                  )}
                </p>
              </div>
            ) : (
              <div className="max-h-[360px] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800 custom-scrollbar">
                <table className="w-full border-collapse text-sm text-left">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                      <th className="py-3 px-4 font-semibold">{t("semester.importColName")}</th>
                      <th className="py-3 px-4 font-semibold">{t("semester.importColContact")}</th>
                      <th className="py-3 px-4 font-semibold">{t("semester.importColCourse")}</th>
                      <th className="py-3 px-4 font-semibold">{t("semester.importColPreferredSlots")}</th>
                      <th className="py-3 px-4 font-semibold text-right">{t("semester.importColStatus")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.map((reg) => (
                      <tr key={reg.id} className="border-b border-gray-100 dark:border-gray-800/80 hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                        <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-200">{reg.studentName}</td>
                        <td className="py-3 px-4">
                          <div className="text-gray-800 dark:text-gray-200">{reg.studentEmail}</div>
                          <div className="text-xs text-gray-400">{reg.studentPhone || "—"}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                          {reg.courseName || t("semester.courseIdText", { id: reg.courseId })}
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold whitespace-nowrap">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {(() => {
                              const elements: React.ReactNode[] = [];
                              if (reg.preferredSlotIndex !== null && reg.preferredSlotIndex !== undefined) {
                                elements.push(
                                  <span key="slot" className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 rounded font-semibold border border-blue-100 dark:border-blue-900/30 font-semibold">
                                    Ca {reg.preferredSlotIndex + 1}
                                  </span>
                                );
                              }
                              if (reg.preferredDaysOfWeek !== null && reg.preferredDaysOfWeek !== undefined && reg.preferredDaysOfWeek > 0) {
                                elements.push(
                                  <span key="days" className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                                    {getDaysNameFromMask(reg.preferredDaysOfWeek)}
                                  </span>
                                );
                              }
                              if (elements.length > 0) return elements;

                              const hasSlotFormat = reg.preferredSlots?.some((s) => s.startsWith("Slot:"));
                              if (hasSlotFormat) {
                                const getDayName = (dayVal: number) => {
                                  switch (dayVal) {
                                    case 1: return "T2";
                                    case 2: return "T3";
                                    case 3: return "T4";
                                    case 4: return "T5";
                                    case 5: return "T6";
                                    case 6: return "T7";
                                    case 0: return "CN";
                                    default: return "";
                                  }
                                };
                                const sortedSlots = [...(reg.preferredSlots || [])].sort((a, b) => {
                                  const parse = (str: string) => {
                                    const parts = str.split(":");
                                    return {
                                      slot: parseInt(parts[1]) || 0,
                                      day: parseInt(parts[2]) || 0,
                                    };
                                  };
                                  const pa = parse(a);
                                  const pb = parse(b);
                                  if (pa.day !== pb.day) return pa.day - pb.day;
                                  return pa.slot - pb.slot;
                                });
                                return sortedSlots.map((s) => {
                                  const parts = s.split(":");
                                  const sIdx = parseInt(parts[1]) ?? 0;
                                  const dVal = parseInt(parts[2]) ?? 0;
                                  return (
                                    <span key={s} className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 rounded font-semibold border border-blue-100 dark:border-blue-900/30">
                                      Ca {sIdx + 1} - {getDayName(dVal)}
                                    </span>
                                  );
                                });
                              }

                              if (reg.preferredSlots && reg.preferredSlots.length > 0) {
                                return reg.preferredSlots.map((slot) => (
                                  <span key={slot} className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded mr-1">
                                    {slot === "Morning" ? t("semester.slotMorning") : slot === "Afternoon" ? t("semester.slotAfternoon") : t("semester.slotEvening")}
                                  </span>
                                ));
                              }
                              return <span className="text-xs text-gray-400 italic">{t("semester.slotDefault")}</span>;
                            })()}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            reg.status === 1 
                              ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900" 
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-amber-900"
                          }`}>
                            {reg.status === 1 ? t("semester.statusWaiting") : t("semester.statusAssigned")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                {t("semester.btnCancel")}
              </button>
            </div>
          </div>
        )}

        {/* Tab CONTENT: 2. IMPORT FILE */}
        {activeTab === "import" && (
          <div className="flex flex-col gap-4">
            {/* Step controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("semester.importStep1")}</span>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {t("semester.importDownloadTemplate")}
                </button>
              </div>

              <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("semester.importStep2")}</span>
                <label className="flex items-center justify-center px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-theme-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {t("semester.importUploadFile")}
                  <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>

            {isParsing && (
              <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-3"></div>
                <span className="text-sm text-gray-500">{t("semester.importParsingExcel")}</span>
              </div>
            )}

            {!isParsing && previewRows.length > 0 && (
              <div className="flex flex-col gap-3">
                {/* Summary chips */}
                <div className="flex flex-wrap gap-2 items-center text-xs">
                  <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full font-semibold">
                    {t("semester.importPreviewSummary", { count: previewRows.length })}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900 rounded-full font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    {t("semester.importPreviewAdd", { count: newImportRows.length })}
                  </span>
                  {alreadyRegisteredCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 rounded-full font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      {t("semester.importPreviewSkip", { count: alreadyRegisteredCount })}
                    </span>
                  )}
                  {errorRows.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-full font-semibold">
                      <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      {t("semester.importPreviewError", { count: errorRows.length })}
                    </span>
                  )}
                </div>

                {autoCreateRows.length > 0 && (
                  <div className="p-3 text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-lg">
                    <strong>{t("semester.importTagNewCourse")}:</strong> {t("semester.importPreviewCourseNote")}{" "}
                    {[...new Set(autoCreateRows.map((r) => `"${r.rawCourseName}"`))].join(", ")}.
                  </div>
                )}

                <div className="max-h-[380px] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800 custom-scrollbar">
                  <table className="w-full border-collapse text-sm text-left">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                        <th className="py-2.5 px-3.5 font-semibold min-w-[150px]">{t("semester.importColName")}</th>
                        <th className="py-2.5 px-3.5 font-semibold min-w-[200px]">{t("semester.importColContact")}</th>
                        <th className="py-2.5 px-3.5 font-semibold min-w-[140px]">{t("semester.importColCourse")}</th>
                        <th className="py-2.5 px-3.5 font-semibold min-w-[80px]">Ca học</th>
                        <th className="py-2.5 px-3.5 font-semibold min-w-[120px]">Ngày học</th>
                        <th className="py-2.5 px-3.5 font-semibold min-w-[90px]">Loại lớp</th>
                        <th className="py-2.5 px-3.5 font-semibold text-right min-w-[120px]">{t("semester.importColStatus")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((r, idx) => (
                        <tr
                          key={idx}
                          className={`border-b border-gray-100 dark:border-gray-800/80 ${
                            r.hasError 
                              ? "bg-rose-50/30 dark:bg-rose-950/10" 
                              : r.isAlreadyRegistered 
                              ? "bg-amber-50/20 dark:bg-amber-950/5 text-gray-400" 
                              : "hover:bg-gray-50/50 dark:hover:bg-gray-800/20"
                          }`}
                        >
                          <td className={`py-2 px-3.5 font-medium ${r.isAlreadyRegistered ? "text-gray-400 line-through" : "text-gray-800 dark:text-gray-200"}`}>{r.studentName}</td>
                          <td className="py-2 px-3.5 text-xs">{r.studentEmail}</td>
                          <td className="py-2 px-3.5">
                            {r.hasError ? (
                              <span className="text-gray-400 italic">—</span>
                            ) : r.courseResolved ? (
                              <span>{r.rawCourseName}</span>
                            ) : r.rawCourseName ? (
                              <div>
                                <span>{r.rawCourseName}</span>
                                <span className="ml-1.5 text-xs font-semibold px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded">
                                  {t("semester.importTagNewCourse")}
                                </span>
                              </div>
                            ) : (
                              <span className="text-rose-500 text-xs">{t("semester.importMissingCourse")}</span>
                            )}
                          </td>
                          <td className="py-2 px-3.5 text-xs font-semibold whitespace-nowrap">
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
                              <span
                                title={r.errorMsg}
                                className="text-xs font-semibold px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900 cursor-help"
                              >
                                {t("semester.importBadgeSkipError")}
                              </span>
                            ) : r.isAlreadyRegistered ? (
                              <span
                                title={t("semester.importAlreadyRegisteredTooltip")}
                                className="text-xs font-semibold px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-full dark:bg-amber-950/10 dark:text-amber-400 dark:border-amber-900 cursor-help"
                              >
                                {t("semester.importBadgeSkipRegistered")}
                              </span>
                            ) : (
                              <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900">
                                {t("semester.importBadgeWillAdd")}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewRows([]);
                      setActiveTab("list");
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                  >
                    {t("semester.btnCancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={isImporting || newImportRows.length === 0}
                    className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isImporting ? t("semester.btnProcessing") : t("semester.btnImportCount", { count: newImportRows.length })}
                  </button>
                </div>
              </div>
            )}

            {previewRows.length === 0 && !isParsing && (
              <div className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/20 dark:bg-gray-900/10">
                <svg className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  {t("semester.importInstructions")}
                  <br />
                  <span className="text-xs text-blue-500 font-medium">{t("semester.importSubInstructions")}</span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

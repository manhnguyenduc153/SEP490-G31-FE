"use client";
import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import * as XLSX from "xlsx";
import { courseApi, CourseItem } from "@/services/course.api";
import { semesterApi, StudentRegistrationSaveDto, StudentRegistrationDto } from "@/services/semester.api";

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
  preferredSlots: string[];
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
      const res = await semesterApi.getStudentRegistrations(semesterId);
      if (res.success && res.data) {
        setExistingRegistrations(res.data);
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
      ["Họ Tên", "Email", "Số điện thoại", "Khóa học", "Ca mong muốn"],
      // 6 học viên đăng ký IELTS 5.0 - 6.0 (đủ điều kiện tạo 1 lớp >= 5 học viên)
      ["Nguyễn Văn A", "vana@gmail.com", "0912345678", "IELTS 5.0 - 6.0", "Sáng, Chiều"],
      ["Trần Thị B", "thib@gmail.com", "0987654321", "IELTS 5.0 - 6.0", "Tối"],
      ["Lê Văn C", "vanc@gmail.com", "0934567890", "IELTS 5.0 - 6.0", "Sáng"],
      ["Phạm Văn D", "vand@gmail.com", "0945678901", "IELTS 5.0 - 6.0", "Chiều"],
      ["Hoàng Thị E", "thie@gmail.com", "0956789012", "IELTS 5.0 - 6.0", "Tối"],
      ["Vũ Văn F", "vanf@gmail.com", "0967890123", "IELTS 5.0 - 6.0", "Sáng, Chiều"],
      
      // 6 học viên đăng ký IELTS 4.0 - 5.0 (đủ điều kiện tạo 1 lớp >= 5 học viên)
      ["Đặng Văn G", "vang@gmail.com", "0978901234", "IELTS 4.0 - 5.0", "Chiều"],
      ["Bùi Thị H", "thih@gmail.com", "0989012345", "IELTS 4.0 - 5.0", "Tối"],
      ["Đỗ Văn I", "vani@gmail.com", "0990123456", "IELTS 4.0 - 5.0", "Sáng"],
      ["Hồ Văn K", "vank@gmail.com", "0901234567", "IELTS 4.0 - 5.0", "Tối"],
      ["Ngô Thị L", "thil@gmail.com", "0911234567", "IELTS 4.0 - 5.0", "Sáng, Tối"],
      ["Lý Văn M", "vanm@gmail.com", "0922234567", "IELTS 4.0 - 5.0", "Chiều"],

      // 3 học viên đăng ký IELTS 6.0 - 7.0 (sẽ bị Solver lọc bỏ qua nếu minClassSize = 5)
      ["Dương Văn N", "vann@gmail.com", "0933334567", "IELTS 6.0 - 7.0", "Tối"],
      ["Tống Thị O", "thio@gmail.com", "0944444567", "IELTS 6.0 - 7.0", "Sáng"],
      ["Phan Văn P", "vanp@gmail.com", "0955554567", "IELTS 6.0 - 7.0", "Chiều"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `Template_Dang_Ky_Hoc_Vien_${semesterName.replace(/\s+/g, "_")}.xlsx`);
  };

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
          showToast("File Excel trống hoặc không đúng định dạng.", "error");
          setIsParsing(false);
          return;
        }

        const parsed: PreviewRow[] = [];

        rows.forEach((row: any) => {
          const name = row["Họ Tên"] || row["HọTên"] || row["Name"] || row["studentName"] || row["student_name"];
          const email = row["Email"] || row["email"] || row["studentEmail"];
          const phone = row["Số điện thoại"] || row["SĐT"] || row["Phone"] || row["phone"] || row["studentPhone"];
          const courseStr = row["Khóa học"] || row["Khóa"] || row["Course"] || row["course"] || row["courseName"];
          const slotsStr = row["Ca mong muốn"] || row["Ca học"] || row["PreferredSlots"] || row["slots"];

          // Validate row
          if (!name || !email) {
            parsed.push({
              studentName: name ? String(name).trim() : "(Không có tên)",
              studentEmail: email ? String(email).trim() : "(Không có email)",
              rawCourseName: courseStr ? String(courseStr).trim() : "",
              courseId: 0,
              courseResolved: false,
              preferredSlots: [],
              hasError: true,
              isAlreadyRegistered: false,
              errorMsg: "Thiếu Họ Tên hoặc Email học viên.",
            });
            return;
          }

          const rawCourseName = courseStr ? String(courseStr).trim() : "";
          const studentEmailTrimmed = String(email).trim().toLowerCase();

          // Try to match existing course
          let matchedCourse: CourseItem | undefined;
          if (rawCourseName) {
            const lower = rawCourseName.toLowerCase();
            matchedCourse = courses.find(
              (c) => c.name.toLowerCase() === lower || c.code.toLowerCase() === lower
            );
          }

          // Check if already registered in current semester for this specific course
          // A student is registered if email matches and course name matches (or course ID matches)
          const isAlready = existingRegistrations.some((reg) => {
            const emailMatch = reg.studentEmail.toLowerCase() === studentEmailTrimmed;
            const courseMatch = matchedCourse 
              ? reg.courseId === matchedCourse.id 
              : reg.courseName?.toLowerCase() === rawCourseName.toLowerCase();
            return emailMatch && courseMatch;
          });

          parsed.push({
            studentName: String(name).trim(),
            studentEmail: String(email).trim(),
            studentPhone: phone ? String(phone).trim() : null,
            rawCourseName,
            courseId: matchedCourse ? matchedCourse.id : 0,
            courseResolved: !!matchedCourse,
            preferredSlots: parsePreferredSlots(slotsStr),
            hasError: false,
            isAlreadyRegistered: isAlready,
          });
        });

        setPreviewRows(parsed);
      } catch (err: any) {
        showToast("Lỗi phân tích file Excel: " + err.message, "error");
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
      showToast("Không có học viên mới nào cần nhập thêm.", "error");
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
      preferredSlots: r.preferredSlots,
    }));

    try {
      const res = await semesterApi.importStudentRegistrations(dtos);
      if (res.success) {
        showToast(
          `Nhập thành công ${res.data?.length || dtos.length} học viên mới!${autoCreateRows.length > 0 ? ` (Đã tạo thêm ${autoCreateRows.length} khóa học mới)` : ""}`,
          "success"
        );
        onImportSuccess();
        // Refresh local registration list and switch back to view list
        await fetchRegistrations();
        setActiveTab("list");
        setPreviewRows([]);
      } else {
        showToast(res.message || "Lỗi khi nhập danh sách đăng ký học viên.", "error");
      }
    } catch (err: any) {
      showToast(err?.message || "Đã xảy ra lỗi kết nối.", "error");
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
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[960px] p-6 sm:p-8">
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Đăng ký học viên kỳ học
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Học kỳ: <span className="font-semibold text-gray-700 dark:text-gray-200">{semesterName}</span>
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
              Học viên đã đăng ký ({existingRegistrations.length})
            </button>
            <button
              onClick={() => setActiveTab("import")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === "import"
                  ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Nhập từ file Excel
            </button>
          </div>
        </div>

        {/* Tab CONTENT: 1. LIST VIEW */}
        {activeTab === "list" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Tìm kiếm học viên, email, số điện thoại hoặc khóa học..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {isLoadingList ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                <span className="text-sm text-gray-500">Đang tải danh sách học viên...</span>
              </div>
            ) : filteredRegistrations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/20 dark:bg-gray-900/10">
                <svg className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  {searchQuery ? "Không tìm thấy học viên nào khớp với tìm kiếm." : "Chưa có học viên nào được đăng ký cho học kỳ này."}
                  <br />
                  {!searchQuery && (
                    <button
                      onClick={() => setActiveTab("import")}
                      className="mt-2 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Bấm vào đây để tải file đăng ký học viên
                    </button>
                  )}
                </p>
              </div>
            ) : (
              <div className="max-h-[360px] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800 custom-scrollbar">
                <table className="w-full border-collapse text-sm text-left">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                      <th className="py-3 px-4 font-semibold">Tên Học Viên</th>
                      <th className="py-3 px-4 font-semibold">Email / SĐT</th>
                      <th className="py-3 px-4 font-semibold">Khóa học</th>
                      <th className="py-3 px-4 font-semibold">Ca học muốn</th>
                      <th className="py-3 px-4 font-semibold text-right">Trạng thái</th>
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
                          {reg.courseName || `Khóa ID: ${reg.courseId}`}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {reg.preferredSlots && reg.preferredSlots.length > 0 ? (
                              reg.preferredSlots.map((slot) => (
                                <span key={slot} className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                                  {slot === "Morning" ? "☀ Sáng" : slot === "Afternoon" ? "🌤 Chiều" : "🌙 Tối"}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400 italic">Mặc định</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            reg.status === 1 
                              ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900" 
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900"
                          }`}>
                            {reg.status === 1 ? "Chờ xếp lớp" : "Đã xếp lớp"}
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
                Đóng
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
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Bước 1 — Tải file mẫu</span>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Tải file template (.xlsx)
                </button>
              </div>

              <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Bước 2 — Chọn file đã điền</span>
                <label className="flex items-center justify-center px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-theme-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Tải file Excel lên
                  <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>

            {isParsing && (
              <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-3"></div>
                <span className="text-sm text-gray-500">Đang phân tích file Excel...</span>
              </div>
            )}

            {!isParsing && previewRows.length > 0 && (
              <div className="flex flex-col gap-3">
                {/* Summary chips */}
                <div className="flex flex-wrap gap-2 items-center text-xs">
                  <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full font-semibold">
                    Tổng: {previewRows.length} dòng
                  </span>
                  <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900 rounded-full font-semibold">
                    ✓ Sẽ thêm (Học viên mới/Khóa học mới): {newImportRows.length}
                  </span>
                  {alreadyRegisteredCount > 0 && (
                    <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 rounded-full font-semibold">
                      ⚠ Đã đăng ký khóa này (Sẽ bỏ qua): {alreadyRegisteredCount}
                    </span>
                  )}
                  {errorRows.length > 0 && (
                    <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-full font-semibold">
                      ✕ Lỗi dòng (Bỏ qua): {errorRows.length}
                    </span>
                  )}
                </div>

                {autoCreateRows.length > 0 && (
                  <div className="p-3 text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-lg">
                    <strong>Tạo mới khóa học:</strong> Khóa học sau chưa có trong hệ thống và sẽ được tự động tạo:{" "}
                    {[...new Set(autoCreateRows.map((r) => `"${r.rawCourseName}"`))].join(", ")}.
                  </div>
                )}

                <div className="max-h-[300px] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800 custom-scrollbar">
                  <table className="w-full border-collapse text-sm text-left">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                        <th className="py-2.5 px-3 font-semibold">Tên Học Viên</th>
                        <th className="py-2.5 px-3 font-semibold">Email</th>
                        <th className="py-2.5 px-3 font-semibold">Khóa học</th>
                        <th className="py-2.5 px-3 font-semibold">Ca học</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Trạng thái</th>
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
                          <td className={`py-2 px-3 font-medium ${r.isAlreadyRegistered ? "text-gray-400 line-through" : "text-gray-800 dark:text-gray-200"}`}>{r.studentName}</td>
                          <td className="py-2 px-3 text-xs">{r.studentEmail}</td>
                          <td className="py-2 px-3">
                            {r.hasError ? (
                              <span className="text-gray-400 italic">—</span>
                            ) : r.courseResolved ? (
                              <span>{r.rawCourseName}</span>
                            ) : r.rawCourseName ? (
                              <div>
                                <span>{r.rawCourseName}</span>
                                <span className="ml-1.5 text-xs font-semibold px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded">
                                  Khóa mới
                                </span>
                              </div>
                            ) : (
                              <span className="text-rose-500 text-xs">Chưa có tên khóa</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex flex-wrap gap-1">
                              {r.preferredSlots.map((slot) => (
                                <span
                                  key={slot}
                                  className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-sm"
                                >
                                  {slot === "Morning" ? "☀ Sáng" : slot === "Afternoon" ? "🌤 Chiều" : "🌙 Tối"}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right">
                            {r.hasError ? (
                              <span
                                title={r.errorMsg}
                                className="text-xs font-semibold px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900 cursor-help"
                              >
                                Bỏ qua (Lỗi)
                              </span>
                            ) : r.isAlreadyRegistered ? (
                              <span
                                title="Học viên này đã được đăng ký cho khóa học này trong học kỳ rồi"
                                className="text-xs font-semibold px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-full dark:bg-amber-950/10 dark:text-amber-400 dark:border-amber-900 cursor-help"
                              >
                                Đã đăng ký (Bỏ qua)
                              </span>
                            ) : (
                              <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900">
                                Sẽ thêm mới
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
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={isImporting || newImportRows.length === 0}
                    className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isImporting ? "Đang xử lý..." : `Nhập ${newImportRows.length} học viên mới`}
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
                  Tải file mẫu, điền dữ liệu học viên và tải lên.
                  <br />
                  <span className="text-xs text-blue-500 font-medium">Hệ thống sẽ đối chiếu và chỉ nhập những học viên mới chưa đăng ký trong kỳ học này.</span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

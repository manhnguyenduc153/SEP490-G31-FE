"use client";

import React, { useState, useEffect } from "react";
import { ClipboardCheck, FileText, Search, Download, ChevronDown, File as FilePdf } from "lucide-react";
import { classApi, ClassItem } from "@/services/class.api";
import { reportApi, ClassAttendanceSheetDto } from "@/services/report.api";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import * as XLSX from "xlsx";

export default function AttendanceReport() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | "">("");
  const [reportData, setReportData] = useState<ClassAttendanceSheetDto | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch classes on mount
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

  // Fetch report when a class is selected
  useEffect(() => {
    if (!selectedClassId) {
      setReportData(null);
      return;
    }

    let active = true;
    async function loadReport() {
      setIsLoading(true);
      setError("");
      try {
        const res = await reportApi.getClassAttendanceSheet(Number(selectedClassId));
        if (active && res.success && res.data) {
          setReportData(res.data);
        } else if (active) {
          setError(res.message || "Không thể tải báo cáo");
          setReportData(null);
        }
      } catch (err) {
        console.error("Failed to load report", err);
        if (active) setError("Lỗi kết nối tới máy chủ");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadReport();
    return () => {
      active = false;
    };
  }, [selectedClassId]);

  const classOptions = classes.map((c) => ({
    value: c.id,
    label: `${c.code} - ${c.name}`,
  }));

  const getStatusReportBadge = (status: number) => {
    switch (status) {
      case 1:
        return <span className="inline-flex w-5 h-5 items-center justify-center rounded bg-green-100 text-green-700 text-xs font-bold" title="Có mặt">P</span>;
      case 0:
        return <span className="inline-flex w-5 h-5 items-center justify-center rounded bg-red-100 text-red-700 text-xs font-bold" title="Vắng mặt">A</span>;
      default:
        return <span className="inline-flex w-5 h-5 items-center justify-center rounded text-gray-300 text-xs">-</span>;
    }
  };

  const handleExportExcel = () => {
    if (!reportData) return;

    const dataToExport = reportData.students.map((st, index) => {
      const rowData: any = {
        "STT": index + 1,
        "Mã học viên": st.studentCode,
        "Tên học viên": st.studentName,
        "Có mặt": st.presentCount,
        "Vắng": st.absentCount,
        "Tỷ lệ (%)": st.attendanceRate,
      };

      // Add each session
      st.attendances.forEach((att, idx) => {
        const session = reportData.sessions[idx];
        let statusStr = "-";
        if (att.status === 1) statusStr = "P";
        else if (att.status === 0) statusStr = "A";
        
        const colName = `B.${session?.lessonNo || idx + 1}`;
        rowData[colName] = statusStr;
      });

      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const wscols = [
      { wch: 5 }, { wch: 15 }, { wch: 25 }, 
      { wch: 8 }, { wch: 8 }, { wch: 10 }
    ];
    reportData.sessions.forEach(() => wscols.push({ wch: 8 }));
    worksheet["!cols"] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Điểm danh");

    const dateStr = new Date().toISOString().slice(0, 10);
    const classObj = classes.find(c => c.id === selectedClassId);
    const code = classObj ? classObj.code : "";
    XLSX.writeFile(workbook, `Diem_Danh_${code}_${dateStr}.xlsx`);
    setIsExportOpen(false);
  };

  const handleExportWord = () => {
    const el = document.getElementById("report-table-container");
    if (!el || !reportData) return;
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>Export</title>
        <style>
          table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 14px; }
          th { background-color: #f3f4f6; color: #374151; }
        </style>
      </head><body>
      <h2>Báo cáo điểm danh</h2>
      <p>Lớp: ${reportData.className} (${reportData.classCode})</p>
      ${el.outerHTML}
      </body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `Diem_Danh_${reportData.classCode}_${dateStr}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportOpen(false);
  };

  const handleExportPdf = () => {
    const el = document.getElementById("report-table-container");
    if (!el || !reportData) return;
    
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    
    doc.open();
    doc.write(`
      <html>
      <head>
        <title>Export PDF</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
          th { background-color: #f8f9fa; color: #111; font-weight: bold; }
          h2 { margin-bottom: 5px; font-size: 20px; color: #111; }
          p { margin-top: 0; color: #555; font-size: 14px; margin-bottom: 20px; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <h2>Báo cáo điểm danh</h2>
        <p>Lớp: ${reportData.className} (${reportData.classCode})</p>
        ${el.outerHTML}
      </body>
      </html>
    `);
    doc.close();
    
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    };
    
    setIsExportOpen(false);
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-theme-sm overflow-hidden flex flex-col min-h-[600px] animate-fadeIn">
      {/* Header section with class selector */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex flex-col md:flex-row items-start md:items-center gap-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-brand-500" />
            Bảng điểm danh chi tiết của Lớp học
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Tra cứu và theo dõi tình hình chuyên cần của sinh viên trong lớp học.
          </p>
        </div>
        <div className="w-full sm:w-[320px]">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Chọn lớp học
          </label>
          <SearchableSelect
            options={classOptions}
            value={selectedClassId}
            onChange={(val) => setSelectedClassId(val)}
            placeholder="Tìm kiếm lớp học..."
          />
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-6 flex-1">
        {!selectedClassId ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
            <Search className="w-12 h-12 mb-4 opacity-20" />
            <p>Vui lòng chọn một lớp học để xem báo cáo điểm danh</p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 py-20">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            Đang tải dữ liệu báo cáo...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-red-500 py-20 bg-red-50/50 rounded-xl border border-red-100">
            <p className="font-semibold">{error}</p>
          </div>
        ) : !reportData || reportData.sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20 bg-gray-50/50 rounded-xl border border-gray-100">
            <p className="italic">Không tìm thấy dữ liệu điểm danh nào của lớp học này.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Danh sách Bảng điểm
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Lớp: <span className="font-semibold text-gray-700 dark:text-gray-300">{reportData.classCode}</span> - {reportData.className}
                </p>
              </div>
              <div className="relative" onMouseLeave={() => setIsExportOpen(false)}>
                <button 
                  onClick={() => setIsExportOpen(!isExportOpen)}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-semibold transition-all shadow-sm border border-brand-500 hover:border-brand-600"
                >
                  <Download className="w-4 h-4" />
                  Xuất báo cáo <ChevronDown className="w-3 h-3 ml-1" />
                </button>

                {isExportOpen && (
                  <div className="absolute top-full right-0 pt-2 z-50">
                    <div className="w-[160px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                       <button onClick={handleExportExcel} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-left text-gray-700 dark:text-gray-200">
                          <Download className="w-4 h-4 text-green-600" /> Excel (.xlsx)
                       </button>
                       <button onClick={handleExportWord} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-left text-gray-700 dark:text-gray-200">
                          <FileText className="w-4 h-4 text-blue-600" /> Word (.doc)
                       </button>
                       <button onClick={handleExportPdf} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-left text-gray-700 dark:text-gray-200">
                          <FilePdf className="w-4 h-4 text-red-600" /> PDF (.pdf)
                       </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Attendance Table */}
            <div id="report-table-container" className="overflow-x-auto border border-gray-150 dark:border-gray-800 rounded-xl bg-gray-50/20 shadow-xs">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-205 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-semibold bg-gray-100/80 dark:bg-gray-800/60 sticky top-0 z-10">
                    <th className="px-4 py-4 w-12 text-center tracking-wider">#</th>
                    <th className="px-4 py-4 min-w-[120px] tracking-wider">Mã học sinh</th>
                    <th className="px-4 py-4 min-w-[180px] tracking-wider">Học sinh</th>
                    
                    {/* Summary Columns */}
                    <th className="px-2 py-4 text-center min-w-[70px] text-green-600 dark:text-green-400 bg-green-50/80 dark:bg-green-900/20">Có mặt</th>
                    <th className="px-2 py-4 text-center min-w-[70px] text-red-600 dark:text-red-400 bg-red-50/80 dark:bg-red-900/20">Vắng</th>
                    <th className="px-4 py-4 text-center min-w-[100px] text-brand-600 dark:text-brand-400 bg-brand-50/80 dark:bg-brand-900/20">Tỷ lệ</th>

                    {/* Sessions Columns */}
                    {reportData.sessions.map((s) => (
                      <th key={s.scheduleId} className="px-2 py-4 text-center min-w-[60px]" title={s.date ? new Date(s.date).toLocaleDateString("vi-VN") : ""}>
                        <div className="flex flex-col items-center justify-center leading-tight">
                          <span>B.{s.lessonNo}</span>
                          {s.date && (
                            <span className="text-[10px] font-normal text-gray-400 mt-1">
                              {new Date(s.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                  {reportData.students.map((st, idx) => (
                    <tr key={st.studentId} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/30 transition-colors group">
                      <td className="px-4 py-3 text-center font-medium text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{st.studentCode || "-"}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                        <span className="truncate block max-w-[200px]" title={st.studentName || ""}>
                          {st.studentName}
                        </span>
                      </td>
                      
                      {/* Summary Columns Data */}
                      <td className="px-2 py-3 text-center font-bold text-green-600 dark:text-green-400 bg-green-50/40 dark:bg-green-900/5">{st.presentCount}</td>
                      <td className="px-2 py-3 text-center font-bold text-red-600 dark:text-red-400 bg-red-50/40 dark:bg-red-900/5">{st.absentCount}</td>
                      <td className="px-4 py-3 text-center font-black text-brand-600 dark:text-brand-400 bg-brand-50/40 dark:bg-brand-900/5">
                        <div className="flex flex-col items-center gap-1.5">
                          <span>{st.attendanceRate}%</span>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${st.attendanceRate >= 80 ? 'bg-green-500' : st.attendanceRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                              style={{ width: `${st.attendanceRate}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Sessions Columns Data */}
                      {st.attendances.map((att) => (
                        <td key={att.scheduleId} className="px-2 py-3 text-center">
                          {getStatusReportBadge(att.status)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

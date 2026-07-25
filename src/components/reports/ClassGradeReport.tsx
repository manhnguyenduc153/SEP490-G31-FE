"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, Search, Download, ChevronDown, FileText, File as FilePdf } from "lucide-react";
import { useTranslation } from "react-i18next";
import { classApi } from "@/services/class.api";
import { reportApi, ClassGradeReportDto } from "@/services/report.api";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import * as XLSX from "xlsx";

export default function ClassGradeReport() {
  const { t } = useTranslation();
  const [classes, setClasses] = useState<{ id: number; name: string; code: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | "">("");
  const [reportData, setReportData] = useState<ClassGradeReportDto | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await classApi.getAll(1, 1000);
        if (response.success && response.data) {
          setClasses(response.data.items || []);
        }
      } catch (err) {
        console.error("Failed to fetch classes:", err);
      }
    };
    fetchClasses();
  }, []);

  // Fetch report data when class changes
  useEffect(() => {
    const fetchReport = async () => {
      if (!selectedClassId) {
        setReportData(null);
        setError(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const response = await reportApi.getClassGradeReport(Number(selectedClassId));
        if (response.success && response.data) {
          setReportData(response.data);
        } else {
          setError(response.message || t("classGradeReport.failedToLoadReport"));
          setReportData(null);
        }
      } catch (err: any) {
        setError(err?.message || "Lỗi hệ thống");
        setReportData(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReport();
  }, [selectedClassId]);

  const classOptions = classes.map((c) => ({
    value: c.id,
    label: `${c.code} - ${c.name}`,
  }));

  const getPassBadge = (isPassed: boolean) => {
    if (isPassed) {
      return <span className="inline-flex px-2 py-1 items-center justify-center rounded bg-green-100 text-green-700 text-xs font-bold">{t("classGradeReport.passed").toUpperCase()}</span>;
    }
    return <span className="inline-flex px-2 py-1 items-center justify-center rounded bg-red-100 text-red-700 text-xs font-bold">{t("classGradeReport.failed").toUpperCase()}</span>;
  };

  const handleExportExcel = () => {
    if (!reportData) return;

    const dataToExport = reportData.students.map((student, index) => {
      const rowData: any = {
        "STT": index + 1,
        "Mã học viên": student.studentCode,
        "Tên học viên": student.studentName,
      };

      reportData.components.forEach((comp) => {
        const score = student.componentScores[comp.id];
        rowData[`${comp.name} (${comp.weight}%)`] = score !== null && score !== undefined ? score : "-";
      });

      rowData["Điểm tổng kết"] = student.finalScore !== null && student.finalScore !== undefined ? student.finalScore : "-";
      rowData["Đánh giá"] = student.finalScore !== null && student.finalScore !== undefined 
        ? (student.isPassed ? "Đạt" : "Trượt") 
        : "-";

      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const wscols = [{ wch: 5 }, { wch: 15 }, { wch: 25 }];
    reportData.components.forEach(() => wscols.push({ wch: 15 }));
    wscols.push({ wch: 15 }, { wch: 15 });
    worksheet["!cols"] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bảng điểm");

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `Bang_Diem_${reportData.classCode}_${dateStr}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
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
      <h2>Bảng điểm tổng hợp</h2>
      <p>Lớp: ${reportData.className} (${reportData.classCode})</p>
      ${el.outerHTML}
      </body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `Bang_Diem_${reportData.classCode}_${dateStr}.doc`;
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
        <h2>Báo cáo Bảng điểm tổng hợp</h2>
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
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex flex-col xl:flex-row items-start xl:items-center gap-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand-500" />
            {t("classGradeReport.title")}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t("classGradeReport.description")}
          </p>
        </div>
        <div className="w-full sm:w-[320px]">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("classGradeReport.selectClass")}
          </label>
          <SearchableSelect
            options={classOptions}
            value={selectedClassId}
            onChange={(val) => setSelectedClassId(val)}
            placeholder={t("classGradeReport.classPlaceholder")}
          />
        </div>
      </div>

      <div className="p-6 flex-1 overflow-auto">
        {!selectedClassId ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
            <Search className="w-12 h-12 mb-4 opacity-20" />
            <p>{t("classGradeReport.pleaseSelectClass")}</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-red-500">
            <p className="font-semibold text-lg">{error}</p>
          </div>
        ) : reportData ? (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Danh sách Bảng điểm
                </h3>
                <p className="text-sm text-gray-500">
                  Lớp: <span className="font-semibold text-gray-700 dark:text-gray-300">{reportData.classCode}</span> - {reportData.className}
                </p>
              </div>
              <div className="relative" onMouseLeave={() => setIsExportOpen(false)}>
                <button 
                  onClick={() => setIsExportOpen(!isExportOpen)}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-semibold transition-all shadow-sm border border-brand-500 hover:border-brand-600"
                >
                  <Download className="w-4 h-4" />
                  Xuất dữ liệu <ChevronDown className="w-3 h-3 ml-1" />
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

            {reportData.components.length === 0 ? (
              <div className="text-center py-10 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                <p className="text-yellow-600 dark:text-yellow-400 font-medium">Khóa học này chưa được cấu hình các cột điểm (Grade Components).</p>
                <p className="text-sm text-yellow-500 mt-1">Vui lòng thiết lập cấu hình điểm cho khóa học trước khi xem báo cáo.</p>
              </div>
            ) : (
              <div id="report-table-container" className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-theme-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold whitespace-nowrap">
                      <tr>
                        <th className="px-4 py-3 w-12 text-center border-r border-gray-200 dark:border-gray-700">#</th>
                        <th className="px-4 py-3 min-w-[120px]">{t("classGradeReport.studentCode")}</th>
                        <th className="px-4 py-3 min-w-[180px] border-r border-gray-200 dark:border-gray-700">{t("classGradeReport.studentName")}</th>
                        {/* Dynamic Columns for Components */}
                        {reportData.components.map((comp) => (
                          <th key={comp.id} className="px-4 py-3 text-center min-w-[100px] border-r border-gray-200 dark:border-gray-700">
                            <div>{comp.name}</div>
                            <div className="text-[10px] font-normal mt-0.5 text-brand-600 dark:text-brand-400 opacity-80">({comp.weight}%)</div>
                          </th>
                        ))}
                        <th className="px-4 py-3 text-center min-w-[100px] border-r border-gray-200 dark:border-gray-700 text-brand-600 dark:text-brand-400">
                          {t("classGradeReport.finalScore")}
                        </th>
                        <th className="px-4 py-3 text-center min-w-[100px]">{t("classGradeReport.evaluation")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {reportData.students.length === 0 ? (
                        <tr>
                          <td colSpan={5 + reportData.components.length} className="px-6 py-8 text-center text-gray-500">
                            Chưa có dữ liệu học sinh trong lớp học này.
                          </td>
                        </tr>
                      ) : (
                        reportData.students.map((student, index) => (
                          <tr key={student.studentId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors bg-white dark:bg-gray-900">
                            <td className="px-4 py-3 text-center font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                              {student.studentCode}
                            </td>
                            <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-300">
                              {student.studentName}
                            </td>

                            {/* Component Scores */}
                            {reportData.components.map((comp) => {
                              const score = student.componentScores[comp.id];
                              return (
                                <td key={comp.id} className="px-4 py-3 text-center font-medium border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                                  {score !== null && score !== undefined ? (
                                    <span className={score < 5 ? "text-red-500" : ""}>{score}</span>
                                  ) : (
                                    <span className="text-gray-300">-</span>
                                  )}
                                </td>
                              );
                            })}

                            <td className="px-4 py-3 text-center border-r border-gray-200 dark:border-gray-700">
                              {student.finalScore !== null && student.finalScore !== undefined ? (
                                <span className={`font-bold ${student.finalScore < 5 ? "text-red-600" : "text-brand-600 dark:text-brand-400"}`}>
                                  {student.finalScore}
                                </span>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {student.finalScore !== null && student.finalScore !== undefined ? (
                                getPassBadge(student.isPassed)
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

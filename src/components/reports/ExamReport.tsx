"use client";

import React, { useState, useEffect } from "react";
import { GraduationCap, Search, TrendingUp, Download, ChevronDown, FileText, File as FilePdf } from "lucide-react";
import { useTranslation } from "react-i18next";
import { classApi, ClassItem } from "@/services/class.api";
import { examApi } from "@/services/exam.api";
import { reportApi } from "@/services/report.api";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import * as XLSX from "xlsx";

export interface AggregatedStudentResult {
  studentId: number;
  studentCode: string;
  studentName: string;
  takenExamsCount: number;
  totalExamsCount: number;
  averageScore: number | null;
  isPassed: boolean | null;
}

export interface ClassExamSummaryReport {
  classId: number;
  classCode: string;
  className: string;
  totalExams: number;
  overallAverageScore: number;
  studentResults: AggregatedStudentResult[];
}

export default function ExamReport() {
  const { t } = useTranslation();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | "">("");

  const [reportData, setReportData] = useState<ClassExamSummaryReport | null>(null);
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

  // Fetch all exams & aggregate scores when class is selected
  useEffect(() => {
    if (!selectedClassId) {
      setReportData(null);
      return;
    }

    let active = true;
    async function loadClassExamsReport() {
      setIsLoading(true);
      setError("");
      try {
        const selectedClass = classes.find(c => c.id === Number(selectedClassId));
        const examRes = await examApi.getAll(1, 1000, { classId: Number(selectedClassId) });
        
        if (!active) return;

        if (!examRes.success || !examRes.data || !examRes.data.items || examRes.data.items.length === 0) {
          setReportData(null);
          setIsLoading(false);
          return;
        }

        const examItems = examRes.data.items;

        // Fetch analysis for each exam in parallel
        const reportPromises = examItems.map(e => reportApi.getExamResultAnalysis(e.id));
        const results = await Promise.all(reportPromises);

        if (!active) return;

        const studentMap = new Map<number, {
          studentId: number;
          studentCode: string;
          studentName: string;
          scores: number[];
        }>();

        results.forEach(res => {
          if (res.success && res.data && res.data.studentResults) {
            res.data.studentResults.forEach(st => {
              if (!studentMap.has(st.studentId)) {
                studentMap.set(st.studentId, {
                  studentId: st.studentId,
                  studentCode: st.studentCode,
                  studentName: st.studentName,
                  scores: []
                });
              }
              const entry = studentMap.get(st.studentId)!;
              if (st.finalScore !== null && st.finalScore !== undefined) {
                entry.scores.push(st.finalScore);
              }
            });
          }
        });

        const studentResults: AggregatedStudentResult[] = Array.from(studentMap.values()).map(st => {
          const avg = st.scores.length > 0
            ? parseFloat((st.scores.reduce((a, b) => a + b, 0) / st.scores.length).toFixed(1))
            : null;
          return {
            studentId: st.studentId,
            studentCode: st.studentCode,
            studentName: st.studentName,
            takenExamsCount: st.scores.length,
            totalExamsCount: examItems.length,
            averageScore: avg,
            isPassed: avg !== null ? avg >= 5 : null,
          };
        });

        const validAvgs = studentResults.filter(s => s.averageScore !== null).map(s => s.averageScore!);
        const overallAverageScore = validAvgs.length > 0
          ? parseFloat((validAvgs.reduce((a, b) => a + b, 0) / validAvgs.length).toFixed(1))
          : 0;

        setReportData({
          classId: Number(selectedClassId),
          classCode: selectedClass?.code || "",
          className: selectedClass?.name || "",
          totalExams: examItems.length,
          overallAverageScore,
          studentResults,
        });
      } catch (err) {
        console.error("Failed to load aggregated report", err);
        if (active) setError(t("examReport.serverConnectionError"));
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadClassExamsReport();
    return () => {
      active = false;
    };
  }, [selectedClassId, classes, t]);

  const classOptions = classes.map((c) => ({
    value: c.id,
    label: `${c.code} - ${c.name}`,
  }));

  const handleExportExcel = () => {
    if (!reportData) return;

    const dataToExport = reportData.studentResults.map((st, index) => {
      let ketQua = t("examReport.statusNotTaken");
      if (st.averageScore !== null && st.averageScore !== undefined) {
        ketQua = st.isPassed ? t("examReport.statusPassed") : t("examReport.statusFailed");
      }

      return {
        [t("examReport.stt")]: index + 1,
        [t("examReport.excelCode")]: st.studentCode || "-",
        [t("examReport.excelName")]: st.studentName || "-",
        [t("examReport.excelExamsCompleted")]: `${st.takenExamsCount} / ${st.totalExamsCount}`,
        [t("examReport.excelScore")]: st.averageScore !== null && st.averageScore !== undefined ? st.averageScore : "-",
        [t("examReport.excelResult")]: ketQua
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    worksheet["!cols"] = [
      { wch: 5 }, { wch: 15 }, { wch: 25 }, 
      { wch: 18 }, { wch: 15 }, { wch: 12 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t("examReport.sheetName"));

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `KQT_${reportData.classCode}_${dateStr}.xlsx`);
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
      <h2>${t("examReport.exportTitle")}</h2>
      <p>${t("examReport.classPrefix")}${reportData.className} (${reportData.classCode})</p>
      ${el.outerHTML}
      </body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `KQT_${reportData.classCode}_${dateStr}.doc`;
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
        <h2>${t("examReport.exportTitle")}</h2>
        <p>${t("examReport.classPrefix")}${reportData.className} (${reportData.classCode})</p>
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
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-brand-500" />
            {t("examReport.title")}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t("examReport.description")}
          </p>
        </div>
        <div className="w-full sm:w-[320px]">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("examReport.selectClass")}
          </label>
          <SearchableSelect
            options={classOptions}
            value={selectedClassId}
            onChange={(val) => setSelectedClassId(val)}
            placeholder={t("examReport.searchClassPlaceholder")}
          />
        </div>
      </div>

      <div className="p-6 flex-1">
        {!selectedClassId ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
            <Search className="w-12 h-12 mb-4 opacity-20" />
            <p>{t("examReport.pleaseSelectClass")}</p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 py-20">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            {t("examReport.loadingReport")}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-red-500 py-20 bg-red-50/50 rounded-xl border border-red-100">
            <p className="font-semibold">{error}</p>
          </div>
        ) : !reportData || reportData.studentResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20 bg-gray-50/50 rounded-xl border border-gray-100">
            <p className="italic">{t("examReport.noExamDataFound")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {t("examReport.examResultDetails")}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {t("examReport.classPrefix")}<span className="font-semibold text-gray-700 dark:text-gray-300">{reportData.classCode}</span> - {reportData.className}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="p-4 bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 rounded-xl flex items-center justify-between shadow-xs w-full sm:w-[280px] h-[88px]">
                <div>
                  <p className="text-sm text-brand-600 dark:text-brand-400 font-semibold mb-1">{t("examReport.averageScore")}</p>
                  <p className="text-2xl font-bold text-brand-700 dark:text-brand-300">{reportData.overallAverageScore} <span className="text-sm font-normal text-brand-600/70">/ 10</span></p>
                </div>
                <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-800/50 flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-inner">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              <div className="relative" onMouseLeave={() => setIsExportOpen(false)}>
                <button 
                  onClick={() => setIsExportOpen(!isExportOpen)}
                  className="flex flex-col items-center justify-center gap-1.5 p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xs w-full sm:w-[140px] h-[88px] transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-brand-600 dark:text-brand-400 group-hover:scale-110 transition-transform">
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t("examReport.exportData")} <ChevronDown className="w-3 h-3" />
                  </div>
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

            <div id="report-table-container" className="overflow-x-auto border border-gray-150 dark:border-gray-800 rounded-xl bg-gray-50/20 shadow-xs">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-205 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-semibold bg-gray-100/80 dark:bg-gray-800/60 sticky top-0 z-10">
                    <th className="px-4 py-4 w-12 text-center tracking-wider">{t("examReport.index")}</th>
                    <th className="px-4 py-4 min-w-[120px] tracking-wider">{t("examReport.studentCode")}</th>
                    <th className="px-4 py-4 min-w-[180px] tracking-wider">{t("examReport.studentName")}</th>
                    <th className="px-4 py-4 text-center min-w-[140px] tracking-wider">{t("examReport.examsCompleted")}</th>
                    <th className="px-4 py-4 text-center min-w-[120px] text-brand-600 dark:text-brand-400 bg-brand-50/80 dark:bg-brand-900/20">{t("examReport.score")}</th>
                    <th className="px-4 py-4 text-center min-w-[120px] tracking-wider">{t("examReport.result")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                  {reportData.studentResults.map((st, idx) => (
                    <tr key={st.studentId} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/30 transition-colors group">
                      <td className="px-4 py-3 text-center font-medium text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{st.studentCode || "-"}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                        <span className="truncate block max-w-[200px]" title={st.studentName || ""}>
                          {st.studentName}
                        </span>
                      </td>
                      
                      <td className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">
                        {st.takenExamsCount} / {st.totalExamsCount}
                      </td>

                      <td className="px-4 py-3 text-center font-black text-brand-600 dark:text-brand-400 bg-brand-50/40 dark:bg-brand-900/5">
                        {st.averageScore !== null && st.averageScore !== undefined ? st.averageScore : "-"}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {st.averageScore !== null && st.averageScore !== undefined ? (
                          st.isPassed ? (
                            <span className="inline-flex px-2.5 py-1 rounded bg-green-100 text-green-700 text-xs font-bold w-[70px] justify-center">{t("examReport.statusPassed")}</span>
                          ) : (
                            <span className="inline-flex px-2.5 py-1 rounded bg-red-100 text-red-700 text-xs font-bold w-[70px] justify-center">{t("examReport.statusFailed")}</span>
                          )
                        ) : (
                          <span className="inline-flex px-2.5 py-1 rounded bg-gray-100 text-gray-500 text-xs font-bold w-[70px] justify-center">{t("examReport.statusNotTaken")}</span>
                        )}
                      </td>
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

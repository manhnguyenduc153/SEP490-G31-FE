"use client";

import React, { useState, useEffect } from "react";
import { GraduationCap, FileText, CheckCircle, Search, TrendingUp } from "lucide-react";
import { classApi, ClassItem } from "@/services/class.api";
import { examApi, ExamItem } from "@/services/exam.api";
import { reportApi, ExamResultReportDto } from "@/services/report.api";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";
export default function ExamReport() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | "">("");

  const [exams, setExams] = useState<ExamItem[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | "">("");

  const [reportData, setReportData] = useState<ExamResultReportDto | null>(null);
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

  // Fetch exams when a class is selected
  useEffect(() => {
    setSelectedExamId("");
    setReportData(null);
    setExams([]);

    if (!selectedClassId) return;

    async function loadExams() {
      try {
        const res = await examApi.getAll(1, 1000, { classId: Number(selectedClassId) });
        if (res.success && res.data) {
          setExams(res.data.items || []);
        }
      } catch (err) {
        console.error("Failed to load exams", err);
      }
    }
    loadExams();
  }, [selectedClassId]);

  // Fetch report when an exam is selected
  useEffect(() => {
    if (!selectedExamId) {
      setReportData(null);
      return;
    }

    let active = true;
    async function loadReport() {
      setIsLoading(true);
      setError("");
      try {
        const res = await reportApi.getExamResultAnalysis(Number(selectedExamId));
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
  }, [selectedExamId]);

  const classOptions = classes.map((c) => ({
    value: c.id,
    label: `${c.code} - ${c.name}`,
  }));

  const examOptions = exams.map((e) => ({
    value: e.id,
    label: `${e.title}`,
  }));

  const handleExportExcel = () => {
    if (!reportData) return;

    const dataToExport = reportData.studentResults.map((st, index) => {
      let ketQua = "CHƯA THI";
      if (st.finalScore !== null && st.finalScore !== undefined) {
        ketQua = st.isPassed ? "ĐẠT" : "TRƯỢT";
      }

      return {
        "STT": index + 1,
        "Mã học viên": st.studentCode || "-",
        "Tên học viên": st.studentName || "-",
        "Số lần làm bài": st.attemptCount > 0 ? st.attemptCount : "-",
        "Lần nộp cuối": st.submittedAt ? new Date(st.submittedAt).toLocaleString("vi-VN") : "-",
        "Điểm số": st.finalScore !== null && st.finalScore !== undefined ? st.finalScore : "-",
        "Kết quả": ketQua
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    worksheet["!cols"] = [
      { wch: 5 }, { wch: 15 }, { wch: 25 }, 
      { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 10 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Kết quả thi");

    const dateStr = new Date().toISOString().slice(0, 10);
    const examObj = exams.find(e => e.id === selectedExamId);
    const title = examObj ? examObj.title.replace(/[^a-zA-Z0-9]/g, '_') : "Ket_Qua_Thi";
    XLSX.writeFile(workbook, `Ket_Qua_${title}_${dateStr}.xlsx`);
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-theme-sm overflow-hidden flex flex-col min-h-[600px] animate-fadeIn">
      {/* Header section with class and exam selector */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex flex-col xl:flex-row items-start xl:items-center gap-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-brand-500" />
            Bảng thống kê kết quả thi
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Phân tích tỷ lệ đạt, điểm trung bình và chi tiết điểm số của học sinh trong bài thi.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
          <div className="w-full sm:w-[320px]">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              1. Chọn lớp học
            </label>
            <SearchableSelect
              options={classOptions}
              value={selectedClassId}
              onChange={(val) => setSelectedClassId(val)}
              placeholder="Tìm kiếm lớp học..."
            />
          </div>
          <div className="w-full sm:w-[320px]">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              2. Chọn bài thi
            </label>
            <SearchableSelect
              options={examOptions}
              value={selectedExamId}
              onChange={(val) => setSelectedExamId(val)}
              placeholder={selectedClassId ? (exams.length > 0 ? "Chọn bài thi..." : "Lớp chưa có bài thi") : "Chọn lớp trước"}
              disabled={!selectedClassId || exams.length === 0}
            />
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-6 flex-1">
        {!selectedExamId ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
            <Search className="w-12 h-12 mb-4 opacity-20" />
            <p>Vui lòng chọn một bài thi để xem báo cáo kết quả</p>
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
        ) : !reportData || reportData.studentResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20 bg-gray-50/50 rounded-xl border border-gray-100">
            <p className="italic">Không tìm thấy dữ liệu kết quả thi nào.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Chi tiết kết quả thi
                </h3>
              </div>
            </div>

            {/* Summary Stats Cards */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex items-center justify-between shadow-xs w-full sm:w-[260px] h-[88px]">
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-1">Học sinh tham gia</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {reportData.participatedStudents}
                    <span className="text-sm font-normal text-blue-600/70 ml-1">/ {reportData.totalStudents}</span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl flex items-center justify-between shadow-xs w-full sm:w-[260px] h-[88px]">
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 font-semibold mb-1">Tỷ lệ Đạt ({">="} {reportData.passingScore}đ)</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{reportData.passRate}%</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800/50 flex items-center justify-center text-green-600 dark:text-green-400 shadow-inner">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 rounded-xl flex items-center justify-between shadow-xs w-full sm:w-[260px] h-[88px]">
                <div>
                  <p className="text-sm text-brand-600 dark:text-brand-400 font-semibold mb-1">Điểm trung bình</p>
                  <p className="text-2xl font-bold text-brand-700 dark:text-brand-300">{reportData.averageScore} <span className="text-sm font-normal text-brand-600/70">/ {reportData.totalScore}</span></p>
                </div>
                <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-800/50 flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-inner">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              <button 
                onClick={handleExportExcel}
                className="flex flex-col items-center justify-center gap-1.5 p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xs w-full sm:w-[140px] h-[88px] transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-brand-600 dark:text-brand-400 group-hover:scale-110 transition-transform">
                  <Download className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Xuất Excel</span>
              </button>
            </div>

            {/* Exam Results Table */}
            <div className="overflow-x-auto border border-gray-150 dark:border-gray-800 rounded-xl bg-gray-50/20 shadow-xs">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-205 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-semibold bg-gray-100/80 dark:bg-gray-800/60 sticky top-0 z-10">
                    <th className="px-4 py-4 w-12 text-center tracking-wider">#</th>
                    <th className="px-4 py-4 min-w-[120px] tracking-wider">Mã học sinh</th>
                    <th className="px-4 py-4 min-w-[180px] tracking-wider">Học sinh</th>
                    <th className="px-4 py-4 text-center min-w-[100px] tracking-wider">Số lần làm bài</th>
                    <th className="px-4 py-4 text-center min-w-[150px] tracking-wider">Lần nộp cuối</th>
                    <th className="px-4 py-4 text-center min-w-[100px] text-brand-600 dark:text-brand-400 bg-brand-50/80 dark:bg-brand-900/20">Điểm số</th>
                    <th className="px-4 py-4 text-center min-w-[120px] tracking-wider">Kết quả</th>
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
                        {st.attemptCount > 0 ? st.attemptCount : "-"}
                      </td>
                      
                      <td className="px-4 py-3 text-center text-xs text-gray-500 dark:text-gray-400">
                        {st.submittedAt ? new Date(st.submittedAt).toLocaleString("vi-VN") : "-"}
                      </td>

                      <td className="px-4 py-3 text-center font-black text-brand-600 dark:text-brand-400 bg-brand-50/40 dark:bg-brand-900/5">
                        {st.finalScore !== null && st.finalScore !== undefined ? st.finalScore : "-"}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {st.finalScore !== null && st.finalScore !== undefined ? (
                          st.isPassed ? (
                            <span className="inline-flex px-2.5 py-1 rounded bg-green-100 text-green-700 text-xs font-bold w-[70px] justify-center">ĐẠT</span>
                          ) : (
                            <span className="inline-flex px-2.5 py-1 rounded bg-red-100 text-red-700 text-xs font-bold w-[70px] justify-center">TRƯỢT</span>
                          )
                        ) : (
                          <span className="inline-flex px-2.5 py-1 rounded bg-gray-100 text-gray-500 text-xs font-bold w-[70px] justify-center">CHƯA THI</span>
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

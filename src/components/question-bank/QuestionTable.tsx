"use client";

import { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PencilIcon, TrashBinIcon, EyeIcon, PlusIcon } from "@/icons";
import PaginationWithIcon from "@/components/tables/DataTables/TableOne/PaginationWithIcon";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import { QuestionViewModal } from "./QuestionViewModal";
import { questionApi, QuestionItem, QuestionSaveDto } from "@/services/question.api";
import { questionCategoryApi, QuestionCategoryItem } from "@/services/questionCategory.api";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { useTranslation } from "react-i18next";
import { CheckCircle, XCircle } from "lucide-react";

export default function QuestionTable() {
  const { t } = useTranslation();
  const router = useRouter();

  // ── States ──
  const [items, setItems] = useState<QuestionItem[]>([]);
  const [categories, setCategories] = useState<QuestionCategoryItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Filters ──
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [selectedType, setSelectedType] = useState<number | undefined>(undefined);
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | undefined>(undefined);

  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  // ── Toast ──
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // ── Modal states ──
  const [selectedItemForView, setSelectedItemForView] = useState<QuestionItem | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<QuestionItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Toast logic ──
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
  };

  // ── Read sessionStorage toast (after redirect from QuestionForm) ──
  useEffect(() => {
    const msg = sessionStorage.getItem("questionToastMessage");
    const type = sessionStorage.getItem("questionToastType") as "success" | "error" | null;
    if (msg) {
      showToast(msg, type || "success");
      sessionStorage.removeItem("questionToastMessage");
      sessionStorage.removeItem("questionToastType");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getQuestionTypeLabel = (type: number) => {
    switch (type) {
      case 1:
        return t("question.typeSingle", { defaultValue: "Chọn một" });
      case 2:
        return t("question.typeMultiple", { defaultValue: "Chọn nhiều" });
      case 3:
        return t("question.typeEssay", { defaultValue: "Nhập text" });
      case 4:
        return t("question.typeTrueFalse", { defaultValue: "Đúng / Sai" });
      default:
        return "";
    }
  };

  const getDifficultyLabel = (difficulty: number) => {
    switch (difficulty) {
      case 1:
        return t("question.difficultyEasy", { defaultValue: "Dễ" });
      case 2:
        return t("question.difficultyMedium", { defaultValue: "Trung bình" });
      case 3:
        return t("question.difficultyHard", { defaultValue: "Khó" });
      default:
        return "";
    }
  };

  // ── Search & Tag debounces ──
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ── Load Categories for Filter Dropdown ──
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await questionCategoryApi.getAll(1, 100);
        if (res.success && res.data) {
          setCategories(res.data.items || []);
        }
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    }
    loadCategories();
  }, []);

  // ── Fetch Questions ──
  useEffect(() => {
    let mounted = true;
    async function loadQuestions() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await questionApi.getAll(currentPage, itemsPerPage, {
          keyword: debouncedSearchTerm,
          categoryId: selectedCategory,
          questionType: selectedType,
          difficultyLevel: selectedDifficulty,
        });

        if (!mounted) return;

        if (res.success && res.data) {
          setItems(res.data.items || []);
          setTotalRecords(res.data.totalRecords || 0);
          setTotalPages(res.data.totalPages || 0);
        } else {
          setError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : "Lỗi hệ thống khi tải câu hỏi.");
        }
      } catch (err) {
        if (mounted) setError("Không thể kết nối đến máy chủ.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadQuestions();
    return () => {
      mounted = false;
    };
  }, [currentPage, itemsPerPage, debouncedSearchTerm, selectedCategory, selectedType, selectedDifficulty, refreshKey, t]);

  // ── Delete handler ──
  const openDeleteModal = (item: QuestionItem) => {
    setDeleteTarget(item);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await questionApi.delete(deleteTarget.id);
      if (res.success) {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : "Xóa câu hỏi thành công!");
        setIsDeleteModalOpen(false);
        setDeleteTarget(null);
        triggerRefresh();
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : "Lỗi khi xóa câu hỏi.", "error");
      }
    } catch {
      showToast("Lỗi hệ thống khi thực hiện xóa.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Mã câu hỏi": "Q001",
        "Tiêu đề": "Câu hỏi trắc nghiệm một đáp án",
        "Nội dung": "Thủ đô của Việt Nam là gì?",
        "Loại": "Chọn một",
        "Độ khó": "Dễ",
        "Điểm": 1,
        "Giải thích": "Hà Nội là thủ đô của Việt Nam từ năm 1976.",
        "Danh mục": "Địa lý",
        "Đáp án 1": "Hà Nội",
        "Đúng 1": "x",
        "Đáp án 2": "TP. Hồ Chí Minh",
        "Đúng 2": "",
        "Đáp án 3": "Đà Nẵng",
        "Đúng 3": "",
        "Đáp án 4": "Huế",
        "Đúng 4": "",
        "Đáp án 5": "",
        "Đúng 5": "",
        "Đáp án 6": "",
        "Đúng 6": ""
      },
      {
        "Mã câu hỏi": "Q002",
        "Tiêu đề": "Câu hỏi Đúng Sai",
        "Nội dung": "Trái Đất quay quanh Mặt Trời đúng hay sai?",
        "Loại": "Đúng / Sai",
        "Độ khó": "Dễ",
        "Điểm": 1,
        "Giải thích": "Trái Đất mất khoảng 365 ngày để hoàn thành một vòng quay quanh Mặt Trời.",
        "Danh mục": "Khoa học",
        "Đáp án 1": "Đúng",
        "Đúng 1": "x",
        "Đáp án 2": "Sai",
        "Đúng 2": "",
        "Đáp án 3": "",
        "Đúng 3": "",
        "Đáp án 4": "",
        "Đúng 4": "",
        "Đáp án 5": "",
        "Đúng 5": "",
        "Đáp án 6": "",
        "Đúng 6": ""
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Nhập Câu hỏi");
    XLSX.writeFile(wb, "Template_Nhap_Cau_Hoi.xlsx");
    showToast("Tải file mẫu Excel thành công!");
  };

  const handleExportExcel = async () => {
    try {
      const res = await questionApi.getAll(1, 10000, {
        keyword: debouncedSearchTerm,
        categoryId: selectedCategory,
        questionType: selectedType,
        difficultyLevel: selectedDifficulty,
      });
      if (res.success && res.data) {
        const exportItems = res.data.items || [];
        
        const sheetData = exportItems.map((item, idx) => {
          const row: any = {
            "STT": idx + 1,
            "Mã câu hỏi": item.code,
            "Tiêu đề": item.name,
            "Nội dung": item.content,
            "Loại": item.questionTypeName,
            "Độ khó": item.difficultyLevelName,
            "Điểm": item.point || 0,
            "Giải thích": item.explanation || "",
            "Danh mục": item.categoryName || ""
          };

          if (item.questionAnswers && item.questionAnswers.length > 0) {
            item.questionAnswers.forEach((ans, ansIdx) => {
              if (ansIdx < 6) {
                row[`Đáp án ${ansIdx + 1}`] = ans.content;
                row[`Đúng ${ansIdx + 1}`] = ans.isCorrect ? "x" : "";
              }
            });
          }
          return row;
        });

        const ws = XLSX.utils.json_to_sheet(sheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Danh sách Câu hỏi");
        XLSX.writeFile(wb, "Danh_Sach_Cau_Hoi.xlsx");
        showToast("Xuất dữ liệu Excel thành công!");
      } else {
        showToast(res.message || "Không thể xuất file Excel", "error");
      }
    } catch (err) {
      console.error("Export Excel error", err);
      showToast("Lỗi hệ thống khi xuất Excel", "error");
    }
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

        const rows = XLSX.utils.sheet_to_json(ws);
        if (rows.length === 0) {
          showToast("File Excel không có dữ liệu", "error");
          return;
        }

        const dtos: QuestionSaveDto[] = [];
        for (const row of rows as any[]) {
          const name = row["Tiêu đề"] || row["Title"] || row["title"] || row["name"];
          const content = row["Nội dung"] || row["Content"] || row["content"];
          const typeStr = row["Loại"] || row["Type"] || row["type"];
          const difficultyStr = row["Độ khó"] || row["Difficulty"] || row["difficulty"];
          const categoryName = row["Danh mục"] || row["Category"] || row["category"];
          const pointStr = row["Điểm"] || row["Point"] || row["point"];
          const explanation = row["Giải thích"] || row["Explanation"] || row["explanation"];
          const code = row["Mã câu hỏi"] || row["Code"] || row["code"];

          if (!name || !content) {
            continue;
          }

          let questionType = 1;
          if (typeStr) {
            const tNorm = String(typeStr).toLowerCase().trim();
            if (tNorm.includes("chọn một") || tNorm.includes("single") || tNorm === "1") {
              questionType = 1;
            } else if (tNorm.includes("chọn nhiều") || tNorm.includes("multiple") || tNorm === "2") {
              questionType = 2;
            } else if (tNorm.includes("tự luận") || tNorm.includes("nhập text") || tNorm.includes("essay") || tNorm === "3") {
              questionType = 3;
            } else if (tNorm.includes("đúng / sai") || tNorm.includes("đúng sai") || tNorm.includes("true") || tNorm === "4") {
              questionType = 4;
            }
          }

          let difficultyLevel = 2;
          if (difficultyStr) {
            const dNorm = String(difficultyStr).toLowerCase().trim();
            if (dNorm.includes("dễ") || dNorm.includes("easy") || dNorm === "1") {
              difficultyLevel = 1;
            } else if (dNorm.includes("trung bình") || dNorm.includes("normal") || dNorm.includes("medium") || dNorm === "2") {
              difficultyLevel = 2;
            } else if (dNorm.includes("khó") || dNorm.includes("hard") || dNorm === "3") {
              difficultyLevel = 3;
            }
          }

          let categoryId = null;
          if (categoryName && categories.length > 0) {
            const matchedCat = categories.find(
              (c) => c.name.toLowerCase().trim() === String(categoryName).toLowerCase().trim()
            );
            if (matchedCat) {
              categoryId = matchedCat.id;
            }
          }

          let point = 1;
          if (pointStr) {
            const parsedPoint = parseFloat(String(pointStr));
            if (!isNaN(parsedPoint)) {
              point = parsedPoint;
            }
          }

          const questionAnswers: any[] = [];
          for (let i = 1; i <= 6; i++) {
            const ansContent = row[`Đáp án ${i}`] || row[`Answer ${i}`];
            const ansCorrectStr = row[`Đúng ${i}`] || row[`Correct ${i}`];
            
            if (ansContent) {
              const contentVal = String(ansContent).trim();
              const correctVal = ansCorrectStr && 
                (String(ansCorrectStr).toLowerCase().trim() === "x" || 
                 String(ansCorrectStr).toLowerCase().trim() === "true" || 
                 String(ansCorrectStr).toLowerCase().trim() === "đúng" || 
                 String(ansCorrectStr).toLowerCase().trim() === "1");

              questionAnswers.push({
                content: contentVal,
                isCorrect: !!correctVal
              });
            }
          }

          dtos.push({
            code: code ? String(code).trim() : "",
            name: String(name).trim(),
            content: String(content).trim(),
            questionType,
            difficultyLevel,
            explanation: explanation ? String(explanation).trim() : null,
            categoryId,
            point,
            questionAnswers
          });
        }

        if (dtos.length === 0) {
          showToast("Không tìm thấy dòng dữ liệu hợp lệ (yêu cầu Tiêu đề & Nội dung)", "error");
          return;
        }

        const res = await questionApi.import(dtos);
        if (res.success) {
          showToast(`Nhập thành công ${res.data?.length || dtos.length} câu hỏi!`);
          triggerRefresh();
        } else {
          showToast(res.message || "Lỗi khi nhập danh sách câu hỏi", "error");
        }
      } catch (err: any) {
        console.error("Import Excel error", err);
        showToast("Lỗi khi đọc file Excel: " + err.message, "error");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const openViewModal = (item: QuestionItem) => {
    setSelectedItemForView(item);
    setIsViewModalOpen(true);
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + items.length, totalRecords);

  const getDifficultyBadgeColor = (level: number) => {
    switch (level) {
      case 1: // Dễ
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";
      case 2: // Trung bình
        return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
      case 3: // Khó
        return "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400";
      default:
        return "bg-gray-50 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400";
    }
  };

  const getTypeBadgeColor = (type: number) => {
    switch (type) {
      case 1:
        return "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";
      case 2:
        return "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400";
      case 3:
        return "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400";
      case 4:
        return "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400";
      default:
        return "bg-gray-50 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400";
    }
  };

  return (
    <div className="overflow-hidden bg-white dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/[0.05]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[99999] flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl shadow-2xl border border-white/10 dark:border-black/5 animate-bounce">
          {toastType === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
          )}
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header section with Title and Add Button */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-white/[0.05] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-gray-50/20">
        <div>
          <h2 className="text-lg font-bold text-gray-950 dark:text-white">{t("question.title")}</h2>
          <p className="text-xs text-gray-500 mt-1">{t("question.description")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-theme-xs rounded-lg"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {t("question.exportExcel", { defaultValue: "Xuất Excel" })}
          </button>
          <PermissionGuard requiredPermission="Question.Create">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-theme-xs rounded-lg"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              {t("question.downloadTemplate", { defaultValue: "Tải file mẫu" })}
            </button>
          </PermissionGuard>
          <PermissionGuard requiredPermission="Question.Create">
            <label
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-theme-xs rounded-lg cursor-pointer"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
              {t("question.importExcel", { defaultValue: "Nhập Excel" })}
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleImportExcel}
                className="hidden"
              />
            </label>
          </PermissionGuard>
          <PermissionGuard requiredPermission="Question.Create">
            <Link
              href="/question-bank/create"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 transition-colors shadow-theme-xs"
            >
              <PlusIcon className="w-4 h-4" />
              {t("question.addQuestion", { defaultValue: "Thêm câu hỏi" })}
            </Link>
          </PermissionGuard>
        </div>
      </div>

      {/* Filter panel */}
      <div className="p-6 border-b border-gray-100 dark:border-white/[0.05] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50/10">
        {/* Search */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("question.filterKeyword")}</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("question.filterKeywordPlaceholder")}
            className="w-full h-10 px-3.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-brand-300 dark:focus:border-brand-800 focus:outline-hidden dark:text-white"
          />
        </div>

        {/* Category */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("question.filterCategory")}</label>
          <select
            value={selectedCategory || ""}
            onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full h-10 px-3.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-brand-300 focus:outline-hidden dark:text-white"
          >
            <option value="">{t("question.filterCategoryAll")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Type */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("question.filterType")}</label>
          <select
            value={selectedType || ""}
            onChange={(e) => setSelectedType(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full h-10 px-3.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-brand-300 focus:outline-hidden dark:text-white"
          >
            <option value="">{t("question.filterTypeAll")}</option>
            <option value="1">{t("question.typeSingle")} (Single Choice)</option>
            <option value="2">{t("question.typeMultiple")} (Multiple Choice)</option>
            <option value="3">{t("question.typeEssay")} (Essay)</option>
            <option value="4">{t("question.typeTrueFalse")} (True / False)</option>
          </select>
        </div>

        {/* Difficulty */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("question.filterDifficulty")}</label>
          <select
            value={selectedDifficulty || ""}
            onChange={(e) => setSelectedDifficulty(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full h-10 px-3.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:border-brand-300 focus:outline-hidden dark:text-white"
          >
            <option value="">{t("question.filterDifficultyAll")}</option>
            <option value="1">{t("question.difficultyEasy")}</option>
            <option value="2">{t("question.difficultyMedium")}</option>
            <option value="3">{t("question.difficultyHard")}</option>
          </select>
        </div>
      </div>

      {/* Table view */}
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
            <TableRow>
              <TableCell isHeader className="px-6 py-4 text-center w-12 font-semibold text-gray-800 dark:text-gray-200">
                #
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-left font-semibold text-gray-800 dark:text-gray-200">
                {t("question.colQuestion")}
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 dark:text-gray-200 w-32">
                {t("question.colType")}
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 dark:text-gray-200 w-28">
                {t("question.colDifficulty")}
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 dark:text-gray-200 w-24">
                {t("question.colPoint")}
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-left font-semibold text-gray-800 dark:text-gray-200 w-40">
                {t("question.colCreatedBy")}
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-left font-semibold text-gray-800 dark:text-gray-200 w-32">
                {t("question.colCreatedAt")}
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 dark:text-gray-200 w-32">
                {t("question.colActions")}
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {isLoading ? (
              Array.from({ length: itemsPerPage }).map((_, idx) => (
                <TableRow key={idx} className="animate-pulse">
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-8 mx-auto" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-80" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-6 bg-gray-200 dark:bg-white/10 rounded-full w-20 mx-auto" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-6 bg-gray-200 dark:bg-white/10 rounded-full w-16 mx-auto" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-10 mx-auto" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-24" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-20" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-8 bg-gray-200 dark:bg-white/10 rounded w-24 mx-auto" /></TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={8} className="px-6 py-10 text-center text-rose-500 font-medium">
                  {error}
                </TableCell>
              </TableRow>
            ) : items.length > 0 ? (
              items.map((item, index) => (
                <TableRow key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                  <TableCell className="px-6 py-4 text-center text-gray-500 whitespace-nowrap">
                    {startIndex + index + 1}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">
                        {item.name}
                      </div>
                      <div className="text-gray-500 text-xs mt-1 line-clamp-1">
                        {item.content}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1.5 text-xs font-semibold rounded-full ${getTypeBadgeColor(item.questionType)}`}>
                      {getQuestionTypeLabel(item.questionType)}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1.5 text-xs font-semibold rounded-full ${getDifficultyBadgeColor(item.difficultyLevel)}`}>
                      {getDifficultyLabel(item.difficultyLevel)}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center whitespace-nowrap font-medium text-gray-900 dark:text-white">
                    {item.point ?? 0}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-gray-700 dark:text-gray-300 whitespace-nowrap text-sm">
                    {item.createdBy || "System"}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap text-sm">
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString("vi-VN") : "—"}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        title={t("question.viewTooltip")}
                        onClick={() => openViewModal(item)}
                        className="p-1.5 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                      >
                        <EyeIcon className="w-4.5 h-4.5" />
                      </button>
                      <PermissionGuard requiredPermission="Question.Edit">
                        <button
                          title={t("question.editTooltip")}
                          onClick={() => router.push(`/question-bank/edit/${item.id}`)}
                          className="p-1.5 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                        >
                          <PencilIcon className="w-4.5 h-4.5" />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard requiredPermission="Question.Delete">
                        <button
                          title={t("question.deleteTooltip")}
                          onClick={() => openDeleteModal(item)}
                          className="p-1.5 text-gray-500 hover:text-rose-500 dark:text-gray-400 dark:hover:text-rose-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                        >
                          <TrashBinIcon className="w-4.5 h-4.5" />
                        </button>
                      </PermissionGuard>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  {t("question.noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-5 bg-gray-50/50 dark:bg-white/[0.01] border-t border-gray-100 dark:border-white/[0.05]">
        <div className="pb-3 sm:pb-0">
          <p className="text-sm font-medium text-center text-gray-500 dark:text-gray-400 sm:text-left">
            {t("question.showing", { start: totalRecords === 0 ? 0 : startIndex + 1, end: endIndex, total: totalRecords })}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <span className="text-sm text-gray-500">{t("question.entriesPerPage")}</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="py-1 px-2.5 text-sm bg-transparent border border-gray-300 dark:border-gray-700 rounded focus:outline-hidden dark:text-white"
          >
            {[5, 10, 20, 50].map((v) => (
              <option key={v} value={v} className="dark:bg-gray-900 text-gray-800 dark:text-white">
                {v}
              </option>
            ))}
          </select>
          {totalPages > 1 && (
            <PaginationWithIcon
              totalPages={totalPages}
              initialPage={currentPage}
              onPageChange={(p) => setCurrentPage(p)}
            />
          )}
        </div>
      </div>

      {/* View Detail Modal */}
      {selectedItemForView && (
        <QuestionViewModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedItemForView(null);
          }}
          question={selectedItemForView}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        itemName={deleteTarget?.name}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}

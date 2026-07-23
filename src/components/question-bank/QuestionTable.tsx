"use client";

import { useState, useEffect } from "react";
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
import { PencilIcon, TrashBinIcon, PlusIcon } from "@/icons";
import PaginationWithIcon from "@/components/tables/DataTables/TableOne/PaginationWithIcon";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import { QuestionViewModal } from "./QuestionViewModal";
import { questionApi, QuestionItem, QuestionSaveDto } from "@/services/question.api";
import { QuestionCategoryItem } from "@/services/questionCategory.api";
import { commonApi } from "@/services/common.api";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { useTranslation } from "react-i18next";
import { CheckCircle, XCircle, Search, Edit, Trash2, Eye } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

type TabType = "all" | "easy" | "medium" | "hard";

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

  // Tab Filter States (Difficulty Level as Tabs)
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [countAll, setCountAll] = useState(0);
  const [countEasy, setCountEasy] = useState(0);
  const [countMedium, setCountMedium] = useState(0);
  const [countHard, setCountHard] = useState(0);

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
        const res = await commonApi.getQuestionCategories(1, 1000);
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
        // Fetch all matching questions under category/type filters to count difficulty tabs
        const allItemsRes = await questionApi.getAll(1, 10000, {
          keyword: debouncedSearchTerm,
          categoryId: selectedCategory,
          questionType: selectedType,
        });

        if (!mounted) return;

        if (allItemsRes.success && allItemsRes.data) {
          const allList = allItemsRes.data.items || [];
          setCountAll(allList.length);
          setCountEasy(allList.filter(q => q.difficultyLevel === 1).length);
          setCountMedium(allList.filter(q => q.difficultyLevel === 2).length);
          setCountHard(allList.filter(q => q.difficultyLevel === 3).length);

          // Filter by activeTab
          let displayList = allList;
          if (activeTab === "easy") displayList = allList.filter(q => q.difficultyLevel === 1);
          else if (activeTab === "medium") displayList = allList.filter(q => q.difficultyLevel === 2);
          else if (activeTab === "hard") displayList = allList.filter(q => q.difficultyLevel === 3);

          const total = displayList.length;
          setTotalRecords(total);
          setTotalPages(Math.ceil(total / itemsPerPage));

          // Slice for the current page
          const startIndex = (currentPage - 1) * itemsPerPage;
          setItems(displayList.slice(startIndex, startIndex + itemsPerPage));
        } else {
          setError(allItemsRes.message ? t(`backendMessages.${allItemsRes.message}`, { defaultValue: allItemsRes.message }) : "Lỗi hệ thống khi tải câu hỏi.");
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, debouncedSearchTerm, selectedCategory, selectedType, activeTab, refreshKey, t]);

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
        "Tiêu đề": "Câu hỏi mẫu 1",
        "Nội dung": "Chọn câu trả lời đúng cho phép toán 1 + 1",
        "Loại": "Chọn một",
        "Độ khó": "Dễ",
        "Điểm": 1,
        "Giải thích": "Phép toán cơ bản",
        "Danh mục": "Toán học",
        "Đáp án 1": "2",
        "Đúng 1": "x",
        "Đáp án 2": "3",
        "Đúng 2": "",
        "Đáp án 3": "4",
        "Đúng 3": "",
        "Đáp án 4": "",
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
            } else if (dNorm.includes("trung bình") || dNorm.includes("medium") || dNorm.includes("normal") || dNorm === "2") {
              difficultyLevel = 2;
            } else if (dNorm.includes("khó") || dNorm.includes("hard") || dNorm === "3") {
              difficultyLevel = 3;
            }
          }

          let point = 1;
          if (pointStr) {
            const parsed = parseFloat(String(pointStr));
            if (!isNaN(parsed)) {
              point = parsed;
            }
          }

          const answerList: { content: string; isCorrect: boolean }[] = [];
          for (let i = 1; i <= 6; i++) {
            const ansContent = row[`Đáp án ${i}`] || row[`Answer ${i}`];
            const isCorrectMark = row[`Đúng ${i}`] || row[`Correct ${i}`];
            if (ansContent) {
              answerList.push({
                content: String(ansContent).trim(),
                isCorrect: String(isCorrectMark).toLowerCase().trim() === "x" || String(isCorrectMark).toLowerCase().trim() === "true" || String(isCorrectMark) === "1"
              });
            }
          }

          // Find matching category ID
          let categoryId: number | undefined = undefined;
          if (categoryName && categories.length > 0) {
            const found = categories.find(
              (c) => c.name.toLowerCase().trim() === String(categoryName).toLowerCase().trim()
            );
            if (found) {
              categoryId = found.id;
            }
          }

          dtos.push({
            code: code ? String(code).trim() : undefined,
            name: String(name).trim(),
            content: String(content).trim(),
            questionType,
            difficultyLevel,
            point,
            explanation: explanation ? String(explanation).trim() : null,
            categoryId,
            questionAnswers: answerList,
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

  const handleClearFilters = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setSelectedCategory(undefined);
    setSelectedType(undefined);
    setCurrentPage(1);
    triggerRefresh();
  };

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-visible">
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

      {/* Header with Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {t("question.title", { defaultValue: "Ngân hàng câu hỏi" })}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t("question.description", { defaultValue: "Quản lý thư viện câu hỏi, nhập xuất dữ liệu và tạo câu hỏi mới." })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-theme-xs rounded-lg cursor-pointer h-11"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {t("question.exportExcel", { defaultValue: "Xuất Excel" })}
          </button>
          <PermissionGuard requiredPermission="Question.Create">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-theme-xs rounded-lg cursor-pointer h-11"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              {t("question.downloadTemplate", { defaultValue: "Tải file mẫu" })}
            </button>
          </PermissionGuard>
          <PermissionGuard requiredPermission="Question.Create">
            <label
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-theme-xs rounded-lg cursor-pointer h-11"
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
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-theme-xs transition-colors h-11"
            >
              <PlusIcon className="w-4.5 h-4.5" />
              {t("question.addQuestion", { defaultValue: "Thêm câu hỏi" })}
            </Link>
          </PermissionGuard>
        </div>
      </div>

      {/* Tab Filter (Difficulty Level as Tabs) */}
      <div className="flex flex-wrap items-center gap-2 px-5 sm:px-6 pt-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
        <button
          onClick={() => { setActiveTab("all"); setCurrentPage(1); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === "all"
              ? "border-brand-500 text-brand-500 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {t("question.tabAll", { defaultValue: "Tất cả" })} <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold">{countAll}</span>
        </button>
        <button
          onClick={() => { setActiveTab("easy"); setCurrentPage(1); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === "easy"
              ? "border-brand-500 text-brand-500 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {t("question.difficultyEasy", { defaultValue: "Dễ" })} <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold">{countEasy}</span>
        </button>
        <button
          onClick={() => { setActiveTab("medium"); setCurrentPage(1); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === "medium"
              ? "border-brand-500 text-brand-500 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {t("question.difficultyMedium", { defaultValue: "Trung bình" })} <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold">{countMedium}</span>
        </button>
        <button
          onClick={() => { setActiveTab("hard"); setCurrentPage(1); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === "hard"
              ? "border-brand-500 text-brand-500 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {t("question.difficultyHard", { defaultValue: "Khó" })} <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold">{countHard}</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="p-4 sm:p-5 border-b border-gray-150 dark:border-gray-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 w-full items-end">
          {/* Text Search */}
          <div className="relative md:col-span-4">
            <label className="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("question.filterKeyword", { defaultValue: "Tìm kiếm" })}
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={t("question.filterKeywordPlaceholder", { defaultValue: "Tìm kiếm câu hỏi..." })}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-transparent border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400 h-11"
              />
              <span className="absolute left-3 top-3.5 text-gray-400">
                <Search className="w-4 h-4" />
              </span>
            </div>
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3">
            <label className="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("question.filterCategory", { defaultValue: "Danh mục" })}
            </label>
            <SearchableSelect
              options={categories.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              value={selectedCategory || ""}
              onChange={(val) => {
                setSelectedCategory(val ? Number(val) : undefined);
                setCurrentPage(1);
              }}
              placeholder={t("question.filterCategoryAll", { defaultValue: "Tất cả danh mục" })}
              onClear={() => {
                setSelectedCategory(undefined);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Type Filter */}
          <div className="md:col-span-3">
            <label className="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("question.filterType", { defaultValue: "Loại câu hỏi" })}
            </label>
            <select
              value={selectedType || ""}
              onChange={(e) => {
                setSelectedType(e.target.value ? Number(e.target.value) : undefined);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-sm bg-transparent border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all h-11 cursor-pointer"
            >
              <option value="" className="dark:bg-gray-900">{t("question.filterTypeAll", { defaultValue: "Tất cả loại câu hỏi" })}</option>
              <option value="1" className="dark:bg-gray-900">{t("question.typeSingle")} (Single Choice)</option>
              <option value="2" className="dark:bg-gray-900">{t("question.typeMultiple")} (Multiple Choice)</option>
              <option value="3" className="dark:bg-gray-900">{t("question.typeEssay")} (Essay)</option>
              <option value="4" className="dark:bg-gray-900">{t("question.typeTrueFalse")} (True / False)</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-center justify-end h-11 md:col-span-2">
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center justify-center px-4 h-11 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors cursor-pointer w-full md:w-auto shadow-theme-xs"
            >
              {t("question.btnClear", { defaultValue: "Xóa bộ lọc" })}
            </button>
          </div>
        </div>
      </div>

      {/* Table view */}
      <div className="max-w-full overflow-visible custom-scrollbar">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
            <TableRow>
              <TableCell isHeader className="px-6 py-4 text-center w-12 font-semibold text-gray-800 dark:text-gray-200 text-xs">
                #
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-left font-semibold text-gray-800 dark:text-gray-200 text-xs">
                {t("question.colQuestion")}
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 dark:text-gray-200 w-32 text-xs">
                {t("question.colType")}
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 dark:text-gray-200 w-28 text-xs">
                {t("question.colDifficulty")}
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 dark:text-gray-200 w-24 text-xs">
                {t("question.colPoint")}
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-left font-semibold text-gray-800 dark:text-gray-200 w-40 text-xs">
                {t("question.colCreatedBy")}
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-left font-semibold text-gray-800 dark:text-gray-200 w-32 text-xs">
                {t("question.colCreatedAt")}
              </TableCell>
              <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 dark:text-gray-200 w-32 text-xs">
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
                        type="button"
                        title={t("question.viewTooltip")}
                        onClick={() => openViewModal(item)}
                        className="p-1.5 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <PermissionGuard requiredPermission="Question.Edit">
                        <button
                          type="button"
                          title={t("question.editTooltip")}
                          onClick={() => router.push(`/question-bank/edit/${item.id}`)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard requiredPermission="Question.Delete">
                        <button
                          type="button"
                          title={t("question.deleteTooltip")}
                          onClick={() => openDeleteModal(item)}
                          className="p-1.5 text-error-600 hover:text-error-800 dark:text-error-400 dark:hover:text-error-300 hover:bg-error-50 dark:hover:bg-error-950/30 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Pagination Footer */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between px-6 py-5 bg-gray-50/50 dark:bg-white/[0.01] border-t border-gray-100 dark:border-gray-800/40">
        <div className="flex flex-wrap items-center gap-4 pb-3 xl:pb-0 justify-center xl:justify-start">
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <span>{t("question.show", { defaultValue: "Hiển thị" })}</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-8 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-2 text-sm text-gray-750 dark:text-gray-350 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer font-medium"
            >
              <option value="5" className="dark:bg-gray-900">5</option>
              <option value="10" className="dark:bg-gray-900">10</option>
              <option value="20" className="dark:bg-gray-900">20</option>
              <option value="50" className="dark:bg-gray-900">50</option>
            </select>
            <span>{t("question.entriesPerPage", { defaultValue: "mục mỗi trang" })}</span>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t("question.showing", {
              start: totalRecords === 0 ? 0 : startIndex + 1,
              end: endIndex,
              total: totalRecords,
              defaultValue: `Hiển thị ${totalRecords === 0 ? 0 : startIndex + 1} đến ${endIndex} trong tổng số ${totalRecords} mục`
            })}
          </p>
        </div>
        {totalPages > 1 && (
          <PaginationWithIcon
            totalPages={totalPages}
            initialPage={currentPage}
            onPageChange={(p) => setCurrentPage(p)}
          />
        )}
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

"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AngleDownIcon, AngleUpIcon } from "@/icons";
import PaginationWithIcon from "@/components/tables/DataTables/TableOne/PaginationWithIcon";
import { CategoryFormModal } from "./CategoryFormModal";
import { CategoryViewModal } from "./CategoryViewModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import { Plus, Search, CheckCircle, XCircle, Eye, Edit, Trash2 } from "lucide-react";
import {
  questionCategoryApi,
  QuestionCategoryItem,
} from "@/services/questionCategory.api";
import { commonApi } from "@/services/common.api";
import { CodeHelper } from "@/helpers/CodeHelper";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { useTranslation } from "react-i18next";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = "code" | "name" | "description";
type SortOrder = "asc" | "desc";

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuestionCategoryTable() {
  const { t } = useTranslation();

  // ── Dynamic Metadata ──
  useEffect(() => {
    document.title = `${t("questionCategory.title")} | School Management System`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", t("questionCategory.description"));
    }
  }, [t]);

  // ── Data states ──
  const [items, setItems] = useState<QuestionCategoryItem[]>([]);
  const [courses, setCourses] = useState<{ id: number; code: string; name: string }[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Pagination / search / sort / course filter ──
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState<number | undefined>(undefined);
  // ── Refresh trigger ──
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  // ── Toast ──
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // ── Fetch courses for filter and dropdown ──
  useEffect(() => {
    async function loadCourses() {
      try {
        const res = await commonApi.getCourses(1, 100, "", true);
        if (res.success && res.data) {
          setCourses(res.data.items || []);
        }
      } catch {}
    }
    loadCourses();
  }, []);

  // ── Create / Edit modal ──
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QuestionCategoryItem | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCourseId, setFormCourseId] = useState<number | null>(null);
  const [formCourseName, setFormCourseName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // ── Delete confirm modal ──
  const [deleteTarget, setDeleteTarget] = useState<QuestionCategoryItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Toast auto-hide ──
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
  };

  // ── Debounce search ──
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ── Fetch data ──
  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await questionCategoryApi.getAll(
          currentPage,
          itemsPerPage,
          debouncedSearchTerm,
          courseFilter
        );
        if (!mounted) return;
        if (res.success && res.data) {
          setItems(res.data.items || []);
          setTotalRecords(res.data.totalRecords || 0);
          setTotalPages(res.data.totalPages || 0);
        } else {
          setError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("questionCategory.systemError"));
        }
      } catch {
        if (mounted) setError(t("questionCategory.systemError"));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, debouncedSearchTerm, courseFilter, refreshKey]);

  // ── Sort ──
  const sortedData = useMemo(() => {
    return [...items].sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      return sortOrder === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [items, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  // ── Open create modal ──
  const openCreateModal = () => {
    setEditingItem(null);
    setFormCode(CodeHelper.generate("QC"));
    setFormName("");
    setFormDesc("");
    setFormCourseId(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  // ── Open edit modal ──
  const openEditModal = (item: QuestionCategoryItem) => {
    setEditingItem(item);
    setFormCode(item.code);
    setFormName(item.name);
    setFormDesc(item.description ?? "");
    setFormCourseId(item.courseId ?? null);
    setFormError(null);
    setIsModalOpen(true);
  };

  // ── Open view modal ──
  const openViewModal = async (item: QuestionCategoryItem) => {
    setFormCode("");
    setFormName("");
    setFormDesc("");
    setFormCourseName(null);
    setFormError(null);
    setIsLoadingDetail(true);
    setIsViewModalOpen(true);

    try {
      const res = await questionCategoryApi.getById(item.id);
      if (res.success && res.data) {
        setFormCode(res.data.code);
        setFormName(res.data.name);
        setFormDesc(res.data.description ?? "");
        setFormCourseName(res.data.courseName ?? item.courseName ?? null);
      } else {
        setFormError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("questionCategory.systemError"));
      }
    } catch {
      setFormError(t("questionCategory.systemError"));
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // ── Submit create / edit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim()) {
      setFormError(t("backendMessages.ERR_CODE_EMPTY"));
      return;
    }
    if (!formName.trim()) {
      setFormError(t("backendMessages.ERR_NAME_EMPTY"));
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingItem) {
        // Edit
        const res = await questionCategoryApi.update(editingItem.id, {
          id: editingItem.id,
          code: formCode.trim(),
          name: formName.trim(),
          description: formDesc.trim() || null,
          courseId: formCourseId,
        });
        if (res.success && res.data) {
          setItems((prev) =>
            prev.map((i) => (i.id === editingItem.id ? res.data : i))
          );
          showToast(t("questionCategory.updateSuccess", { name: res.data.name }));
          setIsModalOpen(false);
        } else {
          setFormError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("questionCategory.updateError"));
        }
      } else {
        // Create
        const res = await questionCategoryApi.create({
          code: formCode.trim(),
          name: formName.trim(),
          description: formDesc.trim() || null,
          courseId: formCourseId,
        });
        if (res.success && res.data) {
          setCurrentPage(1);
          setSearchTerm("");
          setDebouncedSearchTerm("");
          triggerRefresh();
          showToast(t("questionCategory.createSuccess", { name: res.data.name }));
          setIsModalOpen(false);
        } else {
          setFormError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("questionCategory.createError"));
        }
      }
    } catch {
      setFormError(t("questionCategory.systemError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Open delete confirm ──
  const openDeleteModal = (item: QuestionCategoryItem) => {
    setDeleteTarget(item);
    setIsDeleteModalOpen(true);
  };

  // ── Confirm delete ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await questionCategoryApi.delete(deleteTarget.id);
      if (res.success) {
        showToast(t("questionCategory.deleteSuccess", { name: deleteTarget.name }));
        setIsDeleteModalOpen(false);
        setDeleteTarget(null);
        triggerRefresh();
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("questionCategory.deleteError"), "error");
      }
    } catch {
      showToast(t("questionCategory.systemError"), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Pagination helpers ──
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + items.length, totalRecords);

  const columns: { key: SortKey; label: string }[] = [
    { key: "code", label: t("questionCategory.colCode") },
    { key: "name", label: t("questionCategory.colName") },
    { key: "description", label: t("questionCategory.colDescription") },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-xs">
      {/* Card Header */}
      <div className="flex flex-col gap-4 px-5 sm:px-6 py-5 border-b border-gray-100 dark:border-gray-850 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {t("questionCategory.title")}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t("questionCategory.description")}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          <PermissionGuard requiredPermission="QuestionCategory.Create">
            <button
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-theme-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t("questionCategory.addCategory")}
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 sm:p-5 border-b border-gray-150 dark:border-gray-800 bg-gray-50/20 dark:bg-gray-900/10">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between w-full">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full sm:max-w-md">
            {/* Text Search */}
            <div className="relative w-full sm:max-w-xs">
              <input
                type="text"
                placeholder={t("questionCategory.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 w-full pl-10 pr-4 py-2 text-sm bg-transparent border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder-gray-400"
              />
              <span className="absolute left-3 top-3.5 text-gray-400">
                <Search className="w-4 h-4" />
              </span>
            </div>

            {/* Course Filter */}
            <select
              value={courseFilter ?? ""}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined;
                setCourseFilter(val);
                setCurrentPage(1);
              }}
              className="h-11 px-3 text-sm bg-transparent border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            >
              <option value="" className="dark:bg-gray-900">Tất cả khóa học</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id} className="dark:bg-gray-900">
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Reset button */}
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setCourseFilter(undefined);
            }}
            className="inline-flex items-center justify-center px-4 h-11 text-sm font-medium text-gray-700 bg-white border border-gray-355 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-theme-xs shrink-0 w-full sm:w-auto"
          >
            {t("common.clearFilters")}
          </button>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
            <TableRow>
              <TableCell
                isHeader
                className="px-6 py-4 border-r border-gray-100 dark:border-white/[0.05] text-center w-12"
              >
                <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">#</p>
              </TableCell>
              {columns.map(({ key, label }) => (
                <TableCell
                  key={key}
                  isHeader
                  className="px-6 py-4 border-r last:border-r-0 border-gray-100 dark:border-white/[0.05] text-left"
                >
                  <div
                    className="flex items-center justify-between cursor-pointer select-none"
                    onClick={() => handleSort(key)}
                  >
                    <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">
                      {label}
                    </p>
                    <button className="flex flex-col gap-0.5 ml-2">
                      <AngleUpIcon
                        className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${
                          sortKey === key && sortOrder === "asc"
                            ? "text-brand-500 dark:text-brand-400"
                            : ""
                        }`}
                      />
                      <AngleDownIcon
                        className={`text-gray-400 dark:text-gray-600 w-3 h-3 ${
                          sortKey === key && sortOrder === "desc"
                            ? "text-brand-500 dark:text-brand-400"
                            : ""
                        }`}
                      />
                    </button>
                  </div>
                </TableCell>
              ))}
              <TableCell
                isHeader
                className="px-6 py-4 border-r border-gray-100 dark:border-white/[0.05] text-center font-semibold text-gray-800 text-theme-sm dark:text-gray-200"
              >
                Khóa học
              </TableCell>
              <TableCell
                isHeader
                className="px-6 py-4 text-center font-semibold text-gray-800 text-theme-sm dark:text-gray-200"
              >
                {t("questionCategory.colActions")}
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {isLoading ? (
              Array.from({ length: itemsPerPage }).map((_, idx) => (
                <TableRow key={idx} className="animate-pulse">
                  <TableCell className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-8" />
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-40" />
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-64" />
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-20" />
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <div className="h-8 w-8 bg-gray-200 dark:bg-white/10 rounded-md" />
                      <div className="h-8 w-8 bg-gray-200 dark:bg-white/10 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="px-6 py-10 text-center text-error-500 dark:text-error-400 font-medium"
                >
                  {error}
                </TableCell>
              </TableRow>
            ) : sortedData.length > 0 ? (
              sortedData.map((item, index) => (
                <TableRow
                  key={item.id}
                  className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors"
                >
                  <TableCell className="px-6 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap w-12 text-center">
                    {startIndex + index + 1}
                  </TableCell>
                  <TableCell className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    {item.code}
                  </TableCell>
                  <TableCell className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    {item.name}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-400 max-w-[420px] truncate">
                    {item.description || (
                      <span className="italic text-gray-400 dark:text-gray-600">
                        {t("questionCategory.noDescription", { defaultValue: "Không có mô tả" })}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center whitespace-nowrap">
                    {item.courseName ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200/50">
                        {item.courseName}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        Tất cả khóa học
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <PermissionGuard requiredPermission="QuestionCategory.View">
                        <button
                          type="button"
                          title={t("questionCategory.viewTooltip", { defaultValue: "Xem chi tiết" })}
                          onClick={() => openViewModal(item)}
                          className="p-1.5 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard requiredPermission="QuestionCategory.Edit">
                        <button
                          type="button"
                          title="Chỉnh sửa"
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-955/30 rounded-md transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard requiredPermission="QuestionCategory.Delete">
                        <button
                          type="button"
                          title="Xóa"
                          onClick={() => openDeleteModal(item)}
                          className="p-1.5 text-error-600 hover:text-error-800 dark:text-error-400 dark:hover:text-error-300 hover:bg-error-50 dark:hover:bg-error-955/30 rounded-md transition-colors"
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
                <TableCell
                  colSpan={6}
                  className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                >
                  {t("questionCategory.noResults", { defaultValue: "Không tìm thấy danh mục câu hỏi nào." })}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between px-6 py-5 bg-gray-50/50 dark:bg-white/[0.01] border-t border-gray-100 dark:border-white/[0.05]">
        <div className="flex flex-wrap items-center gap-4 pb-3 xl:pb-0 justify-center xl:justify-start">
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <span>{t("common.show")}</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-8 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-2 text-sm text-gray-700 dark:text-gray-350 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer font-medium"
            >
              <option value="5" className="dark:bg-gray-900">5</option>
              <option value="10" className="dark:bg-gray-900">10</option>
              <option value="20" className="dark:bg-gray-900">20</option>
              <option value="50" className="dark:bg-gray-900">50</option>
            </select>
            <span>{t("common.entriesPerPage")}</span>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t("questionCategory.showing", { start: totalRecords === 0 ? 0 : startIndex + 1, end: endIndex, total: totalRecords, defaultValue: `Hiển thị ${totalRecords === 0 ? 0 : startIndex + 1} đến ${endIndex} trong tổng số ${totalRecords} mục` })}
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

      {/* ── Create / Edit Modal ── */}
      <CategoryFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        t={t}
        editingItem={editingItem}
        formCode={formCode}
        setFormCode={setFormCode}
        formName={formName}
        setFormName={setFormName}
        formDesc={formDesc}
        setFormDesc={setFormDesc}
        formCourseId={formCourseId}
        setFormCourseId={setFormCourseId}
        courses={courses}
        formError={formError}
        isSubmitting={isSubmitting}
        handleSubmit={handleSubmit}
      />

      {/* ── View Modal ── */}
      <CategoryViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        t={t}
        formCode={formCode}
        formName={formName}
        formDesc={formDesc}
        formCourseName={formCourseName}
        isLoadingDetail={isLoadingDetail}
        formError={formError}
      />

      {/* ── Delete Confirm Modal ── */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        itemName={deleteTarget?.name}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
      />

      {/* Toast Alert */}
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
    </div>
  );
}

"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AngleDownIcon, AngleUpIcon, PencilIcon, TrashBinIcon, EyeIcon } from "@/icons";
import PaginationWithIcon from "@/components/tables/DataTables/TableOne/PaginationWithIcon";
import { CategoryFormModal } from "./CategoryFormModal";
import { CategoryViewModal } from "./CategoryViewModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import {
  questionCategoryApi,
  QuestionCategoryItem,
} from "@/services/questionCategory.api";
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
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Pagination / search / sort ──
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  // ── Refresh trigger: tăng lên để ép re-fetch dù các state khác không đổi ──
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  // ── Toast ──
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // ── Create / Edit modal ──
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QuestionCategoryItem | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
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
    const t = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
  };

  // ── Debounce search ──
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(t);
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
          debouncedSearchTerm
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
  }, [currentPage, itemsPerPage, debouncedSearchTerm, refreshKey]);

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
    setFormError(null);
    setIsModalOpen(true);
  };

  // ── Open edit modal ──
  const openEditModal = (item: QuestionCategoryItem) => {
    setEditingItem(item);
    setFormCode(item.code);
    setFormName(item.name);
    setFormDesc(item.description ?? "");
    setFormError(null);
    setIsModalOpen(true);
  };

  // ── Open view modal ──
  const openViewModal = async (item: QuestionCategoryItem) => {
    setFormCode("");
    setFormName("");
    setFormDesc("");
    setFormError(null);
    setIsLoadingDetail(true);
    setIsViewModalOpen(true);

    try {
      const res = await questionCategoryApi.getById(item.id);
      if (res.success && res.data) {
        setFormCode(res.data.code);
        setFormName(res.data.name);
        setFormDesc(res.data.description ?? "");
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
        triggerRefresh(); // ép re-fetch để đồng bộ pagination
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
    <div className="overflow-hidden bg-white dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/[0.05]">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[99999] flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl shadow-2xl border border-white/10 dark:border-black/5 animate-bounce">
          {toastType === "success" ? (
            <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header controls */}
      <div className="flex flex-col gap-3 px-6 py-5 border-b border-gray-100 dark:border-white/[0.05] sm:flex-row sm:items-center sm:justify-between">
        {/* Show N entries */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">{t("questionCategory.show")}</span>
          <div className="relative z-20 bg-transparent">
            <select
              className="w-full py-2 pl-3 pr-8 text-sm text-gray-800 bg-transparent border border-gray-300 rounded-lg appearance-none dark:bg-dark-900 h-9 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {[5, 10, 15, 20].map((v) => (
                <option key={v} value={v} className="text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                  {v}
                </option>
              ))}
            </select>
            <span className="absolute z-30 text-gray-500 -translate-y-1/2 right-2 top-1/2 dark:text-gray-400 pointer-events-none">
              <svg className="stroke-current" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3.8335 5.9165L8.00016 10.0832L12.1668 5.9165" stroke="" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{t("questionCategory.entries")}</span>
        </div>

        {/* Search + Add button */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <button className="absolute text-gray-500 -translate-y-1/2 left-4 top-1/2 dark:text-gray-400">
              <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M3.04199 9.37363C3.04199 5.87693 5.87735 3.04199 9.37533 3.04199C12.8733 3.04199 15.7087 5.87693 15.7087 9.37363C15.7087 12.8703 12.8733 15.7053 9.37533 15.7053C5.87735 15.7053 3.04199 12.8703 3.04199 9.37363ZM9.37533 1.54199C5.04926 1.54199 1.54199 5.04817 1.54199 9.37363C1.54199 13.6991 5.04926 17.2053 9.37533 17.2053C11.2676 17.2053 13.0032 16.5344 14.3572 15.4176L17.1773 18.238C17.4702 18.5309 17.945 18.5309 18.2379 18.238C18.5308 17.9451 18.5309 17.4703 18.238 17.1773L15.4182 14.3573C16.5367 13.0033 17.2087 11.2669 17.2087 9.37363C17.2087 5.04817 13.7014 1.54199 9.37533 1.54199Z" fill="" />
              </svg>
            </button>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("questionCategory.searchPlaceholder")}
              className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-11 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[250px]"
            />
          </div>
          <PermissionGuard requiredPermission="QuestionCategory.Create">
            <button
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 transition-colors shadow-theme-xs"
            >
              <svg className="fill-current" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8.00016 3.33331V12.6666M3.3335 7.99998H12.6668" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t("questionCategory.addCategory")}
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* Table */}
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
                  colSpan={5}
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
                    <div className="flex items-center justify-center gap-2">
                      <PermissionGuard requiredPermission="QuestionCategory.View">
                        <button
                          title={t("questionCategory.viewTooltip", { defaultValue: "Xem chi tiết" })}
                          onClick={() => openViewModal(item)}
                          className="p-1.5 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard requiredPermission="QuestionCategory.Edit">
                        <button
                          title="Chỉnh sửa"
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard requiredPermission="QuestionCategory.Delete">
                        <button
                          title="Xóa"
                          onClick={() => openDeleteModal(item)}
                          className="p-1.5 text-gray-500 hover:text-error-500 dark:text-gray-400 dark:hover:text-error-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                        >
                          <TrashBinIcon className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
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
        <div className="pb-3 xl:pb-0">
          <p className="text-sm font-medium text-center text-gray-500 dark:text-gray-400 xl:text-left">
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
    </div>
  );
}

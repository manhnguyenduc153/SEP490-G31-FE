"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PencilIcon, TrashBinIcon } from "@/icons";
import PaginationWithIcon from "@/components/tables/DataTables/TableOne/PaginationWithIcon";
import { ParentStudentFormModal } from "./ParentStudentFormModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import {
  parentStudentApi,
  ParentStudentItem,
  ParentStudentSaveDto,
} from "@/services/parentStudent.api";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/modal";
import { Users, Eye, Plus, Search, Edit, Trash2 } from "lucide-react";
import { ChildItem } from "@/services/parentStudent.api";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ParentStudentTableProps {
  /** ID học sinh — bắt buộc để lọc và tạo phụ huynh đúng học sinh */
  studentId?: number;
  studentName?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ParentStudentTable({
  studentId,
  studentName,
}: ParentStudentTableProps) {
  const { t } = useTranslation();

  // ── Dynamic Metadata ──
  useEffect(() => {
    document.title = `${t("parentStudent.title")} | School Management System`;
  }, [t]);

  // ── Data states ──
  const [items, setItems] = useState<ParentStudentItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Pagination / search ──
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Modal states ──
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ParentStudentItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Delete modal ──
  const [deletingItem, setDeletingItem] = useState<ParentStudentItem | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Children modal ──
  const [viewingChildren, setViewingChildren] = useState<ChildItem[]>([]);
  const [isChildrenOpen, setIsChildrenOpen] = useState(false);

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
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await parentStudentApi.getAll(
          currentPage,
          pageSize,
          debouncedSearchTerm,
          studentId
        );
        if (res.statusCode === 200 && res.data) {
          setItems(res.data.items || []);
          setTotalRecords(res.data.totalRecords || 0);
          setTotalPages(res.data.totalPages || 0);
        } else {
          setError(
            res.message
              ? t(`backendMessages.${res.message}`, { defaultValue: res.message })
              : t("parentStudent.systemError")
          );
        }
      } catch {
        setError(t("parentStudent.systemError"));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentPage, pageSize, debouncedSearchTerm, studentId, refreshKey, t]);

  // ──────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────

  const openCreateModal = () => {
    setEditingItem(null);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (item: ParentStudentItem) => {
    setEditingItem(item);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (dto: ParentStudentSaveDto) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      const isEdit = !!editingItem;
      const res = isEdit
        ? await parentStudentApi.update(editingItem!.id, dto)
        : await parentStudentApi.create(dto);

      if (res.statusCode === 200 || res.statusCode === 201) {
        setIsFormOpen(false);
        setRefreshKey((k) => k + 1);
      } else {
        setFormError(
          res.message
            ? t(`backendMessages.${res.message}`, { defaultValue: res.message })
            : t("parentStudent.systemError")
        );
      }
    } catch {
      setFormError(t("parentStudent.systemError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewChildren = (item: ParentStudentItem) => {
    setViewingChildren(item.children || []);
    setIsChildrenOpen(true);
  };

  const openDeleteModal = (item: ParentStudentItem) => {
    setDeletingItem(item);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      const res = await parentStudentApi.delete(deletingItem.id);
      if (res.statusCode === 200) {
        setIsDeleteOpen(false);
        setDeletingItem(null);
        setRefreshKey((k) => k + 1);
      } else {
        setError(
          res.message
            ? t(`backendMessages.${res.message}`, { defaultValue: res.message })
            : t("parentStudent.systemError")
        );
        setIsDeleteOpen(false);
      }
    } catch {
      setError(t("parentStudent.systemError"));
    } finally {
      setIsDeleting(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────────────

  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  const getStatusBadge = (status: number) => {
    if (status === 1)
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          {t("parentStudent.statusActive")}
        </span>
      );
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
        {t("parentStudent.statusInactive")}
      </span>
    );
  };

  const getAccountBadge = (userId?: string | null) => {
    if (userId)
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          ✓ {t("parentStudent.accountLinked")}
        </span>
      );
    return (
      <span className="text-xs text-gray-400">{t("parentStudent.accountNone")}</span>
    );
  };

  // ──────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-155 dark:border-gray-800 rounded-2xl shadow-xs">
      {/* Header */}
      <div className="flex flex-col gap-4 px-5 sm:px-6 py-5 border-b border-gray-100 dark:border-gray-800/80 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {t("parentStudent.title")}
          </h3>
          {studentName ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Học sinh: <span className="font-semibold text-gray-750 dark:text-gray-300">{studentName}</span>
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t("parentStudent.subtitle", { defaultValue: "Quản lý mối liên kết phụ huynh và học sinh." })}
            </p>
          )}
        </div>
        <PermissionGuard requiredPermission="ParentStudent.Create">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-theme-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            {t("parentStudent.addParent")}
          </button>
        </PermissionGuard>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 w-full items-end">
          {/* Search Input */}
          <div className="relative md:col-span-9">
            <label className="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("parentStudent.filterKeyword", { defaultValue: "Tìm kiếm" })}
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={t("parentStudent.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-transparent border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400 h-11"
              />
              <span className="absolute left-3 top-3.5 text-gray-400">
                <Search className="w-4 h-4" />
              </span>
            </div>
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-center justify-end h-11 md:col-span-3">
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
              className="inline-flex items-center justify-center px-4 h-11 text-sm font-medium text-gray-700 bg-white border border-gray-355 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors cursor-pointer w-full md:w-auto shadow-theme-xs"
            >
              {t("parentStudent.btnClearFilters", { defaultValue: "Xóa bộ lọc" })}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="max-w-full overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
              <TableRow>
                <TableCell isHeader className="px-6 py-4 border-r border-gray-100 dark:border-white/[0.05] text-center w-12">
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">#</p>
                </TableCell>

                <TableCell isHeader className="px-6 py-4 border-r border-gray-100 dark:border-white/[0.05] text-left">
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">{t("parentStudent.colName")}</p>
                </TableCell>
                <TableCell isHeader className="px-6 py-4 border-r border-gray-100 dark:border-white/[0.05] text-left">
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">{t("parentStudent.colPhone")}</p>
                </TableCell>
                <TableCell isHeader className="px-6 py-4 border-r border-gray-100 dark:border-white/[0.05] text-left">
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">{t("parentStudent.colEmail")}</p>
                </TableCell>
                <TableCell isHeader className="px-6 py-4 border-r border-gray-100 dark:border-white/[0.05] text-left">
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">{t("parentStudent.colChildrenList")}</p>
                </TableCell>
                <TableCell isHeader className="px-6 py-4 border-r border-gray-100 dark:border-white/[0.05] text-left">
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">{t("parentStudent.colAccount")}</p>
                </TableCell>

                <TableCell isHeader className="px-6 py-4 text-center">
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">{t("parentStudent.colActions")}</p>
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <div className="flex justify-center">
                      <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    </div>
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    {t("parentStudent.noResults")}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => (
                  <TableRow
                    key={item.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors"
                  >
                    <TableCell className="px-6 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap w-12 text-center">
                      {startRecord + index}
                    </TableCell>

                    <TableCell className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {item.name}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {item.parentPhone || "—"}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {item.email || "—"}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-gray-650 dark:text-gray-400 whitespace-nowrap">
                      <button
                        onClick={() => handleViewChildren(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 cursor-pointer dark:text-brand-400 dark:bg-brand-950/20 dark:hover:bg-brand-900/30 transition duration-150"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>
                          {item.children?.length || 0}{" "}
                          {t("parentStudent.childUnit", { count: item.children?.length || 1, defaultValue: "con" })}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      {getAccountBadge(item.userId)}
                    </TableCell>

                    <TableCell className="px-6 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <PermissionGuard requiredPermission="ParentStudent.Edit">
                          <button
                            onClick={() => openEditModal(item)}
                            title={t("parentStudent.editTooltip")}
                            className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </PermissionGuard>

                        <PermissionGuard requiredPermission="ParentStudent.Delete">
                          <button
                            onClick={() => openDeleteModal(item)}
                            title={t("parentStudent.deleteTooltip")}
                            className="p-1.5 text-error-600 hover:text-error-800 dark:text-error-400 dark:hover:text-error-300 hover:bg-error-50 dark:hover:bg-error-950/30 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </PermissionGuard>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
      </div>

      {/* Pagination */}
      {!isLoading && totalRecords > 0 && (
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between px-6 py-5 bg-gray-50/50 dark:bg-white/[0.01] border-t border-gray-100 dark:border-white/[0.05]">
          <div className="flex flex-wrap items-center gap-4 pb-3 xl:pb-0 justify-center xl:justify-start">
            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <span>{t("parentStudent.show", { defaultValue: "Hiển thị" })}</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 rounded-lg border border-gray-350 dark:border-gray-700 bg-transparent px-2 text-sm text-gray-700 dark:text-gray-350 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer font-medium"
              >
                {[5, 10, 15, 20].map((v) => (
                  <option key={v} value={v} className="dark:bg-gray-900">
                    {v}
                  </option>
                ))}
              </select>
              <span>{t("parentStudent.entries", { defaultValue: "mục" })}</span>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("parentStudent.showing", {
                start: startRecord,
                end: endRecord,
                total: totalRecords,
              })}
            </p>
          </div>
          {totalPages > 1 && (
            <PaginationWithIcon
              totalPages={totalPages}
              initialPage={currentPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      )}

      {/* Form Modal */}
      <ParentStudentFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        t={t}
        studentId={studentId}
        editingItem={editingItem}
        formError={formError}
        isSubmitting={isSubmitting}
        onSubmit={handleFormSubmit}
      />

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        itemName={deletingItem?.name ?? ""}
      />

      {/* View Children Modal */}
      <Modal
        isOpen={isChildrenOpen}
        onClose={() => setIsChildrenOpen(false)}
        className="max-w-xl w-full"
      >
        <div className="p-6 space-y-4">
          <div className="border-b border-gray-100 dark:border-white/10 pb-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {t("parentStudent.modalChildrenTitle")}
            </h3>
          </div>
          <div className="overflow-hidden border border-gray-150 dark:border-gray-800 rounded-xl">
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-150 dark:border-gray-800">
                <TableRow>
                  <TableCell isHeader className="font-semibold px-4 py-3 text-left">{t("parentStudent.modalColStudent")}</TableCell>
                  <TableCell isHeader className="font-semibold px-4 py-3 text-left">{t("parentStudent.colRelationship")}</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-150 dark:divide-gray-800">
                {viewingChildren && viewingChildren.length > 0 ? (
                  viewingChildren.map((c, i) => (
                    <TableRow key={c.studentId}>
                      <TableCell className="font-medium px-4 py-3 text-gray-900 dark:text-white">
                        {c.studentName || `ID: ${c.studentId}`}
                      </TableCell>
                      <TableCell className="text-gray-500 dark:text-gray-400 px-4 py-3">
                        {c.relationship || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-4 text-gray-400">
                      {t("parentStudent.noChildrenLinkedMsg")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setIsChildrenOpen(false)}
              className="px-4 py-2 text-sm font-semibold border border-gray-250 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg cursor-pointer transition duration-150"
            >
              {t("parentStudent.btnClose", { defaultValue: "Đóng" })}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

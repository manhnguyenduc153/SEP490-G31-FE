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
  const [pageSize] = useState(10);
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
    <div className="overflow-hidden bg-white dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/[0.05]">
      {/* Header bar */}
      <div className="p-6 border-b border-gray-100 dark:border-white/[0.05] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Title + student name */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("parentStudent.title")}
          </h3>
          {studentName && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Học sinh: <span className="font-medium text-gray-700 dark:text-gray-300">{studentName}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("parentStudent.searchPlaceholder")}
              className="pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-64"
            />
            <svg
              className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Add button */}
          <PermissionGuard requiredPermission="ParentStudent.Create">
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t("parentStudent.addParent")}
            </button>
          </PermissionGuard>
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
                  <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">{t("parentStudent.colRelationship")}</p>
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
                    <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {item.relationship || "—"}
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
                            className="p-1.5 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        </PermissionGuard>

                        <PermissionGuard requiredPermission="ParentStudent.Delete">
                          <button
                            onClick={() => openDeleteModal(item)}
                            title={t("parentStudent.deleteTooltip")}
                            className="p-1.5 text-gray-500 hover:text-error-500 dark:text-gray-400 dark:hover:text-error-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                          >
                            <TrashBinIcon className="w-4 h-4" />
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
          <div className="pb-3 xl:pb-0">
            <p className="text-sm font-medium text-center text-gray-500 dark:text-gray-400 xl:text-left">
              {t("parentStudent.showing", {
                start: startRecord,
                end: endRecord,
                total: totalRecords,
              })}
            </p>
          </div>
          <PaginationWithIcon
            totalPages={totalPages}
            initialPage={currentPage}
            onPageChange={setCurrentPage}
          />
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
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PaginationWithIcon from "@/components/tables/DataTables/TableOne/PaginationWithIcon";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import { AngleDownIcon, AngleUpIcon, PencilIcon, TrashBinIcon } from "@/icons";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { teacherApi, TeacherItem } from "@/services/teacher.api";
import { useTranslation } from "react-i18next";

type SortKey = "code" | "name" | "email" | "phone" | "status" | "gradeLevelName";
type SortOrder = "asc" | "desc";

interface TeacherTableProps {
  refreshKey?: number;
  onAddClick: () => void;
  onEditClick: (item: TeacherItem) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function TeacherTable({
  refreshKey: externalRefreshKey,
  onAddClick,
  onEditClick,
  showToast,
}: TeacherTableProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<TeacherItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [deleteTarget, setDeleteTarget] = useState<TeacherItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    document.title = `${t("teacher.title")} | School Management System`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", t("teacher.description"));
    }
  }, [t]);

  useEffect(() => {
    setRefreshKey((key) => key + 1);
  }, [externalRefreshKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await teacherApi.getAll(currentPage, itemsPerPage, debouncedSearchTerm);
        if (!mounted) return;

        if (res.success && res.data) {
          setItems(res.data.items || []);
          setTotalRecords(res.data.totalRecords || 0);
          setTotalPages(res.data.totalPages || 0);
        } else {
          setError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("teacher.systemError"));
        }
      } catch {
        if (mounted) {
          setError(t("teacher.systemError"));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [currentPage, itemsPerPage, debouncedSearchTerm, refreshKey, t]);

  const sortedData = useMemo(() => {
    return [...items].sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      return sortOrder === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [items, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((order) => (order === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const res = await teacherApi.delete(deleteTarget.id);
      if (res.success) {
        showToast(t("teacher.deleteSuccess", { name: deleteTarget.name }));
        setIsDeleteModalOpen(false);
        setDeleteTarget(null);
        setRefreshKey((key) => key + 1);
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("teacher.deleteError"), "error");
      }
    } catch {
      showToast(t("teacher.systemError"), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + items.length, totalRecords);
  const columns: { key: SortKey; label: string }[] = [
    { key: "code", label: t("teacher.colCode") },
    { key: "name", label: t("teacher.colName") },
    { key: "gradeLevelName", label: t("teacher.formGradeLevelLabel") },
    { key: "email", label: t("teacher.colEmail") },
    { key: "phone", label: t("teacher.colPhone") },
    { key: "status", label: t("teacher.colStatus") },
  ];

  return (
    <div className="overflow-hidden bg-white dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/[0.05]">
      <div className="flex flex-col gap-3 px-6 py-5 border-b border-gray-100 dark:border-white/[0.05] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">{t("teacher.show")}</span>
          <select
            className="h-9 rounded-lg border border-gray-300 bg-transparent px-3 pr-8 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            {[5, 10, 15, 20].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-500 dark:text-gray-400">{t("teacher.entries")}</span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
              <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M3.04199 9.37363C3.04199 5.87693 5.87735 3.04199 9.37533 3.04199C12.8733 3.04199 15.7087 5.87693 15.7087 9.37363C15.7087 12.8703 12.8733 15.7053 9.37533 15.7053C5.87735 15.7053 3.04199 12.8703 3.04199 9.37363ZM9.37533 1.54199C5.04926 1.54199 1.54199 5.04817 1.54199 9.37363C1.54199 13.6991 5.04926 17.2053 9.37533 17.2053C11.2676 17.2053 13.0032 16.5344 14.3572 15.4176L17.1773 18.238C17.4702 18.5309 17.945 18.5309 18.2379 18.238C18.5308 17.9451 18.5309 17.4703 18.238 17.1773L15.4182 14.3573C16.5367 13.0033 17.2087 11.2669 17.2087 9.37363C17.2087 5.04817 13.7014 1.54199 9.37533 1.54199Z" fill="" />
              </svg>
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("teacher.searchPlaceholder")}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-11 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 xl:w-[250px]"
            />
          </div>

          <PermissionGuard requiredPermission="Teacher.Create">
            <button
              onClick={onAddClick}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 transition-colors shadow-theme-xs"
            >
              <span className="text-lg leading-none">+</span>
              {t("teacher.addTeacher")}
            </button>
          </PermissionGuard>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
            <TableRow>
              <TableCell isHeader className="px-6 py-4 border-r border-gray-100 dark:border-white/[0.05] text-center w-12">
                <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">#</p>
              </TableCell>
              {columns.map(({ key, label }) => (
                <TableCell key={key} isHeader className="px-6 py-4 border-r last:border-r-0 border-gray-100 dark:border-white/[0.05] text-left">
                  <button className="flex w-full items-center justify-between gap-2 text-left" onClick={() => handleSort(key)}>
                    <span className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">{label}</span>
                    <span className="flex flex-col gap-0.5">
                      <AngleUpIcon className={`w-3 h-3 ${sortKey === key && sortOrder === "asc" ? "text-brand-500" : "text-gray-400 dark:text-gray-600"}`} />
                      <AngleDownIcon className={`w-3 h-3 ${sortKey === key && sortOrder === "desc" ? "text-brand-500" : "text-gray-400 dark:text-gray-600"}`} />
                    </span>
                  </button>
                </TableCell>
              ))}
              <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 text-theme-sm dark:text-gray-200">
                {t("teacher.colActions")}
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                  {t("common.loading", { defaultValue: "Dang tai..." })}
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={8} className="px-6 py-10 text-center text-error-500 dark:text-error-400 font-medium">
                  {error}
                </TableCell>
              </TableRow>
            ) : sortedData.length > 0 ? (
              sortedData.map((item, index) => (
                <TableRow key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                  <TableCell className="px-6 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap w-12 text-center">
                    {startIndex + index + 1}
                  </TableCell>
                  <TableCell className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{item.code}</TableCell>
                  <TableCell className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{item.name}</TableCell>
                  <TableCell className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{item.gradeLevelName || "-"}</TableCell>
                  <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">{item.email || "-"}</TableCell>
                  <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">{item.phone || "-"}</TableCell>
                  <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === 1 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"}`}>
                      {item.status === 1 ? t("teacher.statusActive") : t("teacher.statusInactive")}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <PermissionGuard requiredPermission="Teacher.Edit">
                        <button
                          title={t("teacher.editTooltip")}
                          onClick={() => onEditClick(item)}
                          className="p-1.5 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard requiredPermission="Teacher.Delete">
                        <button
                          title={t("teacher.deleteTooltip")}
                          onClick={() => {
                            setDeleteTarget(item);
                            setIsDeleteModalOpen(true);
                          }}
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
                <TableCell colSpan={8} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                  {t("teacher.noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between px-6 py-5 bg-gray-50/50 dark:bg-white/[0.01] border-t border-gray-100 dark:border-white/[0.05]">
        <p className="pb-3 text-sm font-medium text-center text-gray-500 dark:text-gray-400 xl:pb-0 xl:text-left">
          {t("teacher.showing", { start: totalRecords === 0 ? 0 : startIndex + 1, end: endIndex, total: totalRecords })}
        </p>
        {totalPages > 1 && (
          <PaginationWithIcon totalPages={totalPages} initialPage={currentPage} onPageChange={(page) => setCurrentPage(page)} />
        )}
      </div>

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

"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AngleDownIcon, AngleUpIcon, PencilIcon, TrashBinIcon } from "@/icons";
import PaginationWithIcon from "@/components/tables/DataTables/TableOne/PaginationWithIcon";
import { CourseFormModal } from "./CourseFormModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import {
  courseApi,
  CourseItem,
} from "@/services/course.api";
import { CodeHelper } from "@/helpers/CodeHelper";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { useTranslation } from "react-i18next";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = "code" | "name" | "duration" | "price" | "status";
type SortOrder = "asc" | "desc";

// ─── Component ────────────────────────────────────────────────────────────────

export default function CourseTable() {
  const { t } = useTranslation();

  // ── Dynamic Metadata ──
  useEffect(() => {
    document.title = `${t("course.title")} | School Management System`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", t("course.description"));
    }
  }, [t]);

  // ── Data states ──
  const [items, setItems] = useState<CourseItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Pagination / search / sort / status filter ──
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all"); // "all", "active", "inactive"
  
  // ── Refresh trigger: tăng lên để ép re-fetch dù các state khác không đổi ──
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  // ── Toast ──
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // ── Create / Edit modal ──
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CourseItem | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formDuration, setFormDuration] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formStatus, setFormStatus] = useState<number>(1);
  const [formDesc, setFormDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Delete (Deactivate) confirm modal ──
  const [deleteTarget, setDeleteTarget] = useState<CourseItem | null>(null);
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
        let apiStatus: boolean | null = null;
        if (statusFilter === "active") apiStatus = true;
        if (statusFilter === "inactive") apiStatus = false;

        const res = await courseApi.getAll(
          currentPage,
          itemsPerPage,
          debouncedSearchTerm,
          apiStatus
        );
        if (!mounted) return;
        if (res.success && res.data) {
          setItems(res.data.items || []);
          setTotalRecords(res.data.totalRecords || 0);
          setTotalPages(res.data.totalPages || 0);
        } else {
          setError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("course.systemError"));
        }
      } catch {
        if (mounted) setError(t("course.systemError"));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, debouncedSearchTerm, statusFilter, refreshKey]);

  // ── Sort ──
  const sortedData = useMemo(() => {
    return [...items].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";

      if (sortKey === "duration") {
        av = a.duration ?? 0;
        bv = b.duration ?? 0;
        return sortOrder === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
      } else if (sortKey === "price") {
        av = a.price ?? 0;
        bv = b.price ?? 0;
        return sortOrder === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
      } else if (sortKey === "status") {
        av = a.status;
        bv = b.status;
        return sortOrder === "asc" ? av - bv : bv - av;
      } else {
        av = String(a[sortKey] ?? "");
        bv = String(b[sortKey] ?? "");
        return sortOrder === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
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
    setFormCode(CodeHelper.generate("CR"));
    setFormName("");
    setFormDuration("");
    setFormPrice("");
    setFormStatus(1);
    setFormDesc("");
    setFormError(null);
    setIsModalOpen(true);
  };

  // ── Open edit modal ──
  const openEditModal = (item: CourseItem) => {
    setEditingItem(item);
    setFormCode(item.code);
    setFormName(item.name);
    setFormDuration(item.duration !== null && item.duration !== undefined ? String(item.duration) : "");
    setFormPrice(item.price !== null && item.price !== undefined ? String(item.price) : "");
    setFormStatus(item.status);
    setFormDesc(item.description ?? "");
    setFormError(null);
    setIsModalOpen(true);
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
    
    // Client-side validations
    const priceVal = formPrice.trim() ? Number(formPrice) : null;
    const durationVal = formDuration.trim() ? Number(formDuration) : null;

    if (priceVal !== null && (isNaN(priceVal) || priceVal < 0)) {
      setFormError(t("backendMessages.ERR_PRICE_NEGATIVE"));
      return;
    }

    if (durationVal !== null && (isNaN(durationVal) || !Number.isInteger(durationVal) || durationVal < 0)) {
      setFormError(t("backendMessages.ERR_DURATION_NEGATIVE"));
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        code: formCode.trim(),
        name: formName.trim(),
        status: formStatus,
        duration: durationVal,
        price: priceVal,
        description: formDesc.trim() || null,
      };

      if (editingItem) {
        // Edit
        const res = await courseApi.update(editingItem.id, {
          id: editingItem.id,
          ...payload,
        });
        if (res.success && res.data) {
          setItems((prev) =>
            prev.map((i) => (i.id === editingItem.id ? res.data : i))
          );
          showToast(t("course.updateSuccess", { name: res.data.name }));
          setIsModalOpen(false);
          triggerRefresh();
        } else {
          setFormError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("course.updateError"));
        }
      } else {
        // Create
        const res = await courseApi.create(payload);
        if (res.success && res.data) {
          setCurrentPage(1);
          setSearchTerm("");
          setDebouncedSearchTerm("");
          setStatusFilter("all");
          triggerRefresh();
          showToast(t("course.createSuccess", { name: res.data.name }));
          setIsModalOpen(false);
        } else {
          setFormError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("course.createError"));
        }
      }
    } catch {
      setFormError(t("course.systemError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Open delete (deactive) confirm ──
  const openDeleteModal = (item: CourseItem) => {
    setDeleteTarget(item);
    setIsDeleteModalOpen(true);
  };

  // ── Confirm delete (deactive) ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await courseApi.deactive(deleteTarget.id);
      if (res.success) {
        showToast(t("course.deleteSuccess", { name: deleteTarget.name }));
        setIsDeleteModalOpen(false);
        setDeleteTarget(null);
        triggerRefresh();
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("course.deleteError"), "error");
      }
    } catch {
      showToast(t("course.systemError"), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Pagination helpers ──
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + items.length, totalRecords);

  const columns: { key: SortKey; label: string }[] = [
    { key: "code", label: t("course.colCode") },
    { key: "name", label: t("course.colName") },
    { key: "duration", label: t("course.colDuration") },
    { key: "price", label: t("course.colPrice") },
    { key: "status", label: t("course.colStatus") },
  ];

  // Helper format currency
  const formatPrice = (price?: number | null) => {
    if (price === undefined || price === null) return "-";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  };

  return (
    <div className="overflow-hidden bg-white dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/[0.05]">
      {/* Toast */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-[99999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg text-sm font-medium text-white transition-all duration-300 ${
            toastType === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {toastType === "success" ? (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toastMessage}
        </div>
      )}

      {/* Header controls */}
      <div className="flex flex-col gap-4 px-6 py-5 border-b border-gray-100 dark:border-white/[0.05] lg:flex-row lg:items-center lg:justify-between">
        
        {/* Pagination Size & Status Filter */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Entries count */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t("course.show")}</span>
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
            <span className="text-sm text-gray-500 dark:text-gray-400">{t("course.entries")}</span>
          </div>

          {/* Status filter select */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t("course.colStatus")}:</span>
            <div className="relative z-20 bg-transparent">
              <select
                className="w-full py-2 pl-3 pr-8 text-sm text-gray-800 bg-transparent border border-gray-300 rounded-lg appearance-none dark:bg-dark-900 h-9 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all" className="text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                  {t("course.filterStatusAll", { defaultValue: "Tất cả trạng thái" })}
                </option>
                <option value="active" className="text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                  {t("course.filterStatusActive", { defaultValue: "Hoạt động" })}
                </option>
                <option value="inactive" className="text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                  {t("course.filterStatusInactive", { defaultValue: "Ngưng hoạt động" })}
                </option>
              </select>
              <span className="absolute z-30 text-gray-500 -translate-y-1/2 right-2 top-1/2 dark:text-gray-400 pointer-events-none">
                <svg className="stroke-current" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3.8335 5.9165L8.00016 10.0832L12.1668 5.9165" stroke="" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </div>
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
              placeholder={t("course.searchPlaceholder")}
              className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-11 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[250px]"
            />
          </div>
          <PermissionGuard requiredPermission="Course.Create">
            <button
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 transition-colors shadow-theme-xs"
            >
              <svg className="fill-current" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8.00016 3.33331V12.6666M3.3335 7.99998H12.6668" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t("course.addCourse")}
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
                className="px-6 py-4 border-r border-gray-100 dark:border-white/[0.05] text-left"
              >
                <p className="font-semibold text-gray-800 text-theme-sm dark:text-gray-200">
                  {t("course.colDescription")}
                </p>
              </TableCell>
              <TableCell
                isHeader
                className="px-6 py-4 text-center font-semibold text-gray-800 text-theme-sm dark:text-gray-200"
              >
                {t("course.colActions")}
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
                    <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-20" />
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-40" />
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-16" />
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-24" />
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="h-5 bg-gray-200 dark:bg-white/10 rounded-full w-20" />
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-48" />
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
                  colSpan={8}
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
                  <TableCell className="px-6 py-4 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                    {item.code}
                  </TableCell>
                  <TableCell className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    {item.name}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {item.duration !== null && item.duration !== undefined ? `${item.duration} ${t("course.entries").substring(0, 1) === "e" ? "months" : "tháng"}` : "-"}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap font-medium text-left">
                    {formatPrice(item.price)}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                        item.status === 1
                          ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${item.status === 1 ? "bg-green-600 dark:bg-green-400" : "bg-red-600 dark:bg-red-400"}`} />
                      {item.status === 1 ? t("course.statusActive") : t("course.statusInactive")}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-400 max-w-[320px] truncate">
                    {item.description || (
                      <span className="italic text-gray-400 dark:text-gray-600">
                        {t("course.noDescription", { defaultValue: "Không có mô tả" })}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <PermissionGuard requiredPermission="Course.Edit">
                        <button
                          title={t("course.editTooltip", { defaultValue: "Chỉnh sửa" })}
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard requiredPermission="Course.Delete">
                        {item.status === 1 ? (
                          <button
                            title={t("course.deleteTooltip", { defaultValue: "Vô hiệu hóa" })}
                            onClick={() => openDeleteModal(item)}
                            className="p-1.5 text-gray-500 hover:text-error-500 dark:text-gray-400 dark:hover:text-error-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                          >
                            <TrashBinIcon className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="w-[28px] h-[28px]" />
                        )}
                      </PermissionGuard>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                >
                  {t("course.noResults", { defaultValue: "Không tìm thấy khóa học nào." })}
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
            {t("course.showing", { start: totalRecords === 0 ? 0 : startIndex + 1, end: endIndex, total: totalRecords, defaultValue: `Hiển thị ${totalRecords === 0 ? 0 : startIndex + 1} đến ${endIndex} trong tổng số ${totalRecords} mục` })}
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
      <CourseFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        t={t}
        editingItem={editingItem}
        formCode={formCode}
        setFormCode={setFormCode}
        formName={formName}
        setFormName={setFormName}
        formDuration={formDuration}
        setFormDuration={setFormDuration}
        formPrice={formPrice}
        setFormPrice={setFormPrice}
        formStatus={formStatus}
        setFormStatus={setFormStatus}
        formDesc={formDesc}
        setFormDesc={setFormDesc}
        formError={formError}
        isSubmitting={isSubmitting}
        handleSubmit={handleSubmit}
      />

      {/* ── Delete (Deactivate) Confirm Modal ── */}
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

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
import { RoomFormModal } from "./RoomFormModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import {
  roomApi,
  RoomItem,
  RoomType,
  RoomStatsDto,
} from "@/services/room.api";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { useTranslation } from "react-i18next";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = "code" | "name" | "roomTypeName" | "capacity" | "building" | "status";
type SortOrder = "asc" | "desc";

// ─── Stats Card Component ─────────────────────────────────────────────────────

function StatsCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4 p-4 bg-white dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/[0.05] shadow-theme-xs hover:shadow-md transition-shadow">
      <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RoomTable() {
  const { t } = useTranslation();

  // ── Dynamic Metadata ──
  useEffect(() => {
    document.title = `${t("room.title")} | School Management System`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", t("room.description"));
    }
  }, [t]);

  // ── Data states ──
  const [items, setItems] = useState<RoomItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Stats ──
  const [stats, setStats] = useState<RoomStatsDto | null>(null);

  // ── Pagination / search / sort / filter ──
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  // ── Advanced filters ──
  const [filterRoomType, setFilterRoomType] = useState<RoomType | null>(null);

  // ── Toast ──
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // ── Create / Edit modal ──
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoomItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Delete confirm modal ──
  const [deleteTarget, setDeleteTarget] = useState<RoomItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Toast auto-hide ──
  useEffect(() => {
    if (!toastMessage) return;
    const tTimer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(tTimer);
  }, [toastMessage]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
  };

  // ── Debounce search ──
  useEffect(() => {
    const tTimer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(tTimer);
  }, [searchTerm]);

  // ── Fetch stats ──
  useEffect(() => {
    async function loadStats() {
      try {
        const res = await roomApi.getStats();
        if (res.success && res.data) {
          setStats(res.data);
        }
      } catch {
        // Stats loading failure is non-critical
      }
    }
    loadStats();
  }, [refreshKey]);

  // ── Fetch data ──
  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await roomApi.getAll(
          currentPage,
          itemsPerPage,
          debouncedSearchTerm,
          filterRoomType,
        );
        if (!mounted) return;
        if (res.success && res.data) {
          setItems(res.data.items || []);
          setTotalRecords(res.data.totalRecords || 0);
          setTotalPages(res.data.totalPages || 0);
        } else {
          setError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("room.systemError"));
        }
      } catch {
        if (mounted) setError(t("room.systemError"));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, debouncedSearchTerm, filterRoomType, refreshKey]);

  // ── Sort ──
  const sortedData = useMemo(() => {
    return [...items].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";

      if (sortKey === "capacity") {
        av = a.capacity ?? 0;
        bv = b.capacity ?? 0;
        return sortOrder === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
      }

      av = String((a as unknown as Record<string, unknown>)[sortKey] ?? "");
      bv = String((b as unknown as Record<string, unknown>)[sortKey] ?? "");
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
    setFormError(null);
    setIsModalOpen(true);
  };

  // ── Open edit modal ──
  const openEditModal = (item: RoomItem) => {
    setEditingItem(item);
    setFormError(null);
    setIsModalOpen(true);
  };

  // ── Submit create / edit ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSubmit = async (formData: any) => {
    if (!formData.code?.trim()) {
      setFormError(t("backendMessages.ERR_CODE_EMPTY", { defaultValue: "Mã không được để trống" }));
      return;
    }
    if (!formData.name?.trim()) {
      setFormError(t("backendMessages.ERR_NAME_EMPTY", { defaultValue: "Tên không được để trống" }));
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingItem) {
        const res = await roomApi.update(editingItem.id, formData);
        if (res.success && res.data) {
          setItems((prev) =>
            prev.map((i) => (i.id === editingItem.id ? res.data : i))
          );
          showToast(t("room.updateSuccess", { name: res.data.name }));
          setIsModalOpen(false);
          triggerRefresh();
        } else {
          setFormError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("room.updateError"));
        }
      } else {
        const res = await roomApi.create(formData);
        if (res.success && res.data) {
          setCurrentPage(1);
          setSearchTerm("");
          setDebouncedSearchTerm("");
          triggerRefresh();
          showToast(t("room.createSuccess", { name: res.data.name }));
          setIsModalOpen(false);
        } else {
          setFormError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("room.createError"));
        }
      }
    } catch {
      setFormError(t("room.systemError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Open delete confirm ──
  const openDeleteModal = (item: RoomItem) => {
    setDeleteTarget(item);
    setIsDeleteModalOpen(true);
  };

  // ── Confirm delete ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await roomApi.delete(deleteTarget.id);
      if (res.success) {
        showToast(t("room.deleteSuccess", { name: deleteTarget.name }));
        setIsDeleteModalOpen(false);
        setDeleteTarget(null);
        triggerRefresh();
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("room.deleteError"), "error");
      }
    } catch {
      showToast(t("room.systemError"), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Status helpers ──
  const getStatusBadge = (status: number) => {
    switch (status) {
      case 1:
        return {
          text: t("room.statusActive"),
          className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        };
      case 2:
        return {
          text: t("room.statusInactive"),
          className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
        };
      case 3:
        return {
          text: t("room.statusMaintenance"),
          className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
        };
      default:
        return {
          text: "Unknown",
          className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
        };
    }
  };

  const getRoomTypeName = (roomType: RoomType) => {
    return roomType === RoomType.Theory ? t("room.roomTypeTheory") : t("room.roomTypePractice");
  };

  // ── Pagination helpers ──
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + items.length, totalRecords);

  const columns: { key: SortKey; label: string }[] = [
    { key: "code", label: t("room.colCode") },
    { key: "name", label: t("room.colName") },
    { key: "roomTypeName", label: t("room.colRoomType") },
    { key: "capacity", label: t("room.colCapacity") },
    { key: "building", label: t("room.colLocation") },
    { key: "status", label: t("room.colStatus") },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
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

      {/* ── Overview Stats Cards ── */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatsCard
            label={t("room.statsTotalRooms")}
            value={stats.totalRooms}
            color="bg-brand-50 dark:bg-brand-500/10"
            icon={
              <svg className="w-6 h-6 text-brand-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0-.008 9m.008 0h.008" />
              </svg>
            }
          />
          <StatsCard
            label={t("room.statsAvailableRooms")}
            value={stats.availableRooms}
            color="bg-green-50 dark:bg-green-500/10"
            icon={
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatsCard
            label={t("room.statsInUseRooms")}
            value={stats.inUseRooms}
            color="bg-blue-50 dark:bg-blue-500/10"
            icon={
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            }
          />
          <StatsCard
            label={t("room.statsMaintenanceRooms")}
            value={stats.maintenanceRooms}
            color="bg-amber-50 dark:bg-amber-500/10"
            icon={
              <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1a1.5 1.5 0 010-2.12l.88-.88a1.5 1.5 0 012.12 0l2.1 2.1 5.1-5.1a1.5 1.5 0 012.12 0l.88.88a1.5 1.5 0 010 2.12l-5.1 5.1m-2.98 2.98l-2.1 2.1a1.5 1.5 0 01-2.12 0l-.88-.88a1.5 1.5 0 010-2.12l2.1-2.1m9.02-9.02l2.1-2.1a1.5 1.5 0 00-2.12-2.12l-2.1 2.1" />
              </svg>
            }
          />
        </div>
      )}

      {/* ── Table Card ── */}
      <div className="overflow-hidden bg-white dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/[0.05]">

        {/* Header controls */}
        <div className="flex flex-col gap-3 px-6 py-5 border-b border-gray-100 dark:border-white/[0.05]">
          {/* Row 1: Show N entries + Search + Add */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Show N entries */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t("room.show")}</span>
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
              <span className="text-sm text-gray-500 dark:text-gray-400">{t("room.entries")}</span>
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
                  placeholder={t("room.searchPlaceholder")}
                  className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-11 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[250px]"
                />
              </div>
              <PermissionGuard requiredPermission="Room.Create">
                <button
                  onClick={openCreateModal}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 transition-colors shadow-theme-xs"
                >
                  <svg className="fill-current" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8.00016 3.33331V12.6666M3.3335 7.99998H12.6668" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t("room.addRoom")}
                </button>
              </PermissionGuard>
            </div>
          </div>

          {/* Row 2: Advanced filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Room Type filter */}
            <div className="relative">
              <select
                className="h-9 pl-3 pr-8 text-sm text-gray-600 bg-transparent border border-gray-300 rounded-lg appearance-none shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                value={filterRoomType ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilterRoomType(val === "" ? null : Number(val) as RoomType);
                  setCurrentPage(1);
                }}
              >
                <option value="" className="dark:bg-gray-900">{t("room.allTypes")}</option>
                <option value={RoomType.Theory} className="dark:bg-gray-900">{t("room.roomTypeTheory")}</option>
                <option value={RoomType.Practice} className="dark:bg-gray-900">{t("room.roomTypePractice")}</option>
              </select>
              <span className="absolute z-30 text-gray-500 -translate-y-1/2 right-2 top-1/2 dark:text-gray-400 pointer-events-none">
                <svg className="stroke-current" width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3.8335 5.9165L8.00016 10.0832L12.1668 5.9165" stroke="" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
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
                  {t("room.colActions")}
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
                      <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-32" />
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-20" />
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-16" />
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-24" />
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-16" />
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
                sortedData.map((item, index) => {
                  const badge = getStatusBadge(item.status);
                  const location = [item.building, item.floor].filter(Boolean).join(", ") || "-";

                  return (
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
                      <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          item.roomType === RoomType.Theory
                            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                            : "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
                        }`}>
                          {getRoomTypeName(item.roomType)}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {item.capacity ?? "-"}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {location}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
                        >
                          {badge.text}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <PermissionGuard requiredPermission="Room.Edit">
                            <button
                              title={t("room.editTooltip")}
                              onClick={() => openEditModal(item)}
                              className="p-1.5 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          </PermissionGuard>
                          <PermissionGuard requiredPermission="Room.Delete">
                            <button
                              title={t("room.deleteTooltip")}
                              onClick={() => openDeleteModal(item)}
                              className="p-1.5 text-gray-500 hover:text-error-500 dark:text-gray-400 dark:hover:text-error-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                            >
                              <TrashBinIcon className="w-4 h-4" />
                            </button>
                          </PermissionGuard>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                  >
                    {t("room.noResults")}
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
              {t("room.showing", { start: totalRecords === 0 ? 0 : startIndex + 1, end: endIndex, total: totalRecords })}
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
        <RoomFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          t={t}
          editingItem={editingItem}
          formError={formError}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
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
    </div>
  );
}

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
import { UserFormModal } from "./UserFormModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import { Modal } from "@/components/ui/modal";
import { userApi, UserItem } from "@/services/user.api";
import { authApi } from "@/services/auth.api";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { useTranslation } from "react-i18next";

type SortKey = "username" | "email" | "phone" | "status";
type SortOrder = "asc" | "desc";

export default function UserTable() {
  const { t } = useTranslation();

  // ── Dynamic Metadata ──
  useEffect(() => {
    document.title = `${t("user.title", { defaultValue: "Quản lý Người dùng" })} | School Management System`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", t("user.description", { defaultValue: "Quản lý người dùng trong hệ thống." }));
    }
  }, [t]);

  // ── Data states ──
  const [items, setItems] = useState<UserItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rolesList, setRolesList] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<string>("");

  // ── Pagination / search / sort / filters ──
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [sortKey, setSortKey] = useState<SortKey>("username");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // ── Refresh trigger ──
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  // ── Toast ──
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // ── Create / Edit modal ──
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UserItem | null>(null);
  const [formUsername, setFormUsername] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRole, setFormRole] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Delete confirm modal ──
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Deactivate confirm modal ──
  const [deactiveTarget, setDeactiveTarget] = useState<UserItem | null>(null);
  const [isDeactiveModalOpen, setIsDeactiveModalOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // ── Toast auto-hide ──
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUser(localStorage.getItem("username") || "");
    }
  }, []);

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

  // ── Fetch Roles list ──
  useEffect(() => {
    async function loadRoles() {
      try {
        const res = await authApi.getAllRolesList();
        if (res.success && res.data) {
          setRolesList(res.data);
        } else {
          setRolesList(["Admin", "Teacher", "Student", "Parent"]);
        }
      } catch {
        setRolesList(["Admin", "Teacher", "Student", "Parent"]);
      }
    }
    loadRoles();
  }, []);

  // ── Fetch Users list ──
  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await userApi.getAll(
          currentPage,
          itemsPerPage,
          debouncedSearchTerm,
          roleFilter
        );
        if (!mounted) return;
        if (res.success && res.data) {
          setItems(res.data.items || []);
          setTotalRecords(res.data.totalRecords || 0);
          setTotalPages(res.data.totalPages || 0);
        } else {
          setError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("user.systemError"));
        }
      } catch {
        if (mounted) setError(t("user.systemError"));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, debouncedSearchTerm, roleFilter, refreshKey]);

  // ── Sort ──
  const sortedData = useMemo(() => {
    return [...items].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";

      if (sortKey === "status") {
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
    setFormUsername("");
    setFormEmail("");
    setFormPhone("");
    setFormRole("");
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // ── Open edit modal ──
  const openEditModal = (item: UserItem) => {
    setEditingItem(item);
    setFormUsername(item.username);
    setFormEmail(item.email);
    setFormPhone(item.phone || "");
    setFormRole(item.roles[0] || "");
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // ── Submit create / edit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim()) {
      setFormError(t("backendMessages.ERR_USERNAME_REQUIRED", { defaultValue: "Tên đăng nhập không được để trống" }));
      return;
    }
    if (!formEmail.trim()) {
      setFormError(t("backendMessages.ERR_EMAIL_REQUIRED", { defaultValue: "Email không được để trống" }));
      return;
    }
    
    // Email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formEmail.trim())) {
      setFormError(t("user.invalidEmailFormat", { defaultValue: "Địa chỉ Email không đúng định dạng." }));
      return;
    }

    // Phone regex validation (if provided)
    if (formPhone.trim()) {
      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(formPhone.trim())) {
        setFormError(t("user.invalidPhoneFormat", { defaultValue: "Số điện thoại không hợp lệ (chỉ nhập số, từ 10-11 chữ số)." }));
        return;
      }
    }

    if (!formRole) {
      setFormError(t("backendMessages.ERR_ROLE_REQUIRED", { defaultValue: "Vai trò không được để trống" }));
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingItem) {
        // Update
        const payload = {
          id: editingItem.id,
          email: formEmail.trim(),
          phone: formPhone.trim(),
          roleName: formRole,
        };
        const res = await userApi.update(editingItem.id, payload);
        if (res.success && res.data) {
          showToast(t("user.updateSuccess", { name: res.data.username }));
          setIsFormModalOpen(false);
          triggerRefresh();
        } else {
          setFormError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("user.updateError"));
        }
      } else {
        // Create
        const payload = {
          username: formUsername.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          roleName: formRole,
        };
        const res = await userApi.create(payload);
        if (res.success && res.data) {
          setCurrentPage(1);
          setSearchTerm("");
          setDebouncedSearchTerm("");
          setRoleFilter("all");
          triggerRefresh();
          showToast(t("user.createSuccess", { name: res.data.username }));
          setIsFormModalOpen(false);
        } else {
          setFormError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("user.createError"));
        }
      }
    } catch {
      setFormError(t("user.systemError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Toggle Deactive ──
  const openDeactiveModal = (item: UserItem) => {
    setDeactiveTarget(item);
    setIsDeactiveModalOpen(true);
  };

  const handleDeactiveToggle = async () => {
    if (!deactiveTarget) return;
    setIsDeactivating(true);
    try {
      const res = await userApi.deactive(deactiveTarget.id);
      if (res.success) {
        showToast(t("user.deactiveSuccess", { name: deactiveTarget.username }));
        setIsDeactiveModalOpen(false);
        setDeactiveTarget(null);
        triggerRefresh();
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("user.deactiveError"), "error");
      }
    } catch {
      showToast(t("user.systemError"), "error");
    } finally {
      setIsDeactivating(false);
    }
  };

  // ── Open delete confirm ──
  const openDeleteModal = (item: UserItem) => {
    setDeleteTarget(item);
    setIsDeleteModalOpen(true);
  };

  // ── Confirm delete ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await userApi.delete(deleteTarget.id);
      if (res.success) {
        showToast(t("user.deleteSuccess", { name: deleteTarget.username }));
        setIsDeleteModalOpen(false);
        setDeleteTarget(null);
        triggerRefresh();
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("user.deleteError"), "error");
      }
    } catch {
      showToast(t("user.systemError"), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Pagination helpers ──
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + items.length, totalRecords);

  const columns: { key: SortKey; label: string }[] = [
    { key: "username", label: t("user.colUsername") },
    { key: "email", label: t("user.colEmail") },
    { key: "phone", label: t("user.colPhone") },
    { key: "status", label: t("user.colStatus") },
  ];

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
        
        {/* Pagination Size & Role Filter */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Entries count */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t("user.show")}</span>
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
            <span className="text-sm text-gray-500 dark:text-gray-400">{t("user.entries")}</span>
          </div>

          {/* Role filter select */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t("user.colRoles")}:</span>
            <div className="relative z-20 bg-transparent">
              <select
                className="w-full py-2 pl-3 pr-8 text-sm text-gray-800 bg-transparent border border-gray-300 rounded-lg appearance-none dark:bg-dark-900 h-9 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all" className="text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                  {t("user.filterRoleAll", { defaultValue: "Tất cả vai trò" })}
                </option>
                {rolesList.map((r) => (
                  <option key={r} value={r} className="text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                    {r}
                  </option>
                ))}
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
              placeholder={t("user.searchPlaceholder")}
              className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-11 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[250px]"
            />
          </div>
          <PermissionGuard requiredPermission="User.Create">
            <button
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 transition-colors shadow-theme-xs"
            >
              <svg className="fill-current" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8.00016 3.33331V12.6666M3.3335 7.99998H12.6668" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t("user.addUser")}
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
                  {t("user.colRoles")}
                </p>
              </TableCell>
              <TableCell
                isHeader
                className="px-6 py-4 text-center font-semibold text-gray-800 text-theme-sm dark:text-gray-200"
              >
                {t("user.colActions")}
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
                    <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-28" />
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-44" />
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-24" />
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="h-5 bg-gray-200 dark:bg-white/10 rounded-full w-20" />
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-24" />
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <div className="h-8 w-8 bg-gray-200 dark:bg-white/10 rounded-md" />
                      <div className="h-8 w-8 bg-gray-200 dark:bg-white/10 rounded-md" />
                      <div className="h-8 w-8 bg-gray-200 dark:bg-white/10 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={7}
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
                    {item.username}
                  </TableCell>
                  <TableCell className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    {item.email}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {item.phone || "-"}
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
                      {item.status === 1 ? t("user.statusActive") : t("user.statusInactive")}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-400 max-w-[200px] truncate whitespace-nowrap">
                    {item.roles.length > 0 ? (
                      item.roles.map((r) => (
                        <span key={r} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-300 mr-1">
                          {r}
                        </span>
                      ))
                    ) : (
                      <span className="italic text-gray-400 dark:text-gray-600">None</span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <PermissionGuard requiredPermission="User.Edit">
                        <button
                          title={t("user.editTooltip", { defaultValue: "Chỉnh sửa" })}
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard requiredPermission="User.Delete">
                        {/* Deactivate/Activate lock icon */}
                        <button
                          disabled={item.username === currentUser}
                          title={
                            item.username === currentUser
                              ? t("user.cannotDeactivateSelf", { defaultValue: "Bạn không thể tự vô hiệu hóa tài khoản của chính mình." })
                              : item.status === 1
                              ? t("user.deactivateTooltip")
                              : t("user.activateTooltip")
                          }
                          onClick={() => openDeactiveModal(item)}
                          className={`p-1.5 rounded-md transition-colors ${
                            item.username === currentUser
                              ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                              : item.status === 1
                              ? "text-gray-500 hover:text-warning-500 dark:text-gray-400 dark:hover:text-warning-400 hover:bg-gray-100 dark:hover:bg-white/5"
                              : "text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 hover:bg-gray-100 dark:hover:bg-white/5"
                          }`}
                        >
                          {item.status === 1 ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </PermissionGuard>
                      <PermissionGuard requiredPermission="User.Delete">
                        <button
                          disabled={item.username === currentUser}
                          title={
                            item.username === currentUser
                              ? t("user.cannotDeleteSelf", { defaultValue: "Bạn không thể tự xóa tài khoản của chính mình." })
                              : t("user.deleteTooltip", { defaultValue: "Xóa hẳn" })
                          }
                          onClick={() => openDeleteModal(item)}
                          className={`p-1.5 rounded-md transition-colors ${
                            item.username === currentUser
                              ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                              : "text-gray-500 hover:text-error-500 dark:text-gray-400 dark:hover:text-error-400 hover:bg-gray-100 dark:hover:bg-white/5"
                          }`}
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
                  colSpan={7}
                  className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                >
                  {t("user.noResults", { defaultValue: "Không tìm thấy người dùng nào." })}
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
            {t("user.showing", { start: totalRecords === 0 ? 0 : startIndex + 1, end: endIndex, total: totalRecords, defaultValue: `Hiển thị ${totalRecords === 0 ? 0 : startIndex + 1} đến ${endIndex} trong tổng số ${totalRecords} mục` })}
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
      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        t={t}
        editingItem={editingItem}
        formUsername={formUsername}
        setFormUsername={setFormUsername}
        formEmail={formEmail}
        setFormEmail={setFormEmail}
        formPhone={formPhone}
        setFormPhone={setFormPhone}
        formRole={formRole}
        setFormRole={setFormRole}
        rolesList={rolesList.filter((r) => r.toLowerCase() !== "admin")}
        formError={formError}
        isSubmitting={isSubmitting}
        handleSubmit={handleSubmit}
      />

      {/* ── Delete Confirm Modal ── */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        itemName={deleteTarget?.username}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
      />

      {/* ── Deactivate / Activate Confirm Modal ── */}
      <Modal
        isOpen={isDeactiveModalOpen}
        onClose={() => setIsDeactiveModalOpen(false)}
        className="max-w-[420px] p-6 sm:p-8"
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-warning-50 dark:bg-warning-500/10">
            <svg className="w-6 h-6 text-warning-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {deactiveTarget?.status === 1 ? t("user.deactiveConfirmTitle") : t("user.activeConfirmTitle")}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {deactiveTarget?.status === 1 
              ? t("user.deactiveConfirmDesc", { name: deactiveTarget?.username }) 
              : t("user.activeConfirmDesc", { name: deactiveTarget?.username })}
          </p>
          <div className="flex gap-3 mt-2 w-full">
            <button
              onClick={() => setIsDeactiveModalOpen(false)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
            >
              {t("user.btnCancel")}
            </button>
            <button
              onClick={handleDeactiveToggle}
              disabled={isDeactivating}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg bg-warning-500 hover:bg-warning-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isDeactivating ? t("user.btnSaving") : t("user.btnSave")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

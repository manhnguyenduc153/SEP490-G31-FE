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
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

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
    <div className="bg-white dark:bg-gray-900 border border-gray-155 dark:border-gray-800 rounded-2xl shadow-xs">
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

      {/* Header */}
      <div className="flex flex-col gap-4 px-5 sm:px-6 py-5 border-b border-gray-100 dark:border-gray-800/80 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t("user.title", { defaultValue: "Quản lý Người dùng" })}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t("user.description", { defaultValue: "Quản lý người dùng trong hệ thống." })}
          </p>
        </div>
        <PermissionGuard requiredPermission="User.Create">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-theme-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            {t("user.addUser", { defaultValue: "Thêm người dùng" })}
          </button>
        </PermissionGuard>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 w-full items-end">
          {/* Search Input */}
          <div className="relative md:col-span-5">
            <label className="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("user.filterKeyword", { defaultValue: "Tìm kiếm" })}
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={t("user.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-transparent border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400 h-11"
              />
              <span className="absolute left-3 top-3.5 text-gray-400">
                <Search className="w-4 h-4" />
              </span>
            </div>
          </div>

          {/* Role Filter Dropdown */}
          <div className="md:col-span-4">
            <label className="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("user.colRoles", { defaultValue: "Vai trò" })}
            </label>
            <SearchableSelect
              value={roleFilter}
              onChange={(value) => { setRoleFilter(value); setCurrentPage(1); }}
              options={[
                ...rolesList.map((r) => ({ value: r, label: t(`roles.names.${r}`, { defaultValue: r }) })),
              ]}
              placeholder={t("user.filterRoleAll", { defaultValue: "Tất cả vai trò" })}
              onClear={() => { setRoleFilter("all"); setCurrentPage(1); }}
            />
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-center justify-end h-11 md:col-span-3">
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setRoleFilter("all");
                setCurrentPage(1);
              }}
              className="inline-flex items-center justify-center px-4 h-11 text-sm font-medium text-gray-700 bg-white border border-gray-355 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors cursor-pointer w-full md:w-auto shadow-theme-xs"
            >
              {t("user.btnClearFilters", { defaultValue: "Xóa bộ lọc" })}
            </button>
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
                          {t(`roles.names.${r}`, { defaultValue: r })}
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
                          className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard requiredPermission="User.Delete">
                        {/* Deactivate/Activate lock icon */}
                        <button
                          title={
                            item.status === 1
                              ? t("user.deactivateTooltip")
                              : t("user.activateTooltip")
                          }
                          onClick={() => openDeactiveModal(item)}
                          className={`p-1.5 rounded-md transition-colors ${
                            item.status === 1
                              ? "text-warning-600 hover:text-warning-800 dark:text-warning-400 dark:hover:text-warning-300 hover:bg-warning-50 dark:hover:bg-warning-950/30"
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
                          title={t("user.deleteTooltip", { defaultValue: "Xóa hẳn" })}
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
        <div className="flex flex-wrap items-center gap-4 pb-3 xl:pb-0 justify-center xl:justify-start">
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <span>{t("user.show", { defaultValue: "Hiển thị" })}</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
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
            <span>{t("user.entries", { defaultValue: "mục" })}</span>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
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

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
import Badge from "@/components/ui/badge/Badge";
// import { Modal } from "@/components/ui/modal";
import { useTranslation } from "react-i18next";
import { authApi, RoleItem } from "@/services/auth.api";
import { PermissionNode, SortKey, SortOrder } from "./types";
import { CreateRoleModal } from "./CreateRoleModal";
import { EditPermissionsModal } from "./EditPermissionsModal";
import { createPortal } from "react-dom";
import { Plus, Search } from "lucide-react";

const buildPermissionTree = (permissions: string[]): PermissionNode[] => {
  const groups: Record<string, PermissionNode> = {};

  permissions.forEach((perm) => {
    if (!perm) return;
    const parts = perm.split(".");
    const category = parts[0];

    if (!groups[category]) {
      groups[category] = { id: category, name: category, children: [] };
    }

    if (parts.length > 1) {
      const feature = parts.slice(1).join(".");
      groups[category].children!.push({
        id: perm,
        name: feature || perm,
      });
    }
  });

  return Object.values(groups);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

export default function RolesTable() {
  const { t } = useTranslation();

  // ── Dynamic Metadata ──
  useEffect(() => {
    document.title = `${t("roles.title")} | School Management System`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", t("roles.description"));
    }
  }, [t]);

  const [roles, setRoles] = useState<RoleItem[]>([]);
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
  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  // Toast
  const [toasts, setToasts] = useState<{ id: number; message: string; type: "success" | "error" }[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    if (!msg) return;
    const messages = msg
      .split(/\r?\n/)
      .map((m) => m.trim())
      .filter(Boolean);

    messages.forEach((message, index) => {
      const id = Date.now() + index;
      setToasts((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    });
  };
  
  // Permissions API states
  const [systemPermissions, setSystemPermissions] = useState<string[]>([]);
  const [currentUserPermissions, setCurrentUserPermissions] = useState<string[]>([]);
  const [newRolePermissions, setNewRolePermissions] = useState<Set<string>>(new Set());

  const dynamicPermissionTree = useMemo(() => {
    return buildPermissionTree(systemPermissions);
  }, [systemPermissions]);

  // Add Role Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [newRoleStatus, setNewRoleStatus] = useState<"Active" | "Inactive">("Active");

  // Permissions Modal states
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<RoleItem | null>(null);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [checkedPermissions, setCheckedPermissions] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["Dashboard", "Ecommerce", "Authorization"])
  );



  // Debounce Search Term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Fetch Roles from API
  useEffect(() => {
    let isMounted = true;

    async function loadRoles() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await authApi.getAllRoles(currentPage, itemsPerPage, debouncedSearchTerm);
        if (isMounted) {
          if (response.success && response.data) {
            setRoles(response.data.items || []);
            setTotalRecords(response.data.totalRecords || 0);
            setTotalPages(response.data.totalPages || 0);
          } else {
            setError(response.message ? t(`backendMessages.${response.message}`, { defaultValue: response.message }) : t("roles.systemError"));
          }
        }
      } catch {
        if (isMounted) {
          setError(t("roles.systemError"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadRoles();

    return () => {
      isMounted = false;
    };
  }, [currentPage, itemsPerPage, debouncedSearchTerm, refreshKey, t]);

  // Fetch System and User Permissions on mount
  useEffect(() => {
    async function loadPermissions() {
      try {
        const [allRes, currRes] = await Promise.all([
          authApi.getAllPermissions(),
          authApi.getCurrentPermissions(),
        ]);
        if (allRes.success && allRes.data) {
          setSystemPermissions(allRes.data);
        }
        if (currRes.success && currRes.data) {
          setCurrentUserPermissions(currRes.data);
        }
      } catch (err) {
        console.error("Lỗi khi tải danh sách quyền:", err);
      }
    }
    loadPermissions();
  }, []);

  const handleAddRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    setIsLoading(true);
    try {
      const createRes = await authApi.createRole(newRoleName.trim());
      if (createRes.success) {
        if (newRolePermissions.size > 0) {
          const assignRes = await authApi.assignRolePermissions(newRoleName.trim(), Array.from(newRolePermissions));
          if (!assignRes.success) {
            showToast(assignRes.message ? t(`backendMessages.${assignRes.message}`, { defaultValue: assignRes.message }) : t("roles.updateError"));
          }
        }
        showToast(t("roles.createSuccess", { name: newRoleName.trim() }));
        
        // Reset form fields
        setNewRoleName("");
        setNewRoleDesc("");
        setNewRoleStatus("Active");
        setNewRolePermissions(new Set());
        setIsModalOpen(false);
        triggerRefresh();
      } else {
        showToast(createRes.message ? t(`backendMessages.${createRes.message}`, { defaultValue: createRes.message }) : t("roles.createError"));
      }
    } catch {
      showToast(t("roles.systemError"));
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setNewRolePermissions(new Set(currentUserPermissions));
    setIsModalOpen(true);
  };

  const openPermissionsModal = (role: RoleItem) => {
    setSelectedRoleForPermissions(role);
    setCheckedPermissions(new Set(role.permissions || []));
    setIsPermissionsModalOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedRoleForPermissions) return;

    const updatedPermissions = Array.from(checkedPermissions);
    try {
      const response = await authApi.assignRolePermissions(
        selectedRoleForPermissions.name,
        updatedPermissions
      );
      if (response.success) {
        setRoles(
          roles.map((r) =>
            r.id === selectedRoleForPermissions.id
              ? { ...r, permissions: updatedPermissions }
              : r
          )
        );
        showToast(t("roles.updateSuccess", { name: selectedRoleForPermissions.name }));
        setIsPermissionsModalOpen(false);
        setSelectedRoleForPermissions(null);

        // NẾU người dùng vừa sửa quyền của CHÍNH MÌNH -> Cập nhật lại localStorage và Reload
        const currentRole = authApi.getRole();
        if (currentRole === selectedRoleForPermissions.name) {
          const currentPermsRes = await authApi.getCurrentPermissions();
          if (currentPermsRes.success && currentPermsRes.data) {
            localStorage.setItem("permissions", JSON.stringify(currentPermsRes.data));
            // Reload lại trang để Guard và Sidebar nhận diện quyền mới ngay lập tức
            window.location.reload();
          }
        }
      } else {
        showToast(response.message ? t(`backendMessages.${response.message}`, { defaultValue: response.message }) : t("roles.updateError"));
      }
    } catch (err) {
      console.error(err);
      showToast(t("roles.systemError"));
    }
  };

  // Checkbox state calculations
  const getCategorySelectionState = (node: PermissionNode, isCreateForm: boolean = false) => {
    const checkedSet = isCreateForm ? newRolePermissions : checkedPermissions;
    if (!node.children || node.children.length === 0) {
      return { isChecked: checkedSet.has(node.id), isIndeterminate: false };
    }
    
    const childrenIds = node.children.map((c) => c.id);
    const checkedChildrenCount = childrenIds.filter((id) => checkedSet.has(id)).length;
    const hasParent = checkedSet.has(node.id);
    
    const isChecked = hasParent && checkedChildrenCount === childrenIds.length;
    const isIndeterminate = hasParent && !isChecked;

    return { isChecked, isIndeterminate };
  };

  const toggleCategorySelection = (node: PermissionNode, isCreateForm: boolean = false) => {
    const checkedSet = isCreateForm ? newRolePermissions : checkedPermissions;
    const setChecked = isCreateForm ? setNewRolePermissions : setCheckedPermissions;
    const next = new Set(checkedSet);
    
    if (!node.children || node.children.length === 0) {
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      setChecked(next);
      return;
    }

    const childrenIds = node.children.map((c) => c.id);

    if (next.has(node.id)) {
      // Uncheck parent and all children
      next.delete(node.id);
      childrenIds.forEach((id) => next.delete(id));
    } else {
      // Check parent and all children
      next.add(node.id);
      childrenIds.forEach((id) => next.add(id));
    }
    setChecked(next);
  };

  const toggleChildSelection = (childId: string, parentId: string, isCreateForm: boolean = false) => {
    const checkedSet = isCreateForm ? newRolePermissions : checkedPermissions;
    const setChecked = isCreateForm ? setNewRolePermissions : setCheckedPermissions;
    const next = new Set(checkedSet);
    
    if (next.has(childId)) {
      next.delete(childId);
    } else {
      next.add(childId);
      // Auto-check parent when a child is checked
      next.add(parentId);
    }
    setChecked(next);
  };

  const toggleCategoryExpand = (categoryId: string) => {
    const next = new Set(expandedCategories);
    if (next.has(categoryId)) {
      next.delete(categoryId);
    } else {
      next.add(categoryId);
    }
    setExpandedCategories(next);
  };

  const expandAllCategories = () => {
    setExpandedCategories(new Set(dynamicPermissionTree.map((p) => p.id)));
  };

  const collapseAllCategories = () => {
    setExpandedCategories(new Set());
  };

  const filteredAndSortedData = useMemo(() => {
    return [...roles].sort((a, b) => {
      if (sortKey === "permissionsCount") {
        const aCount = a.permissions?.length || 0;
        const bCount = b.permissions?.length || 0;
        return sortOrder === "asc" ? aCount - bCount : bCount - aCount;
      }
      return sortOrder === "asc"
        ? String(a[sortKey]).localeCompare(String(b[sortKey]))
        : String(b[sortKey]).localeCompare(String(a[sortKey]));
    });
  }, [roles, sortKey, sortOrder]);

  const totalItems = totalRecords;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + roles.length, totalItems);
  const currentData = filteredAndSortedData;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-xs">
      {/* Toast Container */}
      {mounted && typeof document !== "undefined" && createPortal(
        <div className="fixed bottom-5 right-5 z-[999999] flex flex-col gap-2 max-w-md w-full sm:w-auto">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl shadow-2xl border border-white/10 dark:border-black/5"
            >
              {toast.type === "success" ? (
                <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
          ))}
        </div>,
        document.body
      )}

      {/* Card Header (Title, Subtitle, and Create Button) */}
      <div className="flex flex-col gap-4 px-5 sm:px-6 py-5 border-b border-gray-100 dark:border-gray-800 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {t("roles.title")}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t("roles.description")}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-theme-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t("roles.addRole")}
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 sm:p-5 border-b border-gray-150 dark:border-gray-800 bg-gray-50/20 dark:bg-gray-900/10">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between w-full">
          {/* Text Search */}
          <div className="relative w-full sm:max-w-xs">
            <input
              type="text"
              placeholder={t("roles.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="h-11 w-full pl-10 pr-4 py-2 text-sm bg-transparent border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder-gray-400"
            />
            <span className="absolute left-3 top-3.5 text-gray-400">
              <Search className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
            <TableRow>
              {[
                { key: "name", label: t("roles.colName") },
                { key: "description", label: t("roles.colDescription") },
                { key: "permissionsCount", label: t("roles.colPermissions") },
                { key: "status", label: t("roles.colStatus") },
                { key: "createdAt", label: t("roles.colCreatedAt") },
              ].map(({ key, label }) => (
                <TableCell
                  key={key}
                  isHeader
                  className="px-6 py-4 border-r last:border-r-0 border-gray-100 dark:border-white/[0.05] text-left"
                >
                  <div
                    className="flex items-center justify-between cursor-pointer select-none"
                    onClick={() => handleSort(key as SortKey)}
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
              <TableCell isHeader className="px-6 py-4 text-center font-semibold text-gray-800 text-theme-sm dark:text-gray-200">
                {t("roles.colActions")}
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {isLoading ? (
              Array.from({ length: itemsPerPage }).map((_, idx) => (
                <TableRow key={idx} className="animate-pulse">
                  <TableCell className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-24"></div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-48"></div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="h-6 bg-gray-200 dark:bg-white/10 rounded-full w-24"></div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="h-6 bg-gray-200 dark:bg-white/10 rounded-full w-16"></div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-20"></div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <div className="h-8 w-8 bg-gray-200 dark:bg-white/10 rounded-md"></div>
                      <div className="h-8 w-8 bg-gray-200 dark:bg-white/10 rounded-md"></div>
                      <div className="h-8 w-8 bg-gray-200 dark:bg-white/10 rounded-md"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="px-6 py-10 text-center text-error-500 dark:text-error-400 font-medium">
                  {error}
                </TableCell>
              </TableRow>
            ) : currentData.length > 0 ? (
              currentData.map((role) => (
                <TableRow key={role.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                  <TableCell className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    {role.name}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-400 max-w-[300px] truncate">
                    {role.description}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-gray-900 dark:text-white whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200">
                      {t("roles.permissionsCount", { count: role.permissions?.length || 0 })}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <Badge
                      variant="light"
                      color={role.status === "Active" ? "success" : "error"}
                      size="sm"
                    >
                      {role.status === "Active" ? t("roles.statusActive") : t("roles.statusInactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {formatDate(role.createdAt)}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openPermissionsModal(role)}
                        title={t("roles.editPermissionsTooltip")}
                        className="p-1.5 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                      >
                        {/* Gear/cogwheel SVG */}
                        <svg
                          className="w-4.5 h-4.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      </button>
                      <button
                        title={t("roles.editTooltip")}
                        className="p-1.5 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        title={t("roles.deleteTooltip")}
                        className="p-1.5 text-gray-500 hover:text-error-500 dark:text-gray-400 dark:hover:text-error-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                      >
                        <TrashBinIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                  {t("roles.noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between px-6 py-5 bg-gray-50/50 dark:bg-white/[0.01] border-t border-gray-100 dark:border-gray-800/40">
        <div className="flex flex-wrap items-center gap-4 pb-3 xl:pb-0 justify-center xl:justify-start">
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <span>{t("common.show", { defaultValue: "Hiển thị" })}</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-8 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-2 text-sm text-gray-700 dark:text-gray-350 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer font-medium"
            >
              {[5, 10, 15, 20].map((value) => (
                <option key={value} value={value} className="dark:bg-gray-900">{value}</option>
              ))}
            </select>
            <span>{t("common.entriesPerPage", { defaultValue: "mục mỗi trang" })}</span>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t("roles.showing", { start: totalItems === 0 ? 0 : startIndex + 1, end: endIndex, total: totalItems })}
          </p>
        </div>
        {totalPages > 1 && (
          <PaginationWithIcon
            totalPages={totalPages}
            initialPage={currentPage}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      {/* Create Role Modal */}
      <CreateRoleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        t={t}
        newRoleName={newRoleName}
        setNewRoleName={setNewRoleName}
        newRoleDesc={newRoleDesc}
        setNewRoleDesc={setNewRoleDesc}
        newRoleStatus={newRoleStatus}
        setNewRoleStatus={setNewRoleStatus}
        dynamicPermissionTree={dynamicPermissionTree}
        expandedCategories={expandedCategories}
        toggleCategoryExpand={toggleCategoryExpand}
        getCategorySelectionState={getCategorySelectionState}
        toggleCategorySelection={toggleCategorySelection}
        toggleChildSelection={toggleChildSelection}
        newRolePermissions={newRolePermissions}
        handleAddRoleSubmit={handleAddRoleSubmit}
      />

      {/* Permissions Assignment Modal */}
      <EditPermissionsModal
        isOpen={isPermissionsModalOpen}
        onClose={() => setIsPermissionsModalOpen(false)}
        t={t}
        selectedRoleForPermissions={selectedRoleForPermissions}
        dynamicPermissionTree={dynamicPermissionTree}
        expandedCategories={expandedCategories}
        expandAllCategories={expandAllCategories}
        collapseAllCategories={collapseAllCategories}
        toggleCategoryExpand={toggleCategoryExpand}
        getCategorySelectionState={getCategorySelectionState}
        toggleCategorySelection={toggleCategorySelection}
        toggleChildSelection={toggleChildSelection}
        checkedPermissions={checkedPermissions}
        handleSavePermissions={handleSavePermissions}
      />
    </div>
  );
}

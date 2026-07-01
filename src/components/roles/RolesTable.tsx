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

  // Toast notifications state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (message: string) => {
    setToastMessage(message);
  };

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
    <div className="overflow-hidden bg-white dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/[0.05]">
      {/* Table Header Controls */}
      <div className="flex flex-col gap-3 px-6 py-5 border-b border-gray-100 dark:border-white/[0.05] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">{t("roles.show")}</span>
          <div className="relative z-20 bg-transparent">
            <select
              className="w-full py-2 pl-3 pr-8 text-sm text-gray-800 bg-transparent border border-gray-300 rounded-lg appearance-none dark:bg-dark-900 h-9 bg-none shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {[5, 10, 15].map((value) => (
                <option
                  key={value}
                  value={value}
                  className="text-gray-500 dark:bg-gray-900 dark:text-gray-400"
                >
                  {value}
                </option>
              ))}
            </select>
            <span className="absolute z-30 text-gray-500 -translate-y-1/2 right-2 top-1/2 dark:text-gray-400 pointer-events-none">
              <svg
                className="stroke-current"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3.8335 5.9165L8.00016 10.0832L12.1668 5.9165"
                  stroke=""
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{t("roles.entries")}</span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <button className="absolute text-gray-500 -translate-y-1/2 left-4 top-1/2 dark:text-gray-400">
              <svg
                className="fill-current"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M3.04199 9.37363C3.04199 5.87693 5.87735 3.04199 9.37533 3.04199C12.8733 3.04199 15.7087 5.87693 15.7087 9.37363C15.7087 12.8703 12.8733 15.7053 9.37533 15.7053C5.87735 15.7053 3.04199 12.8703 3.04199 9.37363ZM9.37533 1.54199C5.04926 1.54199 1.54199 5.04817 1.54199 9.37363C1.54199 13.6991 5.04926 17.2053 9.37533 17.2053C11.2676 17.2053 13.0032 16.5344 14.3572 15.4176L17.1773 18.238C17.4702 18.5309 17.945 18.5309 18.2379 18.238C18.5308 17.9451 18.5309 17.4703 18.238 17.1773L15.4182 14.3573C16.5367 13.0033 17.2087 11.2669 17.2087 9.37363C17.2087 5.04817 13.7014 1.54199 9.37533 1.54199Z"
                  fill=""
                />
              </svg>
            </button>

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={t("roles.searchPlaceholder")}
              className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-11 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[250px]"
            />
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 transition-colors shadow-theme-xs"
          >
            <svg
              className="fill-current"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8.00016 3.33331V12.6666M3.3335 7.99998H12.6668"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t("roles.addRole")}
          </button>
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
                  <TableCell className="px-6 py-4 text-center">
                    <div className="h-6 bg-gray-200 dark:bg-white/10 rounded-full w-24 mx-auto"></div>
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
                  <TableCell className="px-6 py-4 text-gray-900 dark:text-white text-center whitespace-nowrap">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200">
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
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between px-6 py-5 bg-gray-50/50 dark:bg-white/[0.01] border-t border-gray-100 dark:border-white/[0.05]">
        <div className="pb-3 xl:pb-0">
          <p className="text-sm font-medium text-center text-gray-500 dark:text-gray-400 xl:text-left">
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
      {/* Floating premium toast notifications */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-99999 flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl shadow-2xl border border-white/10 dark:border-black/5 animate-bounce">
          <svg className="w-5 h-5 text-success-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

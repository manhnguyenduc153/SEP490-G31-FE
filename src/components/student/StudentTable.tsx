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
import { StudentFormModal } from "./StudentFormModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import {
  studentApi,
  StudentItem,
  StudentSaveDto,
} from "@/services/student.api";
import { CodeHelper } from "@/helpers/CodeHelper";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/modal";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = "code" | "name" | "email" | "phone" | "status" | "gradeLevel";
type SortOrder = "asc" | "desc";

const defaultFormValues: StudentSaveDto = {
  code: "",
  name: "",
  dob: null,
  gender: null,
  email: null,
  phone: null,
  address: null,
  status: 1, // Active by default
  description: null,
  schoolName: null,
  gradeLevel: null,
  parentName: null,
  parentPhone: null,
  avatar: null,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudentTable() {
  const { t } = useTranslation();

  // ── Dynamic Metadata ──
  useEffect(() => {
    document.title = `${t("student.title", { defaultValue: "Quản lý Học sinh" })} | School Management System`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", t("student.description", { defaultValue: "Quản lý danh sách học sinh." }));
    }
  }, [t]);

  // ── Data states ──
  const [items, setItems] = useState<StudentItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Pagination / search / sort / filters ──
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  
  // Custom filter states
  const [filterStatus, setFilterStatus] = useState<number | null>(null);
  const [filterGrade, setFilterGrade] = useState<number | null>(null);
  const [filterGender, setFilterGender] = useState<boolean | null>(null);

  // Refresh trigger
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  // ── Toast ──
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // ── Create / Edit modal ──
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StudentItem | null>(null);
  const [formValues, setFormValues] = useState<StudentSaveDto>(defaultFormValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Delete confirm modal ──
  const [deleteTarget, setDeleteTarget] = useState<StudentItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Deactivate confirm modal ──
  const [deactivateTarget, setDeactivateTarget] = useState<StudentItem | null>(null);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // ── Toast auto-hide ──
  useEffect(() => {
    if (!toastMessage) return;
    const timeout = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
  };

  // ── Debounce search ──
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  // ── Fetch data ──
  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await studentApi.getAll(
          currentPage,
          itemsPerPage,
          debouncedSearchTerm,
          filterStatus,
          filterGrade,
          filterGender
        );
        if (!mounted) return;
        if (res.success && res.data) {
          setItems(res.data.items || []);
          setTotalRecords(res.data.totalRecords || 0);
          setTotalPages(res.data.totalPages || 0);
        } else {
          setError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("student.systemError"));
        }
      } catch {
        if (mounted) setError(t("student.systemError"));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, debouncedSearchTerm, filterStatus, filterGrade, filterGender, refreshKey]);

  // ── Sort ──
  const sortedData = useMemo(() => {
    return [...items].sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      
      if (av === null || av === undefined) av = "";
      if (bv === null || bv === undefined) bv = "";

      if (typeof av === "string" && typeof bv === "string") {
        return sortOrder === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortOrder === "asc" 
        ? (av as number) - (bv as number) 
        : (bv as number) - (av as number);
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
    setFormValues({
      ...defaultFormValues,
      code: CodeHelper.generate("STD"),
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // ── Open edit modal ──
  const openEditModal = (item: StudentItem) => {
    setEditingItem(item);
    setFormValues({
      id: item.id,
      code: item.code,
      name: item.name,
      dob: item.dob,
      gender: item.gender,
      email: item.email,
      phone: item.phone,
      address: item.address,
      status: item.status,
      description: item.description,
      schoolName: item.schoolName,
      gradeLevel: item.gradeLevel,
      parentName: item.parentName,
      parentPhone: item.parentPhone,
      avatar: item.avatar,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // ── Submit create / edit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValues.code.trim()) {
      setFormError(t("backendMessages.ERR_CODE_EMPTY"));
      return;
    }
    if (!formValues.name.trim()) {
      setFormError(t("backendMessages.ERR_NAME_EMPTY"));
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingItem) {
        // Edit
        const res = await studentApi.update(editingItem.id, formValues);
        if (res.success && res.data) {
          setItems((prev) =>
            prev.map((i) => (i.id === editingItem.id ? res.data : i))
          );
          showToast(t("student.updateSuccess", { name: res.data.name }));
          setIsModalOpen(false);
        } else {
          setFormError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("student.updateError"));
        }
      } else {
        // Create
        const res = await studentApi.create(formValues);
        if (res.success && res.data) {
          setCurrentPage(1);
          setSearchTerm("");
          setDebouncedSearchTerm("");
          triggerRefresh();
          showToast(t("student.createSuccess", { name: res.data.name }));
          setIsModalOpen(false);
        } else {
          setFormError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("student.createError"));
        }
      }
    } catch {
      setFormError(t("student.systemError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Open delete confirm ──
  const openDeleteModal = (item: StudentItem) => {
    setDeleteTarget(item);
    setIsDeleteModalOpen(true);
  };

  // ── Confirm delete ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await studentApi.delete(deleteTarget.id);
      if (res.success) {
        showToast(t("student.deleteSuccess", { name: deleteTarget.name }));
        setIsDeleteModalOpen(false);
        setDeleteTarget(null);
        triggerRefresh();
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("student.deleteError"), "error");
      }
    } catch {
      showToast(t("student.systemError"), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Open deactivate confirm ──
  const openDeactivateModal = (item: StudentItem) => {
    setDeactivateTarget(item);
    setIsDeactivateModalOpen(true);
  };

  // ── Confirm deactivate ──
  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setIsDeactivating(true);
    try {
      const res = await studentApi.deactive(deactivateTarget.id);
      if (res.success) {
        showToast(t("student.deactivateSuccess", { name: deactivateTarget.name }));
        setIsDeactivateModalOpen(false);
        setDeactivateTarget(null);
        triggerRefresh();
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("student.deactivateError"), "error");
      }
    } catch {
      showToast(t("student.systemError"), "error");
    } finally {
      setIsDeactivating(false);
    }
  };

  // ── Pagination helpers ──
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + items.length, totalRecords);

  const columns: { key: SortKey; label: string }[] = [
    { key: "code", label: t("student.colCode", { defaultValue: "Mã HS" }) },
    { key: "name", label: t("student.colName", { defaultValue: "Họ và tên" }) },
    { key: "email", label: t("student.colEmail", { defaultValue: "Email" }) },
    { key: "phone", label: t("student.colPhone", { defaultValue: "Số điện thoại" }) },
    { key: "gradeLevel", label: t("student.colGradeLevel", { defaultValue: "Khối lớp" }) },
    { key: "status", label: t("student.colStatus", { defaultValue: "Trạng thái" }) },
  ];

  // Render Status Badge
  const renderStatusBadge = (status: number, statusName: string) => {
    let color = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    if (status === 1) { // Active
      color = "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-500";
    } else if (status === 0) { // Inactive
      color = "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-500";
    } else if (status === 2) { // Suspended
      color = "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-500";
    } else if (status === 3) { // Graduated
      color = "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-500";
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
        {statusName}
      </span>
    );
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

      {/* Filter and Control panel */}
      <div className="p-6 border-b border-gray-100 dark:border-white/[0.05] space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Status filter */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t("student.filterStatus", { defaultValue: "Trạng thái" })}</span>
            <select
              className="py-1.5 pl-3 pr-8 text-sm text-gray-800 bg-transparent border border-gray-300 rounded-lg appearance-none dark:bg-dark-900 h-9 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={filterStatus === null ? "" : filterStatus}
              onChange={(e) => {
                const val = e.target.value;
                setFilterStatus(val === "" ? null : Number(val));
                setCurrentPage(1);
              }}
            >
              <option value="" className="dark:bg-gray-900">{t("student.filterAll", { defaultValue: "Tất cả" })}</option>
              <option value={1} className="dark:bg-gray-900">{t("student.formStatusActive", { defaultValue: "Hoạt động" })}</option>
              <option value={0} className="dark:bg-gray-900">{t("student.formStatusInactive", { defaultValue: "Ngưng hoạt động" })}</option>
              <option value={2} className="dark:bg-gray-900">{t("student.formStatusSuspended", { defaultValue: "Bị đình chỉ" })}</option>
              <option value={3} className="dark:bg-gray-900">{t("student.formStatusGraduated", { defaultValue: "Đã tốt nghiệp" })}</option>
            </select>
          </div>

          {/* Grade Level filter */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t("student.filterGrade", { defaultValue: "Khối lớp" })}</span>
            <select
              className="py-1.5 pl-3 pr-8 text-sm text-gray-800 bg-transparent border border-gray-300 rounded-lg appearance-none dark:bg-dark-900 h-9 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={filterGrade === null ? "" : filterGrade}
              onChange={(e) => {
                const val = e.target.value;
                setFilterGrade(val === "" ? null : Number(val));
                setCurrentPage(1);
              }}
            >
              <option value="" className="dark:bg-gray-900">{t("student.filterAll", { defaultValue: "Tất cả" })}</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                <option key={g} value={g} className="dark:bg-gray-900">
                  {t("student.colGradeLevel")} {g}
                </option>
              ))}
            </select>
          </div>

          {/* Gender filter */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t("student.filterGender", { defaultValue: "Giới tính" })}</span>
            <select
              className="py-1.5 pl-3 pr-8 text-sm text-gray-800 bg-transparent border border-gray-300 rounded-lg appearance-none dark:bg-dark-900 h-9 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={filterGender === null ? "" : String(filterGender)}
              onChange={(e) => {
                const val = e.target.value;
                setFilterGender(val === "" ? null : val === "true");
                setCurrentPage(1);
              }}
            >
              <option value="" className="dark:bg-gray-900">{t("student.filterAll", { defaultValue: "Tất cả" })}</option>
              <option value="true" className="dark:bg-gray-900">{t("student.formGenderMale", { defaultValue: "Nam" })}</option>
              <option value="false" className="dark:bg-gray-900">{t("student.formGenderFemale", { defaultValue: "Nữ" })}</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
          {/* Show N entries */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t("student.show", { defaultValue: "Hiển thị" })}</span>
            <div className="relative z-20 bg-transparent">
              <select
                className="py-1.5 pl-3 pr-8 text-sm text-gray-800 bg-transparent border border-gray-300 rounded-lg appearance-none dark:bg-dark-900 h-9 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
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
            <span className="text-sm text-gray-500 dark:text-gray-400">{t("student.entries", { defaultValue: "mục" })}</span>
          </div>

          {/* Search + Add Button */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <button className="absolute text-gray-500 -translate-y-1/2 left-4 top-1/2 dark:text-gray-400">
                <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path fillRule="evenodd" clipRule="evenodd" d="M3.04199 9.37363C3.04199 5.87693 5.87735 3.04199 9.37533 3.04199C12.8733 3.04199 15.7087 5.87693 15.7087 9.37363C15.7087 12.8703 12.8733 15.7053 9.37533 15.7053C5.87735 15.7053 3.04199 12.8703 3.04199 9.37363ZM9.37533 1.54199C5.04926 1.54199 1.54199 5.04817 1.54199 9.37363C1.54199 13.6991 5.04926 17.2053 9.37533 17.2053C11.2676 17.2053 13.0032 16.5344 14.3572 15.4176L17.1773 18.238C17.4702 18.5309 17.945 18.5309 18.2379 18.238C18.5308 17.9451 18.5309 17.4703 18.238 17.1773L15.4182 14.3573C16.5367 13.0033 17.2087 11.2669 17.2087 9.37363C17.2087 5.04817 13.7014 1.54199 9.37533 1.54199Z" />
                </svg>
              </button>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("student.searchPlaceholder", { defaultValue: "Tìm kiếm học sinh..." })}
                className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-11 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[250px]"
              />
            </div>
            <PermissionGuard requiredPermission="Student.Create">
              <button
                onClick={openCreateModal}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 transition-colors shadow-theme-xs"
              >
                <svg className="fill-current" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8.00016 3.33331V12.6666M3.3335 7.99998H12.6668" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t("student.addStudent", { defaultValue: "Thêm học sinh" })}
              </button>
            </PermissionGuard>
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
                {t("student.colActions", { defaultValue: "Thao tác" })}
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {isLoading ? (
              Array.from({ length: itemsPerPage }).map((_, idx) => (
                <TableRow key={idx} className="animate-pulse">
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-6" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-16" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-32" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-40" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-24" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-10" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-16" /></TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <div className="h-8 w-8 bg-gray-200 dark:bg-white/10 rounded" />
                      <div className="h-8 w-8 bg-gray-200 dark:bg-white/10 rounded" />
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
                  <TableCell className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    {item.code}
                  </TableCell>
                  <TableCell className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {item.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.avatar}
                          alt={item.name}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                          onError={(e) => {
                            // Fallback
                            e.currentTarget.src = "/images/user/user-01.png";
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center font-semibold text-xs shrink-0">
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
                        {item.dob && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(item.dob).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {item.email || <span className="text-gray-300 dark:text-gray-700">-</span>}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {item.phone || <span className="text-gray-300 dark:text-gray-700">-</span>}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {item.gradeLevel ? `${t("student.colGradeLevel")} ${item.gradeLevel}` : <span className="text-gray-300 dark:text-gray-700">-</span>}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    {renderStatusBadge(item.status, item.statusName)}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <PermissionGuard requiredPermission="Student.Edit">
                        <button
                          title={t("student.editTooltip", { defaultValue: "Chỉnh sửa" })}
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard requiredPermission="Student.Delete">
                        {item.status !== 0 && (
                          <button
                            title={t("student.deactivateTooltip", { defaultValue: "Vô hiệu hóa" })}
                            onClick={() => openDeactivateModal(item)}
                            className="p-1.5 text-gray-500 hover:text-yellow-500 dark:text-gray-400 dark:hover:text-yellow-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                        )}
                        <button
                          title={t("student.deleteTooltip", { defaultValue: "Xóa" })}
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
                  colSpan={8}
                  className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                >
                  {t("student.noResults", { defaultValue: "Không tìm thấy học sinh nào." })}
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
            {t("student.showing", { start: totalRecords === 0 ? 0 : startIndex + 1, end: endIndex, total: totalRecords, defaultValue: `Hiển thị ${totalRecords === 0 ? 0 : startIndex + 1} đến ${endIndex} trong tổng số ${totalRecords} mục` })}
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
      <StudentFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        t={t}
        editingItem={editingItem}
        formValues={formValues}
        setFormValues={setFormValues}
        formError={formError}
        isSubmitting={isSubmitting}
        handleSubmit={handleSubmit}
      />

      {/* ── Delete Confirm Modal ── */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        itemName={deleteTarget?.name}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
      />

      {/* ── Deactivate Confirm Modal ── */}
      <Modal
        isOpen={isDeactivateModalOpen}
        onClose={() => setIsDeactivateModalOpen(false)}
        className="max-w-[480px] p-6"
      >
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("student.deactivateConfirmTitle", { defaultValue: "Xác nhận vô hiệu hóa" })}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("student.deactivateConfirmDesc", { name: deactivateTarget?.name })}
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsDeactivateModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
            >
              {t("student.btnCancel", { defaultValue: "Hủy" })}
            </button>
            <button
              disabled={isDeactivating}
              onClick={handleDeactivate}
              className="px-4 py-2 text-sm font-medium text-white bg-yellow-500 rounded-lg hover:bg-yellow-600 disabled:opacity-60"
            >
              {isDeactivating ? t("student.btnSaving", { defaultValue: "Đang lưu..." }) : t("student.btnDeactivate", { defaultValue: "Vô hiệu hóa" })}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

"use client";

import { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AngleDownIcon, AngleUpIcon, PencilIcon, TrashBinIcon } from "@/icons";
import PaginationWithIcon from "@/components/tables/DataTables/TableOne/PaginationWithIcon";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import {
  studentApi,
  StudentItem,
  StudentSaveDto,
} from "@/services/student.api";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/modal";
import { Eye, Search, Edit, Trash2 } from "lucide-react";
import { StudentViewModal } from "./StudentViewModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = "code" | "name" | "email" | "phone" | "status" | "gradeLevel" | "hasAccount";
type SortOrder = "asc" | "desc";
type TabType = "all" | "active" | "suspended" | "graduated";

interface StudentTableProps {
  refreshKey?: number;
  showToast: (msg: string, type?: "success" | "error") => void;
  onAddClick: () => void;
  onEditClick: (item: StudentItem) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudentTable({ refreshKey = 0, showToast, onAddClick, onEditClick }: StudentTableProps) {
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
  const [filterGrade, setFilterGrade] = useState<number | null>(null);
  const [filterGender, setFilterGender] = useState<boolean | null>(null);

  // Tab stats
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [countAll, setCountAll] = useState(0);
  const [countActive, setCountActive] = useState(0);
  const [countSuspended, setCountSuspended] = useState(0);
  const [countGraduated, setCountGraduated] = useState(0);

  // Internal refresh (for delete/deactivate)
  const [internalRefreshKey, setInternalRefreshKey] = useState(0);
  const triggerRefresh = () => setInternalRefreshKey((k) => k + 1);

  // ── View modal states ──
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingStudentId, setViewingStudentId] = useState<number | null>(null);

  const openViewModal = (id: number) => {
    setViewingStudentId(id);
    setIsViewModalOpen(true);
  };

  // ── Bulk selection & provisioning ──
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isProvisioning, setIsProvisioning] = useState(false);

  const selectedUnprovisionedIds = useMemo(() => {
    return items
      .filter((item) => selectedIds.includes(item.id) && !item.hasAccount)
      .map((item) => item.id);
  }, [items, selectedIds]);

  useEffect(() => {
    setSelectedIds([]);
  }, [items]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(items.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectItem = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleProvisionAccounts = async () => {
    if (selectedUnprovisionedIds.length === 0) return;
    setIsProvisioning(true);
    try {
      const res = await studentApi.provisionAccounts(selectedUnprovisionedIds);
      if (res.success) {
        showToast(t("student.provisionSuccess", { count: selectedUnprovisionedIds.length, defaultValue: `Cấp tài khoản thành công cho ${selectedUnprovisionedIds.length} học sinh!` }));
        setSelectedIds([]);
        triggerRefresh();
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("student.provisionError", { defaultValue: "Có lỗi xảy ra khi cấp tài khoản học sinh." }), "error");
      }
    } catch {
      showToast(t("student.systemError"), "error");
    } finally {
      setIsProvisioning(false);
    }
  };

  // ── Delete confirm modal ──
  const [deleteTarget, setDeleteTarget] = useState<StudentItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Deactivate confirm modal ──
  const [deactivateTarget, setDeactivateTarget] = useState<StudentItem | null>(null);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

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
        // Fetch all filtered items to count tab statistics
        const allItemsRes = await studentApi.getAll(
          1,
          10000,
          debouncedSearchTerm,
          null, // don't filter by status to calculate counts correctly!
          filterGrade,
          filterGender
        );

        if (!mounted) return;

        if (allItemsRes.success && allItemsRes.data) {
          const allList = allItemsRes.data.items || [];
          setCountAll(allList.length);
          setCountActive(allList.filter(s => s.status === 1).length);
          setCountSuspended(allList.filter(s => s.status === 2).length);
          setCountGraduated(allList.filter(s => s.status === 3).length);

          // Filter main list items by activeTab
          let displayList = allList;
          if (activeTab === "active") displayList = allList.filter(s => s.status === 1);
          else if (activeTab === "suspended") displayList = allList.filter(s => s.status === 2);
          else if (activeTab === "graduated") displayList = allList.filter(s => s.status === 3);

          // Apply client-side sorting on displayList first
          const sortedList = [...displayList].sort((a, b) => {
            let av = a[sortKey];
            let bv = b[sortKey];
            
            if (av === null || av === undefined) av = "";
            if (bv === null || bv === undefined) bv = "";

            if (typeof av === "string" && typeof bv === "string") {
              return sortOrder === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
            }
            if (typeof av === "boolean" && typeof bv === "boolean") {
              return sortOrder === "asc" ? (av ? 1 : 0) - (bv ? 1 : 0) : (bv ? 1 : 0) - (av ? 1 : 0);
            }
            return sortOrder === "asc" 
              ? (av as number) - (bv as number) 
              : (bv as number) - (av as number);
          });

          const total = sortedList.length;
          setTotalRecords(total);
          setTotalPages(Math.ceil(total / itemsPerPage));

          // Apply manual paging on the sorted array
          const startIndex = (currentPage - 1) * itemsPerPage;
          setItems(sortedList.slice(startIndex, startIndex + itemsPerPage));
        } else {
          setError(allItemsRes.message ? t(`backendMessages.${allItemsRes.message}`, { defaultValue: allItemsRes.message }) : t("student.systemError"));
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
  }, [currentPage, itemsPerPage, debouncedSearchTerm, filterGrade, filterGender, activeTab, sortKey, sortOrder, refreshKey, internalRefreshKey]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
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
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("student.deleteSuccess", { name: deleteTarget.name }));
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
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("student.deactivateSuccess", { name: deactivateTarget.name }));
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

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Mã HS": "ST001",
        "Họ và tên": "Nguyễn Văn A",
        "Email": "nguyenvana@example.com",
        "Số điện thoại": "0987654321",
        "Ngày sinh": "01/01/2010",
        "Giới tính": "Nam",
        "Địa chỉ": "123 Đường Láng, Hà Nội",
        "Trường học": "THCS Láng Hạ",
        "Khối lớp": 8,
        "Tên phụ huynh": "Nguyễn Văn B",
        "SĐT phụ huynh": "0912345678",
        "Ghi chú": "Học sinh khá"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Nhập Học sinh");
    XLSX.writeFile(wb, "Template_Nhap_Hoc_Sinh.xlsx");
    showToast("Tải file mẫu Excel thành công!");
  };

  const handleExportExcel = async () => {
    try {
      const res = await studentApi.getAll(1, 10000, searchTerm, null, filterGrade, filterGender);
      if (res.success && res.data) {
        const exportItems = res.data.items || [];
        
        const sheetData = exportItems.map((item, idx) => ({
          "STT": idx + 1,
          "Mã HS": item.code,
          "Họ và tên": item.name,
          "Email": item.email || "",
          "Số điện thoại": item.phone || "",
          "Ngày sinh": item.dob ? new Date(item.dob).toLocaleDateString("vi-VN") : "",
          "Giới tính": item.gender === true ? "Nam" : item.gender === false ? "Nữ" : "",
          "Địa chỉ": item.address || "",
          "Trường học": item.schoolName || "",
          "Khối lớp": item.gradeLevel || "",
          "Tên phụ huynh": item.parentName || "",
          "SĐT phụ huynh": item.parentPhone || "",
          "Ghi chú": item.description || ""
        }));

        const ws = XLSX.utils.json_to_sheet(sheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Danh sách Học sinh");
        XLSX.writeFile(wb, "Danh_Sach_Hoc_Sinh.xlsx");
        showToast("Xuất dữ liệu Excel thành công!");
      } else {
        showToast(res.message || "Không thể xuất file Excel", "error");
      }
    } catch (err) {
      console.error("Export Excel error", err);
      showToast("Lỗi hệ thống khi xuất Excel", "error");
    }
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];

        const rows = XLSX.utils.sheet_to_json(ws);
        if (rows.length === 0) {
          showToast("File Excel không có dữ liệu", "error");
          return;
        }

        const dtos: StudentSaveDto[] = [];
        for (const row of rows as any[]) {
          const name = row["Họ và tên"] || row["Name"] || row["name"];
          const email = row["Email"] || row["email"];
          const phone = row["Số điện thoại"] || row["SĐT"] || row["Phone"] || row["phone"];
          const code = row["Mã HS"] || row["Mã học sinh"] || row["Code"] || row["code"];
          const dobStr = row["Ngày sinh"] || row["Dob"] || row["dob"];
          const genderStr = row["Giới tính"] || row["Gender"] || row["gender"];
          const address = row["Địa chỉ"] || row["Address"] || row["address"];
          const schoolName = row["Trường học"] || row["School"] || row["school"];
          const gradeLevelStr = row["Khối lớp"] || row["Grade"] || row["grade"];
          const parentName = row["Tên phụ huynh"] || row["Phụ huynh"] || row["ParentName"];
          const parentPhone = row["SĐT phụ huynh"] || row["ParentPhone"];
          const description = row["Ghi chú"] || row["Note"] || row["description"];

          if (!name || !email) {
            continue;
          }

          let dob = null;
          if (dobStr) {
            const parts = String(dobStr).split("/");
            if (parts.length === 3) {
              dob = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
            } else {
              dob = String(dobStr);
            }
          }

          let gender = null;
          if (genderStr) {
            const normalizedGender = String(genderStr).toLowerCase().trim();
            if (normalizedGender === "nam" || normalizedGender === "true" || normalizedGender === "1") {
              gender = true;
            } else if (normalizedGender === "nữ" || normalizedGender === "female" || normalizedGender === "false" || normalizedGender === "0") {
              gender = false;
            }
          }

          let gradeLevel = null;
          if (gradeLevelStr) {
            const parsedGrade = parseInt(String(gradeLevelStr), 10);
            if (!isNaN(parsedGrade)) {
              gradeLevel = parsedGrade;
            }
          }

          dtos.push({
            code: code ? String(code).trim() : "",
            name: String(name).trim(),
            email: String(email).trim(),
            phone: phone ? String(phone).trim() : null,
            dob,
            gender,
            address: address ? String(address).trim() : null,
            schoolName: schoolName ? String(schoolName).trim() : null,
            gradeLevel,
            parentName: parentName ? String(parentName).trim() : null,
            parentPhone: parentPhone ? String(parentPhone).trim() : null,
            description: description ? String(description).trim() : null,
            status: 1
          });
        }

        if (dtos.length === 0) {
          showToast("Không tìm thấy dòng dữ liệu hợp lệ (yêu cầu Họ và tên & Email)", "error");
          return;
        }

        const res = await studentApi.import(dtos);
        if (res.success) {
          showToast(`Nhập thành công ${res.data?.length || dtos.length} học sinh!`);
          triggerRefresh();
        } else {
          showToast(res.message || "Lỗi khi nhập danh sách học sinh", "error");
        }
      } catch (err: any) {
        console.error("Import Excel error", err);
        showToast("Lỗi khi đọc file Excel: " + err.message, "error");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  // ── Pagination helpers ──
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + items.length, totalRecords);

  const columns: { key: SortKey; label: string }[] = [
    { key: "code", label: t("student.colCode") },
    { key: "name", label: t("student.colName") },
    { key: "email", label: t("student.colEmail") },
    { key: "phone", label: t("student.colPhone") },
    { key: "gradeLevel", label: t("student.colGradeLevel") },
    { key: "status", label: t("student.colStatus") },
    { key: "hasAccount", label: t("student.colAccount") },
  ];

  const getStatusLabel = (status: number) => {
    switch (status) {
      case 1:
        return t("student.formStatusActive", { defaultValue: "Hoạt động" });
      case 0:
        return t("student.formStatusInactive", { defaultValue: "Ngưng hoạt động" });
      case 2:
        return t("student.formStatusSuspended", { defaultValue: "Bị đình chỉ" });
      case 3:
        return t("student.formStatusGraduated", { defaultValue: "Đã tốt nghiệp" });
      default:
        return t("student.formStatusInactive", { defaultValue: "Ngưng hoạt động" });
    }
  };

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
    <div className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-visible">

      {/* Header with Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {t("student.title", { defaultValue: "Quản lý Học sinh" })}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t("student.description", { defaultValue: "Quản lý danh sách học sinh, thông tin phụ huynh và cấp tài khoản." })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-theme-xs rounded-lg cursor-pointer h-11"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {t("student.exportExcel", { defaultValue: "Xuất Excel" })}
          </button>
          <PermissionGuard requiredPermission="Student.Create">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-theme-xs rounded-lg cursor-pointer h-11"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              {t("student.downloadTemplate", { defaultValue: "Tải file mẫu" })}
            </button>
          </PermissionGuard>
          <PermissionGuard requiredPermission="Student.Create">
            <label
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-theme-xs rounded-lg cursor-pointer h-11"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
              {t("student.importExcel", { defaultValue: "Nhập Excel" })}
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleImportExcel}
                className="hidden"
              />
            </label>
          </PermissionGuard>
          <PermissionGuard requiredPermission="Student.Create">
            <button
              onClick={onAddClick}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-theme-xs transition-colors h-11"
            >
              <svg className="fill-current" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8.00016 3.33331V12.6666M3.3335 7.99998H12.6668" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t("student.addStudent", { defaultValue: "Thêm học sinh" })}
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* Tab Filter */}
      <div className="flex flex-wrap items-center gap-2 px-5 sm:px-6 pt-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
        <button
          onClick={() => { setActiveTab("all"); setCurrentPage(1); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === "all"
              ? "border-brand-500 text-brand-500 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {t("student.tabAll")} <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold">{countAll}</span>
        </button>
        <button
          onClick={() => { setActiveTab("active"); setCurrentPage(1); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === "active"
              ? "border-brand-500 text-brand-500 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {t("student.tabActive")} <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold">{countActive}</span>
        </button>
        <button
          onClick={() => { setActiveTab("suspended"); setCurrentPage(1); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === "suspended"
              ? "border-brand-500 text-brand-500 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {t("student.tabSuspended")} <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold">{countSuspended}</span>
        </button>
        <button
          onClick={() => { setActiveTab("graduated"); setCurrentPage(1); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === "graduated"
              ? "border-brand-500 text-brand-500 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {t("student.tabGraduated")} <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold">{countGraduated}</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="p-4 sm:p-5 border-b border-gray-150 dark:border-gray-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 w-full items-end">
          {/* Text Search */}
          <div className="relative md:col-span-4">
            <label className="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("student.searchLabel", { defaultValue: "Tìm kiếm" })}
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={t("student.searchPlaceholder", { defaultValue: "Tìm kiếm học sinh..." })}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-transparent border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400 h-11"
              />
              <span className="absolute left-3 top-3.5 text-gray-400">
                <Search className="w-4 h-4" />
              </span>
            </div>
          </div>

          {/* Gender Selector */}
          <div className="md:col-span-3">
            <label className="block mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("student.filterGender", { defaultValue: "Giới tính" })}
            </label>
            <select
              value={filterGender === null ? "" : String(filterGender)}
              onChange={(e) => {
                const val = e.target.value;
                setFilterGender(val === "" ? null : val === "true");
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-sm bg-transparent border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all h-11 cursor-pointer"
            >
              <option value="" className="dark:bg-gray-900">{t("student.filterAll", { defaultValue: "Tất cả giới tính" })}</option>
              <option value="true" className="dark:bg-gray-900">{t("student.formGenderMale", { defaultValue: "Nam" })}</option>
              <option value="false" className="dark:bg-gray-900">{t("student.formGenderFemale", { defaultValue: "Nữ" })}</option>
            </select>
          </div>

          {/* Spacer to push Clear Filters to the right */}
          <div className="hidden md:block md:col-span-3" />

          {/* Clear Filters Button */}
          <div className="flex items-center justify-end h-11 md:col-span-2">
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setFilterGrade(null);
                setFilterGender(null);
                setCurrentPage(1);
              }}
              className="inline-flex items-center justify-center px-4 h-11 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors cursor-pointer w-full md:w-auto shadow-theme-xs"
            >
              {t("student.clearFiltersBtn", { defaultValue: "Xóa bộ lọc" })}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-full overflow-visible custom-scrollbar">
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
            ) : items.length > 0 ? (
              items.map((item, index) => (
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
                        // eslint-disable-next-line @img/next/no-img-element
                        <img
                          src={item.avatar}
                          alt={item.name}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                          onError={(e) => {
                            e.currentTarget.src = "/images/user/user-01.png";
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center font-semibold text-xs shrink-0">
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div 
                        className="cursor-pointer group/name" 
                        onClick={() => openViewModal(item.id)}
                        title={t("student.viewTooltip", { defaultValue: "Xem chi tiết" })}
                      >
                        <p className="font-semibold text-gray-900 dark:text-white group-hover/name:text-brand-500 transition-colors">{item.name}</p>
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
                    {item.gradeLevel ? t("student.gradeText", { level: item.gradeLevel }) : <span className="text-gray-300 dark:text-gray-700">-</span>}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    {renderStatusBadge(item.status, getStatusLabel(item.status))}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    {item.hasAccount ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-500">
                        {t("parentStudent.accountLinked", { defaultValue: "Đã có tài khoản" })}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                        {t("parentStudent.accountNone", { defaultValue: "Chưa có" })}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        title={t("student.viewTooltip", { defaultValue: "Xem chi tiết" })}
                        onClick={() => openViewModal(item.id)}
                        className="p-1.5 text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <PermissionGuard requiredPermission="Student.Edit">
                        <button
                          type="button"
                          title={t("student.editTooltip", { defaultValue: "Chỉnh sửa" })}
                          onClick={() => onEditClick(item)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard requiredPermission="Student.Delete">

                        <button
                          type="button"
                          title={t("student.deleteTooltip", { defaultValue: "Xóa" })}
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
                  colSpan={9}
                  className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                >
                  {t("student.noResults", { defaultValue: "Không tìm thấy học sinh nào." })}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between px-6 py-5 bg-gray-50/50 dark:bg-white/[0.01] border-t border-gray-100 dark:border-gray-800/40">
        <div className="flex flex-wrap items-center gap-4 pb-3 xl:pb-0 justify-center xl:justify-start">
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <span>{t("student.show")}</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-8 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-2 text-sm text-gray-700 dark:text-gray-350 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer font-medium"
            >
              <option value="5" className="dark:bg-gray-900">5</option>
              <option value="10" className="dark:bg-gray-900">10</option>
              <option value="15" className="dark:bg-gray-900">15</option>
              <option value="20" className="dark:bg-gray-900">20</option>
            </select>
            <span>{t("student.entriesPerPage")}</span>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t("student.showing", {
              start: totalRecords === 0 ? 0 : startIndex + 1,
              end: endIndex,
              total: totalRecords,
            })}
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

      {/* ── View Detail Modal ── */}
      {isViewModalOpen && (
        <StudentViewModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewingStudentId(null);
          }}
          t={t}
          studentId={viewingStudentId}
        />
      )}

      {/* Batch Action Bar */}
      {selectedUnprovisionedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-4 px-6 py-3 bg-gray-900 text-white rounded-xl shadow-2xl border border-gray-800 animate-slideUp">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {t("student.selectedCount", { count: selectedIds.length, defaultValue: `Đã chọn ${selectedIds.length} học sinh` })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors"
            >
              {t("student.deselectBtn", { defaultValue: "Bỏ chọn" })}
            </button>
            <PermissionGuard requiredPermission="Student.Create">
              <button
                onClick={handleProvisionAccounts}
                disabled={isProvisioning}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 transition-colors"
              >
                {isProvisioning ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                    {t("student.provisioningBtn", { defaultValue: "Đang cấp..." })}
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                    </svg>
                    {t("student.btnProvision", { defaultValue: "Cấp tài khoản" })} ({selectedUnprovisionedIds.length})
                  </>
                )}
              </button>
            </PermissionGuard>
          </div>
        </div>
      )}

    </div>
  );
}

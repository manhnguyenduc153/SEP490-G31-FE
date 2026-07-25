"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PaginationWithIcon from "@/components/tables/DataTables/TableOne/PaginationWithIcon";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import { AngleDownIcon, AngleUpIcon } from "@/icons";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { teacherApi, TeacherItem, TeacherSaveDto } from "@/services/teacher.api";
import { useTranslation } from "react-i18next";
import { Edit, Plus, Trash2 } from "lucide-react";

type SortKey = "code" | "name" | "email" | "phone" | "status" | "hasAccount";
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
  const { t, i18n } = useTranslation();
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
  const [filterStatus, setFilterStatus] = useState<number | null>(null);
  const [filterGender, setFilterGender] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [deleteTarget, setDeleteTarget] = useState<TeacherItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      const res = await teacherApi.provisionAccounts(selectedUnprovisionedIds);
      if (res.success) {
        showToast(t("teacher.provisionSuccess", { count: selectedUnprovisionedIds.length, defaultValue: `Cấp tài khoản thành công cho ${selectedUnprovisionedIds.length} giáo viên!` }));
        setSelectedIds([]);
        setRefreshKey((key) => key + 1);
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("teacher.provisionError", { defaultValue: "Có lỗi xảy ra khi cấp tài khoản giáo viên." }), "error");
      }
    } catch {
      showToast(t("teacher.systemError"), "error");
    } finally {
      setIsProvisioning(false);
    }
  };

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
        const res = await teacherApi.getAll(
          currentPage,
          itemsPerPage,
          debouncedSearchTerm,
          filterStatus,
          filterGender
        );
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
  }, [currentPage, itemsPerPage, debouncedSearchTerm, filterStatus, filterGender, refreshKey, t]);

  const sortedData = useMemo(() => {
    return [...items].sort((a, b) => {
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

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        [t("teacher.excelCode")]: "GV001",
        [t("teacher.excelName")]: t("teacher.excelSampleName"),
        [t("teacher.excelEmail")]: "teacher@example.com",
        [t("teacher.excelPhone")]: "0987654321",
        [t("teacher.excelDob")]: "01/01/1990",
        [t("teacher.excelGender")]: t("teacher.genderMale"),
        [t("teacher.excelAddress")]: t("teacher.excelSampleAddress"),
        [t("teacher.excelStatus")]: 1,
        [t("teacher.excelDescription")]: t("teacher.excelSampleDescription")
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t("teacher.excelTemplateSheet"));
    XLSX.writeFile(wb, `${t("teacher.excelTemplateFile")}.xlsx`);
    showToast(t("teacher.templateDownloadSuccess"));
  };

  const handleExportExcel = async () => {
    try {
      const res = await teacherApi.getAll(1, 10000, searchTerm, filterStatus, filterGender);
      if (res.success && res.data) {
        const exportItems = res.data.items || [];
        
        const sheetData = exportItems.map((item, idx) => ({
          [t("teacher.excelNo")]: idx + 1,
          [t("teacher.excelCode")]: item.code,
          [t("teacher.excelName")]: item.name,
          [t("teacher.excelEmail")]: item.email || "",
          [t("teacher.excelPhone")]: item.phone || "",
          [t("teacher.excelDob")]: item.dob ? new Date(item.dob).toLocaleDateString(i18n.language === "en" ? "en-GB" : "vi-VN") : "",
          [t("teacher.excelGender")]: item.gender === true ? t("teacher.genderMale") : item.gender === false ? t("teacher.genderFemale") : "",
          [t("teacher.excelAddress")]: item.address || "",
          [t("teacher.excelStatus")]: item.status === 1 ? t("teacher.statusActive") : t("teacher.statusInactive"),
          [t("teacher.excelDescription")]: item.description || ""
        }));

        const ws = XLSX.utils.json_to_sheet(sheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, t("teacher.excelExportSheet"));
        XLSX.writeFile(wb, `${t("teacher.excelExportFile")}.xlsx`);
        showToast(t("teacher.exportSuccess"));
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("teacher.exportError"), "error");
      }
    } catch (err) {
      console.error("Export Excel error", err);
      showToast(t("teacher.exportSystemError"), "error");
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
          showToast(t("teacher.importEmptyError"), "error");
          return;
        }

        const dtos: TeacherSaveDto[] = [];
        for (const row of rows as any[]) {
          const name = row[t("teacher.excelName")] || row["Họ Tên"] || row["Name"] || row["name"];
          const email = row[t("teacher.excelEmail")] || row["Email"] || row["email"];
          const phone = row[t("teacher.excelPhone")] || row["Số điện thoại"] || row["SĐT"] || row["Phone"] || row["phone"];
          const code = row[t("teacher.excelCode")] || row["Mã GV"] || row["Mã giáo viên"] || row["Code"] || row["code"];
          const dobStr = row[t("teacher.excelDob")] || row["Ngày sinh"] || row["Dob"] || row["dob"];
          const genderStr = row[t("teacher.excelGender")] || row["Giới tính"] || row["Gender"] || row["gender"];
          const address = row[t("teacher.excelAddress")] || row["Địa chỉ"] || row["Address"] || row["address"];
          const statusStr = row[t("teacher.excelStatus")] || row["Trạng thái"] || row["Status"] || row["status"];
          const description = row[t("teacher.excelDescription")] || row["Mô tả"] || row["Note"] || row["description"];

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
            if (normalizedGender === "nam" || normalizedGender === "male" || normalizedGender === t("teacher.genderMale").toLowerCase() || normalizedGender === "true" || normalizedGender === "1") {
              gender = true;
            } else if (normalizedGender === "nữ" || normalizedGender === "female" || normalizedGender === t("teacher.genderFemale").toLowerCase() || normalizedGender === "false" || normalizedGender === "0") {
              gender = false;
            }
          }

          const normalizedStatus = statusStr ? String(statusStr).toLowerCase().trim() : "";
          const status = ["0", "false", "inactive", "ngưng hoạt động", t("teacher.statusInactive").toLowerCase()].includes(normalizedStatus) ? 0 : 1;
          
          dtos.push({
            code: code ? String(code).trim() : "",
            name: String(name).trim(),
            email: String(email).trim(),
            phone: phone ? String(phone).trim() : null,
            dob,
            gender,
            address: address ? String(address).trim() : null,
            description: description ? String(description).trim() : null,
            status
          });
        }

        if (dtos.length === 0) {
          showToast(t("teacher.importInvalidRowsError"), "error");
          return;
        }

        const res = await teacherApi.import(dtos);
        if (res.success) {
          showToast(t("teacher.importSuccess", { count: res.data?.length || dtos.length }));
          setRefreshKey((key) => key + 1);
        } else {
          showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("teacher.importError"), "error");
        }
      } catch (err: any) {
        console.error("Import Excel error", err);
        showToast(t("teacher.importReadError", { message: err.message }), "error");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + items.length, totalRecords);
  const columns: { key: SortKey; label: string }[] = [
    { key: "code", label: t("teacher.colCode") },
    { key: "name", label: t("teacher.colName") },
    { key: "email", label: t("teacher.colEmail") },
    { key: "phone", label: t("teacher.colPhone") },
    { key: "status", label: t("teacher.colStatus") },
    { key: "hasAccount", label: t("teacher.colAccount", { defaultValue: "Tài khoản" }) },
  ];

  return (
    <div className="overflow-hidden bg-white dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/[0.05]">
      <div className="space-y-5 border-b border-gray-100 px-6 py-5 dark:border-white/[0.05]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{t("teacher.title")}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("teacher.description")}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
          <button
            onClick={handleExportExcel}
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {t("teacher.exportExcel", { defaultValue: "Xuất Excel" })}
          </button>
          
          <PermissionGuard requiredPermission="Teacher.Create">
            <button
              onClick={handleDownloadTemplate}
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              {t("teacher.downloadTemplate", { defaultValue: "Tải file mẫu" })}
            </button>
          </PermissionGuard>
          
          <PermissionGuard requiredPermission="Teacher.Create">
            <label
              className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
              {t("teacher.importExcel", { defaultValue: "Nhập Excel" })}
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleImportExcel}
                className="hidden"
              />
            </label>
          </PermissionGuard>

          {selectedUnprovisionedIds.length > 0 && (
            <PermissionGuard requiredPermission="Teacher.Create">
              <button
                onClick={handleProvisionAccounts}
                disabled={isProvisioning}
                className="flex items-center justify-center gap-2 px-4 py-2.5 h-11 text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 transition-colors shadow-theme-xs rounded-lg disabled:opacity-50"
              >
                {isProvisioning ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                  </svg>
                )}
                {t("teacher.btnProvision", { defaultValue: "Cấp tài khoản" })} ({selectedUnprovisionedIds.length})
              </button>
            </PermissionGuard>
          )}
          <PermissionGuard requiredPermission="Teacher.Create">
            <button
              onClick={onAddClick}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-brand-600"
            >
              <Plus className="h-5 w-5" />
              {t("teacher.addTeacher")}
            </button>
          </PermissionGuard>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(180px,220px)_minmax(140px,180px)_minmax(300px,1fr)]">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t("teacher.filterStatus", { defaultValue: "Trạng thái" })}</span>
            <SearchableSelect
              value={filterStatus === null ? "" : filterStatus}
              options={[{ value: "", label: t("teacher.filterAll") }, { value: 1, label: t("teacher.statusActive") }, { value: 0, label: t("teacher.statusInactive") }, { value: 2, label: t("teacher.statusOnLeave") }]}
              onChange={(value) => { setFilterStatus(value === "" ? null : Number(value)); setCurrentPage(1); }}
              placeholder={t("teacher.filterAll")}
              searchPlaceholder={t("common.searchPlaceholder", { defaultValue: "Tìm kiếm..." })}
              noResultsText={t("common.noResults", { defaultValue: "Không tìm thấy kết quả" })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t("teacher.formGenderLabel")}</span>
            <SearchableSelect
              value={filterGender === null ? "" : String(filterGender)}
              options={[{ value: "", label: t("teacher.filterAll") }, { value: "true", label: t("teacher.genderMale") }, { value: "false", label: t("teacher.genderFemale") }]}
              onChange={(value) => { setFilterGender(value === "" ? null : value === "true"); setCurrentPage(1); }}
              placeholder={t("teacher.filterAll")}
              searchPlaceholder={t("common.searchPlaceholder", { defaultValue: "Tìm kiếm..." })}
              noResultsText={t("common.noResults", { defaultValue: "Không tìm thấy kết quả" })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t("teacher.searchLabel", { defaultValue: "Tìm kiếm" })}</span>
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
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-11 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
            </div>
          </div>
          </div>

          <div className="hidden">
          <button
            onClick={handleExportExcel}
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {t("teacher.exportExcel", { defaultValue: "Xuất Excel" })}
          </button>
          
          <PermissionGuard requiredPermission="Teacher.Create">
            <button
              onClick={handleDownloadTemplate}
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              {t("teacher.downloadTemplate", { defaultValue: "Tải file mẫu" })}
            </button>
          </PermissionGuard>
          
          <PermissionGuard requiredPermission="Teacher.Create">
            <label
              className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
              {t("teacher.importExcel", { defaultValue: "Nhập Excel" })}
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleImportExcel}
                className="hidden"
              />
            </label>
          </PermissionGuard>

          <PermissionGuard requiredPermission="Teacher.Create">
            <button
              onClick={onAddClick}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-brand-600"
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
                <input
                  type="checkbox"
                  className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500 cursor-pointer"
                  checked={items.length > 0 && selectedIds.length === items.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
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
                <TableCell colSpan={9} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                  {t("common.loading", { defaultValue: "Đang tải..." })}
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={9} className="px-6 py-10 text-center text-error-500 dark:text-error-400 font-medium">
                  {error}
                </TableCell>
              </TableRow>
            ) : sortedData.length > 0 ? (
              sortedData.map((item, index) => (
                <TableRow key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                  <TableCell className="px-6 py-4 border-r border-gray-100 dark:border-white/[0.05] text-center w-12">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500 cursor-pointer"
                      checked={selectedIds.includes(item.id)}
                      onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                    />
                  </TableCell>
                  <TableCell className="px-6 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap w-12 text-center">
                    {startIndex + index + 1}
                  </TableCell>
                  <TableCell className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{item.code}</TableCell>
                  <TableCell className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{item.name}</TableCell>
                  <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">{item.email || "-"}</TableCell>
                  <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">{item.phone || "-"}</TableCell>
                  <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === 1 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"}`}>
                      {item.status === 1 ? t("teacher.statusActive") : t("teacher.statusInactive")}
                    </span>
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
                      <PermissionGuard requiredPermission="Teacher.Edit">
                        <button
                          title={t("teacher.editTooltip")}
                          onClick={() => onEditClick(item)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard requiredPermission="Teacher.Delete">
                        <button
                          title={t("teacher.deleteTooltip")}
                          onClick={() => {
                            setDeleteTarget(item);
                            setIsDeleteModalOpen(true);
                          }}
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
                <TableCell colSpan={8} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                  {t("teacher.noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-4 px-6 py-5 bg-gray-50/50 dark:bg-white/[0.01] border-t border-gray-100 dark:border-white/[0.05] xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t("teacher.show")}</span>
            <select className="h-10 rounded-lg border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
              {[5, 10, 15, 20].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <span className="text-sm text-gray-500 dark:text-gray-400">{t("teacher.entries")}</span>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("teacher.showing", { start: totalRecords === 0 ? 0 : startIndex + 1, end: endIndex, total: totalRecords })}</p>
        </div>
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

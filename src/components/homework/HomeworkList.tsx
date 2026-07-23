"use client";

import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Eye, Trash2 } from "lucide-react";
import { homeworkApi, HomeworkDto, HomeworkSubmissionDto } from "@/services/homework.api";
import { useTranslation } from "react-i18next";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import PaginationWithIcon from "@/components/tables/DataTables/TableOne/PaginationWithIcon";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";

interface HomeworkListProps {
  classId: number;
  showToast: (msg: string, type?: "success" | "error") => void;
  onEditClick: (item: HomeworkDto) => void;
  onViewClick: (item: HomeworkDto) => void;
  refreshKey: number;
  userRole: string;
}

export default function HomeworkList({
  classId,
  showToast,
  onEditClick,
  onViewClick,
  refreshKey,
  userRole,
}: HomeworkListProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<HomeworkDto[]>([]);
  const [studentSubmissions, setStudentSubmissions] = useState<Record<number, HomeworkSubmissionDto | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [deleteTarget, setDeleteTarget] = useState<HomeworkDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const pageItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [classId, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await homeworkApi.deleteHomework(deleteTarget.id);
      if (res.success) {
        setItems((current) => current.filter((item) => item.id !== deleteTarget.id));
        showToast(t("homework.deleteSuccess"));
        setDeleteTarget(null);
      } else showToast(t("backendMessages." + res.message, { defaultValue: res.message || t("homework.deleteError") }), "error");
    } catch {
      showToast(t("homework.deleteError"), "error");
    } finally { setIsDeleting(false); }
  };

  useEffect(() => {
    let mounted = true;
    async function fetchHomeworks() {
      setIsLoading(true);
      try {
        const res = await homeworkApi.getHomeworkByClass(classId);
        if (mounted && res.success) {
          setItems(res.data);

          if (userRole === "Student") {
            const submissionEntries = await Promise.all(
              res.data.map(async (homework) => {
                try {
                  const submissionRes = await homeworkApi.getMySubmission(homework.id);
                  return [homework.id, submissionRes.success ? submissionRes.data ?? null : null] as const;
                } catch (error) {
                  console.error("Error loading homework submission status", error);
                  return [homework.id, null] as const;
                }
              })
            );

            if (mounted) {
              setStudentSubmissions(Object.fromEntries(submissionEntries));
            }
          } else {
            setStudentSubmissions({});
          }
        }
      } catch (err) {
        console.error(err);
        if (mounted) showToast(t("homework.loadListError"), "error");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    fetchHomeworks();
    return () => { mounted = false; };
  }, [classId, refreshKey, showToast, userRole, t]);

  const getStudentGradingStatus = (homeworkId: number) => {
    const submission = studentSubmissions[homeworkId];
    const isGraded = submission?.status === 2 || (submission?.score !== null && submission?.score !== undefined);

    return {
      label: isGraded ? t("homework.submissionGraded") : t("homework.submissionUngraded"),
      className: isGraded ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-700",
    };
  };

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50/70 dark:bg-gray-800/40">
            <TableRow>
              <TableCell className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">{t("homework.colTitle")}</TableCell>
              <TableCell className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">{t("homework.colSkill")}</TableCell>
              <TableCell className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">{t("homework.colDueDate")}</TableCell>
              <TableCell className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">{t("homework.colStatus")}</TableCell>
              <TableCell className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">{t("homework.colActions")}</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-sm text-gray-500">{t("common.loading", { defaultValue: "Đang tải..." })}</TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-sm text-gray-500">{t("homework.noHomework")}</TableCell>
              </TableRow>
            ) : (
              pageItems.map((item) => (
                <TableRow key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                  <TableCell className="px-5 py-4 font-medium text-gray-900 dark:text-white">
                    {item.title}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {item.skill || "-"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {item.dueDate ? new Date(item.dueDate).toLocaleDateString("vi-VN") : t("homework.noDueDate")}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      userRole === "Student"
                        ? getStudentGradingStatus(item.id).className
                        : item.status === 1
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-600"}
                    `}>
                      {userRole === "Student"
                        ? getStudentGradingStatus(item.id).label
                        : item.status === 1
                          ? t("homework.statusActive")
                          : t("homework.statusInactive")}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => onViewClick(item)} className="p-1 text-gray-400 hover:text-brand-500">
                        <Eye className="w-4 h-4" />
                      </button>
                      <PermissionGuard requiredPermission="Homework.Edit">
                        <button title={t("common.edit", { defaultValue: "Sửa" })} onClick={() => onEditClick(item)} className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard requiredPermission="Homework.Delete">
                        <button title={t("common.delete", { defaultValue: "Xóa" })} onClick={() => setDeleteTarget(item)} className="p-1.5 text-error-600 hover:text-error-800 dark:text-error-400 dark:hover:text-error-300 hover:bg-error-50 dark:hover:bg-error-950/30 rounded-md transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-4 border-t border-gray-100 bg-gray-50/50 px-6 py-5 dark:border-white/[0.05] dark:bg-white/[0.01] xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span>{t("common.show")}</span>
          <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="h-10 rounded-lg border border-gray-300 bg-white px-3 pr-8 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
            {[5, 10, 15, 20].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <span>{t("common.entries")}</span>
          <span>{t("homework.showing", { start: items.length ? (currentPage - 1) * itemsPerPage + 1 : 0, end: Math.min(currentPage * itemsPerPage, items.length), total: items.length, defaultValue: "{{start}}-{{end}} / {{total}}" })}</span>
        </div>
        {totalPages > 1 && <PaginationWithIcon totalPages={totalPages} initialPage={currentPage} onPageChange={setCurrentPage} />}
      </div>
      <DeleteConfirmModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} isDeleting={isDeleting} itemName={deleteTarget?.title} />
    </div>
  );
}

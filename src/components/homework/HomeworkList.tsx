"use client";

import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Pencil, Plus } from "lucide-react";
import { homeworkApi, HomeworkDto, HomeworkSubmissionDto } from "@/services/homework.api";
import { useTranslation } from "react-i18next";
import { PermissionGuard } from "@/components/auth/PermissionGuard";

interface HomeworkListProps {
  classId: number;
  showToast: (msg: string, type?: "success" | "error") => void;
  onAddClick: () => void;
  onEditClick: (item: HomeworkDto) => void;
  onViewClick: (item: HomeworkDto) => void;
  refreshKey: number;
  userRole: string;
}

export default function HomeworkList({
  classId,
  showToast,
  onAddClick,
  onEditClick,
  onViewClick,
  refreshKey,
  userRole,
}: HomeworkListProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<HomeworkDto[]>([]);
  const [studentSubmissions, setStudentSubmissions] = useState<Record<number, HomeworkSubmissionDto | null>>({});
  const [isLoading, setIsLoading] = useState(true);

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
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {t("homework.listTitle")}
        </h2>
        <PermissionGuard requiredPermission="Homework.Create">
          <button
            onClick={onAddClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> {t("homework.addHomework")}
          </button>
        </PermissionGuard>
      </div>

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
              items.map((item) => (
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
                        <button onClick={() => onEditClick(item)} className="p-1 text-gray-400 hover:text-amber-500">
                          <Pencil className="w-4 h-4" />
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
    </div>
  );
}

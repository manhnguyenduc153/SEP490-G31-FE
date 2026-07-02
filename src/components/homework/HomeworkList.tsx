"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Pencil, Plus } from "lucide-react";
import { homeworkApi, HomeworkDto } from "@/services/homework.api";

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
  userRole
}: HomeworkListProps) {
  const [items, setItems] = useState<HomeworkDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchHomeworks() {
      setIsLoading(true);
      try {
        const res = await homeworkApi.getHomeworkByClass(classId);
        if (mounted && res.success) {
          setItems(res.data);
        }
      } catch (err) {
        console.error(err);
        if (mounted) showToast("Lỗi khi tải danh sách bài tập", "error");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    fetchHomeworks();
    return () => { mounted = false; };
  }, [classId, refreshKey, showToast]);

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xs overflow-hidden">
      <div className="flex justify-end p-4">
        {(userRole === "Teacher" || userRole === "Admin") && (
          <button
            onClick={onAddClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Thêm Bài Tập
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50/70 dark:bg-gray-800/40">
            <TableRow>
              <TableCell className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Tiêu đề</TableCell>
              <TableCell className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Kỹ năng</TableCell>
              <TableCell className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Hạn nộp</TableCell>
              <TableCell className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Trạng thái</TableCell>
              <TableCell className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Thao tác</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-sm text-gray-500">Đang tải...</TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-sm text-gray-500">Không có bài tập nào</TableCell>
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
                    {item.dueDate ? new Date(item.dueDate).toLocaleDateString("vi-VN") : "Không có"}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.status === 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-800'}`}>
                      {item.status === 1 ? "Hiển thị" : "Bản nháp"}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => onViewClick(item)} className="p-1 text-gray-400 hover:text-brand-500">
                        <Eye className="w-4 h-4" />
                      </button>
                      {(userRole === "Teacher" || userRole === "Admin") && (
                        <button onClick={() => onEditClick(item)} className="p-1 text-gray-400 hover:text-amber-500">
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
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

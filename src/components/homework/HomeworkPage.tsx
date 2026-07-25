"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle, Plus, XCircle } from "lucide-react";
import { ClassItem } from "@/services/class.api";
import { commonApi } from "@/services/common.api";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import HomeworkList from "./HomeworkList";
import HomeworkForm from "./HomeworkForm";
import HomeworkSubmissions from "./HomeworkSubmissions";
import StudentSubmitForm from "./StudentSubmitForm";
import { homeworkApi, HomeworkDto } from "@/services/homework.api";
import { useTranslation } from "react-i18next";

export default function HomeworkPage({ studentMode = false }: { studentMode?: boolean }) {
  const { t } = useTranslation();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<"list" | "form" | "view">("list");
  const [editingItem, setEditingItem] = useState<HomeworkDto | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
  }, []);

  const handleClassChange = (classId: number) => {
    if (!classId) return;
    setSelectedClassId(classId);
    setEditingItem(null);
    setActiveView("list");
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await commonApi.getAccessibleClasses(1, 500);
        if (res.success && res.data) {
          setClasses(res.data.items);
          
          // Check query parameters
          const queryParams = new URLSearchParams(window.location.search);
          const urlClassId = queryParams.get("classId");
          const urlHomeworkId = queryParams.get("homeworkId");

          if (urlClassId) {
            const classIdNum = Number(urlClassId);
            setSelectedClassId(classIdNum);
            
            if (urlHomeworkId && studentMode) {
              const homeworkIdNum = Number(urlHomeworkId);
              try {
                const hwRes = await homeworkApi.getStudentHomeworkByClass(classIdNum);
                if (hwRes.success && hwRes.data) {
                  const targetHw = hwRes.data.find(h => h.id == homeworkIdNum);
                  if (targetHw) {
                    setEditingItem(targetHw);
                    setActiveView("view");
                  }
                }
              } catch (e) {
                console.error("Failed to load target homework from URL", e);
              }
            }
          } else if (res.data.items.length > 0) {
            setSelectedClassId(studentMode ? res.data.items[0].id : 0);
          }
        }
      } catch (err) {
        console.error(err);
        showToast(t("homework.loadClassError"), "error");
      }
    };

    fetchClasses();
  }, [showToast, studentMode, t]);

  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <div>
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[99999] flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl shadow-2xl border border-white/10 dark:border-black/5 animate-bounce">
          {toastType === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
          )}
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      <div className="mb-6 overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-6 py-5 dark:border-white/[0.05] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">{studentMode ? t("homework.myHomework", { defaultValue: "Bài tập của tôi" }) : t("homework.title", { defaultValue: "Bài tập" })}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{studentMode ? t("homework.studentDescription", { defaultValue: "Xem và nộp bài tập của các lớp đang học." }) : t("homework.description", { defaultValue: "Quản lý toàn bộ bài tập." })}</p>
          </div>
          {!studentMode && <PermissionGuard requiredPermission="HomeworkManagement.Create">
            <button onClick={() => { setEditingItem(null); setActiveView("form"); }} disabled={!selectedClassId || selectedClassId === 0} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50">
              <Plus className="h-5 w-5" /> {t("homework.addHomework")}
            </button>
          </PermissionGuard>}
        </div>
        <div className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-xl">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("homework.selectClassLabel")}
            </label>
            <SearchableSelect
              value={selectedClassId ?? ""}
              onChange={(value) => handleClassChange(Number(value))}
              disabled={classes.length === 0}
              options={[...(!studentMode ? [{ value: 0, label: t("homework.allClasses", { defaultValue: "Tất cả lớp" }) }] : []), ...classes.map((cls) => ({ value: cls.id, label: `${cls.name} (${cls.code})${cls.teacherName ? ` - ${cls.teacherName}` : ""}` }))]}
              placeholder={classes.length === 0 ? t("homework.noClasses") : t("homework.selectClassLabel")}
              searchPlaceholder={t("common.searchPlaceholder", { defaultValue: "Tìm kiếm..." })}
              noResultsText={t("common.noResults", { defaultValue: "Không tìm thấy kết quả" })}
            />
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {t("homework.classCount", { count: classes.length })}
          </div>
        </div>
        </div>
      </div>

      {selectedClassId !== null && activeView === "list" && (
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <HomeworkList
            classId={selectedClassId}
            allClassIds={classes.map(c => c.id)}
            showToast={showToast}
            refreshKey={refreshKey}
            onEditClick={(item) => {
              setEditingItem(item);
              setActiveView("form");
            }}
            onViewClick={(item) => {
              setEditingItem(item);
              setActiveView("view");
            }}
            userRole={studentMode ? "Student" : "Management"}
          />
        </div>
      )}

      {!studentMode && activeView === "form" && selectedClassId !== 0 && (
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <HomeworkForm
            classId={selectedClassId!}
            classTeacherId={selectedClass?.teacherId || 0}
            editingItem={editingItem}
            showToast={showToast}
            onCancel={() => {
              setEditingItem(null);
              setActiveView("list");
            }}
            onSuccess={() => {
              setEditingItem(null);
              setActiveView("list");
              setRefreshKey(prev => prev + 1);
            }}
          />
        </div>
      )}

      {activeView === "view" && editingItem && (
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          {studentMode ? (
            <StudentSubmitForm
              homework={editingItem}
              onBack={() => {
                setEditingItem(null);
                setActiveView("list");
                setRefreshKey(prev => prev + 1);
              }}
              showToast={showToast}
            />
          ) : (
            <HomeworkSubmissions
              homework={editingItem}
              onBack={() => {
                setEditingItem(null);
                setActiveView("list");
              }}
              showToast={showToast}
            />
          )}
        </div>
      )}
    </div>
  );
}

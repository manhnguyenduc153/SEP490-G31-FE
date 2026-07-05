"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { classApi, ClassItem } from "@/services/class.api";
import HomeworkList from "./HomeworkList";
import HomeworkForm from "./HomeworkForm";
import HomeworkSubmissions from "./HomeworkSubmissions";
import StudentSubmitForm from "./StudentSubmitForm";
import { HomeworkDto } from "@/services/homework.api";
import { useTranslation } from "react-i18next";

export default function HomeworkPage() {
  const { t } = useTranslation();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  const [activeView, setActiveView] = useState<"list" | "form" | "view">("list");
  const [editingItem, setEditingItem] = useState<HomeworkDto | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    setUserRole(localStorage.getItem("role") || "");
  }, []);

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
        const role = localStorage.getItem("role");

        if (role === "Student") {
          const scheduleRes = await classApi.getStudentSchedules();
          if (scheduleRes.success && scheduleRes.data) {
            const uniqueClasses = new Map<number, ClassItem>();
            scheduleRes.data.forEach(s => {
              if (s.classId) {
                uniqueClasses.set(s.classId, { id: s.classId, name: s.className || "", code: s.classCode || "" } as ClassItem);
              }
            });
            const classList = Array.from(uniqueClasses.values());
            setClasses(classList);
            if (classList.length > 0) setSelectedClassId(classList[0].id);
          }
          return;
        }

        if (role === "Teacher") {
          const scheduleRes = await classApi.getTeacherSchedules();
          if (scheduleRes.success && scheduleRes.data) {
            const uniqueClasses = new Map<number, ClassItem>();
            scheduleRes.data.forEach(s => {
              if (s.classId) {
                uniqueClasses.set(s.classId, { id: s.classId, name: s.className || "", code: s.classCode || "", teacherId: s.teacherId } as ClassItem);
              }
            });
            const classList = Array.from(uniqueClasses.values());
            setClasses(classList);
            if (classList.length > 0) setSelectedClassId(classList[0].id);
          }
          return;
        }

        const res = await classApi.getAll(1, 100);
        if (res.success && res.data) {
          setClasses(res.data.items);
          if (res.data.items.length > 0) {
            setSelectedClassId(res.data.items[0].id);
          }
        }
      } catch (err) {
        console.error(err);
        showToast(t("homework.loadClassError", { defaultValue: "Lỗi khi tải danh sách lớp" }), "error");
      }
    };

    fetchClasses();
  }, [showToast, t]);

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

      <div className="mb-6">
        {userRole === "Teacher" ? (
          <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:max-w-md">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("homework.selectClassLabel", { defaultValue: "Chọn lớp học" })}
              </label>
              <select
                value={selectedClassId ?? ""}
                onChange={(e) => handleClassChange(Number(e.target.value))}
                disabled={classes.length === 0}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:disabled:bg-gray-900"
              >
                {classes.length === 0 ? (
                  <option value="">{t("homework.noClasses", { defaultValue: "Không có lớp học nào" })}</option>
                ) : (
                  classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.code})
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t("homework.classCount", { count: classes.length, defaultValue: "{{count}} lớp" })}
            </div>
          </div>
        ) : (
          <>
            <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("homework.selectClassLabel", { defaultValue: "Chọn lớp học" })}
            </label>
            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
              {classes.length === 0 ? (
                <div className="text-sm text-gray-500 italic">{t("homework.noClasses", { defaultValue: "Không có lớp học nào" })}</div>
              ) : (
                classes.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => handleClassChange(cls.id)}
                    className={`px-5 py-2.5 text-sm font-medium rounded-xl whitespace-nowrap transition-all duration-200 ${
                      selectedClassId === cls.id
                        ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                        : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-brand-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:border-brand-500"
                    }`}
                  >
                    {cls.name} <span className="opacity-70 text-xs ml-1">({cls.code})</span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {selectedClassId && activeView === "list" && (
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <h2 className="text-xl font-bold mb-4">{t("homework.listTitle", { defaultValue: "Danh sách bài tập" })}</h2>
          <HomeworkList
            classId={selectedClassId}
            showToast={showToast}
            refreshKey={refreshKey}
            onAddClick={() => {
              setEditingItem(null);
              setActiveView("form");
            }}
            onEditClick={(item) => {
              setEditingItem(item);
              setActiveView("form");
            }}
            onViewClick={(item) => {
              setEditingItem(item);
              setActiveView("view");
            }}
            userRole={userRole}
          />
        </div>
      )}

      {activeView === "form" && (
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <HomeworkForm
            classId={selectedClassId!}
            classTeacherId={classes.find(c => c.id === selectedClassId)?.teacherId || 0}
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
          {userRole === "Student" ? (
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

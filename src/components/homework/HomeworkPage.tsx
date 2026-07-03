"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { classApi, ClassItem } from "@/services/class.api";
import HomeworkList from "./HomeworkList";
import HomeworkForm from "./HomeworkForm";
import HomeworkSubmissions from "./HomeworkSubmissions";
import StudentSubmitForm from "./StudentSubmitForm";
import { HomeworkDto } from "@/services/homework.api";

export default function HomeworkPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  
  // States for sub-components
  const [activeView, setActiveView] = useState<"list" | "form" | "view">("list");
  const [editingItem, setEditingItem] = useState<HomeworkDto | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // ── Toast ──
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

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
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
        } else if (role === "Teacher") {
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

        // Admin / default fallback
        const res = await classApi.getAll(1, 100);
        if (res.success && res.data) {
          setClasses(res.data.items);
          if (res.data.items.length > 0) {
            setSelectedClassId(res.data.items[0].id);
          }
        }
      } catch (err) {
        console.error(err);
        showToast("Lỗi khi tải danh sách lớp", "error");
      }
    };
    fetchClasses();
  }, []);

  return (
    <div>
      {/* Toast */}
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
        <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Chọn lớp học của bạn:
        </label>
        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
          {classes.length === 0 ? (
            <div className="text-sm text-gray-500 italic">Không có lớp học nào.</div>
          ) : (
            classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClassId(cls.id)}
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
      </div>

      {selectedClassId && activeView === "list" && (
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Danh sách bài tập</h2>
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

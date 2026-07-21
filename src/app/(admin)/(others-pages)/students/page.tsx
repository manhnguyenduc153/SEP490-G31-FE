"use client";

import React, { useState } from "react";
import StudentTable from "@/components/student/StudentTable";
import StudentForm from "@/components/student/StudentForm";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useTranslation } from "react-i18next";
import { StudentItem } from "@/services/student.api";
import { CheckCircle, XCircle } from "lucide-react";

export default function StudentsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"list" | "form">("list");
  const [editingItem, setEditingItem] = useState<StudentItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Toast ──
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  React.useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
  };

  const handleSuccess = (msg: string) => {
    setActiveTab("list");
    setEditingItem(null);
    setRefreshKey((prev) => prev + 1);
    showToast(msg, "success");
  };

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


      <div className="space-y-6">
        {activeTab === "list" ? (
          <StudentTable
            refreshKey={refreshKey}
            showToast={showToast}
            onAddClick={() => {
              setEditingItem(null);
              setActiveTab("form");
            }}
            onEditClick={(item) => {
              setEditingItem(item);
              setActiveTab("form");
            }}
          />
        ) : (
          <StudentForm
            t={t}
            editingItem={editingItem}
            showToast={showToast}
            onCancel={() => {
              setEditingItem(null);
              setActiveTab("list");
            }}
            onSuccess={handleSuccess}
          />
        )}
      </div>
    </div>
  );
}

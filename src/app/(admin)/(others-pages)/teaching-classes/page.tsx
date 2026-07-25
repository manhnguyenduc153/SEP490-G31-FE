"use client";

import React, { useState } from "react";
import TeacherClassTable from "@/components/class/TeacherClassTable";
import ClassDetail from "@/components/class/ClassDetail";
import { useTranslation } from "react-i18next";
import { ClassItem } from "@/services/class.api";
import { CheckCircle, XCircle } from "lucide-react";
import { PermissionGuard } from "@/components/auth/PermissionGuard";

export default function TeachingClassesPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"list" | "detail">("list");
  const [viewingItemId, setViewingItemId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Toast ──
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  React.useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const showToast = React.useCallback((msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
  }, []);

  return (
    <PermissionGuard requiredPermission="Class.TeacherView" fallback={<div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 text-center text-sm text-rose-500 font-medium">Bạn không có quyền truy cập chức năng này.</div>}>
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
            <TeacherClassTable
              refreshKey={refreshKey}
              showToast={showToast}
              onViewClick={(item) => {
                setViewingItemId(item.id);
                setActiveTab("detail");
              }}
            />
          ) : (
            <ClassDetail
              t={t}
              itemId={viewingItemId!}
              onBack={() => {
                setViewingItemId(null);
                setActiveTab("list");
              }}
              showToast={showToast}
            />
          )}
        </div>
      </div>
    </PermissionGuard>
  );
}

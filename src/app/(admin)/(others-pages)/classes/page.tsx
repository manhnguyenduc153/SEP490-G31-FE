"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import ClassTable from "@/components/class/ClassTable";
import ClassForm from "@/components/class/ClassForm";
import ClassDetail from "@/components/class/ClassDetail";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useTranslation } from "react-i18next";
import { ClassItem } from "@/services/class.api";
import { CheckCircle, XCircle } from "lucide-react";

export default function ClassPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"list" | "form" | "detail">("list");
  const [editingItem, setEditingItem] = useState<ClassItem | null>(null);
  const [viewingItemId, setViewingItemId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Toast ──
  const [toasts, setToasts] = useState<{ id: number; message: string; type: "success" | "error" }[]>([]);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = React.useCallback((msg: string, type: "success" | "error" = "success") => {
    if (!msg) return;
    const messages = msg
      .split(/\r?\n/)
      .map((m) => m.trim())
      .filter(Boolean);

    messages.forEach((message, index) => {
      const id = Date.now() + index;
      setToasts((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    });
  }, []);

  const handleSuccess = (msg: string) => {
    setActiveTab("list");
    setEditingItem(null);
    setRefreshKey((prev) => prev + 1);
    showToast(msg, "success");
  };

  return (
    <div>
      {/* Toast Container */}
      {mounted && typeof document !== "undefined" && createPortal(
        <div className="fixed bottom-5 right-5 z-[999999] flex flex-col gap-2 max-w-md w-full sm:w-auto">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl shadow-2xl border border-white/10 dark:border-black/5"
            >
              {toast.type === "success" ? (
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
              )}
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
          ))}
        </div>,
        document.body
      )}

      <div className="space-y-6">
        {activeTab === "list" ? (
          <ClassTable
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
            onViewClick={(item) => {
              setViewingItemId(item.id);
              setActiveTab("detail");
            }}
          />
        ) : activeTab === "form" ? (
          <ClassForm
            t={t}
            editingItem={editingItem}
            showToast={showToast}
            onCancel={() => {
              setEditingItem(null);
              setActiveTab("list");
            }}
            onSuccess={handleSuccess}
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
  );
}

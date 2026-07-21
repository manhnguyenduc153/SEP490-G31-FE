"use client";

import React, { useState } from "react";
import TeacherTable from "@/components/teacher/TeacherTable";
import { TeacherForm } from "@/components/teacher/TeacherForm";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { teacherApi, TeacherItem, TeacherSaveDto } from "@/services/teacher.api";
import { CheckCircle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function TeacherPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"list" | "form">("list");
  const [editingItem, setEditingItem] = useState<TeacherItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  const openCreateForm = () => {
    setEditingItem(null);
    setFormError(null);
    setActiveTab("form");
  };

  const openEditForm = (item: TeacherItem) => {
    setEditingItem(item);
    setFormError(null);
    setActiveTab("form");
  };

  const closeForm = () => {
    setEditingItem(null);
    setFormError(null);
    setActiveTab("list");
  };

  const handleSubmit = async (formData: TeacherSaveDto) => {
    if (!formData.code.trim()) {
      setFormError(t("backendMessages.ERR_CODE_EMPTY", { defaultValue: "Ma khong duoc de trong" }));
      return;
    }

    if (!formData.name.trim()) {
      setFormError(t("backendMessages.ERR_NAME_EMPTY", { defaultValue: "Ten khong duoc de trong" }));
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingItem) {
        const res = await teacherApi.update(editingItem.id, formData);
        if (res.success && res.data) {
          showToast(t("teacher.updateSuccess", { name: res.data.name }));
          closeForm();
          setRefreshKey((key) => key + 1);
        } else {
          setFormError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("teacher.updateError"));
        }
      } else {
        const res = await teacherApi.create(formData);
        if (res.success && res.data) {
          showToast(t("teacher.createSuccess", { name: res.data.name }));
          closeForm();
          setRefreshKey((key) => key + 1);
        } else {
          setFormError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("teacher.createError"));
        }
      }
    } catch {
      setFormError(t("teacher.systemError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-full">
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

      <PermissionGuard requiredPermission="Teacher.View">
        {activeTab === "list" ? (
          <TeacherTable
            refreshKey={refreshKey}
            showToast={showToast}
            onAddClick={openCreateForm}
            onEditClick={openEditForm}
          />
        ) : (
          <TeacherForm
            t={t}
            editingItem={editingItem}
            formError={formError}
            isSubmitting={isSubmitting}
            onCancel={closeForm}
            onSubmit={handleSubmit}
          />
        )}
      </PermissionGuard>
    </div>
  );
}

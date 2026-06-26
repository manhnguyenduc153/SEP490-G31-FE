"use client";

import React, { useState } from "react";
import ClassTable from "@/components/class/ClassTable";
import ClassForm from "@/components/class/ClassForm";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useTranslation } from "react-i18next";
import { ClassItem } from "@/services/class.api";

export default function ClassPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"list" | "form">("list");
  const [editingItem, setEditingItem] = useState<ClassItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = (msg: string) => {
    setActiveTab("list");
    setEditingItem(null);
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="class.title" />
      <div className="space-y-6">
        {activeTab === "list" ? (
          <ClassTable
            refreshKey={refreshKey}
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
          <ClassForm
            t={t}
            editingItem={editingItem}
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

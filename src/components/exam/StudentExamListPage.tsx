"use client";

import React from "react";
import { StudentExamList } from "./StudentExamList";
import { useTranslation } from "react-i18next";

export function StudentExamListPage() {
  const { t } = useTranslation();

  return (
    <div>
      <div className="space-y-6">
        <StudentExamList t={t} />
      </div>
    </div>
  );
}

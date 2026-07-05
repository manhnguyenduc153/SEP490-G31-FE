"use client";

import React, { useEffect, useState } from "react";
import { ExamTable } from "./ExamTable";
import { StudentExamList } from "./StudentExamList";
import { authApi } from "@/services/auth.api";
import { useTranslation } from "react-i18next";

export function ExamsClient() {
  const { t } = useTranslation();
  const [role, setRole] = useState<string | null>(null); // null = loading

  useEffect(() => {
    setRole(authApi.getRole());
  }, []);

  // Still loading role from localStorage
  if (role === null) {
    return null;
  }

  if (role === "Student") {
    return <StudentExamList t={t} />;
  }

  return <ExamTable />;
}

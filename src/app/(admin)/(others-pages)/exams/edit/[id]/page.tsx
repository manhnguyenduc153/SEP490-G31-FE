"use client";
import React from "react";
import { ExamForm } from "@/components/exam/ExamForm";
import { useParams } from "next/navigation";

export default function EditExamPage() {
  const params = useParams();
  const id = params?.id ? Number(params.id) : undefined;

  return (
    <div className="space-y-6">
      <ExamForm id={id} />
    </div>
  );
}

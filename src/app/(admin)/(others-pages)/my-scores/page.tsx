"use client";

import React, { useEffect, useMemo, useState } from "react";

import { MyGradeClassDto, studentGradeApi } from "@/services/score.api";
import { Award, ChevronDown, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

// Thresholds are on the 0-9 band scale now (component/average scores are IELTS bands, not /10).
const scoreTone = (score: number) => {
  if (score >= 6.5) return "bg-emerald-50 text-emerald-600 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
  if (score >= 4.5) return "bg-blue-50 text-blue-600 border-blue-200/60 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20";
  return "bg-amber-50 text-amber-600 border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
};

export default function MyScoresPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<MyGradeClassDto[]>([]);
  const [expandedClassId, setExpandedClassId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const translateMessage = React.useCallback((message?: string) => {
    if (!message) return t("class.gradeLoadError", { defaultValue: "Could not load grades" });
    return t(`backendMessages.${message}`, {
      defaultValue: t(message, { defaultValue: message }),
    });
  }, [t]);

  useEffect(() => {
    async function loadGrades() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await studentGradeApi.getMyGrades();
        if (!res.success || !res.data) {
          throw new Error(translateMessage(res.message));
        }

        setItems(res.data);
        setExpandedClassId(res.data[0]?.classId ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("class.gradeLoadError", { defaultValue: "Could not load grades" }));
      } finally {
        setIsLoading(false);
      }
    }

    loadGrades();
  }, [t, translateMessage]);

  const totalClasses = useMemo(() => items.length, [items]);

  return (
    <div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {t("studentScores.title", { defaultValue: "My scores" })}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t("studentScores.subtitle", { defaultValue: "Click a class to view your component scores and final average." })}
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white py-16 text-sm text-gray-500 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            {t("studentScores.loading", { defaultValue: "Loading scores..." })}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
            {error}
          </div>
        ) : totalClasses === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-xs dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            {t("studentScores.empty", { defaultValue: "You do not have any class scores yet." })}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const isExpanded = expandedClassId === item.classId;
              return (
                <div key={item.classId} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
                  <button
                    type="button"
                    onClick={() => setExpandedClassId(isExpanded ? null : item.classId)}
                    className="flex w-full flex-col gap-3 p-5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {item.courseCode ? `${item.courseCode} - ${item.courseName || ""}` : item.courseName || t("sidebar.courses", { defaultValue: "Course" })}
                      </p>
                      <h4 className="mt-1 text-base font-bold text-gray-900 dark:text-white">
                        {item.classCode ? `${item.classCode} - ${item.className || ""}` : item.className || `Class #${item.classId}`}
                      </h4>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`inline-flex min-w-16 items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-bold ${scoreTone(item.averageScore)}`}>
                        {Number(item.averageScore).toFixed(1)}
                      </span>
                      <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 p-5 dark:border-gray-800">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500 dark:bg-gray-800/40 dark:text-gray-400">
                            <tr>
                              <th className="px-4 py-3 text-left">{t("class.gradeComponentName", { defaultValue: "Component" })}</th>
                              <th className="px-4 py-3 text-center">{t("class.gradeWeight", { defaultValue: "Weight (%)" })}</th>
                              <th className="px-4 py-3 text-center">{t("studentScores.finalScore", { defaultValue: "Final score" })}</th>
                              <th className="px-4 py-3 text-center">{t("studentScores.band", { defaultValue: "IELTS Band" })}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {item.components.map((component) => (
                              <tr key={component.gradeComponentId}>
                                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{component.componentName}</td>
                                <td className="px-4 py-3 text-center text-gray-500">{component.weight}%</td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-flex min-w-14 items-center justify-center rounded border px-2.5 py-1 text-xs font-bold ${scoreTone(component.score)}`}>
                                    {Number(component.score).toFixed(1)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {component.band != null ? (
                                    <span className="inline-flex min-w-14 items-center justify-center rounded border border-brand-200/60 bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-600 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-400">
                                      {Number(component.band).toFixed(1)}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-gray-50/80 font-bold dark:bg-gray-800/40">
                              <td className="px-4 py-3 text-gray-900 dark:text-white">{t("studentScores.totalAverage", { defaultValue: "Total average" })}</td>
                              <td className="px-4 py-3 text-center text-gray-500">100%</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex min-w-14 items-center justify-center rounded border px-2.5 py-1 text-xs font-bold ${scoreTone(item.averageScore)}`}>
                                  {Number(item.averageScore).toFixed(1)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center text-gray-400">—</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

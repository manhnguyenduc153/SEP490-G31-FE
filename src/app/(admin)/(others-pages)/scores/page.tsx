"use client";

import React, { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { courseApi, CourseItem } from "@/services/course.api";
import { GradeComponentDto, GradeComponentSaveDto, studentGradeApi } from "@/services/score.api";
import { CheckCircle, Plus, RefreshCw, Save, Trash2, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ScoreRule {
  id: string;
  backendId?: number;
  name: string;
  weight: number;
  sortOrder: number;
  isSystem: boolean;
}

const componentToRule = (component: GradeComponentDto): ScoreRule => ({
  id: component.code,
  backendId: component.id,
  name: component.name,
  weight: Number(component.weight),
  sortOrder: component.sortOrder,
  isSystem: component.isSystem,
});

export default function ScoresPage() {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | "">("");
  const [rules, setRules] = useState<ScoreRule[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const selectedCourse = useMemo(
    () => courses.find((item) => item.id === selectedCourseId),
    [courses, selectedCourseId]
  );

  const totalWeight = useMemo(
    () => rules.reduce((sum, rule) => sum + Math.max(0, Number(rule.weight) || 0), 0),
    [rules]
  );

  const showToast = React.useCallback((msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    async function loadCourses() {
      setIsLoadingCourses(true);
      try {
        const res = await courseApi.getAll(1, 500);
        if (res.success && res.data) {
          setCourses(res.data.items || []);
        } else {
          showToast(res.message || t("class.gradeCourseLoadError", { defaultValue: "Could not load courses" }), "error");
        }
      } catch {
        showToast(t("class.gradeCourseConnectionError", { defaultValue: "Could not connect to server to load courses" }), "error");
      } finally {
        setIsLoadingCourses(false);
      }
    }

    loadCourses();
  }, [showToast, t]);

  const loadRules = React.useCallback(async (courseId: number) => {
    setIsLoadingRules(true);
    try {
      const res = await studentGradeApi.getCourseComponents(courseId);
      if (!res.success || !res.data) {
        throw new Error(res.message || t("class.gradeSettingsLoadError", { defaultValue: "Could not load score settings" }));
      }
      setRules(res.data.map(componentToRule));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("class.gradeSettingsLoadError", { defaultValue: "Could not load score settings" }), "error");
      setRules([]);
    } finally {
      setIsLoadingRules(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    if (!selectedCourseId) {
      setRules([]);
      return;
    }
    loadRules(Number(selectedCourseId));
  }, [loadRules, selectedCourseId]);

  const updateRule = (id: string, patch: Partial<ScoreRule>) => {
    setRules((current) => {
      const next = current.map((rule) => rule.id === id ? { ...rule, ...patch } : rule);
      const nextTotal = next.reduce((sum, rule) => sum + Math.max(0, Number(rule.weight) || 0), 0);
      if (patch.weight !== undefined && nextTotal > 100) {
        showToast(t("class.gradeTotalWeightExceeded", { defaultValue: "Total weight cannot exceed 100%" }), "error");
        return current;
      }
      return next;
    });
  };

  const addRule = () => {
    setRules((current) => [
      ...current,
      {
        id: `custom_${Date.now()}`,
        name: t("class.gradeNewComponent", { defaultValue: "New component" }),
        weight: 0,
        sortOrder: current.length + 1,
        isSystem: false,
      },
    ]);
  };

  const removeRule = (id: string) => {
    setRules((current) => current.filter((rule) => rule.id !== id));
  };

  const saveRules = async () => {
    if (!selectedCourseId) return;
    if (!rules.length) {
      showToast(t("class.gradeComponentEmpty", { defaultValue: "Please add at least one score component" }), "error");
      return;
    }
    if (totalWeight > 100) {
      showToast(t("class.gradeTotalWeightExceeded", { defaultValue: "Total weight cannot exceed 100%" }), "error");
      return;
    }

    setIsSaving(true);
    try {
      const payload: GradeComponentSaveDto[] = rules.map((rule, index) => ({
        id: rule.backendId,
        code: rule.id,
        name: rule.name,
        weight: Number(rule.weight) || 0,
        sortOrder: index + 1,
        isSystem: rule.isSystem,
      }));

      const res = await studentGradeApi.saveCourseComponents(Number(selectedCourseId), payload);
      if (!res.success || !res.data) {
        throw new Error(res.message || t("class.gradeSaveError", { defaultValue: "Could not save score settings" }));
      }

      setRules(res.data.map(componentToRule));
      showToast(t("class.gradeRuleSaveSuccess", { defaultValue: "Score settings saved" }), "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("class.gradeSaveError", { defaultValue: "Could not save score settings" }), "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[99999] flex items-center gap-3 rounded-xl border border-white/10 bg-gray-900 px-4 py-3 text-white shadow-2xl animate-bounce dark:border-black/5 dark:bg-white dark:text-gray-900">
          {toastType === "success" ? (
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0 text-rose-500" />
          )}
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      <PageBreadcrumb pageTitle="sidebar.scoreSettings" />

      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">
            {t("class.gradeSelectCourse", { defaultValue: "Select course" })}
          </label>
          <select
            value={selectedCourseId}
            onChange={(event) => setSelectedCourseId(event.target.value ? Number(event.target.value) : "")}
            disabled={isLoadingCourses}
            className="h-11 w-full max-w-xl rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            <option value="">
              {isLoadingCourses
                ? t("class.gradeLoadingCourses", { defaultValue: "Loading courses..." })
                : t("class.gradeSelectCoursePlaceholder", { defaultValue: "Select a course to configure score components" })}
            </option>
            {courses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code ? `${item.code} - ${item.name}` : item.name}
              </option>
            ))}
          </select>

          {selectedCourse && (
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              {t("sidebar.courses", { defaultValue: "Course" })}: <span className="font-semibold">{selectedCourse.name}</span>
            </div>
          )}
        </div>

        {!selectedCourseId ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-xs dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            {t("class.gradeCourseEmptyState", { defaultValue: "Select a course to configure score components and weights." })}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-5 flex flex-col gap-3 border-b border-gray-100 pb-4 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {t("class.gradeSettingsTab", { defaultValue: "Score settings" })}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t("class.gradeCourseWeightHelp", { defaultValue: "These score components and weights apply to every class in the selected course." })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={addRule} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-500 px-3 text-xs font-semibold text-white hover:bg-brand-600">
                  <Plus className="h-3.5 w-3.5" />
                  {t("class.gradeAddComponent", { defaultValue: "Add component" })}
                </button>
                <button onClick={saveRules} disabled={isSaving || isLoadingRules} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-500 px-3 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
                  <Save className="h-3.5 w-3.5" />
                  {t("class.gradeSettingsSave", { defaultValue: "Save settings" })}
                </button>
              </div>
            </div>

            <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
              {t("class.gradeTotalWeight", { defaultValue: "Total weight" })}: <span className={`font-bold ${totalWeight > 100 ? "text-rose-600 dark:text-rose-400" : "text-gray-900 dark:text-white"}`}>{totalWeight}%</span>
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{t("class.gradeTotalWeightLimit", { defaultValue: "Maximum 100%" })}</span>
            </div>

            {isLoadingRules ? (
              <div className="flex items-center justify-center py-16 text-sm text-gray-500">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                {t("class.gradeSettingsLoading", { defaultValue: "Loading score settings..." })}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500 dark:bg-gray-800/40 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-3 text-left">{t("class.gradeComponentName", { defaultValue: "Component" })}</th>
                      <th className="px-4 py-3 text-center">{t("class.gradeWeight", { defaultValue: "Weight (%)" })}</th>
                      <th className="px-4 py-3 text-center">{t("class.actions", { defaultValue: "Actions" })}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {rules.map((rule) => (
                      <tr key={rule.id}>
                        <td className="px-4 py-3">
                          <input
                            value={rule.name}
                            onChange={(event) => updateRule(rule.id, { name: event.target.value })}
                            className="h-9 w-full max-w-md rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={100}
                            step={1}
                            value={rule.weight}
                            onChange={(event) => updateRule(rule.id, { weight: Math.max(0, Number(event.target.value) || 0) })}
                            className="mx-auto h-9 w-24 rounded-lg border border-gray-200 bg-white px-2 text-center text-sm font-semibold text-gray-800 outline-none [appearance:textfield] focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => removeRule(rule.id)} disabled={rules.length <= 1} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-rose-500/10">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

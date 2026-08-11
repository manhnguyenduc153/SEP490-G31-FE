"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CourseItem } from "@/services/course.api";
import { commonApi } from "@/services/common.api";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { GradeComponentDto, GradeComponentSaveDto, studentGradeApi } from "@/services/score.api";
import { CheckCircle, Plus, RefreshCw, Save, Trash2, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { z } from "zod";

interface ScoreRule {
  id: string;
  backendId?: number;
  name: string;
  weight: string;
  sortOrder: number;
  isSystem: boolean;
}

const componentToRule = (component: GradeComponentDto): ScoreRule => ({
  id: component.code,
  backendId: component.id,
  name: component.name,
  weight: String(component.weight),
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
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [ruleErrors, setRuleErrors] = useState<Record<string, { name?: string; weight?: string }>>({});

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
        const res = await commonApi.getCourses(1, 500);
        if (res.success && res.data) {
          setCourses(res.data.items || []);
        } else {
          showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("class.gradeCourseLoadError"), "error");
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
        throw new Error(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("class.gradeSettingsLoadError"));
      }
      setRules(res.data.map(componentToRule));
      setFormErrors([]);
      setRuleErrors({});
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
      setFormErrors([]);
      setRuleErrors({});
      return;
    }
    loadRules(Number(selectedCourseId));
  }, [loadRules, selectedCourseId]);

  const updateRule = (id: string, patch: Partial<ScoreRule>) => {
    setRules((current) => current.map((rule) => rule.id === id ? { ...rule, ...patch } : rule));
    setRuleErrors((current) => {
      if (!current[id]) return current;
      const next = { ...current, [id]: { ...current[id] } };
      if (patch.name !== undefined) delete next[id].name;
      if (patch.weight !== undefined) delete next[id].weight;
      if (!next[id].name && !next[id].weight) delete next[id];
      return next;
    });
    setFormErrors([]);
  };

  const addRule = () => {
    setRules((current) => [
      ...current,
      {
        id: `custom_${Date.now()}`,
        name: t("class.gradeNewComponent", { defaultValue: "New component" }),
        weight: "",
        sortOrder: current.length + 1,
        isSystem: false,
      },
    ]);
  };

  const removeRule = (id: string) => {
    setRules((current) => current.filter((rule) => rule.id !== id));
    setRuleErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setFormErrors([]);
  };

  const saveRules = async () => {
    if (!selectedCourseId) return;
    const scoreConfigSchema = z.object({
      rules: z.array(z.object({
        name: z.string().trim()
          .min(1, t("class.gradeComponentNameRequired"))
          .max(200, t("class.gradeComponentNameMax")),
        weight: z.string().trim()
          .min(1, t("class.gradeWeightRequired"))
          .refine((value) => !value || Number.isFinite(Number(value)), t("class.gradeWeightInvalid"))
          .refine((value) => !value || (Number(value) >= 0 && Number(value) <= 100), t("class.gradeWeightRange")),
      })).min(1, t("class.gradeComponentEmpty")),
    }).superRefine((data, context) => {
      const sum = data.rules.reduce((total, rule) => total + (Number(rule.weight) || 0), 0);
      if (sum !== 100) {
        context.addIssue({
          code: "custom",
          path: ["totalWeight"],
          message: t("class.gradeTotalWeightMustBe100"),
        });
      }
    });

    const validation = scoreConfigSchema.safeParse({ rules });
    if (!validation.success) {
      const nextRuleErrors: Record<string, { name?: string; weight?: string }> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0] === "rules" && typeof issue.path[1] === "number") {
          const rule = rules[issue.path[1]];
          const field = issue.path[2];
          if (rule && (field === "name" || field === "weight")) {
            nextRuleErrors[rule.id] = { ...nextRuleErrors[rule.id], [field]: issue.message };
          }
        }
      });
      const errors = [...new Set(validation.error.issues.map((issue) => issue.message))];
      setRuleErrors(nextRuleErrors);
      setFormErrors(errors);
      showToast(errors[0], "error");
      return;
    }

    setRuleErrors({});
    setFormErrors([]);

    setIsSaving(true);
    try {
      const payload: GradeComponentSaveDto[] = rules.map((rule, index) => ({
        id: rule.backendId,
        code: rule.id,
        name: rule.name,
        weight: Number(rule.weight),
        sortOrder: index + 1,
        isSystem: rule.isSystem,
      }));

      const res = await studentGradeApi.saveCourseComponents(Number(selectedCourseId), payload);
      if (!res.success || !res.data) {
        throw new Error(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("class.gradeSaveError"));
      }

      setRules(res.data.map(componentToRule));
      showToast(t("class.gradeRuleSaveSuccess", { defaultValue: "Score settings saved" }), "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : t("class.gradeSaveError", { defaultValue: "Could not save score settings" });
      setFormErrors([message]);
      showToast(message, "error");
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

      <div className="space-y-6">
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-6 py-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t("sidebar.scoreSettings")}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("class.gradeCourseWeightHelp")}</p>
            </div>
            <PermissionGuard requiredPermission="StudentGrade.Create">
              <button onClick={addRule} disabled={!selectedCourseId} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50">
                <Plus className="h-5 w-5" /> {t("class.gradeAddComponent")}
              </button>
            </PermissionGuard>
          </div>
          <div className="p-5">
          <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">
            {t("class.gradeSelectCourse", { defaultValue: "Select course" })}
          </label>
          <SearchableSelect
            value={selectedCourseId}
            onChange={(value) => setSelectedCourseId(value ? Number(value) : "")}
            disabled={isLoadingCourses}
            className="max-w-xl"
            options={courses.map((item) => ({ value: item.id, label: item.code ? `${item.code} - ${item.name}` : item.name }))}
            placeholder={isLoadingCourses ? t("class.gradeLoadingCourses") : t("class.gradeSelectCoursePlaceholder")}
            searchPlaceholder={t("common.searchPlaceholder", { defaultValue: "Tìm kiếm..." })}
            noResultsText={t("common.noResults", { defaultValue: "Không tìm thấy kết quả" })}
            onClear={() => setSelectedCourseId("")}
          />

          {selectedCourse && (
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              {t("sidebar.courses", { defaultValue: "Course" })}: <span className="font-semibold">{selectedCourse.name}</span>
            </div>
          )}
          </div>
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
                <PermissionGuard requiredPermission="StudentGrade.Edit">
                  <button onClick={saveRules} disabled={isSaving || isLoadingRules} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-500 px-3 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
                    <Save className="h-3.5 w-3.5" /> {t("class.gradeSettingsSave")}
                  </button>
                </PermissionGuard>
              </div>
            </div>

            <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
              {t("class.gradeTotalWeight", { defaultValue: "Total weight" })}: <span className={`font-bold ${totalWeight !== 100 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>{totalWeight}%</span>
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{t("class.gradeTotalWeightRequired", { defaultValue: "Must equal 100%" })}</span>
            </div>

            {formErrors.length > 0 && (
              <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                {formErrors.map((error, index) => <div key={`${error}-${index}`}>• {error}</div>)}
              </div>
            )}

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
                            className={`h-9 w-full max-w-md rounded-lg border bg-white px-3 text-sm font-medium text-gray-800 outline-none focus:ring-2 dark:bg-gray-900 dark:text-white ${ruleErrors[rule.id]?.name ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10" : "border-gray-200 focus:border-brand-400 focus:ring-brand-500/10 dark:border-gray-700"}`}
                            aria-invalid={Boolean(ruleErrors[rule.id]?.name)}
                          />
                          {ruleErrors[rule.id]?.name && <p className="mt-1 text-xs text-rose-500">{ruleErrors[rule.id].name}</p>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={100}
                            step={1}
                            value={rule.weight}
                            onChange={(event) => updateRule(rule.id, { weight: event.target.value })}
                            placeholder={t("class.gradeWeightPlaceholder")}
                            className={`mx-auto h-9 w-24 rounded-lg border bg-white px-2 text-center text-sm font-semibold text-gray-800 outline-none [appearance:textfield] focus:ring-2 dark:bg-gray-900 dark:text-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${ruleErrors[rule.id]?.weight ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10" : "border-gray-200 focus:border-brand-400 focus:ring-brand-500/10 dark:border-gray-700"}`}
                            aria-invalid={Boolean(ruleErrors[rule.id]?.weight)}
                          />
                          {ruleErrors[rule.id]?.weight && <p className="mt-1 text-xs text-rose-500">{ruleErrors[rule.id].weight}</p>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <PermissionGuard requiredPermission="StudentGrade.Delete">
                            <button title={t("common.delete", { defaultValue: "Xóa" })} onClick={() => removeRule(rule.id)} disabled={rules.length <= 1 || rule.isSystem} className="p-1.5 text-error-600 hover:text-error-800 dark:text-error-400 dark:hover:text-error-300 hover:bg-error-50 dark:hover:bg-error-950/30 rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </PermissionGuard>
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

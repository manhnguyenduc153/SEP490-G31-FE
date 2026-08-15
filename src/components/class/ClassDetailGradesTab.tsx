"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Award, Download, FileDown, RefreshCw, Save, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import {
  buildClassScoreRows,
  GradeComponentDto,
  ScoreComponent,
  ScoreOverrideMap,
  ScoreRow,
  studentGradeApi,
} from "@/services/score.api";
import { authApi } from "@/services/auth.api";

interface ClassDetailGradesTabProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itemDetail: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  showToast?: (msg: string, type?: "success" | "error") => void;
}

interface ScoreRule {
  id: string;
  backendId?: number;
  name: string;
  weight: number;
  sortOrder: number;
  isSystem: boolean;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

const componentToRule = (component: GradeComponentDto): ScoreRule => ({
  id: component.code,
  backendId: component.id,
  name: component.name,
  weight: Number(component.weight),
  sortOrder: component.sortOrder,
  isSystem: component.isSystem,
});

const isLegacyAttendanceComponent = (component: GradeComponentDto) =>
  component.code.trim().toLowerCase() === "attendance";

const calculateAverage = (row: ScoreRow, rules: ScoreRule[]) => {
  const totalWeight = rules.reduce((sum, rule) => sum + Math.max(0, Number(rule.weight) || 0), 0);
  if (totalWeight <= 0) return 0;
  const weightedScore = rules.reduce((sum, rule) => sum + (row.componentScores[rule.id] ?? 0) * Math.max(0, Number(rule.weight) || 0), 0);
  return round1(weightedScore / totalWeight);
};

const buildOverrideMap = (overrides: { studentId: number; componentCode: string; score: number }[]): ScoreOverrideMap => {
  const result: ScoreOverrideMap = {};
  overrides.forEach((item) => {
    result[item.studentId] = {
      ...result[item.studentId],
      [item.componentCode]: Number(item.score),
    };
  });
  return result;
};

export default function ClassDetailGradesTab({
  itemDetail,
  t,
  showToast,
}: ClassDetailGradesTabProps) {
  const classId = itemDetail?.id;
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [overrides, setOverrides] = useState<ScoreOverrideMap>({});
  const [rules, setRules] = useState<ScoreRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [permissions, setPermissions] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const r = authApi.getRole().toLowerCase();
    setIsAdmin(r === "admin");
    setPermissions(authApi.getPermissions());
  }, []);

  const hasPermission = (perm: string) => {
    return isAdmin || permissions.includes(perm);
  };

  const hasStudents = Boolean(itemDetail?.studentClasses?.length);

  const withAverages = useCallback((scoreRows: ScoreRow[], activeRules: ScoreRule[]) =>
    scoreRows.map((row) => ({
      ...row,
      averageScore: calculateAverage(row, activeRules),
    })), []);

  const loadScores = useCallback(async () => {
    if (!classId || !hasStudents) return;

    setIsLoading(true);
    setError(null);
    try {
      const settingsRes = await studentGradeApi.getSettings(classId);
      if (!settingsRes.success || !settingsRes.data) {
        throw new Error(settingsRes.message || t("class.gradeLoadError", { defaultValue: "Could not load gradebook" }));
      }

      const activeRules = settingsRes.data.components
        .filter((component) => !isLegacyAttendanceComponent(component))
        .map(componentToRule);
      const activeOverrides = buildOverrideMap(settingsRes.data.overrides || []);
      const scoreRows = await buildClassScoreRows(classId, activeOverrides);

      setRules(activeRules);
      setOverrides(activeOverrides);
      setRows(withAverages(scoreRows, activeRules));
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : t("class.gradeLoadError", { defaultValue: "Could not load gradebook" });
      setError(message);
      showToast?.(message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [classId, hasStudents, showToast, t, withAverages]);

  useEffect(() => {
    loadScores();
  }, [loadScores]);

  const updateScore = (studentId: number, component: ScoreComponent, value: string) => {
    const numericValue = value === "" ? undefined : Number(value);
    const nextOverrides: ScoreOverrideMap = {
      ...overrides,
      [studentId]: {
        ...overrides[studentId],
        [component]: numericValue,
      },
    };

    if (numericValue === undefined) {
      delete nextOverrides[studentId]?.[component];
      if (nextOverrides[studentId] && Object.keys(nextOverrides[studentId]).length === 0) {
        delete nextOverrides[studentId];
      }
    }

    setOverrides(nextOverrides);
    setRows((currentRows) => withAverages(currentRows.map((row) => {
      if (row.studentId !== studentId) return row;
      const nextComponentScores = {
        ...row.componentScores,
        [component]: numericValue ?? row.rawComponentScores[component] ?? 0,
      };
      return {
        ...row,
        componentScores: nextComponentScores,
        homeworkScore: nextComponentScores.homework ?? row.homeworkScore,
        examScore: nextComponentScores.exam ?? row.examScore,
      };
    }), rules));
  };

  const saveOverrides = async () => {
    if (!classId) return;
    const invalidScore = Object.values(overrides).some((componentScores) =>
      (Object.values(componentScores) as Array<number | undefined>).some((score) =>
        score !== undefined && (!Number.isFinite(score) || score < 0 || score > 10)
      )
    );
    if (invalidScore) {
      showToast?.(t("class.gradeScoreRange"), "error");
      return;
    }

    try {
      const componentIdByCode = new Map(rules.map((rule) => [rule.id, rule.backendId]));
      const rowByStudentId = new Map(rows.map((row) => [row.studentId, row]));
      const payload = Object.entries(overrides).flatMap(([studentIdText, componentScores]) => {
        const row = rowByStudentId.get(Number(studentIdText));
        if (!row?.studentClassId) return [];
        return Object.entries(componentScores)
          .filter(([, score]) => score !== undefined && score !== null)
          .map(([componentCode, score]) => ({
            studentClassId: row.studentClassId!,
            gradeComponentId: componentIdByCode.get(componentCode)!,
            score: Number(score),
          }))
          .filter((item) => Boolean(item.gradeComponentId));
      });

      const res = await studentGradeApi.saveOverrides(classId, payload);
      if (!res.success) {
        throw new Error(res.message || t("class.gradeSaveError", { defaultValue: "Could not save gradebook" }));
      }

      showToast?.(t("class.gradeSaveSuccess", { defaultValue: "Gradebook saved" }), "success");
      await loadScores();
    } catch (err) {
      showToast?.(err instanceof Error ? err.message : t("class.gradeSaveError", { defaultValue: "Could not save gradebook" }), "error");
    }
  };

  const buildExcelRows = (sourceRows: ScoreRow[], includeScores: boolean) => sourceRows.map((row, index) => {
    const result: Record<string, string | number> = {
      STT: index + 1,
      studentCode: row.studentCode || "",
      studentName: row.studentName || "",
      [t("class.studentCode", { defaultValue: "Student Code" })]: row.studentCode || "",
      [t("class.studentName", { defaultValue: "Student Name" })]: row.studentName || "",
    };

    rules.forEach((rule) => {
      result[rule.id] = includeScores ? row.componentScores[rule.id] ?? 0 : "";
      result[rule.name] = includeScores ? row.componentScores[rule.id] ?? 0 : "";
    });

    if (includeScores) {
      result[t("class.gradeAverage", { defaultValue: "Average" })] = row.averageScore;
    }

    return result;
  });

  const downloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet(buildExcelRows(rows, false));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t("class.gradeTemplateSheetName", { defaultValue: "Grade template" }));
    XLSX.writeFile(workbook, `${t("class.gradeTemplateFileName", { defaultValue: "Grade_Template" })}_${itemDetail?.code || classId}.xlsx`);
  };

  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(buildExcelRows(rows, true));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t("class.gradeSheetName", { defaultValue: "Gradebook" }));
    XLSX.writeFile(workbook, `${t("class.gradeFileName", { defaultValue: "Gradebook" })}_${itemDetail?.code || classId}.xlsx`);
  };

  const importExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !classId) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const importedRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
        const nextOverrides: ScoreOverrideMap = { ...overrides };
        let updatedCount = 0;
        let hasInvalidScore = false;

        importedRows.forEach((item) => {
          const studentCode = String(
            item.studentCode ??
            item[t("class.studentCode", { defaultValue: "Student Code" })] ??
            item["Student Code"] ??
            item["Mã học sinh"] ??
            ""
          ).trim();
          const studentName = String(
            item.studentName ??
            item[t("class.studentName", { defaultValue: "Student Name" })] ??
            item["Student Name"] ??
            item["Họ và tên"] ??
            item["Học sinh"] ??
            ""
          ).trim();
          const matchedRow = rows.find((row) =>
            (studentCode && row.studentCode === studentCode) ||
            (!studentCode && studentName && row.studentName?.trim().toLowerCase() === studentName.toLowerCase())
          );

          if (!matchedRow) return;
          nextOverrides[matchedRow.studentId] = { ...nextOverrides[matchedRow.studentId] };

          rules.forEach((rule) => {
            const score = Number(item[rule.name] ?? item[rule.id]);
            if (!Number.isNaN(score)) {
              if (score < 0 || score > 10) {
                hasInvalidScore = true;
              } else {
                nextOverrides[matchedRow.studentId][rule.id] = score;
              }
            }
          });

          updatedCount += 1;
        });

        if (hasInvalidScore) {
          showToast?.(t("class.gradeScoreRange"), "error");
          return;
        }

        setOverrides(nextOverrides);
        setRows((currentRows) => withAverages(currentRows.map((row) => ({
          ...row,
          componentScores: {
            ...row.componentScores,
            ...Object.fromEntries(
              Object.entries(nextOverrides[row.studentId] || {}).filter((entry): entry is [string, number] => entry[1] !== undefined)
            ),
          },
        })), rules));
        showToast?.(t("class.gradeImportSuccess", { defaultValue: "Imported {{count}} score rows", count: updatedCount }), "success");
      } catch {
        showToast?.(t("class.gradeImportError", { defaultValue: "Could not read Excel file" }), "error");
      } finally {
        event.target.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const renderScoreInput = (row: ScoreRow, rule: ScoreRule) => {
    if (!hasPermission("StudentGrade.SaveGrade")) {
      const scoreVal = row.componentScores[rule.id];
      return <span className="font-semibold text-gray-800 dark:text-gray-250">{scoreVal !== undefined && scoreVal !== null ? scoreVal.toFixed(1) : "-"}</span>;
    }
    const overrideScore = overrides[row.studentId]?.[rule.id];
    const rawScore = row.rawComponentScores[rule.id] ?? 0;
    const hasRawScore = row.rawComponentHasScore[rule.id] ?? false;
    const inputValue = overrideScore !== undefined ? overrideScore : (hasRawScore ? rawScore : "");
    return (
      <input
        type="number"
        inputMode="decimal"
        min={0}
        max={10}
        step={0.1}
        value={inputValue}
        onChange={(event) => updateScore(row.studentId, rule.id, event.target.value)}
        className="mx-auto h-9 w-28 rounded-lg border border-gray-200 bg-white px-2 text-center text-sm font-semibold text-gray-800 outline-none [appearance:textfield] focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    );
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs p-6 space-y-4 animate-fadeIn">
      <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 dark:border-gray-800 xl:flex-row xl:items-center xl:justify-between">
        <h3 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-brand-500" />
          <span>{t("class.gradesTitle", { defaultValue: "Gradebook" })}</span>
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importExcel} />
          <button onClick={downloadTemplate} disabled={!rows.length} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            <FileDown className="h-3.5 w-3.5" />
            {t("class.gradeDownloadTemplate", { defaultValue: "Download template" })}
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            <Upload className="h-3.5 w-3.5" />
            {t("class.gradeImportExcel", { defaultValue: "Import Excel" })}
          </button>
          <button onClick={exportExcel} disabled={!rows.length} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            <Download className="h-3.5 w-3.5" />
            {t("class.gradeExportExcel", { defaultValue: "Export Excel" })}
          </button>
          {hasPermission("StudentGrade.SaveGrade") && (
            <button onClick={saveOverrides} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-500 px-3 text-xs font-semibold text-white hover:bg-brand-600">
              <Save className="h-3.5 w-3.5" />
              {t("class.gradeSave", { defaultValue: "Save gradebook" })}
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t("class.gradeCourseWeightHelp", { defaultValue: "Score components and weights are configured by course in the score settings screen." })}
      </p>

      {!hasStudents ? (
        <p className="text-xs text-gray-450 text-center py-10 italic border border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-955/20">
          {t("class.noStudentsAssigned")}
        </p>
      ) : error ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">{error}</div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-500">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          {t("class.gradeLoading", { defaultValue: "Loading gradebook..." })}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-450 dark:text-gray-400 font-semibold bg-gray-50/50 dark:bg-gray-800/40">
                <th className="px-4 py-3 w-[5%] text-xs font-bold uppercase tracking-wider text-center">#</th>
                <th className="px-4 py-3 min-w-[150px] text-xs font-bold uppercase tracking-wider">{t("class.studentCode", { defaultValue: "Student Code" })}</th>
                <th className="px-4 py-3 min-w-[180px] text-xs font-bold uppercase tracking-wider">{t("student.colName")}</th>
                {rules.map((rule) => (
                  <th key={rule.id} className="px-3 py-3 min-w-[140px] text-center text-xs font-bold uppercase tracking-wider">{rule.name}</th>
                ))}
                <th className="px-4 py-3 min-w-[120px] text-center text-xs font-bold uppercase tracking-wider">{t("class.gradeAverage", { defaultValue: "Average" })}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((row, idx) => (
                <tr key={row.studentClassId || row.studentId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                  <td className="px-4 py-3.5 text-center font-medium text-gray-500">{idx + 1}</td>
                  <td className="px-4 py-3.5 text-gray-500">{row.studentCode || `ID ${row.studentId}`}</td>
                  <td className="px-4 py-3.5 font-semibold text-gray-900 dark:text-white">{row.studentName || "-"}</td>
                  {rules.map((rule) => (
                    <td key={rule.id} className="px-3 py-3.5 text-center align-middle">{renderScoreInput(row, rule)}</td>
                  ))}
                  <td className="px-4 py-3.5 text-center align-middle">
                    <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded text-xs font-bold ${row.averageScore >= 7
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500 border border-emerald-200/50"
                        : row.averageScore >= 5
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-500 border border-blue-200/50"
                          : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-500 border border-amber-200/50"
                      }`}>
                      {row.averageScore.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <div className="py-10 text-center text-sm text-gray-500">{t("class.gradeNoStudents", { defaultValue: "No students found." })}</div>
          )}
        </div>
      )}
    </div>
  );
}

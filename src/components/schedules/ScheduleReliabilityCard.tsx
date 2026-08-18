"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, Users, BarChart3, ChevronRight, ChevronDown } from "lucide-react";
import type { ScheduleReliabilityReport } from "@/services/class.api";
import { useTranslation } from "react-i18next";

type TFn = (key: string, options?: Record<string, unknown>) => string;

// Backend sends "NONE_REQUIRED" / "UNSPECIFIED" sentinels for classes/teachers without a band;
// real band values (e.g. "IELTS 6.5") are language-neutral labels and pass through unchanged.
function translateBand(band: string, t: TFn): string {
  if (band === "NONE_REQUIRED") return t("classSchedules.reliability.bandNoneRequired", { defaultValue: "Không yêu cầu band" });
  if (band === "UNSPECIFIED") return t("classSchedules.reliability.bandUnspecified", { defaultValue: "Chưa xác định band" });
  return band;
}

function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
      <div className="text-[11px] text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">{value}</div>
    </div>
  );
}

function BandBreakdown({ title, data, t }: { title: string; data: Record<string, number>; t: TFn }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;
  return (
    <div className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {entries.map(([band, count]) => (
          <span
            key={band}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300"
          >
            {translateBand(band, t)}
            <span className="font-bold text-slate-900 dark:text-white">{count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ScheduleReliabilityCard({ report }: { report: ScheduleReliabilityReport }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const stats = report.descriptiveStats;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {t("classSchedules.reliability.viewReport", { defaultValue: "Báo cáo độ tin cậy lịch học" })}
            </span>
          </div>
          {report.isProvenOptimal ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t("classSchedules.reliability.optimal", { defaultValue: "Đã tối ưu" })}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              {t("classSchedules.reliability.nearOptimal", { defaultValue: "Gần tối ưu" })}
            </span>
          )}
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {report.coverage.totalScheduled}/{report.coverage.totalRequested} {t("classSchedules.reliability.studentsPlacedShort", { defaultValue: "học sinh được xếp lớp" })} ({report.coverage.scheduledRatePercent}%)
          </span>
        </div>
        {open ? (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-4 pt-1 border-t border-slate-200 dark:border-slate-700">
          {/* Coverage */}
          <div className="flex items-center gap-1.5 text-sm mt-3">
            <Users className="w-4 h-4 text-slate-400" />
            <span className={`font-semibold ${report.coverage.totalScheduled < report.coverage.totalRequested ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {report.coverage.totalScheduled}/{report.coverage.totalRequested}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              {t("classSchedules.reliability.studentsPlaced", { defaultValue: "học sinh được xếp lớp" })} ({report.coverage.scheduledRatePercent}%)
            </span>
          </div>

          {/* Descriptive stats */}
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatTile label={t("classSchedules.reliability.avgClassSize", { defaultValue: "Sĩ số trung bình" })} value={stats.avgClassSize} />
              {stats.avgRoomFillRatePercent != null && (
                <StatTile label={t("classSchedules.reliability.avgRoomFillRate", { defaultValue: "Lấp đầy phòng TB" })} value={`${stats.avgRoomFillRatePercent}%`} />
              )}
              {stats.largestClass && (
                <StatTile
                  label={t("classSchedules.reliability.largestClass", { defaultValue: "Lớp đông nhất" })}
                  value={`${stats.largestClass.className} (${stats.largestClass.size} học sinh)`}
                />
              )}
              {stats.smallestClass && (
                <StatTile
                  label={t("classSchedules.reliability.smallestClass", { defaultValue: "Lớp ít nhất" })}
                  value={`${stats.smallestClass.className} (${stats.smallestClass.size} học sinh)`}
                />
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <BandBreakdown title={t("classSchedules.reliability.classesByBand", { defaultValue: "Số lớp theo band" })} data={stats.classesByGradeBand} t={t} />
              <BandBreakdown title={t("classSchedules.reliability.teachersByBand", { defaultValue: "Số giáo viên theo band" })} data={stats.teachersByGradeBandInUse} t={t} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

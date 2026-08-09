"use client";
import React from "react";
import { RoomUtilization } from "@/services/dashboard.api";
import { useTranslation } from "react-i18next";

interface Props {
  data: RoomUtilization[] | null;
  loading?: boolean;
}

export default function RoomUtilizationChart({ data, loading }: Props) {
  const { t } = useTranslation();

  if (loading || !data) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] animate-pulse">
        <div className="h-5 w-48 bg-gray-200 rounded dark:bg-gray-700 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  // Get status color based on utilization rate
  const getProgressColor = (rate: number) => {
    if (rate >= 80) return "bg-rose-500 dark:bg-rose-600"; // Over-utilized
    if (rate >= 40) return "bg-emerald-500 dark:bg-emerald-600"; // Optimal
    return "bg-amber-500 dark:bg-amber-600"; // Under-utilized
  };

  const getBadgeColor = (rate: number) => {
    if (rate >= 80) return "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-450";
    if (rate >= 40) return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450";
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-450";
  };

  const getStatusText = (rate: number) => {
    if (rate >= 80) return t("dashboardPage.roomOverutilized", { defaultValue: "Quá tải" });
    if (rate >= 40) return t("dashboardPage.roomOptimal", { defaultValue: "Tối ưu" });
    return t("dashboardPage.roomUnderutilized", { defaultValue: "Hiệu suất thấp" });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {t("dashboardPage.roomUtilization", { defaultValue: "Hiệu suất sử dụng phòng học" })}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {t("dashboardPage.roomUtilizationDesc", { defaultValue: "Tính toán dựa trên số ca xếp lịch trong 30 ngày gần đây." })}
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("common.noData", { defaultValue: "Không có dữ liệu" })}
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[310px] overflow-y-auto pr-1">
          {data.map((room) => (
            <div
              key={room.roomId}
              className="flex flex-col p-3.5 rounded-xl border border-gray-100 bg-gray-50/20 dark:border-gray-800 dark:bg-gray-950/10 hover:shadow-xs transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">
                    {room.roomName}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getBadgeColor(room.utilizationRate)}`}>
                    {getStatusText(room.utilizationRate)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    {room.occupiedSlots}
                  </span>
                  /{room.totalSlots} {t("dashboardPage.slotsUnit", { defaultValue: "ca" })}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressColor(room.utilizationRate)}`}
                  style={{ width: `${room.utilizationRate}%` }}
                />
              </div>

              <div className="flex justify-between items-center mt-1.5 text-[10px] text-gray-400 dark:text-gray-500">
                <span>{t("dashboardPage.roomRate", { defaultValue: "Tỷ lệ sử dụng" })}</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">
                  {room.utilizationRate}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

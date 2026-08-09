"use client";
import React from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { TeacherWorkload } from "@/services/dashboard.api";
import { useTranslation } from "react-i18next";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface Props {
  data: TeacherWorkload[] | null;
  loading?: boolean;
}

export default function TeacherWorkloadChart({ data, loading }: Props) {
  const { t } = useTranslation();

  if (loading || !data) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] animate-pulse">
        <div className="h-5 w-48 bg-gray-200 rounded dark:bg-gray-700 mb-6" />
        <div className="h-[310px] bg-gray-100 rounded dark:bg-gray-800" />
      </div>
    );
  }

  const options: ApexOptions = {
    colors: ["#3b82f6"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 310,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: "55%",
        borderRadius: 4,
      },
    },
    dataLabels: {
      enabled: true,
      textAnchor: "start",
      style: {
        colors: ["#fff"],
      },
      formatter: function (val: any) {
        return val + " " + t("dashboardPage.sessionsUnit", { defaultValue: "ca" });
      },
      offsetX: 0,
    },
    xaxis: {
      categories: data.map((d) => d.teacherName),
      labels: {
        style: {
          fontFamily: "Outfit, sans-serif",
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          fontFamily: "Outfit, sans-serif",
        },
      },
    },
    grid: {
      borderColor: "#f1f1f1",
    },
    tooltip: {
      y: {
        formatter: (val: number) => `${val} ${t("dashboardPage.sessionsUnit", { defaultValue: "ca" })}`,
      },
    },
  };

  const series = [
    {
      name: t("dashboardPage.teacherSessions", { defaultValue: "Số ca dạy" }),
      data: data.map((d) => d.totalSessions),
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {t("dashboardPage.teacherWorkloadTitle", { defaultValue: "Tải dạy của Giáo viên" })}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {t("dashboardPage.teacherWorkloadDesc", { defaultValue: "Số ca giảng dạy thực tế trong 30 ngày gần đây." })}
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("common.noData", { defaultValue: "Không có dữ liệu" })}
          </p>
        </div>
      ) : (
        <div className="h-[310px]">
          <ReactApexChart options={options} series={series} type="bar" height={310} />
        </div>
      )}
    </div>
  );
}

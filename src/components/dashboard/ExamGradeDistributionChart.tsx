"use client";
import React from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { ExamGradeDistribution } from "@/services/dashboard.api";
import { useTranslation } from "react-i18next";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface Props {
  data: ExamGradeDistribution[] | null;
  loading?: boolean;
}

export default function ExamGradeDistributionChart({ data, loading }: Props) {
  const { t } = useTranslation();

  if (loading || !data) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] animate-pulse h-full flex flex-col justify-between">
        <div className="h-5 w-48 bg-gray-200 rounded dark:bg-gray-700 mb-6" />
        <div className="h-[310px] bg-gray-100 rounded dark:bg-gray-800" />
      </div>
    );
  }

  const options: ApexOptions = {
    colors: ["#8b5cf6"], // Purple
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
        horizontal: false,
        columnWidth: "45%",
        borderRadius: 6,
        dataLabels: {
          position: "top",
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: any) {
        return val + " " + t("dashboardPage.studentsUnit", { defaultValue: "HV" });
      },
      offsetY: -20,
      style: {
        fontSize: "12px",
        colors: ["#304758"],
      },
    },
    xaxis: {
      categories: data.map((d) => d.scoreBand),
      position: "bottom",
      labels: {
        style: {
          fontFamily: "Outfit, sans-serif",
        },
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        show: true,
        formatter: function (val: any) {
          return val + " " + t("dashboardPage.studentsUnit", { defaultValue: "HV" });
        },
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
        formatter: (val: number) => `${val} ${t("dashboardPage.studentsUnit", { defaultValue: "học viên" })}`,
      },
    },
  };

  const series = [
    {
      name: t("dashboardPage.studentsCount", { defaultValue: "Số lượng học viên" }),
      data: data.map((d) => d.studentCount),
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] h-full flex flex-col justify-between">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {t("dashboardPage.gradeDistributionTitle", { defaultValue: "Phổ điểm Thi kiểm tra" })}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {t("dashboardPage.gradeDistributionDesc", { defaultValue: "Phân bổ điểm số của học sinh qua các kỳ thi." })}
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-12">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("common.noData", { defaultValue: "Không có dữ liệu" })}
          </p>
        </div>
      ) : (
        <div className="w-full flex-1 flex flex-col justify-center min-h-[310px]">
          <ReactApexChart options={options} series={series} type="bar" height={310} />
        </div>
      )}
    </div>
  );
}

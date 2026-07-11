"use client";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { CoursePopularity } from "@/services/dashboard.api";
import { useTranslation } from "react-i18next";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface Props {
  data: CoursePopularity[] | null;
  loading?: boolean;
}

export default function PopularCoursesChart({ data, loading }: Props) {
  const { t } = useTranslation();

  if (loading || !data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6 animate-pulse">
        <div className="h-5 w-52 bg-gray-200 rounded dark:bg-gray-700 mb-6" />
        <div className="flex justify-center">
          <div className="h-[320px] w-[320px] bg-gray-100 rounded-full dark:bg-gray-800" />
        </div>
      </div>
    );
  }

  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "donut",
    },
    colors: ["#465FFF", "#34D399", "#FBBF24", "#F87171", "#A78BFA"],
    labels: data.map((d) => d.courseName),
    legend: {
      show: true,
      position: "bottom",
      fontFamily: "Outfit, sans-serif",
    },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          background: "transparent",
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: number) {
        return val.toFixed(1) + "%";
      },
    },
    stroke: {
      show: true,
      colors: ["transparent"],
      width: 2,
    },
    tooltip: {
      y: {
        formatter: function (val: number) {
          return `${val} ${t("dashboardPage.studentUnit")}`;
        },
      },
    },
  };

  const series = data.map((d) => d.studentCount);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("dashboardPage.popularCoursesTitle")}
        </h3>
      </div>
      <div className="flex justify-center">
        <ReactApexChart
          options={options}
          series={series}
          type="donut"
          height={320}
        />
      </div>
    </div>
  );
}

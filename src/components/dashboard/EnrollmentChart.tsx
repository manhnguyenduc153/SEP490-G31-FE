"use client";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { MonthlyEnrollment } from "@/services/dashboard.api";
import { useTranslation } from "react-i18next";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface Props {
  data: MonthlyEnrollment[] | null;
  loading?: boolean;
}

export default function EnrollmentChart({ data, loading }: Props) {
  const { t } = useTranslation();

  if (loading || !data) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6 animate-pulse">
        <div className="h-5 w-64 bg-gray-200 rounded dark:bg-gray-700 mb-6" />
        <div className="h-[310px] bg-gray-100 rounded dark:bg-gray-800" />
      </div>
    );
  }

  const options: ApexOptions = {
    colors: ["#465fff"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "area",
      height: 310,
      toolbar: {
        show: false,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 0,
      },
    },
    xaxis: {
      categories: data.map((d) => d.monthLabel),
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      title: {
        text: t("dashboardPage.studentCount"),
        style: {
          fontSize: "12px",
          fontFamily: "Outfit, sans-serif",
          fontWeight: 400,
        },
      },
    },
    tooltip: {
      y: {
        formatter: (val: number) => `${val} ${t("dashboardPage.studentUnit")}`,
      },
    },
  };

  const series = [
    {
      name: t("dashboardPage.enrolledStudents"),
      data: data.map((d) => d.count),
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="mb-6 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("dashboardPage.enrollmentGrowthTitle")}
        </h3>
      </div>
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="-ml-5 min-w-[500px] xl:min-w-full pl-2">
          <ReactApexChart
            options={options}
            series={series}
            type="area"
            height={310}
          />
        </div>
      </div>
    </div>
  );
}

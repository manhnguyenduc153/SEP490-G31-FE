"use client";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { ClassStatusDistribution } from "@/services/dashboard.api";
import { useTranslation } from "react-i18next";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface Props {
  data: ClassStatusDistribution[] | null;
  loading?: boolean;
}

export default function ClassStatusChart({ data, loading }: Props) {
  const { t } = useTranslation();

  if (loading || !data) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6 animate-pulse h-full flex flex-col justify-between">
        <div className="h-5 w-56 bg-gray-200 rounded dark:bg-gray-700 mb-6" />
        <div className="h-[310px] bg-gray-100 rounded dark:bg-gray-800" />
      </div>
    );
  }

  const getLocalizedStatusName = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName === "planning" || lowerName === "chuẩn bị khai giảng") {
      return t("class.statusPlanning", { defaultValue: "Chuẩn bị khai giảng" });
    }
    if (lowerName === "active" || lowerName === "đang diễn ra") {
      return t("class.statusActive", { defaultValue: "Đang diễn ra" });
    }
    if (lowerName === "completed" || lowerName === "đã hoàn thành") {
      return t("class.statusCompleted", { defaultValue: "Đã hoàn thành" });
    }
    if (lowerName === "cancelled" || lowerName === "đã hủy") {
      return t("class.statusCancelled", { defaultValue: "Đã hủy" });
    }
    return name;
  };

  const options: ApexOptions = {
    colors: ["#465fff", "#34D399", "#FBBF24"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 310,
      parentHeightOffset: 0,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "40%",
        borderRadius: 5,
        borderRadiusApplication: "end",
        distributed: true,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 4,
      colors: ["transparent"],
    },
    grid: {
      borderColor: "#f1f1f1",
      padding: {
        left: 10,
        right: 10,
      },
    },
    xaxis: {
      categories: data.map((d) => getLocalizedStatusName(d.statusName)),
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    legend: {
      show: false,
    },
    yaxis: {
      forceNiceScale: true,
      decimalsInFloat: 0,
      title: {
        text: t("dashboardPage.classCount"),
        style: {
          fontSize: "12px",
          fontFamily: "Outfit, sans-serif",
          fontWeight: 400,
        },
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      y: {
        formatter: (val: number) => `${val} ${t("dashboardPage.classUnit")}`,
      },
    },
  };

  const series = [
    {
      name: t("dashboardPage.quantity"),
      data: data.map((d) => d.count),
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6 h-full flex flex-col justify-between">
      <div className="mb-6 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("dashboardPage.classStatusTitle")}
        </h3>
      </div>
      <div className="w-full flex-1 flex flex-col justify-center min-h-[310px]">
        <ReactApexChart
          options={options}
          series={series}
          type="bar"
          height={310}
        />
      </div>
    </div>
  );
}

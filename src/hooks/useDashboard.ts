"use client";
import { useState, useEffect, useCallback } from "react";
import { getDashboardData, DashboardData } from "@/services/dashboard.api";

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getDashboardData();
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.message || "Không thể tải dữ liệu dashboard.");
      }
    } catch (err) {
      setError("Đã xảy ra lỗi khi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

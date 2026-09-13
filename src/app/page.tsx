"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/services/auth.api";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (authApi.isAuthenticated()) {
      router.replace("/dashboard");
    } else {
      router.replace("/signin");
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

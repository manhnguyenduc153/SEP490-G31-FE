"use client";

import React, { useEffect, useState } from "react";
import PersonalScheduleCalendar from "@/components/schedules/PersonalScheduleCalendar";
import { parentStudentApi, ChildItem } from "@/services/parentStudent.api";
import { authApi } from "@/services/auth.api";
import { useTranslation } from "react-i18next";
import { User, Users, Calendar, AlertCircle, Loader2 } from "lucide-react";

export default function ChildSchedulesPage() {
  const { t } = useTranslation();
  const [children, setChildren] = useState<ChildItem[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChildren() {
      setIsLoading(true);
      setError(null);
      try {
        const role = authApi.getRole().toLowerCase();
        const username = typeof window !== "undefined" ? localStorage.getItem("username") || "" : "";
        
        // If logged in as parent, filter mappings using the parent's email (username)
        const filterKeyword = role === "parent" ? username : "";
        
        const res = await parentStudentApi.getAll(1, 100, filterKeyword);
        if (res.statusCode === 200 && res.data) {
          const parentItems = res.data.items || [];
          const allChildren: ChildItem[] = [];
          parentItems.forEach((p) => {
            if (p.children) {
              allChildren.push(...p.children);
            }
          });

          // Loại bỏ các học sinh trùng lặp bằng studentId
          const uniqueChildren: ChildItem[] = [];
          const seenIds = new Set<number>();
          allChildren.forEach((child) => {
            if (!seenIds.has(child.studentId)) {
              seenIds.add(child.studentId);
              uniqueChildren.push(child);
            }
          });

          setChildren(uniqueChildren);
          if (uniqueChildren.length > 0) {
            setSelectedChild(uniqueChildren[0]);
          }
        } else {
          setError(
            res.message
              ? t(`backendMessages.${res.message}`, { defaultValue: res.message })
              : t("schedules.loadChildrenError", { defaultValue: "Không thể tải danh sách học sinh." })
          );
        }
      } catch (err) {
        console.error("Failed to load children list", err);
        setError(t("schedules.connectionError", { defaultValue: "Đã xảy ra lỗi khi kết nối hệ thống." }));
      } finally {
        setIsLoading(false);
      }
    }
    fetchChildren();
  }, [t]);

  return (
    <div className="space-y-6 w-full pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/[0.05] shadow-xs gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-brand-500/10 text-brand-500 rounded-xl hidden sm:block">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {t("sidebar.childSchedules", { defaultValue: "Lịch học của con" })}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t("sidebar.parentServices", { defaultValue: "Dịch vụ phụ huynh" })} - {t("sidebar.childSchedules", { defaultValue: "Lịch học của con" })}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/[0.05]">
          <Loader2 className="animate-spin h-8 w-8 text-brand-500" />
          <span className="mt-3 text-sm text-gray-500 dark:text-gray-400 font-medium">{t("schedules.loadingChildren", { defaultValue: "Đang tải danh sách học sinh..." })}</span>
        </div>
      ) : error ? (
        <div className="rounded-xl bg-red-50/70 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-5 flex items-start gap-4 max-w-2xl mx-auto">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-red-800 dark:text-red-300">{t("schedules.loadError", { defaultValue: "Lỗi tải dữ liệu" })}</h4>
            <p className="mt-1 text-xs text-red-700 dark:text-red-400 leading-relaxed">{error}</p>
          </div>
        </div>
      ) : children.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] p-10 text-center max-w-2xl mx-auto space-y-4">
          <div className="mx-auto w-12 h-12 bg-amber-50 dark:bg-amber-950/20 rounded-full flex items-center justify-center text-amber-500">
            <Users className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-gray-900 dark:text-white">{t("schedules.noChildrenLinked", { defaultValue: "Chưa liên kết học sinh" })}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
              {t("schedules.noChildrenLinkedDesc", { defaultValue: "Tài khoản phụ huynh của bạn hiện tại chưa được liên kết với bất kỳ học sinh nào trong hệ thống. Vui lòng liên hệ với trung tâm để cấu hình liên kết." })}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Children Selector Tab List */}
          {children.length > 1 ? (
            <div className="bg-white dark:bg-white/[0.03] p-4 rounded-2xl border border-gray-100 dark:border-white/[0.05] shadow-xs">
              <span className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                {t("schedules.selectChildToView", { defaultValue: "Chọn con cần xem lịch:" })}
              </span>
              <div className="flex flex-wrap gap-3">
                {children.map((child) => {
                  const isActive = selectedChild?.studentId === child.studentId;
                  return (
                    <button
                      key={child.studentId}
                      type="button"
                      onClick={() => setSelectedChild(child)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition duration-200 cursor-pointer ${
                        isActive
                          ? "bg-brand-500 border-brand-500 text-white shadow-md shadow-brand-500/15"
                          : "bg-white border-gray-200 text-gray-650 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-750"
                      }`}
                    >
                      <User className={`w-4 h-4 ${isActive ? "text-white" : "text-gray-400"}`} />
                      <span>{child.studentName || `Học sinh ID: ${child.studentId}`}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            // Only 1 child - show a beautiful info card banner instead of tabs
            <div className="bg-white dark:bg-white/[0.03] p-4 px-6 rounded-2xl border border-gray-100 dark:border-white/[0.05] shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-brand-500/10 text-brand-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {t("schedules.viewingScheduleOf", { defaultValue: "Đang xem lịch học của con:" })}
                  </span>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    {selectedChild?.studentName || `Học sinh ID: ${selectedChild?.studentId}`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Calendar View */}
          {selectedChild && (
            <div className="animate-fadeIn">
              <PersonalScheduleCalendar
                type="student"
                studentId={selectedChild.studentId}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

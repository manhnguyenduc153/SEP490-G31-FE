"use client";

import React, { useState, useEffect } from "react";
import { FileText, Download, Clock, AlertTriangle, Trophy, Target } from "lucide-react";
import { homeworkApi, HomeworkDto } from "@/services/homework.api";
import { ENV } from "@/config/env";

interface ClassDetailHomeworkTabProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itemDetail: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

export default function ClassDetailHomeworkTab({
  itemDetail,
  t,
}: ClassDetailHomeworkTabProps) {
  const [homeworks, setHomeworks] = useState<HomeworkDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const classId = itemDetail?.id;
    if (!classId) return;

    let active = true;
    async function loadHomeworks() {
      setIsLoading(true);
      try {
        const res = await homeworkApi.getHomeworkByClass(classId);
        if (active && res.success && res.data) {
          setHomeworks(res.data);
        }
      } catch (err) {
        console.error("Failed to load homeworks", err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadHomeworks();
    return () => {
      active = false;
    };
  }, [itemDetail?.id]);

  const isExpired = (dueDateStr?: string) => {
    if (!dueDateStr) return false;
    const dueDate = new Date(dueDateStr);
    return dueDate < new Date();
  };

  const getFullFileUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return `${ENV.API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs p-6 space-y-6 animate-fadeIn">
      <h3 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-50 dark:border-gray-800 pb-3">
        <FileText className="w-5 h-5 text-brand-500" />
        <span>{t("class.homeworkTitle", { defaultValue: "Danh sách bài tập" })}</span>
      </h3>
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 text-sm">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          Đang tải danh sách bài tập...
        </div>
      ) : homeworks.length === 0 ? (
        <p className="text-xs text-gray-450 text-center py-10 italic border border-dashed border-gray-250 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-950/20">
          {t("class.noHomeworks", { defaultValue: "Chưa có bài tập nào được giao cho lớp này." })}
        </p>
      ) : (
        <div className="space-y-4">
          {homeworks.map((hw) => {
            const expired = isExpired(hw.dueDate);
            return (
              <div
                key={hw.id}
                className="p-5 rounded-xl border border-gray-150 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xs hover:border-brand-300 dark:hover:border-brand-500 transition-colors space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={hw.title}>
                      {hw.title}
                    </h4>
                    {hw.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed block whitespace-pre-wrap">
                        {hw.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="shrink-0 flex items-center gap-2">
                    {expired ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-655 dark:bg-rose-500/10 dark:text-rose-455 border border-rose-100/50 dark:border-rose-950/30">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {t("class.statusExpiredHomework", { defaultValue: "Đã hết hạn" })}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-950/30 animate-pulse">
                        <Clock className="w-3.5 h-3.5" />
                        {t("class.statusActiveHomework", { defaultValue: "Đang diễn ra" })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-gray-50 dark:border-gray-850 text-xs text-gray-500">
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {hw.dueDate && (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                        <span>{t("class.dueDate", { defaultValue: "Hạn nộp" })}: <strong className="text-gray-700 dark:text-gray-300">{new Date(hw.dueDate).toLocaleString(t("locale", { defaultValue: "vi-VN" }))}</strong></span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                      <span>{t("class.totalScore", { defaultValue: "Điểm tối đa" })}: <strong className="text-gray-700 dark:text-gray-300">{hw.totalScore}</strong></span>
                    </span>
                    {hw.skill && (
                      <span className="inline-flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                        <span>{t("class.skill", { defaultValue: "Kỹ năng" })}: <strong className="text-gray-755 dark:text-gray-350 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{hw.skill}</strong></span>
                      </span>
                    )}
                  </div>

                  {hw.attachmentUrls && hw.attachmentUrls.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-400">{t("class.attachments", { defaultValue: "Tài liệu đính kèm" })}:</span>
                      {hw.attachmentUrls.map((url, idx) => (
                        <a
                          key={idx}
                          href={getFullFileUrl(url)}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 dark:text-brand-400 dark:bg-brand-500/10 dark:hover:bg-brand-500/20 border border-brand-200/50 dark:border-brand-900/30 rounded-lg transition-colors cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          File {idx + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

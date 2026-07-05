"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, FileText, Download, Eye, X } from "lucide-react";
import { learningMaterialApi, LearningMaterialItem } from "@/services/learningMaterial.api";
import { ENV } from "@/config/env";
import { createPortal } from "react-dom";

interface ClassDetailSyllabusTabProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itemDetail: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

export default function ClassDetailSyllabusTab({
  itemDetail,
  t,
}: ClassDetailSyllabusTabProps) {
  const [materials, setMaterials] = useState<LearningMaterialItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const courseId = itemDetail?.courseId;
    if (!courseId) return;

    let active = true;
    async function loadMaterials() {
      setIsLoading(true);
      try {
        const res = await learningMaterialApi.getAll(1, 100, "", null, courseId);
        if (active && res.success && res.data) {
          // Only show active materials (status = 1)
          const activeItems = res.data.items.filter((item) => item.status === 1);
          setMaterials(activeItems);
        }
      } catch (err) {
        console.error("Failed to load learning materials", err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadMaterials();
    return () => {
      active = false;
    };
  }, [itemDetail?.courseId]);

  const getFullFileUrl = (url?: string | null) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return `${ENV.API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const isPdf = (item: LearningMaterialItem) => {
    if (item.fileType?.toLowerCase() === "pdf") return true;
    if (item.fileUrl?.toLowerCase().endsWith(".pdf")) return true;
    return false;
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs p-6 space-y-6 animate-fadeIn">
      <h3 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-50 dark:border-gray-800 pb-3">
        <BookOpen className="w-5 h-5 text-brand-500" />
        <span>{t("class.syllabusTitle", { defaultValue: "Tài liệu học tập" })}</span>
      </h3>
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 text-sm">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          {t("class.loadingMaterials", { defaultValue: "Đang tải danh sách tài liệu..." })}
        </div>
      ) : materials.length === 0 ? (
        <p className="text-xs text-gray-450 text-center py-10 italic border border-dashed border-gray-250 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-950/20">
          {t("class.noMaterials", { defaultValue: "Không tìm thấy tài liệu học tập nào cho khóa học của lớp này." })}
        </p>
      ) : (
        <div className="space-y-4">
          {materials.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 p-4 rounded-xl border border-gray-150 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-955/20 hover:border-brand-300 dark:hover:border-brand-500 transition-colors items-center justify-between"
            >
              <div className="flex gap-4 items-center min-w-0 flex-1">
                <div className="shrink-0 p-3 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-xl">
                  <FileText className="w-6 h-6" />
                </div>
                
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={item.name}>
                    {item.name}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 block line-clamp-2">
                    {item.description || "Không có mô tả chi tiết."}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                {item.fileUrl && isPdf(item) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewTitle(item.name);
                      setPreviewUrl(getFullFileUrl(item.fileUrl));
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 hover:bg-brand-100 dark:hover:bg-brand-500/20 border border-brand-200 dark:border-brand-500/30 rounded-lg transition-colors cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    {t("class.btnPreview", { defaultValue: "Xem trước" })}
                  </button>
                )}
                
                {item.fileUrl && (
                  <a
                    href={getFullFileUrl(item.fileUrl)}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    {t("class.btnDownload", { defaultValue: "Tải xuống" })}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PDF Preview Modal via React Portal */}
      {previewUrl && mounted && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-fadeIn">
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-2xl max-w-[90vw] w-full h-[90vh] flex flex-col overflow-hidden animate-zoomIn">
            
            {/* Header */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
              <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-500" />
                <span className="truncate max-w-[70vw]">{previewTitle}</span>
              </h4>
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-655 dark:hover:text-gray-250 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body (PDF Iframe) */}
            <div className="flex-1 bg-gray-100 dark:bg-gray-955">
              <iframe
                src={`${previewUrl}#toolbar=1`}
                className="w-full h-full border-none"
                title={previewTitle}
              />
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex justify-end bg-gray-50/50 dark:bg-gray-900/50 gap-3">
              <a
                href={previewUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-theme-xs transition-colors cursor-pointer"
              >
                {t("class.btnDownloadFile", { defaultValue: "Tải file về máy" })}
              </a>
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-750 transition-colors cursor-pointer"
              >
                {t("class.btnClose", { defaultValue: "Đóng" })}
              </button>
            </div>
            
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

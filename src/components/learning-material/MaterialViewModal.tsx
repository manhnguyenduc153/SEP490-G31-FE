"use client";
import React from "react";
import { Modal } from "@/components/ui/modal";
import { LearningMaterialItem } from "@/services/learningMaterial.api";
import { ENV } from "@/config/env";
import { FileText, Download, Eye, X } from "lucide-react";
import { downloadFileFromUrl } from "@/utils";

interface MaterialViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  item: LearningMaterialItem | null;
  isLoadingDetail?: boolean;
}

export function MaterialViewModal({
  isOpen,
  onClose,
  t,
  item,
  isLoadingDetail = false,
}: MaterialViewModalProps) {
  if (!item) return null;

  const fullFileUrl = item.fileUrl ? (item.fileUrl.startsWith("http") ? item.fileUrl : `${ENV.API_BASE_URL}${item.fileUrl}`) : "";
  const ext = item.fileUrl?.split(".").pop()?.toLowerCase() || "";
  const isImage = ["png", "jpg", "jpeg", "webp", "gif"].includes(ext) || item.fileType?.startsWith("image/");
  const isPdf = ext === "pdf" || item.fileType === "application/pdf";
  const isAudio = ["mp3", "wav", "ogg"].includes(ext) || item.fileType?.startsWith("audio/");
  const isVideo = ["mp4", "webm", "ogg", "mov"].includes(ext) || item.fileType?.startsWith("video/");

  const handleDownload = () => {
    if (fullFileUrl) {
      downloadFileFromUrl(fullFileUrl, `${item.title || item.name || "tai_lieu"}.${ext || "file"}`);
    }
  };

  const renderPreview = () => {
    if (!item.fileUrl) return null;

    if (isImage) {
      return (
        <div className="flex flex-col items-center justify-center w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fullFileUrl}
            alt={item.title || item.name}
            className="max-h-[78vh] object-contain rounded-lg shadow-md w-auto h-auto max-w-full"
          />
        </div>
      );
    }

    if (isPdf) {
      return (
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-md bg-white w-full h-[80vh]">
          {/* Using #toolbar=1 to enable the built-in PDF viewer sidebar, page controls, and thumbnail reader */}
          <iframe
            src={`${fullFileUrl}#toolbar=1&navpanes=1`}
            className="w-full h-full border-0"
            title="PDF Preview"
          />
        </div>
      );
    }

    if (isAudio) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 text-center w-full">
          <FileText className="w-20 h-20 text-brand-500 mb-6 animate-pulse" />
          <audio controls className="w-full max-w-[500px]">
            <source src={fullFileUrl} type={item.fileType || undefined} />
            Your browser does not support the audio element.
          </audio>
        </div>
      );
    }

    if (isVideo) {
      return (
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-md bg-black flex justify-center w-full">
          <video controls className="w-full max-h-[78vh] outline-hidden">
            <source src={fullFileUrl} type={item.fileType || undefined} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-16 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 text-center w-full">
        <FileText className="w-20 h-20 text-gray-400 dark:text-gray-600 mb-4" />
        <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
          {t("learningMaterial.noPreview", { defaultValue: "Xem trước không khả dụng cho định dạng này." })}
        </p>
        <p className="text-sm text-gray-400 mt-2 font-mono">
          {item.fileUrl.split("/").pop()}
        </p>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={false} // Disable default close button to prevent overlapping with download button
      className="max-w-[1250px] w-[96vw] p-4 sm:p-5"
    >
      <div className="flex flex-col gap-4">
        {/* Header Block */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.05] pb-3 flex-wrap sm:flex-nowrap gap-3">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2.5 truncate max-w-[50%] shrink-0" title={item.title || item.name}>
            <Eye className="w-5 h-5 text-brand-500 shrink-0" />
            <span className="truncate">{item.title || item.name}</span>
          </h3>
          
          <div className="flex items-center gap-2 shrink-0">
            {/* Custom Download Button */}
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-700 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              {t("learningMaterial.downloadTooltip", { defaultValue: "Tải về" })}
            </button>

            {/* Custom Close Button in Header to prevent overlaps */}
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white transition-colors cursor-pointer"
              title={t("questionCategory.btnClose", { defaultValue: "Đóng" })}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Block */}
        {isLoadingDetail ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("questionCategory.loadingDetail", { defaultValue: "Đang tải chi tiết..." })}
            </p>
          </div>
        ) : (
          <div className="mt-1">
            {/* Render Preview Content */}
            {renderPreview()}
          </div>
        )}
      </div>
    </Modal>
  );
}

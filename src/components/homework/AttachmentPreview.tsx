"use client";

import React from "react";
import { Download, ExternalLink, File, FileAudio, FileText, FileVideo, Image as ImageIcon } from "lucide-react";
import { ENV } from "@/config/env";

interface AttachmentPreviewProps {
  urls?: string[];
  title?: string;
  compact?: boolean;
}

type AttachmentKind = "audio" | "video" | "image" | "pdf" | "document" | "other";

const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a", "aac", "flac"];
const VIDEO_EXTENSIONS = ["mp4", "mov", "m4v", "webm", "avi", "mkv"];
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];
const DOCUMENT_EXTENSIONS = ["doc", "docx"];

function formatUrl(url: string) {
  if (url.startsWith("/")) {
    return `${ENV.API_BASE_URL}${url}`;
  }
  return url;
}

function getFileName(url: string) {
  const cleanUrl = url.split("?")[0].split("#")[0];
  return decodeURIComponent(cleanUrl.split("/").pop() || "Tệp đính kèm");
}

function getExtension(url: string) {
  const fileName = getFileName(url).toLowerCase();
  return fileName.includes(".") ? fileName.split(".").pop() || "" : "";
}

function getAttachmentKind(url: string): AttachmentKind {
  const extension = getExtension(url);

  if (AUDIO_EXTENSIONS.includes(extension)) return "audio";
  if (VIDEO_EXTENSIONS.includes(extension)) return "video";
  if (IMAGE_EXTENSIONS.includes(extension)) return "image";
  if (extension === "pdf") return "pdf";
  if (DOCUMENT_EXTENSIONS.includes(extension)) return "document";

  return "other";
}

function getIcon(kind: AttachmentKind) {
  if (kind === "audio") return <FileAudio className="h-5 w-5 text-blue-500" />;
  if (kind === "video") return <FileVideo className="h-5 w-5 text-purple-500" />;
  if (kind === "image") return <ImageIcon className="h-5 w-5 text-emerald-500" />;
  if (kind === "pdf" || kind === "document") return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-gray-500" />;
}

function AttachmentBody({ url, kind, fileName, compact }: { url: string; kind: AttachmentKind; fileName: string; compact?: boolean }) {
  if (kind === "audio") {
    return (
      <audio controls className="mt-3 w-full">
        <source src={url} />
        Trình duyệt của bạn không hỗ trợ nghe audio trực tiếp.
      </audio>
    );
  }

  if (kind === "video") {
    return (
      <video controls preload="metadata" className="mt-3 max-h-[720px] w-full rounded-lg border border-gray-200 bg-black dark:border-gray-700">
        <source src={url} />
        Trình duyệt của bạn không hỗ trợ xem video trực tiếp.
      </video>
    );
  }

  if (kind === "image") {
    return (
      <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
        <img src={url} alt={fileName} className="max-h-[520px] w-full object-contain" />
      </div>
    );
  }

  if (kind === "pdf") {
    return (
      <iframe
        src={url}
        title={fileName}
        className={`${compact ? "h-[520px]" : "h-[calc(100vh-140px)] min-h-[760px]"} mt-3 w-full rounded-lg border border-gray-200 bg-white dark:border-gray-700`}
      />
    );
  }

  if (kind === "document") {
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

    return (
      <div className="mt-3">
        <iframe
          src={viewerUrl}
          title={fileName}
          className={`${compact ? "h-[520px]" : "h-[calc(100vh-140px)] min-h-[760px]"} w-full rounded-lg border border-gray-200 bg-white dark:border-gray-700`}
        />
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Nếu tài liệu Word không hiển thị, hãy dùng nút mở tệp vì Office viewer chỉ đọc được file có thể truy cập công khai.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
      Không hỗ trợ xem trước định dạng này. Bạn vẫn có thể mở hoặc tải tệp.
    </div>
  );
}

export default function AttachmentPreview({ urls = [], title = "Tệp đính kèm", compact = false }: AttachmentPreviewProps) {
  if (!urls.length) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      {urls.map((rawUrl, index) => {
        const url = formatUrl(rawUrl);
        const fileName = getFileName(rawUrl);
        const kind = getAttachmentKind(rawUrl);

        return (
          <div key={`${rawUrl}-${index}`} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {getIcon(kind)}
                <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{fileName}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.06]"
                  title="Mở tệp"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <a
                  href={url}
                  download
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.06]"
                  title="Tải xuống"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
            </div>
            <AttachmentBody url={url} kind={kind} fileName={fileName} compact={compact} />
          </div>
        );
      })}
    </div>
  );
}

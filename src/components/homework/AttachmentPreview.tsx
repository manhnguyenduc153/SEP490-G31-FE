"use client";

import React, { useEffect, useState } from "react";
import { Download, File, FileAudio, FileText, FileVideo, Image as ImageIcon } from "lucide-react";
import { ENV } from "@/config/env";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/modal";

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

function getFileName(url: string, fallback = "attachment") {
  const cleanUrl = url.split("?")[0].split("#")[0];
  return decodeURIComponent(cleanUrl.split("/").pop() || fallback);
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

function WordDocumentPreview({ url }: { url: string }) {
  const { t } = useTranslation();
  const [html, setHtml] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadDocument = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Could not load document");
        // @ts-ignore
        const mammoth: any = await import("mammoth");
        const result = await mammoth.convertToHtml({ arrayBuffer: await response.arrayBuffer() });
        if (isMounted) setHtml(result.value);
      } catch {
        if (isMounted) setHasError(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadDocument();
    return () => { isMounted = false; };
  }, [url]);

  if (isLoading) return <div className="mt-3 rounded-lg border border-gray-200 p-6 text-center text-sm text-gray-500 dark:border-gray-700">{t("common.loading")}</div>;
  if (hasError) return <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">{t("homework.wordPreviewHint")}</div>;

  return <div className="prose prose-sm mt-3 max-h-[70vh] max-w-none overflow-y-auto rounded-lg border border-gray-200 bg-white p-5 dark:prose-invert dark:border-gray-700 dark:bg-gray-900" dangerouslySetInnerHTML={{ __html: html }} />;
}

function AttachmentBody({ url, kind, fileName, compact, fillHeight = false }: { url: string; kind: AttachmentKind; fileName: string; compact?: boolean; fillHeight?: boolean }) {
  const { t } = useTranslation();
  if (kind === "audio") {
    return (
      <audio controls className="mt-3 w-full">
        <source src={url} />
        {t("homework.audioUnsupported")}
      </audio>
    );
  }

  if (kind === "video") {
    return (
      <video controls preload="metadata" className="mt-3 max-h-[720px] w-full rounded-lg border border-gray-200 bg-black dark:border-gray-700">
        <source src={url} />
        {t("homework.videoUnsupported")}
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
        className={`${fillHeight ? "h-full min-h-0" : compact ? "h-[520px]" : "h-[calc(100vh-140px)] min-h-[760px]"} ${fillHeight ? "" : "mt-3"} w-full rounded-lg border border-gray-200 bg-white dark:border-gray-700`}
      />
    );
  }

  if (kind === "document") {
    return getExtension(url) === "docx"
      ? <WordDocumentPreview url={url} />
      : <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">{t("homework.wordPreviewHint")}</div>;
  }

  return (
    <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
      {t("homework.previewUnsupported")}
    </div>
  );
}

export default function AttachmentPreview({ urls = [], title, compact = false }: AttachmentPreviewProps) {
  const { t } = useTranslation();
  if (!urls.length) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title || t("homework.attachmentsLabel")}</h3>
      {urls.map((rawUrl, index) => {
        const url = formatUrl(rawUrl);
        const fileName = getFileName(rawUrl, t("homework.attachmentFallback"));
        const kind = getAttachmentKind(rawUrl);

        return (
          <div key={`${rawUrl}-${index}`} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {getIcon(kind)}
                <a href={url} download className="truncate text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">{fileName}</a>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={url}
                  download
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.06]"
                  title={t("homework.downloadFile")}
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

export function AttachmentPreviewModal({ url, onClose }: { url: string | null; onClose: () => void }) {
  const { t } = useTranslation();
  if (!url) return null;

  const resolvedUrl = formatUrl(url);
  const fileName = getFileName(url, t("homework.attachmentFallback"));
  const kind = getAttachmentKind(url);

  return (
    <Modal isOpen={true} onClose={onClose} showCloseButton={false} className="m-3 h-[86vh] w-[90vw] max-w-[1320px] overflow-hidden rounded-2xl">
      <div className="absolute inset-0 flex min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{t("homework.previewAttachment")}</p>
            <h3 className="truncate text-base font-semibold text-gray-900 dark:text-white">{fileName}</h3>
          </div>
          <button type="button" onClick={onClose} className="ml-4 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-white" aria-label={t("common.close", { defaultValue: "Close" })}>×</button>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden bg-gray-100 p-4 dark:bg-gray-950">
          <AttachmentBody url={resolvedUrl} kind={kind} fileName={fileName} fillHeight />
        </main>
        <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">{t("common.close", { defaultValue: "Close" })}</button>
          <a href={resolvedUrl} download className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"><Download className="h-4 w-4" />{t("homework.downloadFile")}</a>
        </footer>
      </div>
    </Modal>
  );
}

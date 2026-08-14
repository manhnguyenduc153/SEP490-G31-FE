"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  Check,
  Clock,
  Eye,
  FileText,
  Filter,
  Info,
  Search,
  X,
} from "lucide-react";
import { homeworkApi, HomeworkDto, HomeworkSubmissionDto } from "@/services/homework.api";
import { useTranslation } from "react-i18next";
import AttachmentPreview, { AttachmentPreviewModal } from "./AttachmentPreview";
import { ENV } from "@/config/env";

interface HomeworkSubmissionsProps {
  homework: HomeworkDto;
  onBack: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

type TabKey = "submissions" | "detail";
type SubmissionStatusFilter = "all" | "submitted" | "late" | "graded" | "ungraded";
type ScoreFilter = "all" | "scored" | "unscored";

export default function HomeworkSubmissions({ homework, onBack, showToast }: HomeworkSubmissionsProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>("submissions");
  const [submissions, setSubmissions] = useState<HomeworkSubmissionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [gradingSubmissionId, setGradingSubmissionId] = useState<number | null>(null);
  const [score, setScore] = useState<number | "">("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<SubmissionStatusFilter>("all");
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");
  const [submittedFrom, setSubmittedFrom] = useState("");
  const [submittedTo, setSubmittedTo] = useState("");

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const res = await homeworkApi.getSubmissions(homework.id);
      if (res.success) {
        setSubmissions(res.data);
      }
    } catch (err) {
      console.error(err);
      showToast(t("homework.loadSubmissionsError"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homework.id]);

  const formatUrl = (url: string) => {
    if (url.startsWith("/")) {
      return `${ENV.API_BASE_URL}${url}`;
    }
    return url;
  };

  const getSubmissionStatus = (sub: HomeworkSubmissionDto) => {
    if (sub.status === 2 || sub.score !== null && sub.score !== undefined) {
      return { label: t("homework.submissionGraded"), className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" };
    }

    if (sub.status === 3) {
      return { label: t("homework.submissionLate"), className: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" };
    }

    return { label: t("homework.submissionSubmitted"), className: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" };
  };

  const filteredSubmissions = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const fromDate = submittedFrom ? new Date(`${submittedFrom}T00:00:00`) : null;
    const toDate = submittedTo ? new Date(`${submittedTo}T23:59:59`) : null;

    return submissions.filter((sub) => {
      const searchable = [
        sub.studentName,
        sub.studentCode,
        sub.studentEmail,
        sub.content,
        sub.teacherFeedback,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const hasScore = sub.score !== null && sub.score !== undefined;
      const submitDate = new Date(sub.submitTime);

      if (normalizedKeyword && !searchable.includes(normalizedKeyword)) return false;
      if (scoreFilter === "scored" && !hasScore) return false;
      if (scoreFilter === "unscored" && hasScore) return false;
      if (fromDate && submitDate < fromDate) return false;
      if (toDate && submitDate > toDate) return false;

      if (statusFilter === "submitted" && sub.status !== 1) return false;
      if (statusFilter === "late" && sub.status !== 3) return false;
      if (statusFilter === "graded" && !(sub.status === 2 || hasScore)) return false;
      if (statusFilter === "ungraded" && (sub.status === 2 || hasScore)) return false;

      return true;
    });
  }, [keyword, scoreFilter, statusFilter, submittedFrom, submittedTo, submissions]);

  const summary = useMemo(() => {
    const graded = submissions.filter((sub) => sub.status === 2 || sub.score !== null && sub.score !== undefined).length;
    const late = submissions.filter((sub) => sub.status === 3).length;
    return {
      total: submissions.length,
      graded,
      ungraded: submissions.length - graded,
      late,
    };
  }, [submissions]);

  const handleGrade = async (submissionId: number) => {
    if (score === "" || Number(score) < 0 || Number(score) > homework.totalScore) {
      showToast(t("homework.invalidScore", { max: homework.totalScore }), "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await homeworkApi.gradeSubmission(submissionId, {
        score: Number(score),
        teacherFeedback: feedback,
      });

      if (res.success) {
        showToast(t("homework.gradeSuccess"), "success");
        setGradingSubmissionId(null);
        fetchSubmissions();
      } else {
        showToast(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("homework.gradeError"), "error");
      }
    } catch (err) {
      console.error(err);
      showToast(t("homework.systemError"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startGrading = (sub: HomeworkSubmissionDto) => {
    setGradingSubmissionId(sub.id);
    setScore(sub.score ?? "");
    setFeedback(sub.teacherFeedback || "");
  };

  const resetFilters = () => {
    setKeyword("");
    setStatusFilter("all");
    setScoreFilter("all");
    setSubmittedFrom("");
    setSubmittedTo("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-4 dark:border-gray-800 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{homework.title}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {homework.className || t("homework.classFallback")} | {homework.skill || "General"} | {t("homework.totalScore")}: {homework.totalScore}
          </p>
        </div>
        <button onClick={onBack} className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
          {t("homework.back")}
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab("submissions")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "submissions"
              ? "border-brand-500 text-brand-600"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <FileText className="h-4 w-4" />
          {t("homework.submissionsTab")}
        </button>
        <button
          onClick={() => setActiveTab("detail")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "detail"
              ? "border-brand-500 text-brand-600"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <Info className="h-4 w-4" />
          {t("homework.detailTab")}
        </button>
      </div>

      {activeTab === "submissions" ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label={t("homework.submissionSubmitted")} value={summary.total} />
            <SummaryCard label={t("homework.submissionGraded")} value={summary.graded} />
            <SummaryCard label={t("homework.submissionUngraded")} value={summary.ungraded} />
            <SummaryCard label={t("homework.submissionLate")} value={summary.late} />
          </div>

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
              <Filter className="h-4 w-4" />
              {t("homework.submissionFilters")}
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder={t("homework.searchSubmissionsPlaceholder")}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                />
              </label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as SubmissionStatusFilter)} className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                <option value="all">{t("homework.allStatuses")}</option>
                <option value="submitted">{t("homework.submissionSubmitted")}</option>
                <option value="late">{t("homework.submissionLate")}</option>
                <option value="graded">{t("homework.submissionGraded")}</option>
                <option value="ungraded">{t("homework.submissionUngraded")}</option>
              </select>
              <select value={scoreFilter} onChange={(e) => setScoreFilter(e.target.value as ScoreFilter)} className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                <option value="all">{t("homework.allScores")}</option>
                <option value="scored">{t("homework.hasScore")}</option>
                <option value="unscored">{t("homework.noScore")}</option>
              </select>
              <input type="date" value={submittedFrom} onChange={(e) => setSubmittedFrom(e.target.value)} className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
              <input type="date" value={submittedTo} onChange={(e) => setSubmittedTo(e.target.value)} className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span>{t("homework.showingSubmissions", { shown: filteredSubmissions.length, total: submissions.length })}</span>
              <button onClick={resetFilters} className="font-medium text-brand-600 hover:underline">
                {t("homework.clearFilters")}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <Table>
              <TableHeader className="bg-gray-50/70 dark:bg-gray-800/40">
                <TableRow>
                  <TableCell className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">{t("homework.colStudent")}</TableCell>
                  <TableCell className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">{t("homework.colSubmitTime")}</TableCell>
                  <TableCell className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">{t("homework.colContentFile")}</TableCell>
                  <TableCell className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">{t("homework.colStatus")}</TableCell>
                  <TableCell className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">{t("homework.colScoreFeedback")}</TableCell>
                  <TableCell className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">{t("homework.colActions")}</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-gray-500">{t("common.loading", { defaultValue: "Đang tải..." })}</TableCell>
                  </TableRow>
                ) : filteredSubmissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-gray-500">{t("homework.noMatchingSubmissions")}</TableCell>
                  </TableRow>
                ) : (
                  filteredSubmissions.map((sub) => {
                    const status = getSubmissionStatus(sub);
                    return (
                      <TableRow key={sub.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                        <TableCell className="px-5 py-4 font-medium text-gray-900 dark:text-white">
                          {sub.studentName || "-"} <br />
                          <span className="text-xs text-gray-500">{sub.studentCode || sub.studentEmail || "-"}</span>
                        </TableCell>
                        <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                          {new Date(sub.submitTime).toLocaleString("vi-VN")}
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          <div className="flex max-w-xs flex-col gap-1">
                            {sub.content && (
                              <div className="rounded bg-gray-100 p-2 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300" title={sub.content}>
                                <span className="line-clamp-2">{sub.content}</span>
                              </div>
                            )}
                            {sub.attachmentUrls && sub.attachmentUrls.length > 0 && (
                              <div className="mt-1 flex flex-col gap-1">
                                {sub.attachmentUrls.map((url, idx) => (
                                  <div key={`${url}-${idx}`} className="flex items-center gap-1 text-xs">
                                    <a
                                      href={formatUrl(url)}
                                      download
                                      className="max-w-[150px] truncate text-left text-blue-600 hover:underline"
                                    >
                                      {url.split("/").pop()}
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => setPreviewAttachmentUrl(url)}
                                      className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-gray-800"
                                      title={t("homework.previewAttachment")}
                                      aria-label={t("homework.previewAttachment")}
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${status.className}`}>
                            {status.label}
                          </span>
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          {gradingSubmissionId === sub.id ? (
                            <div className="flex min-w-48 flex-col gap-2">
                              <input
                                type="number"
                                placeholder={t("homework.scorePlaceholder")}
                                value={score}
                                onChange={(e) => setScore(e.target.value === "" ? "" : Number(e.target.value))}
                                min="0"
                                max={homework.totalScore}
                                className="h-9 w-24 rounded border border-gray-200 px-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                              />
                              <textarea
                                placeholder={t("homework.feedbackPlaceholder")}
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                rows={2}
                                className="w-full rounded border border-gray-200 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
                              />
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {sub.score !== null && sub.score !== undefined ? `${sub.score}/${homework.totalScore}` : t("homework.submissionUngraded")}
                              </span>
                              {sub.teacherFeedback && <span className="max-w-xs truncate text-xs text-gray-500" title={sub.teacherFeedback}>{sub.teacherFeedback}</span>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-right">
                          {gradingSubmissionId === sub.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleGrade(sub.id)} disabled={isSubmitting} className="rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50">
                                <Check className="h-5 w-5" />
                              </button>
                              <button onClick={() => setGradingSubmissionId(null)} className="rounded p-1 text-red-600 hover:bg-red-50">
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => startGrading(sub)} className="text-sm font-medium text-brand-600 hover:underline">
                              {t("homework.grade")}
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <AttachmentPreviewModal url={previewAttachmentUrl} onClose={() => setPreviewAttachmentUrl(null)} />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
          <div className="space-y-5">
            <section className="rounded-lg border border-gray-200 p-5 dark:border-gray-800">
              <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">{t("homework.descriptionTitle")}</h3>
              <div className="min-h-28 rounded-lg bg-gray-50 p-4 text-sm leading-6 text-gray-700 dark:bg-gray-950 dark:text-gray-300">
                {homework.description || t("homework.noDescription")}
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 p-5 dark:border-gray-800">
              {homework.attachmentUrls && homework.attachmentUrls.length > 0 ? (
                <AttachmentPreview urls={homework.attachmentUrls} title={t("homework.previewTitle")} />
              ) : (
                <div className="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-500 dark:bg-gray-950">
                  {t("homework.noAttachments")}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            <InfoItem icon={<Calendar className="h-4 w-4" />} label={t("homework.colDueDate")} value={homework.dueDate ? new Date(homework.dueDate).toLocaleString("vi-VN") : t("homework.noDueDate")} />
            <InfoItem icon={<Clock className="h-4 w-4" />} label={t("homework.createdAt")} value={new Date(homework.createdAt).toLocaleString("vi-VN")} />
            <InfoItem icon={<FileText className="h-4 w-4" />} label={t("homework.colSkill")} value={homework.skill || "General"} />
            <InfoItem icon={<Check className="h-4 w-4" />} label={t("homework.totalScore")} value={`${homework.totalScore}`} />
            <InfoItem icon={<Info className="h-4 w-4" />} label={t("homework.colStatus")} value={homework.status === 1 ? t("homework.statusActive") : t("homework.statusInactive")} />
            <InfoItem icon={<FileText className="h-4 w-4" />} label={t("homework.fileCount")} value={`${homework.attachmentUrls?.length || 0}`} />
          </aside>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
        {icon}
        {label}
      </div>
      <div className="break-words text-sm font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

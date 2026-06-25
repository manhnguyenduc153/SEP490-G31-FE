"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";

interface ClassViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  itemDetail: any;
  isLoading: boolean;
  formError: string | null;
}

export function ClassViewModal({
  isOpen,
  onClose,
  t,
  itemDetail,
  isLoading,
  formError,
}: ClassViewModalProps) {
  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return t("class.statusPlanning", { defaultValue: "Sắp mở" });
      case 1: return t("class.statusActive", { defaultValue: "Đang học" });
      case 2: return t("class.statusCompleted", { defaultValue: "Hoàn thành" });
      case 3: return t("class.statusCancelled", { defaultValue: "Đã hủy" });
      default: return "";
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-500";
      case 1: return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500";
      case 2: return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-500";
      case 3: return "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-500";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[650px] p-6 sm:p-8"
    >
      <div className="flex flex-col gap-4 max-h-[85vh] overflow-y-auto pr-2 animate-fadeIn">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("class.viewTitle")}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("class.viewDesc")}
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-500 dark:text-gray-400 text-sm">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-brand-500 border-t-transparent mb-3"></div>
            {t("class.loadingDetail")}
          </div>
        ) : formError ? (
          <p className="text-sm text-error-500 dark:text-error-400 py-4 text-center">{formError}</p>
        ) : !itemDetail ? (
          <p className="text-sm text-gray-400 py-4 text-center">Không tìm thấy thông tin chi tiết.</p>
        ) : (
          <div className="space-y-6 mt-2">
            {/* General Info Grid */}
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 pb-5 border-b border-gray-100 dark:border-gray-800">
              <div>
                <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  {t("class.colCode")}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5 block">
                  {itemDetail.code}
                </span>
              </div>

              <div>
                <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  {t("class.formStatusLabel")}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold mt-1 ${getStatusColor(itemDetail.status)}`}>
                  {getStatusText(itemDetail.status)}
                </span>
              </div>

              <div className="col-span-2">
                <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  {t("class.colName")}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5 block">
                  {itemDetail.name}
                </span>
              </div>

              <div>
                <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  {t("class.formStartDateLabel")}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 block">
                  {itemDetail.startDate ? new Date(itemDetail.startDate).toLocaleDateString("vi-VN") : "-"}
                </span>
              </div>

              <div>
                <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  {t("class.formEndDateLabel")}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 block">
                  {itemDetail.endDate ? new Date(itemDetail.endDate).toLocaleDateString("vi-VN") : "-"}
                </span>
              </div>

              <div>
                <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  {t("class.colCourse")}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 block">
                  {itemDetail.courseName || t("class.noCourse")}
                </span>
              </div>

              <div>
                <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  {t("class.colTeacher")}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 block font-medium">
                  {itemDetail.teacherName || t("class.noTeacher")}
                </span>
              </div>

              {itemDetail.scheduleDisplay && (
                <div className="col-span-2">
                  <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    {t("class.colSchedules")}
                  </span>
                  <span className="text-sm text-brand-600 dark:text-brand-400 mt-0.5 block font-medium">
                    {itemDetail.scheduleDisplay}
                  </span>
                </div>
              )}

              {itemDetail.description && (
                <div className="col-span-2">
                  <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    {t("class.formDescLabel")}
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 block whitespace-pre-line bg-gray-50 dark:bg-gray-800 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                    {itemDetail.description}
                  </p>
                </div>
              )}
            </div>

            {/* Students List */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center justify-between">
                <span>{t("class.formStudentsLabel")}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {itemDetail.studentClasses?.length || 0} {t("class.colStudents").toLowerCase()}
                </span>
              </h4>

              {!itemDetail.studentClasses || itemDetail.studentClasses.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4 italic border border-dashed border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50/50">
                  Chưa có học sinh nào được gán vào lớp học này.
                </p>
              ) : (
                <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 font-medium">
                        <th className="p-2.5 w-[10%] text-center">#</th>
                        <th className="p-2.5 w-[25%]">{t("class.colCode")}</th>
                        <th className="p-2.5 w-[35%]">{t("class.colName")}</th>
                        <th className="p-2.5 w-[30%]">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {itemDetail.studentClasses.map((sc: any, idx: number) => (
                        <tr key={sc.id || sc.studentId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10">
                          <td className="p-2.5 text-center text-gray-400">{idx + 1}</td>
                          <td className="p-2.5 font-medium text-gray-900 dark:text-white">{sc.student?.code}</td>
                          <td className="p-2.5 text-gray-700 dark:text-gray-300">{sc.student?.name}</td>
                          <td className="p-2.5 text-gray-500 dark:text-gray-400 truncate max-w-[120px]">{sc.student?.email || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cancel button */}
        <div className="flex justify-end pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
}

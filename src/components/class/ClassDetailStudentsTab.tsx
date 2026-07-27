"use client";

import React from "react";
import { Users } from "lucide-react";

interface ClassDetailStudentsTabProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itemDetail: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

export default function ClassDetailStudentsTab({
  itemDetail,
  t,
}: ClassDetailStudentsTabProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs p-6 animate-fadeIn">
      <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-800 pb-3 mb-4">
        <h3 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-brand-500" />
          <span>{t("class.tabStudentList", { defaultValue: "Danh sách học sinh trong lớp" })}</span>
        </h3>
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          {itemDetail.studentClasses?.length || 0} {t("class.colStudents").toLowerCase()}
        </span>
      </div>
      
      {!itemDetail.studentClasses || itemDetail.studentClasses.length === 0 ? (
        <p className="text-xs text-gray-450 text-center py-10 italic border border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-950/20">
          {t("class.noStudentsAssigned")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-450 dark:text-gray-400 font-semibold bg-gray-50/50 dark:bg-gray-800/40">
                <th className="px-4 py-3 w-[8%] text-xs font-bold uppercase tracking-wider">#</th>
                <th className="px-4 py-3 w-[20%] text-xs font-bold uppercase tracking-wider">{t("student.colCode", { defaultValue: "Mã học sinh" })}</th>
                <th className="px-4 py-3 w-[30%] text-xs font-bold uppercase tracking-wider">{t("student.colName", { defaultValue: "Học sinh" })}</th>
                <th className="px-4 py-3 w-[25%] text-xs font-bold uppercase tracking-wider">{t("student.colEmail", { defaultValue: "Email" })}</th>
                <th className="px-4 py-3 w-[17%] text-xs font-bold uppercase tracking-wider">Hình thức học</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {itemDetail.studentClasses.map((sc: any, idx: number) => (
                <tr key={sc.id || sc.studentId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-gray-500">{idx + 1}</td>
                  <td className="px-4 py-3.5 font-semibold text-gray-900 dark:text-white">{sc.student?.code || "-"}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xs">
                        {sc.student?.name ? sc.student.name.charAt(0).toUpperCase() : "?"}
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">{sc.student?.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400">{sc.student?.email || t("class.noEmail")}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      sc.enrollType === 1
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                        : "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
                    }`}>
                      {sc.enrollType === 1 ? "Online" : "Offline"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

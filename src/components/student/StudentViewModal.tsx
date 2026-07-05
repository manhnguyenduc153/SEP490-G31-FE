"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { StudentItem, studentApi } from "@/services/student.api";
import { ENV } from "@/config/env";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  School,
  GraduationCap,
  Users,
  FileText,
  X,
  ShieldAlert,
} from "lucide-react";

interface StudentViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  studentId: number | null;
}

export function StudentViewModal({
  isOpen,
  onClose,
  t,
  studentId,
}: StudentViewModalProps) {
  const [student, setStudent] = useState<StudentItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && studentId) {
      const targetId = studentId;
      async function loadStudent() {
        setIsLoading(true);
        setError(null);
        try {
          const res = await studentApi.getById(targetId);
          if (res.success && res.data) {
            setStudent(res.data);
          } else {
            setError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("student.systemError"));
          }
        } catch {
          setError(t("student.systemError"));
        } finally {
          setIsLoading(false);
        }
      }
      loadStudent();
    } else {
      setStudent(null);
    }
  }, [isOpen, studentId, t]);

  // Helper to build full image URL
  const getImageUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${ENV.API_BASE_URL}${path}`;
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 1:
        return t("student.formStatusActive", { defaultValue: "Hoạt động" });
      case 0:
        return t("student.formStatusInactive", { defaultValue: "Ngưng hoạt động" });
      case 2:
        return t("student.formStatusSuspended", { defaultValue: "Bị đình chỉ" });
      case 3:
        return t("student.formStatusGraduated", { defaultValue: "Đã tốt nghiệp" });
      default:
        return "";
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 1:
        return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500 border-emerald-250 dark:border-emerald-500/20";
      case 0:
        return "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-500 border-gray-250 dark:border-gray-500/20";
      case 2:
        return "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-500 border-rose-250 dark:border-rose-500/20";
      case 3:
        return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-500 border-blue-250 dark:border-blue-500/20";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[900px] w-[95vw] p-6 sm:p-8"
    >
      <div className="flex flex-col gap-5 max-h-[85vh] overflow-y-auto pr-1 animate-fadeIn">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {t("student.viewTitle", { defaultValue: "Chi tiết học sinh" })}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t("student.viewDesc", { defaultValue: "Thông tin chi tiết hồ sơ học sinh." })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400 text-sm">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent mb-3"></div>
            {t("common.loading", { defaultValue: "Đang tải..." })}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldAlert className="w-12 h-12 text-rose-500 mb-3" />
            <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>
          </div>
        ) : !student ? (
          <p className="text-sm text-gray-450 py-10 text-center">{t("common.noData", { defaultValue: "Không có dữ liệu" })}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-2 items-start">
            
            {/* Left: Avatar Profile Summary (4 cols) */}
            <div className="md:col-span-4 flex flex-col items-center p-5 bg-gray-50/40 dark:bg-gray-950/40 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
              {student.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getImageUrl(student.avatar) as string}
                  alt={student.name}
                  className="w-24 h-24 rounded-full object-cover shadow-sm border-2 border-white dark:border-gray-850 shrink-0"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-brand-50/80 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-3xl shadow-xs border-2 border-white dark:border-gray-850 shrink-0">
                  {student.name.charAt(0).toUpperCase()}
                </div>
              )}

              <h4 className="text-base font-bold text-gray-900 dark:text-white mt-4">
                {student.name}
              </h4>
              <span className="text-xs font-semibold text-brand-600 dark:text-brand-450 mt-1">
                {student.code}
              </span>

              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border mt-3 ${getStatusColor(student.status)}`}>
                {getStatusText(student.status)}
              </span>
            </div>

            {/* Right: Detailed Fields (8 cols) */}
            <div className="md:col-span-8 space-y-6">
              
              {/* Basic Information */}
              <div className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-50 dark:border-gray-800/80 pb-2.5">
                  <User className="w-4 h-4 text-brand-500" />
                  {t("student.basicInfo", { defaultValue: "Thông tin cơ bản" })}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  {/* Email */}
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      Email
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {student.email || t("student.noEmail", { defaultValue: "Chưa cập nhật" })}
                      </span>
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      {t("student.formPhoneLabel", { defaultValue: "Số điện thoại" })}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {student.phone || t("student.noPhone", { defaultValue: "Chưa cập nhật" })}
                      </span>
                    </div>
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      {t("student.formDobLabel", { defaultValue: "Ngày sinh" })}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {student.dob ? new Date(student.dob).toLocaleDateString("vi-VN") : "-"}
                      </span>
                    </div>
                  </div>

                  {/* Gender */}
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      {t("student.formGenderLabel", { defaultValue: "Giới tính" })}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5 block">
                      {student.gender === true
                        ? t("student.formGenderMale", { defaultValue: "Nam" })
                        : student.gender === false
                        ? t("student.formGenderFemale", { defaultValue: "Nữ" })
                        : "-"}
                    </span>
                  </div>

                  {/* School */}
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      {t("student.formSchoolNameLabel", { defaultValue: "Trường học" })}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <School className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {student.schoolName || "-"}
                      </span>
                    </div>
                  </div>

                  {/* Grade */}
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      {t("student.formGradeLevelLabel", { defaultValue: "Khối lớp" })}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <GraduationCap className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {student.gradeLevel ? `${student.gradeLevel}` : "-"}
                      </span>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="sm:col-span-2">
                    <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      {t("student.colAddress", { defaultValue: "Địa chỉ" })}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {student.address || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parent Information */}
              <div className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-50 dark:border-gray-800/80 pb-2.5">
                  <Users className="w-4 h-4 text-brand-500" />
                  {t("student.parentInfo", { defaultValue: "Thông tin phụ huynh" })}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  {/* Parent Name */}
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      {t("student.formParentNameLabel", { defaultValue: "Họ tên phụ huynh" })}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5 block">
                      {student.parentName || t("student.noParentName", { defaultValue: "Chưa cập nhật" })}
                    </span>
                  </div>

                  {/* Parent Phone */}
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      {t("student.formParentPhoneLabel", { defaultValue: "SĐT phụ huynh" })}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {student.parentPhone || t("student.noParentPhone", { defaultValue: "Chưa cập nhật" })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description / Notes */}
              {student.description && (
                <div className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-50 dark:border-gray-800/80 pb-2.5">
                    <FileText className="w-4 h-4 text-brand-500" />
                    {t("student.formDescLabel", { defaultValue: "Ghi chú" })}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line bg-gray-50/40 dark:bg-gray-950/20 p-3 rounded-xl border border-gray-150 dark:border-gray-800/80">
                    {student.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-800/60 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
          >
            {t("student.btnClose", { defaultValue: "Đóng" })}
          </button>
        </div>
      </div>
    </Modal>
  );
}

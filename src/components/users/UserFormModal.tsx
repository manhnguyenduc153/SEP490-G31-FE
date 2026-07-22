"use client";
import React from "react";
import { Modal } from "@/components/ui/modal";
import { UserItem } from "@/services/user.api";

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  editingItem: UserItem | null;
  formUsername: string;
  setFormUsername: (val: string) => void;
  formEmail: string;
  setFormEmail: (val: string) => void;
  formPhone: string;
  setFormPhone: (val: string) => void;
  formRole: string;
  setFormRole: (val: string) => void;
  rolesList: string[];
  formError: string | null;
  isSubmitting: boolean;
  handleSubmit: (e: React.FormEvent) => void;
}

export function UserFormModal({
  isOpen,
  onClose,
  t,
  editingItem,
  formUsername,
  setFormUsername,
  formEmail,
  setFormEmail,
  formPhone,
  setFormPhone,
  formRole,
  setFormRole,
  rolesList,
  formError,
  isSubmitting,
  handleSubmit,
}: UserFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[560px] p-6 sm:p-8"
    >
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {editingItem
            ? t("user.editTitle", { defaultValue: "Chỉnh sửa người dùng" })
            : t("user.createTitle", { defaultValue: "Thêm người dùng mới" })}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {editingItem
            ? t("user.editDesc", { defaultValue: "Cập nhật thông tin của người dùng." })
            : t("user.createDesc", { defaultValue: "Điền thông tin để tạo tài khoản mới. Mật khẩu mặc định là 123456." })}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Username (Disabled when editing) */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("user.formUsernameLabel", { defaultValue: "Tên đăng nhập" })} <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={!!editingItem}
              maxLength={150}
              value={formUsername}
              onChange={(e) => setFormUsername(e.target.value)}
              placeholder={t("user.formUsernamePlaceholder", { defaultValue: "Nhập tên đăng nhập..." })}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-white/5 dark:disabled:text-white/30 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("user.formEmailLabel", { defaultValue: "Địa chỉ Email" })} <span className="text-error-500">*</span>
            </label>
            <input
              type="email"
              required
              maxLength={150}
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder={t("user.formEmailPlaceholder", { defaultValue: "Nhập địa chỉ email..." })}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("user.formPhoneLabel", { defaultValue: "Số điện thoại" })}
            </label>
            <input
              type="text"
              maxLength={20}
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              placeholder={t("user.formPhonePlaceholder", { defaultValue: "Nhập số điện thoại..." })}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("user.formRoleLabel", { defaultValue: "Vai trò hệ thống" })} <span className="text-error-500">*</span>
            </label>
            {(() => {
              const isEditingAdmin = formRole.toLowerCase() === "admin" || editingItem?.roles?.some(r => r.toLowerCase() === "admin");
              const effectiveRolesList = isEditingAdmin && !rolesList.some(r => r.toLowerCase() === "admin")
                ? ["Admin", ...rolesList]
                : rolesList;

              return (
                <div>
                  <div className="relative z-20 bg-transparent">
                    <select
                      required
                      disabled={isEditingAdmin}
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 appearance-none focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:ring-brand-500/10 dark:focus:border-brand-800 shadow-theme-xs disabled:bg-gray-100 dark:disabled:bg-white/5 disabled:cursor-not-allowed"
                    >
                      <option value="" disabled className="dark:bg-gray-900 dark:text-gray-400">
                        {t("user.formRolePlaceholder", { defaultValue: "Chọn vai trò..." })}
                      </option>
                      {effectiveRolesList.map((r) => (
                        <option key={r} value={r} className="dark:bg-gray-900 dark:text-gray-400">
                          {t(`roles.names.${r}`, { defaultValue: r })}
                        </option>
                      ))}
                    </select>
                    <span className="absolute z-30 text-gray-500 -translate-y-1/2 right-4 top-1/2 dark:text-gray-400 pointer-events-none">
                      <svg className="stroke-current" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3.8335 5.9165L8.00016 10.0832L12.1668 5.9165" stroke="" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                  {isEditingAdmin && (
                    <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                      {t("backendMessages.ERR_CANNOT_ASSIGN_ADMIN_ROLE", { defaultValue: "Không thể gán vai trò Admin cho người dùng mới" })}
                    </p>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Form-level error */}
          {formError && (
            <p className="text-sm text-error-500 dark:text-error-400">{formError}</p>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              {t("user.btnCancel", { defaultValue: "Hủy" })}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting
                ? t("user.btnSaving", { defaultValue: "Đang lưu..." })
                : editingItem
                ? t("user.btnUpdate", { defaultValue: "Cập nhật" })
                : t("user.btnSave", { defaultValue: "Tạo mới" })}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

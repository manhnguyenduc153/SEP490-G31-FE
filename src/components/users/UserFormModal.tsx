"use client";
import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { UserItem } from "@/services/user.api";
import { userApi } from "@/services/user.api";
import { useTranslation } from "react-i18next";
import { z } from "zod";

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: UserItem | null;
  rolesList: string[];
  onSubmitSuccess: (savedItem: UserItem, isEdit: boolean) => void;
}

export function UserFormModal({
  isOpen,
  onClose,
  editingItem,
  rolesList,
  onSubmitSuccess,
}: UserFormModalProps) {
  const { t } = useTranslation();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roleName, setRoleName] = useState("");

  const [errors, setErrors] = useState<string[]>([]);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingItem && isOpen) {
      setUsername(editingItem.username || "");
      setEmail(editingItem.email || "");
      setPhone(editingItem.phone || "");
      setRoleName(editingItem.roles?.[0] || "");
    } else if (isOpen) {
      setUsername("");
      setEmail("");
      setPhone("");
      setRoleName("");
    }
    setErrors([]);
    setInvalidFields([]);
  }, [editingItem, isOpen]);

  const clearField = (field: string) => {
    if (invalidFields.includes(field)) {
      setInvalidFields((prev) => prev.filter((f) => f !== field));
    }
  };

  const inputClass = (field: string) =>
    `w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:outline-hidden focus:ring-3 dark:text-white/90 dark:placeholder:text-white/30 shadow-theme-xs ${
      invalidFields.includes(field)
        ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-500"
        : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-brand-800"
    }`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userSchema = z.object({
      username: editingItem
        ? z.string().optional()
        : z
            .string()
            .trim()
            .min(1, t("user.errorEmptyUsername", { defaultValue: "Tên đăng nhập không được để trống." }))
            .min(5, t("user.errorMinLengthUsername", { defaultValue: "Tên đăng nhập phải có ít nhất 5 ký tự." }))
            .max(150, t("user.errorMaxLengthUsername", { defaultValue: "Tên đăng nhập không được vượt quá 150 ký tự." })),
      email: z
        .string()
        .trim()
        .min(1, t("user.errorEmptyEmail", { defaultValue: "Email không được để trống." }))
        .email(t("user.errorInvalidEmail", { defaultValue: "Email không đúng định dạng." }))
        .max(150, t("user.errorMaxLengthEmail", { defaultValue: "Email không được vượt quá 150 ký tự." })),
      phone: z
        .string()
        .trim()
        .refine(
          (val) => {
            if (!val) return true; // Phone is optional
            return /^[0-9+() -]*$/.test(val) && val.length >= 9 && val.length <= 20;
          },
          t("user.errorInvalidPhone", { defaultValue: "Số điện thoại không hợp lệ (từ 9 đến 20 số)." })
        )
        .optional(),
      roleName: z
        .string()
        .min(1, t("user.errorEmptyRole", { defaultValue: "Vui lòng chọn vai trò." })),
    });

    const result = userSchema.safeParse({ username, email, phone, roleName });

    if (!result.success) {
      const fieldErrors: string[] = [];
      const fields: string[] = [];
      result.error.issues.forEach((err) => {
        fieldErrors.push(err.message);
        if (err.path.length > 0) fields.push(err.path[0] as string);
      });
      setErrors(fieldErrors);
      setInvalidFields(fields);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);
    setInvalidFields([]);

    try {
      let res;
      if (editingItem) {
        res = await userApi.update(editingItem.id, {
          id: editingItem.id,
          email: email.trim(),
          phone: phone.trim() || "",
          roleName,
        });
      } else {
        res = await userApi.create({
          username: username.trim(),
          email: email.trim(),
          phone: phone.trim() || "",
          roleName,
        });
      }

      if (res.success && res.data) {
        onSubmitSuccess(res.data, !!editingItem);
        onClose();
      } else {
        const msg = res.message
          ? t(`backendMessages.${res.message}`, { defaultValue: res.message })
          : t("user.saveError", { defaultValue: "Đã xảy ra lỗi khi lưu người dùng." });
        setErrors([msg]);
        if (res.message === "ERR_USERNAME_DUPLICATE") setInvalidFields(["username"]);
        else if (res.message === "ERR_EMAIL_DUPLICATE") setInvalidFields(["email"]);
      }
    } catch {
      setErrors([t("user.systemError", { defaultValue: "Lỗi hệ thống." })]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditingAdmin = roleName.toLowerCase() === "admin" || editingItem?.roles?.some(r => r.toLowerCase() === "admin");
  const effectiveRolesList = isEditingAdmin && !rolesList.some(r => r.toLowerCase() === "admin")
    ? ["Admin", ...rolesList]
    : rolesList;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[560px] p-6 sm:p-8">
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

        <form onSubmit={handleSubmit} className="space-y-4 mt-2" noValidate>
          {/* Username (Disabled when editing) */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("user.formUsernameLabel", { defaultValue: "Tên đăng nhập" })} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              disabled={!!editingItem}
              maxLength={150}
              value={username}
              onChange={(e) => { setUsername(e.target.value); clearField("username"); }}
              placeholder={t("user.formUsernamePlaceholder", { defaultValue: "Nhập tên đăng nhập..." })}
              className={`${inputClass("username")} disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-white/5 dark:disabled:text-white/30`}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("user.formEmailLabel", { defaultValue: "Địa chỉ Email" })} <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              maxLength={150}
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearField("email"); }}
              placeholder={t("user.formEmailPlaceholder", { defaultValue: "Nhập địa chỉ email..." })}
              className={inputClass("email")}
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
              value={phone}
              onChange={(e) => { setPhone(e.target.value); clearField("phone"); }}
              placeholder={t("user.formPhonePlaceholder", { defaultValue: "Nhập số điện thoại..." })}
              className={inputClass("phone")}
            />
          </div>

          {/* Role */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("user.formRoleLabel", { defaultValue: "Vai trò hệ thống" })} <span className="text-rose-500">*</span>
            </label>
            <div>
              <div className="relative z-20 bg-transparent">
                <select
                  disabled={isEditingAdmin}
                  value={roleName}
                  onChange={(e) => { setRoleName(e.target.value); clearField("roleName"); }}
                  className={`w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm text-gray-800 appearance-none focus:outline-hidden focus:ring-3 dark:text-white/90 focus:ring-brand-500/10 dark:focus:ring-brand-800/10 shadow-theme-xs disabled:bg-gray-100 dark:disabled:bg-white/5 disabled:cursor-not-allowed ${
                    invalidFields.includes("roleName") ? "border-rose-500 dark:border-rose-500" : "border-gray-300 dark:border-gray-700"
                  }`}
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
                    <path d="M3.8335 5.9165L8.00016 10.0832L12.1668 5.9165" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
              {isEditingAdmin && (
                <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  {t("backendMessages.ERR_CANNOT_ASSIGN_ADMIN_ROLE", { defaultValue: "Không thể gán vai trò Admin cho người dùng mới" })}
                </p>
              )}
            </div>
          </div>

          {/* Error block */}
          {errors.length > 0 && (
            <div className="p-3 text-sm text-rose-500 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-400 rounded-lg space-y-1">
              {errors.map((err, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <span className="shrink-0">•</span>
                  <span>{err}</span>
                </div>
              ))}
            </div>
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

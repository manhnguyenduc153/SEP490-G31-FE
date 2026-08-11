"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/services/auth.api";
import { useTranslation } from "react-i18next";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  
  // Auth state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError(t("backendMessages.ERR_INVALID_CREDENTIALS", { defaultValue: "Vui lòng điền đầy đủ tên đăng nhập và mật khẩu." }));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await authApi.login({
        username: username.trim(),
        password: password.trim(),
      });

      if (res.success) {
        router.push("/dashboard");
      } else {
        setError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("backendMessages.ERR_INVALID_CREDENTIALS", { defaultValue: "Tên đăng nhập hoặc mật khẩu không chính xác." }));
      }
    } catch {
      setError(t("roles.systemError", { defaultValue: "Đã xảy ra lỗi kết nối với máy chủ." }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="w-full max-w-md sm:pt-10 mx-auto mb-5">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon />
          {t("signin.backToHome", { defaultValue: "Trở về trang chủ" })}
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              {t("signin.title")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("signin.description")}
            </p>
          </div>
          <div>
            <form onSubmit={handleSignIn}>
              <div className="space-y-6">
                {error && (
                  <div className="p-3.5 text-sm text-error-600 bg-error-50 dark:bg-error-500/10 dark:text-error-400 rounded-lg border border-error-200 dark:border-error-500/20 font-medium">
                    {error}
                  </div>
                )}
                <div>
                  <Label>
                    {t("signin.usernameLabel")} <span className="text-error-500">*</span>{" "}
                  </Label>
                  <Input 
                    placeholder={t("signin.usernamePlaceholder")} 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div>
                  <Label>
                    {t("signin.passwordLabel")} <span className="text-error-500">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={t("signin.passwordPlaceholder")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isChecked} onChange={setIsChecked} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                      {t("signin.keepMeLoggedIn")}
                    </span>
                  </div>
                  <Link
                    href="/reset-password"
                    className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    {t("signin.forgotPassword")}
                  </Link>
                </div>
                <div>
                  <Button className="w-full" size="sm" disabled={loading}>
                    {loading ? t("signin.signingIn") : t("signin.signInButton")}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

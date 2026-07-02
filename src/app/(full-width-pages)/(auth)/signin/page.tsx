import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng Nhập",
  description: "Trang Đăng Nhập IELTSmart",
};

export default function SignIn() {
  return <SignInForm />;
}

import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng Ký",
  description: "Trang Đăng Ký IELTSmart",
};

export default function SignUp() {
  return <SignUpForm />;
}

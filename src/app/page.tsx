import type { Metadata } from "next";
import LandingPage from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "IELTSmart - Học IELTS thông minh, tiến bộ rõ ràng",
  description:
    "Nền tảng học tập IELTS toàn diện với lộ trình rõ ràng, quản lý bài học, bài tập và theo dõi tiến bộ.",
};

export default function HomePage() {
  return <LandingPage />;
}

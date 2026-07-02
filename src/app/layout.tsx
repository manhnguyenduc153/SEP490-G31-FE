import { Inter } from "next/font/google";
import "./globals.css";
import "swiper/swiper-bundle.css";
import "simplebar-react/dist/simplebar.min.css";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { I18nProvider } from "@/providers/I18nProvider";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | IELTSmart",
    default: "IELTSmart",
  },
  icons: {
    icon: "/images/logo/logo-only-removebg-preview.png",
  },
};

const inter = Inter({
  subsets: ["latin", "vietnamese"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${inter.className} dark:bg-gray-900`}>
        <I18nProvider>
          <ThemeProvider>
            <SidebarProvider>{children}</SidebarProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

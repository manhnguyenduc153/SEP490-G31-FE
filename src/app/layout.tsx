import { Inter } from "next/font/google";
import "./globals.css";
import "swiper/swiper-bundle.css";
import "simplebar-react/dist/simplebar.min.css";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { I18nProvider } from "@/providers/I18nProvider";
import { NotificationProvider } from "@/context/NotificationContext";
import { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";

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
    <html lang="vi" suppressHydrationWarning>
      <body className={`${inter.className} dark:bg-gray-900`} suppressHydrationWarning>
        <NextTopLoader color="#465fff" showSpinner={false} height={3} />
        <I18nProvider>
          <ThemeProvider>
            <NotificationProvider>
              <SidebarProvider>{children}</SidebarProvider>
            </NotificationProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

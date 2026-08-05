"use client";

import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  ChevronRight,
  CircleCheck,
  GraduationCap,
  Menu,
  Moon,
  School,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/context/ThemeContext";
import { authApi } from "@/services/auth.api";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";

const conversionRows = [
  { ielts: "5.0", common: "7.0 – 8.5", neu: "—", ftu: "—", hust: "8.0", hcmut: "—", ajc: "7.0" },
  { ielts: "5.5", common: "8.0 – 9.0", neu: "8.0", ftu: "—", hust: "8.5", hcmut: "—", ajc: "8.0" },
  { ielts: "6.0", common: "8.5 – 9.5", neu: "8.5", ftu: "—", hust: "9.0", hcmut: "8.0", ajc: "9.0" },
  { ielts: "6.5", common: "9.0 – 10", neu: "9.0", ftu: "8.5", hust: "9.5", hcmut: "8.5", ajc: "9.5" },
  { ielts: "7.0", common: "9.5 – 10", neu: "9.5", ftu: "9.0", hust: "10", hcmut: "9.0", ajc: "10" },
  { ielts: "7.5", common: "10", neu: "10", ftu: "9.5", hust: "10", hcmut: "9.5", ajc: "10" },
  { ielts: "8.0+", common: "10", neu: "10", ftu: "10", hust: "10", hcmut: "10", ajc: "10" },
];

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(authApi.isAuthenticated());
  }, []);

  const primaryHref = isAuthenticated ? "/dashboard" : "/signin";
  const primaryLabel = isAuthenticated ? t("landing.dashboard") : t("landing.startNow");
  const heroLabel = isAuthenticated ? t("landing.dashboard") : t("landing.exploreSolutions");
  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setMenuOpen(false);
  };
  const features = [
    { icon: BookOpen, title: t("landing.feature1Title"), description: t("landing.feature1Description") },
    { icon: Sparkles, title: t("landing.feature2Title"), description: t("landing.feature2Description") },
    { icon: Award, title: t("landing.feature3Title"), description: t("landing.feature3Description") },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased dark:bg-gray-950 dark:text-white">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="IELTSmart">
            <Image
              src="/images/logo/logo-only-removebg-preview.png"
              alt=""
              width={40}
              height={40}
              priority
              className="h-10 w-10 object-contain"
            />
            <div>
              <span className="block text-lg font-bold tracking-tight text-gray-950 dark:text-white">
                IELTS<span className="text-brand-600 dark:text-brand-400">mart</span>
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex" aria-label="Điều hướng chính">
            <button type="button" onClick={() => scrollToSection("gioi-thieu")} className="text-sm font-medium text-gray-600 transition-colors hover:text-brand-600 dark:text-gray-300 dark:hover:text-brand-400">
              {t("landing.navIntroduction")}
            </button>
            <button type="button" onClick={() => scrollToSection("tot-nghiep")} className="text-sm font-medium text-gray-600 transition-colors hover:text-brand-600 dark:text-gray-300 dark:hover:text-brand-400">
              {t("landing.navGraduation")}
            </button>
            <button type="button" onClick={() => scrollToSection("quy-doi")} className="text-sm font-medium text-gray-600 transition-colors hover:text-brand-600 dark:text-gray-300 dark:hover:text-brand-400">
              {t("landing.navConversion")}
            </button>
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-900"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {!isAuthenticated && (
              <Link href="/signin" className="rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-900">
                {t("landing.signIn")}
              </Link>
            )}
            <Link href={primaryHref} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600">
              {isAuthenticated ? t("landing.dashboardShort") : t("landing.startNow")}
              <ArrowRight size={16} />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 sm:hidden dark:border-gray-700 dark:text-gray-200"
            aria-label="Mở menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-gray-200 bg-white px-4 py-4 sm:hidden dark:border-gray-800 dark:bg-gray-950">
            <nav className="flex flex-col gap-1">
              {[
                ["gioi-thieu", t("landing.navIntroduction")],
                ["tot-nghiep", t("landing.navGraduation")],
                ["quy-doi", t("landing.navConversion")],
              ].map(([sectionId, label]) => (
                <button
                  type="button"
                  key={sectionId}
                  onClick={() => scrollToSection(sectionId)}
                  className="rounded-lg px-3 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-900"
                >
                  {label}
                </button>
              ))}
            </nav>
            <div className="mt-3 flex gap-2 border-t border-gray-200 pt-4 dark:border-gray-800">
              <LanguageSwitcher />
              <button
                type="button"
                onClick={toggleTheme}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                aria-label="Chuyển chế độ màu"
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <Link href={primaryHref} onClick={() => setMenuOpen(false)} className="flex flex-1 items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">
                {primaryLabel}
              </Link>
            </div>
          </div>
        )}
      </header>

      <main>
        <section id="gioi-thieu" className="relative overflow-hidden border-b border-gray-200 dark:border-gray-800">
          <div className="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full border-[56px] border-brand-50 dark:border-brand-950/60" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 hidden h-64 w-64 rounded-full border-[48px] border-brand-50 lg:block dark:border-brand-950/60" />
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <div className="relative z-10 mx-auto max-w-4xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-700 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300">
                <GraduationCap size={16} />
                {t("landing.eyebrow")}
              </div>
              <h1 className="mx-auto max-w-4xl text-[42px] font-bold leading-[1.08] tracking-[-0.04em] text-gray-950 sm:text-[56px] lg:text-[68px] dark:text-white">
                <span className="block">{t("landing.heroTitle")}</span>
                <span className="mt-2 block text-brand-600 dark:text-brand-400">
                  {t("landing.heroHighlight")}
                </span>
              </h1>
              <p className="mx-auto mt-7 max-w-3xl text-base leading-7 text-gray-600 sm:text-lg sm:leading-8 dark:text-gray-300">
                {t("landing.heroDescription")}
              </p>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                {isAuthenticated ? (
                  <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600">
                    {heroLabel}
                    <ArrowRight size={17} />
                  </Link>
                ) : (
                  <button type="button" onClick={() => scrollToSection("tinh-nang")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600">
                    {heroLabel}
                    <ArrowRight size={17} />
                  </button>
                )}
                <button type="button" onClick={() => scrollToSection("tot-nghiep")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900">
                  {t("landing.viewAdmissions")}
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>

            <div className="relative z-10 mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: School,
                  title: t("landing.capabilityClasses"),
                  description: t("landing.capabilityClassesDescription"),
                },
                {
                  icon: Users,
                  title: t("landing.capabilityStudents"),
                  description: t("landing.capabilityStudentsDescription"),
                },
                {
                  icon: GraduationCap,
                  title: t("landing.capabilityTeachers"),
                  description: t("landing.capabilityTeachersDescription"),
                },
                {
                  icon: Award,
                  title: t("landing.capabilityResults"),
                  description: t("landing.capabilityResultsDescription"),
                },
              ].map(({ icon: Icon, title, description }) => (
                <div key={title} className="group rounded-2xl border border-gray-200 bg-white p-5 text-left transition-colors hover:border-brand-300 hover:bg-brand-25 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-brand-800 dark:hover:bg-brand-950/30">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
                    <Icon size={20} />
                  </div>
                  <h2 className="mt-4 text-sm font-bold text-gray-900 dark:text-white">{title}</h2>
                  <p className="mt-1.5 text-xs leading-5 text-gray-500 dark:text-gray-400">{description}</p>
                </div>
              ))}
            </div>

            <div className="hidden">
              <div className="rounded-[28px] border border-gray-200 bg-gray-50 p-4 shadow-theme-xl sm:p-5 dark:border-gray-800 dark:bg-gray-900">
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950">
                  <div className="flex items-start justify-between border-b border-gray-100 px-5 py-5 dark:border-gray-800 sm:px-6">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">
                        {t("landing.demandLandscape")}
                      </p>
                      <h2 className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                        {t("landing.oneCertificateManyGoals")}
                      </h2>
                    </div>
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                      {t("landing.illustration")}
                    </span>
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-5">
                      <div className="pointer-events-none absolute left-1/2 top-12 h-[calc(100%-6rem)] -translate-x-1/2 border-l border-dashed border-brand-200 dark:border-brand-800" />
                      <div className="pointer-events-none absolute left-12 right-12 top-1/2 -translate-y-1/2 border-t border-dashed border-brand-200 dark:border-brand-800" />

                      <div className="relative z-10 grid grid-cols-2 gap-x-16 gap-y-14 sm:gap-x-24">
                        {[
                          {
                            icon: GraduationCap,
                            title: t("landing.universityAdmission"),
                            description: t("landing.admissionGoal"),
                            color: "bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300",
                          },
                          {
                            icon: BookOpen,
                            title: t("landing.studyAbroad"),
                            description: t("landing.studyAbroadGoal"),
                            color: "bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-950 dark:text-blue-light-300",
                          },
                          {
                            icon: ShieldCheck,
                            title: t("landing.outputStandard"),
                            description: t("landing.outputStandardGoal"),
                            color: "bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-300",
                          },
                          {
                            icon: TrendingUp,
                            title: t("landing.careerOpportunity"),
                            description: t("landing.careerGoal"),
                            color: "bg-success-50 text-success-600 dark:bg-success-950 dark:text-success-300",
                          },
                        ].map(({ icon: Icon, title, description, color }) => (
                          <div key={title} className="min-h-32 rounded-xl border border-gray-200 bg-white p-3.5 shadow-theme-xs dark:border-gray-700 dark:bg-gray-950 sm:p-4">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
                              <Icon size={18} />
                            </div>
                            <h3 className="mt-3 text-xs font-bold text-gray-900 dark:text-white sm:text-sm">{title}</h3>
                            <p className="mt-1 text-[10px] leading-4 text-gray-500 dark:text-gray-400 sm:text-xs">{description}</p>
                          </div>
                        ))}
                      </div>

                      <div className="absolute left-1/2 top-1/2 z-20 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-8 border-gray-50 bg-brand-600 text-center shadow-theme-lg dark:border-gray-900 dark:bg-brand-500 sm:h-28 sm:w-28">
                        <div>
                          <Sparkles size={20} className="mx-auto text-brand-200" />
                          <p className="mt-1 text-base font-bold tracking-tight text-white sm:text-lg">IELTS</p>
                          <p className="text-[8px] font-semibold uppercase tracking-wider text-brand-100 sm:text-[9px]">{t("landing.certificate")}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-start gap-3 rounded-xl bg-brand-50 p-4 dark:bg-brand-950/70">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-theme-xs dark:bg-gray-900 dark:text-brand-300">
                        <CircleCheck size={17} />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-brand-800 dark:text-brand-200">{t("landing.diverseDemand")}</p>
                        <p className="mt-1 text-xs leading-5 text-brand-700 dark:text-brand-300">{t("landing.demandIllustrationDescription")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="tinh-nang" className="scroll-mt-20 bg-gray-50 py-18 dark:bg-gray-900/60 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">{t("landing.featuresEyebrow")}</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl dark:text-white">{t("landing.featuresTitle")}</h2>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {features.map(({ icon: Icon, title, description }, index) => (
                <article key={title} className="rounded-2xl border border-gray-200 bg-white p-7 dark:border-gray-800 dark:bg-gray-950">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                    <Icon size={23} />
                  </div>
                  <p className="mt-6 text-xs font-bold text-gray-400">0{index + 1}</p>
                  <h3 className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="tot-nghiep" className="scroll-mt-24 py-18 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
              <div>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
                  <ShieldCheck size={24} />
                </div>
                <p className="mt-6 text-sm font-bold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">{t("landing.importantInfo")}</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl dark:text-white">{t("landing.graduationTitle")}</h2>
                <p className="mt-5 text-base leading-7 text-gray-600 dark:text-gray-300">
                  {t("landing.circularInfo")}
                </p>
                <div className="mt-7 rounded-xl border border-warning-200 bg-warning-50 p-4 text-sm leading-6 text-warning-800 dark:border-warning-800 dark:bg-warning-950 dark:text-warning-200">
                  {t("landing.policyNotice")}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                <div className="border-b border-gray-200 bg-gray-50 px-6 py-5 dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-success-100 text-success-700 dark:bg-success-950 dark:text-success-300">
                      <Check size={19} strokeWidth={3} />
                    </span>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{t("landing.exemptionCondition")}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t("landing.ieltsTypes")}</p>
                    </div>
                    <span className="ml-auto rounded-full bg-brand-600 px-3 py-1.5 text-sm font-bold text-white">{t("landing.fromBand")}</span>
                  </div>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                  {[
                    {
                      number: "01",
                      title: t("landing.rule1Title"),
                      text: t("landing.rule1Description"),
                    },
                    {
                      number: "02",
                      title: t("landing.rule2Title"),
                      text: t("landing.rule2Description"),
                    },
                    {
                      number: "03",
                      title: t("landing.rule3Title"),
                      text: t("landing.rule3Description"),
                    },
                  ].map((item) => (
                    <div key={item.number} className="grid gap-3 p-6 sm:grid-cols-[48px_1fr]">
                      <span className="text-sm font-bold text-brand-600 dark:text-brand-400">{item.number}</span>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="quy-doi" className="scroll-mt-20 border-y border-gray-200 bg-gray-50 py-18 dark:border-gray-800 dark:bg-gray-900/60 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">{t("landing.admissionsEyebrow")}</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl dark:text-white">{t("landing.conversionTitle")}</h2>
              <p className="mt-5 text-base leading-7 text-gray-600 dark:text-gray-300">
                {t("landing.conversionDescription")}
              </p>
            </div>

            <div className="mt-10 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-900 text-white dark:border-gray-700 dark:bg-gray-800">
                      <th className="sticky left-0 z-10 bg-gray-900 px-5 py-4 text-xs font-bold uppercase tracking-wider dark:bg-gray-800">IELTS</th>
                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider">{t("landing.commonRange")}</th>
                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider">{t("landing.neu")}</th>
                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider">{t("landing.ftu")}</th>
                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider">{t("landing.hust")}</th>
                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider">{t("landing.hcmut")}</th>
                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider">{t("landing.ajc")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {conversionRows.map((row) => (
                      <tr key={row.ielts} className="transition-colors hover:bg-brand-25 dark:hover:bg-brand-950/30">
                        <td className="sticky left-0 bg-white px-5 py-4 dark:bg-gray-950">
                          <span className="inline-flex min-w-14 justify-center rounded-lg bg-brand-50 px-3 py-2 text-sm font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">{row.ielts}</span>
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-gray-900 dark:text-white">{row.common}</td>
                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{row.neu}</td>
                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{row.ftu}</td>
                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{row.hust}</td>
                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{row.hcmut}</td>
                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{row.ajc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-200 bg-gray-50 px-5 py-4 text-xs leading-5 text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                {t("landing.tableNotice")}
              </div>
            </div>
          </div>
        </section>

        <section className="py-18 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-3xl bg-gray-950 px-6 py-12 text-center text-white sm:px-12 sm:py-16 dark:border dark:border-gray-800">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600">
                <GraduationCap size={25} />
              </div>
              <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">{t("landing.ctaTitle")}</h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-gray-300 sm:text-base">
                {t("landing.ctaDescription")}
              </p>
              <Link href={primaryHref} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-gray-950 transition-colors hover:bg-gray-100">
                {primaryLabel}
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-center gap-2.5">
            <Image src="/images/logo/logo-only-removebg-preview.png" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
            <span className="font-bold text-gray-900 dark:text-white">
              IELTS<span className="text-brand-600 dark:text-brand-400">mart</span>
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">© {new Date().getFullYear()} IELTSmart. {t("landing.footerTagline")}</p>
          <div className="flex gap-5 text-sm font-medium text-gray-500 dark:text-gray-400">
            <button type="button" onClick={() => scrollToSection("tot-nghiep")} className="hover:text-brand-600 dark:hover:text-brand-400">{t("landing.footerGraduation")}</button>
            <button type="button" onClick={() => scrollToSection("quy-doi")} className="hover:text-brand-600 dark:hover:text-brand-400">{t("landing.navConversion")}</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

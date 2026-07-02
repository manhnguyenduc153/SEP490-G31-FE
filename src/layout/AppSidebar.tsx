"use client";
import React, { useEffect, useRef, useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { PermissionGuard } from "../components/auth/PermissionGuard";
import {
  AiIcon,
  BoxCubeIcon,
  CalenderIcon,
  CallIcon,
  CartIcon,
  ChatIcon,
  ChevronDownIcon,
  GridIcon,
  GroupIcon,
  HorizontaLDots,
  ListIcon,
  LockIcon,
  MailIcon,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  TaskIcon,
  UserCircleIcon,
  DocsIcon,
} from "../icons/index";

import { useTranslation } from "react-i18next";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  new?: boolean;
  permission?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean; permission?: string }[];
};

// ── NEW: School Management menu (rendered at top) ────────────────────────────
const schoolItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "dashboard",
    path: "/",
  },
  {
    icon: <DocsIcon />,
    name: "academicOperations",
    subItems: [
      { name: "courses", path: "/courses", permission: "Course" },
      { name: "classes", path: "/classes", permission: "Class" },
      { name: "teachers", path: "/teachers", permission: "Teacher" },
      { name: "students", path: "/students", permission: "Student" },
      { name: "rooms", path: "/rooms", permission: "Room" },
    ],
  },
  {
    icon: <CalenderIcon />,
    name: "schedule",
    subItems: [
      { name: "classSchedules", path: "/schedules", permission: "ClassSchedule" },
      { name: "teachingSchedules", path: "/teaching-schedules" },
      { name: "timetable", path: "/timetable" },
    ],
  },
  {
    icon: <TableIcon />,
    name: "assessments",
    subItems: [
      { name: "exams", path: "/exams", permission: "Exam" },
      { name: "assignments", path: "/assignments", permission: "Activity" },
      { name: "questionBank", path: "/question-bank", permission: "Question" },
      { name: "questionCategory", path: "/question-category", permission: "QuestionCategory" },
      { name: "scores", path: "/scores", permission: "StudentGrade" },
    ],
  },
  {
    icon: <BoxCubeIcon />,
    name: "learning",
    subItems: [
      { name: "learningMaterials", path: "/learning-materials", permission: "LearningMaterial" },
      { name: "attendance", path: "/attendance", permission: "Attendance" },
      { name: "studentProgress", path: "/student-progress" },
    ],
  },
  {
    icon: <LockIcon />,
    name: "administration",
    subItems: [
      { name: "users", path: "/users", permission: "User" },
      { name: "roles", path: "/roles", permission: "Role" },
      { name: "permissions", path: "/permissions" },
    ],
  },
  {
    icon: <PieChartIcon />,
    name: "reportsMenu",
    subItems: [
      { name: "reports", path: "/reports" },
      { name: "statistics", path: "/statistics" },
    ],
  },
  {
    icon: <GroupIcon />,
    name: "parentServices",
    subItems: [
      { name: "childProfile", path: "/child-profile", permission: "ParentStudent" },
      { name: "childProgress", path: "/child-progress" },
      { name: "childSchedules", path: "/child-schedules" },
    ],
  },
];
// ─────────────────────────────────────────────────────────────────────────────

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    subItems: [
      { name: "Ecommerce", path: "/" },
      { name: "Analytics", path: "/analytics" },
      { name: "Marketing", path: "/marketing" },
      { name: "CRM", path: "/crm" },
      { name: "Stocks", path: "/stocks" },
      { name: "SaaS", path: "/saas", new: true },
      { name: "Logistics", path: "/logistics", new: true },
    ],
  },
  {
    name: "AI Assistant",
    icon: <AiIcon />,
    new: true,
    subItems: [
      {
        name: "Text Generator",
        path: "/text-generator",
      },
      {
        name: "Image Generator",
        path: "/image-generator",
      },
      {
        name: "Code Generator",
        path: "/code-generator",
      },
      {
        name: "Video Generator",
        path: "/video-generator",
      },
    ],
  },
  {
    name: "E-commerce",
    icon: <CartIcon />,
    new: true,
    subItems: [
      { name: "Products", path: "/products-list" },
      { name: "Add Product", path: "/add-product" },
      { name: "Billing", path: "/billing" },
      { name: "Invoices", path: "/invoices" },
      { name: "Single Invoice", path: "/single-invoice" },
      { name: "Create Invoice", path: "/create-invoice" },
      { name: "Transactions", path: "/transactions" },
      { name: "Single Transaction", path: "/single-transaction" },
    ],
  },
  {
    icon: <CalenderIcon />,
    name: "Calendar",
    path: "/calendar",
  },
  {
    icon: <UserCircleIcon />,
    name: "User Profile",
    path: "/profile",
  },
  {
    name: "Task",
    icon: <TaskIcon />,
    subItems: [
      { name: "List", path: "/task-list", pro: false },
      { name: "Kanban", path: "/task-kanban", pro: false },
    ],
  },
  {
    name: "Forms",
    icon: <ListIcon />,
    subItems: [
      { name: "Form Elements", path: "/form-elements", pro: false },
      { name: "Form Layout", path: "/form-layout", pro: false },
    ],
  },
  {
    name: "Tables",
    icon: <TableIcon />,
    subItems: [
      { name: "Basic Tables", path: "/basic-tables", pro: false },
      { name: "Data Tables", path: "/data-tables", pro: false },
    ],
  },
  {
    name: "Pages",
    icon: <PageIcon />,
    subItems: [
      { name: "File Manager", path: "/file-manager" },
      { name: "Pricing Tables", path: "/pricing-tables" },
      { name: "FAQ", path: "/faq" },
      { name: "API Keys", path: "/api-keys", new: true },
      { name: "Integrations", path: "/integrations", new: true },
      { name: "Blank Page", path: "/blank" },
      { name: "404 Error", path: "/error-404" },
      { name: "500 Error", path: "/error-500" },
      { name: "503 Error", path: "/error-503" },
      { name: "Coming Soon", path: "/coming-soon" },
      { name: "Maintenance", path: "/maintenance" },
      { name: "Success", path: "/success" },
    ],
  },
  {
    name: "Authorization",
    icon: <LockIcon />,
    subItems: [
      { name: "Role", path: "/roles" },
      { name: "Permission", path: "/permissions" },
    ],
  },
];

const othersItems: NavItem[] = [
  {
    icon: <PieChartIcon />,
    name: "Charts",
    subItems: [
      { name: "Line Chart", path: "/line-chart", pro: false },
      { name: "Bar Chart", path: "/bar-chart", pro: false },
      { name: "Pie Chart", path: "/pie-chart", pro: false },
    ],
  },
  {
    icon: <BoxCubeIcon />,
    name: "UI Elements",
    subItems: [
      { name: "Alerts", path: "/alerts" },
      { name: "Avatar", path: "/avatars" },
      { name: "Badge", path: "/badge" },
      { name: "Breadcrumb", path: "/breadcrumb" },
      { name: "Buttons", path: "/buttons" },
      { name: "Buttons Group", path: "/buttons-group" },
      { name: "Cards", path: "/cards" },
      { name: "Carousel", path: "/carousel" },
      { name: "Dropdowns", path: "/dropdowns" },
      { name: "Images", path: "/images" },
      { name: "Links", path: "/links" },
      { name: "List", path: "/list" },
      { name: "Modals", path: "/modals" },
      { name: "Notification", path: "/notifications" },
      { name: "Pagination", path: "/pagination" },
      { name: "Popovers", path: "/popovers" },
      { name: "Progressbar", path: "/progress-bar" },
      { name: "Ribbons", path: "/ribbons" },
      { name: "Spinners", path: "/spinners" },
      { name: "Tabs", path: "/tabs" },
      { name: "Tooltips", path: "/tooltips" },
      { name: "Videos", path: "/videos" },
    ],
  },
  {
    icon: <PlugInIcon />,
    name: "Authentication",
    subItems: [
      { name: "Sign In", path: "/signin", pro: false },
      { name: "Sign Up", path: "/signup", pro: false },
      { name: "Reset Password", path: "/reset-password" },
      {
        name: "Two Step Verification",
        path: "/two-step-verification",
      },
    ],
  },
];

const supportItems: NavItem[] = [
  {
    icon: <ChatIcon />,
    name: "Chat",
    path: "/chat",
  },
  {
    icon: <CallIcon />,
    name: "Support",
    new: true,
    subItems: [
      { name: "Support List", path: "/support-tickets" },
      { name: "Support Reply", path: "/support-ticket-reply" },
    ],
  },
  {
    icon: <MailIcon />,
    name: "Email",
    subItems: [
      { name: "Inbox", path: "/inbox" },
      { name: "Details", path: "/inbox-details" },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const { t } = useTranslation();

  const renderMenuItems = (
    navItems: NavItem[],
    menuType: "school" | "main" | "support" | "others"
  ) => (
    <ul className="flex flex-col gap-1">
      {navItems.map((nav, index) => {
        const renderItemContent = () => (
          <li key={nav.name}>
            {nav.subItems ? (
              <button
                onClick={() => handleSubmenuToggle(index, menuType)}
                className={`menu-item group  ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-active"
                    : "menu-item-inactive"
                } cursor-pointer ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "lg:justify-start"
                }`}
              >
                <span
                  className={` ${
                    openSubmenu?.type === menuType && openSubmenu?.index === index
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className={`menu-item-text`} suppressHydrationWarning>
                    {menuType === "school" ? t(`sidebar.${nav.name}`) : nav.name}
                  </span>
                )}
                {nav.new && (isExpanded || isHovered || isMobileOpen) && (
                  <span
                    className={`ml-auto absolute right-10 ${
                      openSubmenu?.type === menuType &&
                      openSubmenu?.index === index
                        ? "menu-dropdown-badge-active"
                        : "menu-dropdown-badge-inactive"
                    } menu-dropdown-badge`}
                  >
                    new
                  </span>
                )}
                {(isExpanded || isHovered || isMobileOpen) && (
                  <ChevronDownIcon
                    className={`ml-auto w-5 h-5 transition-transform duration-200  ${
                      openSubmenu?.type === menuType &&
                      openSubmenu?.index === index
                        ? "rotate-180 text-brand-500"
                        : ""
                    }`}
                  />
                )}
              </button>
            ) : (
              nav.path && (
                <Link
                  href={nav.path}
                  className={`menu-item group ${
                    isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                  }`}
                >
                  <span
                    className={`${
                      isActive(nav.path)
                        ? "menu-item-icon-active"
                        : "menu-item-icon-inactive"
                    }`}
                  >
                    {nav.icon}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className={`menu-item-text`} suppressHydrationWarning>
                      {menuType === "school" ? t(`sidebar.${nav.name}`) : nav.name}
                    </span>
                  )}
                  {nav.new && (isExpanded || isHovered || isMobileOpen) && (
                    <span
                      className={`ml-auto ${
                        isActive(nav.path)
                          ? "menu-dropdown-badge-active"
                          : "menu-dropdown-badge-inactive"
                      } menu-dropdown-badge `}
                    >
                      new
                    </span>
                  )}
                </Link>
              )
            )}
            {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
              <div
                ref={(el) => {
                  subMenuRefs.current[`${menuType}-${index}`] = el;
                }}
                className="overflow-hidden transition-all duration-300"
                style={{
                  height:
                    openSubmenu?.type === menuType && openSubmenu?.index === index
                      ? `${subMenuHeight[`${menuType}-${index}`]}px`
                      : "0px",
                }}
              >
                <ul className="mt-2 space-y-1 ml-9">
                  {nav.subItems.map((subItem) => {
                    const renderSubItemContent = () => (
                      <li key={subItem.name}>
                        <Link
                          href={subItem.path}
                          className={`menu-dropdown-item ${
                            isActive(subItem.path)
                              ? "menu-dropdown-item-active"
                              : "menu-dropdown-item-inactive"
                          }`}
                        >
                          <span suppressHydrationWarning>
                            {menuType === "school" ? t(`sidebar.${subItem.name}`) : subItem.name}
                          </span>
                          <span className="flex items-center gap-1 ml-auto">
                            {subItem.new && (
                              <span
                                className={`ml-auto ${
                                  isActive(subItem.path)
                                    ? "menu-dropdown-badge-active"
                                    : "menu-dropdown-badge-inactive"
                                } menu-dropdown-badge `}
                              >
                                new
                              </span>
                            )}
                            {subItem.pro && (
                              <span
                                className={`ml-auto ${
                                  isActive(subItem.path)
                                    ? "menu-dropdown-badge-pro-active"
                                    : "menu-dropdown-badge-pro-inactive"
                                } menu-dropdown-badge-pro `}
                              >
                                pro
                              </span>
                            )}
                          </span>
                        </Link>
                      </li>
                    );

                    if (menuType === "school" && subItem.permission) {
                      return (
                        <PermissionGuard key={subItem.name} requiredPermission={subItem.permission}>
                          {renderSubItemContent()}
                        </PermissionGuard>
                      );
                    }
                    return renderSubItemContent();
                  })}
                </ul>
              </div>
            )}
          </li>
        );

        if (menuType === "school" && nav.permission) {
          return (
            <PermissionGuard key={nav.name} requiredPermission={nav.permission}>
              {renderItemContent()}
            </PermissionGuard>
          );
        }
        return renderItemContent();
      })}
    </ul>
  );

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "school" | "main" | "support" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // const isActive = (path: string) => path === pathname;

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  useEffect(() => {
    // Check if the current path matches any submenu item
    let submenuMatched = false;
    ["school", "main", "support", "others"].forEach((menuType) => {
      const items =
        menuType === "school"
          ? schoolItems
          : menuType === "main"
          ? navItems
          : menuType === "support"
          ? supportItems
          : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "school" | "main" | "support" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    // If no submenu item matches, close the open submenu
    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [pathname, isActive]);

  useEffect(() => {
    let active = true;

    const updateHeight = () => {
      if (!active) return;
      if (openSubmenu !== null) {
        const key = `${openSubmenu.type}-${openSubmenu.index}`;
        const el = subMenuRefs.current[key];
        if (el) {
          const height = el.scrollHeight;
          setSubMenuHeight((prevHeights) => ({
            ...prevHeights,
            [key]: height || 0,
          }));

          // If measured height is 0 (due to async PermissionGuards), retry in 100ms
          if (height === 0) {
            setTimeout(updateHeight, 100);
          }
        }
      }
    };

    updateHeight();
    return () => {
      active = false;
    };
  }, [openSubmenu]);

  const handleSubmenuToggle = (
    index: number,
    menuType: "school" | "main" | "support" | "others"
  ) => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  return (
    <aside
      className={`fixed  flex flex-col xl:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-full transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        xl:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`pt-6 pb-4 flex items-center ${
          !isExpanded && !isHovered ? "xl:justify-center" : "justify-start"
        }`}
      >
        <Link href="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <Image
              src="/images/logo/logo-text-removebg-preview.png"
              alt="Logo"
              width={160}
              height={25}
              priority
              className="h-[25px] w-auto object-contain"
            />
          ) : (
            <Image
              src="/images/logo/logo-only-removebg-preview.png"
              alt="Logo"
              width={32}
              height={32}
              priority
              className="h-8 w-8 object-contain"
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto  duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            {/* ── School Management section (top) ── */}
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-5 text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "xl:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  t("sidebar.schoolManagement")
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(schoolItems, "school")}
            </div>
            {/* ── Original Menu section ── */}
            {/* <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-5 text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "xl:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-5 text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "xl:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Support"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(supportItems, "support")}
            </div>
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-5 text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "xl:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Others"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(othersItems, "others")}
            </div> */}
          </div>
        </nav>
        {/* {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null} */}
      </div>
    </aside>
  );
};

export default AppSidebar;

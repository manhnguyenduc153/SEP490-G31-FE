"use client";
import React, { useEffect, useRef, useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";

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
import { authApi } from "@/services/auth.api";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  new?: boolean;
  permission?: string;
  roles?: string[];
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean; permission?: string; roles?: string[] }[];
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
      { name: "semesters", path: "/semesters", permission: "Semester.View" },
      { name: "courses", path: "/courses", permission: "Course.View" },
      { name: "registrations", path: "/registrations", permission: "StudentRegistration.View" },
      { name: "classes", path: "/classes", permission: "Class.View" },
      { name: "teachingClasses", path: "/teaching-classes", permission: "Class.TeacherView" },
      { name: "myClasses", path: "/my-classes", permission: "Class.StudentView" },
      { name: "teachers", path: "/teachers", permission: "Teacher.View" },
      { name: "students", path: "/students", permission: "Student.View" },
      { name: "rooms", path: "/rooms", permission: "Room.View" },
    ],
  },
  {
    icon: <CalenderIcon />,
    name: "schedule",
    subItems: [
      { name: "classSchedules", path: "/schedules", permission: "ClassSchedule.View" },
      { name: "teachingSchedules", path: "/teaching-schedules", permission: "ClassSchedule.TeacherView" },
      { name: "timetable", path: "/timetable", permission: "ClassSchedule.StudentView" },
    ],
  },
  {
    icon: <TableIcon />,
    name: "assessments",
    subItems: [
      { name: "exams", path: "/exams", permission: "ExamSchedule.View" },
      { name: "homework", path: "/homework", permission: "Homework.View" },
      { name: "questionBank", path: "/question-bank", permission: "Question.View" },
      { name: "questionCategory", path: "/question-category", permission: "QuestionCategory.View" },
      { name: "scoreSettings", path: "/scores", permission: "StudentGrade.View" },
      { name: "myScores", path: "/my-scores", permission: "StudentGrade.StudentView" },
    ],
  },
  {
    icon: <BoxCubeIcon />,
    name: "learning",
    subItems: [
      { name: "learningMaterials", path: "/learning-materials", permission: "LearningMaterial.View" },
      { name: "myAttendance", path: "/attendance", permission: "Attendance.StudentView" },
      { name: "studentProgress", path: "/student-progress" },
    ],
  },
  {
    icon: <LockIcon />,
    name: "administration",
    subItems: [
      { name: "users", path: "/users", permission: "User.View" },
      { name: "roles", path: "/roles", permission: "Role.View" },
    ],
  },
  {
    icon: <PieChartIcon />,
    name: "reportsMenu",
    permission: "User.View",
    subItems: [
      { name: "classGradeReport", path: "/reports/class-grade" },
      { name: "attendanceReport", path: "/reports/attendance" },
      { name: "examReport", path: "/reports/exam" },
    ],
  },
  {
    icon: <GroupIcon />,
    name: "parentServices",
    subItems: [
      { name: "parents", path: "/parent-student", permission: "ParentStudent.View", roles: ["admin", "academicstaff", "academic staff"] },
      { name: "childProfile", path: "/child-profile", permission: "ParentStudent.View", roles: ["admin", "parent"] },
      { name: "childProgress", path: "/child-progress", permission: "ParentStudent.View", roles: ["admin", "parent"] },
      { name: "childSchedules", path: "/child-schedules", permission: "ParentStudent.View", roles: ["admin", "parent"] },
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
      { name: "Text Generator", path: "/text-generator" },
      { name: "Image Generator", path: "/image-generator" },
      { name: "Code Generator", path: "/code-generator" },
      { name: "Video Generator", path: "/video-generator" },
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
      { name: "Two Step Verification", path: "/two-step-verification" },
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
  const [role, setRole] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "school" | "main" | "support" | "others";
    name: string;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => {
    if (!path) return false;
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(path + "/");
  }, [pathname]);

  const canShowForRole = useCallback((roles?: string[]) => !roles?.length || roles.includes(role), [role]);

  const hasPermission = useCallback((permission?: string) => {
    if (!permission) return true;
    const lowerRole = role.toLowerCase();
    if (
      lowerRole === "admin" ||
      lowerRole === "academic staff" ||
      lowerRole === "ban chuyên môn" ||
      lowerRole === "ban vận hành"
    ) return true;
    
    // Custom mapping: If check for ExamSchedule.View, student with ExamStudent.View can also pass
    if (permission === "ExamSchedule.View" && lowerRole === "student") {
      return permissions.includes("ExamStudent.View");
    }
    
    return permissions.includes(permission);
  }, [role, permissions]);

  useEffect(() => {
    const currentRole = authApi.getRole().toLowerCase();
    setRole(currentRole);
    
    // 1. Read from localStorage for immediate, non-blocking render
    const cachedPerms = authApi.getPermissions();
    setPermissions(cachedPerms);
    setIsMounted(true);

    // 2. Fetch fresh permissions from API in the background to ensure synchronization
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return; // Skip API call if not logged in

    authApi.getCurrentPermissions()
      .then((res) => {
        if (res.success && res.data) {
          const extendedPerms = new Set<string>(res.data);
          res.data.forEach((perm) => {
            if (perm && typeof perm === "string" && perm.includes(".")) {
              const parent = perm.split(".")[0];
              extendedPerms.add(parent);
            }
          });
          const finalPerms = Array.from(extendedPerms);
          setPermissions(finalPerms);
          localStorage.setItem("permissions", JSON.stringify(finalPerms));
        }
      })
      .catch(() => {
        // Silently ignore - user may not be authenticated
      });
  }, []);

  useEffect(() => {
    // Check if the current path matches any submenu item
    let submenuMatched = false;
    const menuTypes = ["school", "main", "support", "others"] as const;

    for (const menuType of menuTypes) {
      if (submenuMatched) break;

      const items =
        menuType === "school"
          ? schoolItems
          : menuType === "main"
            ? navItems
            : menuType === "support"
              ? supportItems
              : othersItems;

      for (let index = 0; index < items.length; index++) {
        const nav = items[index];
        if (nav.subItems) {
          for (const subItem of nav.subItems) {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType,
                name: nav.name,
              });
              submenuMatched = true;
              break;
            }
          }
        }
        if (submenuMatched) break;
      }
    }

    // If no submenu item matches, close the open submenu
    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [pathname, isActive]);

  useEffect(() => {
    if (typeof window === "undefined" || !("ResizeObserver" in window)) return;
    
    const observers = new Map<string, ResizeObserver>();
    
    const updateAllHeights = () => {
      Object.entries(subMenuRefs.current).forEach(([key, el]) => {
        if (!el) return;
        
        if (!observers.has(key)) {
          const observer = new ResizeObserver(() => {
            const height = el.scrollHeight;
            setSubMenuHeight((prev) => {
              if (prev[key] === height) return prev;
              return { ...prev, [key]: height };
            });
          });
          observer.observe(el);
          observers.set(key, observer);
        }
      });
    };

    updateAllHeights();

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, [openSubmenu, role, isMounted]);

  const handleSubmenuToggle = (
    name: string,
    menuType: "school" | "main" | "support" | "others"
  ) => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.name === name
      ) {
        return null;
      }
      return { type: menuType, name };
    });
  };

  const renderMenuItems = (
    navItems: NavItem[],
    menuType: "school" | "main" | "support" | "others"
  ) => {
    if (!isMounted) {
      return <ul className="flex flex-col gap-1" />;
    }

    const filteredItems = navItems.filter((nav) => {
      // Check roles for the parent item
      if (!canShowForRole(nav.roles)) return false;
      // Check permissions for the parent item (if any)
      if (menuType === "school" && !hasPermission(nav.permission)) return false;
      
      // If it has subitems, at least one subitem must be visible
      if (nav.subItems) {
        const hasVisibleSubItem = nav.subItems.some((subItem) => {
          if (!canShowForRole(subItem.roles)) return false;
          if (menuType === "school" && !hasPermission(subItem.permission)) return false;
          return true;
        });
        if (!hasVisibleSubItem) return false;
      }
      
      return true;
    });

    return (
      <ul className="flex flex-col gap-1">
        {filteredItems.map((nav) => {
          const renderItemContent = () => (
            <li key={nav.name}>
              {nav.subItems ? (
                <button
                  onClick={() => handleSubmenuToggle(nav.name, menuType)}
                  className={`menu-item group  ${openSubmenu?.type === menuType && openSubmenu?.name === nav.name
                    ? "menu-item-active"
                    : "menu-item-inactive"
                    } cursor-pointer ${!isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "lg:justify-start"
                    }`}
                >
                  <span
                    className={` ${openSubmenu?.type === menuType && openSubmenu?.name === nav.name
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
                      className={`ml-auto absolute right-10 ${openSubmenu?.type === menuType &&
                        openSubmenu?.name === nav.name
                        ? "menu-dropdown-badge-active"
                        : "menu-dropdown-badge-inactive"
                        } menu-dropdown-badge`}
                    >
                      new
                    </span>
                  )}
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <ChevronDownIcon
                      className={`ml-auto w-5 h-5 transition-transform duration-200  ${openSubmenu?.type === menuType &&
                        openSubmenu?.name === nav.name
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
                    className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                      }`}
                  >
                    <span
                      className={`${isActive(nav.path)
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
                        className={`ml-auto ${isActive(nav.path)
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
                    subMenuRefs.current[`${menuType}-${nav.name}`] = el;
                  }}
                  className="overflow-hidden transition-all duration-300"
                  style={{
                    height:
                      openSubmenu?.type === menuType && openSubmenu?.name === nav.name
                        ? `${subMenuHeight[`${menuType}-${nav.name}`]}px`
                        : "0px",
                  }}
                >
                  <ul className="mt-2 space-y-1 ml-9">
                    {nav.subItems
                      .filter((subItem) => {
                        if (!canShowForRole(subItem.roles)) return false;
                        if (menuType === "school" && !hasPermission(subItem.permission)) return false;
                        return true;
                      })
                      .map((subItem) => (
                        <li key={subItem.name}>
                          <Link
                            href={subItem.path}
                            className={`menu-dropdown-item ${isActive(subItem.path)
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
                                  className={`ml-auto ${isActive(subItem.path)
                                    ? "menu-dropdown-badge-active"
                                    : "menu-dropdown-badge-inactive"
                                    } menu-dropdown-badge `}
                                >
                                  new
                                </span>
                              )}
                              {subItem.pro && (
                                <span
                                  className={`ml-auto ${isActive(subItem.path)
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
                      ))}
                  </ul>
                </div>
              )}
            </li>
          );

          return renderItemContent();
        })}
      </ul>
    );
  };

  return (
    <aside
      className={`fixed  flex flex-col xl:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-full transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${isExpanded || isMobileOpen
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
        className={`pt-6 pb-4 flex items-center ${!isExpanded && !isHovered ? "xl:justify-center" : "justify-start"
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
                suppressHydrationWarning
                className={`mb-4 text-xs uppercase flex leading-5 text-gray-400 ${!isExpanded && !isHovered
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
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;

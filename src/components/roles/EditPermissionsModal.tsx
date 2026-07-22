"use client";
import React from "react";
import { Modal } from "@/components/ui/modal";
import { PermissionNode } from "./types";
import { RoleItem } from "@/services/auth.api";

interface EditPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  selectedRoleForPermissions: RoleItem | null;
  dynamicPermissionTree: PermissionNode[];
  expandedCategories: Set<string>;
  expandAllCategories: () => void;
  collapseAllCategories: () => void;
  toggleCategoryExpand: (id: string) => void;
  getCategorySelectionState: (node: PermissionNode, isCreate: boolean) => { isChecked: boolean; isIndeterminate: boolean };
  toggleCategorySelection: (node: PermissionNode, isCreate: boolean) => void;
  toggleChildSelection: (childId: string, parentId: string, isCreate: boolean) => void;
  checkedPermissions: Set<string>;
  handleSavePermissions: () => void;
}

const getFeatureDisplayName = (featureName: string, t: any) => {
  const sidebarMap: Record<string, string> = {
    Semester: "semesters",
    Course: "courses",
    StudentRegistration: "registrations",
    Class: "classes",
    Teacher: "teachers",
    Student: "students",
    Room: "rooms",
    Schedule: "classSchedules",
    TeachingSchedule: "teachingSchedules",
    Timetable: "timetable",
    Exam: "exams",
    Question: "questionBank",
    QuestionCategory: "questionCategory",
    StudentGrade: "scoreSettings",
    LearningMaterial: "learningMaterials",
    User: "users",
    Role: "roles",
    ParentStudent: "parents",
  };

  const key = sidebarMap[featureName];
  if (key) {
    return t(`sidebar.${key}`);
  }
  return t(`permissions.category.${featureName}`, { defaultValue: featureName });
};

export function EditPermissionsModal({
  isOpen,
  onClose,
  t,
  selectedRoleForPermissions,
  dynamicPermissionTree,
  expandedCategories,
  expandAllCategories,
  collapseAllCategories,
  toggleCategoryExpand,
  getCategorySelectionState,
  toggleCategorySelection,
  toggleChildSelection,
  checkedPermissions,
  handleSavePermissions,
}: EditPermissionsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[850px] p-6 sm:p-8"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {t("roles.permissionsModalTitle")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t("roles.permissionsModalDesc", { name: selectedRoleForPermissions?.name || "" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={expandAllCategories}
              className="text-xs font-semibold text-brand-500 hover:underline"
            >
              {t("roles.expandAll", { defaultValue: "Mở rộng tất cả" })}
            </button>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <button
              onClick={collapseAllCategories}
              className="text-xs font-semibold text-brand-500 hover:underline"
            >
              {t("roles.collapseAll", { defaultValue: "Thu gọn tất cả" })}
            </button>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-white/[0.05] my-2"></div>

        {/* Tree View Structure */}
        <div className="max-h-[450px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
          {dynamicPermissionTree.length > 0 ? (
            dynamicPermissionTree.map((group) => {
              const { isChecked: isGroupChecked, isIndeterminate: isGroupIndeterminate } = getCategorySelectionState(group, false);
              const isGroupExpanded = expandedCategories.has(group.id);

              return (
                <div key={group.id} className="border border-gray-100 dark:border-white/[0.05] rounded-xl p-3.5 bg-gray-50/30 dark:bg-white/[0.01]">
                  {/* Category Header Row (Level 1 Module Group) */}
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/[0.03]">
                    <div className="flex items-center gap-2">
                      {/* Collapse toggle icon */}
                      <button
                        onClick={() => toggleCategoryExpand(group.id)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition-colors"
                      >
                        <svg
                          className={`w-3.5 h-3.5 text-gray-500 transition-transform ${
                            isGroupExpanded ? "rotate-90" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* Custom category checkbox */}
                      <div
                        onClick={() => toggleCategorySelection(group, false)}
                        className={`w-4.5 h-4.5 flex items-center justify-center rounded-md border cursor-pointer transition-all ${
                          isGroupChecked
                            ? "bg-brand-500 border-brand-500 text-white"
                            : isGroupIndeterminate
                            ? "bg-brand-100 dark:bg-brand-500/20 border-brand-300 dark:border-brand-500/50 text-brand-600 dark:text-brand-400"
                            : "border-gray-300 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600 bg-white dark:bg-dark-900"
                        }`}
                      >
                        {isGroupChecked && (
                          <svg className="w-3 h-3 stroke-current" viewBox="0 0 16 16" fill="none">
                            <path d="M3 8L6 11L13 4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {!isGroupChecked && isGroupIndeterminate && (
                          <span className="w-2 h-0.5 bg-current rounded-sm"></span>
                        )}
                      </div>

                      {/* Category Label */}
                      <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        {t(`sidebar.${group.name}`, { defaultValue: group.name })}
                      </span>
                    </div>
                  </div>

                  {/* Level 2: Features & Actions */}
                  {isGroupExpanded && group.children && group.children.length > 0 && (
                    <div className="mt-2.5 pl-2 space-y-3">
                      {group.children.map((feature) => {
                        const { isChecked: isFeatureChecked, isIndeterminate: isFeatureIndeterminate } = getCategorySelectionState(feature, false);
                        const isFeatureExpanded = expandedCategories.has(feature.id);
                        
                        return (
                          <div key={feature.id} className="pl-3 py-1 border-l border-gray-200 dark:border-white/[0.05]">
                            {/* Feature Header */}
                            <div className="flex items-center gap-2">
                              {feature.children && feature.children.length > 0 ? (
                                <button
                                  onClick={() => toggleCategoryExpand(feature.id)}
                                  className="p-0.5 hover:bg-gray-150 dark:hover:bg-white/5 rounded transition-colors"
                                >
                                  <svg
                                    className={`w-3 h-3 text-gray-500 transition-transform ${
                                      isFeatureExpanded ? "rotate-90" : ""
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              ) : (
                                <div className="w-4 h-4"></div>
                              )}

                              <div
                                onClick={() => toggleCategorySelection(feature, false)}
                                className={`w-4 h-4 flex items-center justify-center rounded border cursor-pointer transition-all ${
                                  isFeatureChecked
                                    ? "bg-brand-500 border-brand-500 text-white"
                                    : isFeatureIndeterminate
                                    ? "bg-brand-100 dark:bg-brand-500/20 border-brand-300 dark:border-brand-500/50 text-brand-600 dark:text-brand-400"
                                    : "border-gray-300 dark:border-gray-700 bg-white dark:bg-dark-900"
                                }`}
                              >
                                {isFeatureChecked && (
                                  <svg className="w-2.5 h-2.5 stroke-current" viewBox="0 0 16 16" fill="none">
                                    <path d="M3 8L6 11L13 4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                                {!isFeatureChecked && isFeatureIndeterminate && (
                                  <span className="w-1.5 h-0.5 bg-current rounded-sm"></span>
                                )}
                              </div>

                              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                                {getFeatureDisplayName(feature.name, t)}
                              </span>
                            </div>

                            {/* Level 3: Action Checkboxes */}
                            {isFeatureExpanded && feature.children && feature.children.length > 0 && (
                              <div className="mt-1.5 ml-6 pl-2 flex flex-wrap gap-x-4 gap-y-1 bg-gray-50/20 dark:bg-white/[0.005] rounded-md p-1.5 border border-dashed border-gray-150 dark:border-white/[0.03]">
                                {feature.children.map((child) => {
                                  const isChildChecked = checkedPermissions.has(child.id);
                                  return (
                                    <div key={child.id} className="flex items-center gap-1.5 py-0.5">
                                      <div
                                        onClick={() => toggleChildSelection(child.id, feature.id, false)}
                                        className={`w-3.5 h-3.5 flex items-center justify-center rounded border cursor-pointer transition-all ${
                                          isChildChecked
                                            ? "bg-brand-500 border-brand-500 text-white"
                                            : "border-gray-300 dark:border-gray-700 bg-white dark:bg-dark-900"
                                        }`}
                                      >
                                        {isChildChecked && (
                                          <svg className="w-2 h-2 stroke-current" viewBox="0 0 16 16" fill="none">
                                            <path d="M3 8L6 11L13 4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                        )}
                                      </div>
                                      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                        {t(`permissions.action.${child.name}`, { defaultValue: child.name })}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-xs text-gray-500 text-center py-6">{t("roles.loadingPermissions", { defaultValue: "Đang tải danh sách quyền..." })}</p>
          )}
        </div>

        <div className="border-t border-gray-100 dark:border-white/[0.05] my-1"></div>

        {/* Action Footer */}
        <div className="flex items-center justify-end gap-3 mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-400 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            {t("roles.btnCancel")}
          </button>
          <button
            onClick={handleSavePermissions}
            className="px-5 py-2.5 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 transition-colors shadow-theme-xs"
          >
            {t("roles.btnSavePermissions")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

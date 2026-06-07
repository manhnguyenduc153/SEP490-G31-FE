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
        <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
          {dynamicPermissionTree.length > 0 ? (
            dynamicPermissionTree.map((category) => {
              const { isChecked: isCategoryChecked, isIndeterminate: isCategoryIndeterminate } = getCategorySelectionState(category, false);
              const isExpanded = expandedCategories.has(category.id);
              const checkedChildrenCount = category.children?.filter((c) => checkedPermissions.has(c.id)).length || 0;
              const totalChildrenCount = category.children?.length || 0;

              return (
                <div key={category.id} className="border border-gray-100 dark:border-white/[0.05] rounded-xl p-4 bg-gray-50/30 dark:bg-white/[0.01]">
                  {/* Category Header Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Collapse toggle icon */}
                      <button
                        onClick={() => toggleCategoryExpand(category.id)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition-colors"
                      >
                        <svg
                          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* Custom category checkbox */}
                      <div
                        onClick={() => toggleCategorySelection(category, false)}
                        className={`w-5 h-5 flex items-center justify-center rounded-md border cursor-pointer transition-all ${
                          isCategoryChecked
                            ? "bg-brand-500 border-brand-500 text-white"
                            : isCategoryIndeterminate
                            ? "bg-brand-100 dark:bg-brand-500/20 border-brand-300 dark:border-brand-500/50 text-brand-600 dark:text-brand-400"
                            : "border-gray-300 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600 bg-white dark:bg-dark-900"
                        }`}
                      >
                        {isCategoryChecked && (
                          <svg className="w-3.5 h-3.5 stroke-current" viewBox="0 0 16 16" fill="none">
                            <path d="M3 8L6 11L13 4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {!isCategoryChecked && isCategoryIndeterminate && (
                          <span className="w-2.5 h-0.5 bg-current rounded-sm"></span>
                        )}
                      </div>

                      {/* Category Label */}
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {t(`permissions.category.${category.name}`, { defaultValue: category.name })}
                      </span>
                    </div>

                    {/* Progress indicator */}
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400">
                      {checkedChildrenCount}/{totalChildrenCount} selected
                    </span>
                  </div>

                  {/* Children Rows */}
                  {isExpanded && category.children && category.children.length > 0 && (
                    <div className="mt-3 ml-4 pl-4 border-l border-gray-200 dark:border-white/[0.05] space-y-2.5">
                      {category.children.map((child) => {
                        const isChildChecked = checkedPermissions.has(child.id);
                        return (
                          <div key={child.id} className="flex items-center justify-between py-0.5">
                            <div className="flex items-center gap-3">
                              {/* Custom child checkbox */}
                                <div
                                  onClick={() => toggleChildSelection(child.id, category.id, false)}
                                  className={`w-4.5 h-4.5 flex items-center justify-center rounded-md border cursor-pointer transition-all ${
                                  isChildChecked
                                    ? "bg-brand-500 border-brand-500 text-white"
                                    : "border-gray-300 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600 bg-white dark:bg-dark-900"
                                }`}
                              >
                                {isChildChecked && (
                                  <svg className="w-3 h-3 stroke-current" viewBox="0 0 16 16" fill="none">
                                    <path d="M3 8L6 11L13 4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t(`permissions.action.${child.name}`, { defaultValue: child.name })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500 text-center py-6">{t("roles.loadingPermissions", { defaultValue: "Đang tải danh sách quyền..." })}</p>
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

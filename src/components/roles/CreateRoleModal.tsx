"use client";
import React from "react";
import { Modal } from "@/components/ui/modal";
import { PermissionNode } from "./types";

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  newRoleName: string;
  setNewRoleName: (val: string) => void;
  newRoleDesc: string;
  setNewRoleDesc: (val: string) => void;
  newRoleStatus: "Active" | "Inactive";
  setNewRoleStatus: (val: "Active" | "Inactive") => void;
  dynamicPermissionTree: PermissionNode[];
  expandedCategories: Set<string>;
  toggleCategoryExpand: (id: string) => void;
  getCategorySelectionState: (node: PermissionNode, isCreate: boolean) => { isChecked: boolean; isIndeterminate: boolean };
  toggleCategorySelection: (node: PermissionNode, isCreate: boolean) => void;
  toggleChildSelection: (childId: string, parentId: string, isCreate: boolean) => void;
  newRolePermissions: Set<string>;
  handleAddRoleSubmit: (e: React.FormEvent) => void;
}

export function CreateRoleModal({
  isOpen,
  onClose,
  t,
  newRoleName,
  setNewRoleName,
  newRoleDesc,
  setNewRoleDesc,
  newRoleStatus,
  setNewRoleStatus,
  dynamicPermissionTree,
  expandedCategories,
  toggleCategoryExpand,
  getCategorySelectionState,
  toggleCategorySelection,
  toggleChildSelection,
  newRolePermissions,
  handleAddRoleSubmit,
}: CreateRoleModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[900px] p-6 sm:p-8"
    >
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("roles.createTitle")}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("roles.createDesc")}
        </p>

        <form onSubmit={handleAddRoleSubmit} className="mt-2 flex flex-col">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left Column: Info */}
            <div className="flex-1 space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("roles.formNameLabel")} <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder={t("roles.formNamePlaceholder")}
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("roles.formDescLabel")}
                </label>
                <textarea
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder={t("roles.formDescPlaceholder")}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 shadow-theme-xs resize-none"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("roles.formStatusLabel")}
                </label>
                <div className="relative z-20 bg-transparent">
                  <select
                    value={newRoleStatus}
                    onChange={(e) => setNewRoleStatus(e.target.value as "Active" | "Inactive")}
                    className="w-full py-2.5 pl-3 pr-8 text-sm text-gray-800 bg-transparent border border-gray-300 rounded-lg appearance-none dark:bg-dark-900 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  >
                    <option value="Active" className="dark:bg-gray-900 text-gray-800 dark:text-white">{t("roles.statusActive")}</option>
                    <option value="Inactive" className="dark:bg-gray-900 text-gray-800 dark:text-white">{t("roles.statusInactive")}</option>
                  </select>
                  <span className="absolute z-30 text-gray-500 -translate-y-1/2 right-3 top-1/2 dark:text-gray-400 pointer-events-none">
                    <svg
                      className="stroke-current"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M3.8335 5.9165L8.00016 10.0832L12.1668 5.9165"
                        stroke=""
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Permissions */}
            <div className="flex-[1.2] flex flex-col min-h-0">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("roles.permissionsLabel")}
                </label>
                <div className="border border-gray-200 dark:border-white/[0.05] rounded-xl p-4 bg-gray-50/20 dark:bg-white/[0.01] max-h-[300px] overflow-y-auto space-y-4 custom-scrollbar">
                  {dynamicPermissionTree.length > 0 ? (
                    dynamicPermissionTree.map((category) => {
                      const { isChecked: isCategoryChecked, isIndeterminate: isCategoryIndeterminate } = getCategorySelectionState(category, true);
                      const isExpanded = expandedCategories.has(category.id);
                      const checkedChildrenCount = category.children?.filter((c) => newRolePermissions.has(c.id)).length || 0;
                      const totalChildrenCount = category.children?.length || 0;

                      return (
                        <div key={category.id} className="border border-gray-100 dark:border-white/[0.05] rounded-lg p-3 bg-white dark:bg-dark-900">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleCategoryExpand(category.id)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-colors"
                              >
                                <svg
                                  className={`w-3.5 h-3.5 text-gray-500 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                              </button>

                              <div
                                onClick={() => toggleCategorySelection(category, true)}
                                className={`w-4.5 h-4.5 flex items-center justify-center rounded border cursor-pointer transition-all ${
                                  isCategoryChecked
                                    ? "bg-brand-500 border-brand-500 text-white"
                                    : isCategoryIndeterminate
                                    ? "bg-brand-100 dark:bg-brand-500/20 border-brand-300 dark:border-brand-500/50 text-brand-600 dark:text-brand-400"
                                    : "border-gray-300 dark:border-gray-700 bg-white dark:bg-dark-900"
                                }`}
                              >
                                {isCategoryChecked && (
                                  <svg className="w-3 h-3 stroke-current" viewBox="0 0 16 16" fill="none">
                                    <path d="M3 8L6 11L13 4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                                {!isCategoryChecked && isCategoryIndeterminate && (
                                  <span className="w-2 h-0.5 bg-current rounded-sm"></span>
                                )}
                              </div>

                              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                {t(`permissions.category.${category.name}`, { defaultValue: category.name })}
                              </span>
                            </div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500">
                              {checkedChildrenCount}/{totalChildrenCount}
                            </span>
                          </div>

                          {isExpanded && category.children && category.children.length > 0 && (
                            <div className="mt-2 ml-3 pl-3 border-l border-gray-200 dark:border-white/[0.05] space-y-2">
                              {category.children.map((child) => {
                                const isChildChecked = newRolePermissions.has(child.id);
                                return (
                                  <div key={child.id} className="flex items-center justify-between py-0.5">
                                    <div className="flex items-center gap-2">
                                      <div
                                        onClick={() => toggleChildSelection(child.id, category.id, true)}
                                        className={`w-4 h-4 flex items-center justify-center rounded border cursor-pointer transition-all ${
                                          isChildChecked
                                            ? "bg-brand-500 border-brand-500 text-white"
                                            : "border-gray-300 dark:border-gray-700 bg-white dark:bg-dark-900"
                                        }`}
                                      >
                                        {isChildChecked && (
                                          <svg className="w-2.5 h-2.5 stroke-current" viewBox="0 0 16 16" fill="none">
                                            <path d="M3 8L6 11L13 4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                        )}
                                      </div>
                                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
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
                    <p className="text-xs text-gray-500 text-center py-4">{t("roles.loadingPermissions", { defaultValue: "Đang tải danh sách quyền..." })}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-white/[0.05]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-400 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              {t("roles.btnCancel")}
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 transition-colors shadow-theme-xs"
            >
              {t("roles.btnSave")}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

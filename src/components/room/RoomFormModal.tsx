"use client";
import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { RoomItem, RoomSaveDto, RoomStatus } from "@/services/room.api";
import { CodeHelper } from "@/helpers/CodeHelper";

interface RoomFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  editingItem: RoomItem | null;
  formError: string | null;
  isSubmitting: boolean;
  onSubmit: (dto: RoomSaveDto) => void;
}

export function RoomFormModal({
  isOpen,
  onClose,
  t,
  editingItem,
  formError,
  isSubmitting,
  onSubmit,
}: RoomFormModalProps) {
  const [formData, setFormData] = useState<RoomSaveDto>({
    code: "",
    name: "",
    capacity: null,
    status: RoomStatus.Active,
    building: "",
    floor: "",
  });

  useEffect(() => {
    if (editingItem && isOpen) {
      setFormData({
        id: editingItem.id,
        code: editingItem.code || "",
        name: editingItem.name || "",
        capacity: editingItem.capacity ?? null,
        status: editingItem.status ?? RoomStatus.Active,
        building: editingItem.building || "",
        floor: editingItem.floor || "",
      });
    } else if (isOpen) {
      setFormData({
        code: CodeHelper.generate("PH"),
        name: "",
        capacity: null,
        status: RoomStatus.Active,
        building: "",
        floor: "",
      });
    }
  }, [editingItem, isOpen]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsedValue: any = value;
    if (name === "status") {
      parsedValue = Number(value);
    } else if (name === "capacity") {
      parsedValue = value === "" ? null : Number(value);
    }
    setFormData((prev) => ({ ...prev, [name]: parsedValue }));
  };

  const handleFormSubmit = () => {
    onSubmit(formData);
  };

  const statusOptions = [
    { value: RoomStatus.Active, label: t("room.statusActive") },
    { value: RoomStatus.Inactive, label: t("room.statusInactive") },
    { value: RoomStatus.Maintenance, label: t("room.statusMaintenance") },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[700px] p-6 sm:p-8"
    >
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          {editingItem ? t("room.editTitle") : t("room.createTitle")}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {editingItem ? t("room.editDesc") : t("room.createDesc")}
        </p>
      </div>

      {/* Error */}
      {formError && (
        <div className="mb-4 p-3 text-sm text-error-600 bg-error-50 dark:bg-error-500/10 dark:text-error-400 rounded-lg border border-error-200 dark:border-error-500/20 font-medium">
          {formError}
        </div>
      )}

      {/* Form */}
      <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1 custom-scrollbar">
        {/* Row 1: Code + Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("room.formCodeLabel")} <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              readOnly={!!editingItem}
              placeholder={t("room.formCodePlaceholder")}
              className="w-full h-11 rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 disabled:bg-gray-100 dark:disabled:bg-gray-800 read-only:bg-gray-50 dark:read-only:bg-gray-800/50"
            />
          </div>
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("room.formNameLabel")} <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={t("room.formNamePlaceholder")}
              className="w-full h-11 rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>
        </div>

        {/* Row 2: Capacity + Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("room.formCapacityLabel")} <span className="text-error-500">*</span>
            </label>
            <input
              type="number"
              name="capacity"
              value={formData.capacity ?? ""}
              onChange={handleChange}
              min={1}
              placeholder={t("room.formCapacityPlaceholder")}
              className="w-full h-11 rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("room.formStatusLabel")}
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full h-11 rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 appearance-none"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="dark:bg-gray-900">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Building + Floor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("room.formBuildingLabel")}
            </label>
            <input
              type="text"
              name="building"
              value={formData.building ?? ""}
              onChange={handleChange}
              placeholder={t("room.formBuildingPlaceholder")}
              className="w-full h-11 rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("room.formFloorLabel")}
            </label>
            <input
              type="text"
              name="floor"
              value={formData.floor ?? ""}
              onChange={handleChange}
              placeholder={t("room.formFloorPlaceholder")}
              className="w-full h-11 rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>
        </div>
      </div>

      {/* Footer buttons */}
      <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-gray-100 dark:border-white/[0.05]">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
        >
          {t("room.btnCancel")}
        </button>
        <button
          type="button"
          onClick={handleFormSubmit}
          disabled={isSubmitting}
          className="px-5 py-2.5 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-theme-xs"
        >
          {isSubmitting ? "Saving..." : t("room.btnSave")}
        </button>
      </div>
    </Modal>
  );
}

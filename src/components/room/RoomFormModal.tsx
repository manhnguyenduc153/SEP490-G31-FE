"use client";
import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { roomApi, RoomItem, RoomSaveDto, RoomStatus } from "@/services/room.api";
import { CodeHelper } from "@/helpers/CodeHelper";
import { useTranslation } from "react-i18next";
import { z } from "zod";

interface RoomFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: RoomItem | null;
  onSubmitSuccess: (savedItem: RoomItem, isEdit: boolean) => void;
}

export function RoomFormModal({
  isOpen,
  onClose,
  editingItem,
  onSubmitSuccess,
}: RoomFormModalProps) {
  const { t } = useTranslation();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [status, setStatus] = useState<number>(RoomStatus.Active);
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");

  const [errors, setErrors] = useState<string[]>([]);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingItem && isOpen) {
      setCode(editingItem.code || "");
      setName(editingItem.name || "");
      setCapacity(editingItem.capacity != null ? String(editingItem.capacity) : "");
      setStatus(editingItem.status ?? RoomStatus.Active);
      setBuilding(editingItem.building || "");
      setFloor(editingItem.floor || "");
    } else if (isOpen) {
      setCode(CodeHelper.generate("PH"));
      setName("");
      setCapacity("");
      setStatus(RoomStatus.Active);
      setBuilding("");
      setFloor("");
    }
    setErrors([]);
    setInvalidFields([]);
  }, [editingItem, isOpen]);

  const clearField = (field: string) => {
    if (invalidFields.includes(field)) {
      setInvalidFields((prev) => prev.filter((f) => f !== field));
    }
  };

  const inputClass = (field: string) =>
    `w-full h-11 rounded-lg border bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:text-white/90 dark:placeholder:text-white/30 ${
      invalidFields.includes(field)
        ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-500"
        : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-brand-800"
    }`;

  const handleSubmit = async () => {
    const roomSchema = z.object({
      code: z
        .string()
        .trim()
        .min(1, t("room.errorEmptyCode", { defaultValue: "Mã phòng không được để trống." }))
        .min(5, t("room.errorMinLengthCode", { defaultValue: "Mã phòng phải có ít nhất 5 ký tự." }))
        .max(50, t("room.errorMaxLengthCode", { defaultValue: "Mã phòng không được vượt quá 50 ký tự." })),
      name: z
        .string()
        .trim()
        .min(1, t("room.errorEmptyName", { defaultValue: "Tên phòng không được để trống." }))
        .min(5, t("room.errorMinLengthName", { defaultValue: "Tên phòng phải có ít nhất 5 ký tự." }))
        .max(200, t("room.errorMaxLengthName", { defaultValue: "Tên phòng không được vượt quá 200 ký tự." })),
      capacity: z.string().trim().refine(
        (val) => {
          if (!val) return false;
          const num = Number(val);
          return !isNaN(num) && Number.isInteger(num) && num >= 1;
        },
        t("room.errorCapacityInvalid", { defaultValue: "Sức chứa phải là số nguyên dương (tối thiểu 1)." })
      ),
    });

    const result = roomSchema.safeParse({ code, name, capacity });

    if (!result.success) {
      const fieldErrors: string[] = [];
      const fields: string[] = [];
      result.error.issues.forEach((err) => {
        fieldErrors.push(err.message);
        if (err.path.length > 0) fields.push(err.path[0] as string);
      });
      setErrors(fieldErrors);
      setInvalidFields(fields);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);
    setInvalidFields([]);

    const dto: RoomSaveDto = {
      id: editingItem?.id,
      code: code.trim(),
      name: name.trim(),
      capacity: Number(capacity),
      status,
      building: building.trim() || null,
      floor: floor.trim() || null,
    };

    try {
      let res;
      if (editingItem) {
        res = await roomApi.update(editingItem.id, dto);
      } else {
        res = await roomApi.create(dto);
      }

      if (res.success && res.data) {
        onSubmitSuccess(res.data, !!editingItem);
        onClose();
      } else {
        const msg = res.message
          ? t(`backendMessages.${res.message}`, { defaultValue: res.message })
          : t("room.saveError", { defaultValue: "Đã xảy ra lỗi khi lưu phòng." });
        setErrors([msg]);
        if (res.message === "ERR_CODE_DUPLICATE") setInvalidFields(["code"]);
        else if (res.message === "ERR_NAME_DUPLICATE") setInvalidFields(["name"]);
      }
    } catch {
      setErrors([t("room.systemError", { defaultValue: "Lỗi hệ thống." })]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions = [
    { value: RoomStatus.Active, label: t("room.statusActive") },
    { value: RoomStatus.Inactive, label: t("room.statusInactive") },
    { value: RoomStatus.Maintenance, label: t("room.statusMaintenance") },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[700px] p-6 sm:p-8">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          {editingItem ? t("room.editTitle") : t("room.createTitle")}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {editingItem ? t("room.editDesc") : t("room.createDesc")}
        </p>
      </div>

      {/* Form */}
      <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1 custom-scrollbar">
        {/* Row 1: Code + Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("room.formCodeLabel")} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={code}
              readOnly={!!editingItem}
              onChange={(e) => { setCode(e.target.value); clearField("code"); }}
              placeholder={t("room.formCodePlaceholder")}
              className={`${inputClass("code")} read-only:bg-gray-50 dark:read-only:bg-gray-800/50`}
            />
          </div>
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("room.formNameLabel")} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); clearField("name"); }}
              placeholder={t("room.formNamePlaceholder")}
              className={inputClass("name")}
            />
          </div>
        </div>

        {/* Row 2: Capacity + Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("room.formCapacityLabel")} <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              value={capacity}
              min={1}
              onChange={(e) => { setCapacity(e.target.value); clearField("capacity"); }}
              placeholder={t("room.formCapacityPlaceholder")}
              className={inputClass("capacity")}
            />
          </div>
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("room.formStatusLabel")}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(Number(e.target.value))}
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
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              placeholder={t("room.formBuildingPlaceholder")}
              className={inputClass("building").replace("border-rose-500 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-500", "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-brand-800")}
            />
          </div>
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("room.formFloorLabel")}
            </label>
            <input
              type="text"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              placeholder={t("room.formFloorPlaceholder")}
              className="w-full h-11 rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>
        </div>

        {/* Error block */}
        {errors.length > 0 && (
          <div className="p-3 text-sm text-rose-500 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-400 rounded-lg space-y-1">
            {errors.map((err, idx) => (
              <div key={idx} className="flex items-start gap-1.5">
                <span className="shrink-0">•</span>
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}
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
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-5 py-2.5 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-theme-xs"
        >
          {isSubmitting ? t("room.btnSaving", { defaultValue: "Đang lưu..." }) : t("room.btnSave")}
        </button>
      </div>
    </Modal>
  );
}

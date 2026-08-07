"use client";

import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import Label from "./Label";
import { CalenderIcon } from "../../icons";
import Hook = flatpickr.Options.Hook;
import DateOption = flatpickr.Options.DateOption;
import { useTranslation } from "react-i18next";
import { Vietnamese } from "flatpickr/dist/l10n/vn";

type PropsType = {
  id: string;
  mode?: "single" | "multiple" | "range" | "time";
  onChange?: Hook | Hook[];
  defaultDate?: DateOption;
  label?: string;
  placeholder?: string;
  dateFormat?: string;
  staticOption?: boolean;
  disabled?: boolean;
  isError?: boolean;
};

export default function DatePicker({
  id,
  mode,
  onChange,
  label,
  defaultDate,
  placeholder,
  dateFormat,
  staticOption,
  disabled,
  isError,
}: PropsType) {
  const { i18n } = useTranslation();
  const fpRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);

  // Sync onChange prop to ref
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const flatPickr = flatpickr(`#${id}`, {
      locale: i18n.language === "vi" ? Vietnamese : "default",
      mode: mode || "single",
      static: staticOption !== undefined ? staticOption : true,
      monthSelectorType: "static",
      dateFormat: dateFormat || "d/m/Y",
      defaultDate,
      onChange: (selectedDates, dateStr, instance) => {
        if (onChangeRef.current) {
          if (Array.isArray(onChangeRef.current)) {
            onChangeRef.current.forEach((hook) => hook(selectedDates, dateStr, instance));
          } else {
            onChangeRef.current(selectedDates, dateStr, instance);
          }
        }
      },
    });

    fpRef.current = Array.isArray(flatPickr) ? flatPickr[0] : flatPickr;

    return () => {
      if (fpRef.current) {
        fpRef.current.destroy();
      }
    };
  }, [mode, id, dateFormat, staticOption, i18n.language]);

  // Sync defaultDate when changed from outside
  useEffect(() => {
    if (fpRef.current && defaultDate) {
      const currentSelected = fpRef.current.selectedDates[0];
      const newDateVal = defaultDate instanceof Date ? defaultDate : new Date(defaultDate as any);
      if (!currentSelected || currentSelected.getTime() !== newDateVal.getTime()) {
        fpRef.current.setDate(defaultDate, false);
      }
    }
  }, [defaultDate]);

  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}

      <div className="relative">
        <input
          id={id}
          disabled={disabled}
          placeholder={placeholder}
          className={`h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 ${
            disabled
              ? "cursor-not-allowed bg-gray-50/60 dark:bg-gray-950/40 text-gray-450 dark:text-gray-500"
              : isError
              ? "bg-transparent text-gray-800 border-rose-500 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-500"
              : "bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          }`}
        />

        <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
          <CalenderIcon className="size-6" />
        </span>
      </div>
    </div>
  );
}

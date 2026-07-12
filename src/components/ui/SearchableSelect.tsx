"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, X } from "lucide-react";

interface Option {
  value: string | number;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | number | "";
  onChange: (value: any) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onClear?: () => void;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Chọn...",
  className = "",
  disabled = false,
  onClear,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset search and focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  // Helper to remove Vietnamese diacritics
  const removeDiacritics = (str: string): string => {
    if (!str) return "";
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase();
  };

  // Filter options based on search query
  const filteredOptions = options.filter((opt) =>
    removeDiacritics(opt.label).includes(removeDiacritics(search))
  );

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 disabled:opacity-50 disabled:cursor-not-allowed text-left transition-all ${
          isOpen ? "border-brand-500 ring-2 ring-brand-500/20" : ""
        }`}
      >
        <span className={selectedOption ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-white/30"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {onClear && value !== "" && value !== null && value !== undefined && value !== "all" && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 z-[999999] rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-2 shadow-2xl max-w-full">
          {/* Search Input Box */}
          <div className="relative mb-2">
            <span className="absolute left-3 top-3.5 text-gray-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full pl-9 pr-4 py-2 text-sm bg-transparent border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder-gray-400"
            />
          </div>

          {/* Options List */}
          <div className="max-h-[220px] overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-brand-500 text-white font-semibold"
                        : "text-gray-700 hover:bg-gray-50 dark:text-gray-350 dark:hover:bg-gray-900/60"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })
            ) : (
              <div className="py-6 text-center text-sm text-gray-400 dark:text-gray-600 font-medium">
                Không tìm thấy kết quả
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

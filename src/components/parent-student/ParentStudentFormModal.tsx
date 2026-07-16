"use client";
import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  parentStudentApi,
  ParentStudentItem,
  ParentStudentSaveDto,
  ChildItem
} from "@/services/parentStudent.api";

import { studentApi, StudentItem } from "@/services/student.api";
import {
  User,
  Mail,
  Phone,
  Users,
  GraduationCap,
  Info,
  AlertCircle,
  Plus,
  Save,
  Loader2,
  Edit2,
  Trash2
} from "lucide-react";

interface ParentStudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  studentId?: number;             // ID học sinh hiện tại (nếu tạo từ trang học sinh)
  editingItem: ParentStudentItem | null;
  formError: string | null;
  isSubmitting: boolean;
  onSubmit: (dto: ParentStudentSaveDto) => void;
}

const RELATIONSHIP_OPTIONS = ["Cha", "Mẹ", "Anh", "Chị", "Ông", "Bà", "Khác"];

export function ParentStudentFormModal({
  isOpen,
  onClose,
  t,
  studentId,
  editingItem,
  formError,
  isSubmitting,
  onSubmit,
}: ParentStudentFormModalProps) {
  const isEdit = !!editingItem;
  const [localFormError, setLocalFormError] = useState<string | null>(null);

  // Sync external formError prop
  useEffect(() => {
    setLocalFormError(formError);
  }, [formError]);
  const [name, setName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  
  // Custom states for relationship selection helper
  const [selectedRelationship, setSelectedRelationship] = useState<string>("");
  const [customRelationship, setCustomRelationship] = useState<string>("");

  // Danh sách ID học sinh liên kết
  const [selectedChildrenIds, setSelectedChildrenIds] = useState<number[]>([]);

  // Toàn bộ danh sách học sinh để chọn
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [alreadyLinkedStudentIds, setAlreadyLinkedStudentIds] = useState<Set<number>>(new Set());

  // Lấy toàn bộ danh sách học sinh và phụ huynh khi modal mở
  useEffect(() => {
    if (isOpen) {
      const fetchStudentsAndMappings = async () => {
        setIsLoadingStudents(true);
        try {
          const [studentRes, parentStudentRes] = await Promise.all([
            studentApi.getAll(1, 2000),
            parentStudentApi.getAll(1, 2000)
          ]);
          
          if (studentRes.statusCode === 200 && studentRes.data) {
            setStudents(studentRes.data.items || []);
          }

          if (parentStudentRes.statusCode === 200 && parentStudentRes.data) {
            const linkedIds = new Set<number>();
            const items = parentStudentRes.data.items || [];
            items.forEach((item: ParentStudentItem) => {
              // Nếu đang sửa phụ huynh này, bỏ qua các con của chính họ
              if (isEdit && editingItem && item.id === editingItem.id) {
                return;
              }
              if (item.children) {
                item.children.forEach((c: ChildItem) => linkedIds.add(c.studentId));
              }
            });
            setAlreadyLinkedStudentIds(linkedIds);
          }
        } catch (error) {
          console.error("Failed to load students or parent-student mappings", error);
        } finally {
          setIsLoadingStudents(false);
        }
      };
      fetchStudentsAndMappings();
    }
  }, [isOpen, isEdit, editingItem]);

  // Reset form khi mở modal hoặc thay đổi editingItem
  useEffect(() => {
    if (editingItem && isOpen) {
      setName(editingItem.name || "");
      setParentPhone(editingItem.parentPhone || "");
      setEmail(editingItem.email || "");

      // Mối quan hệ chung
      const rel = editingItem.relationship || "";
      const isPredefined = RELATIONSHIP_OPTIONS.includes(rel);
      setRelationship(rel);
      if (isPredefined) {
        setSelectedRelationship(rel);
        setCustomRelationship("");
      } else if (rel !== "") {
        setSelectedRelationship("Khác");
        setCustomRelationship(rel);
      } else {
        setSelectedRelationship("");
        setCustomRelationship("");
      }

      // Populate danh sách ID học sinh
      if (editingItem.children && editingItem.children.length > 0) {
        setSelectedChildrenIds(editingItem.children.map(c => c.studentId));
      } else {
        setSelectedChildrenIds([]);
      }
    } else if (isOpen) {
      setName("");
      setParentPhone("");
      setEmail("");
      setRelationship("");
      setSelectedRelationship("");
      setCustomRelationship("");

      // Nếu truyền studentId từ ngoài vào, tự động điền 1 dòng học sinh đó
      if (studentId) {
        setSelectedChildrenIds([studentId]);
      } else {
        setSelectedChildrenIds([]);
      }
    }
  }, [editingItem, isOpen, studentId]);

  const handleRelationshipSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedRelationship(value);
    if (value === "Khác") {
      setRelationship(customRelationship);
    } else {
      setRelationship(value);
    }
  };

  const handleCustomRelationshipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomRelationship(value);
    setRelationship(value);
  };

  // Thêm một dòng học sinh mới
  const handleAddChildRow = () => {
    setSelectedChildrenIds(prev => [...prev, 0]);
  };

  // Xóa một dòng học sinh
  const handleRemoveChildRow = (index: number) => {
    // Nếu tạo phụ huynh từ màn học sinh cụ thể (có studentId), không cho xóa dòng đầu tiên
    if (studentId && index === 0) return;
    
    setSelectedChildrenIds(prev => prev.filter((_, i) => i !== index));
  };

  // Cập nhật thông tin dòng học sinh
  const handleChildRowChange = (index: number, value: number) => {
    setSelectedChildrenIds(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Lọc các studentId hợp lệ (>0) và loại bỏ trùng lặp
    const cleanChildrenIds = Array.from(new Set(selectedChildrenIds.filter(id => id > 0)));

    // Kiểm tra trùng lặp trong form
    const hasDuplicates = selectedChildrenIds.filter(id => id > 0).some((id, idx, arr) => arr.indexOf(id) !== idx);
    if (hasDuplicates) {
      setLocalFormError(t("parentStudent.errDuplicateStudent", { defaultValue: "Không thể chọn trùng học sinh liên kết!" }));
      return;
    }

    // Kiểm tra học sinh đã được liên kết với phụ huynh khác
    const linkedDuplicate = cleanChildrenIds.find((id) => alreadyLinkedStudentIds.has(id));
    if (linkedDuplicate) {
      const studentName = students.find((s) => s.id === linkedDuplicate)?.name || `ID: ${linkedDuplicate}`;
      setLocalFormError(
        t("parentStudent.errStudentAlreadyLinked", {
          defaultValue: `Học sinh "${studentName}" đã được liên kết với phụ huynh khác!`,
          name: studentName,
        })
      );
      return;
    }

    const payload: ParentStudentSaveDto = {
      id: editingItem?.id,
      name,
      parentPhone,
      email,
      relationship,
      studentIds: cleanChildrenIds
    };

    onSubmit(payload);
  };

  // Map danh sách học sinh sang định dạng Option cho SearchableSelect (loại bỏ học sinh đã được chọn ở hàng khác và học sinh đã có phụ huynh khác)
  const getStudentOptionsForIndex = (currentIndex: number) => {
    const currentValue = selectedChildrenIds[currentIndex];
    return students
      .filter((s) => {
        const isSelectedElsewhere = selectedChildrenIds.some(
          (id, idx) => id === s.id && idx !== currentIndex
        );
        
        // Nếu học sinh là giá trị đang được chọn của dòng hiện tại, cho phép hiển thị
        if (s.id === currentValue) {
          return !isSelectedElsewhere;
        }

        // Loại bỏ học sinh đã được liên kết với phụ huynh khác
        const isLinkedToOther = alreadyLinkedStudentIds.has(s.id);

        return !isSelectedElsewhere && !isLinkedToOther;
      })
      .map((s) => ({
        value: s.id,
        label: `${s.code} - ${s.name}`,
      }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-3xl w-full"
    >
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-start gap-4 pb-4 border-b border-gray-100 dark:border-white/10">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400 hidden sm:block">
            {isEdit ? <Edit2 className="h-6 w-6" /> : <User className="h-6 w-6" />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {isEdit
                ? t("parentStudent.editTitle")
                : t("parentStudent.createTitle")}
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-normal">
              {isEdit
                ? t("parentStudent.editDesc")
                : t("parentStudent.createDesc")}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Chú ý về tài khoản tự động */}
          {!isEdit && (
            <div className="flex items-start gap-3 rounded-xl bg-blue-50/70 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 px-4 py-3.5 shadow-sm">
              <div className="p-1.5 bg-blue-100/80 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 shrink-0">
                <Info className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                  {t("parentStudent.autoAccountTitle", { defaultValue: "Tạo tài khoản tự động" })}
                </p>
                <p className="mt-0.5 text-xs text-blue-700/90 dark:text-blue-450 leading-relaxed">
                  {t("parentStudent.autoAccountNote")}
                </p>
              </div>
            </div>
          )}

          {/* Thông tin phụ huynh */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Họ tên */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                {t("parentStudent.formNameLabel")}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("parentStudent.formNamePlaceholder")}
                  className="pl-9 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition"
                  required
                />
              </div>
            </div>

            {/* Mối quan hệ chung */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                {t("parentStudent.formRelationshipLabel")}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="space-y-2">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                    <Users className="h-4 w-4" />
                  </div>
                  <select
                    value={selectedRelationship}
                    onChange={handleRelationshipSelectChange}
                    className="pl-9 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition"
                    required
                  >
                    <option value="">{t("parentStudent.formRelationshipPlaceholder")}</option>
                    {RELATIONSHIP_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="dark:bg-gray-800">
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Custom input if "Khác" is selected */}
                {selectedRelationship === "Khác" && (
                  <div className="relative animate-fadeIn">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                      <Edit2 className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type="text"
                      value={customRelationship}
                      onChange={handleCustomRelationshipChange}
                      placeholder={t("parentStudent.relationshipCustomPlaceholder", { defaultValue: "Mối quan hệ khác (Dì, Dượng...)..." })}
                      className="pl-9 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition"
                      required
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                {t("parentStudent.formEmailLabel")}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("parentStudent.formEmailPlaceholder")}
                  disabled={isEdit}
                  className={`pl-9 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition ${
                    isEdit
                      ? "bg-gray-100 dark:bg-gray-800/80 border-gray-250 dark:border-gray-700 text-gray-500 cursor-not-allowed"
                      : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:border-blue-500"
                  }`}
                  required={!isEdit}
                />
              </div>
              {isEdit && (
                <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500 leading-normal">
                  {t("parentStudent.emailNoChangeNote", { defaultValue: "Email không thể thay đổi sau khi tạo" })}
                </p>
              )}
            </div>

            {/* Số điện thoại */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                {t("parentStudent.formPhoneLabel")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  type="tel"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder={t("parentStudent.formPhonePlaceholder")}
                  className="pl-9 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition"
                />
              </div>
            </div>
          </div>

          {/* Section: Con cái */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-2">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <GraduationCap className="h-4.5 w-4.5 text-blue-500" />
                          {t("parentStudent.formChildrenLabel", { defaultValue: "Con cái" })} ({selectedChildrenIds.filter(id => id > 0).length})
              </h3>
              <button
                type="button"
                onClick={handleAddChildRow}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-950/20 dark:hover:bg-blue-900/30 rounded-lg cursor-pointer transition duration-150"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("common.add", { defaultValue: "Thêm" })}
              </button>
            </div>

            {selectedChildrenIds.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 text-xs">
                {t("parentStudent.noChildrenLinked", { defaultValue: "Chưa chọn con cái liên kết. Vui lòng bấm 'Thêm'." })}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {selectedChildrenIds.map((childId, index) => (
                  <div
                              key={`${childId}-${index}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/[0.02] border border-gray-150 dark:border-gray-800 rounded-xl relative group animate-fadeIn"
                  >
                    {/* Select Học sinh Searchable */}
                    <div className="flex-1">
                      <SearchableSelect
                        value={childId || ""}
                        onChange={(value) => handleChildRowChange(index, Number(value))}
                        disabled={!!studentId && index === 0} // Dòng mặc định khi gọi từ học sinh thì không sửa
                        options={getStudentOptionsForIndex(index)}
                        placeholder="-- Chọn học sinh --"
                      />
                    </div>

                    {/* Nút xóa */}
                    {!(studentId && index === 0) && (
                      <button
                        type="button"
                        onClick={() => handleRemoveChildRow(index)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg cursor-pointer transition duration-150 shrink-0"
                        title={t("parentStudent.deleteRowTooltip", { defaultValue: "Xóa dòng này" })}
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Error */}
          {localFormError && (
            <div className="rounded-xl bg-red-50/70 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 px-4 py-3.5 flex items-start gap-3 animate-fadeIn">
              <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 shrink-0">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-red-800 dark:text-red-300">
                  {t("parentStudent.systemErrorTitle", { defaultValue: "Lỗi hệ thống" })}
                </p>
                <p className="mt-0.5 text-xs text-red-700 dark:text-red-400 leading-relaxed">
                  {localFormError}
                </p>
              </div>
            </div>
          )}
          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {t("parentStudent.btnCancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin h-3.5 w-3.5" />
                  {t("parentStudent.btnSaving")}
                </>
              ) : (
                <>
                  {isEdit ? <Save className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  {isEdit ? t("parentStudent.btnSave") : t("parentStudent.addParent")}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

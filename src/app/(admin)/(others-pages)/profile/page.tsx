"use client";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { authApi } from "@/services/auth.api";
import { userApi, UserItem } from "@/services/user.api";
import { teacherApi, TeacherItem } from "@/services/teacher.api";
import { studentApi, StudentItem } from "@/services/student.api";
import { parentStudentApi, ParentStudentItem } from "@/services/parentStudent.api";
import { ENV } from "@/config/env";
import { 
  User, Mail, Phone, MapPin, Calendar, Award, BookOpen, 
  Shield, UserCheck, Briefcase, Heart, GraduationCap, Building2,
  FileText, Loader2, ShieldAlert, BadgeInfo, Edit3, Check, X,
  Image as ImageIcon, Lock, KeyRound, Eye, EyeOff
} from "lucide-react";

export default function ProfilePage() {
  const { t } = useTranslation();
  const [role, setRole] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Message notifications
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");
  const [phoneError, setPhoneError] = useState("");

  // Detailed profile states
  const [adminProfile, setAdminProfile] = useState<UserItem | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherItem | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentItem | null>(null);
  const [parentProfile, setParentProfile] = useState<ParentStudentItem | null>(null);

  // Edit fields states
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCertificate, setEditCertificate] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editSchoolName, setEditSchoolName] = useState("");
  const [editRelationship, setEditRelationship] = useState("");

  // Extra Teacher/Student specific edit states
  const [editDob, setEditDob] = useState("");
  const [editGender, setEditGender] = useState<boolean | null>(null);
  const [editGradeLevel, setEditGradeLevel] = useState<string | null>(null);
  const [editParentName, setEditParentName] = useState("");
  const [editParentPhone, setEditParentPhone] = useState("");
  
  // File uploads
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [certFiles, setCertFiles] = useState<File[]>([]);
  const [certPreview, setCertPreview] = useState<string | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<{ type: "existing" | "pending"; index: number } | null>(null);
  const [certificatesList, setCertificatesList] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Refs
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const certInputRef = React.useRef<HTMLInputElement>(null);

  // Helper to build full image URL
  const getImageUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${ENV.API_BASE_URL}${cleanPath}`;
  };

  const isImage = (path: string | null | undefined) => {
    if (!path) return false;
    return path.match(/\.(jpeg|jpg|gif|png)$/i) != null;
  };

  // Permission helper to verify if the user can edit their profile
  const canEdit = () => {
    if (isAdmin) return true;
    if (isTeacher) return authApi.hasPermission("TeacherProfile.Edit") || authApi.hasPermission("TeacherProfile");
    if (isStudent) return authApi.hasPermission("StudentProfile.Edit") || authApi.hasPermission("StudentProfile");
    if (isParent) return true;
    return false;
  };

  // Change Password state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");
  const [changingPass, setChangingPass] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess("");

    if (!oldPassword) {
      setPassError(t("profile.errOldPasswordRequired", { defaultValue: "Vui lòng nhập mật khẩu hiện tại." }));
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPassError(t("profile.errNewPasswordLength", { defaultValue: "Mật khẩu mới phải từ 6 ký tự trở lên." }));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError(t("profile.errPasswordMismatch", { defaultValue: "Mật khẩu xác nhận không khớp với mật khẩu mới." }));
      return;
    }

    setChangingPass(true);
    try {
      const res = await authApi.changePassword({
        oldPassword,
        newPassword,
        confirmPassword,
      });

      if (res.success || res.statusCode === 200) {
        setPassSuccess(t("profile.changePasswordSuccess", { defaultValue: "Đổi mật khẩu thành công!" }));
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setShowPasswordModal(false);
          setPassSuccess("");
        }, 1500);
      } else {
        if (res.message === "ERR_OLD_PASSWORD_INCORRECT") {
          setPassError(t("profile.errOldPasswordIncorrect", { defaultValue: "Mật khẩu hiện tại không chính xác." }));
        } else {
          setPassError(res.message || t("profile.errChangePasswordFailed", { defaultValue: "Đổi mật khẩu thất bại. Vui lòng thử lại." }));
        }
      }
    } catch {
      setPassError(t("profile.errGeneric", { defaultValue: "Đã xảy ra lỗi. Vui lòng thử lại." }));
    } finally {
      setChangingPass(false);
    }
  };

  // Role helpers in scope
  const lowerRole = (role || "").toLowerCase();
  const isAdmin = lowerRole === "admin" || lowerRole === "academic staff" || lowerRole === "ban chuyên môn" || lowerRole === "ban vận hành";
  const isTeacher = lowerRole === "teacher" || lowerRole === "giáo viên";
  const isStudent = lowerRole === "student" || lowerRole === "học sinh";
  const isParent = lowerRole === "parent" || lowerRole === "phụ huynh";

  const fetchProfileData = async (storedRole: string, storedUsername: string) => {
    try {
      const lowerRole = storedRole.toLowerCase();
      if (
        lowerRole === "admin" || 
        lowerRole === "academic staff" || 
        lowerRole === "ban chuyên môn" || 
        lowerRole === "ban vận hành"
      ) {
        const profRes = await userApi.getProfile();
        if ((profRes.success || profRes.statusCode === 200) && profRes.data) {
          const p = profRes.data as any;
          setAdminProfile({
            id: p.id,
            username: p.username || storedUsername,
            email: p.email,
            phone: p.phone || "",
            roles: p.roles || [storedRole],
            status: p.status ?? 1
          });
        } else {
          const res = await userApi.getAll(1, 10, storedUsername);
          if ((res.success || res.statusCode === 200) && res.data?.items?.length) {
            const match = res.data.items.find(
              u => u.username.toLowerCase() === storedUsername.toLowerCase() || 
                   u.email.toLowerCase() === storedUsername.toLowerCase()
            );
            setAdminProfile(match || res.data.items[0]);
          }
        }
      } else if (lowerRole === "teacher" || lowerRole === "giáo viên") {
        const res = await teacherApi.getAll(1, 10, storedUsername);
        if ((res.success || res.statusCode === 200) && res.data?.items?.length) {
          const match = res.data.items.find(t => t.email?.toLowerCase() === storedUsername.toLowerCase());
          setTeacherProfile(match || res.data.items[0]);
        }
      } else if (lowerRole === "student" || lowerRole === "học sinh") {
        const res = await studentApi.getAll(1, 10, storedUsername);
        if ((res.success || res.statusCode === 200) && res.data?.items?.length) {
          const match = res.data.items.find(s => s.email?.toLowerCase() === storedUsername.toLowerCase());
          setStudentProfile(match || res.data.items[0]);
        }
      } else if (lowerRole === "parent" || lowerRole === "phụ huynh") {
        const res = await parentStudentApi.getAll(1, 10, storedUsername);
        if ((res.success || res.statusCode === 200) && res.data?.items?.length) {
          const match = res.data.items.find(p => p.email?.toLowerCase() === storedUsername.toLowerCase());
          setParentProfile(match || res.data.items[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load profile details", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedRole = authApi.getRole();
    const storedUsername = localStorage.getItem("username") || "";
    setRole(storedRole);
    setUsername(storedUsername);

    if (!storedUsername) {
      setLoading(false);
      return;
    }

    fetchProfileData(storedRole, storedUsername);
  }, []);

  const startEditMode = () => {
    if (isAdmin && adminProfile) {
      setEditPhone(adminProfile.phone || "");
    } else if (isTeacher && teacherProfile) {
      setEditName(teacherProfile.name || "");
      setEditPhone(teacherProfile.phone || "");
      setEditAddress(teacherProfile.address || "");
      setEditDescription(teacherProfile.description || "");
      setEditDob(teacherProfile.dob ? teacherProfile.dob.split("T")[0] : "");
      setEditGender(teacherProfile.gender ?? null);
      setCertificatesList(teacherProfile.certificates || []);
      setAvatarPreview(teacherProfile.avatar ? getImageUrl(teacherProfile.avatar) : null);
      setSelectedCertificate(teacherProfile.certificates?.length ? { type: "existing", index: 0 } : null);
      setCertFiles([]);
      setCertPreview(null);
    } else if (isStudent && studentProfile) {
      setEditName(studentProfile.name || "");
      setEditPhone(studentProfile.phone || "");
      setEditAddress(studentProfile.address || "");
      setEditSchoolName(studentProfile.schoolName || "");
      setEditDob(studentProfile.dob ? studentProfile.dob.split("T")[0] : "");
      setEditGender(studentProfile.gender ?? null);
      setEditGradeLevel(studentProfile.gradeLevel !== undefined && studentProfile.gradeLevel !== null ? String(studentProfile.gradeLevel) : null);
      setEditParentName(studentProfile.parentName || "");
      setEditParentPhone(studentProfile.parentPhone || "");
      setAvatarPreview(studentProfile.avatar ? getImageUrl(studentProfile.avatar) : null);
      setAvatarFile(null);
    } else if (isParent && parentProfile) {
      setEditName(parentProfile.name || "");
      setEditPhone(parentProfile.parentPhone || "");
      setEditRelationship(parentProfile.relationship || "");
    }
    setEditMode(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCertChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setCertFiles((current) => {
      const uniqueFiles = files.filter((file) => !current.some((item) =>
        item.name === file.name && item.size === file.size && item.lastModified === file.lastModified));
      const nextFiles = [...current, ...uniqueFiles];
      if (uniqueFiles.length > 0) {
        const selectedIndex = nextFiles.length - 1;
        setSelectedCertificate({ type: "pending", index: selectedIndex });
        setCertPreview(URL.createObjectURL(nextFiles[selectedIndex]));
      }
      return nextFiles;
    });
    if (certInputRef.current) {
      certInputRef.current.value = "";
    }
  };

  const removeExistingCertificate = (index: number) => {
    const nextCertificates = certificatesList.filter((_, itemIndex) => itemIndex !== index);
    setCertificatesList(nextCertificates);
    setSelectedCertificate((selection) => {
      if (selection?.type !== "existing") return selection;
      if (selection.index > index) return { type: "existing", index: selection.index - 1 };
      if (selection.index !== index) return selection;
      if (nextCertificates.length > 0) return { type: "existing", index: Math.min(index, nextCertificates.length - 1) };
      if (certFiles.length > 0) {
        setCertPreview(URL.createObjectURL(certFiles[0]));
        return { type: "pending", index: 0 };
      }
      return null;
    });
  };

  const removePendingCertificate = (index: number) => {
    setCertFiles((current) => {
      const nextFiles = current.filter((_, itemIndex) => itemIndex !== index);
      setSelectedCertificate((selection) => {
        if (selection?.type !== "pending") return selection;
        if (selection.index > index) return { type: "pending", index: selection.index - 1 };
        if (selection.index !== index) return selection;
        if (nextFiles.length > 0) {
          const nextIndex = Math.min(index, nextFiles.length - 1);
          setCertPreview(URL.createObjectURL(nextFiles[nextIndex]));
          return { type: "pending", index: nextIndex };
        }
        setCertPreview(null);
        return certificatesList.length > 0 ? { type: "existing", index: 0 } : null;
      });
      return nextFiles;
    });
  };

  const selectExistingCertificate = (index: number) => {
    setSelectedCertificate({ type: "existing", index });
    setCertPreview(null);
  };

  const selectPendingCertificate = (index: number) => {
    const file = certFiles[index];
    if (!file) return;
    setSelectedCertificate({ type: "pending", index });
    setCertPreview(URL.createObjectURL(file));
  };

  const getErrorMsg = (res: { statusCode: number; message?: string }) => {
    if (res.statusCode === 401) return t("profile.errUnauthorized", { defaultValue: "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại." });
    if (res.statusCode === 403) return t("profile.errForbidden", { defaultValue: "Bạn không có quyền thực hiện thao tác này." });
    return res.message || t("profile.errGeneric", { defaultValue: "Cập nhật thất bại. Vui lòng thử lại." });
  };

  const handleSave = async () => {
    setPhoneError("");
    const phoneRegex = /^0\d{9}$/;
    if (editPhone && !phoneRegex.test(editPhone)) {
      setPhoneError(t("profile.errInvalidPhone", { defaultValue: "Số điện thoại không hợp lệ. Phải gồm 10 chữ số và bắt đầu bằng số 0." }));
      return;
    }

    setSaving(true);
    setMsg("");
    try {
      if (isAdmin && adminProfile) {
        const dto = {
          id: adminProfile.id,
          email: adminProfile.email,
          phone: editPhone
        };
        const res = await userApi.update(adminProfile.id, dto);
        if (res.success || res.statusCode === 200 || res.statusCode === 201) {
          setAdminProfile((prev) => (prev ? (res.data || { ...prev, phone: editPhone }) : null));
          setEditMode(false);
          setMsg(t("profile.updateSuccess", { defaultValue: "Cập nhật hồ sơ thành công!" }));
          setMsgType("success");
        } else {
          setMsg(getErrorMsg(res));
          setMsgType("error");
        }
      } else if (isTeacher && teacherProfile) {
        setIsUploading(true);
        let finalAvatar = teacherProfile.avatar || null;
        if (avatarFile) {
          const uploadRes = await teacherApi.uploadFile(avatarFile);
          if (uploadRes.success && uploadRes.data) {
            finalAvatar = uploadRes.data;
          } else {
            setMsg(uploadRes.message || "Lỗi tải ảnh đại diện");
            setMsgType("error");
            setIsUploading(false);
            setSaving(false);
            return;
          }
        }

        const certificateUrls = [...certificatesList];
        for (const cFile of certFiles) {
          const uploadRes = await teacherApi.uploadDocument(cFile);
          if (uploadRes.success && uploadRes.data) {
            certificateUrls.push(uploadRes.data);
          } else {
            setMsg(uploadRes.message || `Lỗi tải chứng chỉ ${cFile.name}`);
            setMsgType("error");
            setIsUploading(false);
            setSaving(false);
            return;
          }
        }

        const dto = {
          ...teacherProfile,
          name: editName,
          phone: editPhone,
          address: editAddress,
          description: editDescription,
          dob: editDob === "" ? null : editDob,
          gender: editGender,
          avatar: finalAvatar,
          certificates: certificateUrls
        };
        const res = await teacherApi.update(teacherProfile.id, dto);
        if (res.success || res.statusCode === 200 || res.statusCode === 201) {
          setTeacherProfile((prev) => (prev ? (res.data || { ...prev, ...dto }) : null));
          setEditMode(false);
          setMsg(t("profile.updateSuccess", { defaultValue: "Cập nhật hồ sơ thành công!" }));
          setMsgType("success");
          setCertFiles([]);
        } else {
          setMsg(getErrorMsg(res));
          setMsgType("error");
        }
        setIsUploading(false);
      } else if (isStudent && studentProfile) {
        setIsUploading(true);
        let finalAvatar = studentProfile.avatar || null;
        if (avatarFile) {
          const uploadRes = await studentApi.uploadFile(avatarFile);
          if (uploadRes.success && uploadRes.data) {
            finalAvatar = uploadRes.data;
          } else {
            setMsg(uploadRes.message || "Lỗi tải ảnh đại diện");
            setMsgType("error");
            setIsUploading(false);
            setSaving(false);
            return;
          }
        }

        const dto = {
          ...studentProfile,
          name: editName,
          phone: editPhone,
          address: editAddress,
          dob: editDob === "" ? null : editDob,
          gender: editGender,
          schoolName: editSchoolName,
          gradeLevel: editGradeLevel ? Number(editGradeLevel) : null,
          parentName: editParentName,
          parentPhone: editParentPhone,
          avatar: finalAvatar
        };
        const res = await studentApi.update(studentProfile.id, dto);
        if (res.success || res.statusCode === 200 || res.statusCode === 201) {
          setStudentProfile((prev) => (prev ? (res.data || { ...prev, ...dto }) : null));
          setEditMode(false);
          setMsg(t("profile.updateSuccess", { defaultValue: "Cập nhật hồ sơ thành công!" }));
          setMsgType("success");
        } else {
          setMsg(getErrorMsg(res));
          setMsgType("error");
        }
        setIsUploading(false);
      } else if (isParent && parentProfile) {
        const dto = {
          id: parentProfile.id,
          code: parentProfile.code,
          name: editName,
          parentPhone: editPhone,
          email: parentProfile.email || "",
          relationship: editRelationship,
          studentIds: parentProfile.children?.map(c => c.studentId) || []
        };
        const res = await parentStudentApi.update(parentProfile.id, dto);
        if (res.success || res.statusCode === 200 || res.statusCode === 201) {
          setParentProfile((prev) => (prev ? (res.data || { ...prev, name: editName, parentPhone: editPhone, relationship: editRelationship }) : null));
          setEditMode(false);
          setMsg(t("profile.updateSuccess", { defaultValue: "Cập nhật hồ sơ thành công!" }));
          setMsgType("success");
        } else {
          setMsg(getErrorMsg(res));
          setMsgType("error");
        }
      }
    } catch {
      setMsg(t("profile.errGeneric", { defaultValue: "Đã xảy ra lỗi. Vui lòng thử lại." }));
      setMsgType("error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[450px] w-full items-center justify-center bg-gray-50/50 dark:bg-gray-900/10 rounded-2xl">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {t("common.loading", { defaultValue: "Đang tải hồ sơ cá nhân..." })}
          </p>
        </div>
      </div>
    );
  }

  // Display fields selection
  let displayName = username;
  let displayCode = "";
  let avatarUrl = "";
  let phone = "";
  let email = username;
  let statusText = t("roles.statusActive", { defaultValue: "Hoạt động" });
  let statusColor = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30";



  if (isAdmin && adminProfile) {
    displayName = adminProfile.username;
    phone = adminProfile.phone || "";
    email = adminProfile.email;
    if (adminProfile.status !== 1) {
      statusText = t("roles.statusInactive", { defaultValue: "Tạm khóa" });
      statusColor = "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200 dark:border-rose-900/30";
    }
  } else if (isTeacher && teacherProfile) {
    displayName = teacherProfile.name;
    displayCode = teacherProfile.code;
    avatarUrl = teacherProfile.avatar || "";
    phone = teacherProfile.phone || "";
    email = teacherProfile.email || username;
    if (teacherProfile.status !== 1) {
      statusText = t("roles.statusInactive", { defaultValue: "Ngưng hoạt động" });
      statusColor = "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200 dark:border-rose-900/30";
    }
  } else if (isStudent && studentProfile) {
    displayName = studentProfile.name;
    displayCode = studentProfile.code;
    avatarUrl = studentProfile.avatar || "";
    phone = studentProfile.phone || "";
    email = studentProfile.email || username;
    if (studentProfile.status !== 1) {
      statusText = studentProfile.statusName || t("roles.statusInactive", { defaultValue: "Ngưng hoạt động" });
      statusColor = "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200 dark:border-rose-900/30";
    }
  } else if (isParent && parentProfile) {
    displayName = parentProfile.name;
    displayCode = parentProfile.code;
    phone = parentProfile.parentPhone || "";
    email = parentProfile.email || username;
    if (parentProfile.status !== 1) {
      statusText = t("roles.statusInactive", { defaultValue: "Ngưng hoạt động" });
      statusColor = "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200 dark:border-rose-900/30";
    }
  }

  const finalAvatarUrl = editMode && avatarPreview ? avatarPreview : (avatarUrl ? getImageUrl(avatarUrl) : "");

  const initials = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .slice(-2)
        .join("")
        .toUpperCase()
    : "U";

  // Role Badge Styling
  const getRoleBadgeStyle = (r: string) => {
    if (isAdmin) {
      return "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200 dark:border-rose-900/30";
    }
    if (isTeacher) {
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200 dark:border-blue-900/30";
    }
    if (isStudent) {
      return "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 border-green-200 dark:border-green-900/30";
    }
    if (isParent) {
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200 dark:border-amber-900/30";
    }
    return "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
  };

  const getRoleDisplayName = (r: string) => {
    return t(`roles.names.${r}`, { defaultValue: r });
  };

  const formatBirthdate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const certFile = selectedCertificate?.type === "pending" ? certFiles[selectedCertificate.index] || null : null;
  const existingCertificate = selectedCertificate?.type === "existing"
    ? certificatesList?.[selectedCertificate.index] || null
    : null;
  const selectedCertificateUrl = certFile ? certPreview : getImageUrl(existingCertificate);

  return (
    <div className="space-y-6">
      {/* Alert status notification */}
      {msg && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm transition-all ${
          msgType === "success" 
            ? "bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-950/10 dark:border-emerald-900/30 dark:text-emerald-400"
            : "bg-rose-50 border-rose-100 text-rose-800 dark:bg-rose-950/10 dark:border-rose-900/30 dark:text-rose-400"
        }`}>
          <div className={`p-1 rounded-lg ${msgType === "success" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-rose-100 dark:bg-rose-900/30"}`}>
            {msgType === "success" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </div>
          <span className="text-sm font-medium leading-relaxed">{msg}</span>
        </div>
      )}

      {/* Cover / Profile Banner Card */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Sleek Gradient Cover */}
        <div className="h-32 w-full bg-gradient-to-r from-brand-500/20 via-blue-500/10 to-indigo-500/20 dark:from-brand-500/10 dark:via-blue-500/5 dark:to-indigo-500/10" />

        {/* Profile Meta Overlay */}
        <div className="px-6 pb-6 pt-0 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5 -mt-10 sm:-mt-12">
            {/* Avatar / Initials Box */}
            <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-2xl border-4 border-white dark:border-gray-900 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center shadow-md overflow-hidden shrink-0 group">
              {finalAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={finalAvatarUrl} 
                  alt={displayName} 
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <span className="text-3xl font-extrabold tracking-wider text-brand-600 dark:text-brand-400">
                  {initials}
                </span>
              )}
            </div>

            {/* Profile Brief Info */}
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {displayName}
                </h2>
                {displayCode && (
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                    {displayCode}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 items-center text-sm">
                {/* Role Badge */}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${getRoleBadgeStyle(role)}`}>
                  <Shield className="w-3.5 h-3.5" />
                  {getRoleDisplayName(role)}
                </span>
                
                {/* Status Badge */}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${statusColor}`}>
                  <UserCheck className="w-3.5 h-3.5" />
                  {statusText}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Personal Info Summary */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100 dark:border-white/5">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5 text-brand-500" />
                {t("profile.personalInfo", { defaultValue: "Thông tin cá nhân" })}
              </h3>

              {/* Edit Mode Toggle */}
              {!editMode && canEdit() ? (
                <button
                  type="button"
                  onClick={startEditMode}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/20 rounded-lg transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {t("profile.editBtn", { defaultValue: "Chỉnh sửa" })}
                </button>
              ) : editMode ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    id="profile-save-btn"
                    onClick={handleSave}
                    className="inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg shadow-theme-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {t("common.save", { defaultValue: "Lưu" })}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    id="profile-cancel-btn"
                    onClick={() => setEditMode(false)}
                    className="inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                  >
                    <X className="w-3.5 h-3.5" />
                    {t("common.cancel", { defaultValue: "Hủy" })}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Full Name (Editable for Teacher, Student, Parent) */}
              {!isAdmin && editMode ? (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t("profile.fullNameLabel", { defaultValue: "Họ và tên" })}
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-10 w-full px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:border-brand-500"
                  />
                </div>
              ) : null}

              {/* Email (Readonly always) */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {t("profile.email", { defaultValue: "Địa chỉ Email" })}
                </p>
                <div className="flex items-center gap-2.5 text-sm text-gray-850 dark:text-white/90 bg-gray-50/50 dark:bg-white/[0.01] p-2 rounded-lg border border-transparent">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="truncate">{email || "N/A"}</span>
                </div>
              </div>

              {/* Phone (Editable) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {t("profile.phone", { defaultValue: "Số điện thoại" })}
                </label>
                {editMode ? (
                  <div>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => {
                        setEditPhone(e.target.value);
                        if (phoneError) setPhoneError("");
                      }}
                      className={`h-10 w-full px-3 py-1.5 text-sm bg-white border rounded-lg dark:bg-gray-900 dark:text-white focus:outline-hidden ${
                        phoneError 
                          ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500" 
                          : "border-gray-300 dark:border-gray-700 focus:border-brand-500"
                      }`}
                    />
                    {phoneError && (
                      <p className="mt-1 text-xs text-rose-550 font-semibold">{phoneError}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 text-sm text-gray-800 dark:text-white/90">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>{phone || "N/A"}</span>
                  </div>
                )}
              </div>
              {/* Birthday (Editable if Teacher or Student) */}
              {(isTeacher || isStudent) && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t("profile.dob", { defaultValue: "Ngày sinh" })}
                  </label>
                  {editMode ? (
                    <input
                      type="date"
                      value={editDob}
                      onChange={(e) => setEditDob(e.target.value)}
                      className="h-10 w-full px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:border-brand-500"
                    />
                  ) : (
                    <div className="flex items-center gap-2.5 text-sm text-gray-800 dark:text-white/90">
                      <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>
                        {isTeacher 
                          ? formatBirthdate(teacherProfile?.dob) 
                          : formatBirthdate(studentProfile?.dob)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Gender (Editable if Teacher or Student) */}
              {(isTeacher || isStudent) && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t("profile.gender", { defaultValue: "Giới tính" })}
                  </label>
                  {editMode ? (
                    <select
                      value={editGender === true ? "true" : editGender === false ? "false" : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditGender(val === "true" ? true : val === "false" ? false : null);
                      }}
                      className="h-10 w-full px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:border-brand-500"
                    >
                      <option value="">{t("teacher.formGenderPlaceholder", { defaultValue: "Chọn giới tính" })}</option>
                      <option value="true">{t("teacher.genderMale", { defaultValue: "Nam" })}</option>
                      <option value="false">{t("teacher.genderFemale", { defaultValue: "Nữ" })}</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-2.5 text-sm text-gray-800 dark:text-white/90">
                      <Heart className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>
                        {isTeacher
                          ? teacherProfile?.gender === true ? "Nam" : teacherProfile?.gender === false ? "Nữ" : "N/A"
                          : studentProfile?.gender === true ? "Nam" : studentProfile?.gender === false ? "Nữ" : "N/A"}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Address (Editable if Teacher or Student) */}
              {(isTeacher || isStudent) && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t("profile.address", { defaultValue: "Địa chỉ" })}
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="h-10 w-full px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:border-brand-500"
                    />
                  ) : (
                    <div className="flex items-center gap-2.5 text-sm text-gray-800 dark:text-white/90">
                      <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>
                        {isTeacher ? teacherProfile?.address || "N/A" : studentProfile?.address || "N/A"}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Relationship (Editable for Parent) */}
              {isParent && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t("profile.relationship", { defaultValue: "Mối quan hệ" })}
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={editRelationship}
                      onChange={(e) => setEditRelationship(e.target.value)}
                      className="h-10 w-full px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:border-brand-500"
                    />
                  ) : (
                    <div className="flex items-center gap-2.5 text-sm text-gray-800 dark:text-white/90">
                      <Heart className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>{parentProfile?.relationship || "N/A"}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Role specific detailed block */}
          {isTeacher && teacherProfile && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-white/5">
                <Briefcase className="w-5 h-5 text-brand-500" />
                {t("profile.workInfo", { defaultValue: "Thông tin công tác & Chứng chỉ" })}
              </h3>
              
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Certificates (Read-only view) */}
                  {!editMode && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <span className="text-xs text-gray-400 font-semibold">{t("profile.certificatesList", { defaultValue: "Chứng chỉ đã lưu" })}</span>
                      {certificatesList.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {certificatesList.map((cert, idx) => (
                            <a
                              key={idx}
                              href={getImageUrl(cert) || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg dark:text-brand-400 dark:bg-brand-950/30 dark:hover:bg-brand-950/50 transition-colors"
                            >
                              <Award className="w-3.5 h-3.5 animate-pulse text-amber-500" />
                              <span className="truncate max-w-[200px]">{cert.split('/').pop()}</span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">N/A</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Description Bio (Editable in EditMode) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t("profile.bio", { defaultValue: "Giới thiệu bản thân" })}
                  </label>
                  {editMode ? (
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:border-brand-500 resize-none"
                    />
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-white/[0.02] p-4 rounded-xl border border-gray-100 dark:border-white/5">
                      {teacherProfile.description || "Chưa có giới thiệu bản thân."}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {isStudent && studentProfile && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-white/5">
                <Building2 className="w-5 h-5 text-brand-500" />
                {t("profile.schoolInfo", { defaultValue: "Thông tin trường học & Phụ huynh" })}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* School (Editable) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t("profile.schoolName", { defaultValue: "Trường đang theo học" })}
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={editSchoolName}
                      onChange={(e) => setEditSchoolName(e.target.value)}
                      className="h-10 w-full px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:border-brand-500"
                    />
                  ) : (
                    <div className="flex items-center gap-2.5 text-sm text-gray-800 dark:text-white">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span>{studentProfile.schoolName || "N/A"}</span>
                    </div>
                  )}
                </div>

                {/* Grade Level (Editable in EditMode) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t("profile.gradeLevel", { defaultValue: "Khối lớp" })}
                  </label>
                  {editMode ? (
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={editGradeLevel || ""}
                      onChange={(e) => setEditGradeLevel(e.target.value)}
                      className="h-10 w-full px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:border-brand-500"
                    />
                  ) : (
                    <div className="flex items-center gap-2.5 text-sm text-gray-800 dark:text-white">
                      <GraduationCap className="w-4 h-4 text-gray-400" />
                      <span>{studentProfile.gradeLevel ? `Lớp ${studentProfile.gradeLevel}` : "N/A"}</span>
                    </div>
                  )}
                </div>

                {/* Parent Name (Editable in EditMode) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t("profile.parentName", { defaultValue: "Người bảo hộ / Phụ huynh" })}
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={editParentName}
                      onChange={(e) => setEditParentName(e.target.value)}
                      className="h-10 w-full px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:border-brand-500"
                    />
                  ) : (
                    <div className="flex items-center gap-2.5 text-sm text-gray-800 dark:text-white">
                      <User className="w-4 h-4 text-gray-400" />
                      <span>{studentProfile.parentName || "N/A"}</span>
                    </div>
                  )}
                </div>

                {/* Parent Phone (Editable in EditMode) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t("profile.parentPhone", { defaultValue: "SĐT phụ huynh" })}
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={editParentPhone}
                      onChange={(e) => setEditParentPhone(e.target.value)}
                      className="h-10 w-full px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-hidden focus:border-brand-500"
                    />
                  ) : (
                    <div className="flex items-center gap-2.5 text-sm text-gray-800 dark:text-white">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{studentProfile.parentPhone || "N/A"}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {isParent && parentProfile && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-white/5">
                <Heart className="w-5 h-5 text-brand-500" />
                {t("profile.childrenList", { defaultValue: "Học sinh liên kết (Danh sách con)" })}
              </h3>

              <div className="space-y-4">
                {parentProfile.children && parentProfile.children.length > 0 ? (
                  parentProfile.children.map((child, idx) => (
                    <div 
                      key={child.studentId}
                      className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-brand-50 dark:bg-brand-950/20 text-brand-500 rounded-lg">
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                            {child.studentName || `Học sinh ID: ${child.studentId}`}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {t("profile.relationship", { defaultValue: "Mối quan hệ: " })} {child.relationship || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/[0.01] rounded-xl border border-dashed border-gray-200 dark:border-white/5">
                    {t("profile.noChildrenLinked", { defaultValue: "Chưa có học sinh nào được liên kết với tài khoản phụ huynh này." })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Account Actions & File Uploads */}
        <div className="space-y-6">
          {/* Avatar Upload (visible in editMode for Teacher and Student) */}
          {editMode && (isTeacher || isStudent) && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-brand-500" />
                {t("teacher.avatarLabel", { defaultValue: "Ảnh đại diện" })}
              </h3>
              <div 
                className="group mt-1.5 flex h-[280px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-880/50 dark:hover:bg-gray-800"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleFileChange}
                />
                
                {isUploading ? (
                  <div className="flex flex-col items-center py-6">
                    <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="mt-2 text-xs text-gray-500">Đang tải...</span>
                  </div>
                ) : avatarPreview ? (
                  <div className="group relative h-full w-full overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="object-cover w-full h-full"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPreviewImage(avatarPreview); }}
                        className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
                        title="Xem ảnh phóng to"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <span className="text-white text-xs font-medium px-3 py-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                        Thay đổi ảnh
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center py-2">
                    <div className="w-8 h-8 mb-1.5 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-medium text-brand-600 dark:text-brand-400 mb-1">
                      Tải ảnh lên
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Certificates Upload (visible in editMode for Teacher) */}
          {editMode && isTeacher && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
                <Award className="w-5 h-5 text-brand-500" />
                {t("teacher.certificateLabel", { defaultValue: "Chứng chỉ" })}
              </h3>
              <div 
                className="group mt-1.5 flex h-[280px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-880/50 dark:hover:bg-gray-800"
                onClick={() => certInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={certInputRef}
                  className="hidden"
                  multiple
                  accept="image/png, image/jpeg, image/jpg, application/pdf, .doc, .docx"
                  onChange={handleCertChange}
                />
                
                {isUploading ? (
                  <div className="flex flex-col items-center py-6">
                    <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="mt-2 text-xs text-gray-500">Đang tải...</span>
                  </div>
                ) : certFile || existingCertificate ? (
                  <div className="group relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-850">
                    {(certFile && certFile.type.startsWith('image/')) || (!certFile && isImage(existingCertificate)) ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedCertificateUrl as string}
                          alt="Certificate preview"
                          className="object-cover w-full h-full"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setPreviewImage(selectedCertificateUrl); }}
                            className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
                            title="Xem ảnh phóng to"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <span className="text-white text-xs font-medium px-3 py-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                            Thay đổi
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col items-center text-center p-4">
                          <FileText className="w-12 h-12 text-brand-500 mb-2" />
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 break-all max-w-full">
                            {certFile ? certFile.name : existingCertificate?.split('/').pop()}
                          </p>
                        </div>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-xs font-medium px-3 py-1.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors">Thay đổi</span>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center py-2">
                    <div className="w-8 h-8 mb-1.5 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
                      <Award className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-medium text-brand-600 dark:text-brand-400 mb-1">
                      {t("teacher.uploadCertificates", { defaultValue: "Tải nhiều chứng chỉ lên" })}
                    </p>
                  </div>
                )}
              </div>

              {((certificatesList?.length || 0) > 0 || certFiles.length > 0) && (
                <div className="mt-3">
                  <p className="mb-2 text-[11px] text-gray-500 dark:text-gray-400">{t("teacher.selectCertificatePreview")}</p>
                  <div className="max-h-44 space-y-2 overflow-y-auto">
                    {certificatesList.map((certificate, index) => (
                      <div key={`${certificate}-${index}`} className={`flex items-center gap-2 rounded-lg border p-2 transition-colors ${selectedCertificate?.type === "existing" && selectedCertificate.index === index ? "border-brand-400 bg-brand-50 ring-1 ring-brand-200 dark:border-brand-500 dark:bg-brand-500/10" : "border-gray-200 bg-white dark:border-gray-750 dark:bg-gray-850"}`}>
                        <button
                          type="button"
                          onClick={() => selectExistingCertificate(index)}
                          className="min-w-0 flex-1 truncate text-left text-xs font-medium text-gray-700 hover:text-brand-600 dark:text-gray-300 dark:hover:text-brand-400"
                          title={certificate.split('/').pop()}
                        >
                          {certificate.split('/').pop()}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeExistingCertificate(index)}
                          className="rounded p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                          aria-label={t("teacher.removeCertificate", { defaultValue: "Xóa chứng chỉ" })}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    {certFiles.map((file, index) => (
                      <div key={`${file.name}-${file.size}-${file.lastModified}`} className={`flex items-center gap-2 rounded-lg border p-2 transition-colors ${selectedCertificate?.type === "pending" && selectedCertificate.index === index ? "border-brand-500 bg-brand-100 ring-1 ring-brand-300 dark:border-brand-400 dark:bg-brand-500/20" : "border-brand-100 bg-brand-50/60 dark:border-brand-500/20 dark:bg-brand-500/10"}`}>
                        <button type="button" onClick={() => selectPendingCertificate(index)} className="min-w-0 flex-1 truncate text-left text-xs font-medium text-gray-700 hover:text-brand-600 dark:text-gray-300" title={file.name}>
                          {file.name}
                        </button>
                        <span className="text-[10px] font-medium text-brand-600 dark:text-brand-400">
                          {t("teacher.pendingUpload", { defaultValue: "Sẽ tải khi bấm Lưu" })}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePendingCertificate(index)}
                          className="rounded p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                          aria-label={t("teacher.removeCertificate", { defaultValue: "Xóa chứng chỉ" })}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Security details card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-white/5">
              <Shield className="w-5 h-5 text-brand-500" />
              {t("profile.securityTitle", { defaultValue: "Bảo mật tài khoản" })}
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t("profile.username", { defaultValue: "Tên đăng nhập" })}</span>
                <span className="font-semibold text-gray-800 dark:text-white">{username}</span>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 dark:text-brand-400 dark:bg-brand-950/30 dark:hover:bg-brand-950/50 rounded-xl transition-colors cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  {t("profile.changePasswordBtn", { defaultValue: "Đổi mật khẩu" })}
                </button>
              </div>
            </div>
          </div>

          {/* Instruction Card */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-6 dark:border-blue-900/30 dark:bg-blue-950/10">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300">
                  {t("profile.securityNoteTitle", { defaultValue: "Lưu ý bảo mật" })}
                </h4>
                <p className="mt-1.5 text-xs text-blue-800/80 dark:text-blue-400/90 leading-relaxed">
                  {t("profile.securityNoteText", { 
                    defaultValue: "Mọi thông tin hồ sơ của bạn được mã hóa và bảo mật nghiêm ngặt. Để bảo mật tài khoản tốt hơn, vui lòng không chia sẻ mã JWT token hoặc thông tin mật khẩu cho bất kỳ ai."
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-brand-500" />
                {t("profile.changePasswordTitle", { defaultValue: "Đổi mật khẩu" })}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPassError("");
                  setPassSuccess("");
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400 text-sm font-medium flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{passSuccess}</span>
              </div>
            )}

            {passError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400 text-sm font-medium flex items-center gap-2">
                <X className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{passError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Current Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("profile.oldPassword", { defaultValue: "Mật khẩu hiện tại" })}
                </label>
                <div className="relative">
                  <input
                    type={showOldPass ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full h-10 px-3.5 pr-10 text-sm bg-white border border-gray-300 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-hidden focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPass(!showOldPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  >
                    {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("profile.newPassword", { defaultValue: "Mật khẩu mới" })}
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full h-10 px-3.5 pr-10 text-sm bg-white border border-gray-300 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-hidden focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("profile.confirmPassword", { defaultValue: "Xác nhận mật khẩu mới" })}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full h-10 px-3.5 pr-10 text-sm bg-white border border-gray-300 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-hidden focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPassError("");
                    setPassSuccess("");
                  }}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-xl transition-colors cursor-pointer"
                >
                  {t("common.cancel", { defaultValue: "Hủy" })}
                </button>
                <button
                  type="submit"
                  disabled={changingPass}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-theme-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {changingPass ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {t("profile.submitChangePassword", { defaultValue: "Cập nhật mật khẩu" })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview overlay */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[99999999] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button 
            type="button"
            onClick={() => setPreviewImage(null)}
            className="fixed right-5 top-5 z-[100000000] p-2 text-white transition-colors hover:text-gray-200"
            aria-label="Close image preview"
          >
            <X className="h-7 w-7 stroke-[3]" />
          </button>
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImage} alt="Preview" className="max-h-[85vh] object-contain rounded-lg mx-auto" />
          </div>
        </div>
      )}
    </div>
  );
}

# Hướng Dẫn Phát Triển Chức Năng CRUD - Frontend (Next.js / React)

Tài liệu này hướng dẫn chi tiết quy trình xây dựng phần Frontend (Next.js / React) cho một màn hình chức năng CRUD (Thêm, Đọc, Sửa, Xóa) hoàn chỉnh, có áp dụng cơ chế đa ngôn ngữ (Localization), phân quyền (Permission-based), tìm kiếm trì hoãn (Debounce) và phân trang.

Dữ liệu mẫu đối chiếu trực tiếp với chức năng **Danh mục câu hỏi (QuestionCategory)**.

---

## I. Tổng Quan Cấu Trúc Frontend (`fe/src`)

Thư mục Frontend tổ chức các thành phần liên quan đến màn hình CRUD như sau:

```
fe/src/
├── app/                          # Định nghĩa cấu trúc các trang (Routing)
│   └── (admin)/
│       └── (others-pages)/
│           └── question-category/
│               └── page.tsx      # Entry point cho màn hình Danh mục câu hỏi
├── components/                   # Các UI Components dùng chung hoặc theo màn hình
│   ├── auth/
│   │   └── PermissionGuard.tsx   # Kiểm tra quyền client-side trước khi render UI
│   ├── common/
│   │   ├── PageBreadCrumb.tsx    # Thanh điều hướng trang
│   │   └── DeleteConfirmModal.tsx # Modal xác nhận xóa dùng chung
│   ├── question-category/        # Các component riêng của màn hình
│   │   ├── QuestionCategoryTable.tsx # Bảng hiển thị danh sách, phân trang, lọc, sắp xếp
│   │   └── CategoryFormModal.tsx     # Form Modal tạo mới / chỉnh sửa
│   └── ui/                       # UI atom components (table, modal,...)
├── constants/
│   └── endpoints.ts              # Định nghĩa tập trung URL API
├── i18n/                         # Cấu hình đa ngôn ngữ (Localization)
│   ├── locales/
│   │   ├── en.json               # Bản dịch Tiếng Anh
│   │   └── vi.json               # Bản dịch Tiếng Việt
│   └── i18n.ts                   # Khởi tạo thư viện i18next
└── services/                     # Quản lý gọi API đến Backend
    ├── api.ts                    # Cấu hình Axios/Fetch client, interceptors, refresh token
    └── questionCategory.api.ts   # Định nghĩa kiểu dữ liệu & hàm API QuestionCategory
```

---

## II. Quy Trình 4 Bước Xây Dựng CRUD Tại Frontend

### BƯỚC 1: Đăng ký API Endpoints & Tạo Service Wrapper

1. **Đăng ký URL Endpoints**:
   Mở file *[endpoints.ts](file:///d:/SEP490-G31/fe/src/constants/endpoints.ts)* và thêm đường dẫn API tương ứng:
   ```typescript
   QUESTION_CATEGORY: {
     GET_ALL: "/api/QuestionCategory",
     GET_BY_ID: (id: number) => `/api/QuestionCategory/${id}`,
     CREATE: "/api/QuestionCategory",
     UPDATE: (id: number) => `/api/QuestionCategory/${id}`,
     DELETE: (id: number) => `/api/QuestionCategory/${id}`,
     DEACTIVE: (id: number) => `/api/QuestionCategory/${id}/deactive`,
   }
   ```

2. **Tạo API Service Wrapper**:
   Tạo file trong thư mục `fe/src/services/` (ví dụ: *[questionCategory.api.ts](file:///d:/SEP490-G31/fe/src/services/questionCategory.api.ts)*).
   * Định nghĩa các interface DTO tương ứng của Frontend để quản lý kiểu dữ liệu tĩnh.
   * Sử dụng client `api` dùng chung từ *[api.ts](file:///d:/SEP490-G31/fe/src/services/api.ts)* (đã xử lý sẵn tự động gửi kèm JWT Token trong Header, xử lý quay vòng refresh token khi hết hạn, xử lý log out khi phiên đăng nhập hết hạn).

---

### BƯỚC 2: Cấu hình Bản Địa Hóa (Localization - Đa Ngôn Ngữ)

Đa ngôn ngữ được quản lý tập trung ở thư mục `fe/src/i18n/locales/`.

1. Khai báo các khóa dịch của màn hình (ví dụ: `questionCategory`) trong tệp dịch [vi.json](file:///d:/SEP490-G31/fe/src/i18n/locales/vi.json) và [en.json](file:///d:/SEP490-G31/fe/src/i18n/locales/en.json) để hiển thị nhãn tĩnh.
2. Khai báo các thông điệp phản hồi từ Backend vào nhóm `backendMessages` để hiển thị thông báo lỗi hoặc thông báo thành công:
   ```json
   "backendMessages": {
     "CREATE_CATEGORY_SUCCESS": "Tạo mới danh mục câu hỏi thành công",
     "ERR_CODE_DUPLICATE": "Mã danh mục đã tồn tại trên hệ thống",
     "ERR_CODE_EMPTY": "Mã danh mục câu hỏi không được để trống"
   }
   ```

---

### BƯỚC 3: Tạo Form Modal Component & Bảng Dữ Liệu (Table Component)

1. **Form Modal Component** (Ví dụ: [CategoryFormModal.tsx](file:///d:/SEP490-G31/fe/src/components/question-category/CategoryFormModal.tsx)):
   * Thiết kế một Modal nhận trạng thái bật tắt (`isOpen`, `onClose`), dữ liệu đang sửa (`editingItem`) và các hàm điều khiển từ component cha.
   * Xử lý hiển thị động tiêu đề (Thêm mới hay Sửa) dựa trên giá trị `editingItem`.
   * Cung cấp các input và hiển thị lỗi xác thực form (`formError`) trực tiếp phía dưới form.

2. **Bảng dữ liệu (Table Component)** (Ví dụ: [QuestionCategoryTable.tsx](file:///d:/SEP490-G31/fe/src/components/question-category/QuestionCategoryTable.tsx)):
   * **Bản địa hóa động tiêu đề trang**:
     ```typescript
     useEffect(() => {
       document.title = `${t("questionCategory.title")} | School Management System`;
     }, [t]);
     ```
   * **Quản lý phân trang & tìm kiếm**:
     * Sử dụng hai trạng thái: `searchTerm` gắn với input tìm kiếm và `debouncedSearchTerm` dùng để truyền lên API.
     * Sử dụng `useEffect` có độ trễ 500ms để gán `debouncedSearchTerm = searchTerm` nhằm tránh gọi API liên tục khi người dùng đang gõ.
   * **Bảo vệ quyền hạn UI bằng `<PermissionGuard>`**:
     Bao bọc các nút hành động để chỉ hiển thị khi tài khoản có quyền tương ứng:
     ```tsx
     <PermissionGuard requiredPermission="QuestionCategory.Create">
       <button onClick={openCreateModal}>{t("questionCategory.addCategory")}</button>
     </PermissionGuard>
     ```
   * **Xử lý phản hồi lỗi từ API**:
     Ánh xạ trực tiếp mã lỗi từ Backend sang đa ngôn ngữ giao diện:
     ```typescript
     setError(res.message ? t(`backendMessages.${res.message}`, { defaultValue: res.message }) : t("questionCategory.systemError"));
     ```
   * **Xác nhận xóa**:
     Tích hợp modal xác nhận dùng chung [DeleteConfirmModal.tsx](file:///d:/SEP490-G31/fe/src/components/common/DeleteConfirmModal.tsx) cho hành động Xóa để đồng bộ trải nghiệm người dùng.

---

### BƯỚC 4: Tạo Next.js Page Router

Khai báo tệp `page.tsx` trong thư mục `fe/src/app/(admin)/(others-pages)/question-category/`.
* Khai báo breadcrumb điều hướng: `<PageBreadcrumb pageTitle="questionCategory.title" />`.
* Nhúng `<QuestionCategoryTable />` để xử lý giao diện phía Client.
* *Ví dụ: [page.tsx](file:///d:/SEP490-G31/fe/src/app/\(admin\)/\(others-pages\)/question-category/page.tsx)*

---

## III. Chi Tiết Cơ Chế Bản Địa Hóa (Localization) Tại Frontend

Dự án sử dụng thư viện `react-i18next`. Để hiển thị văn bản đa ngôn ngữ:

1. **Import Hook**:
   ```typescript
   import { useTranslation } from "react-i18next";
   const { t } = useTranslation();
   ```
2. **Dịch văn bản tĩnh**:
   ```tsx
   <span>{t("questionCategory.entries", { defaultValue: "mục" })}</span>
   ```
3. **Dịch văn bản động truyền tham số**:
   Nếu trong JSON dịch có khai báo:
   `"deleteConfirmDesc": "Bạn có chắc chắn muốn xóa danh mục \"{{name}}\"?"`
   Ta dịch bằng cách truyền thêm đối tượng chứa tham số:
   ```typescript
   t("questionCategory.deleteConfirmDesc", { name: item.name })
   ```
4. **Dịch mã lỗi trả về từ API (Rất quan trọng)**:
   Backend luôn trả về mã lỗi (ví dụ: `ERR_CODE_DUPLICATE`). Frontend sẽ dịch mã lỗi này bằng cách lấy khóa tương ứng trong `backendMessages`:
   ```typescript
   t(`backendMessages.${res.message}`, { defaultValue: res.message })
   ```

---

## IV. Các Pattern Lập Trình Nổi Bật Tại Frontend

* **Permission Guard**: Sử dụng component [PermissionGuard.tsx](file:///d:/SEP490-G31/fe/src/components/auth/PermissionGuard.tsx) để ẩn các nút chức năng (Thêm, Sửa, Xóa) nếu tài khoản không có quyền tương ứng.
* **Debounce Input Search**: Tránh spam requests gửi lên Server bằng cách dùng bộ trễ thời gian (Debounce 500ms) cho ô nhập tìm kiếm.
* **Optimistic / Force Re-fetching**: Sử dụng trạng thái `refreshKey` tăng dần để kích hoạt re-fetch dữ liệu phân trang bất cứ khi nào có hành động Thêm/Sửa/Xóa thành công.
* **Interceptors Auth**: Axios/Fetch wrapper tại `api.ts` tự động chèn JWT token và xử lý refresh token tự động dưới nền mà không gián đoạn trải nghiệm người dùng.

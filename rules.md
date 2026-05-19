# Quy tắc và Hướng dẫn Tuân thủ Dự án Frontend (Frontend Next.js Coding Rules)

Tài liệu này định nghĩa các nguyên tắc phát triển phần mềm, quy chuẩn thiết kế, bảo mật, hiệu năng và quy trình làm việc cần được tuân thủ nghiêm ngặt trong phạm vi dự án **Frontend (Next.js & React)**.

---

## 1. Cấu trúc Thư mục & Routing (App Router)

* **Next.js App Router**:
  * Tất cả các trang được định nghĩa trong thư mục `src/app/` dưới dạng các thư mục con chứa file `page.tsx`.
  * Sử dụng **Route Groups** (thư mục có dấu ngoặc đơn, ví dụ: `(admin)`, `(full-width-pages)`) để phân nhóm các trang có cùng bố cục (Layout) mà không ảnh hưởng đến cấu trúc URL.
* **Component Separation**:
  * Các component giao diện dùng chung toàn hệ thống đặt trong `src/components/ui/` hoặc `src/components/common/`.
  * Các component đặc thù của chức năng đặt trong thư mục riêng biệt tại `src/components/{feature}/` (ví dụ: `src/components/ecommerce/`).
* **Đường dẫn Tuyệt đối (Absolute Imports)**:
  * Sử dụng alias `@/*` (định nghĩa trong `tsconfig.json`) để import các file từ thư mục `src`. Nghiêm cấm sử dụng các đường dẫn tương đối quá sâu (ví dụ: `../../../../components`).

---

## 2. Chiến lược Render & Viết Component (React & TypeScript)

* **Server Components & Client Components**:
  * Theo mặc định, mọi component trong thư mục `src/app` là **React Server Components (RSC)**. Hãy giữ chúng ở dạng Server Component để tối ưu hóa SEO và tốc độ tải trang.
  * Chỉ thêm chỉ thị `"use client"` ở dòng đầu tiên của file khi component đó bắt buộc phải sử dụng React hooks (`useState`, `useEffect`, `useContext`, `useRef`), hoặc xử lý các sự kiện của người dùng (`onClick`, `onChange`, v.v.).
* **TypeScript Types**:
  * Mọi component và hàm xử lý dữ liệu phải được định nghĩa kiểu dữ liệu rõ ràng bằng `interface` hoặc `type`. Không lạm dụng kiểu dữ liệu `any`.

---

## 3. Quy chuẩn Giao diện & Styling (Tailwind CSS & UX)

* **Thiết kế Nhất quán (Consistent Styling)**:
  * Sử dụng Tailwind CSS để định dạng giao diện. Chỉ sử dụng các token màu hệ thống đã được cấu hình (ví dụ: `brand-500`, `gray-300`, `dark:border-gray-800`).
  * Tránh viết inline styles (`style={{...}}`) trừ trường hợp bất khả kháng liên quan đến các giá trị động tính toán theo thời gian thực.
* **Hỗ trợ Dark Mode & Responsive**:
  * Tất cả giao diện mới phải hỗ trợ đầy đủ chế độ tối (sử dụng lớp `dark:`) và hiển thị tốt trên mọi loại thiết bị (sử dụng breakpoint của Tailwind: `sm:`, `md:`, `lg:`, `xl:`).
* **Trải nghiệm Người dùng (UX)**:
  * Thêm các trạng thái Loading (Skeleton, Spinner) khi gọi API và thông báo lỗi/thành công (Toast, Alert) trực quan.

---

## 4. Tích hợp API & Xác thực (API Integration)

* **Quản lý API Call tập trung**:
  * Gom các hàm gọi API vào lớp Service hoặc các Custom Hooks riêng thay vì gọi fetch/axios trực tiếp trong các UI component.
  * Đường dẫn API cơ sở (Base URL) phải được cấu hình thông qua biến môi trường (ví dụ: `process.env.NEXT_PUBLIC_API_URL`).
* **Quản lý Token**:
  * JWT Token sau khi đăng nhập thành công cần được lưu trữ bảo mật (Cookie hoặc LocalStorage) và tự động đính kèm vào header `Authorization: Bearer <Token>` của mỗi request gửi tới Backend.

---

## 5. Quy trình Làm việc & An toàn Mã nguồn

* **Nguyên tắc Git & Workspace**:
  * Tuyệt đối **không được tự ý thực hiện các lệnh git trên local** (`không được đụng vào git`) để tránh xung đột hoặc ghi đè lịch sử mã nguồn ngoài ý muốn.
  * Không commit các file cấu hình cục bộ (`.env.local`), thư mục build (`.next/`), hay `node_modules/` lên Git. Đảm bảo file `.gitignore` hoạt động chính xác.


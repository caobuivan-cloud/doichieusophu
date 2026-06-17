# Project Structure - DoiChieuSoPhu

> Tạo ngày: 2026-06-10
> Cập nhật gần nhất: 2026-06-17
> Mục đích: Lưu snapshot cấu trúc codebase để AI có thể onboard và resume nhanh.

---

## 1. Snapshot cây thư mục

```text
[root]/
|-- .agent/
|   |-- changelog/
|   |   |-- CHANGELOG-FE.md
|   |-- testing/
|   |   |-- customer-sync-and-upload-test-cases.md
|   |   |-- export-excel-template-update-test-cases.md
|   |-- skills/
|-- assets/
|-- scratch/
|   |-- test-helpers.ts
|-- src/
|   |-- components/
|   |-- utils/
|   |   |-- exportHelpers.ts
|   |   |-- googleSheetsSync.ts
|   |   |-- portalAuth.ts
|   |-- App.tsx
|   |-- main.tsx
|   |-- index.css
|-- .env.example
|-- .gitignore
|-- index.html
|-- package.json
|-- server.ts
|-- tsconfig.json
|-- vite.config.ts
```

## 2. Entry Points

| Loại | File/Path | Vai trò | Ghi chú |
|------|-----------|---------|---------|
| Frontend | `index.html` (chứa `src/main.tsx` hoặc tương tự) | Bootstrap ứng dụng | Build qua Vite |
| Backend | `server.ts` | Khởi động API/server | Dùng Express và chạy bằng `tsx` |

## 3. Services / Modules chính

| Module/Service | Path | Trách nhiệm | Phụ thuộc chính |
|----------------|------|-------------|------------------|
| Frontend App | `src/` | Chứa code giao diện React | React, TailwindCSS, Vite |
| Backend App | `server.ts` | Cung cấp endpoint API | Express, XLSX |

## 4. Config / Infra quan trọng

| File | Nhóm | Ý nghĩa | Lưu ý khi chỉnh sửa |
|------|------|---------|---------------------|
| `package.json` | Build/Deps | Quản lý package, scripts | Có kết hợp build lệnh cho cả FE/BE |
| `vite.config.ts` | Build | Cấu hình build Vite | Ảnh hưởng việc phân chia public folder/proxy API |
| `tsconfig.json` | Compile | Cấu hình TypeScript | Kiểm tra type-checking cho file TS |
| `.env.example` | Runtime config | Cấu hình môi trường mẫu | Cần tạo `.env` khi run local |

## 5. Commands

| Mục đích | Lệnh | Điều kiện | Ghi chú |
|----------|------|-----------|---------|
| Chạy local | `npm run dev` | - | Chạy server bằng tsx (`server.ts`) |
| Build | `npm run build` | - | Build Vite frontend |
| Chạy production | `npm run start` | Đã build trước | Chạy server với `NODE_ENV=production tsx server.ts` |
| Dọn dẹp | `npm run clean` | - | Xóa thư mục dist và `server.js` |
| Lint | `npm run lint` | - | Chạy `tsc --noEmit` để kiểm tra lỗi type |

## 6. Luồng đọc nhanh cho AI

- Khi sửa UI: ưu tiên đọc `src/` và cấu hình `vite.config.ts`.
- Khi sửa Backend/API: ưu tiên đọc `server.ts`.

## 7. Ghi chú từ lần quét đầu

- Package manager: npm (xác nhận qua `package-lock.json` tồn tại)
- Kiểu repo: Single app (Frontend và Backend gộp chung một thư mục, một package.json)
- Test framework: Chưa cấu hình / không có

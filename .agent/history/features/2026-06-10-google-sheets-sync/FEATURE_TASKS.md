# Feature Tasks: Đồng bộ Google Sheets cho Bảng Mã Khách Hàng và Activity Log

> **Trạng thái**: ✅ Hoàn thành
> **Liên kết plan**: `FEATURE_PLAN.md`
> **Ngày tạo**: 2026-06-10

---

## Quy ước checklist

- `- [ ]`: Chưa làm
- `- [/]`: Đang làm
- `- [x]`: Hoàn thành

## Phase 1: Core Service và Data Parser

**Mục tiêu:** Tạo các hàm tiện ích tương tác với Google Apps Script Web App.

- [x] Task 1.0: Tạo file `gas/Code.gs` chứa mã Google Apps Script để user copy vào GAS project.
- [x] Task 1.1: Tạo file `src/utils/googleSheetsSync.ts`.
- [x] Task 1.2: Định nghĩa các hàm `loadSheetsConfig`, `saveSheetsConfig`.
- [x] Task 1.3: Định nghĩa hàm `writeActionLogToSheet`.
- [x] Task 1.4: Viết hàm `pullCustomersFromGoogleSheet` và `pushCustomersToGoogleSheet` với parser mapping đúng 5 cột cho `AccountingCustomer`.
- [x] Task 1.Final: 🧪 Test & Verify Phase 1 (Bắt buộc)

## Phase 2: UI Cấu Hình và Tích Hợp Lifecycle

**Mục tiêu:** Tạo giao diện Settings và load/push dữ liệu tự động từ `App.tsx`.

- [x] Task 2.1: Tạo file `src/components/GoogleSheetsSettings.tsx` với logic tương tự project gốc.
- [x] Task 2.2: Sửa `src/App.tsx` để import và hiển thị Component Settings (có thể đặt vào Sidebar hoặc một tab Cấu Hình riêng).
- [x] Task 2.3: Bổ sung logic `useEffect` trong `App.tsx` để auto-pull dữ liệu khi ứng dụng mở.
- [x] Task 2.4: Tạo logic bóc tách tham số định danh (Email) từ AI Hub URL (hash hoặc query string) và lưu vào state cấu hình của ứng dụng.
- [x] Task 2.Final: 🧪 Test & Verify Phase 2 (Bắt buộc)

## Phase 3: Activity Logging

**Mục tiêu:** Ghi log các thao tác quan trọng của user.

- [x] Task 3.1: Gắn lệnh `writeActionLogToSheet` vào hàm xử lý xuất Excel (`handleExportData`).
- [x] Task 3.2: Gắn log cho các hành động thay đổi Bảng Mã thủ công (nếu cần).
- [x] Task 3.Final: 🧪 Test & Verify Phase 3 (Bắt buộc)

---

## Execution Log

| Thời gian | Phase | Task | Hành động | Trạng thái | Ghi chú |
|-----------|-------|------|-----------|-----------|---------|
| 2026-06-10 17:23 | Phase 1 | Task 1.0 | Tạo file Code.gs | done | User đã deploy thành công |
| 2026-06-10 17:23 | Phase 1 | Task 1.1-1.4 | Tạo file googleSheetsSync.ts | done | |
| 2026-06-10 17:24 | Phase 1 | Task 1.Final | Type check Phase 1 | done | User approved |
| 2026-06-10 17:25 | Phase 2 | Task 2.1-2.4 | Tích hợp GoogleSheetsSettings vào App.tsx | done | |
| 2026-06-10 17:34 | Phase 2 | Task 2.Final | Deploy script mới & UI URL input | done | Đã xử lý lỗi dùng nhầm script cũ |
| 2026-06-10 17:35 | Phase 3 | Task 3.1-3.2 | Thêm log cho thao tác Xuất và CRUD | done | |
| 2026-06-10 17:36 | Phase 3 | Task 3.Final | Manual Test Phase 3 | done | Hoàn thành toàn bộ Feature |

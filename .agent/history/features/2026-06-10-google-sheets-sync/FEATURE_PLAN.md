# Feature Plan: Đồng bộ Google Sheets cho Bảng Mã Khách Hàng và Activity Log

> **Trạng thái**: ✅ ĐỒNG Ý
> **Review gate**: Đã được thông qua bởi Chief Architect, tiến hành bằng feature-coordinator.
> **Feature slug**: google-sheets-sync
> **Tạo bởi**: feature-plan
> **Ngày tạo**: 2026-06-10

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:** Hiện tại ứng dụng Đối Chiếu Sổ Phụ chỉ hoạt động hoàn toàn trên client (local state). Dữ liệu `AccountingCustomer` (Bảng Mã Khách Hàng Chuẩn) sẽ bị mất khi tải lại trang, và hệ thống không lưu vết các hành động của người dùng.
- **Vấn đề cần giải quyết:** Cần cơ chế lưu trữ bền vững thông qua Google Sheets (Web App) tương tự dự án `HachToanBaoCo`, đồng thời ghi log các hành động quan trọng (export, thêm/sửa/xóa mã khách).
- **Mục tiêu:** 
  1. Cho phép load dữ liệu Bảng Mã Khách Hàng Chuẩn từ Google Sheets khi mở ứng dụng.
  2. Ghi đè cấu hình mới nhất lên Google Sheets.
  3. Ghi log các hoạt động (activity) vào Sheet Log.
- **Kết quả mong đợi:** Ứng dụng tự động kéo dữ liệu Bảng Mã về trên startup và hỗ trợ đồng bộ, lưu vết lên đám mây ổn định.

## 2. Phạm vi

### In scope
- Tạo file `src/utils/googleSheetsSync.ts` để chứa logic gọi API tới Google Apps Script.
- Xây dựng Component cấu hình Google Sheets Settings (tương tự `GoogleSheetsSettings.tsx` bên `HachToanBaoCo`).
- Tích hợp Load Bảng mã khi vừa mở trang (`useEffect` startup pull).
- Tích hợp Push Bảng mã khi user cập nhật.
- Ghi log (Activity Log) khi user thao tác quan trọng (Export, Sync, v.v).

- Tạo script Google Apps Script (GAS) `Code.gs` để user copy dán vào dự án GAS của họ. Kế thừa việc xác định email bằng cách nhận từ client (AI Hub URL hash) để phân quyền/ghi log thay vì dùng OAuth.
- Khai thác Web App publish ở chế độ "Anyone" để bỏ qua Google OAuth trên trình duyệt ẩn danh.

### Out of scope
- Tự động deploy GAS Script (user sẽ copy script và tự deploy rồi cung cấp URL lại).

## 3. Đối chiếu Knowledge Base

- **Quyết định kế thừa:** Tôn trọng kiến trúc Single App (client-side focus). Sử dụng REST API fetch truyền thống tới GAS webhook thay vì kéo heavy backend SDK.
- **Ràng buộc kiến trúc liên quan:** Không dùng Database truyền thống, tiếp tục dùng Excel/Google Sheets.

## 4. Giả định và câu hỏi mở

### Giả định
- User đã có sẵn hoặc biết cách deploy Google Apps Script Web App hỗ trợ các action: `get_rules` (get customers), `overwrite_rules` (overwrite customers), và `log` (ghi activity).
- `AccountingCustomer` map ra 5 cột trên Google Sheets: `Mã KH`, `Email`, `Tên Công Ty`, `MST`, `Địa Chỉ`. (Khác với `HachToanBaoCo` là KeywordRule, cấu trúc cột sẽ cần điều chỉnh lại một chút cho chuẩn).

### Câu hỏi mở
- [Non-blocking] Cột trong sheet "Bảng Mã Khách Hàng" trên Google Sheets cần tuân theo thứ tự chính xác nào? Tôi sẽ giả định là: Cột 1: Mã KH, Cột 2: Email, Cột 3: Tên Công ty, Cột 4: MST, Cột 5: Địa Chỉ.

## 5. Acceptance Criteria

- [ ] Hiển thị được giao diện cấu hình Web App URL trong ứng dụng.
- [ ] Mở ứng dụng tự động load Bảng Mã Khách Hàng từ Google Sheets.
- [ ] User có thể "Lưu đè" cấu hình Bảng mã hiện tại lên Sheets.
- [ ] Các hành động export được lưu vết lại qua `writeActionLogToSheet`.

## 6. Files và modules bị ảnh hưởng

| File/Module | Hành động | Lý do chạm vào | Rủi ro | Contract |
|-------------|-----------|----------------|--------|----------|
| `src/utils/googleSheetsSync.ts` | Tạo mới | Service quản lý kết nối Google Sheets | 🟡 | Chưa |
| `src/components/GoogleSheetsSettings.tsx` | Tạo mới | UI để user nhập Web App URL, config sync | 🟢 | Chưa |
| `src/App.tsx` | Sửa | Gắn logic startup pull, logging, và nhúng component cấu hình | 🟡 | Có |

## 7. Risk Triage và Review Focus

- **Review required:** Yes
- **Risk hotspots:** Hàm parser từ raw array trả về từ GAS (`parseKeywordRulesRows` => cần sửa thành `parseCustomerRows`).
- **Review focus areas:** Cách mapping dữ liệu 5 cột của `AccountingCustomer` với format mảng 2 chiều của Sheets.

## 8. Chiến lược triển khai

- **Phase strategy:** 
  - Phase 1: Tạo Core Service (`googleSheetsSync.ts`) và điều chỉnh Parser.
  - Phase 2: Tạo Component Cấu Hình (`GoogleSheetsSettings.tsx`) và tích hợp vào `App.tsx`.
  - Phase 3: Bổ sung Activity Logging cho các chức năng.
- **Thứ tự triển khai:** Phase 1 -> Phase 2 -> Phase 3.

## 9. Test Strategy

- **Manual verification:** Gắn Web App URL thật vào local localStorage và thử Load / Sync đè dữ liệu. Kiểm tra Sheet Log xem có nhận ghi chép không.

## 10. Rollback Plan

- Reset file `src/App.tsx` về commit `e3e5fdb` bằng Git.

## 11. Tham chiếu thực thi

- Checklist chi tiết theo phase: `FEATURE_TASKS.md`

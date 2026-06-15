# Feature Tasks: BIZFLY Mode Select

> **Trạng thái**: 🎉 Hoàn thành
> **Liên kết plan**: `FEATURE_PLAN.md`
> **Ngày tạo**: 2026-06-15

---

## Quy ước checklist

- `- [ ]`: Chưa làm
- `- [/]`: Đang làm
- `- [x]`: Hoàn thành
- Cuối mỗi phase bắt buộc có `Task X.Final: 🧪 Test & Verify Phase X`

---

## Phase 1: Nâng cấp Apps Script và thiết lập API

**Mục tiêu:** Cập nhật script Google Apps và API helper ở Frontend để hỗ trợ lưu trữ tách biệt 2 phân hệ (Cloud và BIZFLY) trên cùng 1 Google Sheet, tách biệt quyền đọc/ghi allowlist, tích hợp PropertiesService token và tối ưu hóa payload.

- [x] Task 1.1: Sửa đổi `gas/Code.gs` để bổ sung sheet `Bảng Mã Khách Hàng BIZFLY` với tiêu đề tại dòng 2 (nếu chưa có). Apps Script ghi log cảnh báo nếu sheet vừa được tạo mới hoặc không có dữ liệu thực tế.
- [x] Task 1.2: Phân tách allowlist truy cập trong `gas/Code.gs`:
  - `READ_ALLOWLIST` chỉ cho phép đọc `Bảng Mã Khách Hàng Chuẩn` và `Bảng Mã Khách Hàng BIZFLY`. Cấm tuyệt đối `doGet` đọc sheet `Activity Log`.
  - `WRITE_ALLOWLIST` cho phép ghi vào `Bảng Mã Khách Hàng Chuẩn` và `Activity Log`.
- [x] Task 1.3: Cập nhật hàm `doGet` trong `Code.gs` để loại bỏ dòng header trước khi trả về dữ liệu cho frontend (Cloud API trả 5 cột dữ liệu sạch đã bỏ header; BIZFLY API trả 4 cột dữ liệu sạch đã bỏ header).
- [x] Task 1.4: Tích hợp xác thực token: Cấu hình `SHARED_WRITE_TOKEN` trong Apps Script bằng `PropertiesService` để bảo vệ hành động ghi đè dữ liệu (`overwrite_rules`). Miễn kiểm tra token đối với hành động ghi log (`log`) append-only để tránh lỗi mất log do chưa cấu hình token.
- [x] Task 1.5: Cập nhật `src/utils/googleSheetsSync.ts` để định nghĩa Type `BizflyCustomer` và hàm parser riêng biệt (`parseBizflyCustomerRows`), đồng thời cho phép truyền tham số `mode` và token xác thực khi gọi API.
- [x] Task 1.Final: 🧪 Test & Verify Phase 1: Gọi thử Apps Script để kiểm tra việc đọc/ghi dữ liệu, đảm bảo bảo mật (cấm đọc Log, bắt buộc token cho overwrite) và trả về mảng dữ liệu sạch (không có header) cho cả hai phân hệ.

## Phase 2: UI Switcher, Di trú dữ liệu và Phân tách State trong App.tsx

**Mục tiêu:** Tích hợp bộ chuyển chế độ trực tiếp vào App đơn khối `App.tsx`, di trú dữ liệu cũ an toàn, và phân tách sạch sẽ bộ nhớ cache/localStorage giữa hai phân hệ (chống lỗi tràn quota).

- [x] Task 2.1: Thêm state `mode` (`'cloud' | 'bizfly'`) và tích hợp UI Switcher (Tabs hoặc Dropdown selector) ở góc màn hình chính của `App.tsx` bằng design system glassmorphism.
- [x] Task 2.2: Tích hợp logic di trú tự động (migration): Khi khởi chạy app, kiểm tra nếu tồn tại key localStorage cũ `accounting_customers`, copy dữ liệu sang key mới `accounting_customers_cloud`, kiểm tra ghi thành công mới tiến hành xóa key cũ.
- [x] Task 2.3: Tách biệt key lưu trữ localStorage: `accounting_customers_cloud` và `accounting_customers_bizfly`. 
- [x] Task 2.4: Bảo vệ quota localStorage: Thêm block try/catch cho việc ghi đè cache. Đối với bảng mã BIZFLY (10k dòng), nếu xảy ra lỗi `QuotaExceededError`, tự động hạ cấp lưu trữ trong bộ nhớ tạm thời của React state (React in-memory state) hoặc `sessionStorage` và hiển thị cảnh báo cho người dùng mà không làm crash app.
- [x] Task 2.5: Phân tách và reset toàn bộ states workflow (file upload, dòng đối soát `processedRows`, `manualRows`, `exportConfig`) khi người dùng chuyển đổi mode để tránh hiện tượng rò rỉ dữ liệu.
- [x] Task 2.Final: 🧪 Test & Verify Phase 2: Chuyển đổi qua lại giữa Cloud và BIZFLY, kiểm tra xem dữ liệu được tải độc lập, states workflow được reset hoàn toàn và không có lỗi crash xảy ra kể cả khi localStorage bị giả lập lỗi tràn bộ nhớ.

## Phase 3A: Tích hợp Virtual Scrolling và Debounce cho bảng BIZFLY

**Mục tiêu:** Cài đặt thư viện và tích hợp virtual scrolling cùng bộ lọc debounce để hiển thị mượt mà 10k dòng khách hàng BIZFLY mà không ảnh hưởng đến giao diện của Cloud.

- [x] Task 3A.1: Cài đặt thư viện virtual scroll (ví dụ `react-window` hoặc giải pháp render ảo tùy biến nhẹ nhàng phù hợp với TailwindCSS v4).
- [x] Task 3A.2: Tái cấu trúc bảng hiển thị danh sách khách hàng chuẩn trong `App.tsx` để áp dụng virtual scroll **chỉ dành riêng cho bảng BIZFLY**. Giữ nguyên cơ chế phân trang 15 dòng cho bảng mã Cloud.
- [x] Task 3A.3: Tích hợp cơ chế **debounce (150-300ms) hoặc deferred value** cho bộ lọc tìm kiếm trên bảng mã khách hàng BIZFLY để tránh việc re-filter liên tục trên mỗi keystroke làm đơ input.
- [x] Task 3A.Final: 🧪 Test & Verify Phase 3A: Kiểm tra độ mượt khi cuộn trang, gõ phím tìm kiếm và lọc dữ liệu trên danh sách 10,000 dòng BIZFLY. Xác nhận bảng Cloud vẫn hoạt động phân trang bình thường.

## Phase 3B: Thuật toán đối soát BIZFLY và xuất Excel

**Mục tiêu:** Xây dựng module đối soát 4 bước cho phân hệ BIZFLY (xử lý dòng unmatched) và xuất Excel hạch toán đầu ra đúng định dạng.

- [x] Task 3B.1: Tạo file `src/utils/bizflyReconciliation.ts` và khai báo hằng số mapping cột `PROJECTED_API_COLUMN_MAP` (0=Số PL, 1=Tên sale, 2=Nhãn hàng, 3=Mã khách) phục vụ đối soát mảng dữ liệu 4 cột nhận được từ API.
- [x] Task 3B.2: Triển khai thuật toán đối soát BIZFLY 4 bước: so khớp File 1 và File 2 qua cột D (File 1) và cột BG (File 2, index 58) để lấy Số PL, sau đó tra cứu cột Số PL (index 0) trong mảng dữ liệu BIZFLY đã rút gọn.
- [x] Task 3B.3: Triển khai logic xử lý dòng không khớp (Unmatched): tự động gán Mã khách là `"KH020219"`, các trường Nhãn hàng/Sale để trống.
- [x] Task 3B.4: Thiết kế khu vực upload file riêng biệt cho phân hệ BIZFLY (nhận 2 file Excel Sổ chi tiết công nợ và Thông tin HD/PLHD) trong `App.tsx`, bổ sung loading indicator khi parse file và validate kích thước file tối đa 10MB.
- [x] Task 3B.5: Tích hợp UI cấu hình hạch toán BIZFLY (thiết lập mặc định: ĐVCS `"HANOI"`, Tk nợ `"112106"`, mã giao dịch `"2"`, vụ việc `"BIZFLY"`, bộ phận `"DIG.TRAN"`) và logic xuất Excel hạch toán BIZFLY (ghép diễn giải cho matched, giữ nguyên diễn giải cho unmatched).
- [x] Task 3B.Final: 🧪 Test & Verify Phase 3B: Thực hiện đối soát thực tế với file test dữ liệu BIZFLY, kiểm tra logic mapping cho cả dòng khớp và không khớp, xác nhận file Excel xuất ra có cấu trúc cột chính xác, diễn giải ghép đúng yêu cầu và log có prefix `[BIZFLY]`.

## Phase 4: Kiểm thử và Hướng dẫn deploy

**Mục tiêu:** Bảo đảm không có lỗi regression với Cloud và hướng dẫn người dùng deploy lại Apps Script.

- [x] Task 4.1: Kiểm thử hồi quy (Regression test) toàn bộ phân hệ Cloud để đảm bảo việc nâng cấp UI và state trong `App.tsx` không làm ảnh hưởng đến luồng đối soát Cloud hiện có.
- [x] Task 4.2: Tạo script kiểm thử đơn giản chạy bằng `tsx` trong thư mục `scratch/` để xác nhận thuật toán đối soát BIZFLY hoạt động chính xác với mock data.
- [x] Task 4.3: Viết tài liệu hướng dẫn người dùng cập nhật code `Code.gs` và deploy Apps Script Web App (cách set token trong PropertiesService).
- [x] Task 4.Final: 🧪 Test & Verify Phase 4: Chạy thử toàn bộ ứng dụng và sẵn sàng bàn giao.

---

## Execution Log

| Thời gian | Phase | Task | Hành động | Trạng thái | Ghi chú |
|-----------|-------|------|-----------|-----------|---------|
| 2026-06-15 16:20 | Phase 1 | Khởi tạo | Tạo tài liệu plan và tasks | done | Khởi động tính năng |
| 2026-06-15 22:30 | Phase 1 | Task 1.1 | Bắt đầu sửa đổi Code.gs để tạo sheet BIZFLY và cấu hình allowlist | start | |
| 2026-06-15 22:35 | Phase 1 | Task 1.Final | Hoàn tất Task 1.1 - 1.5, tiến hành kiểm tra lint/typecheck | done | |
| 2026-06-15 22:40 | Phase 2 | Task 2.1 | Bắt đầu tích hợp mode state và UI Switcher vào App.tsx | start | |
| 2026-06-15 22:45 | Phase 2 | Task 2.Final | Hoàn tất di trú dữ liệu, tách cache, reset states khi đổi mode | done | Tránh tràn quota localStorage |
| 2026-06-15 22:50 | Phase 3A | Task 3A.Final | Tích hợp virtual scroll mượt 10k dòng BIZFLY và debounce tìm kiếm | done | |
| 2026-06-15 22:55 | Phase 3B | Task 3B.Final | Xây dựng thuật toán đối soát 4 bước, upload 2 file Excel, xuất GBC | done | Gán mã mặc định KH020219 |
| 2026-06-15 23:05 | Phase 4 | Task 4.Final | Tạo mock test script, pass test, pass lint, viết tài liệu HD deploy | done | |

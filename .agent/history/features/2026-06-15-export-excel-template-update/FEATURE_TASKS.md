# Feature Tasks: Cập nhật mẫu xuất Excel Giấy Báo Có

> **Trạng thái**: ✅ Hoàn thành
> **Liên kết plan**: `FEATURE_PLAN.md`
> **Ngày tạo**: 2026-06-15

---

## Quy ước checklist

- `- [ ]`: Chưa làm
- `- [/]`: Đang làm
- `- [x]`: Hoàn thành
- Cuối mỗi phase bắt buộc có `Task X.Final: 🧪 Test & Verify Phase X`

---

## Phase 1: Quy hoạch State & UI Modal Export

**Mục tiêu:** Xây dựng đối tượng state cấu hình xuất tập trung, thiết lập các Warning Gates và thiết kế Modal UI phân nhóm, có hỗ trợ dòng Preview trước khi tải file Excel.

- [x] Task 1.1: Tạo đối tượng React state `exportConfig` chứa đúng 10 trường cấu hình xuất: `dvcs` ("HANOI"), `tkNo` ("112104"), `maGd` ("2"), `soCtStart` (""), `maNt` ("VND"), `tyGia` ("1"), `tkCo` ("131"), `vuViec` ("CLOUD"), `boPhan` ("DIG.TRAN"), `maQuyen` ("BC" + năm hiện tại).
- [x] Task 1.2: Thiết kế lại UI Modal Export: layout rộng, chia nhóm (“Thông tin chứng từ”, “Tài khoản”, “Tiền tệ”, “Mã phân tích”) và tích hợp scroll.
- [x] Task 1.3: Thêm UI cảnh báo lỗi validate trực quan màu đỏ trên Modal cho trường Tỷ giá (nếu parseExchangeRate trả về null) và Số chứng từ bắt đầu (nếu không kết thúc bằng chữ số), đồng thời disable nút xuất Excel nếu có lỗi.
- [x] Task 1.4: Thiết lập Warning Gate: Hiển thị hộp thoại xác nhận (Confirm Dialog) khi bấm nút xuất nếu danh sách dữ liệu hiện tại còn chứa dòng hạch toán có mã khách hàng chưa được phân loại (`KH_CHUA_PHAN_LOAI`).
- [x] Task 1.5: Thêm khu vực "Dòng Preview hạch toán mẫu" ở cuối Modal hiển thị định dạng của 1 dòng đầu tiên để kế toán kiểm tra trước các giá trị cột.
- [x] Task 1.Final: 🧪 Test & Verify Phase 1 (Mở Modal, kiểm định hoạt động của Warning Gate, kiểm tra các thông báo lỗi validate khi nhập tỷ giá/số chứng từ sai, và xác nhận dòng preview hiển thị chính xác).

---

## Phase 2: Triển khai các hàm tiện ích, Unit Tests & logic `handleExportXlsx`

**Mục tiêu:** Kiểm thử độc lập các hàm tiện ích lõi và hoàn thiện logic xuất file Excel 21 cột định dạng Text cell.

- [x] Task 2.1: Tạo file helper chứa các hàm xử lý độc lập (`cleanReason`, `parseExchangeRate`, `generateDocumentNumber`, `normalizeDate`). Viết một script Node-based test trong thư mục `scratch/` để chạy thử nghiệm độc lập bằng `tsx` nhằm xác định tính chính xác của các helper này trên mọi bộ Test Cases.
- [x] Task 2.2: Cập nhật hàm `handleExportXlsx` lặp qua danh sách dòng hạch toán đang lọc hiển thị hiện tại (`filteredRows`) thay vì toàn bộ dữ liệu, và định cấu trúc tiêu đề cột bắt đầu ngay từ **Dòng 1** (không Title/Blank).
- [x] Task 2.3: Thực hiện gán kiểu Text (`{ t: 's' }`) cho các cột mã kế toán quan trọng (Số chứng từ, Tài khoản, Mã khách) sau khi sinh Excel sheet để tránh bị Excel tự động cắt mất số `0` ở đầu.
- [x] Task 2.4: Tích hợp hoàn tất các hàm parse/validate tỷ giá và bóc tách email chỉ trong ngoặc đơn vào quy trình xuất file.
- [x] Task 2.Final: 🧪 Test & Verify Phase 2 (Chạy lại script unit tests, thực hiện xuất Excel thực tế trong giao diện, tải file về và kiểm tra định dạng cột, kiểm tra số chứng từ tăng dần động, định dạng text cell và ngày hạch toán).

---

## Execution Log

| Thời gian | Phase | Task | Hành động | Trạng thái | Ghi chú |
|-----------|-------|------|-----------|-----------|---------|
| 2026-06-15 11:10 | Phase 1 | Task 1.1 | Khởi chạy Phase 1, tạo đối tượng state exportConfig | start | Bắt đầu code |
| 2026-06-15 11:12 | Phase 1 | Task 1.1 | Hoàn thành khai báo exportConfig state | done | Đã add state object |
| 2026-06-15 11:12 | Phase 1 | Task 1.2 | Bắt đầu thiết kế Modal Export UI mới | start | Sửa JSX App.tsx |
| 2026-06-15 11:20 | Phase 1 | Task 1.2-1.5 | Hoàn tất thiết kế Modal, validation và preview | done | UI biên dịch thành công |
| 2026-06-15 11:20 | Phase 1 | Task 1.Final | Bắt đầu self-test Phase 1 | start | Khởi chạy linter và kiểm thử |
| 2026-06-15 11:30 | Phase 1 | Task 1.Final | Hoàn tất self-test của AI | done | Typecheck & lint pass, unit test viết ở scratch chạy OK |
| 2026-06-15 11:35 | Phase 2 | Task 2.2-2.5 | Cập nhật handleExportXlsx 21 cột, text format | done | Hoàn tất logic xuất file, compiler check sạch |
| 2026-06-15 11:36 | Phase 2 | Task 2.Final | Chạy self-test Phase 2 | start | Chạy kiểm thử tự động helpers và check lint |
| 2026-06-15 11:40 | Phase 2 | Task 2.Final | Hoàn tất self-test của AI | done | Typecheck ok, test-helpers test suite pass 100% |
| 2026-06-15 11:45 | Phase 2 | Task 2.Final | Người dùng chạy thử thành công | done | Link dev test chạy tốt, tính năng đúng yêu cầu |

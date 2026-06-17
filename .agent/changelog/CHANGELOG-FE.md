# Changelog FE - DoiChieuSoPhu

> Phạm vi: Frontend, UI, UX, state client, routing, hiển thị, validation phía client
> Format: [Conventional Commits](https://www.conventionalcommits.org/)
> Ngôn ngữ: Tiếng Việt

---

## 2026-06-17

### fix: Khắc phục lỗi cache và lệch cột khi nạp bảng mã khách hàng Cloud, ẩn phần thiết lập kết nối
- **Tránh cache dữ liệu cũ:** Bổ sung tham số cache buster `&_t=${Date.now()}` vào URL GET của hàm `pullCustomersFromGoogleSheet` để vượt qua bộ nhớ đệm của Google Apps Script Web App.
- **Sửa cột mặc định bảng mã Cloud:** Điều chỉnh giá trị khởi tạo `colIndices` mặc định thành `{ code: 0, email: 1, name: 2, tax: 3, address: 4 }` để khớp với thứ tự thực tế trong file Excel chuẩn, tránh tình trạng đọc sai cột khi tải file lên UI.
- **Ẩn thiết lập kết nối Google Sheets:** Thu gọn khung cấu hình URL và Token và ẩn mặc định (collapsed by default). Người dùng có thể click vào phần tiêu đề để mở rộng/thu gọn khung thiết lập.
- **Files:** `src/App.tsx`, `src/utils/googleSheetsSync.ts`

## 2026-06-15

### feat: Tự động gán mã KH020219 cho khách chưa phân loại khi xuất Excel
- Tự động đổi mã khách từ `KH_CHUA_PHAN_LOAI` sang `KH020219` trong tệp Excel Giấy Báo Có tải về và trong bảng Preview.
- Thêm dòng tiêu đề đầu tiên `"Import phiếu báo có"` vào ô A1 khi xuất Excel (dòng header dịch chuyển xuống dòng 2, dữ liệu bắt đầu từ dòng 3).
- Cập nhật nhãn dòng xem trước trong Modal thành `Excel Row 3 Preview` để phản ánh đúng cấu trúc thực tế.
- Giữ nguyên hiển thị mã `KH_CHUA_PHAN_LOAI` trên màn hình UI để kế toán viên dễ dàng theo dõi.
- Không tự động gán mã khách này khi xuất file bổ sung qua nút "Xuất KH Chưa Khớp" (giữ nguyên để trống `""`).
- **Files:** `src/App.tsx`

### feat: Cập nhật mẫu xuất Excel Giấy Báo Có 21 cột và modal cấu hình
- **Giao diện Modal cấu hình mới:** Thiết kế modal rộng, có chia nhóm trường thông tin (Thông tin chứng từ, Tài khoản, Tiền tệ, Mã phân tích), hỗ trợ cuộn và hiển thị thông báo lỗi trực quan màu đỏ.
- **Dòng Preview xem trước:** Tích hợp bảng "Xem trước dòng hạch toán đầu tiên (Excel Row 2 Preview)" ở cuối modal để người dùng kiểm tra các giá trị cột trước khi tải xuống.
- **Warning Gate đối soát:** Hiển thị hộp thoại xác nhận cảnh báo khi người dùng nhấn xuất Excel nếu danh sách còn chứa khách hàng chưa được phân loại (`KH_CHUA_PHAN_LOAI`).
- **Nâng cấp logic xuất tệp (.xlsx):**
  - Xuất đúng 21 cột hạch toán và đặt tiêu đề cột trực tiếp từ Dòng 1.
  - Sử dụng hàm chuẩn hóa ngày chứng từ `normalizeDate`.
  - Lý do nộp: Lấy trực tiếp Diễn giải gốc sổ phụ.
  - Diễn giải: Ghép Diễn giải gốc sổ phụ với Email đối chiếu (Cloud) trong ngoặc đơn.
  - Tự động tăng số chứng từ dựa trên số bắt đầu và chỉ số dòng `generateDocumentNumber`.
  - Ép kiểu Text (`t: 's'`) cho các cột chứa mã kế toán quan trọng như số chứng từ, tài khoản nợ, tài khoản có, mã khách để tránh Excel tự động cắt số `0` ở đầu.
- **Files:** `src/App.tsx`, `src/utils/exportHelpers.ts`, `scratch/test-helpers.ts`

---

*Cập nhật tự động bởi update-docs*

# Changelog FE - DoiChieuSoPhu

> Phạm vi: Frontend, UI, UX, state client, routing, hiển thị, validation phía client
> Format: [Conventional Commits](https://www.conventionalcommits.org/)
> Ngôn ngữ: Tiếng Việt

---

## 2026-06-15

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

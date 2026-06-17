# Test Cases - Đồng bộ và Tải lên Bảng mã Khách hàng Cloud

> Tạo ngày: 2026-06-17
> Liên kết feature: không áp dụng
> Phạm vi: Bug fix / Regression / UI Change

---

## 1. Mục tiêu kiểm thử

- Xác minh việc tải lên file bảng mã khách hàng (.xlsx) hoạt động bình thường trên UI và khớp đúng cột dữ liệu.
- Đảm bảo cơ chế tự động đồng bộ (auto-pull) và đồng bộ thủ công luôn tải về dữ liệu mới nhất từ Google Sheets (không bị lỗi cache dữ liệu cũ).
- Đảm bảo khung "Thiết lập kết nối Google Sheets" được ẩn thu gọn theo mặc định và hoạt động bình thường khi click mở rộng.

## 2. Tiền điều kiện

- Đã thiết lập Google Sheets Web App URL chính xác.
- Có sẵn tệp Excel chứa bảng mã khách hàng mẫu đúng cột dữ liệu.

## 3. Happy Path

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| HP-01 | Mở tab "Bảng mã khách hàng", click tải lên bảng mã Cloud mới từ file .xlsx | Dữ liệu hiển thị đúng trên bảng danh bạ, mã khách hàng, tên công ty, email không bị lệch. |
| HP-02 | Click "Đồng bộ từ Google Sheets" hoặc tải lại trang | Ứng dụng tự động tải dữ liệu mới nhất từ Google Sheets về hiển thị (không bị lưu đè danh sách cũ). |
| HP-03 | Click vào tiêu đề "Thiết lập kết nối Google Sheets" | Khung nhập URL và Token được mở rộng, ô URL Google Sheets hiển thị mặc định bản test đúng (AKfycbxLAZs...) và ở trạng thái chỉ đọc (disabled/read-only), không cho phép chỉnh sửa. |
| HP-04 | Click nút "Xóa tất cả" bảng mã (màu đỏ) trong tab "Bảng mã khách hàng" | Giao diện hiển thị Custom Modal xác nhận xóa bảng mã. Click "Hủy bỏ" để đóng modal và giữ nguyên dữ liệu. Click "Xóa sạch" để làm trống bảng mã trên cả giao diện và lưu lên Google Sheets. |

## 4. Edge / Regression

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| RG-01 | Tải file Excel bảng mã có tiêu đề bị đổi tên (ví dụ "Mã khách" thay vì "Mã KH") | Ứng dụng vẫn tự động nhận diện chỉ số cột thông qua fallback chuẩn, dữ liệu hiển thị đúng vị trí. |
| RG-02 | Tải lên hoặc đồng bộ dòng dữ liệu chỉ chứa email (Mã KH và Tên công ty bị trống) | Dữ liệu vẫn được tải lên và đồng bộ hiển thị đầy đủ, không bị lọc bỏ. Tổng số dòng khớp tuyệt đối với Google Sheets (đủ 1915 dòng). |
| RG-03 | Tải lên file Excel bảng mã chứa đồng thời cột "Email" (cột chính) và cột "EMAIL ĐỐI CHIẾU" (cột phụ) | Chỉ số cột email được nhận diện chính xác là cột có tiêu đề khớp hoàn toàn "Email", không bị ghi đè hay nhận nhầm bởi cột "EMAIL ĐỐI CHIẾU". |

## 5. Negative Cases

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| NG-01 | Tải lên file bảng mã không đúng định dạng hoặc trống | Hiển thị thông báo lỗi trực quan "File Excel trống hoặc không có dòng dữ liệu hợp lệ". |

## 6. Security / Permission

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| SC-01 | Nhập sai Write Token và thực hiện cập nhật bảng mã khách hàng | Đồng bộ lên Google Sheets thất bại, hiển thị Toast cảnh báo lỗi bảo mật token từ Apps Script. Dữ liệu trên Google Sheets không bị ghi đè. |

## 7. Ghi chú regression

- Cần kiểm tra lại chức năng đối soát Cloud (Reconciliation) sau khi cập nhật bảng mã mới để đảm bảo mã khách hàng khớp chính xác theo email/tên công ty mới.

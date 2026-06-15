# Test Cases - Cập nhật mẫu xuất Excel Giấy Báo Có 21 Cột

> Tạo ngày: 2026-06-15
> Liên kết feature: `export-excel-template-update`
> Phạm vi: Feature / Verification

---

## 1. Mục tiêu kiểm thử

- Xác định độ chính xác và tính tương thích của tệp Excel xuất ra (21 cột, ô A1 chứa "Import phiếu báo có", tiêu đề cột ở Dòng 2).
- Kiểm chứng tính ổn định của các thuật toán phụ trợ: chuẩn hóa ngày, tăng số chứng từ động, lọc lý do nộp, parse tỷ giá.
- Đảm bảo các chốt chặn cảnh báo (Warning Gates) và validate trực quan trên UI Modal hoạt động đúng yêu cầu nghiệp vụ.

## 2. Tiền điều kiện

- Ứng dụng đã khởi chạy thành công ở local (`npm run dev`).
- Đã nạp dữ liệu mẫu (Sổ phụ ngân hàng + Bảng mã khách hàng) để tiến hành đối soát.

## 3. Happy Path

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| HP-01 | Mở Modal Xuất Excel bằng cách nhấn "Xuất toàn bộ danh sách" | Modal hiện lên đầy đủ thông tin chia nhóm, các trường tự điền giá trị mặc định chuẩn xác. |
| HP-02 | Nhập Số chứng từ bắt đầu `GBC004774`, Tỷ giá `24.500,75` | Dòng Preview cuối modal cập nhật hiển thị chính xác dòng hạch toán đầu tiên (Số chứng từ `GBC004774`, Tỷ giá `24500.75`, Tiền = Tiền NT * 24500.75) dưới nhãn "Excel Row 3 Preview". |
| HP-03 | Nhấn "Xác nhận xuất (.xlsx)" | Tải xuống thành công tệp `GIAY_BAO_CO_VCCLOUD.xlsx` với 21 cột, Dòng 1 chứa "Import phiếu báo có", Dòng 2 là Tiêu đề cột. |
| HP-04 | Mở tệp Excel tải về | Các cột mã (Số chứng từ, Tài khoản, Mã khách) đều có kiểu Text (`t: 's'`), giữ nguyên số `0` ở đầu. Số chứng từ các dòng tăng tuần tự bắt đầu từ Dòng 3 (dòng dữ liệu đầu tiên). |

## 4. Edge / Regression

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| RG-01 | Lọc danh sách giao dịch còn 3 dòng, sau đó xuất Excel | Tệp Excel tải xuống chỉ chứa đúng 3 dòng giao dịch được lọc (đồng bộ với `filteredRows`). |
| RG-02 | Giao dịch có email đối chiếu (ví dụ: diễn giải gốc `Nộp tiền cloud`, email đối chiếu `hungxd@vcc.vn`) | Cột 4 (Lý do nộp) hiển thị `Nộp tiền cloud` (diễn giải gốc), cột 15 (Diễn giải) hiển thị `Nộp tiền cloud (hungxd@vcc.vn)`. |
| RG-03 | Giao dịch không có email đối chiếu (ví dụ: diễn giải gốc `Nộp tiền cloud`, email đối chiếu trống) | Cột 4 và Cột 15 đều hiển thị diễn giải gốc `Nộp tiền cloud`. |
| RG-04 | Dòng hạch toán chưa phân loại (`KH_CHUA_PHAN_LOAI`) trên UI | Trên giao diện chính vẫn hiển thị nhãn màu hổ phách `KH_CHUA_PHAN_LOAI`. |
| RG-05 | Xuất Excel có chứa dòng `KH_CHUA_PHAN_LOAI` | Dòng xem trước (Excel Row 3 Preview) và File Excel tải về có mã khách hàng tại Cột 2 (Mã khách) và Cột 12 (Mã khách ct) tự động gán là `KH020219`. |
| RG-06 | Nhấn nút "Xuất KH Chưa Khớp" (`handleExportUnclassifiedXlsx`) | File Excel tải về của danh sách KH chưa khớp có cột Mã khách để trống `""`, không bị gán mã `KH020219`. |

## 5. Negative Cases

| ID | Bước kiểm thử | Kết quả mong đợi |
|----|----------------|------------------|
| NG-01 | Nhập Số chứng từ bắt đầu không kết thúc bằng số (ví dụ: `GBC_ABC`) | Xuất hiện thông báo lỗi validate màu đỏ dưới ô nhập liệu, nút xuất Excel bị disable. |
| NG-02 | Nhập Tỷ giá sai định dạng (ví dụ: `24.500.00` hoặc chữ cái) | Xuất hiện thông báo lỗi validate màu đỏ dưới ô nhập liệu, nút xuất Excel bị disable. |
| NG-03 | Xuất Excel khi danh sách còn dòng mang mã `KH_CHUA_PHAN_LOAI` | Hiển thị hộp thoại cảnh báo "Dữ liệu chưa đồng bộ", hỏi ý kiến người dùng có vẫn muốn xuất hay không. |

## 6. Ghi chú regression

- Cần chạy lại bộ unit test helpers độc lập qua lệnh `npx tsx scratch/test-helpers.ts` để chắc chắn không xảy ra lỗi hồi quy ở logic tính toán lõi.

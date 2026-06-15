# Feature Plan: Cập nhật mẫu xuất Excel Giấy Báo Có

> **Trạng thái**: ✅ ĐỒNG Ý
> **Review gate**: Đã rà soát và thông qua review gate kỹ thuật và nghiệp vụ hoàn toàn.
> **Feature slug**: `export-excel-template-update`
> **Tạo bởi**: feature-plan
> **Ngày tạo**: 2026-06-15

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:** User (Kế toán) có nhu cầu xuất Giấy Báo Có (Excel) theo một format chuẩn mới (gồm 21 cột) để import vào phần mềm kế toán (Fast/Misa...) thuận tiện hơn. Hiện tại, form xuất mới chỉ có 11 cột chưa đáp ứng đủ mẫu.
- **Vấn đề cần giải quyết:** Định dạng file Excel xuất ra hiện tại thiếu cột và thiết lập chưa linh hoạt (cần cho phép nhập cấu hình trước khi xuất).
- **Mục tiêu:** Cập nhật hàm xuất Excel trong hệ thống (thay đổi cấu trúc header, mapping data 21 cột). Thêm một popup/modal lớn trước khi xuất cho phép người dùng cấu hình các trường mặc định thông qua đối tượng `exportConfig` tách biệt, tránh gây recompute preview bảng đối soát ngoài ý muốn.
- **Kết quả mong đợi:** Người dùng ấn "Xuất Excel Giấy Báo Có", một modal rộng hiện lên được chia nhóm thông tin rõ ràng, cho phép điền các thông số mặc định và preview trước 1 dòng dữ liệu xuất. Ấn "Xác nhận xuất", file Excel được tải xuống với đầy đủ 21 cột hạch toán chuẩn chỉnh.

## 2. Phạm vi

### In scope
- Khai báo một state object `exportConfig` duy nhất tại `App.tsx` gồm đúng 10 trường cấu hình để lưu thông số xuất, không làm thay đổi trực tiếp preview dòng trên giao diện của `processedRows` trong lúc nhập cấu hình.
- Thiết kế lại UI Modal Export rộng (có scroll, chia nhóm “Thông tin chứng từ”, “Tài khoản”, “Tiền tệ”, “Mã phân tích” và có 1 dòng Preview kết quả dòng hạch toán đầu tiên).
- Thêm cảnh báo và xác nhận (Warning Gate) khi xuất file nếu dữ liệu vẫn còn chứa mã khách hàng chưa được phân loại (`KH_CHUA_PHAN_LOAI`).
- Cập nhật logic hàm `handleExportXlsx` xuất đúng 21 cột dựa theo **danh sách dòng đang lọc hiển thị hiện tại (Filtered Rows)** thay vì toàn bộ dữ liệu.
- Định dạng dữ liệu thô trong Excel: Ép kiểu string (`t: 's'`) cho các cột chứa mã kế toán quan trọng để tránh bị Excel tự động chuyển thành số và làm mất số `0` ở đầu (ví dụ: Số chứng từ, Tài khoản, Mã khách).
- Sử dụng hàm chuẩn hóa tỷ giá thông minh và bóc tách email Regex có test cases kèm theo.
- Sử dụng giải thuật tăng Số chứng từ động hỗ trợ cả tiền tố chữ (ví dụ: `GBC004774` -> `GBC004775`).

### Out of scope
- Sửa đổi cơ sở dữ liệu khách hàng hoặc thuật toán match AI hiện có.
- Viết lại toàn bộ cấu trúc file `App.tsx`.

---

## 3. Quy chuẩn Layout Excel & Đặc tả 21 cột xuất ra

### 3.1. Cấu trúc Layout File Excel
Để đảm bảo nhập liệu tự động (import) thành công vào phần mềm kế toán Fast/Misa:
- **Dòng 1 của Worksheet:** Sẽ chứa trực tiếp các Tiêu đề cột (Headers), KHÔNG có các dòng tiêu đề công ty hoặc dòng trống ở trên đầu.
- **Dòng 2 trở đi:** Dữ liệu hạch toán tương ứng của các dòng.

### 3.2. Đặc tả 21 cột hạch toán (Export Specifications Matrix)

- **Quy tắc ưu tiên ghi nhận tài khoản & phân tích (Cột 11, 16, 17):**
  1. Sử dụng giá trị chỉnh sửa thủ công của dòng (`r.tkCo`, `r.vuViec`, `r.boPhan` nếu kế toán đã tự click sửa trực tiếp trên Grid Preview, tức nằm trong `manualRows`).
  2. Nếu dòng đó không bị sửa thủ công, sử dụng giá trị mặc định được cấu hình từ Modal xuất (`exportConfig.tkCo`, `exportConfig.vuViec`, `exportConfig.boPhan`).

| STT | Tên Header Excel | Nguồn dữ liệu ánh xạ | Giá trị mặc định | Có cho sửa trên Modal? | Format Excel |
|-----|------------------|----------------------|------------------|------------------------|--------------|
| 1 | ĐVCS | `exportConfig.dvcs` | "HANOI" | Có (Thông tin CT) | Text (`t: 's'`) |
| 2 | Mã khách | Dòng hạch toán `r.maKhach` | - | Không | Text (`t: 's'`) |
| 3 | Người nhận tiền | Bỏ trống | - | Không | Text (`t: 's'`) |
| 4 | Lý do nộp | `dienGiai` gốc sau khi bóc email | - | Không | Text |
| 5 | Tài khoản nợ | `exportConfig.tkNo` | "112104" | Có (Tài khoản) | Text (`t: 's'`) |
| 6 | Mã giao dịch | `exportConfig.maGd` | "2" | Có (Thông tin CT) | Text (`t: 's'`) |
| 7 | Số chứng từ | Tăng dần từ `exportConfig.soCtStart` | - | Có (Thông tin CT) | Text (`t: 's'`) |
| 8 | Ngày chứng từ | Dòng hạch toán `r.date` sau khi normalize | - | Không | Text (`dd/MM/yyyy`) |
| 9 | Mã ngoại tệ | `exportConfig.maNt` | "VND" | Có (Tiền tệ) | Text |
| 10 | Tỷ giá | `exportConfig.tyGia` | 1 | Có (Tiền tệ) | Number |
| 11 | Tk có | Quyết định theo **Quy tắc ưu tiên** trên | Lấy từ `exportConfig.tkCo` | Có (Tài khoản) | Text (`t: 's'`) |
| 12 | Mã khách ct | Giống cột "Mã khách" | - | Không | Text (`t: 's'`) |
| 13 | Tiền nt | Dòng hạch toán `r.tien` | - | Không | Number |
| 14 | Tiền | `r.tien * parsedTyGia` | - | Không | Number |
| 15 | Diễn giải | Dòng hạch toán `r.dienGiai` gốc | - | Không | Text |
| 16 | Vụ việc | Quyết định theo **Quy tắc ưu tiên** trên | Lấy từ `exportConfig.vuViec` | Có (Mã phân tích) | Text (`t: 's'`) |
| 17 | Bộ phận | Quyết định theo **Quy tắc ưu tiên** trên | Lấy từ `exportConfig.boPhan` | Có (Mã phân tích) | Text (`t: 's'`) |
| 18 | Hợp đồng | Dòng hạch toán `r.hopDong` (nếu có) | - | Không | Text (`t: 's'`) |
| 19 | Bảng kê | Bỏ trống | - | Không | Text |
| 20 | TD2 | Bỏ trống | - | Không | Text |
| 21 | Mã quyển | `exportConfig.maQuyen` | "BC" + năm hiện tại yyyy | Có (Thông tin CT) | Text (`t: 's'`) |

---

## 4. Chi tiết kỹ thuật & Giải thuật

### 4.1. Giải thuật chuẩn hóa Ngày chứng từ (Date Normalizer)
Đảm bảo bóc tách chính xác phần ngày `dd/MM/yyyy`, loại bỏ phần giờ và xử lý cả dạng số/date object hoặc số serial Excel:
```javascript
const normalizeDate = (val) => {
  if (!val) {
    const today = new Date();
    return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  }
  
  // Nếu là Date object
  if (val instanceof Date) {
    return `${String(val.getDate()).padStart(2, '0')}/${String(val.getMonth() + 1).padStart(2, '0')}/${val.getFullYear()}`;
  }

  // Xử lý Excel serial number (ví dụ: 45323 hoặc "45323")
  const num = Number(val);
  if (!isNaN(num) && num > 10000 && num < 100000) {
    // Chuyển đổi Excel serial date sang JS Date (ngày gốc là 30/12/1899 do bug năm nhuận 1900 của Excel)
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }

  const str = String(val).trim();
  
  // Regex khớp định dạng dd/MM/yyyy hoặc dd-MM-yyyy (có thể có giờ phía sau)
  const match = str.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${day}/${month}/${year}`;
  }
  
  return str; // Trả về dạng thô nếu không khớp
};
```

### 4.2. Giải thuật trích lọc Email Regex (Lý do nộp)
- **Quy tắc:** Chỉ xóa email nằm bên trong dấu ngoặc đơn (và dấu ngoặc đơn chứa nó). Giữ lại các email tự do bên ngoài diễn giải gốc để tránh làm mất thông tin đối soát.
- **Hàm xử lý:**
  ```javascript
  const cleanReason = (text) => {
    if (!text) return "";
    // Chỉ loại bỏ email nằm trong dấu ngoặc đơn (xóa cả dấu ngoặc đơn và khoảng trắng liền trước)
    let cleaned = text.replace(/\s*\(\s*[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\s*\)/gi, "");
    return cleaned.replace(/\s+/g, " ").trim();
  };
  ```
- **Bộ Test Cases:**
  - *Input 1:* `"Nộp tiền dịch vụ cloud (support@company.com)"` -> *Output 1:* `"Nộp tiền dịch vụ cloud"`
  - *Input 2:* `"Thanh toan cloud (user.name+tag@domain.co.uk) cho thang 6"` -> *Output 2:* `"Thanh toan cloud cho thang 6"`
  - *Input 3:* `"Tai khoan user@gmail.com nap tien"` -> *Output 3:* `"Tai khoan user@gmail.com nap tien"` (Không xóa vì email tự do nằm ngoài ngoặc).

### 4.3. Giải thuật tự động tăng Số chứng từ thông minh
- Yêu cầu bắt buộc phải chứa hậu tố số ở cuối chuỗi. Validate trên UI modal: nếu không khớp regex `([0-9]+)$`, báo lỗi nhập liệu màu đỏ và disable nút "Tải xuống Excel".
- Hàm xử lý:
  ```javascript
  const generateDocumentNumber = (startStr, index) => {
    if (!startStr) return "";
    const match = startStr.match(/^(.*?)([0-9]+)$/);
    if (!match) return startStr; 
    
    const prefix = match[1];
    const suffixStr = match[2];
    const padLen = suffixStr.length;
    const startNum = parseInt(suffixStr, 10);
    if (isNaN(startNum)) return startStr;
    
    const nextNum = startNum + index;
    return prefix + nextNum.toString().padStart(padLen, "0");
  };
  ```

### 4.4. Giải thuật chuẩn hóa & Validate Tỷ giá
- Hiển thị thông báo lỗi trực tiếp trên Modal và disable nút xuất nếu tỷ giá không hợp lệ.
- Hàm parse số thông minh xử lý triệt để các trường hợp phân tách nghìn lặp lại (`1.000.000` hoặc `1,000,000` hoặc `24.500,75`):
  ```javascript
  const parseExchangeRate = (val) => {
    if (typeof val === 'number') return val;
    if (!val || typeof val !== 'string') return null;
    const str = val.trim().replace(/\s+/g, "");
    if (!str) return null;

    const dots = (str.match(/\./g) || []).length;
    const commas = (str.match(/,/g) || []).length;

    let cleanStr = str;
    if (dots > 0 && commas > 0) {
      // Có cả chấm và phẩy (vd: 24,500.75 hoặc 24.500,75)
      const lastDot = str.lastIndexOf(".");
      const lastComma = str.lastIndexOf(",");
      if (lastDot > lastComma) {
        cleanStr = str.replace(/,/g, "");
      } else {
        cleanStr = str.replace(/\./g, "").replace(",", ".");
      }
    } else if (dots > 1) {
      // Có nhiều chấm (ví dụ: 1.000.000) -> xóa hết chấm hàng nghìn
      cleanStr = str.replace(/\./g, "");
    } else if (commas > 1) {
      // Có nhiều phẩy (ví dụ: 1,000,000) -> xóa hết phẩy hàng nghìn
      cleanStr = str.replace(/,/g, "");
    } else if (dots === 1) {
      // 1 chấm duy nhất (ví dụ: 24.500 hoặc 1.25)
      const parts = str.split(".");
      if (parts[1].length === 3) {
        cleanStr = str.replace(".", ""); // Hàng nghìn
      } else {
        cleanStr = str; // Thập phân
      }
    } else if (commas === 1) {
      // 1 phẩy duy nhất (ví dụ: 24,500 hoặc 1,25)
      const parts = str.split(",");
      if (parts[1].length === 3) {
        cleanStr = str.replace(",", ""); // Hàng nghìn
      } else {
        cleanStr = str.replace(",", "."); // Thập phân
      }
    }

    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
  };
  ```

---

## 5. Đối chiếu Knowledge Base

- **Quyết định kế thừa:** Vẫn xử lý xuất Excel thuần tuý ở Frontend (bằng thư viện `xlsx`), không đẩy xuống Backend.
- **"Cấm kỵ" cần tránh:** Không phá vỡ dữ liệu `processedRows` đang map, chỉ thực hiện modify format ở lúc build worksheet xuất ra.

## 6. Giả định và câu hỏi mở

### Giả định
- Dòng chứng từ tăng tuần tự theo đúng thứ tự dòng hiển thị trong danh sách đã được lọc.
- Người dùng đồng ý chặn hoặc hiển thị xác nhận khi còn mã chưa khớp.

## 7. Acceptance Criteria

- [ ] Khi bấm Xuất Giấy Báo Có, xuất hiện màn hình cấu hình rộng, chia section và có scroll.
- [ ] Màn hình cấu hình hiển thị đủ 10 trường thông số cấu hình và có dòng Preview kết quả dòng hạch toán đầu tiên.
- [ ] File Excel sinh ra bắt đầu tiêu đề từ **Dòng 1** (không Title/Blank).
- [ ] Có Warning Gate chặn hoặc cảnh báo khi xuất nếu danh sách còn dòng hạch toán chứa `KH_CHUA_PHAN_LOAI`.
- [ ] File xuất ra đúng 21 cột. Các cột mã kế toán (Tài khoản, Mã khách, Số chứng từ) được định dạng là kiểu Text (`t: 's'`) trong Excel để tránh mất số `0` ở đầu.
- [ ] Chỉ xóa email trong dấu ngoặc đơn ở cột "Lý do nộp", email tự do được giữ nguyên.
- [ ] Số chứng từ tăng tuần tự, hỗ trợ cả tiền tố chữ, bắt buộc phải kết thúc bằng số (có validate báo lỗi).
- [ ] Tỷ giá có cơ chế validate và parse an toàn, hiển thị thông báo lỗi trực tiếp trên Modal nếu nhập giá trị sai định dạng số (bao gồm định dạng hàng triệu có nhiều dấu tách).

## 8. Risk Triage và Review Focus

- **Review required:** Yes
- **Risk hotspots:**
  - Định dạng kiểu Text (`t: 's'`) cho ô trong worksheet Excel cần can thiệp sau khi dùng `aoa_to_sheet` để tránh thư viện tự động chuyển đổi kiểu dữ liệu.
  - Phân tích và validate tỷ giá, số chứng từ cần báo lỗi rõ ràng tránh lỗi nghiệp vụ sai lệch tiền hoặc trùng lặp mã chứng từ.
  - Logic xuất theo bộ lọc hiện tại (`filteredRows`) thay vì toàn bộ (`processedRows`).

## 9. Chiến lược triển khai

- **Phase 1: Quy hoạch State & UI Modal Export.** Khai báo object `exportConfig` chứa 10 trường. Thiết kế lại UI Modal có layout 2 cột khoa học, chia nhóm thông tin rõ ràng, thêm dòng Preview và hiển thị thông báo lỗi validate trực quan.
- **Phase 2: Triển khai các hàm tiện ích, Unit Tests & Hàm Export.** Cập nhật `handleExportXlsx` xuất 21 cột, định dạng Text cell, tích hợp các hàm parse/validate. Viết một script kiểm thử tự động (Unit Test) tối giản bằng Node chạy độc lập để xác thực độ chính xác của các hàm logic lõi (`cleanReason`, `parseExchangeRate`, `generateDocumentNumber`, `normalizeDate`).

## 10. Test Strategy

- **Automated tests:** Chạy script Node-based test các hàm logic helper để đảm bảo tính deterministic trước khi tích hợp vào React component.
- **Manual verification:** Kế toán load dữ liệu mẫu, thử lọc dữ liệu, nhập thông số sai định dạng để kiểm tra validate, nhập thông số đúng và xuất Excel kiểm tra format, định dạng Text của số chứng từ và tài khoản.

## 11. Rollback Plan

- Hoàn tác file `src/App.tsx` về commit hiện tại.

## 12. Tham chiếu thực thi

- Checklist chi tiết theo phase: `FEATURE_TASKS.md`

## Review Notes
- **Kết luận**: ✅ ĐỒNG Ý (2026-06-15)
- **Các điểm đã chỉnh sửa và hoàn thiện**:
  - Đã rà soát và sửa status ở đầu file thành `✅ ĐỒNG Ý`.
  - Cấu trúc dòng tiêu đề bắt đầu từ Dòng 1.
  - Thiết kế hàm `normalizeDate` bóc tách ngày hạch toán, bao gồm xử lý số serial Excel.
  - Thêm cơ chế validate Số chứng từ phải chứa hậu tố số.
  - Xác định xuất theo bộ lọc hiện tại (`filteredRows`).
  - Nâng cấp bộ parse tỷ giá an toàn có validate báo lỗi trên UI, xử lý chuỗi hàng triệu nhiều dấu phân tách (`1.000.000`, `24.500,75`).
  - Thay đổi policy email: Chỉ xóa email trong dấu ngoặc đơn, giữ email tự do.
  - Quy định gán kiểu Text (`t: 's'`) cho các ô mã kế toán trong Excel worksheet.
  - Thêm cảnh báo Warning Gate khi xuất còn mã `KH_CHUA_PHAN_LOAI`.
  - Quy hoạch object `exportConfig` đầy đủ 10 trường thống nhất.
  - Xác định rõ thứ tự ưu tiên lấy `Tk Có`, `Vụ việc`, `Bộ phận` từ grid preview dòng hạch toán (`manualRows` > `exportConfig`).
  - Thêm bước viết test tự động bằng script Node-based cho các helper.
  - Bổ sung mục Risk Triage và Review Focus.

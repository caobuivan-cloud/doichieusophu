# Feature Plan: BIZFLY Mode Select

> **Trạng thái**: ✅ ĐỒNG Ý
> **Review gate**: Đã thông qua review hội đồng (2026-06-15)
> **Feature slug**: bizfly-mode-select
> **Tạo bởi**: feature-plan
> **Ngày tạo**: 2026-06-15

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:** Dự án hiện tại đang chạy đối soát cho hệ thống Cloud. Hệ thống sử dụng một Apps Script API (`Code.gs`) kết nối với Google Sheet để lưu trữ bảng mã khách hàng chuẩn và ghi nhật ký hoạt động (Logs). Người dùng muốn mở rộng hệ thống để chạy thêm cho phân hệ **BIZFLY** với tính năng tương tự (bảng mã khách, đối chiếu hạch toán).
- **Vấn đề cần giải quyết:** 
  - Hệ thống hiện là ứng dụng đơn khối chạy hoàn toàn trong `App.tsx`, không có routing (`react-router-dom`) và frontend kết nối trực tiếp đến Apps Script URL qua `googleSheetsSync.ts`.
  - Cần một UI chọn chế độ (tabs hoặc dropdown selector) trong `App.tsx` để chuyển đổi giữa Cloud và BIZFLY mà không phá vỡ cấu trúc đơn khối và không làm ảnh hưởng đến luồng Cloud hiện tại.
  - Bảng mã khách hàng BIZFLY rất lớn (10k dòng), việc đồng bộ và lưu trữ cần được xử lý an toàn, tránh timeout, tránh lỗi quá hạn mức (quota) localStorage (5MB) và tránh đơ UI khi lọc/tìm kiếm dữ liệu.
  - Phải tách biệt hoàn toàn state lưu trữ, cache, localStorage và cấu hình xuất hạch toán giữa Cloud và BIZFLY để tránh lẫn lộn dữ liệu.
- **Mục tiêu:**
  - Tích hợp cơ chế lựa chọn phân hệ (Cloud hoặc BIZFLY) bằng React State trực tiếp trong `App.tsx`.
  - Nâng cấp Apps Script API hỗ trợ đọc/ghi, bổ sung allowlist tên sheet tách biệt quyền đọc/ghi và check token xác thực bảo vệ dữ liệu.
  - Thiết lập cơ chế chiếu dữ liệu (Projection) 4 cột để tải bảng mã BIZFLY nhẹ nhàng và an toàn.
  - Tách biệt hoàn toàn localStorage cache, states đối soát và cấu hình xuất hạch toán theo mode.
  - Áp dụng virtual scrolling và cơ chế debounce bộ lọc cho phân hệ BIZFLY; giữ nguyên phân trang cho Cloud.

## 2. Phạm vi

### In scope
- **Apps Script (`gas/Code.gs`):**
  - Cập nhật `setupSheets()` để tạo sheet BIZFLY với header mặc định tại dòng 2. Nếu tạo mới sheet trống, ghi log cảnh báo.
  - Phân tách quyền truy cập theo allowlist trong `doGet` và `doPost`:
    - **`READ_ALLOWLIST`:** Chỉ cho phép đọc `Bảng Mã Khách Hàng Chuẩn` và `Bảng Mã Khách Hàng BIZFLY`. **Tuyệt đối cấm đọc sheet `Activity Log` qua `doGet`**.
    - **`WRITE_ALLOWLIST`:** Cho phép ghi vào `Bảng Mã Khách Hàng Chuẩn` và `Activity Log`.
  - Chuẩn hóa đầu ra API: Apps Script chịu trách nhiệm loại bỏ dòng header trước khi trả dữ liệu về frontend. 
    - Cloud API: trả mảng 5 cột đã bỏ dòng header đầu (`data.slice(1)`).
    - BIZFLY API: trả mảng 4 cột đã bỏ 2 dòng header đầu (`data.slice(2)`).
    - Frontend nhận được dữ liệu sạch và không cần slice thêm.
  - Sử dụng `PropertiesService` để lưu trữ mã token bảo mật ghi đè (`SHARED_WRITE_TOKEN`). Chỉ yêu cầu xác thực token này đối với hành động phá hoại ghi đè dữ liệu (`overwrite_rules`). 
  - Các hành động ghi log (`log`) append-only được miễn check token để tránh mất log do lỗi cấu hình (chấp nhận rủi ro bị spam ghi bậy dữ liệu log nếu lộ URL, Apps Script sẽ giới hạn kích thước chuỗi log đầu vào để giảm nhẹ rủi ro).
- **Frontend UI & State Management (`src/App.tsx` & `src/utils/googleSheetsSync.ts`):**
  - Thêm state `mode` (`'cloud' | 'bizfly'`) và UI selector chuyển đổi chế độ trong màn hình chính.
  - Di trú (migration) an toàn: Khi khởi chạy app, copy dữ liệu từ `accounting_customers` sang key mới `accounting_customers_cloud` và chỉ xóa key cũ sau khi đã ghi thành công key mới.
  - Tách biệt key localStorage: `accounting_customers_cloud` và `accounting_customers_bizfly`. 
  - **Chống tràn localStorage quota:** Thêm cơ chế try/catch khi ghi cache. Riêng danh sách BIZFLY (10k dòng), ưu tiên lưu trữ trong React State in-memory hoặc `sessionStorage`. Nếu ghi localStorage lỗi quota, tự động hạ cấp xuống lưu trong bộ nhớ tạm thời của React state (React in-memory state) và hiển thị cảnh báo cho người dùng mà không làm crash app.
  - Reset/namespace toàn bộ các states workflow khi đổi mode.
  - Tạo UI upload file và hàm parser riêng biệt cho BIZFLY (File 1: Sổ chi tiết công nợ, File 2: Thông tin HD/PLHD) tách biệt với Cloud.
  - Tích hợp virtual scroll và debounce (150-300ms) bộ lọc tìm kiếm cho bảng BIZFLY.
- **Thuật toán đối soát BIZFLY:**
  - Phát triển module đối soát BIZFLY (`bizflyReconciliation.ts`) khớp File 1 và File 2 qua cột `BG` (index 58), tra cứu bảng mã khách BIZFLY qua mảng API 4 cột (chỉ số 0-3), và gán mã mặc định `"KH020219"` cho các dòng không khớp.

### Out of scope
- Cấu hình routing bằng `react-router-dom` (giữ nguyên cấu trúc app đơn khối).
- Viết proxy API qua Backend server (giữ nguyên cơ chế gọi trực tiếp Apps Script từ Frontend).
- Tính năng ghi đè/đẩy ngược dữ liệu (Push) bảng mã khách hàng BIZFLY lên Google Sheet. **Đối với BIZFLY, bảng mã khách hàng là Read-Only**.

## 3. Đối chiếu Knowledge Base

- **Quyết định kế thừa:**
  - Sử dụng cơ chế gọi trực tiếp Apps Script Web App URL từ Frontend.
  - Sử dụng design system hiện tại (glassmorphism, dark mode).
- **"Cấm kỵ" cần tránh:**
  - Không thay đổi hoặc phá vỡ code đối soát Cloud hiện tại.
  - Không ghi đè hoặc dùng chung bộ nhớ cache/localStorage giữa hai phân hệ.
  - Không cho phép ghi đè dữ liệu lên sheet BIZFLY.

## 4. Giả định và câu hỏi mở

### Giả định
- Apps Script Web App được deploy dưới dạng công khai (Anyone) như hiện tại. Bảo vệ thêm bằng token xác thực lưu ở Google Properties cho action `overwrite_rules`.
- Dữ liệu bảng mã khách hàng BIZFLY được người dùng quản lý trên Google Sheet đúng cấu trúc cột yêu cầu.

### Câu hỏi mở
- Không có câu hỏi blocking.

## 5. Acceptance Criteria

- [ ] UI chính hiển thị nút chuyển đổi chế độ hoạt động (Cloud và BIZFLY). Khi đổi mode, toàn bộ state dữ liệu được reset sạch sẽ.
- [ ] Di trú dữ liệu Cloud cũ trong localStorage sang key mới thành công, an toàn.
- [ ] Bảng mã khách hàng của Cloud và BIZFLY được lưu trữ độc lập. Có cơ chế catch lỗi quota localStorage cho bảng mã 10k dòng BIZFLY.
- [ ] doGet tuyệt đối cấm truy cập vào sheet `Activity Log`.
- [ ] overwrite_rules bắt buộc kiểm tra token xác thực thông qua `PropertiesService`.
- [ ] Khi tải dữ liệu BIZFLY, Apps Script chỉ trả về 4 cột đã cắt bỏ header.
- [ ] UI của BIZFLY hiển thị bảng 10k dòng mượt mà nhờ virtual scrolling, bộ lọc tìm kiếm được debounce chính xác.
- [ ] Nghiệp vụ đối soát BIZFLY hoạt động chính xác theo 4 bước, tự động gán mã mặc định `"KH020219"` cho các dòng không khớp (unmatched) và ghi nhận log có nhãn prefix `[BIZFLY]` rõ ràng.

## 6. Files và modules bị ảnh hưởng

| File/Module | Hành động | Lý do chạm vào | Rủi ro | Contract |
|-------------|-----------|----------------|--------|----------|
| `gas/Code.gs` | Sửa | Cập nhật allowlist sheet tách biệt Read/Write, check token ghi đè qua PropertiesService, và tối ưu hóa payload chỉ trả về 4 cột đã cắt header cho BIZFLY. | 🟡 Cần update tay trên Google Sheets | Không |
| `src/utils/googleSheetsSync.ts` | Sửa | Cập nhật hàm API để hỗ trợ tham số `mode`, truyền token cho write actions, định nghĩa Type riêng cho BIZFLY và hàm parser riêng. | 🟢 Thấp | Có |
| `src/App.tsx` | Sửa | Thêm UI switcher, phân tách states & localStorage keys theo mode, di trú key cũ an toàn, catch lỗi quota, tách UI upload file, tích hợp virtual scroll và debounce cho bảng BIZFLY. | 🟡 Cần bảo toàn luồng chạy của Cloud | Có |
| `src/utils/bizflyReconciliation.ts` | Tạo mới | Triển khai thuật toán đối soát 4 bước, mapping cột index của payload API 4 cột và xử lý dòng unmatched cho phân hệ BIZFLY. | 🟢 Thấp | Có |
| `package.json` | Sửa | Cài đặt thêm thư viện virtual scroll (ví dụ `react-window` hoặc tương đương). | 🟢 Thấp | Không |

## 7. Risk Triage và Review Focus

- **Review required:** Yes
- **Risk hotspots:**
  - **Lẫn lộn dữ liệu giữa 2 mode:** Nguy cơ ghi đè dữ liệu trong localStorage hoặc hiển thị nhầm kết quả đối chiếu cũ khi chuyển đổi mode.
    - *Biện pháp kiểm soát:* Phân tách tuyệt đối key lưu trữ, reset hoàn toàn states workflow khi chuyển đổi chế độ hoạt động.
  - **Tràn bộ nhớ localStorage quota (5MB) do 10k dòng:**
    - *Biện pháp kiểm soát:* Bao bọc logic setItem bằng try/catch, nếu lỗi tự động lưu trữ trên React in-memory state/sessionStorage và cảnh báo nhẹ.
  - **Mâu thuẫn chỉ số index của mảng Projection 4 cột:**
    - *Biện pháp kiểm soát:* Định nghĩa rõ hai bảng mapping: `RAW_SHEET_COLUMN_MAP` (ở GAS) và `PROJECTED_API_COLUMN_MAP` (ở Frontend).
  - **Bảo mật URL công khai của Apps Script và rò rỉ Activity Log:**
    - *Biện pháp kiểm soát:* Tách biệt allowlist đọc/ghi, cấm đọc Log qua `doGet`. Sử dụng `PropertiesService` bảo vệ token ghi đè. Ghi log append-only không cần token để tránh lỗi mất log, chấp nhận rủi ro bị spam log ghi bậy.
- **Review focus areas:** 
  - Cách tối ưu hóa việc chuyển đổi chế độ để tránh rò rỉ bộ nhớ hoặc gọi API thừa.
  - Giải pháp tối ưu hóa việc render và quản lý state trên Client để tránh quá tải.

## 8. Chiến lược triển khai

- **Phase 1: Nâng cấp Apps Script và thiết lập API**
  - Cập nhật `Code.gs` để thêm sheet BIZFLY, áp dụng allowlist tên sheet (tách biệt Read/Write), tích hợp token xác thực cho write actions, và tối ưu hóa payload chỉ trả về 4 cột đã bỏ header.
  - Cập nhật `googleSheetsSync.ts` để phân tách API của Cloud và BIZFLY (hàm parser và call URL).
- **Phase 2: UI Switcher, Di trú dữ liệu và Phân tách State trong App.tsx**
  - Tích hợp switcher chế độ hoạt động trong `App.tsx`.
  - Thực hiện di trú tự động key cũ an toàn.
  - Phân tách states, localStorage keys cho Cloud và BIZFLY. Reset states khi đổi mode.
- **Phase 3A: Tích hợp Virtual Scrolling và Debounce cho bảng BIZFLY**
  - Cài đặt thư viện virtual scroll và tích hợp vào bảng hiển thị danh sách khách hàng của phân hệ BIZFLY. Giữ nguyên pagination cho Cloud.
  - Tích hợp debounce (150-300ms) cho bộ lọc tìm kiếm trên bảng mã BIZFLY.
- **Phase 3B: Thuật toán đối soát BIZFLY và xuất Excel**
  - Phát triển `bizflyReconciliation.ts` sử dụng `PROJECTED_API_COLUMN_MAP` và logic xử lý unmatched.
  - Tách biệt UI upload/parser file cho BIZFLY. Tích hợp UI đối soát và logic xuất file Excel hạch toán đầu ra của BIZFLY.
- **Phase 4: Kiểm thử và Hướng dẫn deploy**
  - Thực hiện kiểm thử tích hợp toàn bộ luồng Cloud & BIZFLY, tránh lỗi regression cho phân hệ Cloud.
  - Viết tài liệu hướng dẫn cập nhật Apps Script.

## 9. Test Strategy

- **Automated/Semi-automated tests:**
  - Viết script test đơn giản chạy bằng `tsx` trong thư mục `scratch/` để kiểm thử độc lập hàm đối soát (`bizflyReconciliation.ts`) kiểm tra trường hợp khớp và không khớp.
- **Manual verification:**
  - Chuyển đổi qua lại giữa Cloud và BIZFLY, xác nhận dữ liệu hiển thị trên bảng mã được load độc lập và chính xác.
  - Kiểm tra ghi log hoạt động của BIZFLY có prefix `[BIZFLY]` chính xác.
  - Kiểm tra việc xuất Excel hạch toán của BIZFLY khớp đúng cấu trúc cột và diễn giải yêu cầu.

## 10. Rollback Plan

- Revert git commit.
- Rollback Apps Script về phiên bản cũ.

## 11. Quy trình nghiệp vụ đối soát BIZFLY (Chi tiết)

### Bước 1: Chuẩn bị dữ liệu (File 1)
- **Nguồn:** Người dùng tải lên file Excel dữ liệu nguồn (Sổ chi tiết công nợ).
- **Cách xử lý:** 
  - Nhận diện Header tại dòng 6, nội dung thực tế từ dòng 11 trở đi.
  - Cột khóa chính: cột **Diễn giải** (cột D).

### Bước 2: Liên kết thông tin hợp đồng/đơn hàng (File 2)
- **Nguồn:** Người dùng tải lên file Excel tham chiếu (Thông tin HD/PLHD).
- **Cách xử lý:** 
  - Nhận diện Header tại dòng 4.
  - Lấy cột **Diễn giải link tiền** (cột BG - index 0-based là **58**) làm khóa để so khớp với cột **Diễn giải** của File 1.
  - Khi khớp, lấy giá trị tại cột **Số PL/ Mã đơn hàng** (cột C) gán vào dòng tương ứng ở File 1.

### Bước 3: Tra cứu bảng mã khách hàng (Google Sheet)
- **Nguồn:** Đọc dữ liệu từ bảng mã khách hàng BIZFLY (Google Sheet: `Bảng Mã Khách Hàng BIZFLY`).
- **Cách xử lý:**
  - Apps Script đọc dữ liệu, tự động loại bỏ 2 dòng header đầu (`data.slice(2)` thực hiện ở GAS) và chỉ trích xuất 4 cột dữ liệu cần thiết theo bảng ánh xạ:
  
  **Bảng ánh xạ `RAW_SHEET_COLUMN_MAP` (dùng ở Apps Script):**
  
  | Cột Excel | Chỉ số 0-based | Tên cột / Ý nghĩa |
  | :---: | :---: | :--- |
  | **F** | **5** | Số PL |
  | **H** | **7** | Tên sale |
  | **J** | **9** | Nhãn hàng/TK set-up dv |
  | **BB** | **53** | Mã khách |

  - **Mảng dữ liệu 2D phản hồi về Frontend** chỉ chứa các dòng dữ liệu sạch có 4 cột theo định dạng: `[ [Số PL, Tên sale, Nhãn hàng, Mã khách], ... ]`.
  - **Bảng ánh xạ `PROJECTED_API_COLUMN_MAP` (dùng ở Frontend):**
  
  | Chỉ số mảng 0-based | Tên cột / Ý nghĩa | Vai trò trong đối soát |
  | :---: | :--- | :--- |
  | **0** | Số PL | Khóa tra cứu từ Số PL/Mã đơn hàng ở Bước 2 |
  | **1** | Tên sale | Lấy để điền vào cột Diễn giải (cột O) của file xuất |
  | **2** | Nhãn hàng/TK set-up dv | Lấy để điền vào cột Diễn giải (cột O) của file xuất |
  | **3** | Mã khách | Lấy làm Mã khách hàng chuẩn (cột B và L) |

  - Lấy giá trị **Số PL/ Mã đơn hàng** đã gán từ Bước 2 để tìm kiếm trong cột Số PL (chỉ số **0**) của mảng dữ liệu BIZFLY nhận được từ API.
  - **Quy tắc xử lý dòng không khớp (Unmatched):**
    - Nếu giá trị Số PL/Mã đơn hàng không tìm thấy trong Bảng mã KH BIZFLY, hoặc Số PL/Mã đơn hàng bị trống (không khớp File 2 ở Bước 2):
      - **Mã khách**: Tự động gán là `"KH020219"` (mã mặc định).
      - **Nhãn hàng/TK set-up dv**: Để trống.
      - **Tên sale**: Để trống.

### Bước 4: Đưa thông tin vào bảng Import phiếu hạch toán (File xuất ra)
Xuất ra file Excel có cấu trúc giống hình 4 với các trường:
- **ĐVCS (cột A)**: Mặc định `"HANOI"`, hiển thị ô nhập trên UI để thay đổi.
- **Mã khách (cột B)**: Mã khách hàng tìm thấy ở Bước 3 (nếu unmatched thì gán `"KH020219"`).
- **Lý do nộp (cột D)**: Giá trị cột **Diễn giải** (cột D) trong File 1.
- **Tài khoản nợ (cột E)**: Giá trị mặc định là `"112106"`.
- **Mã giao dịch (cột F)**: Giá trị mặc định là `"2"`.
- **Số chứng từ (cột G)**: Đánh số tăng tự động giống Cloud.
- **Ngày chứng từ (cột H)**: Giá trị cột **Ngày ct** trong File 1.
- **Mã ngoại tệ (cột I)**: Giá trị mặc định là `"VND"`.
- **Tỷ giá (cột J)**: Mặc định là `1`.
- **Tk có (cột K)**: Mặc định là `"131"`.
- **Mã khách ct (cột L)**: Mã khách hàng tìm thấy ở Bước 3 (nếu unmatched thì gán `"KH020219"`).
- **Tiền nt (cột M)**: Giá trị cột **Phát sinh có** (cột G) trong File 1.
- **Tiền (cột N)**: `= Tiền nt * Tỷ giá`.
- **Diễn giải (cột O)**:
  - Nếu khớp (Matched): `= [Diễn giải File 1] + " " + [Nhãn hàng/TK set-up dv] + " " + [Tên sale] + " " + [Nhãn hàng/TK set-up dv] + " " + [Số PL]`.
  - Nếu không khớp (Unmatched): Chỉ giữ nguyên giá trị cột `Diễn giải` của File 1.
- **Vụ việc (cột P)**: Mặc định là `"BIZFLY"`.
- **Bộ phận (cột Q)**: Mặc định là `"DIG.TRAN"`.
- **Mã quyển (cột U)**: `"BC" + [Năm hiện tại]` (ví dụ: `BC2026`).

## 12. Tham chiếu thực thi

- Checklist chi tiết theo phase: `FEATURE_TASKS.md`

---
name: check-issue
description: Truy nguyên nguyên nhân gốc rễ của bug hoặc sự cố, đưa ra bằng chứng và hướng xử lý, nhưng không tự sửa code trong skill này.
---

# Multi Agent Skills - Check Issue (🔍 The Detective)

> 🛡️ **NGUYÊN TẮC AN TOÀN (High-Risk Commands):**
> AI **BẮT BUỘC** phải giải thích và xin phép User trước khi chạy các lệnh terminal rủi ro cao (GCP, Docker, Firebase). 
> Tham chiểu mẫu giải thích tại `README.md` hoặc skill `feature-coordinator`.

## Vai trò
Phân tích và tìm nguyên nhân gốc rễ (Root Cause) của vấn đề. Skill này **chỉ dừng ở điều tra và kết luận**, không thực hiện sửa code.

## Nguyên tắc tối thượng
1. **KHÔNG** chỉnh sửa bất kỳ dòng code nào trong skill này
2. **KHÔNG** tự ý suy đoán nếu thiếu thông tin
3. **LUÔN** đặt câu hỏi nếu ngữ cảnh chưa đầy đủ

## Nguyên tắc nạp ngữ cảnh
- Skill này **được phép đọc rộng** khi cần truy nguyên root cause về kiến trúc, security hoặc logic.
- Nhưng phải đọc **theo giả thuyết**, không quét full repo vô hướng:
  1. Triệu chứng/repro/log/error message
  2. File hoặc route/module trực tiếp liên quan
  3. `.agent/KNOWLEDGE_BASE.md`, `.agent/changelog/*.md`, `.agent/CONTEXT.md`, `.agent/PROJECT_STRUCTURE.md`
  4. Call chain upstream/downstream
  5. Module lân cận nếu có nghi vấn
- Nếu nghi vấn liên quan các vùng sau, **bắt buộc** mở rộng thêm:
  - auth, permission, session/token
  - validation, schema, migration
  - cache, queue, worker, cron
  - config/env/feature flags
  - integration với service ngoài
  - logging, retry, error boundary
- Chỉ đọc `.agent/architecture/*` khi issue có khả năng là lỗi thiết kế, race condition, dependency cycle, sai data flow hoặc sai boundary giữa module.

## Workflow

### Bước 1: Wisdom Loading (tìm tiền lệ)
1. Đọc `.agent/KNOWLEDGE_BASE.md` — tìm lỗi tương tự từng xảy ra, quyết định kiến trúc liên quan
2. Đọc `.agent/changelog/*.md` phù hợp — tìm thay đổi gần đây có thể gây ra vấn đề
3. Đọc `.agent/CONTEXT.md` — hiểu bản đồ dự án, xác định vùng code liên quan
4. Đọc `.agent/PROJECT_STRUCTURE.md` — xác định entry points, module và config liên quan
5. Đọc `.agent/architecture/MASTER.md` và các tài liệu kiến trúc liên quan nếu issue có dấu hiệu ở tầng thiết kế/hệ thống

### Bước 2: Tiếp nhận & Thu thập ngữ cảnh
Dựa trên mô tả vấn đề của User, AI sẽ:
- Sử dụng các công cụ phù hợp với môi trường hiện tại như tìm kiếm text/file, đọc file, xem diff, log, và cấu hình để rà soát vùng liên quan
- Đọc logs, cấu hình, error messages nếu cần
- Đọc Contract đầu file (nếu có) để hiểu giới hạn của file
- Lần theo call chain để xác định lỗi nằm ở input, transform, persistence, permission hay rendering

### Bước 3: Phân tích & Đặt câu hỏi
AI liệt kê những gì đã tìm thấy và:
- Đặt câu hỏi cụ thể để làm rõ điểm nghi vấn
- Yêu cầu thêm thông tin về bước tái hiện (repro steps) nếu chưa có
- So sánh với changelog: "Thay đổi gần nhất có liên quan không?"

### Bước 4: Kết luận nguyên nhân
```
🔍 KẾT QUẢ PHÂN TÍCH:

📋 Nguyên nhân gốc rễ (Root Cause):
[Mô tả nguyên nhân]

📎 Bằng chứng:
- [File/Dòng code/Log liên quan]

💡 Đề xuất hướng giải quyết:
1. [Giải pháp 1] — Ưu tiên cao
2. [Giải pháp 2] — Thay thế

⚠️ Rủi ro nếu sửa:
- [Rủi ro cần lưu ý]

Bước tiếp theo khuyến nghị:
1. `feature-plan` nếu đây là bug lớn, cần task breakdown, review, hoặc triển khai nhiều phase
2. Quay lại workflow triển khai phù hợp nếu đã có plan/gate rõ ràng
3. Dừng tại đây nếu User chỉ cần RCA để tự xử lý
```

## Ví dụ sử dụng (Chat Flow)

**Bạn:** "/check-issue Lỗi không render được danh sách bài viết"

**AI:** (Thực hiện quét codebase, đọc logs...) "Tôi đã rà soát và tìm thấy các điểm nghi vấn sau..."

**AI:** 
> 🔍 **KẾT QUẢ PHẢN BIỆN:**
> 
> 📋 **Nguyên nhân gốc rễ (Root Cause):**
> Do biến `articles` đang được map trực tiếp từ Firestore mà không kiểm tra tồn tại của trường `created_at`, dẫn đến crash khi gặp bài viết chưa hoàn thiện.
> 
> 📎 **Bằng chứng:**
> - File `AdminDashboard.tsx`, dòng 855.
> 
> 💡 **Đề xuất hướng giải quyết:**
> Thêm kiểm tra optional chaining `article.created_at?.seconds` trước khi format ngày.
> 
> ⚠️ **Rủi ro nếu sửa:**
> - Rất thấp, chỉ thay đổi logic hiển thị.
> 
> **Bước tiếp theo hợp lý:** nếu đây là bug nhỏ, bạn có thể tự sửa theo RCA; nếu đây là bug lớn, hãy gọi `feature-plan`.

**Bạn:** "Chốt RCA, tôi sẽ lập plan sửa"

**AI:** "Tôi đã chốt RCA và đề xuất hướng xử lý. Bước đúng tiếp theo là `feature-plan`." [Skill này dừng tại đây]

## Handoff Contract
- Với `feature-plan`:
  - Dùng khi root cause đã rõ và bug đủ lớn để cần plan, task breakdown, review gate, hoặc triển khai nhiều phase.
- Với `feature-coordinator`:
  - Chỉ quay lại khi đã có `FEATURE_PLAN.md` và `FEATURE_TASKS.md` hợp lệ cho fix tương ứng.
- Với `update-docs`:
  - Chỉ quay lại sau khi thay đổi code đã được thực thi xong; không dùng `update-docs` chỉ từ RCA.

## Lưu ý quan trọng
- **TUYỆT ĐỐI KHÔNG** khởi động bất kỳ công cụ chỉnh sửa file nào trong skill này.
- File này là **template tổng quát** — AI tự xác định file cần quét dựa trên mô tả lỗi
- Đọc KB + Changelog trước giúp tránh lặp lại sai lầm cũ
- **PHẢI** mở rộng đọc sang module lân cận nếu bug có dấu hiệu logic/permission/kiến trúc, không kết luận sớm từ 1 file
- **KHÔNG** quét toàn repo nếu chưa có giả thuyết kỹ thuật rõ ràng
- Chỉ đề xuất giải pháp và bước tiếp theo, **không tự thực hiện sửa code**

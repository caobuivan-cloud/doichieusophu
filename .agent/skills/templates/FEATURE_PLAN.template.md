# Feature Plan: [Tên tính năng]

> **Trạng thái**: ⏳ CHỜ REVIEW / ✅ ĐỒNG Ý / ⚠️ CẦN SỬA / ❌ TỪ CHỐI
> **Review gate**: [Khuyến nghị gọi `feature-review` / Bắt buộc review trước khi thực thi / User bỏ qua review với rủi ro đã nêu]
> **Feature slug**: [feature-slug]
> **Tạo bởi**: feature-plan
> **Ngày tạo**: [YYYY-MM-DD]

---

## 1. Bối cảnh và mục tiêu

- **Bối cảnh:** [Bối cảnh feature hoặc vấn đề cần xử lý]
- **Vấn đề cần giải quyết:** [Điều đang thiếu, đang lỗi, hoặc cần cải thiện]
- **Mục tiêu:** [Kết quả business / technical mong muốn]
- **Kết quả mong đợi:** [Định nghĩa ngắn gọn của done]

## 2. Phạm vi

### In scope
- [Hạng mục nằm trong vòng làm này]

### Out of scope
- [Hạng mục chủ động chưa làm ở vòng này]

## 3. Đối chiếu Knowledge Base

- **Quyết định kế thừa:** [Những quyết định kiến trúc liên quan cần giữ]
- **"Cấm kỵ" cần tránh:** [Những hướng không được phá vỡ]
- **Ràng buộc kiến trúc liên quan:** [Boundary, contract, infra, data flow cần tôn trọng]

## 4. Giả định và câu hỏi mở

### Giả định
- [Giả định non-blocking đã chọn để tiếp tục lập plan]

### Câu hỏi mở
- [Blocking] [Điểm còn thiếu nếu có]
- [Non-blocking] [Điểm cần user xác nhận sau]

## 5. Acceptance Criteria

- [ ] [Điều kiện đạt số 1]
- [ ] [Điều kiện đạt số 2]

## 6. Files và modules bị ảnh hưởng

| File/Module | Hành động | Lý do chạm vào | Rủi ro | Contract |
|-------------|-----------|----------------|--------|----------|
| `[file-or-module]` | Sửa / Tạo / Refactor | [Lý do] | 🟢/🟡/🔴 | Có / Chưa / Không rõ |

## 7. Risk Triage và Review Focus

- **Review required:** Yes / No
- **Risk hotspots:** [Các vùng cần soi kỹ hơn]
- **Review focus areas:** [Các câu hỏi `feature-review` cần trả lời]
- **Known pitfalls / historical issues:** [Lỗi cũ, tiền lệ, changelog, incident liên quan]
- **Dependencies / rollout concerns:** [Migration, backfill, env, deploy, order of rollout]

## 8. Chiến lược triển khai

- **Phase strategy:** [Chia thành mấy phase và logic chia]
- **Thứ tự triển khai:** [Làm gì trước, làm gì sau]
- **Điểm cần phối hợp:** [Frontend/backend/DB/infra/tester nếu có]
- **Yêu cầu migration / config / deploy:** [Nếu có]

## 9. Test Strategy

- **Automated tests:** [Unit/integration/e2e nào cần có]
- **Manual verification:** [Case nào user hoặc QA cần xác nhận]
- **Data / env chuẩn bị trước khi test:** [Seed, tài khoản, flags, mock data nếu cần]

## 10. Rollback Plan

- [Nếu có vấn đề, rollback như thế nào]

## 11. Tham chiếu thực thi

- Checklist chi tiết theo phase: `FEATURE_TASKS.md`

# Ví Dụ Transcript Review Hội Đồng

Dùng chung cho `feature-review` (một agent, các lượt rà soát tách biệt) và `spawn-agent-review` (reviewer tách biệt qua `spawn_agent`).
Hai ví dụ dưới đây minh họa output contract ở hai tình huống phổ biến nhất.

---

## Case A: Không có conflict, bỏ qua Round 2

```md
# BÁO CÁO REVIEW FEATURE: invoice-pdf-export

Kết luận: ✅ ĐỒNG Ý
Cổng review: Có thể handoff sang coordinator

## Thiết Lập Hội Đồng
- Chiến lược thực thi: một agent, các lượt rà soát tách biệt
- Loại review: review đầu tiên
- Thành phần hội đồng:
  - Kiến Trúc Sư Trưởng: feature thêm export flow mới, cần kiểm tra boundary giữa billing module và PDF renderer
  - Reviewer Delivery và QA: task breakdown có 3 phase, cần kiểm tra sequencing và test coverage
  - Reviewer Bảo Mật: flow tải file PDF, cần kiểm tra quyền truy cập và path traversal

## Nhận Định Riêng
### Vấn Đề Chuẩn Hóa
- FR-01: Thiếu rate limit cho endpoint export PDF
  - Nêu bởi: Reviewer Bảo Mật
- FR-02: Task 2.3 thiếu test cho trường hợp invoice rỗng
  - Nêu bởi: Reviewer Delivery và QA

### Kiến Trúc Sư Trưởng
1. Không có phát hiện mới.

### Reviewer Delivery và QA
1. FR-02 [Trung bình][Độ tin cậy cao] Thiếu test cho invoice rỗng
   - Vấn đề: Task 2.3 chỉ test happy path, không có case invoice không có line item
   - Bằng chứng: FEATURE_TASKS.md Task 2.3 acceptance criteria chỉ liệt kê "export thành công với invoice có ≥1 line item"
   - Ảnh hưởng: Bug ẩn khi user export invoice draft chưa có line item
   - Yêu cầu sửa: Thêm acceptance criterion và test case cho empty invoice

### Reviewer Bảo Mật
1. FR-01 [Thấp][Độ tin cậy trung bình] Thiếu rate limit cho export endpoint
   - Vấn đề: Endpoint /api/invoices/:id/export chưa có rate limit trong plan
   - Bằng chứng: FEATURE_PLAN.md section "API changes" không nhắc đến rate limiting
   - Ảnh hưởng: Có thể bị abuse để generate PDF liên tục, tốn server resource
   - Yêu cầu sửa: Thêm rate limit hoặc ghi rõ trong plan là chấp nhận risk ở phase 1

## Các Vòng Phản Biện
Không có bất đồng material. Bỏ qua Round 2.

## Tư Vấn Cuối Cùng Của Kiến Trúc Sư Trưởng
- Blocker đã xác nhận:
  - Không có
- Khuyến nghị không chặn rollout:
  - FR-01: Thêm rate limit hoặc document rõ risk acceptance
  - FR-02: Bổ sung test case cho empty invoice vào Task 2.3
- Cần xác thực thêm:
  - Không có
- Trade-off kinh doanh cần user quyết định:
  - Không có
- Bất đồng chưa ngã ngũ:
  - Không có
- Điều kiện trước khi triển khai:
  - Không có
- Khuyến nghị bước tiếp theo:
  - Plan đủ tốt để triển khai. Hai điểm trên là cải tiến, không chặn rollout.
  - `feature-coordinator` có thể bắt đầu.
```

---

## Case B: Có conflict, rebuttal 1 vòng rồi chốt

```md
# BÁO CÁO REVIEW FEATURE: upload-avatar

Kết luận: ⚠️ CẦN SỬA
Cổng review: Phải sửa plan rồi review lại

## Thiết Lập Hội Đồng
- Chiến lược thực thi: reviewer tách biệt qua `spawn_agent`
- Loại review: review đầu tiên
- Thành phần hội đồng:
  - Kiến Trúc Sư Trưởng: feature thay đổi file upload flow, chạm boundary giữa storage layer và user profile module
  - Reviewer Delivery và QA: 2 phase, cần kiểm tra sequencing giữa backend upload và frontend crop
  - Reviewer Bảo Mật: file upload là hotspot bảo mật, gồm EXIF, MIME, file size, path traversal

## Nhận Định Riêng
### Vấn Đề Chuẩn Hóa
- FR-01: Thiếu strip EXIF metadata
  - Nêu bởi: Reviewer Bảo Mật
- FR-02: Thiếu validation MIME type phía server
  - Nêu bởi: Reviewer Bảo Mật, bổ sung bằng chứng bởi Kiến Trúc Sư Trưởng
- FR-03: Rollback không xử lý file đã upload dở
  - Nêu bởi: Reviewer Delivery và QA
  - Bất đồng về mức độ: Kiến Trúc Sư Trưởng (Trung bình) vs Reviewer Delivery và QA (Cao)

### Kiến Trúc Sư Trưởng
1. FR-02 [Nghiêm trọng][Độ tin cậy cao] Server-side MIME validation thiếu
   - Vấn đề: Plan chỉ validate MIME ở frontend, không có server-side check
   - Bằng chứng: FEATURE_PLAN.md section "Upload flow" chỉ nhắc client-side file type filter
   - Ảnh hưởng: Có thể bypass frontend validation để upload file thực thi
   - Yêu cầu sửa: Thêm server-side MIME validation vào task breakdown

2. FR-03 [Trung bình][Độ tin cậy trung bình] Rollback thiếu cleanup storage là concern material nhưng chưa rõ có nên block ở mức Cao
   - Vấn đề: Rollback plan chỉ nói revert DB/config, chưa nói cleanup file đã upload dở
   - Bằng chứng: FEATURE_PLAN.md "Rollback Plan" chưa có bước nào cho storage cleanup
   - Ảnh hưởng: Có thể tạo orphaned files và state không đồng bộ giữa DB với storage
   - Yêu cầu sửa: Làm rõ rollback ownership và thêm cleanup step nếu feature ghi file ngay ở phase đầu

### Reviewer Delivery và QA
1. FR-03 [Cao][Độ tin cậy cao] Rollback không cleanup file đã upload
   - Vấn đề: Rollback plan chỉ revert DB, không đề cập cleanup file trên storage
   - Bằng chứng: FEATURE_PLAN.md "Rollback Plan" ghi "revert migration và config", không nhắc storage
   - Ảnh hưởng: Orphaned files tích tụ trên storage sau rollback
   - Yêu cầu sửa: Thêm bước cleanup storage vào rollback plan

### Reviewer Bảo Mật
1. FR-01 [Nghiêm trọng][Độ tin cậy cao] Thiếu strip EXIF metadata
   - Vấn đề: Ảnh upload giữ nguyên EXIF, có thể lộ GPS location của user
   - Bằng chứng: FEATURE_TASKS.md không có task nào nhắc đến EXIF stripping; KB mục "File Upload" cũng ghi "phải strip metadata"
   - Ảnh hưởng: Vi phạm privacy, lộ vị trí nhà user
   - Yêu cầu sửa: Thêm task strip EXIF trước khi lưu file

2. FR-02 [Nghiêm trọng][Độ tin cậy cao] MIME validation chỉ ở client
   - Vấn đề: Như Kiến Trúc Sư Trưởng đã nêu, plan cũng thiếu magic bytes check
   - Bằng chứng: Ngoài điểm Kiến Trúc Sư Trưởng nêu, file upload endpoint trong codebase hiện tại (`src/api/upload.ts:42`) cũng không có server-side check
   - Ảnh hưởng: Attacker có thể upload webshell disguised as image
   - Yêu cầu sửa: Server-side MIME check bằng magic bytes, không chỉ extension

## Các Vòng Phản Biện
### Ma Trận Bất Đồng
1. FR-03: Kiến Trúc Sư Trưởng (Trung bình) vs Reviewer Delivery và QA (Cao) về mức độ
   - Kiến Trúc Sư Trưởng cho rằng orphaned files không gây data corruption trực tiếp, chủ yếu tốn storage và tạo inconsistency
   - Reviewer Delivery và QA cho rằng rollback phải atomic, bao gồm cả storage

### Vòng 2.1
- FR-03 / Kiến Trúc Sư Trưởng / Điều chỉnh: Đồng ý nâng lên Cao. Rollback không cleanup storage tạo inconsistency giữa DB state và storage state; dù không gây data corruption trực tiếp thì vẫn vi phạm nguyên tắc atomic rollback trong KB.
- FR-03 / Reviewer Delivery và QA / Giữ nguyên: Mức Cao là phù hợp vì rollback thiếu cleanup storage sẽ làm plan không đạt ngưỡng an toàn triển khai.

Conflict đã được giải quyết. Không cần Round 2.2.

## Tư Vấn Cuối Cùng Của Kiến Trúc Sư Trưởng
- Blocker đã xác nhận:
  - FR-01 [Nghiêm trọng]: Thiếu EXIF stripping, vi phạm privacy và KB
  - FR-02 [Nghiêm trọng]: Thiếu server-side MIME validation, tạo security hole
  - FR-03 [Cao]: Rollback thiếu storage cleanup, gây inconsistency
- Khuyến nghị không chặn rollout:
  - Không có
- Cần xác thực thêm:
  - Không có
- Trade-off kinh doanh cần user quyết định:
  - Không có, vì cả 3 blocker đều là technical blocker chứ không phải lựa chọn A/B
- Bất đồng chưa ngã ngũ:
  - Không có
- Điều kiện trước khi triển khai:
  - [ ] Thêm task EXIF stripping (FR-01)
  - [ ] Thêm server-side MIME validation bằng magic bytes (FR-02)
  - [ ] Thêm storage cleanup vào rollback plan (FR-03)
- Khuyến nghị bước tiếp theo:
  - Plan cần sửa 3 điểm trên trước khi triển khai.
  - `feature-plan` để cập nhật task breakdown và rollback plan, sau đó quay lại skill review tương ứng của runtime hiện tại để re-review.
```

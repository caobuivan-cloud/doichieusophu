# Báo Cáo Audit Template

Dùng template này để giữ báo cáo ngắn gọn nhưng audit được. Điền đầy đủ các phần, không bỏ trống gate result hoặc cleanup result.

```md
# BÁO CÁO AUDIT CODEBASE: [scope]

Kết luận: ✅ PASS / ⚠️ CÓ PHÁT HIỆN / ⛔ BỊ CHẶN
Phạm vi: [toàn repo hoặc path/module]
Quality gate mục tiêu: lint + typecheck + build + test hiện có + test audit sinh ra

## Context và Chiến Lược
- Context chính đã đọc:
  - ...
- Hotspot đã audit:
  - ...
- Test strategy đã dùng:
  - ...

## Thay Đổi Tạm Phục Vụ Audit
- Artifact đã tạo:
  - ...
- Dependency/tooling/config đã thêm:
  - Không có / ...
- Approval đã dùng:
  - Không có / ...

## Kết Quả Gate
- `lint`: pass/fail/blocked
- `typecheck`: pass/fail/blocked
- `build`: pass/fail/blocked
- Existing tests: pass/fail/blocked
- Generated tests: pass/fail/blocked

## Findings
1. CB-01 [Security|Logic|Performance|Contract|Test Gap][Severity][Confidence] [tiêu đề ngắn]
   - Issue: ...
   - Evidence: file path, line, command output, hoặc artifact cụ thể
   - Test/Repro: test name hoặc bước tái hiện
   - Impact: ...
   - Required Fix: ...

## Cần Xác Thực Thêm
- Không có / ...

## File Rác Đề Xuất Dọn
- [path] - lý do nghi ngờ stale/dead - cần xác minh gì trước khi xóa

## Cleanup Audit Artifacts
- Đã dọn:
  - ...
- Còn giữ:
  - ...

## Kết Luận Và Bước Tiếp Theo
- Nếu gate fail: nêu rõ bug/blocker nào đang chặn pass
- Nếu gate pass nhưng còn cleanup candidate: nêu đó là khuyến nghị, không phải blocker
- Khuyến nghị handoff:
  - `check-issue` khi cần RCA sâu thêm
  - `feature-plan` khi cần plan sửa nhiều bước
  - `feature-coordinator` khi đã có plan được review và muốn triển khai fix
```

## Severity
- `Critical`: lộ security boundary nghiêm trọng, data corruption rõ ràng, hoặc failure chặn hoàn toàn luồng chính.
- `High`: bug/security/performance risk lớn, đã có evidence trực tiếp, cần sửa trước khi coi là pass.
- `Medium`: issue có tác động thực nhưng chưa chặn rollout tuyệt đối.
- `Low`: cải tiến hoặc hygiene item không chặn gate.

## Confidence
- `High`: đã có test fail/pass chứng minh, repro rõ, hoặc contract mismatch trực tiếp.
- `Medium`: có bằng chứng hợp lý nhưng vẫn còn giả định nhỏ.
- `Low`: có tín hiệu nhưng chưa đủ để kết luận material finding.

## Quy tắc viết
- Không dùng ngôn ngữ mơ hồ như "có vẻ", "có lẽ nghiêm trọng" nếu chưa có bằng chứng.
- Mỗi finding phải nối được tới một test/repro hoặc artifact cụ thể.
- Nếu audit bị chặn vì approval/env, nói rõ bị chặn ở đâu và vì sao.

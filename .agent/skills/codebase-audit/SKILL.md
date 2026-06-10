---
name: codebase-audit
description: Audit toàn bộ codebase hoặc một scope do user chỉ định để tìm security issue, lỗ hổng logic, lỗi contract, bottleneck hiệu năng, khoảng trống test kỹ thuật, và file rác cần dọn. Dùng khi Codex phải đọc code có định hướng, tự sinh và chạy các bài test cần thiết (script test, unit/integration test, UI test, browser test, mock-driven test) để chứng minh hành vi thực tế, rồi xuất báo cáo chỉ gồm các phát hiện có bằng chứng rõ ràng và hướng khắc phục. Skill này không dùng để tự sửa application code.
---

# Codebase Audit

## Mục tiêu
- Audit có trọng tâm, không quét full repo vô hướng.
- Ép hệ thống đi qua quality gate đầy đủ: `lint`, `typecheck`, `build`, test hiện có, và test mới do audit sinh ra.
- Biến nghi ngờ thành bằng chứng bằng test, repro script, log, query trace, hoặc contract mismatch cụ thể.
- Dừng ở `finding + evidence + remediation guidance`; **không tự sửa application code** trong skill này.
- Liệt kê file rác cần dọn như một đề xuất có căn cứ; **không tự xóa** các file đó.

## Bundled Resources
- Đọc `references/test-strategy-matrix.md` trước khi quyết định nên sinh script test, unit/integration test, UI test, hay browser test, và trước khi xin phép thêm harness mới.
- Đọc `references/report-template.md` ngay trước khi viết báo cáo cuối để giữ format, mức độ, và phần cleanup nhất quán.
- Dùng `script/run-quality-gates.ps1` ở `-Mode Discover` để snapshot gate đang có và ở `-Mode Run` để chạy baseline quality gate của repo.
- Dùng `script/register-audit-artifacts.ps1` ngay từ artifact tạm đầu tiên để không thất lạc test/script/log/screenshot cần cleanup cuối kỳ.
- Dùng `script/find-cleanup-candidates.ps1` gần cuối audit để có thêm một pass deterministic về file rác/candidate cleanup.
- Các script này là helper để làm audit nhất quán hơn; chúng **không** thay thế việc đọc code, đối chiếu contract, và giải thích evidence.

## Nguyên tắc tối thượng
1. **KHÔNG** tự đoán scope, môi trường, hoặc quyền truy cập còn mơ hồ. Nếu user chưa nói rõ audit toàn repo hay module/path cụ thể, phải hỏi.
2. **KHÔNG** nêu security issue, logic bug, hay performance bug chỉ vì "có vẻ nguy hiểm". Mọi finding phải có bằng chứng cụ thể.
3. **KHÔNG** kết luận hệ thống pass nếu chưa chạy hết quality gate đã chốt hoặc bị block bởi approval/env.
4. **KHÔNG** sửa application code trong skill này. Chỉ được sửa test/harness do chính audit tạo ra khi test sai giả định hoặc viết lỗi.
5. **KHÔNG** dọn artifact audit giữa lúc đang điều tra, tranh luận, hoặc phản biện. Cleanup chỉ là bước cuối.
6. **KHÔNG** đụng database, môi trường dùng chung, hoặc thêm dependency/tooling mới nếu chưa giải thích tác động và xin phép user trước.

## Nguyên tắc nạp ngữ cảnh
- Bắt đầu từ phạm vi nhỏ nhất đủ để chứng minh hoặc bác bỏ rủi ro.
- Với audit toàn repo, đọc tối thiểu theo thứ tự:
  1. `.agent/CONTEXT.md`
  2. `.agent/KNOWLEDGE_BASE.md`
  3. `.agent/PROJECT_STRUCTURE.md`
  4. `README.md`
  5. root `package.json`
  6. `backend/package.json`, `frontend/package.json`, `packages/shared/package.json`
  7. test/config/CI files liên quan
- Mở rộng thêm khi hotspot chạm:
  - auth, permission, token/session, PII
  - validation, schema, DTO, serialization
  - business workflow, state machine, approval flow
  - query, cache, retry, concurrency, queue
  - upload, file handling, OCR, export/import
- Khi nghi vấn liên quan rule nghiệp vụ hoặc access control, bắt buộc đối chiếu:
  - `.agent/business/data/PERMISSION_MATRIX.md`
  - `.agent/business/data/STATE_MACHINES.md`
  - `docs/business-flows/00-MASTER-INDEX.md`
- Khi đã có `.agent/testing/*.md`, phải đối chiếu test case docs với coverage thực tế để phát hiện lỗ hổng kiểm thử.

## Approval Gate Bắt Buộc

### 1. Thêm dependency hoặc test harness mới
Nếu audit cần thêm Playwright, Vitest frontend, Testing Library, mock server, browser binary, hoặc test config mới, phải dừng lại và hỏi user trước.

Mẫu giải thích bắt buộc:
- Mục đích kỹ thuật của dependency/tooling mới
- File sẽ bị ảnh hưởng: `package.json`, `pnpm-lock.yaml`, config test, script CI/local
- Tác động vào repo:
  - lockfile churn
  - tăng thời gian cài đặt hoặc build
  - có thể tải browser binary hoặc fixture mới
  - có thể làm CI lâu hơn hoặc tăng độ phức tạp bảo trì
- Vì sao bộ tool hiện có chưa đủ
- Cách rollback nếu user không muốn giữ thay đổi đó sau audit

### 2. Đụng database hoặc môi trường dùng chung
Nếu test cần đọc/ghi database, seed data, backfill, cleanup record, hoặc gọi vào môi trường dùng chung, phải dừng lại và hỏi user trước.

Mẫu giải thích bắt buộc:
- Environment nào sẽ bị chạm
- Đọc hay ghi dữ liệu gì
- Có dùng data thật hay fixture
- Cleanup plan cụ thể sau test
- Rủi ro còn lại nếu cleanup fail

### 3. Lệnh rủi ro cao
Phải giải thích và xin phép trước khi chạy lệnh có nguy cơ:
- thay đổi hạ tầng, cloud, deploy
- mutate database
- cài thêm tooling ngoài baseline
- xóa file hoặc dọn thư mục
- viết đè config test/build quan trọng

## Chọn chiến lược test
Luôn chọn **bộ test nhỏ nhất nhưng đủ sức chứng minh hành vi**. Không sinh mọi loại test chỉ để "cho chắc". Khi còn phân vân, đọc `references/test-strategy-matrix.md` trước.

### Script test
Dùng khi cần repro nhanh logic, transform, parsing, serialization, query construction, hoặc benchmark nhỏ mà chưa cần full runner.

### Unit test
Dùng cho pure function, validator, mapper, policy check, và guard logic cục bộ.

### Integration test
Dùng cho route, service, middleware chain, permission boundary, schema contract, query flow, hoặc data mutation có mock/stub rõ ràng.

### UI test
Dùng cho component/page state, form validation, bảng dữ liệu, empty/loading/error state, và các branch giao diện khó kiểm chứng chỉ bằng code reading.

### Browser test
Dùng cho flow xuyên route, auth redirect, permission gate, multi-step UI, upload/download, hoặc bug chỉ lộ ra khi render thật trong trình duyệt.

### Mock-driven test
Dùng khi cần chứng minh branch khó tái hiện với service thật. Mock phải phản ánh đúng contract hoặc fixture đã kiểm chứng; không được dựng mock để "ép" ra kết luận mong muốn.

## Workflow

### Bước 0: Chốt phạm vi
1. Xác nhận một trong hai:
   - audit toàn repo
   - audit scope cụ thể theo path/module/feature
2. Nếu user chưa nói rõ, hỏi ngắn gọn thay vì tự đoán.
3. Ghi rõ boundary nào nằm ngoài scope để tránh trôi phạm vi.

### Bước 1: Dựng baseline kỹ thuật
1. Đọc các core docs và package manifests theo `Nguyên tắc nạp ngữ cảnh`.
2. Xác định quality gate hiện có:
   - `lint`
   - `typecheck`
   - `build`
   - test scripts hiện có ở từng workspace
3. Nếu repo có cấu trúc phù hợp, chạy `script/run-quality-gates.ps1 -Mode Discover` để snapshot gate đang có và biết script nào sẽ được gọi.
4. Xác định test harness sẵn có và phần còn thiếu.
5. Lập danh sách hotspot ban đầu theo 5 nhóm:
   - security
   - logic/nghiệp vụ
   - performance/tài nguyên
   - contract/schema/test gaps
   - stale/dead/cleanup candidates

### Bước 2: Tạo giả thuyết audit có kiểm soát
Với mỗi hotspot, ghi ngắn gọn:
- nghi vấn cụ thể là gì
- bằng chứng sơ bộ nào khiến nghi vấn đáng kiểm tra
- loại test nào là phù hợp nhất để xác nhận hoặc bác bỏ

Nếu không có bằng chứng sơ bộ, không mở nhánh audit đó chỉ vì "biết đâu có".

### Bước 3: Xin phép trước khi đổi repo hoặc môi trường
1. Nếu cần thêm dependency/tooling/config mới, dừng và hỏi theo `Approval Gate`.
2. Nếu cần đụng DB hoặc shared env, dừng và hỏi theo `Approval Gate`.
3. Nếu user không cho phép, tiếp tục bằng chiến lược ít xâm lấn hơn và ghi rõ giới hạn của audit.

### Bước 4: Sinh artifact audit
1. Ngay khi tạo artifact tạm đầu tiên, khởi tạo session qua `script/register-audit-artifacts.ps1 -Action Init`.
2. Đặt tên artifact rõ mục đích, ví dụ `audit-*`, `*.audit.test.ts`, hoặc thư mục tạm dưới `.agent/tmp/codebase-audit/`.
3. Ưu tiên đặt test vào đúng runner/location native của repo để dễ chạy và dễ gỡ.
4. Mỗi artifact mới phải được register qua `script/register-audit-artifacts.ps1 -Action Register`.
5. Chỉ sinh artifact nào phục vụ trực tiếp cho một giả thuyết đã nêu.
6. Nếu cần frontend UI/browser harness mới, chỉ thêm bản tối thiểu đủ chạy.

### Bước 5: Chạy kiểm thử theo tầng
Thứ tự mặc định:
1. Chạy test/repro mới sinh ra để kiểm tra giả thuyết nhanh.
2. Nếu test mới fail, xác minh xem:
   - app bug thật
   - test viết sai
   - fixture/mock sai contract
3. Sửa test/harness của audit nếu chính test sai; không đẩy lỗi đó sang app.
4. Khi test mới đã ổn định, chạy quality gate đầy đủ của repo:
   - `pnpm run lint`
   - `pnpm run typecheck`
   - `pnpm run build`
   - các test hiện có ở từng workspace
   - các test mới do audit sinh ra
5. Nếu repo phù hợp với helper hiện có, ưu tiên dùng `script/run-quality-gates.ps1 -Mode Run` cho baseline gate rồi chạy thêm các custom/generated tests nằm ngoài baseline đó.
6. Nếu repo không có script chuẩn cho một gate, suy ra lệnh tương đương từ `package.json` và nói rõ lý do.

### Bước 6: Biến thất bại thành finding có dẫn chứng
Mỗi finding phải có đủ:
- `Issue`
- `Evidence`
- `Test/Repro`
- `Impact`
- `Required Fix`
- `Severity`
- `Confidence`

Quy tắc phân loại:
- `Critical` hoặc `High` chỉ hợp lệ khi có bằng chứng trực tiếp: test fail, unauthorized path chứng minh được, measurable slowdown rõ ràng, contract mismatch cụ thể, hoặc query/path gây rủi ro tài nguyên rõ rệt.
- `Low confidence` không được dùng để kết luận blocker `Critical` hoặc `High`.
- Concern không đủ bằng chứng thì đưa vào `Cần xác thực thêm`, không được giả vờ chắc chắn.

### Bước 7: Rà soát file rác cần dọn
1. Chạy `script/find-cleanup-candidates.ps1` gần cuối audit để có một pass deterministic về file/temp/report/log khả nghi.
2. Chỉ đề xuất file/thư mục là "cần dọn" khi có ít nhất một căn cứ:
- artifact tạm do audit hoặc debug để lại
- file không còn đường đọc từ code/docs/scripts
- file đã bị archive/supersede rõ ràng
- snapshot/export/log/screenshot có thể tái tạo
3. Không gắn nhãn "file rác" cho:
- dependency manager directories hợp lệ
- file build/test đang còn được script tham chiếu
- tài liệu lịch sử đang nằm đúng chỗ archive

### Bước 8: Cleanup cuối kỳ
1. Chỉ cleanup sau khi:
   - đã chốt findings
   - không còn vòng phản biện kỹ thuật đang mở
   - evidence quan trọng đã được ghi lại trong báo cáo
2. Mặc định dọn:
   - script repro tạm
   - test audit tạm không có giá trị giữ lâu dài
   - screenshot/log/output tạm dưới thư mục audit
3. Ưu tiên dùng `script/register-audit-artifacts.ps1 -Action Cleanup` để cleanup đúng những artifact đã register và tránh xóa nhầm.
4. Không tự xóa:
   - application code
   - dependency/tooling mới
   - harness mới có thể còn giá trị lâu dài
   trừ khi user yêu cầu rõ.
5. Nếu giữ lại artifact vì user cần xem hoặc vì có giá trị lâu dài, ghi rõ artifact nào còn giữ và vì sao.

## Output Contract

Trước khi viết báo cáo cuối, đọc `references/report-template.md`.

Format báo cáo bắt buộc:

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

Ràng buộc bắt buộc:
- Nếu chưa chạy được full gate do thiếu approval hoặc env, phải ghi `⛔ BỊ CHẶN`, không được gọi là pass.
- Nếu generated test fail và đã xác minh test không sai, coi đó là bug có bằng chứng.
- Nếu không có findings, phải ghi rõ `Không có phát hiện có bằng chứng sau khi chạy gate`.
- Báo cáo phải ưu tiên tiếng Việt tự nhiên; chỉ giữ tiếng Anh cho code identifier, command, API, file path, hoặc thuật ngữ kỹ thuật khó dịch.

## Handoff Contract
- Với `check-issue`:
  - dùng khi có failure thật nhưng cần RCA sâu hơn trên một bug cụ thể
- Với `feature-plan`:
  - dùng khi danh sách fix đủ lớn để phải chia phase hoặc cần review gate trước khi sửa
- Với `feature-coordinator`:
  - chỉ dùng sau khi đã có plan fix được review và user muốn triển khai

## Lưu ý quan trọng
- Không kết luận "an toàn" chỉ vì vài test pass.
- Không sinh quá nhiều test trùng lặp khi một test nhỏ hơn đã đủ chứng minh.
- Không để artifact audit làm bẩn repo rồi quên dọn.
- Không dùng skill này như công cụ patch code; đây là skill audit và tạo bằng chứng.



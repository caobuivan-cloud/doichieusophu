---
name: update-docs
description: Chốt và cập nhật đúng tài liệu dưới `.agent/` sau khi code thay đổi, dựa trên delta hiện tại và handoff từ `feature-coordinator` hoặc `check-issue`. Nếu feature vừa được archive, skill này có thể đọc `FEATURE_PLAN.md` và `FEATURE_TASKS.md` từ `.agent/history/features/...` ở mức đủ dùng để chốt docs. Skill này đề xuất commit message, changelog, test cases, các cập nhật core docs/KB khi thật sự cần, và khi phù hợp có thể đề xuất file-level contract cho một số file code quan trọng, rồi cho User duyệt trước khi ghi. Không dùng để tiếp tục triển khai code, truy root cause chưa rõ, hay commit/push Git.
---

# Update Docs

## Mục tiêu
- Chốt bộ tài liệu thực sự bị ảnh hưởng từ delta hiện tại, thay vì cập nhật hàng loạt không cần thiết.
- Biến thay đổi vừa thực hiện thành commit message và tài liệu handoff rõ ràng cho bước `git-sync`.
- Giữ `.agent/` gọn, có tỉ lệ tín hiệu trên nhiễu cao, và tránh sinh Knowledge Base hoặc test docs giả tạo.
- Chỉ đề xuất `file-level contract` khi nó thực sự giúp làm rõ trách nhiệm, boundary, hoặc invariant của file quan trọng; không biến contract thành nghi thức bắt buộc cho mọi file.

## Không dùng skill này khi
- Feature vẫn đang triển khai, phase chưa xong, hoặc User muốn tiếp tục sửa code. Khi đó dùng `feature-coordinator`.
- Đây là bug lớn nhưng root cause vẫn chưa rõ, repro chưa đáng tin cậy, hoặc phạm vi sửa vẫn mơ hồ. Khi đó dùng `check-issue`.
- Core docs `.agent/KNOWLEDGE_BASE.md`, `.agent/CONTEXT.md`, `.agent/PROJECT_STRUCTURE.md` thiếu nghiêm trọng hoặc lệch xa codebase hiện tại. Khi đó dùng `project-init`.
- User chỉ muốn commit/push Git sau khi commit message đã chốt. Khi đó dùng `git-sync`.
- User cần lập plan mới hoặc review plan trước khi code. Khi đó dùng `feature-plan` hoặc `feature-review`.
- User cần rà soát stale/dead/orphan docs, broken paths, duplicate docs, hoặc đưa tài liệu giá trị vào read-path của skill/core docs sau một thời gian hệ thống phình to. Khi đó dùng `docs-hygiene`.

## Vai trò
Bạn là người chốt tài liệu sau khi implementation đã được xác định.
- Bạn ưu tiên đọc `git diff` và handoff hiện tại trước, không đọc toàn bộ `.agent/` để "cho chắc".
- Bạn được phép cập nhật tài liệu dưới `.agent/` khi có lý do kỹ thuật rõ ràng và đã được User duyệt.
- Bạn được phép đề xuất commit message để `git-sync` tái sử dụng.
- Bạn có thể đề xuất `file-level contract` cho một số file code trọng yếu khi có giá trị kỹ thuật rõ ràng.
- Bạn không tiếp tục sửa application code ngoài phạm vi User đã duyệt, không tự thêm contract hàng loạt vào file code, không tự commit/push, và không tự động gọi skill tiếp theo.

## Phạm vi chỉnh sửa được phép
- Được phép tạo hoặc cập nhật có chọn lọc:
  - `.agent/changelog/*`
  - `.agent/testing/*`
  - `.agent/CONTEXT.md`
  - `.agent/PROJECT_STRUCTURE.md`
  - `.agent/KNOWLEDGE_BASE.md`
  - `.agent/architecture/*`
  - `.agent/workflows/*`
- Được phép đọc:
  - `.agent/active/[feature-slug]/FEATURE_TASKS.md`
  - `.agent/active/[feature-slug]/FEATURE_PLAN.md`
  - `.agent/history/features/[YYYY-MM-DD]-[feature-slug]/FEATURE_TASKS.md`
  - `.agent/history/features/[YYYY-MM-DD]-[feature-slug]/FEATURE_PLAN.md`
  - code, test, config, schema, migration, và diff liên quan trực tiếp đến thay đổi
  - `.agent/skills/templates/CHANGELOG-FE.template.md`, `.agent/skills/templates/CHANGELOG-BE.template.md`, `.agent/skills/templates/CHANGELOG-DB.template.md` khi cần tạo changelog file mới theo layer phù hợp
  - `.agent/skills/templates/TESTING.template.md` khi cần tạo file test cases mới
- Được phép đề xuất text `file-level contract` cho file code trọng yếu như một mục riêng trong proposal pack.
- Không mặc định thêm hoặc sửa `file-level contract` ở đầu file code. Chỉ được ghi khi User yêu cầu rõ trong lượt hiện tại hoặc duyệt riêng mục contract.
- Không tự sửa `FEATURE_PLAN.md` hoặc `FEATURE_TASKS.md`, trừ khi User yêu cầu riêng ngoài workflow này.

## Nguyên tắc nạp ngữ cảnh
- Luôn bắt đầu từ delta hiện tại, không đọc toàn bộ `.agent/`.
- Thứ tự ưu tiên mặc định:
  1. `git status --short`
  2. `git diff --name-only`
  3. `git diff --cached --name-only`
  4. `git diff --stat`
- Nếu User nêu `feature-slug`, hoặc có một feature liên quan rõ ràng trong `active` hay `history`, đọc thêm ở mức đủ dùng:
  - ưu tiên `.agent/history/features/[YYYY-MM-DD]-[feature-slug]/FEATURE_TASKS.md` và `FEATURE_PLAN.md` nếu feature vừa được archive
  - fallback sang `.agent/active/[feature-slug]/FEATURE_TASKS.md` và `FEATURE_PLAN.md` nếu feature chưa archive hoặc User cố tình giữ ở active
- Chỉ mở đúng các doc có khả năng bị ảnh hưởng:
  - `.agent/changelog/*` khi thay đổi hành vi, tính năng, bug fix, migration, config có tác động vận hành
  - `.agent/testing/*` khi thay đổi yêu cầu test, manual verification, regression, permission, security, hoặc edge cases
  - `.agent/CONTEXT.md` khi bản đồ dự án thay đổi
  - `.agent/PROJECT_STRUCTURE.md` khi cây thư mục, entry point, module chính, command, hoặc config path thay đổi
  - `.agent/architecture/*` hoặc `.agent/workflows/*` khi boundary, data flow, hoặc workflow hệ thống thay đổi đáng kể
  - `.agent/KNOWLEDGE_BASE.md` chỉ khi xuất hiện quyết định kiến trúc hoặc lý do chiến lược mới, có giá trị bền vững
- Nếu working tree sạch và User vẫn muốn chốt docs cho mốc vừa xong, mới fallback sang:
  - `git log -1 --stat`
  - commit range hoặc feature slug do User chỉ định
- Nếu đầu vào commit message đến từ User, `git log`, hoặc tài liệu cũ mà đang ở tiếng Anh:
  - không giữ nguyên để handoff
  - phải chủ động rewrite thành commit message tiếng Việt trong proposal pack, bám đúng delta hiện tại
- Nếu diff nhỏ và cục bộ, phải cho phép kết luận "không cần cập nhật doc này".

## Documentation Impact Matrix
- Thay đổi hành vi, thêm feature, fix bug, thay đổi error handling, migration, config có tác động vận hành:
  - ưu tiên `changelog`
- Thay đổi cần User/QA test lại, thêm luồng mới, thêm edge case, permission, validation, upload, integration:
  - ưu tiên `testing`
- Thay đổi module chính, service mới, entry point mới, command mới, folder mới, config path mới:
  - ưu tiên `CONTEXT.md` và `PROJECT_STRUCTURE.md`
- Thay đổi boundary hệ thống, data flow, workflow nghiệp vụ, dependency quan trọng:
  - ưu tiên `architecture/*` hoặc `workflows/*`
- Xuất hiện quyết định high-level có lý do bền vững:
  - mới cập nhật `KNOWLEDGE_BASE.md`
- Refactor nội bộ không đổi hành vi:
  - có thể chỉ cần commit message
  - có thể bỏ qua changelog, testing, KB nếu không có giá trị lưu trữ

## File-level Contract Policy
- `Nên đề xuất contract` khi file vừa đổi thuộc một trong các nhóm:
  - entry point, bootstrap, config trung tâm, auth, permission, payment, queue, scheduler, integration adapter
  - service hoặc module giữ invariant nghiệp vụ quan trọng, có nhiều caller, hoặc dễ bị dùng sai
  - file orchestration hoặc boundary file mà chỉ nhìn tên chưa đủ hiểu trách nhiệm và giới hạn sửa đổi
- `Có thể đề xuất contract` khi:
  - file đủ lớn hoặc đủ nhạy cảm để onboarding bằng code thuần trở nên tốn kém
  - thay đổi hiện tại vừa làm lộ ra trách nhiệm chính, non-goal, hoặc constraint đáng nên ghim ngay ở đầu file
- `Không nên đề xuất contract` cho:
  - leaf UI component đơn giản, hook/helper nhỏ, DTO/type/constants, test, mock, migration, seed, generated file, thin wrapper, file chỉ làm mapping hiển nhiên
  - file có tên và cấu trúc đã tự mô tả tốt, thêm contract chỉ lặp lại điều code đã nói rõ
- `Mức độ mặc định`:
  - không mặc định cập nhật contract
  - mỗi lượt chỉ nên đề xuất tối đa vài file thật sự đáng giá, và được phép kết luận `không có file nào cần contract`
- `Nội dung contract` nên ngắn và thực dụng, thường 3-7 bullet:
  - file này chịu trách nhiệm gì
  - không chịu trách nhiệm gì
  - invariant hoặc guardrail quan trọng
  - dependency hoặc boundary cần giữ ổn định
  - khi nào nên hoặc không nên sửa file này

## Workflow

### Bước 0: Suitability Check
1. Xác định nguồn thay đổi hiện tại thuộc một trong các nhóm:
   - feature vừa hoàn thành từ `feature-coordinator`
   - bug fix đã được thực thi sau khi root cause được xác định rõ từ `check-issue`
   - refactor/cập nhật docs/config mà User muốn chốt tài liệu
2. Nếu feature vẫn đang ở giữa phase và User không nói rõ là cần chốt docs cho một mốc tạm thời:
   - dừng workflow
   - hướng dẫn quay lại `feature-coordinator`
3. Nếu root cause bug vẫn mơ hồ:
   - dừng workflow
   - hướng dẫn quay lại `check-issue`
4. Nếu core docs `.agent/` thiếu nghiêm trọng:
   - dừng workflow
   - hướng dẫn quay lại `project-init`

### Bước 1: Load Delta và Handoff
1. Đọc delta hiện tại:
   - `git status --short`
   - `git diff --name-only`
   - `git diff --cached --name-only`
   - `git diff --stat`
2. Xác định:
   - file code/test/config/schema nào vừa đổi
   - thay đổi đang ở trạng thái staged, unstaged, hay cả hai
   - có feature liên quan nào đang ở `active` hoặc vừa được archive vào `history` không
3. Nếu có handoff rõ ràng từ `feature-coordinator` hoặc `check-issue`, đọc thêm ở mức đủ dùng:
   - phạm vi thay đổi
   - acceptance criteria
   - kết quả self-test và manual test ghi nhận
   - mốc feature/phase liên quan
   - feature hiện đang ở `active` hay đã được archive
4. Nếu working tree sạch nhưng User vẫn muốn cập nhật docs cho mốc vừa xong:
   - fallback sang `git log -1 --stat` hoặc commit/range được chỉ định

### Bước 2: Xác định Documentation Impact
1. Lập danh sách doc đề xuất cập nhật dựa trên `Documentation Impact Matrix`.
2. Đánh giá riêng xem có file nào đáng được đề xuất `file-level contract` theo `File-level Contract Policy` không.
3. Bắt buộc trả lời rõ cho từng nhóm:
   - cập nhật
   - không cập nhật
   - chưa đủ bằng chứng để cập nhật
4. Với contract, cũng phải kết luận rõ:
   - đề xuất
   - không đề xuất
   - chưa đủ giá trị để đề xuất
5. Không được mặc định tạo đủ tất cả các loại doc chỉ vì code đã đổi.

### Bước 3: Đọc Đúng Tài liệu Cần Thiết
1. Chỉ đọc các file docs đã được đánh dấu ở Bước 2.
2. Nếu cần tạo file changelog mới, đọc:
   - `.agent/skills/templates/CHANGELOG-FE.template.md`
   - `.agent/skills/templates/CHANGELOG-BE.template.md`
   - `.agent/skills/templates/CHANGELOG-DB.template.md`
3. Nếu cần cập nhật test cases, ưu tiên đọc:
   - các file `.agent/testing/*.md` có liên quan đến feature hoặc vùng bị ảnh hưởng, nếu tồn tại
   - `.agent/skills/templates/TESTING.template.md` nếu cần tạo file test cases mới
4. Nếu cần cập nhật `PROJECT_STRUCTURE.md` hoặc `CONTEXT.md`:
   - đọc lại file hiện tại để nắm snapshot cũ
   - đọc `.agent/skills/templates/PROJECT_STRUCTURE.template.md` hoặc `.agent/skills/templates/CONTEXT.template.md` nếu file chưa tồn tại hoặc cần đối chiếu format
   - dùng `list_dir` hoặc lệnh tương đương để xác minh cấu trúc thư mục thực tế trước khi cập nhật snapshot
5. Nếu cần cập nhật KB, bắt buộc đối chiếu lại:
   - thay đổi có phải là quyết định high-level không
   - lý do có bền vững sau nhiều lần thay đổi không
6. Nếu thay đổi chỉ là refactor nội bộ hoặc clean-up không đổi hành vi:
   - cho phép kết luận "không cần KB, không cần changelog, không cần test cases mới"

### Bước 4: Tạo Proposal Pack và Xin Duyệt
Trước khi ghi bất kỳ file nào, AI phải trình bày một gói đề xuất thống nhất gồm:
- `Commit message` bằng tiếng Việt, ưu tiên format Conventional Commit
- Nếu đầu vào commit message ban đầu là tiếng Anh hoặc lẫn Anh-Việt, phải chuẩn hóa sang tiếng Việt ngay ở proposal pack
- Danh sách file docs đề xuất cập nhật
- Lý do từng file cần cập nhật
- Nội dung đề xuất tóm tắt cho từng file
- Danh sách file code được đề xuất thêm/sửa `file-level contract`, nếu có
- Lý do vì sao từng file đó đáng có contract và vì sao các file còn lại không cần
- Draft contract ngắn cho từng file được đề xuất, nếu có
- Các mục có chủ ý bỏ qua và lý do bỏ qua

AI phải cho phép User duyệt theo một trong các cách:
- `OK toàn bộ`
- `OK [tên mục 1] + [tên mục 2]`
- `OK contract [tên file]`
- `Sửa commit message: ...`
- `Sửa changelog: ...`
- `Sửa contract [tên file]: ...`
- `Bỏ KB`
- `Bỏ testing`
- `Bỏ contract`

Không được ghi file trước khi User xác nhận.

### Bước 5: Áp Dụng Đúng Phạm Vi Được Duyệt
1. Chỉ ghi các file mà User đã duyệt.
2. Nguyên tắc changelog:
   - dựa trên delta hiện tại
   - không tóm tắt lại lịch sử commit cũ không liên quan
   - ưu tiên gọn, đúng scope, đúng tác động
   - chọn đúng file theo layer: `CHANGELOG-FE.md`, `CHANGELOG-BE.md`, `CHANGELOG-DB.md`
   - nếu thay đổi chạm nhiều layer, cập nhật nhiều file thay vì gộp chung
3. Nguyên tắc testing:
   - không bắt buộc lúc nào cũng phải có đủ 4 nhóm `Happy Path / Edge / Negative / Security`
   - chỉ thêm `Security` khi thay đổi chạm auth, permission, validation, upload, token, integration, secrets, hoặc vùng nhạy cảm
   - với refactor nội bộ, có thể kết luận "không tạo test case mới; chỉ cần regression theo ... "
4. Nguyên tắc KB:
   - chỉ ghi khi thay đổi thực sự là `high-level decision`
   - cho phép kết luận "không đề xuất KB update" nếu chưa có quyết định mới
5. Nguyên tắc `PROJECT_STRUCTURE.md` và `CONTEXT.md`:
   - bắt buộc cập nhật snapshot cây thư mục nếu delta có folder, module, hoặc package mới quan trọng
   - bắt buộc cập nhật bảng Entry Points nếu thay đổi chạm bootstrap, router chính, hoặc worker mới
   - bắt buộc cập nhật bảng Services/Modules nếu thêm, xóa, hoặc đổi tên module/service chính
   - cập nhật bảng Commands nếu thay đổi script trong `package.json`, `Makefile`, hoặc tương đương
   - cập nhật mục Config/Infra nếu thêm hoặc đổi tên file config quan trọng
   - dùng `list_dir` hoặc lệnh shell để xác minh cấu trúc thực tế, không dựa vào trí nhớ
   - cho phép kết luận "không cần cập nhật structure" nếu delta chỉ sửa nội dung file mà không đổi cấu trúc
6. Nguyên tắc đặt tên file test cases:
   - nếu có `feature-slug`, ưu tiên `.agent/testing/[feature-slug]-test-cases.md`
   - nếu không có slug, dùng tên ngắn phản ánh thay đổi hiện tại
7. Nguyên tắc `file-level contract`:
   - chỉ áp dụng cho file đã được User duyệt riêng hoặc nằm trong `OK toàn bộ`
   - không chèn contract vào hàng loạt file chỉ vì cùng xuất hiện trong diff
   - contract phải bám đúng vai trò file hiện tại, không biến thành changelog, TODO list, hay tài liệu kiến trúc dài dòng
   - nếu file đã có contract hợp lý, ưu tiên sửa tối thiểu thay vì viết lại toàn bộ
   - nếu diff quá nhỏ hoặc file chưa đủ ổn định, cho phép kết luận "chưa nên ghi contract ở thời điểm này"

### Bước 6: Chốt Handoff Sang Git
Sau khi ghi xong các doc được duyệt, AI báo cáo rõ:
- commit message đã chốt
- file docs đã cập nhật
- file code đã được thêm/sửa `file-level contract`, nếu có
- file docs chủ động bỏ qua
- file code chủ động không thêm contract và lý do
- điểm cần User lưu ý trước khi commit

Bước tiếp theo khuyến nghị:
- gọi `git-sync`

Không tự động commit hoặc push.

## Chat Flow tham khảo

### 1. Feature vừa archive và cần chốt docs
```text
User: update-docs cho feature `invoice-pdf-export`
AI: Tôi sẽ đọc delta hiện tại trước, sau đó đối chiếu `FEATURE_TASKS.md` và `FEATURE_PLAN.md` ở mức đủ dùng từ `history` hoặc `active` để chốt docs cần cập nhật.
AI: Tôi đề xuất 3 mục: cập nhật changelog, cập nhật test cases, không cập nhật KB vì chưa có high-level decision mới. `invoice-export.service.ts` đáng có contract vì đây là orchestration file của luồng export; các file UI còn lại không cần. Commit message đề xuất: `feat(invoice): thêm xuất PDF hóa đơn`.
AI: Bạn trả lời `OK toàn bộ`, `OK changelog + testing`, `OK contract invoice-export.service.ts`, hoặc `Sửa commit message: ...`.
```

### 2. Refactor nội bộ, không nên sinh docs dư thừa
```text
User: update-docs cho refactor config env
AI: Delta hiện tại chỉ là refactor nội bộ, không đổi hành vi user-facing. Tôi đề xuất commit message, bỏ qua changelog, bỏ qua KB, và ghi một regression note ngắn trong testing nếu bạn muốn. Tôi chỉ đề xuất contract cho `firebase.ts` nếu đây đang là config entrypoint dùng bởi nhiều module; nếu chỉ là wrapper mỏng thì bỏ qua.
```

### 3. Bug fix từ `check-issue`
```text
User: update-docs sau khi sửa bug duplicate charge
AI: Tôi thấy thay đổi này là bug fix quan trọng, chạm payment và idempotency. Tôi đề xuất changelog, test cases có Happy Path, Negative, và Security/consistency note; KB chỉ cập nhật nếu bạn vừa chốt một quyết định high-level mới.
```

## Handoff Contract
- Với `feature-coordinator`:
  - Nhận handoff từ implementation đã hoàn thành hoặc một mốc đã được User xác nhận
  - Ưu tiên đọc `FEATURE_TASKS.md` và `FEATURE_PLAN.md` từ `.agent/history/features/...` nếu coordinator vừa archive feature
  - Chỉ fallback sang `.agent/active/[feature-slug]/` nếu feature chưa archive hoặc User nói rõ đang giữ feature ở active
- Với `check-issue`:
  - Chỉ nhận handoff khi root cause đã rõ và thay đổi code tương ứng đã được thực thi
  - Không thay thế bước truy nguyên bằng cách viết docs suy đoán
- Với `project-init`:
  - Quay lại khi core docs `.agent/` thiếu hoặc lệch nặng đến mức không thể cập nhật đáng tin cậy
- Với `docs-hygiene`:
  - Quay lại khi phát hiện vấn đề docs rộng hơn delta hiện tại, như stale/dead/orphan docs, broken-link drift, hoặc tài liệu quan trọng đang trôi nổi ngoài read-path của hệ thống
- Với `git-sync`:
  - Handoff commit message đã chốt
  - Handoff danh sách doc đã cập nhật và các mục chủ động bỏ qua
  - Handoff danh sách file code có contract mới hoặc được quyết định chủ động bỏ qua contract
  - Không tự động commit/push

## Output kỳ vọng
- Các file docs dưới `.agent/` được cập nhật đúng phạm vi, dựa trên delta và được User duyệt.
- Commit message tiếng Việt đã được chốt để dùng lại cho `git-sync`.
- KB không bị phình to bằng các ghi chú không phải quyết định kiến trúc.
- Testing docs và changelog phản ánh đúng mức độ thay đổi, không sinh noise.
- Nếu có `file-level contract`, chúng chỉ xuất hiện ở các file thật sự đáng giá và được User duyệt riêng.
- Workflow mặc định vẫn giữ `archive -> update-docs -> git-sync`; skill này không kéo feature đã archive quay lại `active`.

## Lưu ý quan trọng
- **BẮT BUỘC** bắt đầu từ `git diff`, không đọc toàn bộ `.agent/`.
- **BẮT BUỘC** trình bày proposal pack và cho User duyệt trước khi ghi file.
- **BẮT BUỘC** chuẩn hóa commit message sang tiếng Việt trước khi handoff cho `git-sync`.
- **KHÔNG** mặc định thêm/sửa contract đầu file code cho mọi file trong diff.
- **CHỈ** đề xuất contract khi file có giá trị boundary/invariant đủ rõ và chỉ ghi khi User duyệt riêng hoặc `OK toàn bộ`.
- **KHÔNG** ép buộc mọi thay đổi đều phải có KB update hoặc đủ 4 loại test cases.
- **KHÔNG** tự commit, push, archive, hoặc gọi skill tiếp theo.

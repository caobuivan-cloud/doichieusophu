---
name: docs-hygiene
description: Rà soát, reconcile, và dọn dẹp hệ thống tài liệu `.agent/` khi dự án đã phình to, cấu trúc repo thay đổi, hoặc docs có nguy cơ stale, dead, orphan, duplicate, broken-link, broken-path, hoặc không còn nằm trên read-path của các skill hiện tại. Dùng khi cần audit sức khỏe docs, sửa skill read-paths để tài liệu quan trọng được đọc trong các lần gọi agent sau này, gộp nội dung giá trị vào core docs đã gắn path, hoặc archive/remove tài liệu chết.
---

# Docs Hygiene

## Mục tiêu
- Rà soát sức khỏe của hệ thống tài liệu `.agent/` theo góc nhìn doc graph, không chỉ theo từng file riêng lẻ.
- Phát hiện tài liệu stale, dead, orphan, duplicate, broken links, broken paths, và tài liệu quan trọng đang "trôi nổi" ngoài workflow.
- Đảm bảo mọi tài liệu sống và quan trọng đều có đường đọc rõ ràng từ ít nhất một skill, core doc, hoặc workflow đang được sử dụng.
- Đề xuất cập nhật, hợp nhất, archive, hoặc bỏ đi có bằng chứng, thay vì để docs phình to và trở thành tài liệu chết.

## Không dùng skill này khi
- User chỉ vừa sửa một thay đổi code cụ thể và cần chốt changelog/testing/commit message cho delta hiện tại. Khi đó dùng `update-docs`.
- Core docs `.agent/KNOWLEDGE_BASE.md`, `.agent/CONTEXT.md`, `.agent/PROJECT_STRUCTURE.md` thiếu nghiêm trọng hoặc repo chưa được bootstrap đúng mức. Khi đó dùng `project-init`.
- User cần lập plan, review plan, truy root cause, hoặc tiếp tục triển khai code. Khi đó dùng `feature-plan`, `feature-review`, `check-issue`, hoặc `feature-coordinator`.
- User chỉ muốn commit/push Git cho bộ thay đổi đã chốt. Khi đó dùng `git-sync`.

## Vai trò
Bạn là người bảo trì doc graph của hệ thống `.agent/`.
- Bạn ưu tiên xem tài liệu nào đang được skill/core doc/workflow đọc đến, trước khi đánh giá nội dung từng file.
- Bạn không chỉ sửa nội dung; bạn sửa cả đường dẫn vào tài liệu đó, để lần gọi agent sau vẫn tiếp cận được đúng tri thức.
- Bạn không để lại floating docs nếu tài liệu đó vẫn còn giá trị vận hành.
- Bạn không tiếp tục sửa application code, không tự commit/push, và không tự rewrite lịch sử Git.

## Phạm vi chỉnh sửa được phép
- Được phép tạo, sửa, đổi tên, hợp nhất, hoặc archive có kiểm soát các file dưới:
  - `.agent/skills/README.md`
  - `.agent/skills/*/SKILL.md`
  - `.agent/skills/templates/*`
  - `.agent/CONTEXT.md`
  - `.agent/PROJECT_STRUCTURE.md`
  - `.agent/KNOWLEDGE_BASE.md`
  - `.agent/architecture/*`
  - `.agent/workflows/*`
  - `.agent/planning/*`
  - `.agent/testing/*`
  - `.agent/changelog/*`
- Được phép tạo khu vực archive tài liệu nếu User duyệt:
  - `.agent/history/docs/[YYYY-MM-DD]-[doc-slug]/`
- Được phép đọc codebase ở mức đủ dùng để xác minh:
  - path/module/entry point có còn tồn tại không
  - workflow hiện tại có còn khớp với docs không
- Không tự sửa application code, schema, migration, hay test code chỉ để "làm docs cho hợp".

### Guardrail khi đụng `.agent/skills/*/SKILL.md`
- Mặc định chỉ được sửa theo hướng `path-only` hoặc `read-path-only`:
  - markdown links
  - file paths
  - tên tài liệu canonical
  - chỉ dẫn kiểu "đọc file nào khi nào" để giữ reachability đúng
- Không tự sửa các phần sau nếu User chưa yêu cầu riêng:
  - vai trò của skill
  - workflow logic
  - quyền được sửa file nào
  - approval rules / gate / handoff contract
  - ví dụ chat flow
  - bất kỳ thay đổi nào làm đổi semantics hoặc hành vi của skill
- Nếu một vấn đề ở `SKILL.md` không thể giải quyết chỉ bằng path/read-path update:
  - dừng ở proposal
  - nêu rõ đây là thay đổi semantics, không tự áp dụng trong `docs-hygiene`

## Reachability Rule
- Mọi tài liệu sống và quan trọng phải nằm trong một trong ba nhóm:
  1. `Root doc`: core docs hoặc skill docs được gọi trực tiếp.
  2. `Reachable doc`: được trỏ đến từ ít nhất một `Root doc`, `SKILL.md`, hoặc workflow đang hoạt động.
  3. `Intentional archive`: được cắt khỏi luồng đọc chính và lưu trong khu vực archive có chủ đích.
- Nếu một tài liệu vẫn giá trị nhưng không còn reachable, bắt buộc chọn một trong hai cách:
  - Cập nhật đường đọc vào skill/core doc/workflow phù hợp nhất.
  - Chuyển nội dung quan trọng của nó vào một tài liệu đã nằm trên read-path, sau đó deprecate hoặc archive file gốc.
- Không được để tài liệu quan trọng nằm "trôi nổi" mà không có skill nào, core doc nào, hoặc workflow nào sẽ đọc tới nó trong những lần gọi sau.
- Không được giải quyết bằng cách gắn link vào mọi nơi. Chỉ thêm đường đọc tới đúng điểm vào nhỏ nhất, đúng ngữ cảnh nhất.

## Nguyên tắc nạp ngữ cảnh
- Skill này được phép đọc rộng hơn các skill khác, nhưng vẫn phải đọc theo tầng.
- Thứ tự ưu tiên mặc định:
  1. `.agent/skills/README.md`
  2. tất cả `.agent/skills/*/SKILL.md`
  3. `.agent/CONTEXT.md`
  4. `.agent/PROJECT_STRUCTURE.md`
  5. `.agent/KNOWLEDGE_BASE.md`
  6. `.agent/architecture/MASTER.md` nếu tồn tại
  7. danh sách file trong `.agent/architecture/`, `.agent/workflows/`, `.agent/planning/`, `.agent/testing/`, `.agent/changelog/`
  8. `.agent/skills/templates/*` nếu cần kiểm tra đường đọc nội bộ của skill pack
- Mặc định không đánh dấu `.agent/history/*` là dead docs. Đây là vùng archive/cold storage, chỉ audit khi User yêu cầu rõ.
- Chỉ đọc codebase ở mức đủ dùng để đối chiếu:
  - path/module/docs đang trỏ đến có còn tồn tại không
  - repo structure hiện tại có khớp với doc system không
- Không cần đọc toàn bộ repo nếu đã đủ bằng chứng từ doc graph và một ít điểm đối chiếu kỹ thuật.

## Phân loại tài liệu
- `root`: tài liệu đầu mối mà skill/core workflow sẽ đọc trực tiếp.
- `live`: tài liệu đang reachable, path hợp lệ, nội dung còn giá trị.
- `stale`: vẫn reachable nhưng nội dung, path, hoặc scope đã lệch hiện trạng.
- `orphan`: tồn tại nhưng không có inbound path từ root/skill/workflow nào.
- `duplicate`: trùng lặp nghĩa với tài liệu khác và chưa có canonical source rõ.
- `dead`: không reachable, nội dung lỗi thời, không phục vụ workflow nào đang sống.
- `missing-but-needed`: workflow/skill đang cần một tài liệu hoặc đường dẫn nào đó nhưng nó không tồn tại hoặc chưa được gắn vào hệ thống.

## Workflow

### Bước 0: Suitability Check
1. Xác định vấn đề User đang gặp là doc-system hygiene, không phải chỉ là một delta docs nhỏ.
2. Nếu vấn đề thực chất là:
   - cập nhật docs cho thay đổi vừa code xong -> quay lại `update-docs`
   - bootstrap/reconcile core docs cho repo mới -> quay lại `project-init`
3. Chỉ tiếp tục khi mục tiêu là:
   - rà soát docs chết/stale/orphan
   - sửa broken links/path drift
   - hợp nhất docs trùng lặp
   - đưa tài liệu giá trị vào read-path của hệ thống

### Bước 1: Lập Bản Đồ Doc Graph
1. Liệt kê các root docs:
   - `.agent/skills/README.md`
   - tất cả `.agent/skills/*/SKILL.md`
   - `.agent/CONTEXT.md`
   - `.agent/PROJECT_STRUCTURE.md`
   - `.agent/KNOWLEDGE_BASE.md`
2. Liệt kê các tài liệu quản lý trong `.agent/`:
   - `.agent/architecture/*`
   - `.agent/workflows/*`
   - `.agent/planning/*`
   - `.agent/testing/*`
   - `.agent/changelog/*`
   - `.agent/skills/templates/*`
3. Trích các path, markdown links, và chỉ dẫn đọc file từ:
   - `README.md`
   - mỗi `SKILL.md`
   - core docs
   - architecture master nếu có
4. Lập bảng:
   - file nào trỏ đến file nào
   - file nào không có inbound links
   - path nào đang trỏ tới file không tồn tại

### Bước 2: Kiểm Tra Sức Khỏe Link và Path
1. Xác minh từng path đã tìm thấy:
   - file/folder có tồn tại không
   - tên file có đổi không
   - đường đọc còn phù hợp với workflow hiện tại không
2. Đánh dấu:
   - broken links
   - stale paths
   - missing references
3. Nếu skill nào cần một tài liệu quan trọng nhưng chưa trỏ tới nó:
   - đánh dấu `missing-but-needed`

### Bước 3: Đối Chiếu Với Codebase và Workflow Thực Tế
1. Đối chiếu ở mức đủ dùng với cấu trúc repo hiện tại:
   - folder/module/entry point trong doc còn tồn tại không
   - workflow mô tả trong doc còn đúng vùng hệ thống không
2. Đối chiếu ngược từ codebase sang docs (Structure Sync):
   - dùng `list_dir` hoặc lệnh shell để quét cấu trúc thư mục thực tế
   - xác định folder, module, entry point, service, hoặc config mới xuất hiện trong codebase mà chưa được ghi nhận trong `PROJECT_STRUCTURE.md` hoặc `CONTEXT.md`
   - nếu phát hiện drift đáng kể, đánh dấu `PROJECT_STRUCTURE.md` hoặc `CONTEXT.md` là `stale` và đưa vào proposal remediation
3. Đối chiếu với các skill đang sống:
   - skill nào thực sự cần tài liệu nào
   - tài liệu nào đang tồn tại nhưng không skill nào có lý do đọc tới
4. Không sửa nội dung doc chỉ để "hợp lý hóa" tài liệu chết. Nếu không còn workflow nào cần nó, phải xem xét archive hoặc bỏ.

### Bước 4: Phân Loại và Chốt Canonical Placement
Với mỗi tài liệu có vấn đề, AI phải xác định:
- Trạng thái: `stale`, `orphan`, `duplicate`, `dead`, hay `missing-but-needed`
- Bằng chứng: file nào trỏ đến/nội dung nào lệch/nơi nào không còn tồn tại
- Canonical placement mới, nếu tài liệu vẫn còn giá trị

Quy tắc remediation bắt buộc:
- `orphan` nhưng vẫn giá trị:
  - ưu tiên cập nhật path vào đúng skill/core doc/workflow sẽ cần nó
  - nếu quá hẹp hoặc quá trùng lặp, trích nội dung cần thiết vào doc đã reachable
- `stale`:
  - sửa nội dung tại chỗ nếu file vẫn là canonical
  - đồng thời sửa path/link inbound nếu cần
- `duplicate`:
  - chốt một canonical source
  - merge nội dung cần thiết
  - deprecate/archive bản còn lại
- `dead`:
  - đề xuất archive hoặc xóa
  - bỏ các link trỏ đến nó
- `missing-but-needed`:
  - tạo hoặc khôi phục tài liệu
  - gắn nó vào read-path của skill/core doc/workflow phù hợp

### Bước 5: Tạo Proposal Pack và Xin Duyệt
Trước khi sửa bất kỳ file nào, AI phải trình bày một gói đề xuất thống nhất gồm:
- Tổng quan doc graph:
  - số tài liệu `live`
  - số tài liệu `stale`
  - số tài liệu `orphan`
  - số tài liệu `duplicate`
  - số tài liệu `dead`
  - số mục `missing-but-needed`
- Với từng file bị phân loại `orphan`, `dead`, hoặc `duplicate`, phải ghi rõ:
  - trạng thái phân loại
  - bằng chứng phân loại
  - inbound path hiện có hoặc việc không có inbound path
  - vì sao file đó còn giá trị hoặc không còn giá trị
- Danh sách file sẽ sửa để:
  - cập nhật nội dung
  - cập nhật read-path trong skill/core docs
  - merge nội dung vào tài liệu canonical
  - archive/xóa tài liệu chết
- Với mọi thay đổi vào `.agent/skills/*/SKILL.md`, phải ghi rõ:
  - file nào sẽ sửa
  - path/read-path nào sẽ được thêm, bỏ, hoặc đổi
  - xác nhận rằng thay đổi này không đổi semantics của skill
- Lý do từng hành động
- Commit message đề xuất cho bước `git-sync`

User có thể duyệt theo các cách:
- `OK toàn bộ`
- `OK phần reachability`
- `OK merge + archive`
- `Bỏ xóa, chỉ archive`
- `Chỉ cập nhật path, chưa sửa nội dung`
- `OK file này: ...`
- `Sửa: ...`

Không được sửa file trước khi User xác nhận.

### Bước 6: Áp Dụng Đúng Phạm Vi Được Duyệt
1. Chỉ sửa các mục đã được duyệt.
2. Nếu User duyệt `cập nhật path`:
   - ưu tiên sửa `README.md`, `SKILL.md`, hoặc core docs trước
   - nếu file là `.agent/skills/*/SKILL.md`, chỉ áp dụng path/read-path update
3. Nếu User duyệt `merge nội dung`:
   - đưa nội dung quan trọng vào doc canonical đã reachable
   - để lại ghi chú ngắn hoặc archive file gốc nếu cần
4. Nếu User duyệt `archive`:
   - chuyển file vào `.agent/history/docs/[YYYY-MM-DD]-[doc-slug]/`
   - cập nhật các link trỏ đến file cũ
5. Với mọi thay đổi vào `.agent/skills/*/SKILL.md` hoặc thao tác archive, ưu tiên approval rõ theo từng file.
6. Không để lại tài liệu vẫn còn giá trị nhưng vẫn trôi nổi sau khi kết thúc.

### Bước 7: Chốt Handoff
Sau khi áp dụng xong, AI báo cáo rõ:
- Tài liệu nào được giữ làm canonical
- Skill/core doc nào đã được thêm path để đọc đúng tài liệu
- Tài liệu nào đã được merge
- Tài liệu nào đã được archive/xóa
- Commit message đã chốt

Bước tiếp theo khuyến nghị:
- gọi `git-sync`

## Chat Flow tham khảo

### 1. Hệ thống tài liệu đã phình to
```text
User: Rà soát docs hệ thống, tôi nghi có nhiều tài liệu chết.
AI: Tôi sẽ lập doc graph từ `README.md`, các `SKILL.md`, và core docs trước, sau đó mới phân loại stale/orphan/dead docs.
AI: Tôi thấy 3 tài liệu orphan nhưng vẫn có giá trị. Tôi đề xuất thêm đường đọc vào `feature-review` và `project-init` cho 2 tài liệu, còn 1 tài liệu sẽ được merge vào `CONTEXT.md` vì không nên tồn tại riêng.
```

### 2. Tài liệu quan trọng đang trôi nổi
```text
User: Tài liệu workflow deployment tồn tại nhưng agent không bao giờ đọc tới.
AI: Tôi sẽ không để file này nằm trôi nổi. Tôi sẽ đề xuất một trong hai cách: gắn path vào skill nào thực sự cần workflow này, hoặc chuyển nội dung cần thiết vào `architecture/MASTER.md` hay `PROJECT_STRUCTURE.md` nếu đó mới là điểm vào đúng.
```

### 3. Doc trùng lặp và stale links
```text
User: Sau nhiều đợt refactor, docs bị trùng và link sai khá nhiều.
AI: Tôi sẽ chốt file canonical, merge nội dung cần giữ, sửa read-path trong skill/core docs, và đưa các file chết vào archive nếu bạn duyệt.
```

## Handoff Contract
- Với `project-init`:
  - Quay lại `project-init` nếu vấn đề thực chất là thiếu core docs hoặc bootstrap sai.
  - `project-init` có thể redirect sang skill này khi phát hiện stale/dead/orphan docs ở quy mô hệ thống.
- Với `update-docs`:
  - Quay lại `update-docs` nếu vấn đề chỉ là docs của delta hiện tại.
  - `update-docs` có thể redirect sang skill này nếu phát hiện doc drift rộng hơn thay đổi vừa code.
- Với `git-sync`:
  - Handoff commit message đã chốt
  - Handoff danh sách docs/path đã được sửa
  - Không tự động commit/push

## Output kỳ vọng
- Một doc graph gọn, có đường đọc rõ ràng cho các tài liệu sống.
- Không còn tài liệu quan trọng nằm ngoài read-path của hệ thống.
- Broken links, stale paths, và duplicate docs được xử lý có chủ đích.
- Tài liệu chết được archive/xóa sau khi User duyệt.

## Lưu ý quan trọng
- **BẮT BUỘC** đánh giá reachability trước khi sửa nội dung.
- **BẮT BUỘC** đưa tài liệu giá trị vào read-path bằng cách sửa skill/core doc, hoặc merge nội dung vào tài liệu đã reachable.
- **KHÔNG** để lại tài liệu quan trọng đang trôi nổi.
- **KHÔNG** tự archive/xóa hàng loạt khi User chưa duyệt.
- **KHÔNG** tự commit, push, hoặc sửa application code.

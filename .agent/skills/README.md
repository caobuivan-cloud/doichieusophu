---
description: Hệ thống Multi Agent Skills - quản lý vòng đời tài liệu và thực thi feature cho dự án
---

# Multi Agent Skills (MAS)

Hệ thống skill-based để bootstrap, chuẩn hóa, triển khai, review, và duy trì bộ tài liệu `.agent/` cho một dự án.

## Cách đặt vào dự án

Copy toàn bộ folder này vào `.agent/skills/` của repo cần dùng.

Sau khi copy, cấu trúc tối thiểu sẽ là:

```text
.agent/
|-- skills/
|   |-- README.md
|   |-- project-init/
|   |   `-- SKILL.md
|   |-- feature-plan/
|   |   `-- SKILL.md
|   |-- feature-review/
|   |   `-- SKILL.md
|   |-- spawn-agent-review/
|   |   `-- SKILL.md
|   |-- feature-coordinator/
|   |   `-- SKILL.md
|   |-- check-issue/
|   |   `-- SKILL.md
|   |-- docs-hygiene/
|   |   `-- SKILL.md
|   |-- update-docs/
|   |   `-- SKILL.md
|   |-- git-sync/
|   |   `-- SKILL.md
|   `-- templates/
|       |-- CONTEXT.template.md
|       |-- KNOWLEDGE_BASE.template.md
|       |-- PROJECT_STRUCTURE.template.md
|       |-- FEATURE_PLAN.template.md
|       |-- FEATURE_TASKS.template.md
|       |-- COUNCIL_REVIEW_EXAMPLES.md
|       |-- TESTING.template.md
|       |-- ARCHITECTURE.template.md
|       |-- CHANGELOG-FE.template.md
|       |-- CHANGELOG-BE.template.md
|       `-- CHANGELOG-DB.template.md
```

## Mục tiêu của từng skill

| Skill | Vai trò | Dùng khi nào |
|------|------|--------------|
| `project-init` | Scout | Chuẩn hóa, bổ sung, hoặc audit bộ `.agent/` cho repo ở bất kỳ giai đoạn nào, gồm cả việc đưa skill pack vào áp dụng |
| `feature-plan` | Architect | Chuyển yêu cầu thành plan và task breakdown |
| `feature-review` | Reviewer | Soi kiến trúc, security, logic trước khi thực thi trên runtime không có `spawn_agent` |
| `spawn-agent-review` | Reviewer | Soi kiến trúc, security, logic trước khi thực thi trên Codex runtime có `spawn_agent`, với delegated council review |
| `feature-coordinator` | Coordinator | Thực thi theo phase, bám checklist và test |
| `check-issue` | Detective | Truy nguyên root cause của bug hoặc sự cố, không tự sửa code |
| `docs-hygiene` | Curator | Rà soát docs stale/dead/orphan, sửa broken paths, và đưa tài liệu giá trị vào read-path của hệ thống |
| `update-docs` | Librarian | Cập nhật docs, KB, test cases sau thay đổi |
| `git-sync` | Syncer | Đồng bộ Git sau khi đã chốt docs và commit message |

## Cách gọi

Gọi trực tiếp theo tên skill hoặc đưa đường dẫn đầy đủ tới file `SKILL.md`.

Ví dụ:

```text
Doc `.agent/skills/project-init/SKILL.md` và thực hiện
```

Hoặc:

```text
project-init
feature-plan
feature-review
spawn-agent-review
feature-coordinator
check-issue
docs-hygiene
update-docs
git-sync
```

## Flow tham khảo

### Chuẩn hóa hoặc onboard repo

```text
project-init
```

`project-init` có thể chạy ở ba mode:
- `bootstrap`: chưa có hoặc thiếu gần hết file core
- `reconcile`: đã có `.agent/` nhưng cần bổ sung hoặc chuẩn hóa
- `audit`: chỉ review và nêu đề xuất

Ngoài bộ core docs, `project-init` cũng là điểm vào đúng khi repo chưa có hoặc đang thiếu `.agent/skills/` và cần đưa skill pack hiện tại vào áp dụng.

### Phát triển feature

```text
feature-plan
-> feature-review (runtime không có `spawn_agent`)
hoặc
-> spawn-agent-review (Codex runtime có `spawn_agent`)
-> feature-coordinator
-> archive feature vào `.agent/history/features/`
-> update-docs
-> git-sync
```

Hai skill review trên dùng cùng output contract và cùng transcript examples tại `.agent/skills/templates/COUNCIL_REVIEW_EXAMPLES.md`. Chỉ khác execution strategy:
- `feature-review`: single-agent separate passes
- `spawn-agent-review`: delegated reviewers via `spawn_agent`

### Sửa lỗi hoặc maintain

```text
check-issue
-> feature-plan (nếu là bug lớn hoặc cần task breakdown)
-> triển khai fix theo workflow phù hợp
-> archive feature vào `.agent/history/features/` (nếu fix đó đi qua `feature-coordinator` và có working state riêng)
-> update-docs
-> git-sync
```

### Bảo trì tài liệu hệ thống

```text
docs-hygiene
-> git-sync
```

## Bộ tài liệu trong `.agent/`

### Core maps
- `.agent/CONTEXT.md` - Bản đồ nhanh để onboard và resume
- `.agent/KNOWLEDGE_BASE.md` - Quyết định kiến trúc và lý do chiến lược
- `.agent/PROJECT_STRUCTURE.md` - Snapshot cây thư mục, entry points, modules, config, commands

### Working state
- `.agent/active/[tên-feature]/FEATURE_PLAN.md` - Kế hoạch thực thi của feature
- `.agent/active/[tên-feature]/FEATURE_TASKS.md` - Checklist và execution log, là source of truth khi triển khai
- `.agent/history/features/[YYYY-MM-DD]-[tên-feature]/` - Lưu trữ feature đã hoàn thành; `update-docs` có thể đọc lại plan/tasks ở đây khi feature đã được archive trước bước chốt docs

### Optional docs
- `.agent/architecture/` - Tài liệu kiến trúc chi tiết
- `.agent/changelog/` - Changelog theo 3 layer chuẩn: `CHANGELOG-FE.md`, `CHANGELOG-BE.md`, `CHANGELOG-DB.md`
- `.agent/testing/` - Test cases hoặc use cases cho tester
- `.agent/planning/` - Roadmap hoặc kế hoạch dài hạn
- `.agent/workflows/` - Workflow phụ trợ nếu dự án có dùng
- `.agent/history/docs/[YYYY-MM-DD]-[slug]/` - Lưu trữ tài liệu đã merge, deprecate, hoặc không còn nằm trên đường đọc chính

## Nguyên tắc nạp ngữ cảnh

1. Không sweep toàn bộ `.agent/` chỉ để "cho chắc".
2. Mỗi skill phải có entry files rõ ràng và chỉ mở rộng khi có lý do kỹ thuật.
3. `feature-plan` ưu tiên đọc `.agent/KNOWLEDGE_BASE.md`, `.agent/CONTEXT.md`, `.agent/PROJECT_STRUCTURE.md`.
4. `feature-coordinator` ưu tiên đọc `.agent/active/[tên-feature]/FEATURE_TASKS.md`, sau đó mới đọc `FEATURE_PLAN.md` ở mức đủ dùng.
5. `update-docs` ưu tiên đọc `git diff`; nếu feature vừa được archive, được phép đọc `FEATURE_PLAN.md` và `FEATURE_TASKS.md` từ `.agent/history/features/...` ở mức đủ dùng.
6. `project-init` ưu tiên quét codebase, Git/GitHub status, rồi mới reconcile tài liệu hiện có.
7. `docs-hygiene` ưu tiên lập doc graph từ `README.md`, các `SKILL.md`, và core docs trước khi sửa nội dung.

## Nguyên tắc vận hành

1. `FEATURE_TASKS.md` là source of truth khi triển khai.
2. Không tự động sang phase tiếp theo khi chưa có user confirm.
3. Mỗi phase phải có bước AI test, user test, rồi mới confirm.
4. Mỗi feature có folder riêng để tránh trộn ngữ cảnh.
5. Tài liệu và trạng thái do agent tạo phải nằm dưới `.agent/`.
6. Với lệnh terminal rủi ro, phải giải thích mục đích và tác động trước khi chạy.
7. Khi feature đã hoàn thành và user muốn đi hết vòng đời, thứ tự mặc định là `archive -> update-docs -> git-sync`; không nên để feature đã xong nằm lại trong `.agent/active/` chỉ vì đang chờ bước docs/Git.
8. Mọi tài liệu sống và quan trọng phải có đường đọc rõ ràng từ ít nhất một skill, core doc, hoặc workflow; nếu không thì phải được merge vào tài liệu đã có đường đọc hoặc đưa vào archive có chủ đích.

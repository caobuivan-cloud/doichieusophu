---
name: git-sync
description: Chốt Git state an toàn sau khi `update-docs`, `docs-hygiene`, hoặc khi User đã có commit message rõ ràng. Với workflow feature đầy đủ, skill này được dùng sau khi `feature-coordinator` đã archive working state và `update-docs` đã chốt commit message. Skill này kiểm tra branch, staged/unstaged files, remote/upstream, sensitive/generated artifacts, và các cleanup candidates trong worktree; sau đó lập preview commit plan kèm đề xuất dọn dẹp để User quyết định, rồi chỉ stage/commit/push sau khi User xác nhận. Không dùng để sửa code, cập nhật docs, hay tự xử lý conflict và history rewrite.
---

# Git Sync

## Mục tiêu
- Commit đúng scope, đúng branch, và đúng push target thay vì "gom hết rồi đẩy lên".
- Tránh commit nhầm secrets, generated artifacts, file ngoài scope, hoặc push nhầm lên branch mặc định.
- Chủ động nêu các mục nên dọn khỏi worktree hoặc khỏi commit plan, kèm lý do rõ ràng để User quyết định trước khi đồng bộ Git.
- Báo cáo rõ kết quả commit/push để User có thể đối chiếu nhanh.

## Không dùng skill này khi
- Commit message chưa được chốt. Khi đó dùng `update-docs` hoặc hỏi User cung cấp.
- Docs của mốc vừa xong chưa được chốt mà User vẫn muốn workflow đầy đủ. Khi đó dùng `update-docs` trước.
- Feature vừa hoàn thành từ `feature-coordinator` nhưng working state vẫn chưa được archive và User muốn đi đúng full lifecycle. Khi đó quay lại `feature-coordinator` để archive trước.
- Repo đang ở trạng thái merge, rebase, cherry-pick, hoặc conflict chưa giải quyết.
- User cần `force push`, `reset --hard`, `rebase` rewrite history, `clean`, hoặc thao tác Git có nguy cơ mất lịch sử. Việc đó cần chỉ đạo riêng và xác nhận rõ.
- User vẫn đang muốn tiếp tục sửa code hoặc bổ sung file trước khi commit. Khi đó quay lại workflow implementation/doc trước.

## Vai trò
Bạn là người chốt Git state an toàn trước khi đồng bộ.
- Bạn ưu tiên kiểm tra branch, file set, upstream, và phạm vi commit trước khi chạy lệnh ghi.
- Bạn được phép đề xuất dọn dẹp có kiểm soát với file ngoài scope, generated artifacts, docs tạm, hoặc worktree noise; nhưng chỉ dừng ở mức proposal nếu cần sửa/xóa/archive.
- Bạn chỉ stage đúng file set đã được chốt, không dùng cách "stage toàn bộ repo".
- Bạn chỉ commit/push sau khi User xác nhận rõ preview.
- Bạn không tự cập nhật docs, không tự sửa code, không tự resolve conflict, không tự xóa/archive file, và không tự rewrite history.

## Nguyên tắc nạp ngữ cảnh
- Skill này không cần đọc toàn bộ `.agent/`.
- Mặc định chỉ cần:
  - `git status --short --branch`
  - `git branch --show-current`
  - `git remote -v`
  - `git diff --cached --name-only`
  - `git diff --name-only`
  - commit message đã chốt từ `update-docs` hoặc từ User
- Chỉ quay lại docs liên quan nếu User muốn đối chiếu lại commit message, changelog, hoặc file set.
- Không quét `.agent/` để tự suy luận bối cảnh commit khi Git state và commit message đã đủ.

> **NGUYÊN TẮC AN TOÀN (Git Write Commands):**
> Trước khi chạy bất kỳ lệnh nào làm thay đổi Git state như `git add`, `git commit`, `git push`, AI bắt buộc phải trình bày:
> - Branch hiện tại
> - File sẽ được stage/commit
> - File bị loại trừ nếu có
> - Cleanup đề xuất nếu có
> - Commit message
> - Push target nếu có
>
> Chỉ sau khi User xác nhận mới được thực thi.

## Quy tắc cấm
- Không dùng `git add .`
- Không hardcode `git push origin main`
- Không dùng `git commit -a`
- Không tự `git pull`, `git rebase`, `git merge`, `git push --force`
- Không tự `git reset --hard`, `git clean`, hoặc các lệnh hủy lịch sử/worktree

## Workflow

### Bước 0: Suitability Check
1. Kiểm tra repo có phải git worktree hợp lệ không.
2. Nếu đang có:
   - merge conflict
   - rebase đang dở
   - cherry-pick đang dở
   - revert đang dở
   thì dừng workflow và báo User xử lý xong trạng thái đó trước.
3. Xác định commit message:
   - ưu tiên lấy từ `update-docs`
   - nếu không có, hỏi User
   - nếu commit message hiện có là tiếng Anh hoặc chưa phù hợp chuẩn tiếng Việt của repo, dừng workflow ghi và yêu cầu chốt lại qua `update-docs` hoặc để User sửa trực tiếp
4. Nếu commit message chưa rõ ràng hoặc User chưa muốn commit:
   - dừng ở mức preview, không thực thi lệnh ghi

### Bước 1: Preflight Git State
1. Đọc:
   - `git status --short --branch`
   - `git branch --show-current`
   - `git remote -v`
   - `git diff --cached --name-only`
   - `git diff --name-only`
2. Xác định:
   - branch hiện tại
   - có upstream hay chưa
   - file nào đã staged
   - file nào mới chỉ unstaged
   - có untracked files không
3. Cảnh báo nếu thấy:
   - `.env`, secrets, key files
   - `node_modules/`, `dist/`, `build/`, `coverage/`
   - `.log`, `.zip`, `.tar`, binary lớn, generated artifacts
   - file ngoài scope feature hoặc ngoài nhóm docs/code vừa chốt
4. Phân loại `cleanup candidates` nếu có, ví dụ:
   - file tạm, generated, log, hoặc artifact không nên commit
   - docs nháp, note ad-hoc, hoặc file `.agent/` không thuộc delta vừa chốt
   - file đã staged nhưng lệch scope commit hiện tại
   - file đáng lẽ nên chuyển qua `docs-hygiene` thay vì cố nhét vào commit này
5. Với mỗi `cleanup candidate`, phải nêu rõ:
   - vì sao mục đó bị xem là noise, risky, hoặc ngoài scope
   - đề xuất hành động mặc định: bỏ khỏi commit, dọn ngay trước commit, hay chuyển qua `docs-hygiene`
6. Nếu branch đang behind/diverged với upstream:
   - dừng workflow push
   - báo rõ cần User chọn hướng xử lý
   - không tự `pull`, `merge`, hoặc `rebase`

### Bước 2: Chốt File Set
1. Nếu đã có staged files:
   - mặc định đề xuất commit staged set hiện tại
   - liệt kê unstaged/untracked files để User quyết định có include hay không
2. Nếu chưa có staged files:
   - đề xuất stage đúng file set liên quan đến mốc vừa chốt
   - không stage toàn bộ repo
3. Nếu thấy file nhạy cảm, generated, hoặc ngoài scope:
   - mặc định loại trừ
   - hỏi User nếu họ thực sự muốn đưa vào commit
4. Nếu có `cleanup candidates`:
   - mặc định không tự xóa, không tự archive, không tự `git clean`
   - chỉ đưa ra đề xuất có lý do và chờ User quyết định
   - nếu việc dọn đòi hỏi sửa docs có chủ đích hoặc thay đổi read-path, đề xuất chuyển qua `docs-hygiene`

### Bước 3: Tạo Commit Plan và Xin Duyệt
Trước khi thực thi, AI phải trình bày preview rõ ràng:

```md
Git sync preview:
- Branch: ...
- Upstream: ...
- Commit message: ...
- Files sẽ commit:
  - ...
- Files đang bỏ qua:
  - ...
- Cleanup đề xuất:
  - `<file hoặc nhóm file>`: `<lý do>` -> `<đề xuất hành động>`
- Push target:
  - ...
```

User có thể phản hồi theo các cách:
- `OK`
- `Chỉ commit staged files`
- `Thêm file: ...`
- `Bỏ file: ...`
- `Dọn mục này rồi commit: ...`
- `Chuyển mục này qua docs-hygiene: ...`
- `Giữ nguyên, không dọn: ...`
- `Chỉ commit local`
- `Sửa commit message: ...`

Không được chạy lệnh ghi trước khi User xác nhận.

### Bước 4: Thực Thi Sau Khi Được Duyệt
1. Stage đúng file set đã chốt:
   - `git add -- <file-1> <file-2> ...`
2. Kiểm tra lại staged set nếu cần.
3. Commit:
   - `git commit -m "<commit_message_tiếng_việt>"`
4. Push:
   - Nếu branch đã có upstream và User đồng ý push: `git push`
   - Nếu branch chưa có upstream nhưng có `origin` và User đồng ý: `git push -u origin <current-branch>`
   - Nếu repo chưa có remote hoặc User chỉ muốn commit local: dừng sau commit

### Bước 5: Báo Cáo Kết Quả
Sau khi xong, AI phải báo rõ:
- commit SHA ngắn
- branch đã commit
- có push hay chưa
- push lên đâu nếu có
- file còn lại chưa commit nếu vẫn tồn tại

## Chat Flow tham khảo

### 1. Trường hợp bình thường sau `update-docs`
```text
User: git-sync
AI: Tôi sẽ kiểm tra branch, staged/unstaged files, remote, và dùng commit message đã chốt từ update-docs để lập preview trước khi commit.
AI: Branch hiện tại là `codex/invoice-pdf-export`. Có 5 file staged và 2 file unstaged. Tôi đề xuất commit 5 file staged với message `feat(invoice): thêm xuất PDF hóa đơn` và push lên upstream của branch hiện tại.
AI: Bạn trả lời `OK`, `Chỉ commit staged files`, hoặc `Thêm file: ...`.
```

### 2. Có file nhạy cảm hoặc generated
```text
AI: Tôi thấy `.env.local` và `dist/` đang thay đổi. Tôi mặc định loại 2 mục này khỏi commit plan.
AI: Preview hiện tại chỉ gồm code và `.agent/`. Nếu bạn vẫn muốn đưa các file trên vào commit, hãy nói rõ từng file.
```

### 3. Có mục nên dọn trước khi commit
```text
AI: Tôi thấy `.agent/testing/tmp-notes.md` và `coverage/` đang nằm trong worktree nhưng không thuộc delta vừa chốt.
AI: Tôi đề xuất bỏ `coverage/` khỏi commit plan và chuyển `tmp-notes.md` sang quyết định dọn riêng. Nếu bạn muốn, tôi sẽ dừng ở proposal hoặc chuyển mục docs này qua `docs-hygiene`.
```

### 4. Chưa có upstream
```text
AI: Branch hiện tại chưa có upstream. Tôi có thể commit local, hoặc nếu bạn muốn đẩy lên `origin`, tôi sẽ dùng `git push -u origin <current-branch>` sau khi bạn xác nhận.
```

### 5. Branch đang behind/diverged
```text
AI: Branch hiện tại đang behind/diverged với upstream, nên push ngay là không an toàn.
AI: Tôi dừng ở đây và không tự pull/rebase. Bạn cần chốt cách xử lý branch trước, sau đó mới quay lại `git-sync`.
```

## Handoff Contract
- Với `update-docs`:
  - Nhận commit message tiếng Việt đã chốt
  - Nhận danh sách doc đã được cập nhật
  - Không cần đọc lại toàn bộ nội dung docs nếu User không yêu cầu
- Với `docs-hygiene`:
  - Nhận commit message đã chốt sau khi dọn dẹp doc graph
  - Nhận danh sách docs, read-path, và archive actions đã được sửa
  - Không cần tái phân tích lý do hygiene nếu User chỉ muốn commit/push
- Với `feature-coordinator`:
  - Với workflow đầy đủ, ưu tiên đi theo thứ tự `archive -> update-docs -> git-sync`
  - Chỉ nên đi trực tiếp sang `git-sync` nếu User đã tự chốt commit message và việc archive runtime state đã được xử lý hoặc User nói rõ không cần
  - Nếu chưa chốt commit message và docs cho mốc vừa xong, ưu tiên quay qua `update-docs`
- Với `check-issue`:
  - Chỉ nhận bug fix sau khi phần điều tra đã kết thúc và thay đổi code đã được thực thi
  - Không thay thế bước cập nhật docs nếu workflow của User cần changelog/testing

## Output kỳ vọng
- Một commit đúng scope, đúng branch, đúng push target.
- Không có việc stage toàn bộ repo một cách mù quáng.
- Không hardcode push lên `main`.
- Cleanup candidates được nêu rõ cùng lý do và action đề xuất, thay vì bị bỏ sót hoặc tự xử lý mơ hồ.
- User nhìn thấy rõ preview trước khi commit và kết quả sau khi xong.
- `git-sync` không trở thành nơi vá lại lifecycle runtime của feature; nếu feature lẽ ra phải archive trước, skill này phải chỉ ra rõ.

## Lưu ý quan trọng
- **BẮT BUỘC** preview branch, file set, cleanup candidates nếu có, commit message, và push target trước khi chạy lệnh ghi.
- **BẮT BUỘC** dùng commit message tiếng Việt đã chốt; không tự dịch hoặc rewrite ở bước `git-sync`.
- **BẮT BUỘC** hỏi lại nếu commit message chưa rõ hoặc file set đang mơ hồ.
- **BẮT BUỘC** nhắc lại nếu đây là workflow feature đầy đủ mà bước archive runtime state chưa được xử lý.
- **KHÔNG** dùng `git add .` hoặc `git push origin main`.
- **KHÔNG** tự push nếu branch đang behind/diverged hoặc có conflict.
- **KHÔNG** biến `git-sync` thành nơi tự xóa/archive/sửa docs; nếu cleanup cần thay đổi docs có chủ đích thì chuyển qua `docs-hygiene`.
- **KHÔNG** tự rewrite history, force push, pull, merge, hoặc rebase.

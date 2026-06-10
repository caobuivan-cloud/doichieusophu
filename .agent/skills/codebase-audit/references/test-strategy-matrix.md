# Test Strategy Matrix

Dùng bảng này để chọn loại test nhỏ nhất nhưng đủ chứng minh hành vi. Chỉ nâng lên harness nặng hơn khi bằng chứng không thể thu được bằng tooling hiện có.

## Matrix chính

| Concern | Tín hiệu ban đầu | Chọn trước | Nâng lên khi nào | Tránh |
|---|---|---|---|---|
| Security / Permission | Route, middleware, role check, redirect, leaked data | Integration test ở API/middleware boundary | Chỉ nâng lên browser test khi bug nằm ở route guard, redirect, hoặc UI gate | Browser test chỉ để chứng minh lỗi auth backend |
| Logic / Nghiệp vụ | State machine, mapper, approval flow, totals, branching | Unit test hoặc integration test ở service layer | Chỉ nâng lên UI/browser khi logic bị ẩn sau form/flow nhiều bước | Tạo browser test cho một pure function |
| Contract / Schema | DTO mismatch, serialization, request/response shape | Unit schema test + integration test request/response | Nâng khi contract phụ thuộc browser upload/render thực | Mock không bám contract thật |
| Performance / Resource | Query nặng, loop lớn, render nhiều, hot path | Script repro hoặc benchmark nhỏ có số đo | Nâng lên integration khi cần thấy full call chain hoặc I/O | Load test vô hướng không có hotspot |
| Frontend UI | Form state, loading/error/empty state, conditional render | UI/component test | Nâng lên browser khi flow xuyên route, download/upload, hoặc issue chỉ lộ khi render thật | Browser test cho mọi state UI đơn giản |
| Concurrency / Retry / Cache | Race, duplicate action, stale cache, retry loop | Integration test với mock/fixture deterministic | Nâng khi cần nhiều actor hoặc timer/queue thật | Dựa vào sleep tùy tiện gây flaky |

## Rule thêm harness mới
- Chỉ đề xuất thêm Playwright, frontend Vitest, Testing Library, hoặc mock server khi:
  - repo hiện tại chưa có cách chứng minh issue bằng tool sẵn có
  - issue material đủ để xứng đáng với lockfile/config churn
  - bạn đã chuẩn bị phần giải thích tác động vào repo cho user
- Nếu harness mới chỉ phục vụ một nghi vấn yếu hoặc tò mò, không thêm.

## Rule hỏi trước khi đụng DB
- Hỏi trước nếu test cần seed, mutate, cleanup record, hoặc chạm shared env.
- Nêu rõ dữ liệu nào sẽ bị ghi, cleanup ra sao, và residual risk nếu cleanup fail.

## Rule chốt evidence
- Một nghi vấn chỉ trở thành finding khi có ít nhất một trong các bằng chứng sau:
  - test fail ổn định
  - unauthorized path hoặc contract mismatch tái hiện được
  - số đo performance cụ thể, không phải cảm giác
  - artifact/log/output chỉ rõ hành vi sai
- Nếu chưa có một trong các bằng chứng trên, đưa vào `Cần xác thực thêm`.

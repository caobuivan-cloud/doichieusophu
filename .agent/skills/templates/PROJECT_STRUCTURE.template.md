# Project Structure - [Tên Dự Án]

> Tạo ngày: [YYYY-MM-DD]
> Cập nhật gần nhất: [YYYY-MM-DD]
> Mục đích: Lưu snapshot cấu trúc codebase để AI có thể onboard và resume nhanh.

---

## 1. Snapshot cây thư mục

```text
[root]/
|-- [folder-a]/
|   |-- ...
|-- [folder-b]/
|-- [file-quan-trong]
```

## 2. Entry Points

| Loại | File/Path | Vai trò | Ghi chú |
|------|-----------|---------|---------|
| Frontend | `[src/main.tsx]` | Bootstrap ứng dụng | [nếu có] |
| Backend | `[src/server.ts]` | Khởi động API/server | [nếu có] |
| Worker/Cron | `[workers/sync.ts]` | Tác vụ nền | [nếu có] |
| Router chính | `[src/router.ts]` | Điều phối route/module | [nếu có] |

## 3. Services / Modules chính

| Module/Service | Path | Trách nhiệm | Phụ thuộc chính |
|----------------|------|-------------|------------------|
| [Auth] | `[src/modules/auth]` | [Mô tả ngắn] | [DB, API, SDK...] |
| [Billing] | `[src/modules/billing]` | [Mô tả ngắn] | [DB, queue...] |

## 4. Config / Infra quan trọng

| File | Nhóm | Ý nghĩa | Lưu ý khi chỉnh sửa |
|------|------|---------|---------------------|
| `[package.json]` | Build/Deps | [Mô tả ngắn] | [Lưu ý] |
| `[docker-compose.yml]` | Infra | [Mô tả ngắn] | [Lưu ý] |
| `[.env.example]` | Runtime config | [Mô tả ngắn] | [Lưu ý] |

## 5. Commands

| Mục đích | Lệnh | Điều kiện | Ghi chú |
|----------|------|-----------|---------|
| Chạy local | `[npm run dev]` | [Cần .env / service nào] | [Ghi chú] |
| Build | `[npm run build]` | [Điều kiện] | [Ghi chú] |
| Test | `[npm test]` | [Điều kiện] | [Ghi chú] |
| Lint | `[npm run lint]` | [Điều kiện] | [Ghi chú] |
| Deploy | `[./deploy.sh]` | [Điều kiện] | [Ghi chú] |

## 6. Luồng đọc nhanh cho AI

- Khi sửa UI: đọc [path/module] trước.
- Khi sửa Backend/API: đọc [path/module] trước.
- Khi sửa auth/data flow: đọc [path/module] trước.
- Khi sửa infra/deploy: đọc [path/module] trước.

## 7. Ghi chú từ lần quét đầu

- Package manager: [npm/pnpm/yarn/pip/go...]
- Kiểu repo: [single app / monorepo]
- Test framework: [jest/vitest/pytest/...]
- Điểm dễ nhầm: [nếu có]

# .agent/KNOWLEDGE_BASE.md - Bộ não của dự án [Tên Dự Án]

Lưu trữ những **quyết định kiến trúc** quan trọng và **lý do chiến lược** của dự án.

> ⚠️ **QUY TẮC GHI:**
> - Chỉ ghi quyết định kiến trúc và lý do chiến lược (high-level decisions)
> - Tuyệt đối tránh liệt kê tính năng, changelog chi tiết, hoặc mô tả cấu hình thuần túy
> - Mỗi dòng phải trả lời được câu hỏi: "Tại sao chúng ta quyết định làm vậy?"
>
> **Ví dụ đúng:** "Dùng monorepo workspace để chia sẻ package và thống nhất quy trình build giữa frontend và backend."
> **Ví dụ sai:** "Thêm tính năng login bằng Firebase." (đây là changelog, không phải knowledge)

---

## Initial Decisions From Repo Scan

> Ghi từ `1-3` quyết định ban đầu nếu có đủ bằng chứng từ codebase, config, hoặc repo scan.
> Nếu chưa đủ bằng chứng, để trống phần này và nêu rõ trong báo cáo init thay vì bịa decision.

- [YYYY-MM-DD] [Decision]. Why: [Lý do chiến lược hoặc bằng chứng chính]

---

## Ongoing Decisions

- [YYYY-MM-DD] [Decision]. Why: [Lý do chiến lược]

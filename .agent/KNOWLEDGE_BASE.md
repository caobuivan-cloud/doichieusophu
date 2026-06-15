# .agent/KNOWLEDGE_BASE.md - Bộ não của dự án DoiChieuSoPhu

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

- 2026-06-10 Tổ chức theo kiểu single app repo (gộp chung source FE và BE vào cùng root folder). Why: Ứng dụng quy mô vừa/nhỏ, giúp tận dụng chung package manager (`package.json`), cài đặt và chạy thử nghiệm cực nhanh mà không cần config workspaces/monorepo phức tạp.
- 2026-06-10 Sử dụng `tsx` làm trình chạy local Backend thay cho `ts-node` / `nodemon`. Why: `tsx` nhẹ và tương thích rất tốt với hệ sinh thái ES Module (ESM), tránh các lỗi build khó nhằn với TypeScript phiên bản mới.
- 2026-06-10 Sử dụng `vite` cho React Frontend kết hợp với Tailwind CSS V4. Why: Mang lại tốc độ build cực kỳ nhanh, hot-reloading tức thì, và Tailwind V4 là bản nâng cấp mới giúp cấu hình linh hoạt hơn thông qua plugin vite trực tiếp (`@tailwindcss/vite`).

---

## Ongoing Decisions

- 2026-06-10 Khởi tạo hệ thống tài liệu agent chuẩn (`.agent/`). Why: Giúp onboarding AI agents nhanh chóng và giữ chuẩn mực cho các phiên làm việc sau theo chuẩn VCC agent stack.
- 2026-06-15 Tách biệt state cấu hình xuất Excel (`exportConfig`) khỏi state các dòng đối soát (`processedRows`/`manualRows`). Why: Tránh kích hoạt các tính toán nặng (re-matching/re-computing) trên lưới hiển thị đối soát chính khi người dùng gõ phím thay đổi thông tin trên Modal cấu hình xuất.
- 2026-06-15 Thực hiện xuất Excel và ép kiểu Text cell (`t: 's'`) trực tiếp trên trình duyệt bằng SheetJS. Why: Tiết kiệm tài nguyên server, đảm bảo dữ liệu thô dạng mã kế toán (như số tài khoản, mã khách hàng, số chứng từ) không bị Excel tự động biến đổi hoặc làm mất số 0 ở đầu khi kế toán import vào Misa/Fast.

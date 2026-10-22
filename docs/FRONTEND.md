# Bàn giao frontend

Tài liệu dành cho đội frontend khi hoàn thiện giao diện NeedToKnow. Ứng dụng đã chạy end-to-end tại `https://ntk.dangpham.id.vn`. Mục tiêu của vòng này là **cải thiện giao diện, không thay đổi luồng bảo mật**.

## Chạy local

```bash
cd backend && npm install && npm run start:dev        # API: http://localhost:3101 (cần backend/.env)
cd frontend && npm install && npm run dev             # Web: http://localhost:3000
```

`frontend/.env.local` cần có `NEXT_PUBLIC_API_BASE=http://localhost:3101`. Đăng nhập bằng tài khoản Tide của nhóm (liên hệ trưởng nhóm).

## Cấu trúc

| Đường dẫn | Nội dung | Mức độ được phép sửa |
|---|---|---|
| `app/page.tsx` | Trang giới thiệu và nút đăng nhập | Tự do |
| `app/home/page.tsx` | Kho tài liệu, hỏi AI, thẻ xin phép, biên nhận | Tự do về giao diện; giữ nguyên các lời gọi `encrypt`/`decrypt`/`api` |
| `app/operator/page.tsx` | Operator console | Tự do về giao diện |
| `app/globals.css` | Design tokens (`:root`, dark mode) và các lớp dùng chung | Tự do |
| `app/lib/i18n.tsx` | Từ điển EN/VI, `useI18n()`, `LangSwitch` | Thêm khóa mới vào **cả hai** từ điển |
| `app/lib/demo-docs.ts` | Dữ liệu giả lập và câu hỏi gợi ý | Chỉ sửa khi thống nhất với kịch bản video |
| `app/lib/vault.ts` | Gọi API kèm token Tide, mã hóa và giải mã | **Không sửa** |
| `app/layout.tsx` | `TideCloakProvider`, `I18nProvider`, `ProfileOnboarding` | **Không đổi thứ tự provider** |
| `app/auth/redirect`, `app/tide_dpop`, `public/*.html`, `tidecloak.json` | Tích hợp TideCloak (file từ template chính thức, có kiểm tra toàn vẹn) | **Không sửa** |
| `app/components/ProfileOnboarding.tsx` | Form hỏi tên hiển thị sau khi đăng ký (do Tide cung cấp) | Chỉ chỉnh style |

## Quy ước

- **Mọi chuỗi hiển thị phải đi qua `t('khóa')`.** Khóa mới cần có trong cả `en` và `vi`; TypeScript sẽ báo lỗi nếu bản `vi` thiếu khóa.
- **Màu sắc dùng biến CSS** (`var(--accent)`, `var(--danger)`…). Giao diện chỉ dùng đen trắng; đỏ, vàng, xanh lá chỉ dành cho trạng thái nguy hiểm, cảnh báo, thành công. Bảng màu tối nằm ở **hai** chỗ trong `globals.css`: `@media (prefers-color-scheme: dark)` (theo hệ điều hành) và `:root[data-theme='dark']` (nút sáng/tối); sửa thì sửa cả hai.
- **Không dùng emoji.** Icon dùng `<Glyph name="…" />` trong `app/components/Glyph.tsx`; icon tự lấy màu chữ xung quanh.
- **Không hiển thị HTML, liên kết hay hình ảnh do AI sinh ra.** `RichAnswer` cố ý chỉ hiển thị văn bản thuần, vì liên kết và hình ảnh là kênh rò rỉ dữ liệu.
- **Ẩn hoặc hiện nút theo vai trò chỉ là trải nghiệm người dùng.** Phân quyền thật được kiểm tra ở backend trên token ký theo ngưỡng.
- **Thao tác mở enclave Tide nên gắn với một cú click** (ví dụ nút "Unlock vault"), vì trình duyệt chặn popup không xuất phát từ thao tác của người dùng.

## Kiểm tra trước khi bàn giao lại

```bash
cd frontend && npx tsc --noEmit && npm run build
cd backend && npm run test:e2e
```

Sau đó kiểm tra thủ công cả hai ngôn ngữ, ở cả màn hình rộng và màn hình điện thoại (~375px):

1. Đăng nhập.
2. Tải tài liệu demo.
3. Hỏi câu "surgery cost" và duyệt 3 tài liệu.
4. Bật "Simulate hijacked AI", hỏi câu "physio invoice", rồi từ chối các yêu cầu bổ sung.
5. Xem tab biên nhận.
6. Xem Operator console.

Triển khai lên VPS: `bash infra/deploy.sh` (hoặc `SERVICES=web bash infra/deploy.sh` nếu chỉ thay đổi frontend).

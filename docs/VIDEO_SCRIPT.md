# Kịch bản video demo

> **Trạng thái:** `demo.mp4` trong repository là bản có **giọng đọc tiếng Anh (Gemini TTS)** và **phụ đề**, dài dưới 2 phút. Video được quay tự động trên bản triển khai thực tế bằng `tools/demo-video/`. Muốn quay lại bằng giọng thật thì dùng đúng kịch bản dưới đây.

**Yêu cầu kỹ thuật:** tối đa 2 phút, định dạng `.mp4`, dưới 100 MB, đặt ở thư mục gốc với tên `demo.mp4`.

Bố cục bám theo gợi ý của đề bài (**possibility → constraint → prototype và vai trò của TideCloak → what changes**) và theo đúng 4 bước của khung **Guided demo** trong ứng dụng.

| Cảnh | Thao tác trên màn hình | Lời thoại (tiếng Anh) |
|---|---|---|
| 1. Vấn đề | Trang chủ, rồi đăng nhập bằng Tide | *"AI could save us hours on our most private paperwork. But to read it, today's AI services hold the keys, so their admins, attackers, or a hijacked agent can read everything."* |
| 2. Bước 1: niêm phong kho | **Load demo documents**, rồi bật **What the server sees** | *"NeedToKnow is built on TideCloak. Your documents are encrypted in your browser. The server only stores ciphertext, and no master key exists anywhere."* |
| 3. Bước 2: hỏi có xin phép | **Ask about the surgery**: AI xin 3/7 tài liệu, chọn **Release 3** | *"You ask about your knee surgery. The AI sees only titles, and asks for three documents, not your passport. You approve, and Tide decrypts just those three, in your own session."* |
| 4. Câu trả lời và che định danh | Câu trả lời có trích dẫn; mở **Show exactly what the AI received** | *"You get a cited answer: you pay two thousand, nine hundred and twenty dollars, and you can afford it. And before anything left your browser, your name and ID numbers were masked."* |
| 5. Bước 3: tấn công AI | **Run a hijacked AI**: AI xin 7/7, chỉ chọn 2; cảnh báo `export_all_documents()`, liên kết bị gỡ; **Deny all**; tab **Disclosure receipts** | *"Now let's red-team it. A clinic invoice hides a prompt injection, and the hijacked AI demands all seven documents. You release only two. It tries to export everything and plant a phishing link, but it holds no key and no tools. The link is stripped, nothing leaves, and every disclosure lands on your receipts."* |
| 6. Bước 4: nhà vận hành | **Operator console**: **Try to decrypt** tài liệu của người khác ("20 of 20 … declined"); **Run rogue agent** | *"The platform operator can see the whole database, and it's all ciphertext. Decrypting your file with the operator's own Tide session? Twenty out of twenty independent Tide nodes refuse. Even an AI agent with full database access gets nothing readable."* |
| 7. Quản trị | Tide admin console: yêu cầu `Grant Roles` **Pending 0/1** (tạo bằng `infra/tidecloak/try-escalate.sh`) | *"And even with the server's root password, an attacker can only file a request that waits for Tide admins to sign."* |
| 8. Kết | Màn hình kết | *"NeedToKnow. AI help for the documents that matter most, on a need-to-know basis. Built with TideCloak."* |

## Ghi chú khi quay thủ công
- Cửa sổ trình duyệt khoảng 1280×800, chế độ sáng, ngôn ngữ EN.
- Chuẩn bị trước một tài khoản có vai trò `ntk-operator` cho cảnh 6, và bấm **Restart demo** để kho trống trước khi quay.
- Mỗi lần gọi Gemini mất 5–60 giây; nên cắt hoặc tua nhanh các đoạn chờ.
- Nén nếu vượt dung lượng: `ffmpeg -i raw.mp4 -vf scale=1280:-2 -c:v libx264 -crf 28 -preset veryfast -c:a aac -b:a 96k demo.mp4`

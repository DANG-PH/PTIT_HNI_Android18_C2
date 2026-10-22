# Kịch bản video demo

**Yêu cầu kỹ thuật:** thời lượng 2 phút, định dạng `.mp4`, dung lượng dưới 100 MB, đặt tại thư mục gốc của repository với tên `demo.mp4` (README đã liên kết sẵn).

**Quy ước:**
- **🎙 Lời thoại**: đọc bằng tiếng Anh, vì ban giám khảo là Tide và RMIT.
- **🎬 Thao tác**: các bước thực hiện trên màn hình.

**Chuẩn bị:**
- Quay tại `https://ntk.dangpham.id.vn`, cửa sổ trình duyệt khoảng 1280×800, zoom 110%.
- Tab 1: tài khoản người dùng demo, vault để trống.
- Tab 2: tài khoản quản trị viên có vai trò `ntk-operator`.

Bố cục theo gợi ý của đề bài: **possibility → constraint → prototype (vai trò của TideCloak) → what changes**.

---

## 0:00 – 0:15 · The possibility
🎬 Trang chủ.
🎙 *"AI could save us hours on our most important paperwork: medical results, insurance policies, bank statements. But those are exactly the documents we never hand to an AI. NeedToKnow changes that."*

## 0:15 – 0:30 · The constraint
🎬 Trang chủ, phần ba tính năng.
🎙 *"Today, for an AI service to read your files, someone has to hold the decryption key: the operator, every admin, anyone who breaches the server, and the AI agent itself. One prompt injection and everything leaks. So we don't share."*

## 0:30 – 1:05 · The prototype: giá trị cho người dùng
🎬 Chọn **Load demo documents** và chờ thông báo mã hóa qua Tide. Bật **What the server sees** khoảng 2 giây để hiển thị bản mã, sau đó tắt.
🎙 *"Linh's documents are encrypted in her browser with TideCloak. The server only ever stores ciphertext, and there's no master key anywhere: decryption is a threshold operation on Tide's network that only her live session can authorise."*

🎬 Chọn **Try: surgery cost**, rồi **Ask**. Thẻ yêu cầu truy cập hiển thị 3 tài liệu (không có hộ chiếu). Chọn **Release 3 for this question**.
🎙 *"The AI only sees titles. It asks for exactly three documents, not her passport. She releases them for this one question…"*

🎬 Câu trả lời hiển thị kèm trích dẫn và phép tính.
🎙 *"…and gets a cited answer: insurance pays $10,380, she pays $2,920, and she can afford it. An evening of reading, done in seconds."*

## 1:05 – 1:35 · AI bị chiếm quyền
🎬 Bật **Simulate hijacked AI**, chọn **Try: physio invoice**, rồi **Ask**. Thẻ cảnh báo đỏ: AI yêu cầu toàn bộ 7 tài liệu. Bỏ chọn, chỉ giữ hóa đơn và hợp đồng bảo hiểm, rồi chọn **Release 2**.
🎙 *"Now we simulate a hijacked AI. The invoice hides a prompt injection in French. The AI demands everything…"*

🎬 Kết quả hiển thị: cảnh báo `export_all_documents()`, liên kết bị loại bỏ, yêu cầu thêm 5 tài liệu. Chọn **Deny all**.
🎙 *"…tries to run export_all_documents and plant a phishing link. But it has no key and no tools. The server only holds ciphertext. Linh denies, and nothing leaks. When the AI's own safety fails, TideCloak is the last line, and it's cryptographic, not a prompt."*

## 1:35 – 1:52 · Quản trị viên không đọc được dữ liệu
🎬 Chuyển sang tab 2, mở **Operator console**: toàn bộ bảng dữ liệu là bản mã. Chọn **Try to decrypt** trên một tài liệu của Linh: thông báo "Refused by the Tide network". Nếu đủ thời lượng, chọn thêm **Run rogue agent**.
🎙 *"Even the platform operator, with the whole database and their own Tide session, can't decrypt Linh's files. And making yourself more powerful needs 2 of 3 admins to approve, cryptographically."*

## 1:52 – 2:00 · What changes
🎬 Quay lại tab 1, mở **Disclosure receipts**.
🎙 *"Every disclosure is on Linh's receipt. NeedToKnow: AI help for the documents that matter most, on a need-to-know basis. Built with TideCloak."*

---

## Ghi chú hậu kỳ
- **Công cụ ghi màn hình:** OBS Studio, hoặc trình ghi tích hợp của Ubuntu (`Ctrl+Shift+Alt+R`). Xuất ở độ phân giải 720p.
- **Cắt thời gian chờ:** mỗi lần gọi Gemini mất khoảng 5–10 giây; nên cắt hoặc tăng tốc các đoạn chờ.
- **Nén nếu vượt dung lượng:**
  ```bash
  ffmpeg -i raw.mp4 -vf scale=1280:-2 -c:v libx264 -crf 28 -preset veryfast -c:a aac -b:a 96k demo.mp4
  ```

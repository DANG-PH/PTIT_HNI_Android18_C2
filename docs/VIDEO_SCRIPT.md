# Kịch bản video demo (2 phút, .mp4 < 100 MB)

> Cách dùng: phần **🎙 Lời thoại** đọc bằng tiếng Anh (giám khảo là Tide/RMIT). Phần **🎬 Thao tác** là việc bạn làm trên màn hình.
> Quay ở `https://ntk.dangpham.id.vn`, cửa sổ trình duyệt khoảng 1280×800, zoom 110%.
> Chuẩn bị trước: đăng nhập sẵn bằng tài khoản người dùng "Linh", vault trống; mở sẵn một tab đăng nhập tài khoản admin có role `ntk-operator`.

Bố cục theo đề gợi ý: **possibility → constraint → prototype (vai trò TideCloak) → what changes**.

---

## 0:00 – 0:15 · Khả năng mới (the possibility)
🎬 Màn hình landing page.
🎙 *"AI could save us hours on our most important paperwork: medical results, insurance policies, bank statements. But those are exactly the documents we never hand to an AI. NeedToKnow changes that."*

## 0:15 – 0:30 · Ràng buộc niềm tin (the constraint)
🎬 Vẫn ở landing, hoặc chuyển nhanh qua phần 3 tính năng.
🎙 *"Today, for an AI service to read your files, someone has to hold the decryption key: the operator, every admin, anyone who breaches the server, and the AI agent itself. One prompt injection and everything leaks. So we don't share."*

## 0:30 – 1:05 · Prototype: giá trị cho người dùng
🎬 Bấm **Load demo documents** (chờ "Encrypting… via Tide"), bật **What the server sees** 2 giây để thấy ciphertext rồi tắt.
🎙 *"Linh's documents are encrypted in her browser with TideCloak. The server only ever stores ciphertext, and there's no master key anywhere: decryption is a threshold operation on Tide's network that only her live session can authorise."*

🎬 Bấm **Try: surgery cost**, rồi **Ask**. Thẻ xin phép hiện: AI xin 3 tài liệu (không xin hộ chiếu). Bấm **Release 3 for this question**.
🎙 *"The AI only sees titles. It asks for exactly three documents, not her passport. She releases them for this one question…"*

🎬 Câu trả lời hiện ra có trích dẫn và phép tính.
🎙 *"…and gets a cited answer: insurance pays $10,380, she pays $2,920, and she can afford it. An evening of reading, done in seconds."*

## 1:05 – 1:35 · AI bị chiếm quyền vẫn không lấy được gì
🎬 Bật **Simulate hijacked AI**, bấm **Try: physio invoice**, rồi **Ask**. AI xin tất cả 7 tài liệu (thẻ đỏ). Bỏ chọn, chỉ giữ hóa đơn và hợp đồng bảo hiểm, bấm **Release 2**.
🎙 *"Now we simulate a hijacked AI. The invoice hides a prompt injection in French. The AI demands everything…"*

🎬 Câu trả lời hiện: cảnh báo đỏ `export_all_documents()`, link bị xóa, thẻ đỏ "wants 5 more". Bấm **Deny all**.
🎙 *"…tries to run export_all_documents and plant a phishing link. But it has no key and no tools. The server only holds ciphertext. Linh denies, and nothing leaks. When the AI's own safety fails, TideCloak is the last line, and it's cryptographic, not a prompt."*

## 1:35 – 1:52 · Admin cũng không đọc được
🎬 Sang tab admin, mở **Operator console**: bảng toàn ciphertext. Bấm **Try to decrypt** một dòng của Linh: thông báo đỏ "Refused by the Tide network". (Nếu kịp thì bấm **Run rogue agent**.)
🎙 *"Even the platform operator, with the whole database and their own Tide session, can't decrypt Linh's files. And making yourself more powerful needs 2 of 3 admins to approve, cryptographically."*

## 1:52 – 2:00 · Điều gì thay đổi (what changes)
🎬 Quay lại tab **Disclosure receipts** của Linh.
🎙 *"Every disclosure is on Linh's receipt. NeedToKnow: AI help for the documents that matter most, on a need-to-know basis. Built with TideCloak."*

---

## Mẹo quay
- Dùng OBS hoặc công cụ ghi màn hình có sẵn (Ubuntu: `Ctrl+Shift+Alt+R`, hoặc OBS). Xuất **.mp4 720p** để file nhỏ hơn 100 MB.
- Gemini mất khoảng 5–10 giây mỗi lần trả lời: tua nhanh hoặc cắt đoạn chờ khi edit.
- Nén nếu file lớn: `ffmpeg -i raw.mp4 -vf scale=1280:-2 -c:v libx264 -crf 28 -preset veryfast -c:a aac -b:a 96k demo.mp4`
- Đặt file `demo.mp4` ở thư mục gốc repo (README đã link sẵn).

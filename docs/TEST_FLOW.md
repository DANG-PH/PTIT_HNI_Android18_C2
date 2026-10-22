# Luồng kiểm thử NeedToKnow

Tài liệu dành cho thành viên nhóm và người kiểm thử. Mỗi bước nêu thao tác, kết quả mong đợi và điều bước đó chứng minh. Toàn bộ dữ liệu là giả lập.

- **Ứng dụng:** https://ntk.dangpham.id.vn
- **Tide admin console:** https://tide.dangpham.id.vn/admin/needtoknow/console/
- **Tài khoản:** dùng tài khoản Tide của bạn (tự đăng ký ngay tại màn hình đăng nhập), hoặc tài khoản demo có quyền operator của nhóm (thông tin nằm trong biểu mẫu nộp bài và ghi chú nội bộ, không công khai trên repository).

## 1. Luồng người dùng: Guided demo 4 bước

Đăng nhập: **Sign in with Tide**, sau đó **Create an account** (lần đầu) hoặc nhập tài khoản có sẵn. Trang `/home` hiển thị khung **Guided demo** ở cột bên phải (trên màn hình hẹp thì nằm trên cùng); bước cần làm tiếp theo được viền đậm.

| Bước | Thao tác | Kết quả mong đợi | Điều được chứng minh |
|---|---|---|---|
| 1. Seal a sample vault | Bấm **Load demo documents** | Bảy tài liệu xuất hiện trong "Your vault". Bật **What the server sees** để thấy chuỗi mã hóa | Mã hóa diễn ra trên trình duyệt; máy chủ chỉ nhận bản mã |
| 2. Ask with consent | Bấm **Ask about the surgery** | AI chỉ xin 3/7 tài liệu (không xin hộ chiếu). Bấm **Release 3 for this question**. Câu trả lời có trích dẫn: bảo hiểm chi trả $10,380, người dùng tự trả $2,920. Mở **Show exactly what the AI received** để thấy tên và số định danh đã được che (`[name]`, `[policy no.]`…) | AI chỉ được biết đúng điều cần biết; thông tin định danh không rời khỏi trình duyệt |
| 3. Red-team the AI | Bấm **Run a hijacked AI** | AI bị chiếm quyền xin 7/7 tài liệu (cảnh báo đỏ). Chỉ giữ hóa đơn và hợp đồng bảo hiểm, rồi bấm Release. Kết quả hiển thị cảnh báo `export_all_documents()`, liên kết lạ bị gỡ, và yêu cầu xin thêm tài liệu được đánh dấu. Bấm **Deny all** | Kể cả khi AI bị prompt injection, dữ liệu không thể bị lấy đi: AI không có khóa, không có công cụ |
| 4. Look as the operator | Bấm **Open operator console** (chỉ khi tài khoản có vai trò `ntk-operator`) | Bảng hiển thị toàn bộ cơ sở dữ liệu dưới dạng bản mã. Bấm **Try to decrypt** ở một dòng **không** phải của bạn: hiển thị "20 of 20 independent Tide nodes declined". Bấm **Run rogue agent**: AI phía máy chủ trả lời rằng nó không đọc được dữ liệu | Không tồn tại master key: ngay cả nhà vận hành và AI phía máy chủ cũng không đọc được dữ liệu của người khác |

**Tài liệu của chính bạn:** bấm **+ Add document**, chọn hoặc kéo thả tệp PDF/TXT/MD/CSV. Văn bản được trích ngay trên trình duyệt (PDF dùng pdf.js), hiện vào ô nội dung để kiểm tra, rồi **Encrypt & store** mã hóa bằng Tide trước khi gửi. Bản thân tệp không bao giờ rời máy; máy chủ chỉ nhận bản mã. Ảnh scan (không có lớp chữ) chưa được hỗ trợ.

Sau đó mở tab **Disclosure receipts** để xem nhật ký: mỗi lần chia sẻ tiêu đề, tiết lộ nội dung hay từ chối đều được ghi lại, kèm tên model đã trả lời. **Restart demo** xóa kho và biên nhận để chạy lại từ đầu.

## 2. Luồng quản trị: không ai tự nâng quyền được

```bash
bash infra/tidecloak/try-escalate.sh <username>
```

Script dùng credential quản trị gốc của máy chủ để cấp vai trò `ntk-operator`. Kết quả mong đợi: API trả `204`, danh sách vai trò **không đổi**, và trong Tide admin console (**Change Requests**) xuất hiện yêu cầu `Grant Roles` ở trạng thái **Pending 0/1**. Chỉ quản trị viên Tide ký trong enclave mới làm thay đổi có hiệu lực. Sau khi kiểm tra, từ chối yêu cầu đó (menu ⋮ → Deny) để không vô tình cấp quyền.

## 3. Kiểm thử tự động

```bash
cd backend && npm run test:e2e        # xác thực token: thiếu token hay token giả mạo đều bị từ chối
cd frontend && npx tsc --noEmit       # kiểm tra kiểu, gồm cả hai bộ từ điển EN/VI
```

Video demo được quay tự động trên bản triển khai thực tế bằng `tools/demo-video/` (xem README trong thư mục đó).

## 4. Sự cố thường gặp

| Hiện tượng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Đăng nhập hoặc giải mã chậm, enclave báo "Something went wrong" | Mạng ORK của Tide đang chậm hoặc có node lỗi | Thử lại sau ít phút; trạng thái mạng: https://status.tideprotocol.com |
| Vault hiện nút **Unlock vault** | Enclave ẩn không mở được và trình duyệt chặn popup | Bấm **Unlock vault** (thao tác có người dùng nên popup được phép) |
| Câu trả lời đến chậm (30–70 giây) | Gemini bản miễn phí quá tải | Backend tự thử lại và chuyển model dự phòng; biên nhận ghi đúng model đã trả lời |
| Bước 4 hiện "Needs an operator account" | Tài khoản không có vai trò `ntk-operator` | Dùng tài khoản demo có quyền operator, hoặc cấp vai trò qua change request |

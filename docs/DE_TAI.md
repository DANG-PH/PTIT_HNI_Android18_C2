# NeedToKnow: tài liệu mô tả dự án

> Tài liệu nội bộ dành cho thành viên nhóm. Bản trình bày gửi ban giám khảo nằm trong `README.md` (tiếng Anh, tối đa 300 từ).

## 1. Tóm tắt

**NeedToKnow là trợ lý AI (Google Gemini) hỗ trợ người dùng khai thác các tài liệu nhạy cảm nhất của họ: hồ sơ y tế, hợp đồng bảo hiểm, sao kê ngân hàng, giấy tờ tùy thân. Không một bên nào khác, kể cả máy chủ, quản trị viên nền tảng hay chính mô hình AI, có thể đọc nội dung các tài liệu này nếu chưa được người dùng cho phép trong từng lần cụ thể.**

Tên dự án lấy từ nguyên tắc *need-to-know* trong quân đội và y tế: mỗi bên chỉ được tiếp cận đúng thông tin cần thiết, vào đúng thời điểm cần thiết. NeedToKnow áp dụng nguyên tắc này cho AI.

---

## 2. Yêu cầu của đề bài

Thử thách số 2 (UNLOCKED, Tide × RMIT) đặt câu hỏi: **"What would you build if trust stopped being the bottleneck?"**

- Nhiều ý tưởng giá trị không triển khai được vì đòi hỏi giao quá nhiều quyền cho một bên duy nhất. Đề bài nêu ba ví dụ: chia sẻ hồ sơ giữa các bệnh viện, **mức độ truy cập của AI vào dữ liệu cá nhân**, và quản trị tài nguyên chung trong cộng đồng.
- Yêu cầu: xây dựng prototype tích hợp **TideCloak**, trong đó **không quản trị viên, tổ chức hay AI nào có thể đơn phương vượt qua các quy tắc bảo vệ dữ liệu và quyết định của người dùng**, đồng thời chứng minh điều đó mở ra một khả năng mới.
- Lưu ý của ban tổ chức: nếu ứng dụng vẫn vận hành y hệt khi thay TideCloak bằng cơ chế đăng nhập và phân quyền thông thường, ý tưởng chưa đạt yêu cầu. Sản phẩm không nên là một bản demo đăng nhập, một công cụ bảo mật thuần túy hay một bảng điều khiển phân quyền chung chung.

NeedToKnow giải quyết trực tiếp ví dụ thứ hai: **AI nên được truy cập dữ liệu đến mức nào?**

---

## 3. Bài toán: niềm tin đang cản trở điều gì

### Tình huống điển hình

Người dùng (persona: Linh Tran) vừa nhận kết quả MRI đầu gối và được chỉ định phẫu thuật tái tạo dây chằng chéo trước, với báo giá **$13,300**. Câu hỏi cần trả lời:

> "Bảo hiểm chi trả bao nhiêu, tôi phải tự thanh toán bao nhiêu, và số dư tài khoản có đủ không?"

Thông tin nằm rải rác trong ba tài liệu: **hợp đồng bảo hiểm** dài 30 trang, **báo giá của bệnh viện** và **sao kê ngân hàng**. Một mô hình AI xử lý việc này trong vài giây, trong khi người dùng có thể mất cả buổi tối.

### Rào cản hiện nay

| Cách làm phổ biến | Rủi ro |
|---|---|
| Tải tài liệu lên một dịch vụ AI hoặc "két tài liệu thông minh" | Dữ liệu nằm trên máy chủ của nhà cung cấp. Quản trị viên, nhân sự nội bộ hoặc kẻ tấn công có thể truy cập **toàn bộ** |
| Máy chủ giữ khóa giải mã để AI xử lý được dữ liệu | Tồn tại **master key**: kiểm soát được máy chủ là kiểm soát được dữ liệu của mọi người dùng |
| AI agent được cấp công cụ truy cập toàn bộ kho tài liệu | Chỉ một tài liệu chứa **prompt injection** cũng đủ khiến agent bị điều khiển để trích xuất dữ liệu ra ngoài |

**Hệ quả:** người dùng không giao cho AI chính những tài liệu mà AI có thể hỗ trợ nhiều nhất. Niềm tin trở thành điểm nghẽn.

---

## 4. Giải pháp

1. **Mã hóa đầu cuối tại trình duyệt bằng TideCloak.** Tài liệu (cả tiêu đề lẫn nội dung) được mã hóa ngay trên thiết bị người dùng; máy chủ chỉ lưu **bản mã**. Hệ thống **không có master key**: thẩm quyền giải mã được phân tán trên mạng **20 node ORK độc lập** của Tide (ngưỡng 14/20) và chỉ hình thành khi chính chủ đăng nhập với đúng vai trò.
2. **AI chỉ được xem danh mục.** Khi nhận câu hỏi, Gemini chỉ thấy **tiêu đề** tài liệu và gửi **yêu cầu truy cập** kèm lý do, ví dụ: *"Cần hợp đồng bảo hiểm và báo giá bệnh viện để tính phần chi trả."*
3. **Người dùng phê duyệt từng tài liệu.** Trình duyệt giải mã đúng các tài liệu được duyệt (qua mạng ORK) và gửi cho Gemini để trả lời **riêng câu hỏi đó**; bản rõ không được lưu lại.
4. **Biên nhận tiết lộ (Disclosure receipts).** Mỗi lần AI tiếp cận dữ liệu đều được ghi nhận: tài liệu nào, thời điểm nào, cho câu hỏi nào. Câu hỏi trong biên nhận cũng được mã hóa bằng khóa của người dùng.
5. **Mọi yêu cầu truy cập bổ sung phải được phê duyệt lại.** AI không có công cụ và không có khóa; máy chủ không giữ bản rõ. Yêu cầu phát sinh sau khi AI đọc tài liệu được đánh dấu cảnh báo, vì nội dung tài liệu có thể đang điều hướng AI.

---

## 5. Vai trò then chốt của TideCloak

| | Đăng nhập và phân quyền thông thường | Tự mã hóa bằng passphrase | **TideCloak (NeedToKnow)** |
|---|---|---|---|
| Máy chủ hoặc quản trị viên đọc được dữ liệu? | Có, toàn bộ | Không | Không |
| Tồn tại master key? | Có, trên máy chủ | Có (passphrase hoặc dịch vụ giữ khóa) | **Không**: thẩm quyền phân tán trên 20 ORK, ngưỡng 14 |
| Quên mật khẩu | Đặt lại được | **Mất toàn bộ dữ liệu** | Khôi phục qua mạng Tide |
| AI agent phía máy chủ bị prompt injection | Lộ toàn bộ kho dữ liệu | Không lộ, nhưng AI cũng không thể hỗ trợ | AI chỉ tiếp cận phần người dùng phê duyệt |
| Quản trị viên tự nâng quyền | Thực hiện được, không ai hay biết | Không áp dụng | **Bị chặn**: thay đổi quyền cần quorum 2/3 quản trị viên ký bằng mật mã (IGA) |

**Kết luận:** nếu không có TideCloak, ứng dụng không thể cam kết một cách đáng tin cậy rằng nhà vận hành không đọc được tài liệu của người dùng. Cam kết đó chỉ có giá trị khi **về mặt kỹ thuật, không bên nào nắm giữ khóa**.

---

## 6. Kịch bản trình diễn (video 2 phút)

1. **Giá trị cho người dùng.** Người dùng hỏi về chi phí phẫu thuật; AI xin đúng 3/7 tài liệu (không xin hộ chiếu); người dùng phê duyệt; AI trả lời kèm trích dẫn và phép tính: bảo hiểm chi trả **$10,380**, người dùng tự thanh toán **$2,920** và đủ khả năng chi trả.
2. **AI bị chiếm quyền vẫn không thể trích xuất dữ liệu.** Hóa đơn vật lý trị liệu chứa prompt injection bằng tiếng Pháp và tiếng Bồ Đào Nha. Ở chế độ *Simulate hijacked AI*, mô hình yêu cầu toàn bộ kho tài liệu, cố gọi `export_all_documents()` và chèn liên kết thu thập dữ liệu. Hệ thống loại bỏ liên kết, cảnh báo người dùng; người dùng từ chối và không dữ liệu nào bị lộ.
3. **Quản trị viên nền tảng không đọc được dữ liệu.** Operator console hiển thị toàn bộ cơ sở dữ liệu nhưng chỉ là bản mã; thao tác giải mã bằng phiên Tide của quản trị viên bị mạng ORK từ chối; một AI agent phía máy chủ có toàn quyền truy cập cơ sở dữ liệu cũng chỉ nhận được chuỗi vô nghĩa.
4. **Không ai tự nâng quyền được.** Việc gán vai trò trong Tide admin console tạo ra change request cần 2/3 quản trị viên phê duyệt.

> Nguyên tắc dựng video: ưu tiên câu chuyện giá trị cho người dùng; các cảnh tấn công đóng vai trò bằng chứng, chiếm khoảng 30 giây cuối, nhằm tránh để sản phẩm bị nhìn nhận như một công cụ bảo mật thuần túy.

---

## 7. Giới hạn của giải pháp

- Nội dung **đã được phê duyệt** sẽ được gửi tới nhà cung cấp mô hình AI cho đúng câu hỏi đó. NeedToKnow loại bỏ **quyền truy cập thường trực và đơn phương**, không loại bỏ hoàn toàn việc AI tiếp xúc dữ liệu. Hướng phát triển: tự động che thông tin định danh trước khi gửi, hoặc vận hành mô hình trong môi trường confidential computing.
- **Tiêu đề tài liệu** được chia sẻ với AI để lập kế hoạch truy cập, và điều này được thể hiện rõ trong biên nhận.
- Nếu thiết bị hoặc phiên đăng nhập của người dùng bị chiếm quyền, kẻ tấn công có quyền tương đương người dùng. Tide bảo vệ danh tính của phiên, không bảo vệ thiết bị.

---

## 8. Đối chiếu tiêu chí chấm điểm

| Tiêu chí (trọng số) | Cách NeedToKnow đáp ứng |
|---|---|
| **Vision & originality (25%)** | Mô hình AI theo nguyên tắc need-to-know: xin phép cho từng lần tiết lộ, có biên nhận; khả năng chống prompt injection đến từ kiến trúc, không phụ thuộc vào hành vi của mô hình |
| **Trust constraint insight (20%)** | Để AI xử lý được dữ liệu, phải có bên giữ master key, và bên đó có quyền đơn phương. Loại bỏ ràng buộc này giúp người dùng an tâm chia sẻ tài liệu quan trọng nhất |
| **Value & impact (20%)** | Một buổi tối đọc hợp đồng 30 trang được rút gọn thành câu trả lời có trích dẫn trong vài giây; áp dụng được cho y tế, bảo hiểm, pháp lý, tài chính cá nhân |
| **Why TideCloak matters (20%)** | Mã hóa đầu cuối với thẩm quyền phân tán trên mạng ORK; quản trị viên không giải mã được; IGA quorum chặn việc tự nâng quyền; backend xác thực JWT ký ngưỡng bằng khóa nhúng |
| **Prototype & storytelling (15%)** | Ứng dụng chạy thực tế tại `https://ntk.dangpham.id.vn` và video theo kịch bản 4 cảnh |

---

## 9. Kiến trúc kỹ thuật

```
 Trình duyệt (Next.js 16 + TideCloak SDK)
   │  ├─ Đăng nhập Tide (mật khẩu xác minh theo ngưỡng, không lưu hash)
   │  ├─ doEncrypt / doDecrypt ──────────────►  Mạng ORK của Tide (ngưỡng 14/20)
   │  └─ Chỉ gửi bản rõ của tài liệu đã được phê duyệt
   ▼
 Backend NestJS (https://ntk.dangpham.id.vn/api)
   │  ├─ Xác thực JWT ký ngưỡng bằng JWK nhúng trong tidecloak.json
   │  ├─ Lưu bản mã và biên nhận (SQLite), không bao giờ có bản rõ
   │  └─ Gọi Gemini cho phần dữ liệu đã được phê duyệt (retry và model dự phòng)
   ▼
 Gemini API

 TideCloak server (https://tide.dangpham.id.vn): realm, vai trò, IGA quorum giữa các quản trị viên
```

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js 16 (template chính thức của Tide), `@tidecloak/nextjs` 0.14.40 |
| Backend | NestJS 11, SQLite (`node:sqlite`), `jose`, `@google/genai` |
| Danh tính và mã hóa | TideCloak (`tideorg/tidecloak-dev`), kết nối mạng Tide production |
| Hạ tầng | VPS, nginx, Cloudflare, Docker Compose |
| Dữ liệu | Toàn bộ là dữ liệu giả lập (synthetic), đúng yêu cầu của đề bài |

Hướng dẫn cài đặt chi tiết: [`docs/SETUP.md`](SETUP.md). Kịch bản video: [`docs/VIDEO_SCRIPT.md`](VIDEO_SCRIPT.md).

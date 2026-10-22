'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'vi'
const STORAGE_KEY = 'ntk-lang'

const en = {
  'brand.builtWith': 'Built with TideCloak',
  'nav.signedIn': 'Signed in with Tide',
  'nav.operator': 'Operator console',
  'nav.signOut': 'Sign out',
  'nav.backToVault': 'Back to my vault',
  'nav.how': 'How it works',
  'nav.security': 'Security',
  'theme.toLight': 'Switch to light mode',
  'theme.toDark': 'Switch to dark mode',

  'landing.e2ee': 'End-to-end encrypted',
  'landing.badge': 'Synthetic demo · no real data',
  'landing.title1': 'Ask AI about your most private documents.',
  'landing.title2': 'Nobody else holds the key.',
  'landing.lead':
    'Medical results, insurance policies, bank statements. NeedToKnow lets an AI help you with them while the server, its admins and the AI itself can only see what you release, one question at a time.',
  'landing.connecting': 'Connecting to Tide…',
  'landing.signIn': 'Sign in with Tide',
  'landing.noPassword': "No password is stored anywhere: Tide's network verifies it in pieces.",
  'landing.how.title': 'Your documents. Your permission.',
  'landing.how.sub':
    "The AI works on a need-to-know basis: it never reads a document you haven't released for that question.",
  'landing.s1.title': 'Encrypt in your browser',
  'landing.s1.body': 'Documents and their titles are sealed through Tide before upload. The server stores ciphertext only.',
  'landing.s2.title': 'The AI reads titles, then asks',
  'landing.s2.body': 'It starts from the list of titles and requests specific documents, with a reason for each one.',
  'landing.s3.title': 'You release, per question',
  'landing.s3.body':
    'Approve or deny each request. Approved documents are decrypted by a live Tide call for this one answer.',
  'landing.s4.title': 'Cited answer, written receipt',
  'landing.s4.body': 'The answer cites what it used, and every disclosure or denial lands in your receipt ledger.',
  'landing.sec.title': "Built so that trust isn't required.",
  'landing.sec.sub': 'Prompt-injection resistance comes from the architecture, not from hoping the model behaves.',
  'landing.noKey.title': 'No master key',
  'landing.noKey.body':
    "Documents are encrypted in your browser. The decryption authority is split across Tide's independent nodes and only comes together for your own signed-in session.",
  'landing.hijack.title': 'Hijack-proof by design',
  'landing.hijack.body':
    'A prompt-injected AI, a rogue admin or a breached server gets ciphertext. There is no key on the server for them to steal.',
  'landing.operator.title': "Even the operator can't read it",
  'landing.operator.body':
    'An operator with the whole database and their own Tide session still cannot decrypt your documents.',
  'landing.governance.title': 'No single credential can grant power',
  'landing.governance.body':
    "Even the server's root admin credential can only file a role change. It applies only after Tide admins sign it in their own enclaves.",
  'landing.cta.title': 'Try it with a synthetic sample vault.',
  'landing.cta.body':
    'Ask about a knee-surgery bill and release only what the answer needs. Then run the hijacked-AI step and watch nothing leak.',

  'mock.sealed': '{n} sealed',
  'mock.tagRequested': 'requested',
  'mock.tagSealed': 'sealed',
  'mock.reasonPolicy': 'Cover, excess and limits for ACL surgery',
  'mock.reasonQuote': 'The charges you were quoted',
  'mock.reasonBank': 'Your balance, to check affordability this month',
  'mock.log': 'receipt: AI requested {n} of {total} · passport stays sealed · waiting for your approval',

  'vault.title': 'Your vault',
  'vault.sub': 'Encrypted in your browser. The server stores ciphertext only; decrypting needs your live Tide session.',
  'vault.locked': 'Tide needs your go-ahead to open its secure enclave.',
  'vault.unlock': 'Unlock vault',
  'vault.decryptingTitles': 'Decrypting titles via Tide…',
  'vault.empty': 'Empty. Start with seven synthetic demo documents, or add your own.',
  'vault.bytes': '{n} bytes',
  'vault.delete': 'Delete',
  'vault.loadDemo': 'Load demo documents',
  'vault.cancel': 'Cancel',
  'vault.add': '+ Add document',
  'vault.serverSees': 'What the server sees',
  'vault.form.title': 'Title',
  'vault.form.file': 'Choose or drop a file (PDF, TXT, MD, CSV)',
  'vault.form.fileHint': 'Read and encrypted in your browser. The file itself is never uploaded.',
  'vault.form.reading': 'Reading the file in your browser…',
  'vault.form.loaded': '{name}: {n} characters extracted. Check them below, then encrypt.',
  'vault.form.trimmed': '{name}: kept the first {n} characters, the most the AI reads per document.',
  'vault.form.noText': 'No text found in this file. Scanned images are not supported yet: paste the text instead.',
  'vault.form.category': 'Category',
  'vault.form.content': 'Content',
  'vault.form.submit': 'Encrypt & store',
  'vault.resetConfirm': 'Delete all your documents and receipts?',
  'vault.encrypting': 'Encrypting {n} document(s) in your browser via Tide…',
  'vault.stored': 'Stored {n} document(s). The server only received ciphertext.',

  'cat.health': 'health',
  'cat.insurance': 'insurance',
  'cat.finance': 'finance',
  'cat.legal': 'legal',
  'cat.identity': 'identity',
  'cat.other': 'other',

  'tab.ask': 'Ask AI',
  'tab.receipts': 'Disclosure receipts',
  'ask.emptyTitle': 'Ask about your documents',
  'ask.history': 'Answers are never stored. Your past questions stay in Disclosure receipts, encrypted so only you can read them.',
  'ask.emptyHint': 'New here? Follow the guided demo on the right →',
  'landing.watchDemo': 'Watch the 2-minute demo',
  'landing.closeDemo': 'Close video',
  'stats.label': 'Vault at a glance',
  'stats.sealed': 'Sealed docs',
  'stats.keys': 'Keys on our server',
  'stats.keysNote': 'Decryption needs your own session',
  'stats.released': 'Shown to the AI',
  'stats.masked': 'IDs masked',
  'ask.hint': 'Enter to send · Shift+Enter for a new line',
  'ask.needDocs': 'Load the demo or add a document first',
  'answer.by': 'NeedToKnow AI',
  'op.stat.docs': 'Documents in the store',
  'op.stat.users': 'Users',
  'op.stat.keys': 'Keys this console holds',
  'op.stat.refused': 'Decryptions refused',
  'ring.need': 'must agree',
  'ring.met': 'threshold met',
  'ring.agreed': 'nodes agreed',
  'ring.aria.working': 'Waiting for 14 of 20 independent Tide nodes to agree',
  'ring.aria.granted': 'Threshold met: at least 14 of 20 Tide nodes agreed',
  'ring.aria.refused': 'Refused: none of the 20 Tide nodes agreed',
  'ring.decrypting': 'Asking 20 independent Tide nodes. At least 14 must agree, and only for your own session.',
  'ring.sealing': 'Sealing your documents with Tide in this browser…',
  'ring.granted': 'Threshold met. Decrypted in your browser; releasing {n} document(s) to the AI for this answer.',
  'guide.eyebrow': 'Guided demo',
  'guide.title': 'Four steps, about two minutes',
  'guide.restart': 'Restart demo',
  'guide.hide': 'Hide',
  'guide.show': 'Show steps',
  'guide.s1.title': 'Seal a sample vault',
  'guide.s1.body': 'Seven synthetic documents are encrypted in your browser. The server only ever receives ciphertext.',
  'guide.s2.title': 'Ask with consent',
  'guide.s2.body': 'The AI sees titles, asks for what it needs, and you release each document for one question.',
  'guide.s2.action': 'Ask about the surgery',
  'guide.s3.title': 'Red-team the AI',
  'guide.s3.body': 'An invoice hides a prompt injection and the AI is hijacked. See what it can and cannot do.',
  'guide.s3.action': 'Run a hijacked AI',
  'guide.s4.title': 'Look as the operator',
  'guide.s4.body': 'The operator sees the whole database. Try to decrypt someone else\'s file.',
  'guide.s4.action': 'Open operator console',
  'guide.s4.noRole': 'Needs an operator account',
  'mask.toggle': 'Mask names and ID numbers before sending',
  'mask.count': '{n} identifiers masked',
  'mask.show': 'Show exactly what the AI received',
  'ask.intro': 'The AI starts with the titles of your documents only. It asks for what it needs, and you decide what it reads.',
  'ask.placeholder': 'Ask about your documents…',
  'ask.submit': 'Ask',

  'turn.hijackedTag': 'hijacked-AI simulation',
  'turn.planning': 'AI is reading the titles of your documents…',
  'turn.asks': 'The AI asks to read {n} of your {total} documents',
  'turn.why': 'Uploading only sealed your documents: nobody can read them, not us and not the AI. Only what you tick is decrypted, in your browser, for this one answer.',
  'turn.tooMany': 'That is a lot of documents for one question. Only release what is clearly needed.',
  'turn.release': 'Release {n} for this question',
  'turn.deny': 'Deny',
  'turn.decrypting': 'Threshold decryption on the Tide network (your session, your key)…',
  'turn.answering': 'Released {n} document(s) to the AI for this answer…',
  'turn.denied': 'Denied. The AI read nothing. Logged in your receipts.',
  'turn.error': 'Error: {msg}',
  'turn.toolCallsBefore': 'The AI tried to run',
  'turn.toolCallsAfter':
    'NeedToKnow gives the AI no tools and no keys: the server holds only ciphertext, so there was nothing to export.',
  'turn.injection': 'Hidden instructions found inside a document:',
  'turn.links': 'Removed {n} external link(s) from the answer:',
  'turn.sawOnly': 'AI saw only:',
  'turn.followTitle': 'After reading your documents, the AI wants {n} more',
  'turn.followBody': 'Text inside a document can steer an AI. These were requested after it read:',
  'turn.denyAll': 'Deny all',
  'turn.releaseSelected': 'Release selected',
  'turn.followDenied':
    'Follow-up denied. Those documents stayed sealed: no key exists that the AI or the server could use instead.',

  'receipts.loading': 'Loading receipts and decrypting your questions…',
  'receipts.empty': 'No disclosures yet.',
  'receipts.sub':
    "Every time the AI saw anything. Questions are stored encrypted under your key; the server can't read this ledger either.",
  'receipts.when': 'When',
  'receipts.what': 'What',
  'receipts.docs': 'Documents',
  'receipts.question': 'Question',
  'receipts.index': 'Titles shared',
  'receipts.disclosure': 'Content disclosed',
  'receipts.denied': 'Denied',
  'receipts.titles': '{n} titles',
  'receipts.deleted': 'deleted',

  'op.noRole':
    'Your token has no ntk-operator role. The API will refuse these requests: the role is checked server-side on the threshold-signed token, and granting it requires Tide admins to sign the change.',
  'op.storeTitle': 'The whole document store',
  'op.totals': '{docs} documents · {users} users',
  'op.refresh': 'Refresh',
  'op.storeSub':
    'As the platform operator you can read every row in the database. This is everything a rogue admin, an insider or a breach would get.',
  'op.colOwner': 'Owner',
  'op.colTitle': 'Title (as stored)',
  'op.colBody': 'Body (as stored)',
  'op.colDecrypt': 'Decrypt with my Tide session',
  'op.you': 'you',
  'op.asking': 'Asking Tide ORKs…',
  'op.tryDecrypt': 'Try to decrypt',
  'op.refused': 'Refused by the Tide network:',
  'op.refusedSummary': '{failed} of {total} independent Tide nodes declined (at least {need} must agree). This document is sealed to its owner\'s identity.',
  'op.rawError': 'Technical details',
  'op.decryptedOwn': 'Decrypted (your own document):',
  'op.rogueTitle': 'Unleash a server-side AI agent on the database',
  'op.rogueSub':
    'A typical "AI-powered" backend lets its agent read the store directly. Here is what an agent with full database access gets from NeedToKnow.',
  'op.rogueBusy': 'Agent is reading the database…',
  'op.rogueRun': 'Run rogue agent',
  'op.rogueGiven': '{model} · given {n} raw records',
  'op.govTitle': 'Can I just give myself more power?',
  'op.govSub':
    "Role changes in this realm are governed by TideCloak IGA. Assigning a role, even with the server's root admin credential, only files a change request. It takes effect after Tide admins approve it in their own enclaves (a 70% quorum of admins), so no single credential can push it through.",
  'op.openConsole': 'Open Tide admin console ↗',
} as const

export type I18nKey = keyof typeof en

const vi: Record<I18nKey, string> = {
  'brand.builtWith': 'Xây dựng với TideCloak',
  'nav.signedIn': 'Đã đăng nhập bằng Tide',
  'nav.operator': 'Bảng điều khiển vận hành',
  'nav.signOut': 'Đăng xuất',
  'nav.backToVault': 'Về kho của tôi',
  'nav.how': 'Cách hoạt động',
  'nav.security': 'Bảo mật',
  'theme.toLight': 'Chuyển sang giao diện sáng',
  'theme.toDark': 'Chuyển sang giao diện tối',

  'landing.e2ee': 'Mã hóa đầu cuối',
  'landing.badge': 'Bản demo · dữ liệu giả lập',
  'landing.title1': 'Hỏi AI về những tài liệu riêng tư nhất của bạn.',
  'landing.title2': 'Không ai khác giữ chìa khóa.',
  'landing.lead':
    'Kết quả xét nghiệm, hợp đồng bảo hiểm, sao kê ngân hàng. NeedToKnow để AI hỗ trợ bạn với những tài liệu đó, trong khi máy chủ, quản trị viên và chính AI chỉ thấy những gì bạn cho phép, cho từng câu hỏi.',
  'landing.connecting': 'Đang kết nối Tide…',
  'landing.signIn': 'Đăng nhập bằng Tide',
  'landing.noPassword': 'Không nơi nào lưu mật khẩu: mạng Tide xác minh mật khẩu theo từng phần.',
  'landing.how.title': 'Tài liệu của bạn. Quyền của bạn.',
  'landing.how.sub':
    'AI làm việc theo nguyên tắc need-to-know: AI không bao giờ đọc tài liệu mà bạn chưa cho phép cho câu hỏi đó.',
  'landing.s1.title': 'Mã hóa ngay trên trình duyệt',
  'landing.s1.body': 'Tài liệu và tiêu đề được niêm phong qua Tide trước khi tải lên. Máy chủ chỉ lưu bản mã.',
  'landing.s2.title': 'AI đọc tiêu đề, rồi xin phép',
  'landing.s2.body': 'AI bắt đầu từ danh sách tiêu đề và xin những tài liệu cụ thể, kèm lý do cho từng tài liệu.',
  'landing.s3.title': 'Bạn duyệt theo từng câu hỏi',
  'landing.s3.body':
    'Cho phép hoặc từ chối từng yêu cầu. Tài liệu được duyệt sẽ được giải mã qua một lệnh gọi Tide trực tiếp, chỉ cho câu trả lời này.',
  'landing.s4.title': 'Trả lời có trích dẫn, có biên nhận',
  'landing.s4.body': 'Câu trả lời trích dẫn những gì AI đã dùng, và mọi lần tiết lộ hay từ chối đều được ghi vào sổ biên nhận.',
  'landing.sec.title': 'Thiết kế để bạn không cần phải tin ai.',
  'landing.sec.sub': 'Khả năng chống prompt injection đến từ kiến trúc, không phải từ việc hy vọng mô hình cư xử đúng.',
  'landing.noKey.title': 'Không có master key',
  'landing.noKey.body':
    'Tài liệu được mã hóa ngay trên trình duyệt. Thẩm quyền giải mã được phân tán trên các node độc lập của Tide và chỉ hình thành cho chính phiên đăng nhập của bạn.',
  'landing.hijack.title': 'Chống chiếm quyền từ thiết kế',
  'landing.hijack.body':
    'AI bị prompt injection, quản trị viên xấu hay máy chủ bị xâm nhập đều chỉ nhận được bản mã. Máy chủ không giữ khóa nào để bị đánh cắp.',
  'landing.operator.title': 'Ngay cả nhà vận hành cũng không đọc được',
  'landing.operator.body':
    'Nhà vận hành có toàn bộ cơ sở dữ liệu và phiên Tide của riêng mình vẫn không thể giải mã tài liệu của bạn.',
  'landing.governance.title': 'Không credential đơn lẻ nào tự cấp được quyền',
  'landing.governance.body':
    'Kể cả credential quản trị gốc của máy chủ cũng chỉ tạo được change request. Thay đổi chỉ có hiệu lực khi các quản trị viên Tide ký trong enclave của riêng họ.',
  'landing.cta.title': 'Thử với một kho tài liệu mẫu giả lập.',
  'landing.cta.body':
    'Hỏi về chi phí ca mổ đầu gối và chỉ cho phép những gì câu trả lời cần. Sau đó chạy bước AI bị chiếm quyền và thấy không có gì bị rò rỉ.',

  'mock.sealed': '{n} đã niêm phong',
  'mock.tagRequested': 'đang xin',
  'mock.tagSealed': 'niêm phong',
  'mock.reasonPolicy': 'Phạm vi chi trả, mức khấu trừ và hạn mức cho ca mổ ACL',
  'mock.reasonQuote': 'Các khoản phí trong báo giá',
  'mock.reasonBank': 'Số dư của bạn, để xem tháng này có đủ khả năng chi trả không',
  'mock.log': 'biên nhận: AI xin {n}/{total} tài liệu · hộ chiếu vẫn niêm phong · đang chờ bạn duyệt',

  'vault.title': 'Kho tài liệu của bạn',
  'vault.sub': 'Mã hóa ngay trên trình duyệt. Máy chủ chỉ lưu bản mã; muốn giải mã cần phiên Tide đang hoạt động của bạn.',
  'vault.locked': 'Tide cần bạn xác nhận để mở enclave bảo mật.',
  'vault.unlock': 'Mở khóa kho',
  'vault.decryptingTitles': 'Đang giải mã tiêu đề qua Tide…',
  'vault.empty': 'Kho đang trống. Bắt đầu với bảy tài liệu demo tổng hợp, hoặc tự thêm tài liệu của bạn.',
  'vault.bytes': '{n} byte',
  'vault.delete': 'Xóa',
  'vault.loadDemo': 'Tải tài liệu demo',
  'vault.cancel': 'Hủy',
  'vault.add': '+ Thêm tài liệu',
  'vault.serverSees': 'Máy chủ nhìn thấy gì',
  'vault.form.title': 'Tiêu đề',
  'vault.form.file': 'Chọn hoặc kéo thả tệp (PDF, TXT, MD, CSV)',
  'vault.form.fileHint': 'Đọc và mã hóa ngay trên trình duyệt. Bản thân tệp không bao giờ được tải lên.',
  'vault.form.reading': 'Đang đọc tệp trên trình duyệt…',
  'vault.form.loaded': '{name}: đã trích {n} ký tự. Kiểm tra bên dưới rồi mã hóa.',
  'vault.form.trimmed': '{name}: giữ {n} ký tự đầu, mức tối đa AI đọc cho mỗi tài liệu.',
  'vault.form.noText': 'Không tìm thấy chữ trong tệp. Chưa hỗ trợ ảnh scan: hãy dán nội dung vào.',
  'vault.form.category': 'Danh mục',
  'vault.form.content': 'Nội dung',
  'vault.form.submit': 'Mã hóa & lưu',
  'vault.resetConfirm': 'Xóa toàn bộ tài liệu và biên nhận của bạn?',
  'vault.encrypting': 'Đang mã hóa {n} tài liệu trên trình duyệt qua Tide…',
  'vault.stored': 'Đã lưu {n} tài liệu. Máy chủ chỉ nhận được bản mã.',

  'cat.health': 'sức khỏe',
  'cat.insurance': 'bảo hiểm',
  'cat.finance': 'tài chính',
  'cat.legal': 'pháp lý',
  'cat.identity': 'giấy tờ tùy thân',
  'cat.other': 'khác',

  'tab.ask': 'Hỏi AI',
  'tab.receipts': 'Biên nhận tiết lộ',
  'ask.emptyTitle': 'Hỏi về tài liệu của bạn',
  'ask.history': 'Câu trả lời không bao giờ được lưu. Câu hỏi cũ nằm ở tab Biên nhận tiết lộ, được mã hóa để chỉ bạn đọc được.',
  'ask.emptyHint': 'Lần đầu? Làm theo demo có hướng dẫn bên phải →',
  'landing.watchDemo': 'Xem demo 2 phút',
  'landing.closeDemo': 'Đóng video',
  'stats.label': 'Tổng quan kho',
  'stats.sealed': 'Tài liệu niêm phong',
  'stats.keys': 'Khóa trên máy chủ của chúng tôi',
  'stats.keysNote': 'Giải mã cần chính phiên của bạn',
  'stats.released': 'Đã cho AI xem',
  'stats.masked': 'Định danh đã che',
  'ask.hint': 'Enter để gửi · Shift+Enter để xuống dòng',
  'ask.needDocs': 'Hãy tải demo hoặc thêm tài liệu trước',
  'answer.by': 'Trợ lý NeedToKnow',
  'op.stat.docs': 'Tài liệu trong kho',
  'op.stat.users': 'Người dùng',
  'op.stat.keys': 'Khóa bảng điều khiển này giữ',
  'op.stat.refused': 'Lần giải mã bị từ chối',
  'ring.need': 'cần đồng ý',
  'ring.met': 'đạt ngưỡng',
  'ring.agreed': 'node đồng ý',
  'ring.aria.working': 'Đang chờ 14/20 node Tide độc lập đồng ý',
  'ring.aria.granted': 'Đạt ngưỡng: ít nhất 14/20 node Tide đã đồng ý',
  'ring.aria.refused': 'Bị từ chối: không node Tide nào trong 20 node đồng ý',
  'ring.decrypting': 'Đang hỏi 20 node Tide độc lập. Cần ít nhất 14 node đồng ý, và chỉ cho chính phiên của bạn.',
  'ring.sealing': 'Đang niêm phong tài liệu bằng Tide ngay trên trình duyệt…',
  'ring.granted': 'Đạt ngưỡng. Đã giải mã trên trình duyệt; đang gửi {n} tài liệu cho AI để trả lời câu hỏi này.',
  'guide.eyebrow': 'Demo có hướng dẫn',
  'guide.title': 'Bốn bước, khoảng hai phút',
  'guide.restart': 'Làm lại demo',
  'guide.hide': 'Ẩn',
  'guide.show': 'Hiện các bước',
  'guide.s1.title': 'Niêm phong kho mẫu',
  'guide.s1.body': 'Bảy tài liệu giả lập được mã hóa ngay trên trình duyệt. Máy chủ chỉ nhận được bản mã.',
  'guide.s2.title': 'Hỏi AI có xin phép',
  'guide.s2.body': 'AI chỉ thấy tiêu đề, xin những gì cần, và bạn duyệt từng tài liệu cho một câu hỏi.',
  'guide.s2.action': 'Hỏi về ca phẫu thuật',
  'guide.s3.title': 'Thử tấn công AI',
  'guide.s3.body': 'Một hóa đơn chứa prompt injection và AI bị chiếm quyền. Xem AI làm được và không làm được gì.',
  'guide.s3.action': 'Chạy AI bị chiếm quyền',
  'guide.s4.title': 'Nhìn từ phía nhà vận hành',
  'guide.s4.body': 'Nhà vận hành thấy toàn bộ cơ sở dữ liệu. Hãy thử giải mã tài liệu của người khác.',
  'guide.s4.action': 'Mở bảng điều khiển vận hành',
  'guide.s4.noRole': 'Cần tài khoản operator',
  'mask.toggle': 'Che tên và số định danh trước khi gửi',
  'mask.count': 'Đã che {n} định danh',
  'mask.show': 'Xem chính xác những gì AI nhận được',
  'ask.intro': 'AI chỉ bắt đầu với tiêu đề tài liệu. AI xin những gì cần, và bạn quyết định AI được đọc gì.',
  'ask.placeholder': 'Đặt câu hỏi về tài liệu của bạn…',
  'ask.submit': 'Hỏi',

  'turn.hijackedTag': 'mô phỏng AI bị chiếm quyền',
  'turn.planning': 'AI đang đọc tiêu đề tài liệu của bạn…',
  'turn.asks': 'AI xin đọc {n}/{total} tài liệu của bạn',
  'turn.why': 'Tải lên chỉ niêm phong tài liệu: không ai đọc được, kể cả chúng tôi và AI. Chỉ tài liệu bạn tick mới được giải mã, ngay trên trình duyệt, cho riêng câu trả lời này.',
  'turn.tooMany': 'Quá nhiều tài liệu cho một câu hỏi. Chỉ cho phép những gì thật sự cần thiết.',
  'turn.release': 'Cho phép {n} tài liệu cho câu hỏi này',
  'turn.deny': 'Từ chối',
  'turn.decrypting': 'Đang giải mã theo ngưỡng trên mạng Tide (phiên của bạn, khóa của bạn)…',
  'turn.answering': 'Đã cho AI xem {n} tài liệu cho câu trả lời này…',
  'turn.denied': 'Đã từ chối. AI không đọc gì. Đã ghi vào biên nhận.',
  'turn.error': 'Lỗi: {msg}',
  'turn.toolCallsBefore': 'AI đã cố chạy',
  'turn.toolCallsAfter':
    'NeedToKnow không cấp cho AI công cụ hay khóa nào: máy chủ chỉ giữ bản mã nên không có gì để xuất ra.',
  'turn.injection': 'Phát hiện chỉ thị ẩn trong tài liệu:',
  'turn.links': 'Đã gỡ {n} liên kết ngoài khỏi câu trả lời:',
  'turn.sawOnly': 'AI chỉ thấy:',
  'turn.followTitle': 'Sau khi đọc tài liệu, AI muốn xem thêm {n} tài liệu',
  'turn.followBody': 'Nội dung bên trong tài liệu có thể điều khiển AI. Các yêu cầu này xuất hiện sau khi AI đọc:',
  'turn.denyAll': 'Từ chối tất cả',
  'turn.releaseSelected': 'Cho phép mục đã chọn',
  'turn.followDenied':
    'Đã từ chối yêu cầu bổ sung. Các tài liệu đó vẫn được niêm phong: không tồn tại khóa nào để AI hay máy chủ dùng thay.',

  'receipts.loading': 'Đang tải biên nhận và giải mã câu hỏi của bạn…',
  'receipts.empty': 'Chưa có lần tiết lộ nào.',
  'receipts.sub':
    'Mọi lần AI được xem dữ liệu. Câu hỏi được lưu dưới dạng mã hóa bằng khóa của bạn; máy chủ cũng không đọc được sổ này.',
  'receipts.when': 'Thời điểm',
  'receipts.what': 'Loại',
  'receipts.docs': 'Tài liệu',
  'receipts.question': 'Câu hỏi',
  'receipts.index': 'Đã chia sẻ tiêu đề',
  'receipts.disclosure': 'Đã tiết lộ nội dung',
  'receipts.denied': 'Đã từ chối',
  'receipts.titles': '{n} tiêu đề',
  'receipts.deleted': 'đã xóa',

  'op.noRole':
    'Token của bạn không có vai trò ntk-operator. API sẽ từ chối các yêu cầu này: vai trò được kiểm tra phía máy chủ trên token ký theo ngưỡng, và việc cấp vai trò cần các quản trị viên Tide ký duyệt.',
  'op.storeTitle': 'Toàn bộ kho tài liệu',
  'op.totals': '{docs} tài liệu · {users} người dùng',
  'op.refresh': 'Làm mới',
  'op.storeSub':
    'Với tư cách nhà vận hành, bạn đọc được mọi dòng trong cơ sở dữ liệu. Đây là tất cả những gì một quản trị viên xấu, người nội bộ hay kẻ xâm nhập có thể lấy được.',
  'op.colOwner': 'Chủ sở hữu',
  'op.colTitle': 'Tiêu đề (như được lưu)',
  'op.colBody': 'Nội dung (như được lưu)',
  'op.colDecrypt': 'Giải mã bằng phiên Tide của tôi',
  'op.you': 'bạn',
  'op.asking': 'Đang hỏi các ORK của Tide…',
  'op.tryDecrypt': 'Thử giải mã',
  'op.refused': 'Mạng Tide từ chối:',
  'op.refusedSummary': '{failed}/{total} node Tide độc lập từ chối (cần ít nhất {need} node đồng ý). Tài liệu này được niêm phong theo danh tính của chủ sở hữu.',
  'op.rawError': 'Chi tiết kỹ thuật',
  'op.decryptedOwn': 'Đã giải mã (tài liệu của chính bạn):',
  'op.rogueTitle': 'Thả một AI agent phía máy chủ vào cơ sở dữ liệu',
  'op.rogueSub':
    'Một backend "tích hợp AI" thông thường cho agent đọc trực tiếp kho dữ liệu. Đây là những gì một agent có toàn quyền truy cập cơ sở dữ liệu lấy được từ NeedToKnow.',
  'op.rogueBusy': 'Agent đang đọc cơ sở dữ liệu…',
  'op.rogueRun': 'Chạy agent giả mạo',
  'op.rogueGiven': '{model} · nhận {n} bản ghi thô',
  'op.govTitle': 'Tôi có thể tự cấp thêm quyền cho mình không?',
  'op.govSub':
    'Thay đổi vai trò trong realm này được quản trị bởi TideCloak IGA. Việc gán vai trò, kể cả bằng credential quản trị gốc của máy chủ, chỉ tạo ra một change request. Thay đổi chỉ có hiệu lực sau khi các quản trị viên Tide phê duyệt trong enclave của riêng họ (quorum 70% số quản trị viên), nên không một credential đơn lẻ nào tự áp dụng được.',
  'op.openConsole': 'Mở Tide admin console ↗',
}

const DICTS: Record<Lang, Record<I18nKey, string>> = { en, vi }

interface I18nValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: I18nKey, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'en' || saved === 'vi') setLangState(saved)
    } catch {
      // Storage can be unavailable (private mode); English stays the default.
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Not persisted; the choice still applies for this page view.
    }
  }, [])

  const t = useCallback(
    (key: I18nKey, vars?: Record<string, string | number>) => {
      let s: string = DICTS[lang][key] ?? en[key]
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
      return s
    },
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}

export function LangSwitch() {
  const { lang, setLang } = useI18n()
  return (
    <div className="lang-switch" role="group" aria-label="Language">
      {(['en', 'vi'] as const).map((l) => (
        <button key={l} className={lang === l ? 'active' : ''} onClick={() => setLang(l)} aria-pressed={lang === l}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

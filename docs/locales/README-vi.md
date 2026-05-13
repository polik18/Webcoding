<div căn chỉnh="trung tâm">
  <h1>WebPad++ 🚀</h1>
  <p><strong>Trình quản lý tài liệu và IDE mạnh mẽ, hoàn toàn dựa trên trình duyệt</strong></p>
  <p>Không có phần phụ trợ • Hoàn toàn cục bộ • Hiệu suất cao</p>

[Tiếng Anh](README.md) | [繁體中文](docs/locales/README-zh-TW.md) | [简体中文](docs/locales/README-zh-CN.md) | [日本語](docs/locales/README-ja.md) | [Español](docs/locales/README-es.md) | [Français](docs/locales/README-fr.md) | [Tiếng Đức](docs/locales/README-de.md)

</div>

<giờ/>

## 🌟 Tổng quan

WebPad++ là Môi trường phát triển tích hợp (IDE) thế hệ tiếp theo chạy **100% trong trình duyệt web của bạn**. Không cần chương trình phụ trợ, cơ sở dữ liệu hoặc cài đặt cục bộ, bạn có thể viết mã, chạy Python, xây dựng trang web, quản lý bảng tính và trích xuất văn bản từ tệp PDF—tất cả đều cục bộ trên máy của bạn mà không có độ trễ.

## ✨ Tính năng chính

### 💻 Chỉnh sửa và thực thi mã
- **Trình chỉnh sửa thông minh**: Được hỗ trợ bởi Ace Editor với tính năng tô sáng cú pháp, IntelliSense và khớp ngoặc.
- **Thực thi tức thì**: 
  - Chạy **HTML/CSS/JS** với Bản xem trước trực tiếp song song.
  - Chạy **Python** cục bộ trực tiếp trong trình duyệt thông qua Pyodide.
- **Tích hợp Linter & Formatter**: Phát hiện lỗi cú pháp theo thời gian thực và làm đẹp bằng một cú nhấp chuột cho HTML, CSS và JS.
- **Mã khác biệt**: So sánh song song hai tệp bất kỳ bằng trình xem hợp nhất trực quan của chúng tôi.

### 📄Bộ tài liệu chuyên nghiệp
- **Markdown & Visual Sync**: Chuyển đổi liền mạch giữa mã Markdown và trình soạn thảo trực quan Rich Text (WYSIWYG).
- **Công cụ bảng tính**: Mở, chỉnh sửa, sắp xếp và áp dụng các công thức toán học (ví dụ: `=SUM(A1:A5)`) cho các tệp `.xlsx` và `.csv`.
- **Công cụ PDF & Word**: Xem tệp PDF, chỉnh sửa tệp DOCX ở chế độ văn bản đa dạng thức và trích xuất văn bản thông qua trình phân tích cú pháp tích hợp sẵn.
- **Xuất**: Chuyển đổi và tải xuống các tệp trên các định dạng DOCX, XLSX, CSV và PDF.

### 🌐 Tiện ích nâng cao
- **Kéo và thả thư mục**: Kéo toàn bộ thư mục dự án từ hệ điều hành của bạn thẳng vào WebPad++.
- **Công cụ SEO**: Trình tạo hình ảnh tích hợp sẵn cho `sitemap.xml` và `robots.txt` để tăng thứ hạng tìm kiếm trên trang web của bạn.
- **Image OCR**: Tải lên hoặc chụp ảnh tài liệu và tự động trích xuất văn bản bằng Tesseract.js.
- **Bộ mã QR**: Tạo mã QR ngay lập tức hoặc giải mã chúng bằng webcam của bạn.

## 🛠 Các định dạng được hỗ trợ

| Định dạng | Nhập & Xem | Chỉnh sửa | Xuất khẩu |
|--------|--------------|------|--------|
| **HTML/JS/CSS** | ✅ Có | ✅ Mã & Xem trước trực tiếp | ✅ ZIP / Tệp |
| **Giảm giá** | ✅ Có | ✅ Mã & Đồng bộ hóa WYSIWYG | ✅ MD |
| **XLSX / CSV** | ✅ Lưới bảng tính | ✅ Công thức & Sắp xếp | ✅ XLSX / CSV |
| **PDF** | ✅ Người xem | ✅ Trích xuất văn bản | ✅ PDF / DOCX |
| **DOCX** | ✅ Kết xuất HTML phong phú | ✅ WYSIWYG | ✅ DOCX / PDF |

## 🚀 Cách sử dụng

1. **Bắt đầu**: Chỉ cần mở `index.html` trong bất kỳ trình duyệt web hiện đại nào.
2. **Quản lý tệp**: Nhấp vào menu `☰` để mở File Explorer. Nhấp chuột phải để tạo tệp hoặc chỉ cần kéo và thả thư mục vào cửa sổ.
3. **Mã chạy**: Mở bất kỳ tập lệnh nào và nhấp vào nút ►️ **Chạy** hoặc nhấn `Ctrl+Enter`.
4. **Công cụ & SEO**: Sử dụng thanh công cụ trên cùng để truy cập công cụ OCR, trình quét Mã QR hoặc Trình tạo Sơ đồ trang web/Robot.
5. **Ngôn ngữ**: WebPad++ hỗ trợ 30 ngôn ngữ toàn cầu! Sử dụng menu thả xuống ở trên cùng bên phải để chuyển đổi ngay lập tức.

## 🔐 Quyền riêng tư và bảo mật

WebPad++ hoạt động hoàn toàn phía máy khách. Mã, tài liệu và dữ liệu của bạn không bao giờ rời khỏi máy tính của bạn. Mọi thứ được lưu trữ liên tục bằng cách sử dụng IndexedDB gốc của trình duyệt của bạn. Bạn có thể nhấp vào **Đặt lại tất cả** để xóa tất cả dữ liệu một cách an toàn.
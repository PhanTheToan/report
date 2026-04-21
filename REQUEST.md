**Phần 1 — Viết lại câu của bạn cho gọn và rõ hơn**

**“Tôi muốn làm bản tạm thời: dữ liệu báo cáo lưu luôn dưới dạng JSON ở client để dùng nhanh, còn backend dùng Node.js. Hãy mô tả và thiết kế chi tiết để tôi đưa cho Codex triển khai.”**

---

**Phần 2 — Bản mô tả và thiết kế để giao cho Codex**

Tôi đã soạn sẵn một bản spec chi tiết ở canvas bên cạnh. Nó gồm:

* mục tiêu MVP
* kiến trúc frontend/backend
* data model JSON
* luồng paste ảnh / upload / export PDF
* API Node.js
* cấu trúc thư mục
* validate
* prompt giao việc cho Codex

Nội dung cốt lõi bạn nên yêu cầu Codex làm là như sau.

## 1. Mục tiêu hệ thống

Làm một web app viết báo cáo lỗ hổng theo form cố định:

* Name
* Mức độ
* Mô tả
* Tác động
* Tái hiện
* Vị trí
* Phương án phòng ngừa
* Tham khảo

Yêu cầu:

* nhập liệu gần giống Word
* hỗ trợ paste ảnh bằng Ctrl+V
* hỗ trợ insert ảnh
* dữ liệu report lưu tạm ở client bằng JSON
* backend Node.js chỉ lo upload ảnh và export PDF
* có preview báo cáo
* có import/export JSON

## 2. Công nghệ nên dùng

### Frontend

* **Next.js** hoặc **React + Vite**
* **Tiptap** làm rich text editor
* **TailwindCSS** cho giao diện
* **localStorage** để lưu JSON tạm
* **Cong nghe**: Su dung skill `ui-ux-pro-max` de thiet ke ui-ux
  
### Backend

* **Node.js + Express**
* **multer** để upload ảnh
* **Puppeteer** để xuất PDF

## 3. Vì sao chọn cách này

Đây là cách làm nhanh nhất cho bản tạm:

* không cần database
* dễ chạy local
* editor đẹp hơn textarea thường
* dễ export PDF theo template cố định
* sau này có thể nâng cấp lên PostgreSQL mà không phải đập đi làm lại toàn bộ

## 4. Thiết kế dữ liệu JSON

Mỗi report lưu dạng như sau:

```json
{
  "id": "report-uuid",
  "meta": {
    "title": "SQL Injection at /search",
    "severity": "High",
    "author": "ToanPT",
    "createdAt": "2026-04-21T08:00:00.000Z",
    "updatedAt": "2026-04-21T08:30:00.000Z",
    "target": "example.com"
  },
  "sections": {
    "name": "SQL Injection in search parameter",
    "mucDo": "High",
    "moTa": "<p>...</p>",
    "tacDong": "<p>...</p>",
    "taiHien": "<ol><li>...</li></ol>",
    "viTri": "<p>GET /search?q=</p>",
    "phuongAnPhongNgua": "<p>Use parameterized queries...</p>",
    "thamKhao": "<ul><li>OWASP...</li></ul>"
  },
  "attachments": [
    {
      "id": "img-1",
      "name": "poc.png",
      "url": "/uploads/poc.png",
      "type": "image/png",
      "size": 123456
    }
  ],
  "settings": {
    "language": "vi",
    "template": "default-v1"
  }
}
```

## 5. Cách lưu dữ liệu phía client

Dùng `localStorage`.

Ví dụ key:

* `vuln-report-current`
* hoặc `vuln-report-{id}`

Cách hoạt động:

* user nhập nội dung
* state cập nhật
* debounce 500–1000ms
* tự động serialize report thành JSON
* lưu xuống localStorage

Khi reload trang:

* đọc JSON từ localStorage
* khôi phục form và editor

## 6. Luồng chèn ảnh

Khi user paste ảnh hoặc bấm Insert Image:

1. frontend lấy file ảnh
2. gửi lên backend `/api/upload`
3. backend lưu file vào `/uploads`
4. backend trả URL ảnh
5. frontend chèn ảnh vào editor

Không nên nhét base64 trực tiếp vào JSON vì sẽ phình dữ liệu rất nhanh.

## 7. Luồng export PDF

1. user bấm **Export PDF**
2. frontend gửi report JSON lên backend
3. backend render JSON thành HTML theo mẫu cố định
4. Puppeteer biến HTML thành PDF
5. backend trả file PDF để tải về

## 8. API backend cần có

### Health check

```http
GET /api/health
```

Response:

```json
{
  "ok": true
}
```

### Upload ảnh

```http
POST /api/upload
Content-Type: multipart/form-data
```

Field:

* `file`

Response:

```json
{
  "success": true,
  "url": "/uploads/1710000000000-poc.png",
  "filename": "1710000000000-poc.png"
}
```

### Export PDF

```http
POST /api/export/pdf
Content-Type: application/json
```

Request:

```json
{
  "report": {}
}
```

Response:

* stream file PDF hoặc attachment download

## 9. Giao diện nên có

Trang chính có thể làm 2 cột:

* trái: form nhập liệu
* phải: preview

Hoặc làm 2 tab:

* Edit
* Preview

Các control chính:

* input cho Name
* select cho Mức độ
* rich text editor cho các section còn lại
* toolbar: bold, italic, list, code block, quote, image
* nút:

  * New Report
  * Save JSON
  * Export JSON
  * Import JSON
  * Export PDF

## 10. Cấu trúc thư mục nên yêu cầu Codex

```bash
vuln-report-app/
├─ client/
│  ├─ src/
│  │  ├─ components/
│  │  ├─ hooks/
│  │  ├─ utils/
│  │  ├─ types/
│  │  └─ pages/
│  └─ package.json
├─ server/
│  ├─ src/
│  │  ├─ routes/
│  │  ├─ controllers/
│  │  ├─ services/
│  │  ├─ middleware/
│  │  └─ utils/
│  ├─ uploads/
│  └─ package.json
└─ README.md
```

## 11. Các điểm kỹ thuật quan trọng

Bạn nên dặn Codex rõ:

* ưu tiên **chạy được trước**
* không dùng database
* rich text nên lưu dưới dạng **HTML**
* ảnh phải upload qua backend
* export PDF phải theo **template cố định**
* code chia module rõ:

  * editor
  * preview
  * storage
  * upload
  * pdf export

## 12. Prompt ngắn gọn để giao cho Codex

Bạn có thể dùng nguyên văn đoạn này:

```text
Hãy xây dựng một MVP web app để viết báo cáo lỗ hổng với frontend và backend tách riêng.

Yêu cầu:
- Frontend dùng React hoặc Next.js
- Backend dùng Node.js + Express
- Báo cáo có các field cố định:
  - Name
  - Mức độ
  - Mô tả
  - Tác động
  - Tái hiện
  - Vị trí
  - Phương án phòng ngừa
  - Tham khảo
- Các field nội dung chính dùng rich text editor
- Hỗ trợ chèn ảnh bằng Ctrl+V và nút upload ảnh
- Dữ liệu chưa cần database, hãy lưu tạm report JSON ở client bằng localStorage
- Ảnh upload lên backend và trả về URL để chèn vào editor
- Có preview báo cáo theo mẫu chuẩn
- Có nút Export PDF, backend nhận report JSON và render HTML rồi dùng Puppeteer xuất PDF
- Có nút Export JSON và Import JSON

Yêu cầu kỹ thuật:
1. Tạo cấu trúc project gồm client và server
2. Frontend có component form, preview, rich text editor, toolbar, action buttons
3. Dùng Tiptap cho rich text editor
4. Tạo type/interface cho report data
5. Tạo hook auto-save localStorage
6. Backend có API:
   - GET /api/health
   - POST /api/upload
   - POST /api/export/pdf
7. Dùng multer để upload ảnh vào thư mục uploads
8. Dùng Puppeteer để xuất PDF từ template HTML
9. Có validate cơ bản cho input và file upload
10. Viết code rõ ràng, chia component hợp lý
11. Tạo README hướng dẫn chạy local
12. Ưu tiên code chạy được trước, UI gọn gàng, dễ dùng
```

## 13. Kết luận

Với yêu cầu của bạn, hướng đúng nhất cho bản tạm là:

**Frontend React/Next.js + Tiptap + localStorage JSON + Backend Node.js/Express + multer + Puppeteer**

Nó đủ nhanh để làm MVP, dễ yêu cầu Codex code, và sau này vẫn nâng cấp được.

Tôi đã đặt bản spec đầy đủ trong canvas để bạn dùng trực tiếp. Nếu cần, tôi sẽ viết tiếp cho bạn một **prompt cực chi tiết theo kiểu từng bước để Codex tạo luôn toàn bộ project skeleton**.

# Vuln Report App

Ứng dụng web để quản lý báo cáo lỗ hổng với mô hình:

- một workspace có nhiều báo cáo
- mỗi báo cáo có nhiều lỗ hổng
- mỗi lỗ hổng có rich text, ảnh, bảng, CVSS score và CVSS vector/link
- backend lưu dữ liệu bằng SQLite và xuất PDF bằng Chromium

## Stack

- Client: React + Vite + TypeScript + Tiptap + TailwindCSS
- Server: Node.js + Express + SQLite (`node:sqlite`) + multer + `puppeteer-core`
- Xử lý ảnh: `sharp`
- Deploy: Docker + Docker Compose

## Tính năng hiện có

- CRUD báo cáo
- CRUD lỗ hổng trong từng báo cáo
- giao diện master-detail cho báo cáo và lỗ hổng
- rich text editor cho mô tả báo cáo và các section của lỗ hổng
- hỗ trợ chèn ảnh bằng `Ctrl+V` hoặc upload
- tự resize ảnh lớn khi upload
- hỗ trợ chèn bảng, thêm/xóa hàng, thêm/xóa cột, phóng to/thu nhỏ bảng
- nhập `CVSS score` và `CVSS vector/link`
- xem PDF trực tiếp hoặc tải PDF
- sao lưu và khôi phục toàn bộ dữ liệu bằng file backup JSON kèm ảnh upload

## Chạy local

Mở hai terminal riêng.

### Client

```bash
cd client
npm install
npm run dev
```

Client mặc định chạy tại `http://localhost:5173`.

### Server

```bash
cd server
npm install
npm run dev
```

Server mặc định chạy tại `http://localhost:4000`.

## Chạy bằng Docker

Yêu cầu:

- Docker
- Docker Compose v2

### Cách nhanh nhất

Linux/macOS:

```bash
sh ./scripts/docker-up.sh
```

Windows PowerShell:

```powershell
.\scripts\docker-up.ps1
```

Ứng dụng sẽ chạy tại `http://localhost:8080`.

### Dùng Docker Compose trực tiếp

```bash
docker compose up --build -d
```

Tắt container:

```bash
docker compose down
```

Chỉ build image:

```bash
docker compose build
```

### Volume dữ liệu

Compose tạo hai volume:

- `vuln_report_data`: chứa SQLite database
- `vuln_report_uploads`: chứa file upload

Nếu redeploy bằng Docker, chỉ cần giữ lại hai volume này là dữ liệu còn nguyên.

## Sao lưu và khôi phục dữ liệu

### Vì sao cần chức năng này

Nếu chỉ `commit` code rồi `push` Git, sau đó sang máy khác `pull` về thì dữ liệu cũ **không tự đi theo** vì:

- SQLite nằm ở `server/data/vuln-report.sqlite`
- file upload nằm ở `server/uploads/`
- cả hai đang bị ignore trong Git

### Cách chuyển dữ liệu sang máy khác

Trong giao diện có hai nút:

- `Sao lưu`: tải về một file backup `.json`
- `Khôi phục`: import lại file backup đó vào máy khác

File backup chứa:

- toàn bộ báo cáo
- toàn bộ lỗ hổng
- toàn bộ ảnh upload dưới dạng base64

Lưu ý:

- `Khôi phục` sẽ **ghi đè toàn bộ dữ liệu hiện tại**
- nên sao lưu trước khi import nếu trên máy đích đang có dữ liệu cần giữ

## Cấu trúc dữ liệu

### `reports`

- `id`
- `title`
- `author`
- `target`
- `overview_html`
- `language`
- `template`
- `created_at`
- `updated_at`

### `findings`

- `id`
- `report_id`
- `name`
- `severity`
- `description_html`
- `impact_html`
- `reproduction_html`
- `location_html`
- `remediation_html`
- `cvss_score`
- `cvss_ref`
- `references_html`
- `sort_order`
- `created_at`
- `updated_at`

### `attachments`

- `id`
- `report_id`
- `finding_id`
- `original_name`
- `stored_name`
- `url`
- `mime_type`
- `size`
- `created_at`

Schema thực tế nằm ở [server/src/db/schema.sql](C:/Users/toanpt14/Documents/Work/Tmp/server/src/db/schema.sql).

## API chính

### `GET /api/reports`

Trả danh sách báo cáo dạng summary.

### `POST /api/reports`

Tạo báo cáo mới kèm một lỗ hổng mặc định.

### `GET /api/reports/:reportId`

Trả đầy đủ báo cáo, danh sách lỗ hổng và ảnh đính kèm.

### `PATCH /api/reports/:reportId`

Cập nhật phần chung của báo cáo:

- `title`
- `author`
- `target`
- `overview`

### `DELETE /api/reports/:reportId`

Xóa báo cáo.

### `POST /api/reports/:reportId/findings`

Tạo lỗ hổng mới trong báo cáo.

### `PATCH /api/findings/:findingId`

Cập nhật lỗ hổng:

- `name`
- `severity`
- `description`
- `impact`
- `reproduction`
- `location`
- `remediation`
- `cvssScore`
- `cvssRef`
- `references`

### `DELETE /api/findings/:findingId`

Xóa lỗ hổng.

### `POST /api/upload`

`multipart/form-data` với:

- `file`
- `reportId`
- `findingId` tùy chọn

### `GET /api/reports/:reportId/pdf?disposition=inline`

Mở PDF trực tiếp trên trình duyệt.

### `GET /api/reports/:reportId/pdf?disposition=attachment`

Tải file PDF về máy.

### `GET /api/backup/export`

Tải file backup JSON của toàn bộ workspace.

### `POST /api/backup/import`

Khôi phục toàn bộ workspace từ file backup JSON.

## Ghi chú triển khai

- Client dùng URL tương đối, nên khi chạy bằng nginx + compose sẽ tự proxy `/api` và `/uploads` về backend.
- Docker image của server đã cài Chromium sẵn để export PDF, không cần cài Chrome/Edge trên máy host.
- SQLite được lưu tại `server/data/vuln-report.sqlite` trong runtime local và `/app/data` trong container.
- Upload được lưu tại `server/uploads` trong runtime local và `/app/uploads` trong container.

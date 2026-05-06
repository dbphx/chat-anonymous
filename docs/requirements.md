# Yeu Cau Ung Dung Chat An Danh

## 1. Tong Quan

Repo hien tai la mot ung dung chat an danh don gian voi cac thanh phan sau:

- Backend Go su dung Gin de cung cap REST API
- Frontend React su dung Create React App
- MongoDB de luu phong chat va tin nhan
- Redis trong docker compose cho nhu cau mo rong hoac cache

## 2. Yeu Cau Ky Thuat Hien Tai

### 2.1 Backend

- Ngon ngu: Go
- Framework: Gin
- Logging: Logrus va standard log
- Database access: MongoDB Go Driver
- Entry point: `backend/main.go`

### 2.2 Database

- He quan tri: MongoDB
- Ket noi qua bien moi truong `MONGO_URI`
- Database dang duoc backend su dung truc tiep: `chat`
- Collections hien co: `rooms`, `messages`

### 2.3 Frontend

- Framework: React 18
- Bootstrapping: Create React App
- Entry point: `frontend/src/index.js`
- App chinh: `frontend/src/App.jsx`
- Frontend giao tiep voi backend qua `REACT_APP_BACKEND_URL`

## 3. Chuc Nang Hien Co

### 3.1 Quan ly phong

- Lay danh sach phong
- Tao phong moi voi `name` va `password`
- Lay chi tiet phong theo `id`
- Vao phong bang `id` va `secret`
- Xoa phong theo `id`

### 3.2 Quan ly tin nhan

- Gui tin nhan vao phong
- Lay lich su tin nhan theo phong
- Sap xep tin nhan theo thoi gian tao tang dan
- Tin nhan co the gom text, file dinh kem, hoac ca hai
- UI chat co danh sach emoji preset de chen nhanh vao o nhap
- File upload duoc luu local trong backend va tra ve metadata file trong message

### 3.3 Giao dien

- Frontend co 4 trang thai ro rang trong `App.jsx`:
- chua co username: nhap ten truoc khi thao tac voi phong
- lobby: xem danh sach phong, refresh danh sach, tao phong moi
- room access: sau khi chon 1 phong, hien ten phong, room id va form nhap secret de vao phong
- chat view: chi hien sau khi join phong thanh cong
- O lobby, danh sach phong duoc hien thi dang item co the click va co hanh dong `Enter room`
- Sau khi tao phong thanh cong, frontend chuyen sang man hinh `room access` cua phong vua tao, khong auto join
- `ChatView` tiep tuc dung de xem lich su va gui tin nhan sau khi join thanh cong

## 4. Mo Hinh Du Lieu Thuc Te

### 4.1 Room

Du lieu phong hien tai duoc luu voi cac truong chinh:

- `id`
- `name`
- `password`
- `created`

### 4.2 Message

Du lieu tin nhan hien tai duoc luu voi cac truong chinh:

- `id`
- `room_id`
- `user`
- `content`
- `file` gom `name`, `url`, `size`, `content_type` neu co file dinh kem
- `created`

## 5. Dich Vu Va Trien Khai

Docker Compose hien tai gom 4 services:

- `backend`
- `frontend`
- `mongo`
- `redis`

Host ports hien tai:

- Frontend: `3000`
- Backend: `8081` -> container `8080`
- Redis: `6380` -> container `6379`

## 6. Muc Tieu Tai Lieu

Tai lieu nay mo ta dung pham vi hien co cua repo. Cac mo ta ve PostgreSQL, SQLite, MinIO, JWT, WebSocket backend day du, hoac SQL schema chi tiet khong con phu hop voi code hien tai va khong duoc xem la yeu cau thuc te cua repo nay nua.

## 7. Frontend Flow Hien Tai

1. Nguoi dung nhap username.
2. Frontend hien lobby gom danh sach room, nut refresh va form tao room.
3. Khi chon `Enter room` hoac tao room moi, frontend chuyen sang man hinh `room access`.
4. O `room access`, nguoi dung nhap secret cua phong va goi API join.
5. Neu join thanh cong, frontend render `ChatView` cho phong da vao.

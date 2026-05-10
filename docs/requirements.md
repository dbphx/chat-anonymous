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
- Vao phong qua endpoint `join_room` de gom logic join ro rang hon tren API/frontend
- Admin va mod co the vao bat ky room nao khong phu thuoc vao secret cua room, sau khi da login hop le
- Xoa phong theo `id`
- Admin va mod co the xoa bat ky room nao

### 3.2 Quan ly tin nhan

- Gui tin nhan vao phong
- Lay lich su tin nhan theo phong
- Sap xep tin nhan theo thoi gian tao tang dan
- Tin nhan co the gom text, file dinh kem, hoac ca hai
- Tin nhan co the reply mot tin nhan khac trong cung room, va luu snapshot toi thieu cua message goc de frontend render ngay ca khi message goc da bi sua hoac xoa
- Khi render, reply message phai duoc tach thanh mot khu vuc rieng, nhin ro rang voi phan noi dung goc va phan noi dung tra loi; reply block nam ben phai
- Cho phep edit noi dung message neu `message.user === userName` va secret room hop le
- Cho phep delete message neu `message.user === userName` va secret room hop le
- Admin va mod co the xoa bat ky message nao
- Trong chat view, cac hanh dong reply/edit/delete cua tung message chi hien khi nguoi dung bam vao nut action hoac menu tuong ung; mac dinh an de giao dien gon hon
- Message da edit phai co nhan `edited` hien ro tren UI de nguoi dung nhan biet da sua
- Trang admin co cac hanh dong ro rang de vao room, xoa room, va xoa message khong dung chung luong voi nguoi dung thuong
- UI chat co danh sach emoji preset de chen nhanh vao o nhap
- File upload duoc luu local trong backend va tra ve metadata file trong message

### 3.3 Giao dien

- Frontend co cac trang thai ro rang trong `App.jsx` va can duoc giu lai sau reload de khong mat luong dang lam:
- chua co username: nhap ten truoc khi thao tac voi phong; username da nhap co the duoc reuse lai trong cac lan mo app sau do
- lobby: xem danh sach phong, refresh danh sach, tao phong moi
- room access: sau khi chon 1 phong, hien ten phong, room id va form nhap secret de vao phong
- chat view: chi hien sau khi join phong thanh cong
- pathname frontend duoc sync voi flow hien tai bang History API, dung cac route nho gọn: `/` cho lobby, `/room/:roomId` cho room access, va `/chat/:roomId` cho chat view
- admin login: nhap username/password de vao trang admin, du kien o route `/admin/login`
- admin dashboard: admin co the xem danh sach room, nguoi dung, vao bat ky room nao, va xoa room, du kien o route `/admin`
- admin user management: admin co the tao user moi voi role `mod` hoac `admin`, va xoa account `mod`/`admin` khac; chi co 1 admin active tai mot thoi diem
- O lobby, danh sach room duoc hien thi dang item co the click va co hanh dong `Enter room`
- Sau khi tao phong thanh cong, frontend chuyen sang man hinh `room access` cua phong vua tao, khong auto join
- `ChatView` tiep tuc dung de xem lich su va gui tin nhan sau khi join thanh cong
- Trang admin phai co the reload ma van giu trang thai dang dang nhap neu session/token con hop le

### 3.4 Quan ly tai khoan

- Admin login bang `username` va `password`.
- He thong co hai role quan tri: `mod` va `admin`.
- Admin co the tao user moi voi role `mod` hoac `admin`.
- Chi co mot tai khoan `admin` active tai mot thoi diem.
- `mod` co the xoa room va message.
- `admin` co the xoa room, message, va xoa account `mod` hoac `admin` khac.

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
- `reply_to` gom snapshot toi thieu cua message duoc reply: `id`, `user`, `content`
- `edited`
- `updated`
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

1. Nguoi dung nhap username mot lan va frontend co the ghi nho de reuse cho lan mo app sau, ngay ca khi reload trang.
2. Frontend hien lobby gom danh sach room, nut refresh va form tao room.
3. Khi chon `Enter room` hoac tao room moi, frontend chuyen sang man hinh `room access`.
4. O `room access`, nguoi dung nhap secret cua phong va goi API `join_room`.
5. Neu join thanh cong, frontend render `ChatView` cho phong da vao va giu trang thai hien tai qua reload.
6. Nguoi dung co the vao trang admin sau khi login bang tai khoan admin.
7. Trong admin dashboard, admin co the vao bat ky room nao va xoa room.
8. Trong chat view, nguoi dung bam nut action tren message de mo reply/edit/delete, sau do moi thuc hien hanh dong tuong ung.
9. Trong chat view, nguoi dung chi co the edit hoac delete chinh message cua minh.
10. Sau khi send, edit, hoac delete, frontend refresh lai message list theo flow polling hien co.

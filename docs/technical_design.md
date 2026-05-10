# Technical Design

## 1. Muc Dich

Tai lieu nay tom tat thiet ke ky thuat thuc te cua repo o thoi diem hien tai. Noi dung uu tien mo ta dung code dang co, khong mo ta them thanh phan chua ton tai trong backend hien tai.

## 2. Services

### 2.1 Backend service

- Vi tri: `backend/`
- Entry point: `backend/main.go`
- Framework: Gin
- Logging: Logrus JSON formatter + standard log
- Trach nhiem:
- khoi tao ket noi MongoDB
- khoi tao room service va message service
- dang ky REST API duoi `/api`
- lang nghe cong `PORT` hoac mac dinh `8080`

### 2.2 Frontend service

- Vi tri: `frontend/`
- Entry point: `frontend/src/index.js`
- App chinh: `frontend/src/App.jsx`
- Trach nhiem:
- render giao dien chat
- goi hoac tich hop voi backend URL qua `REACT_APP_BACKEND_URL`
- luu lai cac state chinh cua giao dien sau reload, bao gom username, admin auth state, va trang thai dang o lobby/room access/chat view/admin dashboard
- route admin login va admin dashboard rieng, tach khoi flow nguoi dung thuong
- admin dashboard co khu vuc quan ly room va khu vuc quan ly user
- hien action menu tren tung message theo kieu click-to-open, roi moi cho phep reply/edit/delete
- chi enable edit/delete cho message do chinh user tao
- co hook `socket.io-client` de mo phong ket noi realtime o frontend

### 2.3 MongoDB service

- Image trong compose: `mongo:7`
- Duoc backend truy cap qua `MONGO_URI`

### 2.4 Redis service

- Image trong compose: `redis:7-alpine`
- Dang co trong stack, nhung backend hien tai chua su dung truc tiep trong code Go

## 3. MongoDB Data Model

Backend tao `mongo.Client` qua `backend/models/database.go` va thao tac tren database `chat`.

### 3.1 Collection `rooms`

Truong du lieu dang duoc service ghi:

- `_id`: ID cua room neu duoc cung cap
- `name`: ten phong
- `password`: mat khau phong
- `created`: unix timestamp

### 3.2 Collection `messages`

Truong du lieu dang duoc service ghi:

- `_id`: ID cua message neu duoc cung cap
- `room_id`: ID phong
- `user`: ten hoac dinh danh nguoi gui
- `content`: noi dung tin nhan
- `file`: object metadata gom `name`, `url`, `size`, `content_type` khi co file dinh kem
- `reply_to`: snapshot toi thieu cua message duoc reply gom `id`, `user`, `content`
- `edited`: danh dau message da duoc sua
- `created`: unix timestamp
- `updated`: unix timestamp cua lan tao hoac sua gan nhat

### 3.3 Collection `users`

Truong du lieu dang duoc service ghi cho tai khoan quan tri:

- `_id`: ID cua user
- `username`: ten dang nhap
- `password_hash`: mat khau da hash
- `role`: `mod` hoac `admin`
- `created`: unix timestamp
- `updated`: unix timestamp cua lan gan nhat

## 4. API Endpoints Hien Co

Tat ca route nam duoi prefix `/api`.

### 4.1 Rooms

1. `GET /api/rooms`
   Tra ve danh sach tat ca room.
2. `POST /api/rooms`
   Nhan JSON room va tao room moi.
3. `GET /api/rooms/:id`
   Lay room theo `id`.
4. `POST /api/rooms/:id/join_room`
   Join room theo `id` voi `secret` va `user`; frontend co the reuse username da nhap truoc do de di nhanh qua luong join.
5. `DELETE /api/rooms/:id`
   Xoa room theo `id`.

### 4.2 Admin Auth and Users

1. `POST /api/admin/login`
   Xac thuc bang `username` va `password`, tra ve session hoac token de dung cho cac thao tac quan tri.
2. `GET /api/admin/me`
   Tra ve thong tin tai khoan admin dang dang nhap.
3. `GET /api/admin/users`
   Tra ve danh sach user quan tri `mod` va `admin`.
4. `POST /api/admin/users`
   Tao user moi voi `username`, `password`, va `role` la `mod` hoac `admin`. He thong phai dam bao chi co mot `admin` active tai mot thoi diem.
5. `DELETE /api/admin/users/:id`
   Xoa account `mod` hoac `admin` khac, voi rang buoc khong lam vi pham dieu kien chi co mot `admin` active.

### 4.3 Admin Rooms

1. `GET /api/admin/rooms`
   Tra ve danh sach room cho admin dashboard.
2. `POST /api/admin/rooms/:id/join_room`
   Admin vao room bat ky ma khong can secret room, sau khi da xac thuc.
3. `DELETE /api/admin/rooms/:id`
   Admin hoac mod xoa bat ky room nao, sau khi da xac thuc.
4. `DELETE /api/admin/rooms/:id/messages/:messageId`
   Admin hoac mod xoa bat ky message nao trong room.

### 4.4 Messages

1. `POST /api/rooms/:id/messages`
   Gui tin nhan vao room `:id`. Backend chap nhan JSON cu hoac `multipart/form-data` gom `user`, `content`, `secret`, `file` tuy chon, va `reply_to_id` tuy chon. Neu co `reply_to_id`, message dich phai thuoc cung room.
2. `GET /api/rooms/:id/messages`
   Lay danh sach tin nhan cua room `:id`, sap xep theo `created` tang dan, bao gom metadata file, reply, va trang thai edited neu co. Frontend render reply nhu mot block rieng, tach ro phan reply preview va phan noi dung chinh.
3. `PATCH /api/rooms/:id/messages/:messageId`
   Sua noi dung message trong room `:id`. Request body gom `secret`, `user`, `content`. Backend chi cho phep sua khi secret hop le va `user` trung voi `message.user`.
4. `DELETE /api/rooms/:id/messages/:messageId`
   Xoa message trong room `:id`. Request body gom `secret`, `user`. Backend chi cho phep xoa khi secret hop le va `user` trung voi `message.user`. Neu message co file local thi backend co gang xoa file da luu.

## 5. Environment Variables

### 5.1 Backend

- `MONGO_URI`: bat buoc. Neu khong co se dung `log.Fatal`.
- `PORT`: tuy chon. Mac dinh `8080`.

### 5.2 Frontend

- `REACT_APP_BACKEND_URL`: duoc set trong compose thanh `http://localhost:8081`.
- `REACT_APP_ADMIN_BACKEND_URL`: neu tach rieng admin API, frontend se dung bien nay de goi cac endpoint admin.
- `REACT_APP_ADMIN_SESSION_KEY`: key localStorage/sessionStorage de giu trang thai admin dang nhap sau reload.

## 6. Docker Services

Compose hien tai dinh nghia 4 services:

1. `backend`
   Build tu root `Dockerfile`, expose `8081:8080`.
2. `frontend`
   Build tu `frontend/Dockerfile`, expose `3000:3000`.
3. `mongo`
   Dung volume `mongo_data`.
4. `redis`
   Expose `6380:6379`.

## 7. Basic Flow

### 7.1 Backend startup flow

1. Doc `MONGO_URI`.
2. Tao `mongo.Client` va ping MongoDB.
3. Tao `RoomService` va `MessageService`.
4. Tao Gin router va dang ky routes.
5. Chay HTTP server tren cong `PORT`.

### 7.2 Room flow

1. Client goi `POST /api/rooms` de tao phong.
2. Backend ghi document vao collection `rooms`.
3. Client goi `GET /api/rooms` hoac `GET /api/rooms/:id` de doc lai du lieu.
4. Client goi `POST /api/rooms/:id/join_room` voi `user` va `secret`; frontend co the ghi nho username da nhap de reuse trong cac lan quay lai app sau, ke ca sau khi reload.
5. Admin hoac mod sau khi login co the goi endpoint admin de vao bat ky room nao ma khong can secret room.
6. Admin hoac mod sau khi login co the xoa bat ky room nao va xoa message trong room.
7. Admin dashboard co the tai danh sach room rieng tu `GET /api/admin/rooms`.
8. Chi admin co the quan ly user quan tri qua `GET /api/admin/users` va `POST /api/admin/users`.

### 7.3 Message flow

1. Client goi `POST /api/rooms/:id/messages` voi `secret` hop le, kem text, file, hoac ca hai.
2. Neu request co `reply_to_id`, backend doc message dich trong cung room va luu reply snapshot toi thieu vao message moi.
3. Neu co file, backend tao thu muc `uploads/` neu chua ton tai, luu file local, va ghi metadata file vao document message.
4. Backend expose file qua static route `/uploads/*`.
5. Tren frontend, cac action reply/edit/delete chi duoc mo ra sau khi nguoi dung click vao nut action cua message.
6. Client goi `PATCH /api/rooms/:id/messages/:messageId` de edit message cua chinh minh.
7. Client goi `DELETE /api/rooms/:id/messages/:messageId` de xoa message cua chinh minh.
8. Admin/mod goi `DELETE /api/admin/rooms/:id/messages/:messageId` de xoa message bat ky trong room.
9. Client goi `GET /api/rooms/:id/messages` de lay lich su tin nhan va render text, file, reply preview, va marker edited; message da sua phai hien nhan `edited` ro rang.

## 8. Gioi Han Hien Tai

- Backend hien tai chua co WebSocket endpoint.
- Frontend co ma mau cho `socket.io-client`, nhung chua co backend tuong ung.
- Redis chua duoc su dung trong ma backend hien tai.
- Compose dung MongoDB, nhung code service dang thao tac tren database `chat` thay vi ten database trong `MONGO_URI`.

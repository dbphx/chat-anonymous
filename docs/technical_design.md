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
- `created`: unix timestamp

## 4. API Endpoints Hien Co

Tat ca route nam duoi prefix `/api`.

### 4.1 Rooms

1. `GET /api/rooms`
   Tra ve danh sach tat ca room.
2. `POST /api/rooms`
   Nhan JSON room va tao room moi.
3. `GET /api/rooms/:id`
   Lay room theo `id`.
4. `DELETE /api/rooms/:id`
   Xoa room theo `id`.

### 4.2 Messages

1. `POST /api/rooms/:id/messages`
   Gui tin nhan vao room `:id`. Backend chap nhan JSON cu hoac `multipart/form-data` gom `user`, `content`, `secret`, va `file` tuy chon.
2. `GET /api/rooms/:id/messages`
   Lay danh sach tin nhan cua room `:id`, sap xep theo `created` tang dan, bao gom metadata file neu co.

## 5. Environment Variables

### 5.1 Backend

- `MONGO_URI`: bat buoc. Neu khong co se dung `log.Fatal`.
- `PORT`: tuy chon. Mac dinh `8080`.

### 5.2 Frontend

- `REACT_APP_BACKEND_URL`: duoc set trong compose thanh `http://localhost:8081`.

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

### 7.3 Message flow

1. Client goi `POST /api/rooms/:id/messages` voi `secret` hop le, kem text, file, hoac ca hai.
2. Neu co file, backend tao thu muc `uploads/` neu chua ton tai, luu file local, va ghi metadata file vao document message.
3. Backend expose file qua static route `/uploads/*`.
4. Client goi `GET /api/rooms/:id/messages` de lay lich su tin nhan va render link file.

## 8. Gioi Han Hien Tai

- Backend hien tai chua co WebSocket endpoint.
- Frontend co ma mau cho `socket.io-client`, nhung chua co backend tuong ung.
- Redis chua duoc su dung trong ma backend hien tai.
- Compose dung MongoDB, nhung code service dang thao tac tren database `chat` thay vi ten database trong `MONGO_URI`.

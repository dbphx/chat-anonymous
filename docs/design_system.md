# Thiet Ke He Thong Ung Dung Chat An Danh

## 1. Tong Quan Kien Truc

### 1.1 Mo Hinh He Thong

```text
[React Frontend] ---> [Go Gin Backend] ---> [MongoDB]
                         |
                         `--> [Redis]
```

### 1.2 Thanh Phan Chinh

- Frontend: React 18 chay bang Create React App
- Backend: Go service dung Gin de cung cap REST API
- Database: MongoDB de luu rooms va messages
- Redis: co mat trong compose cho cache hoac mo rong sau nay
- Docker Compose: dung de chay dong thoi frontend, backend, mongo, redis

## 2. Kien Truc Backend Hien Tai

```text
backend/
|- main.go               # Khoi tao DB, services, handlers va routes
|- go.mod                # Backend module thuc te
|- handlers/
|  `- handler.go         # RoomHandler va MessageHandler
|- models/
|  |- database.go        # Ket noi MongoDB qua MONGO_URI
|  `- models.go          # Cau truc Room va Message
`- services/
   `- service.go         # Logic CRUD cho rooms va messages
```

## 3. Kien Truc Frontend Hien Tai

```text
frontend/
|- src/index.js          # Frontend entry point
|- src/App.jsx           # App chinh
|- src/views/ChatView.jsx
|- src/components/
`- src/services/websocket.js
```

- `src/index.js` mount ung dung React.
- `src/App.jsx` render `ChatView` voi `roomId` hardcode.
- `src/services/websocket.js` dung `socket.io-client`, nhung backend hien tai khong expose socket endpoint tuong ung.

## 4. Luu Tru Du Lieu

Backend dang ket noi MongoDB bang `MONGO_URI` va thao tac truc tiep tren database `chat`.

### 4.1 Collections

- `rooms`: luu thong tin phong gom `name`, `password`, `created`
- `messages`: luu tin nhan gom `room_id`, `user`, `content`, `created`

## 5. API Layer

Routes duoc khai bao trong `backend/main.go` duoi prefix `/api`:

- `GET /api/rooms`
- `POST /api/rooms`
- `GET /api/rooms/:id`
- `DELETE /api/rooms/:id`
- `POST /api/rooms/:id/messages`
- `GET /api/rooms/:id/messages`

## 6. Docker Compose Hien Tai

```yaml
version: "3.8"
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8081:8080"
    environment:
      - MONGO_URI=mongodb://mongo:27017/chat_anonymous
    depends_on:
      - mongo

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    environment:
      - REACT_APP_BACKEND_URL=http://localhost:8081

  mongo:
    image: mongo:7

  redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"
```

## 7. Cau Truc Thu Muc Root

```text
.
|- backend/
|- docs/
|- frontend/
|- Dockerfile
`- docker-compose.yml
```

Root `go.mod` khong thuoc backend module dang duoc build va nen duoc loai bo de tranh hieu nham.

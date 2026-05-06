# Chat Anonymous

Ung dung chat an danh gom backend Go/Gin, frontend React (Create React App), MongoDB de luu du lieu, va Redis trong docker compose.

## Stack hien tai

- Backend: Go 1.21 + Gin
- Frontend: React 18 + Create React App
- Database: MongoDB
- Cache/service bo tro: Redis
- Container: Docker Compose

## Cau truc thu muc

```text
.
|- backend/              # Go backend module duoc su dung thuc te
|  |- handlers/         # HTTP handlers
|  |- models/           # MongoDB connection va data models
|  |- services/         # Room/message services
|  |- go.mod            # Go module cua backend
|  `- main.go           # Entry point backend
|- docs/                # Tai lieu du an
|- frontend/            # React frontend (CRA)
|  |- src/index.js      # Frontend entry point
|  `- src/App.jsx       # App component chinh
|- Dockerfile           # Dockerfile cho backend
`- docker-compose.yml   # Stack: backend, frontend, mongo, redis
```

## Cach chay

### Yeu cau

- Docker
- Docker Compose

### Khoi dong toan bo stack

```bash
docker-compose up --build
```

## URL mac dinh

- Frontend: http://localhost:3000
- Backend API: http://localhost:8081/api
- MongoDB trong compose: `mongo:27017`
- Redis host port: `localhost:6380`

## Bien moi truong hien tai

### Backend

- `MONGO_URI` - chuoi ket noi MongoDB, vi du `mongodb://mongo:27017/chat_anonymous`
- `PORT` - cong backend ben trong container, mac dinh `8080`

### Frontend

- `REACT_APP_BACKEND_URL` - URL backend public cho frontend, dang duoc set thanh `http://localhost:8081`

## API hien co

- `GET /api/rooms` - lay danh sach phong
- `POST /api/rooms` - tao phong moi
- `GET /api/rooms/:id` - lay thong tin phong
- `DELETE /api/rooms/:id` - xoa phong
- `POST /api/rooms/:id/messages` - gui tin nhan vao phong
- `GET /api/rooms/:id/messages` - lay lich su tin nhan cua phong

## Ghi chu ve trang thai hien tai

- Backend hien tai luu du lieu trong MongoDB database `chat` voi collections `rooms` va `messages`.
- Docker Compose khong con Postgres.
- Frontend co hook `socket.io-client`, nhung backend hien tai chi expose REST API va chua co WebSocket endpoint tuong ung.

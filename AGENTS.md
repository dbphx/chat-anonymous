# Hướng Dẫn Sử Dụng Agent

## Yêu Cầu Trước Khi Thực Hiện Tác Vụ

Trước khi agent thực hiện bất kỳ tác vụ nào, agent **phải** đọc và hiểu các tài liệu hiện có trong thư mục `docs/`:

### 1. Tài Liệu Cần Đọc Trước

Agent cần đọc kỹ các tài liệu sau:
- `docs/requirements.md` - Yêu cầu chức năng và phi chức năng
- `docs/design_system.md` - Thiết kế hệ thống và kiến trúc
- `docs/technical_design.md` - Thiết kế kỹ thuật chi tiết

### 2. Nội Dung Cần Hiểu

Khi đọc tài liệu, agent cần nắm bắt được:
- **Yêu cầu chức năng**: Các tính năng chính của ứng dụng chat ẩn danh
- **Kiến trúc hệ thống**: Mô hình kiến trúc và các thành phần
- **Database schema**: Cấu trúc cơ sở dữ liệu và bảng
- **API endpoints**: Các điểm cuối API và chức năng
- **Các tính năng đặc biệt**: Phòng riêng tư, quản lý tin nhắn, tích hợp icon

### 3. Quy Trình Thực Hiện

Sau khi đọc tài liệu, agent phải:
1. **Tóm tắt các yêu cầu chính**
2. **Xác định các thành phần cần thiết**
3. **Lập kế hoạch thực hiện theo kiến trúc đã thiết kế**
4. **Trình bày kế hoạch trước khi thực hiện**

### 3.1. Yêu Cầu Build Sau Khi Thay Đổi

Sau mỗi lần thay đổi code hoặc cấu hình có ảnh hưởng tới runtime hoặc build, agent phải build lại Docker image tương ứng.

Nếu không xác định rõ thay đổi chỉ ảnh hưởng service nào, agent ưu tiên chạy `docker compose build`.

Agent phải báo cáo kết quả build trong phản hồi cuối.

### 4. Mục Tiêu

Việc đọc tài liệu trước khi thực hiện giúp:
- Đảm bảo tuân thủ thiết kế hệ thống hiện có
- Tránh thực hiện các chức năng không phù hợp
- Tăng hiệu quả trong quá trình phát triển
- Giữ consistency với kiến trúc tổng thể

### 5. Ví Dụ Thực Hiện

Trước khi lập kế hoạch hoặc thực hiện bất kỳ tác vụ nào, agent phải:
```bash
# Đọc các tài liệu
cat docs/requirements_vietnamese.md
cat docs/design_system.md

# Tóm tắt các yêu cầu chính
# Lập kế hoạch tuân thủ thiết kế hệ thống
```

Agent **không được phép** thực hiện bất kỳ tác vụ nào nếu chưa đọc và hiểu các tài liệu yêu cầu.

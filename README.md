# StudySpace - Cloud Student Management (Coolify PaaS)

Hệ thống quản lý sinh viên thiết kế chuẩn để triển khai trên nền tảng PaaS mã nguồn mở **Coolify**.

## Tính năng nổi bật
- Giao diện Dashboard thống kê sinh viên, giảng viên, biểu đồ thành tích & xếp loại học lực.
- CRUD Sinh viên (Thêm, Xem, Tìm kiếm, Xóa) kết nối trực tiếp với **PostgreSQL** trên Coolify qua biến môi trường `DATABASE_URL`.
- Tự động chuyển sang chế độ *In-Memory Demo Mode* nếu chưa gắn Database (giúp test build nhanh không lỗi).
- Tích hợp sẵn API `/api/health` hiển thị thông tin Container Hostname & trạng thái PaaS để trình diễn khi bảo vệ đồ án.

MINI STORE - BÀI TẬP AXIOS

Cách chạy:
1. Giải nén thư mục mini-store.
2. Mở thư mục bằng VS Code.
3. Chạy index.html bằng Live Server (khuyên dùng).
   Hoặc mở index.html trực tiếp trên trình duyệt nếu CDN và mạng hoạt động.

Các chức năng:
- Axios + async/await, Axios instance, timeout và response interceptor.
- Tải sản phẩm, trạng thái loading / empty / error, nút thử lại.
- Render DOM bằng createElement và textContent.
- Tìm kiếm debounce 400ms, hủy request bằng AbortController.
- Lọc danh mục, sắp xếp từ server, phân trang.
- Promise.all tải danh mục và sản phẩm song song.
- Modal chi tiết, ảnh và đánh giá.

Lưu ý:
- Giá đang hiển thị theo USD vì API DummyJSON cung cấp giá USD.
- DummyJSON là API demo. Các thao tác ghi dữ liệu (nếu bổ sung) không lưu vĩnh viễn.
- Nếu muốn đổi API dự phòng của lớp, thay baseURL trong axios.create().

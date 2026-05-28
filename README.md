# Veyl - Anonymous Real-time Chat Platform

Veyl là một nền tảng trò chuyện ẩn danh thời gian thực, tập trung tối đa vào tính bảo mật, sự riêng tư và trải nghiệm người dùng cao cấp. Dự án được thiết kế với giao diện tối giản hiện đại (Obsidian dark tones) kết hợp cùng hiệu ứng kính mờ (glassmorphism) sang trọng. Toàn bộ tin nhắn và dữ liệu người dùng sẽ được tự động xóa sạch hoàn toàn khỏi cơ sở dữ liệu khi phòng chat kết thúc, đảm bảo không lưu lại bất kỳ dấu vết kỹ thuật số nào.

## Các tính năng cốt lõi

Nền tảng cung cấp các trải nghiệm trò chuyện ẩn danh tối ưu bao gồm:

- Tham gia tức thì: Người dùng không cần tạo tài khoản hay đăng ký thông tin phức tạp. Chỉ cần nhập một biệt danh ẩn danh ngẫu nhiên là có thể bắt đầu tạo hoặc tham gia phòng.
- Cơ chế tự hủy (Self-Destruct): Mỗi phòng chat được giới hạn thời gian hoạt động tối đa là 5 giờ. Hết thời gian này, phòng chat cùng toàn bộ dữ liệu liên quan sẽ tự động biến mất vĩnh viễn.
- Mã mời giới hạn thời gian: Chủ phòng có thể tạo mã mời gồm 6 chữ số có hiệu lực trong 5 phút. Khi bất kỳ thành viên đang hoạt động nào trong phòng copy mã phòng để mời bạn bè, thời gian hết hạn của mã mời sẽ được tự động gia hạn thêm 5 phút một cách thông minh, giúp người mới có thể join phòng liên tục mà không bị gián đoạn.
- Tro chuyen Real-time sieu toc: Hệ thống tin nhắn và danh sách thành viên đang hoạt động được đồng bộ thời gian thực thông qua cơ sở dữ liệu Supabase Realtime Engine.
- Bao mat va gioi han tan suat: Tích hợp bộ bảo vệ chống spam tin nhắn (Rate Limiter) ở cả client-side và database-level, giới hạn tối đa 5 tin nhắn trong 3 giây để ngăn chặn các cuộc tấn công spam phòng.
- Tinh nang rut lui an toan: Khi chủ phòng chọn kết thúc cuộc trò chuyện, phòng chat sẽ bị xóa vĩnh viễn và các thành viên khác sẽ được điều hướng lịch sự về trang báo phòng đã đóng. Thành viên thông thường cũng có thể chủ động rời phòng ẩn danh bất cứ lúc nào.

## Cong nghe su dung

- Core Framework: Next.js (App Router, Server Actions)
- Styling: Tailwind CSS
- Real-time Engine & Database: Supabase (Postgres Database, Real-time PostgreSQL Replication, Real-time Presence)
- Icons: Material Symbols Outlined, Lucide React
- Interactive Animations: Canvas Confetti, custom CSS keyframe animations

## Co so du lieu (Supabase Schema)

Hệ thống hoạt động dựa trên 3 bảng Postgres được thiết kế quan hệ chặt chẽ:

1. Bảng rooms (Quản lý phòng chat):
   - id: Khóa chính (UUID), định danh duy nhất của phòng chat.
   - host_session_id: ID phiên của chủ phòng.
   - invite_code: Mã mời gồm 6 chữ số ngẫu nhiên.
   - code_expire_at: Thời gian hết hạn của mã mời (mặc định khởi tạo 5 phút, tự động gia hạn khi copy).
   - room_expire_at: Thời gian tự hủy của phòng chat (mặc định 5 giờ).
   - status: Trạng thái phòng (active/ended).

2. Bảng room_members (Thành viên trong phòng):
   - id: Khóa chính tự tăng.
   - room_id: Khóa ngoại liên kết với bảng rooms (Tự động xóa hàng loạt - Cascade Delete khi room bị xóa).
   - session_id: ID phiên ẩn danh của thành viên.
   - nickname: Biệt danh hoạt động của thành viên trong phòng.
   - joined_at: Thời điểm tham gia phòng.

3. Bảng messages (Luồng tin nhắn):
   - id: Khóa chính (UUID) của tin nhắn.
   - room_id: Khóa ngoại liên kết với bảng rooms (Tự động xóa hàng loạt - Cascade Delete khi room bị xóa).
   - sender_nickname: Biệt danh của người gửi.
   - content: Nội dung tin nhắn (tối đa 500 ký tự).
   - created_at: Thời điểm gửi tin nhắn.

## Huong dan cai dat va chay thu

Để khởi chạy dự án Veyl ở môi trường máy cục bộ của bạn, hãy làm theo các bước sau:

1. Di chuyển vào thư mục dự án:
   cd veyl

2. Cài đặt các thư viện phụ thuộc:
   npm install

3. Thiết lập biến cấu hình:
   Tạo tệp .env.local ở thư mục gốc và nhập cấu hình kết nối Supabase của bạn:
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

4. Chạy dự án ở chế độ phát triển:
   npm run dev

5. Truy cập ứng dụng:
   Mở trình duyệt và truy cập đường dẫn: http://localhost:3000

## Trien khai (Deployment)

Dự án được tối ưu hóa tối đa để triển khai tức thì lên nền tảng Vercel thông qua việc liên kết kho lưu trữ GitHub. Chú ý cấu hình đầy đủ 2 biến môi trường NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY trong bảng điều khiển của Vercel khi deploy để dự án hoạt động trơn tru.

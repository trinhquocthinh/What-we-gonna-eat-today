# ADR-4: RLS chỉ để access control, lọc Personalization ở RPC

## Quyết định

Row Level Security (RLS) của Supabase **chỉ dùng để kiểm soát truy cập (access control)**. Các logic cá nhân hóa (ví dụ: Cannot Eat, Blacklist) sẽ được lọc ở **tầng RPC query layer**.

## Lý do

- Đúng bản chất của RLS (kiểm soát quyền truy cập, không rò rỉ dữ liệu của candidate cho user khác).
- Việc lọc logic nghiệp vụ phức tạp ở RPC dễ quản lý, linh hoạt hơn và tránh gây nhầm lẫn về mặt bảo mật.

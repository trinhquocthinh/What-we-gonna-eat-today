# ADR-2: Ranking tổng hợp vote bằng Postgres RPC/View

## Quyết định

Thực hiện việc ranking tổng hợp vote thuần túy thông qua **Postgres RPC/View**. Edge Function chỉ được dùng cho Suitability Score, cold-start, merge, hoặc tạo warnings.

## Lý do

- Tận dụng sức mạnh aggregate của Postgres giúp query nhanh hơn.
- Đảm bảo tính transactional và nhất quán của dữ liệu tốt hơn so với xử lý ngoài DB.

# ADR-1: Supabase Edge Functions cho business logic phức tạp

## Quyết định

Sử dụng **Supabase Edge Functions (Deno)** cho toàn bộ business logic phức tạp.

## Lý do

- Sát DB, độ trễ (latency) thấp.
- Sử dụng service role gọn nhẹ, bảo mật cao.
- Phù hợp với kiến trúc serverless của Supabase.

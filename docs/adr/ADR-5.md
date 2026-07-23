# ADR-5: Session expiration bằng pg_cron

## Quyết định

Sử dụng **pg_cron** để thực hiện việc Session expiration (đánh dấu hết hạn khi hết deadline hoặc hết ngày). Fallback là sử dụng Scheduled Edge Function.

## Lý do

- `$0` chi phí, chạy trực tiếp trong DB (Supabase có hỗ trợ `pg_cron`).
- Giảm thiểu việc phụ thuộc quá nhiều vào cron bên ngoài hoặc gọi Edge Function liên tục.

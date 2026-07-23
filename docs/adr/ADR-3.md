# ADR-3: Duplicate detection và Merge dùng pg_trgm

## Quyết định

Sử dụng extension `pg_trgm` của PostgreSQL cho tính năng phát hiện trùng lặp (Duplicate detection) và Merge ngay trong bản MVP.

## Lý do

- Cần thiết để cải thiện trải nghiệm người dùng ngay từ bản demo đầu tiên.
- Trigram similarity (`pg_trgm`) đủ nhanh và tốt cho việc fuzzy search tên món ăn mà không cần hệ thống search phức tạp.

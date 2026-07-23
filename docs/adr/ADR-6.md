# ADR-6: Cannot Eat là dietary exclusion, KHÔNG phải allergy safety

## Quyết định

Hệ thống xử lý tính năng `Cannot Eat` dưới dạng **dietary exclusion (loại trừ theo sở thích ăn uống/chế độ ăn)**. Hệ thống **KHÔNG** đảm bảo tính an toàn về mặt dị ứng (allergy safety).

## Lý do

- Phù hợp với Business Rules 11.1 (quản lý dị ứng nằm ngoài phạm vi - out of scope).
- Giảm thiểu rủi ro pháp lý và trách nhiệm đối với sức khỏe người dùng, định hướng ứng dụng chỉ ở mức hỗ trợ ra quyết định nhóm vui vẻ.

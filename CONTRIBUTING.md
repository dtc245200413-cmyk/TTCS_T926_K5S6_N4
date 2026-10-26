# Hướng dẫn đóng góp

## Quy tắc nhánh

- Không phát triển trực tiếp trên `main`.
- Tạo nhánh riêng cho một story hoặc một nhóm thay đổi, ví dụ `feature/SCRUM-58-profile`.
- Cập nhật nhánh từ `main` trước khi bắt đầu nếu phù hợp với quy trình của nhóm.
- Chỉ đưa lên nhánh các file liên quan đến nhiệm vụ đang làm.

## Quy tắc commit

Dùng commit message ngắn, nêu rõ mục đích, ví dụ:

- `feat: add recruitment request assignment`
- `fix: validate job posting deadline`
- `test: cover job posting service`
- `docs: update local setup instructions`

Mỗi commit nên đại diện cho một thay đổi có ý nghĩa, dễ đọc và có thể xem xét độc lập. Không tạo commit rỗng hoặc chia nhỏ thay đổi chỉ để tăng số lượng commit.

## Trước khi push

1. Chạy các kiểm thử có sẵn trong `Backend`.
2. Kiểm tra `git status` và `git diff`.
3. Đảm bảo không đưa `.env`, `node_modules`, mật khẩu hoặc token vào commit.
4. Push đúng nhánh feature và tạo Pull Request nếu nhóm yêu cầu.

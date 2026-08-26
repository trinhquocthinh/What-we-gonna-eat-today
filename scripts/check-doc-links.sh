#!/usr/bin/env bash
# Kiểm tra mọi liên kết tương đối trong tài liệu có trỏ tới file thật hay không.
#
# Vì sao cần: tên file tài liệu mang số phiên bản (`..._sdd_v1.2.md`), nên mỗi
# lần bump version là đổi tên file — và mọi link trỏ tới nó gãy im lặng. Đợt
# bump ngày 2026-08-26 làm gãy 357 link trong docs/, README và comment mã nguồn
# mà không có gì báo. Markdown không có trình biên dịch; script này là thứ duy
# nhất đứng giữa một lần đổi tên và một bộ tài liệu không đọc được.
#
# Chỉ kiểm tra ĐÍCH CÓ TỒN TẠI, không kiểm tra anchor `#...` — anchor sai vẫn
# mở được file, còn file sai thì không mở được gì.
#
# Chạy: bash scripts/check-doc-links.sh (đã nối vào `yarn verify`)

set -euo pipefail
cd "$(dirname "$0")/.."

failures=0
checked=0

# Nguồn quét: mọi tài liệu markdown, cộng các file markdown ở gốc repo.
while IFS= read -r -d '' doc; do
  dir=$(dirname "$doc")

  # `grep -n` để giữ số dòng — báo lỗi không kèm số dòng thì phải tự đi tìm.
  while IFS= read -r hit; do
    line=${hit%%:*}
    target=${hit#*:}

    # Bỏ phần tiêu đề tuỳ chọn của markdown: [text](path "title")
    target=${target%% *}
    # Bỏ anchor.
    target=${target%%#*}

    # Link ngoài, mailto, anchor thuần, hoặc `()` rỗng — không phải việc của script.
    case "$target" in
      http://* | https://* | mailto:* | '') continue ;;
    esac

    # `%20` là cách markdown mã hoá dấu cách trong đường dẫn.
    target=${target//%20/ }

    checked=$((checked + 1))
    if [ ! -e "$dir/$target" ]; then
      printf '%s:%s: link gãy → %s\n' "$doc" "$line" "$target" >&2
      failures=$((failures + 1))
    fi
  done < <(grep -noE '\]\([^)]+\)' "$doc" | sed -E 's/^([0-9]+):\]\((.*)\)$/\1:\2/')
done < <(find docs -name '*.md' -print0; find . -maxdepth 1 -name '*.md' -print0)

if [ "$failures" -gt 0 ]; then
  printf '\n%d/%d liên kết gãy.\n' "$failures" "$checked" >&2
  exit 1
fi

printf '%d liên kết tương đối, không cái nào gãy.\n' "$checked"

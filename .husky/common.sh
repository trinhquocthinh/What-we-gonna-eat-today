# Git hook chạy với môi trường tối giản, không phải shell tương tác của bạn:
# thường là Node mặc định của máy và `yarn` classic 1.x. Cả hai đều sai cho repo
# này, và khi sai thì hook hỏng theo kiểu khó đoán chứ không báo thẳng.
#
# Nạp nvm theo .nvmrc nếu có, rồi khẳng định đúng phiên bản trước khi chạy tiếp.

if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1
  nvm use >/dev/null 2>&1 || true
fi

node_major=$(node -v 2>/dev/null | sed 's/^v\([0-9]*\).*/\1/')
if [ "$node_major" != "24" ]; then
  echo "✖ Cần Node 24 (đang dùng: $(node -v 2>/dev/null || echo 'không có node'))."
  echo "  Chạy: nvm install && nvm use"
  exit 1
fi

# `yarn` trên PATH thường là classic 1.x nếu chưa chạy `corepack enable`. Trường
# hợp đó vẫn chạy được bằng cách gọi qua corepack, nên chỉ cảnh báo thay vì chặn
# — hook chặn commit vì lý do môi trường là cách nhanh nhất để người ta gỡ hook.
yarn_major=$(yarn --version 2>/dev/null | cut -d. -f1)
if [ "$yarn_major" != "4" ]; then
  if command -v corepack >/dev/null 2>&1; then
    yarn() { corepack yarn "$@"; }
  else
    echo "✖ Cần yarn 4 (đang dùng: $(yarn --version 2>/dev/null || echo 'không có yarn'))."
    echo "  Chạy: corepack enable"
    exit 1
  fi
fi

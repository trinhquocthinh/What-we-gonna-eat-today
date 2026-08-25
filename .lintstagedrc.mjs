export default {
  // `--max-warnings 0` để cảnh báo không tích tụ thành nền nhiễu rồi bị bỏ qua.
  '*.{ts,tsx,mjs}': ['eslint --fix --max-warnings 0', 'prettier --write'],
  '*.{json,css,md,yml,yaml}': ['prettier --write'],
}

#!/bin/bash
# 同步各项目 docs/ 到 VitePress 站点
# 用法: bash docs/sync-project-docs.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=== 同步项目文档到 VitePress 站点 ==="

# AI 平台文档
echo "  ai/docs/ -> docs/ai/"
rm -rf "${SCRIPT_DIR}/ai"
cp -r "${ROOT_DIR}/ai/docs" "${SCRIPT_DIR}/ai"

# Editor 文档
echo "  editor/docs/ -> docs/editor/"
rm -rf "${SCRIPT_DIR}/editor"
cp -r "${ROOT_DIR}/editor/docs" "${SCRIPT_DIR}/editor"

# Server 文档
if [ -d "${ROOT_DIR}/server/docs" ]; then
  echo "  server/docs/ -> docs/server/"
  rm -rf "${SCRIPT_DIR}/server"
  cp -r "${ROOT_DIR}/server/docs" "${SCRIPT_DIR}/server"
fi

# Flow 文档
if [ -d "${ROOT_DIR}/flow/docs" ]; then
  echo "  flow/docs/ -> docs/flow/"
  rm -rf "${SCRIPT_DIR}/flow"
  cp -r "${ROOT_DIR}/flow/docs" "${SCRIPT_DIR}/flow"
fi

# Shared 文档
if [ -d "${ROOT_DIR}/shared/docs" ]; then
  echo "  shared/docs/ -> docs/shared/"
  rm -rf "${SCRIPT_DIR}/shared"
  cp -r "${ROOT_DIR}/shared/docs" "${SCRIPT_DIR}/shared"
fi

echo "=== 同步完成 ==="

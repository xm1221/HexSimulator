#!/usr/bin/env bash
# Print everything needed to point https://hexsim.xm1221.cn at this codespace.
#
#   bash .devcontainer/hexcli-info.sh
#
# Prints the public URL for the forwarded HexCLI port and the proxy token that the
# HexSimulator settings panel asks for. Both are per-codespace values; nothing is
# written into the repository.
set -euo pipefail

PROXY_PORT="${HEXCLI_PROXY_PORT:-8742}"
CACHE_DIR="${HEXCLI_CACHE_DIR:-$HOME/.cache/hexcli}"
TOKEN_FILE="${HEXCLI_PROXY_TOKEN_FILE:-$CACHE_DIR/proxy-token}"

# Codespaces sets CODESPACE_NAME + GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN.
CODESPACE_NAME="${CODESPACE_NAME:-}"
DOMAIN="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"

echo "HexCLI backend for HexSimulator"
echo

if [ -n "$CODESPACE_NAME" ]; then
  echo "  Base URL : https://${CODESPACE_NAME}-${PROXY_PORT}.${DOMAIN}"
else
  echo "  Base URL : (not running in a codespace)"
  echo "             https://<codespace-name>-${PROXY_PORT}.app.github.dev"
  echo "             <codespace-name> is in the Codespaces URL / 'gh codespace list'."
fi

echo "  Token    : $(cat "$TOKEN_FILE" 2>/dev/null || echo '(no token file yet; start the backend first)')"
echo

echo "  Make the port public (once per codespace, if it is not already):"
if [ -n "$CODESPACE_NAME" ]; then
  echo "    gh codespace ports visibility ${PROXY_PORT}:public -c ${CODESPACE_NAME}"
else
  echo "    gh codespace ports visibility ${PROXY_PORT}:public -c <codespace-name>"
fi
echo

if command -v curl >/dev/null 2>&1; then
  echo "  Local health check:"
  curl -fsS -m 5 "http://127.0.0.1:${PROXY_PORT}/v1/health" 2>/dev/null \
    || echo "    (not answering yet — run: bash .devcontainer/start-hexcli.sh)"
  echo
fi

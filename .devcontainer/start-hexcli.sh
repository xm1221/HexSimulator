#!/usr/bin/env bash
# Start HexCLI as a HexSimulator backend inside a GitHub Codespace.
#
# Runs from `.devcontainer/devcontainer.json` -> `postStartCommand`, i.e. on every
# start *and* every wake-up after the codespace went idle. It must therefore be
# idempotent and cheap when everything is already running.
#
# What it does:
#   1. reuses the front proxy if it is already listening (fast path);
#   2. installs HexCLI with the MieLib one-click installer on first run
#      (nothing third-party is committed to this repo; every jar is downloaded
#      and sha512-verified by that installer);
#   3. makes sure the MieLib jar in the server's `mods/` actually contains the
#      HexCLI HTTP endpoint, building MieLib from source only when it does not;
#   4. starts the Minecraft server in the background (logs to a file), waits for
#      `hexcli/http.json`, then starts the proxy in the background.
#
# Everything it creates lives under ${HEXCLI_CACHE_DIR:-~/.cache/hexcli}, i.e.
# outside the repository, so no server jar, mod, world or token is ever committed.
#
# Usage:
#   bash .devcontainer/start-hexcli.sh              # idempotent start (postStartCommand)
#   bash .devcontainer/start-hexcli.sh --status     # is it up? what is the URL?
#   bash .devcontainer/start-hexcli.sh --stop       # stop server + proxy
#   bash .devcontainer/start-hexcli.sh --restart    # stop, then start
set -euo pipefail

CACHE_DIR="${HEXCLI_CACHE_DIR:-$HOME/.cache/hexcli}"
INSTALLER_DIR="$CACHE_DIR/installer"      # one-click installer (scripts + utils)
SERVER_DIR="$CACHE_DIR/server"            # Minecraft server run dir
SRC_DIR="$CACHE_DIR/mielib-src"           # MieLib source checkout (only if needed)
LOG_DIR="$CACHE_DIR/logs"
PROXY_PORT="${HEXCLI_PROXY_PORT:-8742}"
UPSTREAM_PORT="${HEXCLI_UPSTREAM_PORT:-8743}"
PROXY_TOKEN_FILE="${HEXCLI_PROXY_TOKEN_FILE:-$CACHE_DIR/proxy-token}"
BASE_URL="${HEXCLI_INSTALLER_URL:-https://github.com/xm1221/MieLib/releases/download/hexcli-v1.0.0}"
INSTALLER_ARCHIVE="${HEXCLI_INSTALLER_ARCHIVE:-hexcli-1.0.0-linux.tar.gz}"
HEXCLI_CORS_ORIGINS="${HEXCLI_CORS_ORIGINS:-}"

SERVER_LOG="$LOG_DIR/hexcli-server.log"
PROXY_LOG="$LOG_DIR/hexcli-proxy.log"
SERVER_PID_FILE="$CACHE_DIR/hexcli-server.pid"
PROXY_PID_FILE="$CACHE_DIR/hexcli-proxy.pid"

mkdir -p "$CACHE_DIR" "$LOG_DIR"

log() { printf '[hexcli-start] %s\n' "$*"; }
fail() { printf '[hexcli-start] error: %s\n' "$*" >&2; exit 1; }

# ---- helpers ---------------------------------------------------------------

proxy_listening() {
  # `ss`/`nc` are not in every image; a plain TCP connect via bash's /dev/tcp is
  # enough, and it runs in a subshell so the descriptor never leaks.
  (exec 3<>"/dev/tcp/127.0.0.1/$PROXY_PORT") 2>/dev/null
}

server_ready() {
  [ -f "$SERVER_DIR/hexcli/http.json" ] || return 1
  curl -fsS -m 3 "http://127.0.0.1:$UPSTREAM_PORT/v1/health" >/dev/null 2>&1
}

java_bin() {
  if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/java" ]; then
    printf '%s\n' "$JAVA_HOME/bin/java"
    return 0
  fi
  command -v java 2>/dev/null || return 1
}

# Does this MieLib jar contain the HexCLI HTTP endpoint (HexCliHttp.class)?
jar_has_http_endpoint() {
  local jar="$1"
  [ -f "$jar" ] || return 1
  # `unzip -l` avoids needing a JDK for the check.
  # Read the whole listing first: `grep -q` exiting early would SIGPIPE unzip,
  # and with `pipefail` that turns a match into a failure.
  local listing
  listing=$(unzip -l "$jar" 2>/dev/null) || return 1
  grep -q 'cn/xm1221/MieLib/hexcli/remote/HexCliHttp.class' <<<"$listing"
}

mielib_jar_in_mods() {
  find "$SERVER_DIR/mods" -maxdepth 1 -name 'mielib-fabric-*.jar' ! -name '*-sources*' \
    ! -name '*-dev*' 2>/dev/null | head -n 1
}

# ---- 1. fast path ----------------------------------------------------------

case "${1:-}" in
  --status)
    if proxy_listening && server_ready; then
      log "running: HTTP $PROXY_PORT -> $UPSTREAM_PORT"
      curl -fsS -m 3 "http://127.0.0.1:$PROXY_PORT/v1/health" || true
      printf '\n'
      log "logs: $SERVER_LOG $PROXY_LOG"
      exit 0
    fi
    log "not running"
    exit 1
    ;;
  --stop)
    for f in "$PROXY_PID_FILE" "$SERVER_PID_FILE"; do
      if [ -f "$f" ]; then
        pid=$(cat "$f")
        kill "$pid" 2>/dev/null || true
        rm -f "$f"
      fi
    done
    # The server runs in its own process group; ask it to stop cleanly first.
    pkill -f "fabric-server-launch.jar" 2>/dev/null || true
    sleep 3
    pkill -9 -f "fabric-server-launch.jar" 2>/dev/null || true
    log "stopped"
    exit 0
    ;;
  --restart)
    "$0" --stop || true
    ;;
esac

if proxy_listening && server_ready; then
  log "already running on port $PROXY_PORT; nothing to do"
  log "run 'bash .devcontainer/start-hexcli.sh --status' for the URL / --restart to restart"
  exit 0
fi

# ---- 2. one-click installer (first run) ------------------------------------

installer_present() {
  [ -f "$INSTALLER_DIR/install.sh" ] \
    && [ -f "$INSTALLER_DIR/hexcli-installer.jar" ] \
    && [ -f "$INSTALLER_DIR/hexcli-client.jar" ]
}

install_hexcli() {
  if installer_present && [ -f "$SERVER_DIR/fabric-server-launch.jar" ]; then
    log "HexCLI is already installed in $SERVER_DIR"
    return 0
  fi
  log "installing HexCLI with the MieLib one-click installer ($BASE_URL/$INSTALLER_ARCHIVE)"
  mkdir -p "$INSTALLER_DIR"
  local archive="$CACHE_DIR/$INSTALLER_ARCHIVE"
  if [ ! -f "$archive" ]; then
    curl -fSL --retry 3 --connect-timeout 30 -o "$archive" "$BASE_URL/$INSTALLER_ARCHIVE" \
      || fail "could not download $BASE_URL/$INSTALLER_ARCHIVE"
  fi
  tar -xzf "$archive" -C "$INSTALLER_DIR"
  chmod +x "$INSTALLER_DIR/install.sh"

  # -y accepts https://aka.ms/MinecraftEULA without a prompt (this is a CI-like
  # context with no TTY). Everything the installer downloads is sha512-checked.
  #
  # JAVA_HOME is used when it is 17+, so the devcontainer feature's JDK is reused
  # instead of pulling a second private runtime into the cache.
  HEXCLI_PROGRESS=0 "$INSTALLER_DIR/install.sh" -y --dir "$SERVER_DIR" \
    >"$LOG_DIR/install.log" 2>&1 \
    || { tail -n 40 "$LOG_DIR/install.log" >&2; fail "the HexCLI installer failed (see $LOG_DIR/install.log)"; }
  log "installer finished (log: $LOG_DIR/install.log)"
}

install_hexcli

# ---- 3. make sure the MieLib jar has the HTTP endpoint ---------------------

# The `hexcli-v1.0.0` release jar predates the HTTP endpoint (HexCliHttp), so the
# installer's copy only supports the TCP remote that browsers cannot speak. When
# that is the case, build MieLib from source once and drop the result into mods/.
# The jar is downloaded/built locally and is never committed to this repository.
ensure_http_capable_mielib() {
  local jar
  jar=$(mielib_jar_in_mods || true)
  if [ -n "$jar" ] && jar_has_http_endpoint "$jar"; then
    log "MieLib jar already has the HTTP endpoint: $(basename "$jar")"
    return 0
  fi

  log "the installed MieLib jar has no HexCLI HTTP endpoint; building MieLib from source"
  local java
  java=$(java_bin) || fail "no Java found (the devcontainer installs Java 17; set JAVA_HOME)"
  local version line
  version=$("$java" -version 2>&1 | sed -n 's/.*version "\([0-9][0-9]*\).*/\1/p' | head -n 1)
  if [ -z "$version" ] || [ "$version" -lt 17 ]; then
    fail "Java 17+ is required, found '$("$java" -version 2>&1 | head -n 1)'"
  fi

  if [ ! -d "$SRC_DIR/.git" ]; then
    git clone --depth 1 "${HEXCLI_MIELIB_REPO:-https://github.com/xm1221/MieLib.git}" "$SRC_DIR" \
      >>"$LOG_DIR/mielib-build.log" 2>&1 \
      || fail "could not clone MieLib (see $LOG_DIR/mielib-build.log)"
  fi

  # `:fabric:build` also remaps against Mojang metadata, which needs no secrets.
  (cd "$SRC_DIR" && JAVA_HOME="${JAVA_HOME:-$(dirname "$(dirname "$java")")}" \
    ./gradlew --no-daemon -Pfabric.loom.disableMinecraftVerification=true :fabric:build) \
    >>"$LOG_DIR/mielib-build.log" 2>&1 \
    || { tail -n 40 "$LOG_DIR/mielib-build.log" >&2; fail "the MieLib build failed (see $LOG_DIR/mielib-build.log)"; }

  local built
  built=$(find "$SRC_DIR/fabric/build/libs" -maxdepth 1 -name '*-fabric-*.jar' \
    ! -name '*-sources*' ! -name '*-javadoc*' ! -name '*-dev*' | head -n 1)
  [ -n "$built" ] || fail "no remapped Fabric jar in $SRC_DIR/fabric/build/libs"
  jar_has_http_endpoint "$built" || fail "the built jar has no HexCliHttp (build cache stale?)"

  # Keep the installer's file name so the rest of the setup is unaffected.
  rm -f "$SERVER_DIR"/mods/mielib-fabric-*.jar
  cp "$built" "$SERVER_DIR/mods/$(basename "$jar" 2>/dev/null || echo mielib-fabric-0.0.2.1+1.20.1-SNAPSHOT.jar)"
  log "installed the source-built MieLib jar into mods/"
}

ensure_http_capable_mielib

# ---- 4. start the Minecraft server (background) ----------------------------

start_server() {
  local java
  java=$(java_bin) || fail "no Java found"

  # The proxy enforces the CORS allowlist towards the browser and HexCLI stays on
  # loopback, so a permissive upstream allowlist is fine here; it is never exposed.
  local cors="${HEXCLI_UPSTREAM_CORS:-*}"
  local xmx="${HEXCLI_SERVER_XMX:-2G}"

  log "starting the HexCLI server (Java: $java, -Xmx$xmx, log: $SERVER_LOG)"
  : >"$SERVER_LOG"
  (
    cd "$SERVER_DIR"
    nohup "$java" "-Xmx$xmx" \
      -Dmielib.hexcli=true \
      -Dmielib.hexcli.http=true \
      -Dmielib.hexcli.http.port="$UPSTREAM_PORT" \
      -Dmielib.hexcli.http.bind=127.0.0.1 \
      -Dmielib.hexcli.http.cors="$cors" \
      -jar fabric-server-launch.jar nogui \
      </dev/null >>"$SERVER_LOG" 2>&1 &
    echo $! >"$SERVER_PID_FILE"
  )
}

if server_ready; then
  log "HexCLI HTTP endpoint is already up on 127.0.0.1:$UPSTREAM_PORT"
else
  # A previous run may have left the game process alive while the HTTP endpoint is
  # gone (crash mid-shutdown); do not start a second server on the same port.
  if pgrep -f "fabric-server-launch.jar" >/dev/null 2>&1; then
    log "a Minecraft server process is running but the HTTP endpoint is not answering yet; waiting for it"
  else
    start_server
  fi

  # First start downloads the vanilla server + libraries from Mojang, so allow a
  # generous window; later starts are ready in well under a minute.
  deadline=$((SECONDS + ${HEXCLI_START_TIMEOUT:-900}))
  while ! server_ready; do
    if [ -f "$SERVER_PID_FILE" ] && ! kill -0 "$(cat "$SERVER_PID_FILE")" 2>/dev/null; then
      tail -n 40 "$SERVER_LOG" >&2 || true
      fail "the Minecraft server exited during startup (see $SERVER_LOG)"
    fi
    if [ "$SECONDS" -ge "$deadline" ]; then
      tail -n 40 "$SERVER_LOG" >&2 || true
      fail "timed out waiting for the HexCLI HTTP endpoint (see $SERVER_LOG)"
    fi
    sleep 5
  done
  log "HexCLI HTTP endpoint is up on 127.0.0.1:$UPSTREAM_PORT"
fi

# ---- 5. start the front proxy (background) --------------------------------

start_proxy() {
  log "starting the HexSimulator front proxy on 0.0.0.0:$PROXY_PORT (log: $PROXY_LOG)"
  : >"$PROXY_LOG"
  (
    cd "$(dirname "$0")/.."
    HEXCLI_PROXY_PORT="$PROXY_PORT" \
      HEXCLI_PROXY_BIND=0.0.0.0 \
      HEXCLI_UPSTREAM_PORT="$UPSTREAM_PORT" \
      HEXCLI_SERVER_DIR="$SERVER_DIR" \
      HEXCLI_PROXY_TOKEN_FILE="$PROXY_TOKEN_FILE" \
      HEXCLI_CORS_ORIGINS="$HEXCLI_CORS_ORIGINS" \
      nohup node scripts/hexcli-codespaces-proxy.mjs \
      </dev/null >>"$PROXY_LOG" 2>&1 &
    echo $! >"$PROXY_PID_FILE"
  )
}

start_proxy

deadline=$((SECONDS + 60))
while ! proxy_listening; do
  if [ "$SECONDS" -ge "$deadline" ]; then
    tail -n 20 "$PROXY_LOG" >&2 || true
    fail "the proxy did not start (see $PROXY_LOG; port $PROXY_PORT may be taken)"
  fi
  sleep 1
done

log "ready."
log "  health : curl http://127.0.0.1:$PROXY_PORT/v1/health"
log "  status : bash .devcontainer/start-hexcli.sh --status"
log "  logs   : $SERVER_LOG  $PROXY_LOG"

# Codespaces forwards a new port as private; the page at hexsim.xm1221.cn needs a
# public one. There is no devcontainer.json property for this, so print the command.
if [ -n "${CODESPACE_NAME:-}" ]; then
  domain="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
  log ""
  log "  Base URL : https://${CODESPACE_NAME}-${PROXY_PORT}.${domain}"
  log "  Token    : bash .devcontainer/hexcli-info.sh   (prints it)"
  log "  Public   : gh codespace ports visibility ${PROXY_PORT}:public -c ${CODESPACE_NAME}"
fi

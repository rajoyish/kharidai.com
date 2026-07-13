#!/usr/bin/env bash
#
# Process manager for the Inertia SSR server.
#
# The SSR bundle is a long-lived Node process that Laravel reaches over
# loopback. It is deliberately NOT run under Passenger: Passenger patches
# `net.Server.prototype.listen` and rebinds the server to a Unix socket it
# owns, so the process would never be reachable on 127.0.0.1:13714 and PHP's
# SSR gateway would get connection refused.
#
# Usage:
#   scripts/ssr-server.sh start     Start it (no-op if already healthy)
#   scripts/ssr-server.sh stop      Stop it
#   scripts/ssr-server.sh restart   Stop, then start (used by the deploy)
#   scripts/ssr-server.sh ensure    Start only if unhealthy (used by cron)
#   scripts/ssr-server.sh status    Report health, exit non-zero if down
#
# Overridable via the environment: NODE_BIN, SSR_HOST, SSR_PORT.

set -uo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SSR_HOST="${SSR_HOST:-127.0.0.1}"
SSR_PORT="${SSR_PORT:-13714}"
SSR_URL="http://${SSR_HOST}:${SSR_PORT}"

BUNDLE="${APP_ROOT}/bootstrap/ssr/ssr.js"
PID_FILE="${APP_ROOT}/storage/app/ssr.pid"
LOG_FILE="${APP_ROOT}/storage/logs/ssr.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ssr: $*"
}

# cPanel's cron and SSH sessions get a minimal PATH that usually has no node on
# it, so the interpreter is located explicitly rather than assumed.
resolve_node() {
    if [ -n "${NODE_BIN:-}" ]; then
        echo "${NODE_BIN}"
        return 0
    fi

    if command -v node >/dev/null 2>&1; then
        command -v node
        return 0
    fi

    local candidate
    for candidate in /opt/cpanel/ea-nodejs*/bin/node "${HOME}"/nodevenv/*/*/bin/node; do
        if [ -x "${candidate}" ]; then
            echo "${candidate}"
            return 0
        fi
    done

    return 1
}

is_healthy() {
    curl -fsS -m 3 "${SSR_URL}/health" >/dev/null 2>&1
}

running_pid() {
    [ -f "${PID_FILE}" ] || return 1

    local pid
    pid="$(cat "${PID_FILE}" 2>/dev/null)"

    [ -n "${pid}" ] && kill -0 "${pid}" 2>/dev/null || return 1

    echo "${pid}"
}

start() {
    if is_healthy; then
        log "already healthy on ${SSR_URL}, nothing to do"
        return 0
    fi

    if [ ! -f "${BUNDLE}" ]; then
        log "ERROR: no SSR bundle at ${BUNDLE} — run 'npm run build:ssr'"
        return 1
    fi

    local node
    if ! node="$(resolve_node)"; then
        log "ERROR: could not find a node binary — set NODE_BIN"
        return 1
    fi

    mkdir -p "$(dirname "${PID_FILE}")" "$(dirname "${LOG_FILE}")"

    # The process has to outlive the shell that spawned it, or it dies the
    # moment the deploy's SSH connection (or the cron job) exits. setsid puts it
    # in its own session, which is the sturdiest form of that; it is Linux-only,
    # so on hosts without it (macOS) nohup plus a detached stdin does the job.
    local -a launcher=()
    if command -v setsid >/dev/null 2>&1; then
        launcher=(setsid)
    fi

    # `${launcher[@]+...}` guards the expansion: under `set -u`, older bash (3.2,
    # which is what macOS ships) treats an empty array as an unbound variable.
    SSR_HOST="${SSR_HOST}" PORT="${SSR_PORT}" \
        ${launcher[@]+"${launcher[@]}"} nohup "${node}" "${BUNDLE}" </dev/null >>"${LOG_FILE}" 2>&1 &

    local pid=$!
    echo "${pid}" >"${PID_FILE}"

    local attempt
    for attempt in $(seq 1 20); do
        if is_healthy; then
            log "started (pid ${pid}, node ${node}) on ${SSR_URL}"
            return 0
        fi

        sleep 0.5
    done

    log "ERROR: started pid ${pid} but ${SSR_URL}/health never answered — see ${LOG_FILE}"
    return 1
}

stop() {
    local pid
    if pid="$(running_pid)"; then
        kill "${pid}" 2>/dev/null

        local attempt
        for attempt in $(seq 1 20); do
            kill -0 "${pid}" 2>/dev/null || break
            sleep 0.5
        done

        kill -9 "${pid}" 2>/dev/null
        log "stopped pid ${pid}"
    fi

    # A crashed or replaced deploy can leave the pid file stale while an older
    # process still holds the port, which would make the next start fail with
    # EADDRINUSE. Sweep any of our own strays bound to this bundle.
    pkill -u "$(id -u)" -f "${BUNDLE}" 2>/dev/null && log "swept stray bundle processes"

    rm -f "${PID_FILE}"

    return 0
}

case "${1:-}" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        stop
        start
        ;;
    ensure)
        if is_healthy; then
            exit 0
        fi

        log "health check failed, restarting"
        stop
        start
        ;;
    status)
        if is_healthy; then
            log "healthy on ${SSR_URL}"
            exit 0
        fi

        log "DOWN — ${SSR_URL}/health did not answer"
        exit 1
        ;;
    *)
        echo "usage: $0 {start|stop|restart|ensure|status}" >&2
        exit 64
        ;;
esac

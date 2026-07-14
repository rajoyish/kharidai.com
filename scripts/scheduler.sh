#!/usr/bin/env bash
#
# Cron entry point for Laravel's scheduler.
#
# Unlike the SSR server, there is no daemon here to keep alive: `schedule:run`
# is a single tick that exits on its own. Cron fires it every minute, and the
# scheduler decides what is due — currently the queue worker that drains the
# Redis queue and sends order emails (see routes/console.php).
#
# This exists rather than putting `php artisan schedule:run` straight in the
# crontab for the same reason ssr-server.sh exists: cPanel's cron runs with a
# minimal PATH, and the `php` it finds — if it finds one — is often not the
# version the app runs under. The interpreter is located explicitly here.
#
# Usage:
#   scripts/scheduler.sh          Run the scheduler once (used by cron)
#   scripts/scheduler.sh status   List scheduled tasks and their next due time
#
# Overridable via the environment: PHP_BIN.

set -uo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] scheduler: $*"
}

# Mirrors resolve_node() in ssr-server.sh: prefer an explicit binary, fall back
# to PATH, then to where cPanel actually keeps its PHP builds.
resolve_php() {
    if [ -n "${PHP_BIN:-}" ]; then
        echo "${PHP_BIN}"
        return 0
    fi

    if command -v php >/dev/null 2>&1; then
        command -v php
        return 0
    fi

    local candidate
    for candidate in /usr/local/bin/php /opt/cpanel/ea-php*/root/usr/bin/php; do
        if [ -x "${candidate}" ]; then
            echo "${candidate}"
            return 0
        fi
    done

    return 1
}

PHP="$(resolve_php)" || {
    log "FATAL — no php interpreter found; set PHP_BIN in the cron entry"
    exit 1
}

case "${1:-run}" in
    run)
        # No timestamped banner on the happy path: this fires every minute, and a
        # log that grows by a line a minute drowns the errors worth seeing. Artisan
        # stays quiet when nothing is due, so cron's own redirect captures only
        # real output.
        exec "${PHP}" "${APP_ROOT}/artisan" schedule:run
        ;;
    status)
        exec "${PHP}" "${APP_ROOT}/artisan" schedule:list
        ;;
    *)
        echo "usage: $0 {run|status}" >&2
        exit 64
        ;;
esac

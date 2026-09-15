#!/bin/sh
set -e

RPC_SECRET=${RPC_SECRET:-}
BASIC_AUTH_USERNAME=${BASIC_AUTH_USERNAME:-}
BASIC_AUTH_PASSWORD=${BASIC_AUTH_PASSWORD:-}
DOWNLOAD_DIR=${DOWNLOAD_DIR:-/data}
# BitTorrent tracker discovery. aria2 ships without any trackers, so magnet
# downloads crawl on DHT alone. BT_TRACKER (comma/newline separated) wins;
# otherwise the list is fetched from BT_TRACKER_URL (set it to "" to disable).
BT_TRACKER=${BT_TRACKER:-}
BT_TRACKER_URL=${BT_TRACKER_URL:-https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_best.txt}
# BT/DHT listen ports. Map the SAME port on the host (-p X:X) — peers dial
# the port aria2 announces, so a mismatched external mapping kills inbound.
BT_LISTEN_PORT=${BT_LISTEN_PORT:-6881-6999}
# aria2 file log, served read-only at /aria2-log by nginx. notice keeps the
# file small; raise to info/debug temporarily when diagnosing.
ARIA2_LOG_LEVEL=${ARIA2_LOG_LEVEL:-notice}

TRACKER_ARGS=""
if [ -n "$BT_TRACKER" ]; then
  TRACKER_ARGS="--bt-tracker=$(printf '%s' "$BT_TRACKER" | tr -d ' \n' )"
  echo " -> bt trackers: from BT_TRACKER env"
elif [ -n "$BT_TRACKER_URL" ]; then
  echo " -> fetching tracker list from $BT_TRACKER_URL ..."
  if TRACKERS=$(curl -fsSL --max-time 20 "$BT_TRACKER_URL" 2>/dev/null | sed '/^\s*$/d' | paste -sd, -); then
    if [ -n "$TRACKERS" ]; then
      TRACKER_ARGS="--bt-tracker=$TRACKERS"
      echo " -> bt trackers: $(echo "$TRACKERS" | tr ',' '\n' | wc -l | tr -d ' ') servers"
    fi
  else
    echo " -> tracker list unavailable (offline or blocked); continuing with DHT only"
  fi
else
  echo " -> bt trackers: disabled"
fi

echo "Starting aria2-dashboard (all-in-one):"
echo " -> download dir: $DOWNLOAD_DIR"
echo " -> aria2 log level: $ARIA2_LOG_LEVEL (/aria2-log in the UI)"
if [ -n "$RPC_SECRET" ]; then
  echo " -> rpc secret: set (embedded in the UI; loopback-only RPC)"
else
  echo " -> rpc secret: none (loopback-only RPC)"
fi
if [ -n "$BASIC_AUTH_USERNAME" ]; then
  echo " -> basic auth: enabled"
else
  echo " -> basic auth: disabled"
fi

# Inject connection info into the built frontend. The URL resolves to the
# page origin at runtime ("same-origin"), so any external host/port/HTTPS
# setup works without reconfiguration.
find /usr/share/nginx/html/assets -type f -name "*.js" \
  -exec sed -i "s#__RPC_URL_PLACEHOLDER__#same-origin#g;s#__RPC_SECRET_PLACEHOLDER__#${RPC_SECRET}#g" {} \;

# Optional basic auth protecting the whole site (UI, RPC and logs)
AUTH_CONF=/etc/nginx/conf.d/auth.conf
if [ -n "$BASIC_AUTH_USERNAME" ] && [ -n "$BASIC_AUTH_PASSWORD" ]; then
  htpasswd -bc /etc/nginx/.htpasswd "$BASIC_AUTH_USERNAME" "$BASIC_AUTH_PASSWORD"
  printf 'auth_basic "aria2-dashboard";\nauth_basic_user_file /etc/nginx/.htpasswd;\n' > "$AUTH_CONF"
else
  : > "$AUTH_CONF"
fi

mkdir -p "$DOWNLOAD_DIR"
SESSION_FILE="$DOWNLOAD_DIR/.aria2-session"
touch "$SESSION_FILE"
LOG_FILE="$DOWNLOAD_DIR/aria2.log"
touch "$LOG_FILE"

# aria2 daemon: RPC listens on loopback only — nginx is the sole public entry.
SECRET_ARGS=""
if [ -n "$RPC_SECRET" ]; then
  SECRET_ARGS="--rpc-secret=$RPC_SECRET"
fi

aria2c \
  --enable-rpc \
  --rpc-listen-port=6800 \
  --rpc-listen-all=false \
  --dir="$DOWNLOAD_DIR" \
  --continue=true \
  --max-concurrent-downloads=5 \
  --split=5 \
  --max-connection-per-server=8 \
  --seed-ratio=1 \
  --listen-port="$BT_LISTEN_PORT" \
  --dht-listen-port="$BT_LISTEN_PORT" \
  --bt-request-peer-speed-limit=10M \
  --log="$LOG_FILE" \
  --log-level="$ARIA2_LOG_LEVEL" \
  --save-session="$SESSION_FILE" \
  --save-session-interval=30 \
  --input-file="$SESSION_FILE" \
  $SECRET_ARGS \
  $TRACKER_ARGS &

echo "aria2 started (pid $!)"

# nginx runs in the foreground as PID 1 via exec
exec "$@"

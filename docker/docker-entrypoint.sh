#!/bin/sh
set -e

# Defaults if not provided via Docker ENV
RPC_URL=${ARIA2_RPC_URL:-"ws://localhost:6800/jsonrpc"}
RPC_SECRET=${ARIA2_RPC_SECRET:-""}

echo "Configuring Aria2 Dashboard:"
echo " -> RPC Endpoint target: $RPC_URL"

# Replace the placeholders in all built JS files with the runtime environment
# variables. `#` is used as the sed delimiter because it cannot appear in URLs
# or RPC secrets.
find /usr/share/nginx/html/assets -type f -name "*.js" \
  -exec sed -i "s#__ARIA2_RPC_URL_PLACEHOLDER__#$RPC_URL#g;s#__ARIA2_RPC_SECRET_PLACEHOLDER__#$RPC_SECRET#g" {} \;

# Execute the main container command (e.g. nginx)
exec "$@"

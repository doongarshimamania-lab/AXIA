#!/bin/bash
CONVEX_BINARY="/home/z/.cache/convex/binaries/precompiled-2026-05-27-e85ff37/convex-local-backend"
CONVEX_DATA="/home/z/my-project/timelock/.convex/local/default"
INSTANCE_SECRET="cf0c5c3e83517f441baa718171034cdde912309d748129648a064443446e5cf8"

cd "$CONVEX_DATA"

exec "$CONVEX_BINARY" \
  --port 3210 \
  --interface 0.0.0.0 \
  --instance-name "timelock-local" \
  --instance-secret "$INSTANCE_SECRET" \
  --disable-beacon \
  convex_local_backend.sqlite3

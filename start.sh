#!/bin/sh
set -euo pipefail

cd /usr/src/app
exec /bin/sh ./docker-entrypoint.sh

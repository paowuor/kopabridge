#!/bin/bash
set -euo pipefail

cd /usr/src/app
exec /bin/bash ./docker-entrypoint.sh

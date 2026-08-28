#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../backend"
npm run db:reset
npm run db:migrate
npm run db:seed

#!/usr/bin/env bash

# Start dev server with test environment variables
# This script is used by Playwright to ensure tests run with correct env vars

set -euo pipefail

# Export all variables loaded from .env.test
if [[ -f .env.test ]]; then
  set -a
  # shellcheck disable=SC1091
  source ./.env.test
  set +a
fi

# Force explicit test mode for Playwright runs
export ENV="${ENV:-test}"
export PLAYWRIGHT_TEST="${PLAYWRIGHT_TEST:-1}"

# Use ports from environment or defaults
export TEST_PORT="${TEST_PORT:-3100}"
export TEST_WRANGLER_PORT="${TEST_WRANGLER_PORT:-8800}"
export PLAYWRIGHT_MOCK_DB_PATH="${PLAYWRIGHT_MOCK_DB_PATH:-/tmp/autopilotrank-playwright-mock-db-${TEST_PORT}.json}"

# Ensure each server start begins with a clean shared mock database.
rm -f "${PLAYWRIGHT_MOCK_DB_PATH}"

echo "Starting dedicated Playwright test server on port ${TEST_PORT} (Astro)"

# Run Astro server for Playwright.
# --force pre-bundles Vite deps up front to reduce mid-run re-optimization reloads.
exec npx astro dev --force --host 127.0.0.1 --port "${TEST_PORT}"

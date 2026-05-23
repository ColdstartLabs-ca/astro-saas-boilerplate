#!/usr/bin/env bash

# Start dev server with test environment variables
# This script is used by Playwright to ensure tests run with correct env vars

set -euo pipefail

# Load .env.test variables WITHOUT overriding vars already set in the environment.
# This ensures that when yarn deploy fetches prod secrets (e.g. SUPABASE_SERVICE_ROLE_KEY),
# those are used for tests rather than the placeholder values in .env.test.
if [[ -f .env.test ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ $line =~ ^[[:space:]]*# ]] && continue
    [[ $line =~ ^[[:space:]]*$ ]] && continue
    if [[ $line =~ ^([A-Za-z_][A-Za-z0-9_]*)= ]]; then
      varname="${BASH_REMATCH[1]}"
      # Only export if not already set in the environment
      if [[ -z "${!varname:-}" ]]; then
        export "$line"
      fi
    fi
  done < .env.test
fi

# Force explicit test mode for Playwright runs
export ENV="${ENV:-test}"
export PLAYWRIGHT_TEST="${PLAYWRIGHT_TEST:-1}"

# Use ports from environment or defaults
export TEST_PORT="${TEST_PORT:-3100}"
export TEST_WRANGLER_PORT="${TEST_WRANGLER_PORT:-8800}"
export PLAYWRIGHT_MOCK_DB_PATH="${PLAYWRIGHT_MOCK_DB_PATH:-/tmp/saas-boilerplate-playwright-mock-db-${TEST_PORT}.json}"

# Ensure each server start begins with a clean shared mock database.
rm -f "${PLAYWRIGHT_MOCK_DB_PATH}"

echo "Starting dedicated Playwright test server on port ${TEST_PORT} (Astro)"

# Run Astro server for Playwright.
# --force pre-bundles Vite deps up front to reduce mid-run re-optimization reloads.
exec npx astro dev --force --host 127.0.0.1 --port "${TEST_PORT}"

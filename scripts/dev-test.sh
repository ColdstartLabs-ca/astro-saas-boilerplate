#!/bin/bash

# Start dev server with test environment variables
# This script is used by Playwright to ensure tests run with correct env vars

set -e

# Load test environment variables properly (handle values with spaces and commas)
# Use a while loop to properly parse KEY=VALUE format
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ "$key" =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue

  # Remove leading/trailing whitespace from key
  key=$(echo "$key" | xargs)
  # Remove leading/trailing whitespace from value
  value=$(echo "$value" | xargs)

  # Remove quotes from value if present (bash export will handle them)
  value="${value%\"}"
  value="${value#\"}"

  # Export the variable
  export "$key=$value"
done < .env.test

# Use ports from environment or defaults
TEST_PORT=${TEST_PORT:-3100}
TEST_WRANGLER_PORT=${TEST_WRANGLER_PORT:-8800}

# Check if port is already in use and kill the process if needed
# This prevents "port already in use" errors when restarting tests
if lsof -i :$TEST_PORT -t > /dev/null 2>&1; then
  echo "Port $TEST_PORT is in use, killing existing process..."
  lsof -i :$TEST_PORT -t | xargs kill -9 2>/dev/null || true
  sleep 1
fi

echo "Starting test server on port $TEST_PORT (Astro)"

# Run the Astro dev server
npx astro dev --port $TEST_PORT

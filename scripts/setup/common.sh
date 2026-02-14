#!/bin/bash

# ============================================================================
# Common utilities for setup scripts
# ============================================================================

# Colors for output
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export CYAN='\033[0;36m'
export BOLD='\033[1m'
export NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "\n${CYAN}${BOLD}▸ $1${NC}"; }

# Project paths
get_project_root() {
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[1]}")" && pwd)"
    # Go up from scripts/setup/ to project root
    echo "$(dirname "$(dirname "$script_dir")")"
}

# Prompt for value with optional default
prompt_value() {
    local prompt="$1"
    local default="${2:-}"
    local var_name="$3"
    local is_secret="${4:-false}"

    if [[ -n "$default" && "$default" != "XXX" && "$default" != *"your-"* ]]; then
        prompt="$prompt [${default:0:20}...]"
    fi

    if [[ "$is_secret" == "true" ]]; then
        read -sp "$prompt: " value
        echo ""
    else
        read -p "$prompt: " value
    fi

    if [[ -z "$value" && -n "$default" ]]; then
        value="$default"
    fi

    eval "$var_name=\"$value\""
}

# Check if a command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Read KEY value from an env file
get_env_value() {
    local file="$1"
    local key="$2"

    if [[ ! -f "$file" ]]; then
        return 0
    fi

    awk -F'=' -v key="$key" '
        /^[[:space:]]*#/ { next }
        /^[[:space:]]*$/ { next }
        {
            k=$1
            gsub(/^[[:space:]]+|[[:space:]]+$/, "", k)
            if (k == key) {
                print substr($0, index($0, "=") + 1)
                exit
            }
        }
    ' "$file"
}

# Upsert KEY=VALUE in an env file without evaluating the value
upsert_env_value() {
    local file="$1"
    local key="$2"
    local value="$3"

    touch "$file"
    local tmp_file
    tmp_file="$(mktemp)"

    awk -v key="$key" -v value="$value" '
        BEGIN { updated=0 }
        {
            if ($0 ~ "^[[:space:]]*" key "=") {
                print key "=" value
                updated=1
            } else {
                print $0
            }
        }
        END {
            if (!updated) print key "=" value
        }
    ' "$file" > "$tmp_file"

    mv "$tmp_file" "$file"
}

# Load one env file safely (supports values with spaces)
load_env_file() {
    local file="$1"

    [[ -f "$file" ]] || return 0

    while IFS= read -r line || [[ -n "$line" ]]; do
        [[ $line =~ ^[[:space:]]*# ]] && continue
        [[ $line =~ ^[[:space:]]*$ ]] && continue

        if [[ $line =~ ^[[:space:]]*(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
            local key="${BASH_REMATCH[2]}"
            local value="${BASH_REMATCH[3]}"
            export "$key=$value"
        fi
    done < "$file"
}

# Load environment files
load_env() {
    local project_root="$1"

    load_env_file "$project_root/.env.client"
    load_env_file "$project_root/.env.api"
}

# Extract Supabase project ref from URL
get_supabase_project_ref() {
    local url="${1:-${PUBLIC_SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}}"
    echo "$url" | sed -E 's|https://([^.]+)\.supabase\.co.*|\1|'
}

# Test Supabase connection
test_supabase_connection() {
    local url="${1:-${PUBLIC_SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}}"
    local key="${2:-$SUPABASE_SERVICE_ROLE_KEY}"

    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        "${url}/rest/v1/" \
        -H "apikey: ${key}" \
        -H "Authorization: Bearer ${key}" 2>/dev/null || echo "000")

    echo "$response"
}

# Open URL in browser (cross-platform)
open_url() {
    local url="$1"

    if command_exists xdg-open; then
        xdg-open "$url" 2>/dev/null &
    elif command_exists open; then
        open "$url" 2>/dev/null &
    else
        echo "Open: $url"
    fi
}

#!/bin/bash

# ============================================================================
# Step 2: Setup environment files
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

PROJECT_ROOT="$(get_project_root)"

setup_environment() {
    local interactive="${1:-true}"

    log_step "Setting up environment files..."

    cd "$PROJECT_ROOT"

    # Handle .env.client file
    if [[ -f ".env.client" ]]; then
        if [[ "$interactive" == "true" ]]; then
            read -p "  .env.client already exists. Overwrite? [y/N] " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                cp .env.client.example .env.client
                log_success "Created .env.client from example"
            else
                log_info "Keeping existing .env.client"
            fi
        fi
    else
        cp .env.client.example .env.client
        log_success "Created .env.client from example"
    fi

    # Handle .env.api file
    if [[ -f ".env.api" ]]; then
        if [[ "$interactive" == "true" ]]; then
            read -p "  .env.api already exists. Overwrite? [y/N] " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                cp .env.api.example .env.api
                log_success "Created .env.api from example"
            else
                log_info "Keeping existing .env.api"
            fi
        fi
    else
        cp .env.api.example .env.api
        log_success "Created .env.api from example"
    fi

    return 0
}

configure_supabase_credentials() {
    log_step "Configuring Supabase credentials..."

    cd "$PROJECT_ROOT"

    echo ""
    echo -e "${BOLD}Supabase Configuration${NC}"
    echo "Get these values from: https://supabase.com/dashboard/project/_/settings/api"
    echo ""

    # Read current values as defaults
    local current_url
    local current_anon
    local current_service

    current_url="$(get_env_value .env.client PUBLIC_SUPABASE_URL)"
    if [[ -z "$current_url" ]]; then
        current_url="$(get_env_value .env.client NEXT_PUBLIC_SUPABASE_URL)"
    fi

    current_anon="$(get_env_value .env.client PUBLIC_SUPABASE_ANON_KEY)"
    if [[ -z "$current_anon" ]]; then
        current_anon="$(get_env_value .env.client NEXT_PUBLIC_SUPABASE_ANON_KEY)"
    fi

    current_service="$(get_env_value .env.api SUPABASE_SERVICE_ROLE_KEY)"

    prompt_value "  Project URL (e.g., https://xxx.supabase.co)" "$current_url" SUPABASE_URL
    prompt_value "  Anon Key (public)" "$current_anon" SUPABASE_ANON_KEY
    prompt_value "  Service Role Key (secret)" "$current_service" SUPABASE_SERVICE_KEY true

    # Update .env.client (PUBLIC_* is canonical, NEXT_PUBLIC_* kept for compatibility)
    if [[ -n "$SUPABASE_URL" ]]; then
        upsert_env_value .env.client PUBLIC_SUPABASE_URL "$SUPABASE_URL"
        if grep -qE "^[[:space:]]*NEXT_PUBLIC_SUPABASE_URL=" .env.client; then
            upsert_env_value .env.client NEXT_PUBLIC_SUPABASE_URL "$SUPABASE_URL"
        fi
    fi
    if [[ -n "$SUPABASE_ANON_KEY" ]]; then
        upsert_env_value .env.client PUBLIC_SUPABASE_ANON_KEY "$SUPABASE_ANON_KEY"
        if grep -qE "^[[:space:]]*NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.client; then
            upsert_env_value .env.client NEXT_PUBLIC_SUPABASE_ANON_KEY "$SUPABASE_ANON_KEY"
        fi
    fi

    # Update .env.api
    if [[ -n "$SUPABASE_SERVICE_KEY" ]]; then
        upsert_env_value .env.api SUPABASE_SERVICE_ROLE_KEY "$SUPABASE_SERVICE_KEY"
    fi

    log_success "Supabase credentials configured"
    return 0
}

configure_stripe_credentials() {
    log_step "Configuring Stripe credentials..."

    cd "$PROJECT_ROOT"

    echo ""
    echo "Get these from: https://dashboard.stripe.com/test/apikeys"
    echo ""

    local current_secret=$(grep "^STRIPE_SECRET_KEY=" .env.api 2>/dev/null | cut -d'=' -f2 || echo "")
    local current_webhook=$(grep "^STRIPE_WEBHOOK_SECRET=" .env.api 2>/dev/null | cut -d'=' -f2 || echo "")

    prompt_value "  Stripe Secret Key (sk_test_...)" "$current_secret" STRIPE_SECRET true
    prompt_value "  Stripe Webhook Secret (whsec_...)" "$current_webhook" STRIPE_WEBHOOK true

    if [[ -n "$STRIPE_SECRET" ]]; then
        upsert_env_value .env.api STRIPE_SECRET_KEY "$STRIPE_SECRET"
    fi
    if [[ -n "$STRIPE_WEBHOOK" ]]; then
        upsert_env_value .env.api STRIPE_WEBHOOK_SECRET "$STRIPE_WEBHOOK"
    fi

    log_success "Stripe credentials configured"
    return 0
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    setup_environment true
    configure_supabase_credentials

    echo ""
    read -p "Configure Stripe keys now? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        configure_stripe_credentials
    fi
fi

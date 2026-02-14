#!/bin/bash

step_secrets() {
    log_step 5 "Uploading secrets"

    local worker="${WORKER_NAME:-autopilotrank.com}"
    local skip_secrets="${SKIP_SECRETS:-false}"

    # Get existing secrets (only needed when skipping)
    local existing_secrets=""
    if [[ "$skip_secrets" == "true" ]]; then
        existing_secrets=$(npx wrangler secret list --name "$worker" 2>/dev/null | grep -oP '"name":\s*"\K[^"]+' || echo "")
    fi

    secret_exists() {
        echo "$existing_secrets" | grep -qx "$1"
    }

    upload_secret() {
        local name="$1"
        local value="${!name:-}"

        if [[ -z "$value" ]]; then
            return
        fi

        if [[ "$skip_secrets" == "true" ]] && secret_exists "$name"; then
            log_info "$name (skipped)"
        else
            echo "$value" | npx wrangler secret put "$name" --name "$worker" 2>/dev/null
            log_success "$name"
        fi
    }

    upload_secret_alias() {
        local target_name="$1"
        local primary_name="$2"
        local fallback_name="$3"

        local value="${!primary_name:-}"
        if [[ -z "$value" && -n "${fallback_name:-}" ]]; then
            value="${!fallback_name:-}"
        fi
        [[ -z "$value" ]] && return

        if [[ "$skip_secrets" == "true" ]] && secret_exists "$target_name"; then
            log_info "$target_name (skipped)"
        else
            echo "$value" | npx wrangler secret put "$target_name" --name "$worker" 2>/dev/null
            log_success "$target_name"
        fi
    }

    # Secrets from .env.api
    local secrets=(
        SUPABASE_SERVICE_ROLE_KEY
        STRIPE_SECRET_KEY
        STRIPE_WEBHOOK_SECRET
        GEMINI_API_KEY
        REPLICATE_API_TOKEN
        CRON_SECRET
    )

    for secret in "${secrets[@]}"; do
        upload_secret "$secret"
    done

    # Public vars needed server-side (PUBLIC_* canonical, NEXT_PUBLIC_* fallback)
    upload_secret_alias "PUBLIC_SUPABASE_URL" "PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_URL"
    upload_secret_alias "PUBLIC_SUPABASE_ANON_KEY" "PUBLIC_SUPABASE_ANON_KEY" "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    upload_secret_alias "PUBLIC_BASE_URL" "PUBLIC_BASE_URL" "NEXT_PUBLIC_BASE_URL"
}

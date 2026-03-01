#!/bin/bash

step_secrets() {
    log_step 6 "Uploading secrets"

    local project="${WORKER_NAME:-autopilotrank}"
    local skip_secrets="${SKIP_SECRETS:-false}"

    # Get existing secrets (only needed when skipping)
    local existing_secrets=""
    if [[ "$skip_secrets" == "true" ]]; then
        existing_secrets=$(npx wrangler pages secret list --project-name "$project" 2>/dev/null | grep -oP '^\s+-\s+\K[^:]+' || echo "")
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
            echo "$value" | npx wrangler pages secret put "$name" --project-name "$project" 2>/dev/null
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
            echo "$value" | npx wrangler pages secret put "$target_name" --project-name "$project" 2>/dev/null
            log_success "$target_name"
        fi
    }

    # Secrets from .env.api
    local secrets=(
        # Core infrastructure
        SUPABASE_SERVICE_ROLE_KEY
        # Payments
        STRIPE_SECRET_KEY
        STRIPE_WEBHOOK_SECRET
        # Email providers
        BREVO_API_KEY
        RESEND_API_KEY
        EMAIL_FROM_ADDRESS
        # AI providers
        OPENROUTER_API_KEY
        OPENROUTER_VL_MODEL
        OPENROUTER_TEXT_MODEL
        REPLICATE_API_KEY
        OPENAI_API_KEY
        AVAILABLE_WRITER_PRESETS
        AVAILABLE_IMAGE_PRESETS
        # CMS
        CMS_ENCRYPTION_KEY
        # Google OAuth (GSC + API integrations)
        GOOGLE_OAUTH_CLIENT_SECRET
        GSC_STATE_SECRET
        # Monitoring
        BASELIME_API_KEY
        AMPLITUDE_API_KEY
        # Cron
        CRON_SECRET
    )

    for secret in "${secrets[@]}"; do
        upload_secret "$secret"
    done

    # Warn about critical secrets that have empty values (will silently skip)
    for critical in GOOGLE_OAUTH_CLIENT_SECRET GSC_STATE_SECRET EMAIL_FROM_ADDRESS; do
        if [[ -z "${!critical:-}" ]]; then
            log_warn "$critical is empty — add it to the GCloud secret 'autopilotrank-api-prod' and redeploy"
        fi
    done

    # Public vars needed server-side (baked at build time but also uploaded as secrets for SSR access)
    upload_secret_alias "PUBLIC_SUPABASE_URL" "PUBLIC_SUPABASE_URL" ""
    upload_secret_alias "PUBLIC_SUPABASE_ANON_KEY" "PUBLIC_SUPABASE_ANON_KEY" ""
    upload_secret_alias "PUBLIC_BASE_URL" "PUBLIC_BASE_URL" ""

    # Upload CRON_SECRET to the standalone cron Worker (separate from the Pages project)
    # Workers have their own secret store — wrangler pages secret put does NOT reach them
    if [[ -d "$PROJECT_ROOT/workers/cron" && -n "${CRON_SECRET:-}" ]]; then
        local cron_worker_name
        cron_worker_name=$(grep '^name' "$PROJECT_ROOT/workers/cron/wrangler.toml" | head -1 | awk -F'"' '{print $2}')
        if [[ -n "$cron_worker_name" ]]; then
            echo "$CRON_SECRET" | npx wrangler secret put CRON_SECRET --name "$cron_worker_name" 2>/dev/null
            log_success "CRON_SECRET → cron worker ($cron_worker_name)"
        fi
    fi
}

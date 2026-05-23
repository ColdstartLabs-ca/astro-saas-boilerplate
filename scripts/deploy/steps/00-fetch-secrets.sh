#!/bin/bash

# Configuration — always locked to the saas-boilerplate GCloud project
GCLOUD_PROJECT="saas-boilerplate"
GCLOUD_SECRET_API="${GCLOUD_SECRET_API:-saas-boilerplate-api-prod}"
GCLOUD_SECRET_CLIENT="${GCLOUD_SECRET_CLIENT:-saas-boilerplate-client-prod}"
GCLOUD_SERVICE_ACCOUNT_KEY="$PROJECT_ROOT/cloud/keys/saas-boilerplate-866faa7dedda.json"
ENV_API_PROD="$PROJECT_ROOT/.env.api.prod"
ENV_CLIENT_PROD="$PROJECT_ROOT/.env.client.prod"

step_fetch_secrets() {
    log_step 0 "Fetching production secrets"

    # Check gcloud CLI
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI not installed. Install from: https://cloud.google.com/sdk/docs/install"
    fi
    log_success "gcloud CLI found"

    # Prefer service account key for reliable, non-interactive auth
    if [[ -f "$GCLOUD_SERVICE_ACCOUNT_KEY" ]]; then
        log_info "Activating service account (cloud/keys/saas-boilerplate-866faa7dedda.json)..."
        gcloud auth activate-service-account --key-file="$GCLOUD_SERVICE_ACCOUNT_KEY" --quiet
        log_success "Service account activated"
    else
        # Fallback to personal account (requires prior gcloud auth login)
        if ! gcloud auth print-access-token &> /dev/null; then
            log_error "Not authenticated. Add service account key to cloud/keys/ or run: gcloud auth login"
        fi
        log_warn "Using personal account (add service account key for reliable CI auth)"
    fi

    # Always explicitly set project to prevent pointing at wrong GCloud project
    gcloud config set project "$GCLOUD_PROJECT" --quiet 2>/dev/null || true
    log_success "GCloud project: $GCLOUD_PROJECT"

    # Fetch API secrets
    log_info "Fetching $GCLOUD_SECRET_API..."
    if ! gcloud secrets versions access latest --secret="$GCLOUD_SECRET_API" --project="$GCLOUD_PROJECT" > "$ENV_API_PROD" 2>/dev/null; then
        log_error "Failed to fetch secret '$GCLOUD_SECRET_API'. Ensure it exists in GCloud Secret Manager and the service account has 'Secret Manager Secret Accessor' role."
    fi
    log_success ".env.api.prod written"

    # Fetch client secrets
    log_info "Fetching $GCLOUD_SECRET_CLIENT..."
    if ! gcloud secrets versions access latest --secret="$GCLOUD_SECRET_CLIENT" --project="$GCLOUD_PROJECT" > "$ENV_CLIENT_PROD" 2>/dev/null; then
        rm -f "$ENV_API_PROD"  # Cleanup partial state
        log_error "Failed to fetch secret '$GCLOUD_SECRET_CLIENT'. Ensure it exists in GCloud Secret Manager and the service account has 'Secret Manager Secret Accessor' role."
    fi
    log_success ".env.client.prod written"
}

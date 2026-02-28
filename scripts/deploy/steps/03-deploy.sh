#!/bin/bash

step_deploy() {
    log_step 3 "Deploying"

    cd "$PROJECT_ROOT"

    local pages_project_name="${CLOUDFLARE_PAGES_PROJECT_NAME:-${PROJECT_NAME:-${WORKER_NAME:-}}}"
    [[ -z "$pages_project_name" ]] && log_error "Missing CLOUDFLARE_PAGES_PROJECT_NAME/PROJECT_NAME/WORKER_NAME in environment"

    # Deploy to Cloudflare Pages using wrangler
    log_info "Deploying to Cloudflare Pages..."
    npx wrangler pages deploy dist --project-name="$pages_project_name"

    log_success "Main application deployed"

    # Cron worker (separate deployment - blocking for production safety)
    if [[ -d "workers/cron" ]]; then
        log_info "Deploying cron worker..."
        npx wrangler deploy --config workers/cron/wrangler.toml
        log_success "Cron worker deployed"
    fi
}

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

    # Cron worker (separate deployment - non-blocking, requires Workers:Edit token permission)
    if [[ -d "workers/cron" ]]; then
        log_info "Deploying cron worker..."
        if npx wrangler deploy --config workers/cron/wrangler.toml 2>&1; then
            log_success "Cron worker deployed"
        else
            log_warn "Cron worker deploy skipped (token may lack Workers:Edit permission - deploy manually)"
        fi
    fi
}

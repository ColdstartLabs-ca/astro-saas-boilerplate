#!/bin/bash

step_deploy() {
    log_step 3 "Deploying"

    cd "$PROJECT_ROOT"

    # Deploy to Cloudflare Pages using wrangler
    log_info "Deploying to Cloudflare Pages..."
    npx wrangler pages deploy dist --project-name="$PROJECT_NAME"

    log_success "Main application deployed"

    # Cron worker (separate deployment)
    if [[ -d "workers/cron" ]]; then
        log_info "Deploying cron worker..."
        npx wrangler deploy --config workers/cron/wrangler.toml
        log_success "Cron worker deployed"
    fi
}

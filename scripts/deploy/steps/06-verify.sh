#!/bin/bash

step_verify() {
    log_step 7 "Verifying"

    local url="https://$DOMAIN_NAME"

    log_info "Waiting for propagation..."
    sleep 5

    for i in {1..5}; do
        status=$(curl -s -o /dev/null -w "%{http_code}" "$url/api/health" 2>/dev/null || echo "000")
        if [[ "$status" == "200" ]]; then
            log_success "Health check passed"
            return 0
        fi
        log_info "Attempt $i/5: HTTP $status"
        sleep 3
    done

    log_warn "Health check didn't return 200 (may still be propagating)"
}

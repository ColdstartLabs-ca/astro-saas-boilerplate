#!/bin/bash

get_supabase_project_ref_for_deploy() {
    if [[ -n "${SUPABASE_PROJECT_REF:-}" ]]; then
        echo "$SUPABASE_PROJECT_REF"
        return 0
    fi

    if [[ -f "$PROJECT_ROOT/supabase/.temp/project-ref" ]]; then
        tr -d '[:space:]' < "$PROJECT_ROOT/supabase/.temp/project-ref"
        return 0
    fi

    if [[ -n "${PUBLIC_SUPABASE_URL:-}" ]]; then
        echo "$PUBLIC_SUPABASE_URL" | sed -E 's#https?://([^.]+)\.supabase\.co/?#\1#'
        return 0
    fi

    return 1
}

step_migrations() {
    log_step 3 "Applying DB migrations"

    if [[ "${SKIP_MIGRATIONS:-false}" == "true" ]]; then
        log_warn "Skipping DB migrations (--skip-migrations flag)"
        return 0
    fi

    if ! command -v npx >/dev/null 2>&1; then
        log_error "npx is required to run Supabase CLI migrations"
    fi

    local project_ref
    project_ref="$(get_supabase_project_ref_for_deploy || true)"
    if [[ -z "$project_ref" ]]; then
        log_error "Could not determine SUPABASE_PROJECT_REF"
    fi
    log_info "Supabase project: $project_ref"

    if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
        log_error "Missing SUPABASE_ACCESS_TOKEN for non-interactive migration push"
    fi

    cd "$PROJECT_ROOT"

    local linked_ref=""
    if [[ -f "supabase/.temp/project-ref" ]]; then
        linked_ref="$(tr -d '[:space:]' < "supabase/.temp/project-ref")"
    fi

    if [[ "$linked_ref" != "$project_ref" ]]; then
        log_info "Linking Supabase project..."
        if [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
            npx supabase link --project-ref "$project_ref" --password "$SUPABASE_DB_PASSWORD" >/dev/null
        else
            npx supabase link --project-ref "$project_ref" >/dev/null
        fi
    fi

    log_info "Pushing pending migrations..."
    if [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
        npx supabase db push --password "$SUPABASE_DB_PASSWORD"
    else
        npx supabase db push
    fi

    log_success "Database migrations applied"
}


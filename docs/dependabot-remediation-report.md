# Dependabot Remediation Report

Generated: 2026-05-24

## Scope

GitHub Dependabot currently reports 149 open alerts for this repository:

| Severity | Open alerts |
| -------- | ----------: |
| High     |          61 |
| Medium   |          68 |
| Low      |          20 |

The alerts are split across both lockfiles:

| Manifest            | Open alerts |
| ------------------- | ----------: |
| `package-lock.json` |          77 |
| `yarn.lock`         |          72 |

This repository currently carries both npm and Yarn lockfiles. That duplication makes one vulnerable package often appear twice. Pick one package manager as the source of truth before remediation, or every fix needs to be reflected in both lockfiles.

## Highest-Leverage Fix Batches

### 1. Upgrade the Astro integration stack

Recommended first shot:

```sh
yarn add astro@^6.3.7 @astrojs/cloudflare@^13.5.4 @astrojs/mdx@^5.0.6 @astrojs/react@^5.0.5
```

Likely affected alert clusters:

| Vulnerable package    | Open alerts | Notes                                                                                     |
| --------------------- | ----------: | ----------------------------------------------------------------------------------------- |
| `astro`               |           6 | Direct framework alert; package-level alert is already fixed, but lockfile alerts remain. |
| `@astrojs/cloudflare` |           2 | Direct adapter alert; package-level alert is already fixed, but lockfile alerts remain.   |
| `vite`                |          10 | Pulled by Astro and Astro integrations.                                                   |
| `devalue`             |           8 | Pulled by Astro.                                                                          |
| `h3`                  |           8 | Pulled through Astro server/storage dependencies.                                         |
| `picomatch`           |           8 | Pulled through Astro/Vite/globbing dependencies.                                          |
| `svgo`                |           2 | Pulled by Astro.                                                                          |
| `smol-toml`           |           2 | Pulled by Astro markdown tooling.                                                         |
| `postcss`             |           2 | Shared by Astro/Vite/Tailwind.                                                            |
| `rollup`              |           2 | Pulled by Vite.                                                                           |
| `yaml`                |           2 | Pulled by Vite/PostCSS config tooling.                                                    |

Expected impact: approximately 40-55 alerts, depending on the resolved transitive versions.

Risk: medium. This is a major Astro adapter/framework upgrade. It is the biggest cleanup move, but it needs a real build and smoke test pass.

Preserve-behavior option: first try updating within the current Astro 5 line:

```sh
yarn upgrade astro @astrojs/cloudflare @astrojs/mdx @astrojs/react
```

That should reduce several transitive alerts with lower migration risk, but it will not clear advisories whose patched version starts in Astro 6 or `@astrojs/cloudflare` 13.

### 2. Upgrade deployment and worker tooling

Recommended second shot:

```sh
yarn add -D wrangler@^4.94.0 vercel@^54.4.1
```

Likely affected alert clusters:

| Vulnerable package  | Open alerts | Notes                                                             |
| ------------------- | ----------: | ----------------------------------------------------------------- |
| `undici`            |          20 | Mostly pulled by `wrangler`, `miniflare`, and `vercel`.           |
| `tar`               |          12 | Pulled by Vercel packaging dependencies.                          |
| `minimatch`         |          12 | Pulled by Vercel, ESLint, TypeScript ESLint, and related tooling. |
| `wrangler`          |           2 | Direct advisory, patched at `4.59.1`.                             |
| `srvx`              |           2 | Pulled by Vercel backends.                                        |
| `ws`                |           2 | Pulled by Miniflare, Supabase realtime, and jsdom.                |
| `@tootallnate/once` |           2 | Older development transitive dependency.                          |

Expected impact: approximately 25-40 alerts.

Risk: low to medium for root `wrangler`, medium for `vercel`. The app is deployed through Cloudflare scripts, so `vercel` may be unused local tooling. If Vercel is not part of the deployment path, consider removing it instead of upgrading it.

Important note: the root lock currently contains `wrangler@4.62.0`, but `@astrojs/cloudflare@12.6.12` still brings a nested `wrangler@4.50.0`. Upgrading the Astro Cloudflare adapter is likely required to clear all Wrangler-related alerts.

### 3. Upgrade sanitizer and markdown packages

Recommended third shot:

```sh
yarn add dompurify@^3.4.5 isomorphic-dompurify@^3.0.0 markdown-it@^14.2.0
```

Likely affected alert clusters:

| Vulnerable package | Open alerts | Notes                                                       |
| ------------------ | ----------: | ----------------------------------------------------------- |
| `dompurify`        |          16 | Direct and via `isomorphic-dompurify`; patched at `3.4.0+`. |
| `markdown-it`      |           2 | Direct dependency; patched at `14.1.1+`.                    |

Expected impact: approximately 18 alerts.

Risk: low to medium. `dompurify` and `markdown-it` are runtime content-processing dependencies, so validate any Markdown preview/editor and sanitization flows after upgrading. `isomorphic-dompurify` latest is a major version and should be checked against SSR usage.

### 4. Upgrade communication and API SDKs

Recommended fourth shot:

```sh
yarn add resend@^6.12.3 @supabase/supabase-js@^2.106.1
```

Likely affected alert clusters:

| Vulnerable package | Open alerts | Notes                                           |
| ------------------ | ----------: | ----------------------------------------------- |
| `mailparser`       |           2 | Pulled by `resend`; patched at `3.9.3`.         |
| `nodemailer`       |           4 | Pulled by `mailparser`; patched at `8.0.5`.     |
| `uuid`             |           2 | Pulled by `resend`/`svix`; patched at `11.1.1`. |
| `ws`               |           2 | Also pulled by Supabase realtime.               |

Expected impact: approximately 4-8 alerts, with some overlap with the tooling batch.

Risk: low to medium. Validate email sending, webhook helpers, and Supabase realtime/auth flows.

### 5. Decide what to do with `xlsx`

Current issue:

| Vulnerable package | Open alerts | Patched version           |
| ------------------ | ----------: | ------------------------- |
| `xlsx`             |           4 | None listed by Dependabot |

Recommended options:

1. Replace `xlsx` with a maintained alternative such as `exceljs` or a server-only CSV/XLSX parser suited to the exact import/export use case.
2. If replacement is too large for now, isolate use of `xlsx` to trusted files only and document the accepted risk.

Expected impact: up to 4 high-severity alerts.

Risk: medium to high. This is behavior-sensitive because spreadsheet parsing and export APIs differ across libraries.

### 6. Upgrade linting-related dependencies

Recommended follow-up:

```sh
yarn add -D eslint@^9.39.2 @typescript-eslint/parser@^8.59.4 @typescript-eslint/eslint-plugin@^8.59.4 typescript-eslint@^8.59.4 eslint-plugin-import@latest eslint-plugin-react@latest eslint-plugin-i18next@latest
```

Likely affected alert clusters:

| Vulnerable package | Open alerts | Notes                                                                           |
| ------------------ | ----------: | ------------------------------------------------------------------------------- |
| `minimatch`        |  Some of 12 | ESLint and plugins still pull vulnerable `minimatch@3.1.2` in the current tree. |
| `brace-expansion`  |           3 | Pulled by vulnerable `minimatch` versions.                                      |
| `ajv`              |           1 | Older ESLint config transitive dependency.                                      |
| `lodash`           |           4 | Pulled by `eslint-plugin-i18next`.                                              |
| `flatted`          |           3 | Pulled by Vitest UI / ESLint cache dependencies.                                |

Expected impact: approximately 5-15 alerts after the larger Astro/tooling batches.

Risk: low to medium. Lint output can change, but runtime behavior should not.

## Recommended Order

1. Choose one lockfile strategy. Since `package.json` declares Yarn 1, prefer regenerating and committing `yarn.lock`, then remove `package-lock.json` if npm is not used in CI.
2. Apply the Astro stack upgrade first. It appears to hit the largest runtime cluster.
3. Apply the Wrangler/Vercel tooling upgrade next. This should reduce most `undici`, `tar`, and deployment-tool alerts.
4. Apply the sanitizer/Markdown upgrade. This is a compact runtime fix with a high alert count.
5. Apply SDK/tooling follow-ups for Resend, Supabase, ESLint, and related plugins.
6. Handle `xlsx` separately because Dependabot does not list a safe patched version.

## Verification Checklist

Run after each batch, not only at the end:

```sh
yarn install
yarn tsc
yarn lint
yarn test:unit
yarn build
```

For the Astro and Cloudflare adapter upgrade, also run:

```sh
yarn cf-typegen
yarn dev:no-webhooks
```

Manual smoke tests:

- Home page and main authenticated routes render.
- Markdown editor/preview still sanitizes and renders expected content.
- File import/export paths still work, especially anything using `xlsx`.
- Supabase auth/session flows still work.
- Stripe webhook listener still starts if local secrets are configured.
- Cloudflare worker build/deploy command still resolves the expected environment.

## Notes

- `package.json` uses broad ranges for many dependencies, so several direct dependencies are already newer in the lockfile than the visible minimum in `package.json`.
- Some alerts are marked fixed at the `package.json` level but still open in lockfiles. This means the declared range is acceptable, but the committed lockfile still resolves a vulnerable version.
- The highest-risk behavior change is moving Astro and `@astrojs/cloudflare` across major versions. The highest-risk unresolved dependency is `xlsx`, because Dependabot reports no patched npm version.

## Execution Notes

Remediation executed on 2026-05-24.

- Kept Yarn 1 as the package manager source of truth and removed `package-lock.json`.
- Removed unused direct runtime dependencies instead of upgrading dead code paths: `@uiw/react-md-editor`, `dompurify`, `isomorphic-dompurify`, `markdown-it`, `papaparse`, `react-markdown`, `remark-gfm`, `sendpulse-api`, and `xlsx`.
- Removed unused direct tooling dependencies: `esbuild`, `typescript-eslint`, `vercel`, `tsyringe`, and `reflect-metadata`.
- Upgraded the live Astro/Cloudflare stack, Wrangler, Resend, Supabase SDK, ESLint stack, and related lockfile transitive dependencies.
- Replaced the `tsyringe` runtime container with a small manual registry so the Cloudflare worker build no longer bundles CommonJS DI code.
- Added direct `picomatch` plus a Vite SSR optimizer hint to avoid Astro 6 Cloudflare runner evaluating Astro's CommonJS helper dependency raw.
- Added Yarn resolutions for remaining vulnerable transitive packages (`flatted`, `js-cookie`, `lodash`, `minimatch`, `picomatch`, `postcss`, `rollup`, `smol-toml`, `vite`, and `yaml`) after the direct dependency cleanup.
- Left `@astrojs/tailwind` installed for Tailwind 3 support; Astro 6 docs still describe this path, though the package currently emits a peer-range warning.

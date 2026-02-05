# PRD Archive

This directory contains historical PRDs that are no longer actively referenced but are preserved for reference purposes.

## pixelperfect-myimageupscaler-era/

This subdirectory contains PRDs from the original **PixelPerfect/MyImageUpscaler** product era (pre-AutopilotRank pivot). These PRDs are kept for historical reference but document features and systems that were either:

1. **Fully implemented and completed** during the MyImageUpscaler era
2. **Superseded** by the AutopilotRank pivot (image upscaling features are no longer relevant)
3. **Product-specific** to the image upscaling SaaS that was replaced

### Archived PRDs (21 files)

| File                                               | Reason for Archiving                                     |
| -------------------------------------------------- | -------------------------------------------------------- |
| `batch-upload-paid-only.md`                        | Image processing feature - not relevant to AutopilotRank |
| `false-claims-audit-prd.md`                        | Product-specific audit - completed                       |
| `fix-landing-redirect-and-default-quality-tier.md` | Old landing page issue - resolved                        |
| `image-upload-validation.md`                       | Image processing feature - not relevant                  |
| `llm-based-image-analysis.md`                      | Image AI feature - replaced by content generation        |
| `multi-model-architecture.md`                      | Image model system - replaced by LLM content models      |
| `pixelperfect-components-refactoring.md`           | Historical refactoring - completed                       |
| `pixelperfect-integration-prd.md`                  | Old integration work - completed                         |
| `premium-model-restrictions.md`                    | Image tier restrictions - not applicable                 |
| `processing-progress-ux.md`                        | Image processing UX - not applicable                     |
| `pseo-expansion-strategy.md`                       | Image upscaling SEO strategy - not applicable            |
| `pseo-i18n-integration.md`                         | Old pSEO work - completed                                |
| `pseo-implementation.md`                           | Programmatic SEO for images - not applicable             |
| `replicate-real-esrgan-integration.md`             | Image upscaling backend - replaced                       |
| `true-image-upscaling-prd.md`                      | Core image feature - replaced by content generation      |
| `api-handler-composition-prd.md`                   | Architecture discussion - historical                     |
| `dynamic-stripe-price-resolution.md`               | Old pricing implementation - superseded                  |
| `email-confirmation-handling-plan.md`              | Auth feature - implemented                               |
| `guest-upscaler-pseo.md`                           | Guest feature for images - not applicable                |
| `openrouter-vl-provider.md`                        | Vision model integration - not applicable                |
| `trial-periods-PRD.md`                             | Subscription feature - implemented                       |
| `upgrade-prompts-strategy.md`                      | Old upgrade UX - superseded                              |
| `starter-tier-rollover-prd.md`                     | Historical pricing - superseded                          |
| `performance-seo-enhancement.md`                   | Old performance work - completed                         |
| `locale-dashboard-redirect-loop-fix.md`            | Bug fix - resolved                                       |
| `pseo-expansion-plan.md`                           | Image SEO expansion - not applicable                     |

### When to Reference These PRDs

- **Understanding historical architecture**: When investigating how the original MyImageUpscaler was built
- **Learning from past decisions**: Understanding what features worked and what didn't
- **Database schema context**: Some migrations reference old feature tables
- **Testing patterns**: Old PRDs contain testing approaches that may still be useful

### What These PRDs Do NOT Contain

- Current AutopilotRank product plans
- AI content generation architecture
- WordPress publishing systems
- Campaign management features
- Current pricing and billing configuration

For current AutopilotRank PRDs, see `../done/` or `../` for active work.

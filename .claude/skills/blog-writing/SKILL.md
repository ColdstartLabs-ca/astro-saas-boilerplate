---
name: blog-writing
description: Write SEO-optimized blog posts for AutopilotRank. Use when creating new blog content, optimizing existing posts, or planning content strategy.
---

# Blog Writing Skill

## Quick Reference

### Directory Structure

```
content/blog/              # Blog posts (MDX format)
├── *.mdx                  # Individual posts
src/pages/blog/
├── index.astro            # Blog listing page
└── [slug].astro           # Individual post page
public/blog/images/        # Blog post images
```

## Blog Post Format

### Frontmatter (Required)

```yaml
---
title: "Post Title - Include Primary Keyword"
description: "150-160 chars. Include keyword and value prop. End with action."
date: "YYYY-MM-DD"
author: "AutopilotRank Team"
category: "Tutorials" | "Comparisons" | "SEO" | "Tips"
tags: ["tag1", "tag2", "tag3", "tag4"]
image: "/blog/images/post-cover.jpg"  # Optional: OG image
---
```

### Content Structure

1. **Hook** (1-2 paragraphs) - Identify problem, connect emotionally
2. **Context** - Why this matters, statistics if available
3. **Main Sections** (3-5) - H2 headers, actionable content
   - Add **contextual Unsplash image** after every 2-3 sections
4. **Callouts** - Tips, warnings, info boxes
5. **CTA** - Link to `/pricing`

**Visual rhythm:** Text → Image → Text → Table → Text → Image → CTA

## Writing Guidelines

### SEO Optimization

- **Title**: 50-60 chars, primary keyword near start
- **Description**: 150-160 chars, keyword + benefit + CTA
- **H1**: Match title or slight variation
- **H2s**: Include secondary keywords naturally
- **Intro**: Primary keyword in first 100 words
- **Internal links**: Link to `/pricing`, other blog posts

### Keyword Targeting

Reference `/docs/SEO/keywords.csv` for keyword research:

<!-- TODO: Update with AutopilotRank-specific keyword volume tiers and examples -->

| Volume | Priority | Example                              |
| ------ | -------- | ------------------------------------ |
| 500K+  | High     | (update with AutopilotRank keywords) |
| 50K+   | Medium   | (update with AutopilotRank keywords) |
| 5K+    | Low      | (update with AutopilotRank keywords) |

### Content Components

#### Callout Types

```mdx
<Callout type="tip">Pro tip content here.</Callout>

<Callout type="info">Informational content here.</Callout>

<Callout type="warning">Warning or caution content here.</Callout>
```

#### Tables

```markdown
| Column 1 | Column 2 | Column 3 |
| -------- | -------- | -------- |
| Data 1   | Data 2   | Data 3   |
```

#### Code Blocks

```markdown
\`\`\`
Code or formula here
\`\`\`
```

#### Images

Reference images from `/public/` using absolute paths:

```markdown
![Alt text](/blog/images/post-slug/image.webp)
```

## Sourcing Images from Public APIs

Use free stock photo APIs to add relevant images to blog posts. **Every post should have 2-4 images** placed contextually throughout the content.

### Image Placement Strategy (REQUIRED)

**Minimum images per post: 3**

1. **Hero/OG Image** (frontmatter) - Eye-catching, represents the topic
2. **Mid-post image** (after 2nd or 3rd H2) - Illustrates a key concept
3. **Supporting image** (before conclusion) - Reinforces the message or shows results

**Contextual relevance rules:**

<!-- TODO: Update with AutopilotRank-specific topic/image mapping (SEO, rankings, automation, etc.) -->

| Post Topic         | Image Ideas                                    | Unsplash Search Terms                             |
| ------------------ | ---------------------------------------------- | ------------------------------------------------- |
| SEO & Rankings     | Charts, dashboards, analytics, growth graphs   | "seo analytics", "data dashboard", "growth chart" |
| Automation         | Robots, workflows, efficiency, tech            | "automation", "workflow", "technology"            |
| Content strategy   | Planning, writing, strategy, calendars         | "content strategy", "planning", "writing"         |
| Technical SEO      | Code, servers, crawlers, site structure        | "web development", "code", "server"               |
| General SaaS/tools | Laptops, productivity, software, collaboration | "productivity", "saas", "software team"           |

**In-content image format:**

```markdown
## Section About Rank Tracking

Monitoring your keyword rankings over time reveals patterns that drive better decisions.

![Analytics dashboard showing keyword ranking trends](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80)

The key is to track consistently and act on the data...
```

**Image placement rules:**

- Place images **after** introducing a concept, not before
- Use images to **break up long text** sections (every 300-400 words)
- Match image mood to section content (technical sections → clean/minimal images)
- Avoid generic stock photos—choose images that add meaning

### Unsplash API

**Source URL Pattern:**

```
https://unsplash.com/photos/{photo-id}
```

**Direct Image URL (for downloading):**

```
https://images.unsplash.com/photo-{id}?w=1200&q=80
```

**How to find images:**

1. Search on [unsplash.com](https://unsplash.com) for relevant terms
2. Find a suitable image and copy the photo ID from URL
3. Download using the direct URL pattern above
4. Save to `/public/blog/images/{post-slug}/`

**Example workflow:**

```bash
# Create directory for post images
mkdir -p public/blog/images/seo-rank-tracking

# Download image (use curl or wget)
curl -o public/blog/images/seo-rank-tracking/dashboard.jpg \
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80"
```

**Attribution:** Unsplash images are free to use without attribution, but credit is appreciated:

```markdown
![Analytics dashboard on a laptop screen](/blog/images/seo-rank-tracking/dashboard.jpg)
_Photo by [Photographer Name](https://unsplash.com/@username) on Unsplash_
```

### Other Free Image Sources

| Source       | URL           | License                       | Best For               |
| ------------ | ------------- | ----------------------------- | ---------------------- |
| Unsplash     | unsplash.com  | Free, no attribution required | High-quality photos    |
| Pexels       | pexels.com    | Free, no attribution required | Lifestyle, business    |
| Pixabay      | pixabay.com   | Free, no attribution required | Illustrations, vectors |
| Lorem Picsum | picsum.photos | Free placeholder              | Development/testing    |

### Image Guidelines for Blog Posts

1. **Download and host locally** - Don't hotlink to external URLs
2. **Optimize file size** - Use WebP format, max 200KB per image
3. **Consistent dimensions** - 1200x630 for hero images (OG compatible)
4. **Descriptive filenames** - `keyword-ranking-dashboard.webp` not `img123.webp`
5. **Alt text required** - Describe the image for accessibility and SEO

### Directory Structure for Blog Images

```
public/blog/images/
├── {post-slug}/           # Per-post image folder
│   ├── hero.webp          # Main/OG image
│   ├── step-1.webp        # Tutorial steps
│   └── screenshot.webp    # Tool screenshots
└── shared/                # Reusable across posts
    ├── autopilotrank-ui.webp
    └── dashboard-overview.webp
```

### Unsplash Search Tips

| Need              | Search Terms                        |
| ----------------- | ----------------------------------- |
| Hero images       | Add "minimal", "clean background"   |
| Technical content | Add "workspace", "desk setup"       |
| Data/analytics    | "dashboard", "charts", "analytics"  |
| Action shots      | "working on", "editing", "creating" |

### Quick Image Download Script

```bash
# Function to download and optimize Unsplash image
download_blog_image() {
  local photo_id=$1
  local output_path=$2
  curl -sL "https://images.unsplash.com/photo-${photo_id}?w=1200&q=80" -o "${output_path}"
}

# Usage
download_blog_image "1551288049-bebda4e38f71" "public/blog/images/my-post/hero.jpg"
```

## Category Guidelines

### Tutorials

- Step-by-step instructions
- Clear numbered steps
- Expected outcomes
- Troubleshooting tips
- Tags: ["tutorials", "how-to", specific topic]

### Comparisons

- Objective criteria
- Tables for easy scanning
- Clear winner recommendation
- Tags: ["comparison", "reviews", tool names]

### SEO

- Strategy and best practices
- Data-driven insights
- Platform-specific tips (Google, Bing, etc.)
- Tags: ["seo", "rankings", specific topic]

### Tips

- Quick, actionable advice
- Bullet points preferred
- Visual examples
- Tags: ["tips", "quick tips", specific topic]

## Product Mentions

### Natural Integration

- Mention AutopilotRank benefits organically
- Highlight differentiators:
  <!-- TODO: Update with AutopilotRank's actual differentiators -->
  - Automated rank tracking
  - Actionable SEO insights
  - Credits-based flexible pricing

### CTAs (Call-to-Action) - CRITICAL FOR ACQUISITION

Strategic CTA placement is essential for converting readers into users. Every blog post MUST include multiple CTAs.

**IMPORTANT: Link Destinations**

- CTAs link to `/?signup=1` (homepage with signup prompt)
- Pricing links go to `/pricing`
- Tool-specific links go to `/tools/{slug}`

#### CTA Types

Use blockquote-style markers to insert standardized CTAs:

| Marker               | Type          | Best Use Case                           |
| -------------------- | ------------- | --------------------------------------- |
| `> [!CTA_TRY]`       | Try It        | Mid-article, after explaining a concept |
| `> [!CTA_DEMO]`      | Demo          | After screenshots or visual examples    |
| `> [!CTA_PRICING]`   | Pricing       | Near end, for value-conscious readers   |
| `> [!CTA_TOOL:slug]` | Tool-specific | Link to specific tool page              |

#### CTA Placement Strategy (REQUIRED)

**Minimum CTAs per post: 2**

| Placement                    | When                                         | CTA Type         |
| ---------------------------- | -------------------------------------------- | ---------------- |
| After Hook (25% mark)        | Reader is engaged, understanding the problem | `[!CTA_TRY]`     |
| Mid-article (50% mark)       | After key insight or demo                    | `[!CTA_DEMO]`    |
| Before Conclusion (75% mark) | Reader has learned, ready to act             | `[!CTA_PRICING]` |

**Example placement in article structure:**

```markdown
## Introduction / Hook

(Problem statement, emotional connection)

## Why This Matters

(Context, statistics)

> [!CTA_TRY]

## Main Section 1

(First key insight)

## Main Section 2

(Tutorial steps or comparison)

> [!CTA_DEMO]

## Main Section 3

(Advanced tips)

## Conclusion

> [!CTA_PRICING]
```

#### CTA Best Practices

1. **Place after value**: Never put a CTA before explaining the benefit
2. **Match context**: Use `[!CTA_DEMO]` after showing visual results
3. **Don't over-CTA**: Maximum 3 in-content CTAs (plus bottom page CTA)
4. **Natural flow**: CTA should feel like a helpful suggestion, not interruption

#### Legacy CTA (Text-only)

For subtle inline CTAs within paragraphs, use markdown links:

```markdown
Ready to automate your SEO? [Try AutopilotRank free](/pricing) — no credit card required.
```

## Legal Guidelines (CRITICAL)

### Never Do

- **No fabricated benchmarks** - Never invent test scores, performance metrics, or comparison data
- **No false competitor claims** - Never make claims about competitor products you cannot prove
- **No fake reviews/testimonials** - Never create fictional user experiences or quotes
- **No made-up statistics** - Never invent market data, percentages, or research findings

### Safe Content Types

1. **Educational content** - Explain concepts, techniques, how things work
2. **First-party showcases** - Screenshots and results using YOUR tool with real data
3. **Use-case guides** - Practical tutorials for specific workflows (local SEO, e-commerce SEO, etc.)
4. **General advice** - Tips that apply regardless of tool used
5. **Verified facts only** - Only cite statistics from reputable, linkable sources

### If Mentioning Competitors

- Only state **verifiable public facts** (pricing from their website, features they list)
- Use phrases like "at time of writing" for pricing/features that may change
- Never claim their quality is worse without actual documented evidence
- Prefer generic category references ("many SEO tools") over naming competitors

### Safe Comparison Approaches

- Compare YOUR tool's results without mentioning competitors
- Compare approaches/methods generically (e.g., "manual tracking vs automated")
- Link to third-party reviews if you need comparison data

## Validation Checklist

Before publishing:

**SEO & Metadata**

- [ ] Title is 50-60 characters with primary keyword
- [ ] Description is 150-160 characters with CTA
- [ ] Date is in YYYY-MM-DD format
- [ ] Category matches allowed values
- [ ] 3-5 relevant tags included
- [ ] Primary keyword in first 100 words

**Content & Links**

- [ ] 2+ internal links to /pricing, /?signup=1, or other blog posts
- [ ] Callouts used for tips/warnings

**Images**

- [ ] 3+ images: hero (frontmatter) + 2 mid-content images
- [ ] Images are contextually relevant to surrounding content
- [ ] No broken image paths

**CTAs (Critical for Acquisition)**

- [ ] Minimum 2 in-content CTAs using `> [!CTA_*]` markers
- [ ] First CTA placed after hook/context section (25% mark)
- [ ] Second CTA placed mid-article after key insight (50% mark)
- [ ] CTAs placed AFTER providing value, not before
- [ ] CTA types match content context (DEMO after visuals, TRY after concepts)

**Final**

- [ ] `yarn verify` passes

## Existing Posts Reference

<!-- TODO: Update with AutopilotRank's actual blog posts once published -->

| Slug             | Topic | Category | Keywords Covered |
| ---------------- | ----- | -------- | ---------------- |
| (add posts here) |       |          |                  |

## Topic Ideas (Uncovered Keywords)

<!-- TODO: Update with AutopilotRank-specific keyword research and topic priorities -->

High-priority topics to cover (update with actual keyword research):

1. (Add AutopilotRank-specific topic ideas here based on keyword research)

## File Naming Convention

```
kebab-case-with-primary-keyword.mdx

Examples:
✅ automate-seo-rank-tracking.mdx
✅ local-seo-ranking-factors-2024.mdx
❌ SeoRankTracking.mdx (wrong case)
❌ seo_rank_tracking.mdx (underscores)
```

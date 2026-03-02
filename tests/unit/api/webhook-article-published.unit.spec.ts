import { describe, test, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../../src/pages/api/webhooks/article-published';

// Mutable state captured by mock closures — must be primitives or reassignable refs
let mockSecret = '';
let mockArticle: Record<string, unknown> | null = {
  id: 'a1b2c3d4-0000-0000-0000-000000000001',
  status: 'approved',
  slug: null,
  meta_description: null,
};
let mockUpdateError: { message: string } | null = null;

vi.mock('@shared/config/env', () => ({
  serverEnv: new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop === 'INBOUND_WEBHOOK_SECRET') return mockSecret;
        if (prop === 'ENV') return 'test';
        return '';
      },
    }
  ),
}));

vi.mock('@shared/utils/string', () => ({
  calculateReadingTime: vi.fn(() => '6 min read'),
  generateSlug: vi.fn((title: string) => title.toLowerCase().replace(/\s+/g, '-')),
}));

vi.mock('@server/services/blog.service', () => ({
  renderMarkdownToHtml: vi.fn((content: string) => `<p>${content}</p>`),
}));

vi.mock('@server/supabase/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'articles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(() => Promise.resolve({ data: mockArticle, error: null })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: mockUpdateError })),
          })),
        };
      }
      if (table === 'blog_posts') {
        return {
          upsert: vi.fn(() => Promise.resolve({ error: null })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({ data: { id: 'blog-post-id-1' }, error: null })
              ),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        };
      }
      if (table === 'blog_post_tags') {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
          insert: vi.fn(() => Promise.resolve({ error: null })),
        };
      }
      if (table === 'blog_media') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { id: 'media-id-1' }, error: null })),
            })),
          })),
        };
      }
      // integration_deliveries and other tables
      return {
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          })),
        })),
      };
    }),
  },
}));

// =============================================================================
// Helpers
// =============================================================================

function buildPayload(overrides: Record<string, unknown> = {}) {
  return {
    event: 'article.published',
    test: false,
    timestamp: '2024-01-15T10:30:00Z',
    article: {
      id: 'a1b2c3d4-0000-0000-0000-000000000001',
      title: 'How to Rank Higher',
      content: '# How to Rank Higher\n\nGreat content goes here.',
      content_html: '<h1>How to Rank Higher</h1>\n<p>Great content goes here.</p>',
      slug: 'how-to-rank-higher',
      meta_description: 'Learn how to rank higher on Google.',
      primary_keyword: 'rank higher',
      word_count: 1200,
      seo_score: 85,
      images: [{ position: 1, url: 'https://cdn.example.com/img.jpg' }],
    },
    campaign: { id: 'c1', name: 'SEO Campaign' },
    project: { id: 'p1', name: 'My Blog', domain: 'example.com' },
    ...overrides,
  };
}

async function generateSignature(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(body));
  const hex = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `sha256=${hex}`;
}

function makeRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request('https://localhost/api/webhooks/article-published', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  });
}

function makeContext(request: Request): Parameters<typeof POST>[0] {
  return {
    request,
    params: {},
    props: {},
    url: new URL(request.url),
    redirect: () => new Response(null, { status: 302 }),
    locals: {},
    cookies: {
      get: () => undefined,
      set: () => {},
      delete: () => {},
      has: () => false,
      headers: () => [],
    },
    clientAddress: '127.0.0.1',
    site: new URL('https://localhost'),
    generator: 'test',
    rewrite: () => new Response(),
    routePattern: '/api/webhooks/article-published',
    currentLocale: undefined,
    preferredLocale: undefined,
    preferredLocaleList: undefined,
    getActionResult: () => undefined,
    callAction: async () => undefined,
    originPathname: '/api/webhooks/article-published',
  } as Parameters<typeof POST>[0];
}

// =============================================================================
// Tests
// =============================================================================

describe('POST /api/webhooks/article-published', () => {
  beforeEach(() => {
    mockSecret = '';
    mockUpdateError = null;
    mockArticle = {
      id: 'a1b2c3d4-0000-0000-0000-000000000001',
      status: 'approved',
      slug: null,
      meta_description: null,
    };
  });

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------

  test('accepts a valid article payload and returns 200', async () => {
    const payload = buildPayload();
    const body = JSON.stringify(payload);
    const request = makeRequest(body);

    const response = await POST(makeContext(request));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ received: true });
  });

  test('accepts payload with null campaign and project', async () => {
    const payload = buildPayload({ campaign: null, project: null });
    const body = JSON.stringify(payload);
    const request = makeRequest(body);

    const response = await POST(makeContext(request));

    expect(response.status).toBe(200);
  });

  test('acknowledges test payloads without hitting the database', async () => {
    const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');
    const payload = buildPayload({ test: true });
    const body = JSON.stringify(payload);
    const request = makeRequest(body);

    const response = await POST(makeContext(request));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ received: true, test: true });
    expect(vi.mocked(supabaseAdmin.from)).not.toHaveBeenCalled();
  });

  test('returns 200 when article is not found locally', async () => {
    mockArticle = null;
    const payload = buildPayload();
    const body = JSON.stringify(payload);
    const request = makeRequest(body);

    const response = await POST(makeContext(request));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ received: true });
  });

  // ---------------------------------------------------------------------------
  // Signature verification
  // ---------------------------------------------------------------------------

  test('accepts valid signature when secret is configured', async () => {
    mockSecret = 'test-secret-key-32-chars-minimum!';
    const payload = buildPayload();
    const body = JSON.stringify(payload);
    const signature = await generateSignature(body, mockSecret);
    const request = makeRequest(body, { 'X-Signature-256': signature });

    const response = await POST(makeContext(request));

    expect(response.status).toBe(200);
  });

  test('rejects missing signature when secret is configured', async () => {
    mockSecret = 'test-secret-key-32-chars-minimum!';
    const payload = buildPayload();
    const body = JSON.stringify(payload);
    const request = makeRequest(body);

    const response = await POST(makeContext(request));

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe('Invalid signature');
  });

  test('rejects wrong signature when secret is configured', async () => {
    mockSecret = 'test-secret-key-32-chars-minimum!';
    const payload = buildPayload();
    const body = JSON.stringify(payload);
    const request = makeRequest(body, { 'X-Signature-256': 'sha256=deadbeef' });

    const response = await POST(makeContext(request));

    expect(response.status).toBe(401);
  });

  test('skips signature verification when no secret is configured', async () => {
    mockSecret = '';
    const payload = buildPayload();
    const body = JSON.stringify(payload);
    const request = makeRequest(body);

    const response = await POST(makeContext(request));

    expect(response.status).toBe(200);
  });

  // ---------------------------------------------------------------------------
  // Payload validation
  // ---------------------------------------------------------------------------

  test('rejects invalid JSON body', async () => {
    const request = makeRequest('not valid json');

    const response = await POST(makeContext(request));

    expect(response.status).toBe(400);
  });

  test('rejects payload with wrong event type', async () => {
    const payload = buildPayload({ event: 'article.deleted' });
    const body = JSON.stringify(payload);
    const request = makeRequest(body);

    const response = await POST(makeContext(request));

    expect(response.status).toBe(400);
  });

  test('rejects payload missing required article fields', async () => {
    const payload = buildPayload();
    delete (payload.article as Record<string, unknown>).content;
    const body = JSON.stringify(payload);
    const request = makeRequest(body);

    const response = await POST(makeContext(request));

    expect(response.status).toBe(400);
  });

  test('accepts payload with empty images array', async () => {
    const payload = buildPayload();
    payload.article.images = [];
    const body = JSON.stringify(payload);
    const request = makeRequest(body);

    const response = await POST(makeContext(request));

    expect(response.status).toBe(200);
  });
});

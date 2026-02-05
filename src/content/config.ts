import { defineCollection, z } from 'astro:content';

// Blog post collection
const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    author: z.string(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    image: z.string().optional(),
    readingTime: z.string().default('5 min read'),
  }),
});

// Export collections
export const collections = { blog };

import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'zod';

const editorialSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(10).max(100),
  description: z.string().min(40).max(180),
  publishedAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
  category: z.string().min(1),
  tags: z.array(z.string()).default([]),
  author: z.string().min(1),
  heroImage: z.string().optional(),
  draft: z.boolean().default(false),
  seoTitle: z.string().max(65).optional(),
  seoDescription: z.string().max(170).optional(),
  contentType: z
    .enum(['money', 'informational', 'brand', 'product', 'tool'])
    .default('informational'),
});

export const collections = {
  articles: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
    schema: editorialSchema,
  }),
  reviews: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/reviews' }),
    schema: editorialSchema,
  }),
  guides: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
    schema: editorialSchema,
  }),
};

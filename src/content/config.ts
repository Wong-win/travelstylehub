import { defineCollection, z } from "astro:content";

const articles = defineCollection({
  schema: z.object({
    title: z.string(),
    date: z.string(),
    category: z.string(),
    keywords: z.string().optional(),
    excerpt: z.string().optional(),
    image: z.string().optional(),
    year: z.string(),
    month: z.string(),
    day: z.string(),
    pinned: z.boolean().optional(),
  }),
});

const pages = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = { articles, pages };

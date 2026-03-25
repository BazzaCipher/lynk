import type { ComponentType } from 'react';

interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  Component: ComponentType;
}

const modules = import.meta.glob<{
  default: ComponentType;
  frontmatter: { slug: string; title: string; description: string; date: string };
}>('./posts/*.mdx', { eager: true });

export const posts: BlogPostMeta[] = Object.values(modules)
  .map((mod) => ({
    slug: mod.frontmatter.slug,
    title: mod.frontmatter.title,
    description: mod.frontmatter.description,
    date: mod.frontmatter.date,
    Component: mod.default,
  }))
  .sort((a, b) => b.date.localeCompare(a.date));

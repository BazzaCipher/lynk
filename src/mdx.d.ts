declare module '*.mdx' {
  import type { ComponentType } from 'react';

  export const frontmatter: {
    title: string;
    description: string;
    date: string;
    slug: string;
  };

  const component: ComponentType;
  export default component;
}

import { Link } from 'react-router-dom';
import { SEO } from '../components/seo/SEO';
import { posts } from './index';

export function BlogListPage() {
  return (
    <>
      <SEO
        title="Blog"
        description="Articles about document data extraction, OCR, and visual workflows from the Paperbridge team."
      />

      <section className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-bridge-900">Blog</h1>
        <p className="mt-3 text-lg text-bridge-500">
          Guides, tips, and updates from the Paperbridge team.
        </p>

        <div className="mt-12 space-y-10">
          {posts.map((post) => (
            <article key={post.slug}>
              <Link to={`/blog/${post.slug}`} className="group block">
                <time className="text-sm text-bridge-400">{post.date}</time>
                <h2 className="mt-1 text-xl font-semibold text-bridge-900 group-hover:text-copper-500 transition-colors">
                  {post.title}
                </h2>
                <p className="mt-2 text-bridge-500 leading-relaxed">{post.description}</p>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

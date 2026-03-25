import { Link } from 'react-router-dom';
import { SEO } from '../components/seo/SEO';
import { posts } from './index';

export function BlogListPage() {
  return (
    <>
      <SEO
        title="Blog"
        description="Articles about document data extraction, OCR, and visual workflows from the Lynk team."
      />

      <section className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">Blog</h1>
        <p className="mt-3 text-lg text-gray-500">
          Guides, tips, and updates from the Lynk team.
        </p>

        <div className="mt-12 space-y-10">
          {posts.map((post) => (
            <article key={post.slug}>
              <Link to={`/blog/${post.slug}`} className="group block">
                <time className="text-sm text-gray-400">{post.date}</time>
                <h2 className="mt-1 text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {post.title}
                </h2>
                <p className="mt-2 text-gray-500 leading-relaxed">{post.description}</p>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

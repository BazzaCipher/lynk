import { useParams, Link } from 'react-router-dom';
import { SEO } from '../components/seo/SEO';
import { BlogPostJsonLd } from '../components/seo/JsonLd';
import { posts } from './index';

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const post = posts.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h1 className="text-2xl font-bold text-bridge-900">Post not found</h1>
        <Link to="/blog" className="mt-4 inline-block text-copper-500 hover:underline">
          Back to blog
        </Link>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={post.title}
        description={post.description}
        type="article"
        publishedTime={post.date}
      />
      <BlogPostJsonLd
        title={post.title}
        description={post.description}
        date={post.date}
      />

      <article className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <Link to="/blog" className="text-sm text-bridge-400 hover:text-bridge-600 transition-colors">
          ← Back to blog
        </Link>
        <header className="mt-6 mb-10">
          <time className="text-sm text-bridge-400">{post.date}</time>
          <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-bridge-900">
            {post.title}
          </h1>
        </header>
        <div className="prose prose-gray max-w-none prose-headings:tracking-tight prose-a:text-copper-500">
          <post.Component />
        </div>
      </article>
    </>
  );
}

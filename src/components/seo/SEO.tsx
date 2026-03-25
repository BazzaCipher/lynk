import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
}

const SITE_NAME = 'Lynk';
const DEFAULT_DESCRIPTION =
  'Lynk is a visual canvas for extracting data from PDFs and images, connecting it through calculations, and building reusable document processing workflows.';

export function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  url,
  image = '/og-image.png',
  type = 'website',
  publishedTime,
}: SEOProps) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Visual Document Data Extraction`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      {url && <meta property="og:url" content={url} />}
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={SITE_NAME} />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Canonical */}
      {url && <link rel="canonical" href={url} />}
    </Helmet>
  );
}

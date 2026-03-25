import { Helmet } from 'react-helmet-async';

export function SoftwareAppJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Lynk',
    description:
      'A visual canvas for extracting data from PDFs and images, connecting it through calculations, and building reusable document processing workflows.',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(data)}</script>
    </Helmet>
  );
}

interface BlogPostJsonLdProps {
  title: string;
  description: string;
  date: string;
  url?: string;
}

export function BlogPostJsonLd({ title, description, date, url }: BlogPostJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    datePublished: date,
    ...(url && { url }),
    publisher: {
      '@type': 'Organization',
      name: 'Lynk',
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(data)}</script>
    </Helmet>
  );
}

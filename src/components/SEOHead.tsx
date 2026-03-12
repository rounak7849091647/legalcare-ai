import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'service';
  noIndex?: boolean;
  structuredData?: object;
  breadcrumbs?: { name: string; url: string }[];
}

const BASE_URL = 'https://legalcareai.com';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

const SEOHead = ({
  title,
  description,
  keywords,
  canonicalUrl,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  noIndex = false,
  structuredData,
  breadcrumbs,
}: SEOHeadProps) => {
  const fullTitle = title.includes('LegalCareAI') ? title : `${title} | LegalCareAI`;
  const fullUrl = canonicalUrl ? `${BASE_URL}${canonicalUrl}` : BASE_URL;

  // Organization structured data
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'LegalCareAI',
    url: BASE_URL,
    logo: `${BASE_URL}/favicon.png`,
    description: 'AI-powered legal intelligence platform for Indian law',
    sameAs: [
      'https://twitter.com/LegalCareAI',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['English', 'Hindi'],
    },
  };

  // Website structured data
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'LegalCareAI',
    url: BASE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  // Breadcrumb structured data
  const breadcrumbSchema = breadcrumbs
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: `${BASE_URL}${item.url}`,
        })),
      }
    : null;

  // Combine all structured data
  const allStructuredData = [
    organizationSchema,
    websiteSchema,
    ...(breadcrumbSchema ? [breadcrumbSchema] : []),
    ...(structuredData ? [structuredData] : []),
  ];

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="author" content="LegalCareAI" />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      
      {/* Robots */}
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}
      
      {/* Canonical URL */}
      <link rel="canonical" href={fullUrl} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="LegalCareAI" />
      <meta property="og:locale" content="en_IN" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content="@LegalCareAI" />
      <meta name="twitter:creator" content="@LegalCareAI" />
      
      {/* Additional SEO Meta Tags */}
      <meta name="theme-color" content="#1a1a2e" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="format-detection" content="telephone=no" />
      
      {/* Geographic Targeting */}
      <meta name="geo.region" content="IN" />
      <meta name="geo.placename" content="India" />
      <meta name="language" content="English" />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(allStructuredData)}
      </script>
    </Helmet>
  );
};

export default SEOHead;

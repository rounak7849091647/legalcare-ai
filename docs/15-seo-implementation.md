# SEO Implementation

## Search Engine Optimization Documentation

---

## 1. Overview

LegalCareAI implements comprehensive SEO strategies including structured data, meta tags, sitemaps, and semantic HTML to ensure optimal search engine visibility.

---

## 2. SEO Head Component

### 2.1 Implementation

```typescript
// src/components/SEOHead.tsx
import { Helmet } from 'react-helmet-async';

interface Breadcrumb {
  name: string;
  url: string;
}

interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  structuredData?: object | object[];
  breadcrumbs?: Breadcrumb[];
  noIndex?: boolean;
}

const SEOHead = ({
  title,
  description,
  keywords,
  canonicalUrl,
  ogImage = '/og-image.png',
  structuredData,
  breadcrumbs,
  noIndex = false,
}: SEOHeadProps) => {
  const siteUrl = 'https://legalcareai.com';
  const fullUrl = canonicalUrl ? `${siteUrl}${canonicalUrl}` : siteUrl;

  // Organization schema
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'LegalCareAI',
    url: siteUrl,
    logo: `${siteUrl}/favicon.png`,
    description: 'AI-powered legal intelligence platform for India',
    sameAs: [
      'https://twitter.com/legalcareai',
      'https://linkedin.com/company/legalcareai',
    ],
  };

  // Breadcrumb schema
  const breadcrumbSchema = breadcrumbs && {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.url}`,
    })),
  };

  // Combine all structured data
  const allStructuredData = [
    organizationSchema,
    ...(breadcrumbSchema ? [breadcrumbSchema] : []),
    ...(Array.isArray(structuredData) ? structuredData : structuredData ? [structuredData] : []),
  ];

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      
      {/* Canonical URL */}
      <link rel="canonical" href={fullUrl} />
      
      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${siteUrl}${ogImage}`} />
      <meta property="og:site_name" content="LegalCareAI" />
      <meta property="og:locale" content="en_IN" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${siteUrl}${ogImage}`} />
      
      {/* Language */}
      <html lang="en" />
      <meta property="og:locale:alternate" content="hi_IN" />
      
      {/* Structured Data */}
      {allStructuredData.map((data, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEOHead;
```

---

## 3. Structured Data (JSON-LD)

### 3.1 Organization Schema

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "LegalCareAI",
  "url": "https://legalcareai.com",
  "logo": "https://legalcareai.com/favicon.png",
  "description": "AI-powered legal intelligence platform for India",
  "sameAs": [
    "https://twitter.com/legalcareai",
    "https://linkedin.com/company/legalcareai"
  ]
}
```

### 3.2 FAQ Schema (Home Page)

```typescript
const faqStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is LegalCareAI?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'LegalCareAI is an AI-powered legal intelligence platform that provides instant legal guidance on Indian law including BNS, IPC, Civil Laws, Labour Law, and more.',
      },
    },
    {
      '@type': 'Question',
      name: 'How can I find a lawyer on LegalCareAI?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'You can browse our directory of 10M+ Bar Council verified lawyers across India, filter by state, city, and practice area to find the right legal expert.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does LegalCareAI provide legal document templates?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, LegalCareAI offers 100+ ready-to-use legal document templates including rental agreements, employment contracts, NDAs, power of attorney, and more.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is LegalCareAI available in multiple languages?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, LegalCareAI supports multiple Indian languages including Hindi, Tamil, Telugu, Bengali, Marathi, and more for accessible legal guidance.',
      },
    },
  ],
};
```

### 3.3 Professional Service Schema

```typescript
const serviceStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: 'LegalCareAI',
  description: 'AI-powered legal intelligence platform for Indian law',
  url: 'https://legalcareai.com',
  areaServed: {
    '@type': 'Country',
    name: 'India',
  },
  serviceType: ['Legal Consultation', 'Legal Document Templates', 'Tax Services', 'Lawyer Directory'],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Legal Services',
    itemListElement: [
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'AI Legal Assistant',
          description: 'Get instant answers to legal questions using AI',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Document Templates',
          description: '100+ ready-to-use legal document templates',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Tax Services',
          description: 'ITR filing, tax planning, and expert CA assistance',
        },
      },
    ],
  },
};
```

### 3.4 Lawyer Directory Schema

```typescript
const lawyerDirectorySchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Find a Lawyer - LegalCareAI',
  description: 'Connect with Bar Council verified legal experts across India. 10M+ verified lawyers covering all states and practice areas.',
  provider: {
    '@type': 'Organization',
    name: 'LegalCareAI',
  },
  areaServed: {
    '@type': 'Country',
    name: 'India',
  },
  serviceType: 'Legal Professional Directory',
};
```

### 3.5 Document Templates Schema

```typescript
const documentsSchema = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Legal Document Templates',
  description: 'Free legal document templates for Indian law including rental agreements, employment contracts, NDAs, and more.',
  numberOfItems: 18,
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'House Rental Agreement',
      description: 'Standard house rental agreement template for residential properties in India',
    },
    // ... more items
  ],
};
```

---

## 4. Sitemap

### 4.1 sitemap.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://legalcareai.com/</loc>
    <lastmod>2026-01-13</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://legalcareai.com/documents</loc>
    <lastmod>2026-01-13</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://legalcareai.com/lawyers</loc>
    <lastmod>2026-01-13</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://legalcareai.com/tax-services</loc>
    <lastmod>2026-01-13</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://legalcareai.com/community</loc>
    <lastmod>2026-01-13</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- ... more URLs -->
</urlset>
```

---

## 5. Robots.txt

```txt
# LegalCareAI Robots.txt
# https://legalcareai.com

User-agent: Googlebot
Allow: /
Crawl-delay: 1

User-agent: Bingbot
Allow: /
Crawl-delay: 1

User-agent: Slurp
Allow: /
Crawl-delay: 2

User-agent: DuckDuckBot
Allow: /
Crawl-delay: 2

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

User-agent: LinkedInBot
Allow: /

User-agent: *
Allow: /
Crawl-delay: 5

# Sitemap location
Sitemap: https://legalcareai.com/sitemap.xml

# Disallow private areas
Disallow: /auth
Disallow: /dashboard
Disallow: /api/
```

---

## 6. Page-Specific SEO

### 6.1 Home Page

```typescript
<SEOHead
  title="LegalCareAI - AI-Powered Legal Intelligence for India"
  description="Get instant legal guidance with LegalCareAI. AI-powered legal assistant for Indian law - BNS, IPC, Civil Laws, Labour Law. Access 100+ document templates and connect with 10M+ verified lawyers."
  keywords="legal AI, Indian law, BNS, IPC, legal documents, find lawyer India, legal advice, tax services, ITR filing, legal templates"
  canonicalUrl="/"
  structuredData={[faqStructuredData, serviceStructuredData]}
  breadcrumbs={[{ name: 'Home', url: '/' }]}
/>
```

### 6.2 Lawyers Page

```typescript
<SEOHead
  title="Find a Lawyer in India - 10M+ Verified Lawyers"
  description="Connect with Bar Council verified legal experts across India. Search 10M+ lawyers by state, city, and practice area. 100% verified, 4.8★ average rating."
  keywords="find lawyer India, Bar Council verified lawyers, legal experts, advocate near me, lawyer directory, criminal lawyer, civil lawyer, corporate lawyer"
  canonicalUrl="/lawyers"
  structuredData={lawyerDirectorySchema}
  breadcrumbs={[
    { name: 'Home', url: '/' },
    { name: 'Find a Lawyer', url: '/lawyers' },
  ]}
/>
```

### 6.3 Auth Page (No Index)

```typescript
<SEOHead
  title="Login - LegalCareAI"
  description="Sign in to your LegalCareAI account"
  canonicalUrl="/auth"
  noIndex={true}  // Exclude from search engines
/>
```

---

## 7. Best Practices

### 7.1 Title Tags

- Under 60 characters
- Include primary keyword
- Brand name at end

### 7.2 Meta Descriptions

- Under 160 characters
- Include call to action
- Relevant keywords

### 7.3 Semantic HTML

```tsx
// Use semantic elements
<header>...</header>
<nav>...</nav>
<main>...</main>
<section>...</section>
<article>...</article>
<aside>...</aside>
<footer>...</footer>

// Single H1 per page
<h1>Page Title</h1>
<h2>Section Heading</h2>
<h3>Subsection</h3>
```

### 7.4 Alt Attributes

```tsx
// Descriptive alt text for images
<img src="/lawyer.jpg" alt="Verified lawyer in Delhi specializing in criminal law" />
```

### 7.5 Lazy Loading

```tsx
// Lazy load below-fold images
<img src="/image.jpg" loading="lazy" alt="Description" />
```

---

*This SEO implementation documentation is part of the LegalCareAI Copyright & Trademark Filing Documentation.*

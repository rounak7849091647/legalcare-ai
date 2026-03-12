import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from '@/components/AppSidebar';
import MainContent from '@/components/MainContent';
import ChatHeader from '@/components/ChatHeader';
import DisclaimerPopup from '@/components/DisclaimerPopup';
import SEOHead from '@/components/SEOHead';

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

const Index = () => {
  return (
    <>
      <SEOHead
        title="LegalCareAI - AI-Powered Legal Intelligence for India"
        description="Get instant legal guidance with LegalCareAI. AI-powered legal assistant for Indian law - BNS, IPC, Civil Laws, Labour Law. Access 100+ document templates and connect with 10M+ verified lawyers."
        keywords="legal AI, Indian law, BNS, IPC, legal documents, find lawyer India, legal advice, tax services, ITR filing, legal templates"
        canonicalUrl="/"
        structuredData={[faqStructuredData, serviceStructuredData]}
        breadcrumbs={[{ name: 'Home', url: '/' }]}
      />
      
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          
          <SidebarInset className="flex flex-col flex-1">
            <ChatHeader />
            <MainContent />
          </SidebarInset>
        </div>
      </SidebarProvider>
      
      <DisclaimerPopup />
    </>
  );
};

export default Index;

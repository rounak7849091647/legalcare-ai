import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, Upload, Users, TrendingUp, RefreshCw, Receipt, 
  Globe, MessageSquare, BarChart3, Bell, Phone, Calculator,
  ArrowRight, IndianRupee
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageLayout from '@/components/PageLayout';
import SEOHead from '@/components/SEOHead';

const quickServices = [
  { icon: FileText, title: 'File Your Return', description: 'ITR filing with step-by-step guidance', path: '/tax-services/file-return' },
  { icon: Upload, title: 'Upload Form 16', description: 'Auto-populate from Form 16', path: '/tax-services/upload-form16' },
  { icon: Users, title: 'Expert Assisted Filing', description: 'Expert tax support', path: '/tax-services/ca-filing' },
  { icon: TrendingUp, title: 'Tax Planning', description: 'Optimize your savings', path: '/tax-services/tax-planning' },
  { icon: RefreshCw, title: 'Refund Status', description: 'Track your refund', path: '/tax-services/refund-status' },
  { icon: Receipt, title: 'TDS Solution', description: 'TDS filing & certificates', path: '/tax-services/tds-solution' },
];

const additionalServices = [
  { icon: Globe, title: 'NRI Taxes', description: 'Specialized NRI services', path: '/tax-services/nri-taxes' },
  { icon: MessageSquare, title: 'Tax Advisory', description: 'Expert consultation', path: '/tax-services/tax-advisory' },
  { icon: BarChart3, title: 'Capital Gains', description: 'STCG & LTCG filing', path: '/tax-services/capital-gains' },
  { icon: Bell, title: 'Tax Notices', description: 'Notice response help', path: '/tax-services/tax-notices' },
  { icon: Phone, title: 'Connect Expert', description: 'One-on-one consultation', path: '/tax-services/connect-expert' },
];

const taxSlabsNew = [
  { range: '0 - 3,00,000', rate: 'Nil' },
  { range: '3,00,001 - 7,00,000', rate: '5%' },
  { range: '7,00,001 - 10,00,000', rate: '10%' },
  { range: '10,00,001 - 12,00,000', rate: '15%' },
  { range: '12,00,001 - 15,00,000', rate: '20%' },
  { range: 'Above 15,00,000', rate: '30%' },
];

const taxServicesSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Tax Services - LegalCareAI',
  description: 'Comprehensive tax services for Indian citizens including ITR filing, CA assistance, tax planning, refund tracking, and NRI taxation.',
  provider: {
    '@type': 'Organization',
    name: 'LegalCareAI',
  },
  areaServed: {
    '@type': 'Country',
    name: 'India',
  },
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Tax Services',
    itemListElement: [
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'ITR Filing',
          description: 'File income tax return with step-by-step guidance',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'CA Assisted Filing',
          description: 'Expert CA assistance for tax filing',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Tax Planning',
          description: 'Optimize your tax savings with expert planning',
        },
      },
    ],
  },
};

const TaxServices = () => {
  const [income, setIncome] = useState('');
  const [regime, setRegime] = useState<'new' | 'old'>('new');
  const [taxResult, setTaxResult] = useState<{ tax: number; cess: number; total: number } | null>(null);

  const calculateTax = () => {
    const annualIncome = parseFloat(income.replace(/,/g, '')) || 0;
    let tax = 0;

    if (regime === 'new') {
      if (annualIncome > 1500000) {
        tax = 150000 + (annualIncome - 1500000) * 0.30;
      } else if (annualIncome > 1200000) {
        tax = 90000 + (annualIncome - 1200000) * 0.20;
      } else if (annualIncome > 1000000) {
        tax = 60000 + (annualIncome - 1000000) * 0.15;
      } else if (annualIncome > 700000) {
        tax = 30000 + (annualIncome - 700000) * 0.10;
      } else if (annualIncome > 300000) {
        tax = (annualIncome - 300000) * 0.05;
      }
    } else {
      if (annualIncome > 1000000) {
        tax = 112500 + (annualIncome - 1000000) * 0.30;
      } else if (annualIncome > 500000) {
        tax = 12500 + (annualIncome - 500000) * 0.20;
      } else if (annualIncome > 250000) {
        tax = (annualIncome - 250000) * 0.05;
      }
    }

    const cess = tax * 0.04;
    setTaxResult({ tax, cess, total: tax + cess });
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0 
    }).format(num);
  };

  return (
    <PageLayout>
      <SEOHead
        title="Tax Services India - ITR Filing, Tax Planning & CA Assistance"
        description="Comprehensive tax services for Indian citizens. File ITR online, get expert CA assistance, track refunds, calculate taxes with our free calculator. FY 2024-25 tax slabs."
        keywords="ITR filing, income tax return, tax calculator India, CA assisted filing, tax planning, refund status, TDS, NRI taxes, capital gains tax"
        canonicalUrl="/tax-services"
        structuredData={taxServicesSchema}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Tax Services', url: '/tax-services' },
        ]}
      />

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">Tax Intelligence Module</h1>
          <p className="text-muted-foreground mt-1">Comprehensive tax services for Indian citizens</p>
        </div>

        {/* Quick Access Services */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Access Services</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            {quickServices.map((service, index) => (
              <Link
                key={index}
                to={service.path}
                className="bg-card border border-border rounded-xl p-3 sm:p-4 hover:bg-accent transition-all text-left block"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-secondary flex items-center justify-center mb-2 sm:mb-3">
                  <service.icon size={18} className="text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground text-xs sm:text-sm leading-tight">{service.title}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Additional Services */}
        <div className="mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            {additionalServices.map((service, index) => (
              <Link
                key={index}
                to={service.path}
                className="bg-card border border-border rounded-xl p-3 sm:p-4 hover:bg-accent transition-all text-left block"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-secondary flex items-center justify-center mb-2 sm:mb-3">
                  <service.icon size={18} className="text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground text-xs sm:text-sm leading-tight">{service.title}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Calculator and Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tax Calculator */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Calculator size={20} />
                Income Tax Calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Annual Income</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    placeholder="Enter your annual income"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    className="pl-9 bg-secondary border-border text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Tax Regime</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={regime === 'new' ? 'default' : 'outline'}
                    onClick={() => setRegime('new')}
                    className={regime === 'new' 
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                      : 'bg-secondary border-border text-foreground hover:bg-accent'
                    }
                  >
                    <div className="text-left">
                      <div className="font-medium">New Regime</div>
                      <div className="text-xs opacity-70">Lower rates, no deductions</div>
                    </div>
                  </Button>
                  <Button
                    variant={regime === 'old' ? 'default' : 'outline'}
                    onClick={() => setRegime('old')}
                    className={regime === 'old' 
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                      : 'bg-secondary border-border text-foreground hover:bg-accent'
                    }
                  >
                    <div className="text-left">
                      <div className="font-medium">Old Regime</div>
                      <div className="text-xs opacity-70">With deductions</div>
                    </div>
                  </Button>
                </div>
              </div>

              <Button 
                onClick={calculateTax}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={!income}
              >
                Calculate Tax
                <ArrowRight size={16} className="ml-2" />
              </Button>

              {taxResult && (
                <div className="bg-secondary rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Income Tax</span>
                    <span className="text-foreground">{formatCurrency(taxResult.tax)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Health & Education Cess (4%)</span>
                    <span className="text-foreground">{formatCurrency(taxResult.cess)}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between font-medium">
                    <span className="text-foreground">Total Tax Payable</span>
                    <span className="text-foreground">{formatCurrency(taxResult.total)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tax Summary / Slabs */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <RefreshCw size={20} />
                Tax Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {taxResult ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center h-32">
                    <div className="text-center">
                      <TrendingUp size={48} className="mx-auto text-muted-foreground mb-2" />
                      <p className="text-2xl font-bold text-foreground">{formatCurrency(taxResult.total)}</p>
                      <p className="text-sm text-muted-foreground">Total Tax ({regime === 'new' ? 'New' : 'Old'} Regime)</p>
                    </div>
                  </div>
                  <div className="bg-secondary rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-2">Effective Tax Rate</p>
                    <p className="text-xl font-bold text-foreground">
                      {((taxResult.total / parseFloat(income.replace(/,/g, ''))) * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Enter your income and calculate to see results</p>
                </div>
              )}

              {/* Tax Slabs Reference */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-foreground mb-3">New Regime Tax Slabs (FY 2024-25)</h4>
                <div className="space-y-2">
                  {taxSlabsNew.map((slab, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">₹{slab.range}</span>
                      <span className="text-foreground">{slab.rate}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
};

export default TaxServices;

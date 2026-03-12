import { Helmet } from 'react-helmet-async';
import { Globe, ArrowLeft, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageLayout from '@/components/PageLayout';
import { Link } from 'react-router-dom';

const nriServices = [
  'ITR Filing for NRIs',
  'DTAA Benefits Application',
  'TDS Refund Claims',
  'Lower Deduction Certificates',
  'Repatriation Guidance',
  'Capital Gains on Property'
];

const NRITaxes = () => {
  return (
    <PageLayout>
      <Helmet>
        <title>NRI Taxes - LegalCareAI</title>
        <meta name="description" content="Specialized tax services for NRIs. DTAA benefits, TDS refunds, and comprehensive NRI tax filing." />
      </Helmet>

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <Link to="/tax-services" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft size={16} />
          <span className="text-sm">Back to Tax Services</span>
        </Link>

        <div className="flex items-start gap-4 mb-8">
          <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <Globe size={28} className="text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">NRI Taxes</h1>
            <p className="text-muted-foreground mt-1">Specialized services for Non-Resident Indians</p>
          </div>
        </div>

        {/* Important Note */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle size={20} className="text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Residential Status Matters</p>
            <p className="text-xs text-muted-foreground mt-1">Your tax obligations depend on your residential status (NRI/RNOR/Resident)</p>
          </div>
        </div>

        {/* Services */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-foreground">Our NRI Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {nriServices.map((service, index) => (
                <div key={index} className="flex items-center gap-3 bg-secondary rounded-lg p-3">
                  <CheckCircle size={16} className="text-green-500 shrink-0" />
                  <span className="text-sm text-foreground">{service}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* DTAA */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-foreground">DTAA Countries</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              India has Double Taxation Avoidance Agreements with 90+ countries including:
            </p>
            <div className="flex flex-wrap gap-2">
              {['USA', 'UK', 'UAE', 'Singapore', 'Canada', 'Australia', 'Germany', 'France'].map((country) => (
                <span key={country} className="bg-secondary px-3 py-1 rounded-full text-xs text-foreground">
                  {country}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12">
          Get NRI Tax Consultation
          <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    </PageLayout>
  );
};

export default NRITaxes;

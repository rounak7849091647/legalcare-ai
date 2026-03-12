import { Helmet } from 'react-helmet-async';
import { Users, ArrowLeft, CheckCircle, Star, Clock, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageLayout from '@/components/PageLayout';
import { Link } from 'react-router-dom';

const process = [
  { step: 1, title: 'Upload Documents', description: 'Share your Form 16, bank statements, and investment proofs' },
  { step: 2, title: 'CA Review', description: 'Our CA reviews your documents and identifies all deductions' },
  { step: 3, title: 'Filing', description: 'CA files your return with maximum tax benefits' },
  { step: 4, title: 'Verification', description: 'E-verify your return and receive acknowledgment' },
];

const benefits = [
  'Expert CA with 10+ years experience',
  'Maximum tax saving guaranteed',
  'Error-free filing',
  'Post-filing support for queries',
  'Notice response assistance',
  'Dedicated support team',
];

const CAAssistedFiling = () => {
  return (
    <PageLayout>
      <Helmet>
        <title>CA Assisted Filing - LegalCareAI</title>
        <meta name="description" content="Get expert CA support for your tax filing. Professional chartered accountants to help you file accurately." />
      </Helmet>

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <Link to="/tax-services" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft size={16} />
          <span className="text-sm">Back to Tax Services</span>
        </Link>

        <div className="flex items-start gap-4 mb-8">
          <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <Users size={28} className="text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">CA Assisted Filing</h1>
            <p className="text-muted-foreground mt-1">Expert chartered accountant support</p>
          </div>
        </div>

        {/* Process */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Clock size={20} />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {process.map((item) => (
                <div key={item.step} className="bg-secondary rounded-lg p-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center mx-auto mb-3 text-lg font-bold text-foreground">
                    {item.step}
                  </div>
                  <h3 className="font-medium text-foreground text-sm">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Benefits */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Star size={20} />
              Why Choose Our CAs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-green-500 shrink-0" />
                  <span className="text-sm text-foreground">{benefit}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="bg-card border-border mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {[
                { value: '10+', label: 'Years Experience' },
                { value: '50,000+', label: 'Returns Filed' },
                { value: '4.9★', label: 'Customer Rating' },
                { value: '100%', label: 'Accuracy' }
              ].map((stat, index) => (
                <div key={index} className="p-3 bg-secondary rounded-lg">
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-12">
            <FileText size={18} className="mr-2" />
            Get Started
            <ArrowRight size={16} className="ml-2" />
          </Button>
          <Button variant="outline" className="flex-1 bg-secondary border-border text-foreground hover:bg-accent h-12">
            <Users size={18} className="mr-2" />
            Talk to a CA
          </Button>
        </div>
      </div>
    </PageLayout>
  );
};

export default CAAssistedFiling;
